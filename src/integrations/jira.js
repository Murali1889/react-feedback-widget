/**
 * Jira Integration Server Handler
 *
 * Supports:
 * - Creating issues with attachments
 * - Bidirectional status sync
 * - Custom field mapping
 *
 * Usage (Next.js App Router):
 *   export { POST } from 'react-visual-feedback/server/jira';
 *
 * Usage (Express):
 *   app.post('/api/jira', jiraHandler({ projectKey: 'BUG' }));
 */

import {
  feedbackToJiraIssue,
  mapLocalStatusToJira,
  mapJiraStatusToLocal,
  DEFAULT_JIRA_STATUS_MAPPING
} from './config.js';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format event logs as a readable text file
 */
function formatEventLogs(eventLogs) {
  if (!eventLogs || eventLogs.length === 0) {
    return 'No event logs recorded.';
  }

  const lines = [
    '═══════════════════════════════════════════════════════════════',
    '                    SESSION EVENT LOGS',
    '═══════════════════════════════════════════════════════════════',
    `Generated: ${new Date().toISOString()}`,
    `Total Events: ${eventLogs.length}`,
    '═══════════════════════════════════════════════════════════════',
    ''
  ];

  eventLogs.forEach((event, index) => {
    const timestamp = event.timestamp ? `[${(event.timestamp / 1000).toFixed(2)}s]` : '[--]';

    switch (event.type) {
      case 'console':
        lines.push(`${timestamp} [CONSOLE.${(event.level || 'log').toUpperCase()}]`);
        lines.push(`   ${event.message || 'No message'}`);
        break;

      case 'network':
        const status = event.status || 'pending';
        const duration = event.duration ? `(${event.duration}ms)` : '';
        lines.push(`${timestamp} [NETWORK] ${event.method || 'GET'} ${event.url}`);
        lines.push(`   Status: ${status} ${duration}`);
        if (event.request?.body && event.request.body !== 'null' && event.request.body !== 'undefined') {
          lines.push(`   Request: ${event.request.body.substring(0, 200)}${event.request.body.length > 200 ? '...' : ''}`);
        }
        if (event.response?.body && event.response.body !== 'null' && event.response.body !== 'undefined') {
          lines.push(`   Response: ${event.response.body.substring(0, 200)}${event.response.body.length > 200 ? '...' : ''}`);
        }
        break;

      case 'storage':
        lines.push(`${timestamp} [${(event.storageType || 'storage').toUpperCase()}] ${event.action}`);
        if (event.key) lines.push(`   Key: ${event.key}`);
        if (event.value) lines.push(`   Value: ${event.value.substring(0, 100)}${event.value.length > 100 ? '...' : ''}`);
        break;

      case 'indexedDB':
        lines.push(`${timestamp} [INDEXEDDB] ${event.action} on ${event.dbName || 'unknown'}${event.storeName ? '.' + event.storeName : ''}`);
        if (event.data) lines.push(`   Data: ${event.data.substring(0, 100)}${event.data.length > 100 ? '...' : ''}`);
        break;

      default:
        lines.push(`${timestamp} [${(event.type || 'EVENT').toUpperCase()}]`);
        lines.push(`   ${JSON.stringify(event).substring(0, 200)}`);
    }

    lines.push(''); // Empty line between events
  });

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                      END OF LOGS');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

// ============================================
// JIRA API CLIENT
// ============================================

class JiraClient {
  constructor(config) {
    let domain = config.domain || process.env.JIRA_DOMAIN;
    this.email = config.email || process.env.JIRA_EMAIL;
    this.apiToken = config.apiToken || process.env.JIRA_API_TOKEN;
    this.projectKey = config.projectKey || process.env.JIRA_PROJECT_KEY;

    if (!domain || !this.email || !this.apiToken) {
      throw new Error(
        'Jira configuration missing. Required: JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN'
      );
    }

    // Strip protocol and trailing slashes from domain
    this.domain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    this.baseUrl = `https://${this.domain}/rest/api/3`;
    this.authHeader = 'Basic ' + Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error (${response.status}): ${error}`);
    }

    // Some endpoints return empty response
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  /**
   * Create a new issue
   */
  async createIssue(issueData) {
    return this.request('/issue', {
      method: 'POST',
      body: JSON.stringify(issueData)
    });
  }

  /**
   * Get issue details
   */
  async getIssue(issueKey) {
    return this.request(`/issue/${issueKey}`);
  }

  /**
   * Update issue status via transition
   */
  async transitionIssue(issueKey, transitionName) {
    // First get available transitions
    const transitions = await this.request(`/issue/${issueKey}/transitions`);

    const transition = transitions.transitions.find(
      t => t.name.toLowerCase() === transitionName.toLowerCase() ||
           t.to.name.toLowerCase() === transitionName.toLowerCase()
    );

    if (!transition) {
      throw new Error(`Transition "${transitionName}" not found for issue ${issueKey}`);
    }

    await this.request(`/issue/${issueKey}/transitions`, {
      method: 'POST',
      body: JSON.stringify({
        transition: { id: transition.id }
      })
    });

    return { success: true, transitionId: transition.id };
  }

  /**
   * Add attachment to issue
   */
  async addAttachment(issueKey, filename, content, contentType) {
    const url = `${this.baseUrl}/issue/${issueKey}/attachments`;

    // Convert content to buffer
    let buffer;

    if (Buffer.isBuffer(content)) {
      // Already a buffer
      buffer = content;
    } else if (typeof content === 'string') {
      if (content.startsWith('data:')) {
        // Data URL format: data:video/webm;base64,AAAA...
        const commaIndex = content.indexOf(',');
        if (commaIndex !== -1) {
          const base64Data = content.substring(commaIndex + 1);
          buffer = Buffer.from(base64Data, 'base64');
        } else {
          throw new Error('Invalid data URL format - missing comma separator');
        }
      } else {
        // Assume raw base64 string
        buffer = Buffer.from(content, 'base64');
      }
    } else if (content instanceof Uint8Array) {
      buffer = Buffer.from(content);
    } else {
      throw new Error(`Unsupported content type: ${typeof content}`);
    }

    // Validate buffer has content
    if (!buffer || buffer.length === 0) {
      throw new Error('Attachment content is empty');
    }

    // Create form data manually for Node.js
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    const formData = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`
      ),
      buffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'X-Atlassian-Token': 'no-check',
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload attachment (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Add comment to issue
   */
  async addComment(issueKey, comment) {
    return this.request(`/issue/${issueKey}/comment`, {
      method: 'POST',
      body: JSON.stringify({
        body: {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{
              type: 'text',
              text: comment
            }]
          }]
        }
      })
    });
  }

  /**
   * Get issue status
   */
  async getIssueStatus(issueKey) {
    const issue = await this.getIssue(issueKey);
    return issue.fields.status.name;
  }
}

// ============================================
// REQUEST HANDLERS
// ============================================

/**
 * Parse multipart form data from request
 * Works with Next.js App Router, Pages Router, and Express
 */
async function parseFormData(req) {
  // Next.js App Router - req is a Request object
  if (typeof req.json === 'function' || typeof req.formData === 'function') {
    // Check Content-Type to determine how to parse
    const contentType = req.headers?.get?.('content-type') || req.headers?.['content-type'] || '';

    // Handle JSON requests (e.g., getStatus, updateStatus)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      return {
        action: body.action || 'create',
        feedbackData: body.feedbackData || body,
        issueKey: body.issueKey,
        status: body.status,
        comment: body.comment
      };
    }

    // Handle FormData requests (e.g., create with attachments)
    if (typeof req.formData === 'function') {
      const formData = await req.formData();
      const action = formData.get('action') || 'create';
      const metadataStr = formData.get('metadata');
      const metadata = metadataStr ? JSON.parse(metadataStr) : {};

      // Get files
      const screenshot = formData.get('screenshot');
      const video = formData.get('video');
      const eventLogs = formData.get('eventLogs');

      // Convert files to buffers
      const feedbackData = { ...metadata };

      if (screenshot && screenshot instanceof Blob) {
        const arrayBuffer = await screenshot.arrayBuffer();
        feedbackData.screenshotBuffer = Buffer.from(arrayBuffer);
        feedbackData.screenshotType = screenshot.type || 'image/png';
      }

      if (video && video instanceof Blob) {
        const arrayBuffer = await video.arrayBuffer();
        feedbackData.videoBuffer = Buffer.from(arrayBuffer);
        feedbackData.videoType = video.type || 'video/webm';
        feedbackData.videoSize = video.size;
      }

      if (eventLogs && eventLogs instanceof Blob) {
        const text = await eventLogs.text();
        try {
          feedbackData.eventLogs = JSON.parse(text);
        } catch (e) {
          feedbackData.eventLogs = [];
        }
      }

      return { action, feedbackData };
    }
  }

  // Express/Pages Router with body already parsed (JSON)
  if (req.body) {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    return {
      action: body.action || 'create',
      feedbackData: body.feedbackData || body,
      issueKey: body.issueKey,
      status: body.status,
      comment: body.comment
    };
  }

  throw new Error('Unable to parse request body');
}

let _jiraInsecureWarned = false;
function warnIfInsecure(config) {
  if (config.security || config.__suppressInsecureWarning || _jiraInsecureWarned) return;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    _jiraInsecureWarned = true;
    console.warn('[react-visual-feedback] createJiraHandler() called without withSecureDefaults wrapper in production. Wrap with withSecureDefaults({ authorize }) for origin, CSRF, rate-limit, and authorization checks. See docs/production-security-checklist.md');
  }
}

/**
 * Create Jira handler with configuration.
 *
 * Two call patterns:
 *   1. Legacy: (req, res) => Response. Parses request itself.
 *   2. Secure: (feedbackData, { authContext, securityContext }) — invoked by
 *      withSecureDefaults with already-parsed, validated, redacted data.
 */
export function createJiraHandler(config = {}) {
  warnIfInsecure(config);

  const handler = async (req, res) => {
    // Secure path: invoked by withSecureDefaults with parsed feedbackData + ctx.
    if (res && typeof res === 'object' && res.authContext) {
      const feedbackData = req;
      const client = new JiraClient(config);
      const result = await handleCreate(client, feedbackData, config);
      return { data: result };
    }

    try {
      // Parse body - supports both JSON and FormData
      const { action = 'create', feedbackData, issueKey, status, comment } = await parseFormData(req);

      const client = new JiraClient(config);

      let result;

      switch (action) {
        case 'create':
          result = await handleCreate(client, feedbackData, config);
          break;

        case 'updateStatus':
          result = await handleStatusUpdate(client, issueKey, status, config);
          break;

        case 'getStatus':
          result = await handleGetStatus(client, issueKey, config);
          break;

        case 'addComment':
          result = await handleAddComment(client, issueKey, comment);
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Send response based on environment
      if (res?.json) {
        res.status(200).json(result);
      } else {
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      const errorResponse = {
        success: false,
        error: error.message
      };

      if (res?.json) {
        res.status(500).json(errorResponse);
      } else {
        return new Response(JSON.stringify(errorResponse), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  };

  return handler;
}

/**
 * Handle issue creation
 */
async function handleCreate(client, feedbackData, config) {
  // Transform feedback to Jira issue format
  const issueData = feedbackToJiraIssue(feedbackData, {
    projectKey: config.projectKey || client.projectKey,
    fields: config.fields,
    customFields: config.customFields,
    includePriority: config.includePriority
  });

  // Create the issue
  const issue = await client.createIssue(issueData);
  const issueKey = issue.key;

  // Upload attachments
  const attachments = [];

  // Handle screenshot - support both Buffer (from FormData) and base64 string
  if (config.uploadAttachments !== false) {
    if (feedbackData.screenshotBuffer) {
      // Screenshot came as Buffer from FormData
      try {
        const result = await client.addAttachment(
          issueKey,
          `screenshot-${feedbackData.id || Date.now()}.png`,
          feedbackData.screenshotBuffer,
          feedbackData.screenshotType || 'image/png'
        );
        attachments.push({ type: 'screenshot', ...result[0] });
      } catch (err) {
        attachments.push({ type: 'screenshot', error: err.message });
      }
    } else if (feedbackData.screenshot && typeof feedbackData.screenshot === 'string') {
      // Screenshot is base64 string (legacy JSON format)
      try {
        const result = await client.addAttachment(
          issueKey,
          `screenshot-${feedbackData.id || Date.now()}.png`,
          feedbackData.screenshot,
          'image/png'
        );
        attachments.push({ type: 'screenshot', ...result[0] });
      } catch (err) {
        attachments.push({ type: 'screenshot', error: err.message });
      }
    }
  }

  // Handle video - support both Buffer (from FormData) and base64 string
  if (config.uploadAttachments !== false) {
    if (feedbackData.videoBuffer) {
      // Video came as Buffer from FormData - most efficient!
      try {
        const videoType = feedbackData.videoType || 'video/webm';
        const extension = videoType.includes('mp4') ? 'mp4' : 'webm';

        const result = await client.addAttachment(
          issueKey,
          `recording-${feedbackData.id || Date.now()}.${extension}`,
          feedbackData.videoBuffer,
          videoType
        );
        attachments.push({
          type: 'video',
          size: feedbackData.videoSize || feedbackData.videoBuffer.length,
          ...result[0]
        });
      } catch (err) {
        attachments.push({ type: 'video', error: err.message });
      }
    } else if (feedbackData.video && typeof feedbackData.video === 'string') {
      // Video is base64 string (legacy JSON format)
      try {
        const videoData = feedbackData.video;

        if (!videoData.startsWith('data:')) {
          throw new Error('Video data is not a valid data URL');
        }

        if (videoData.length < 1000) {
          throw new Error(`Video data appears truncated (only ${videoData.length} chars)`);
        }

        let videoType = 'video/webm';
        let extension = 'webm';
        if (videoData.includes('video/mp4')) {
          videoType = 'video/mp4';
          extension = 'mp4';
        }

        const result = await client.addAttachment(
          issueKey,
          `recording-${feedbackData.id || Date.now()}.${extension}`,
          videoData,
          videoType
        );
        attachments.push({ type: 'video', ...result[0] });
      } catch (err) {
        attachments.push({ type: 'video', error: err.message });
      }
    }
  }

  // Upload event logs as a formatted text file
  if (feedbackData.eventLogs && feedbackData.eventLogs.length > 0 && config.uploadAttachments !== false) {
    try {
      const logsText = formatEventLogs(feedbackData.eventLogs);
      const logsBuffer = Buffer.from(logsText, 'utf-8');
      const result = await client.addAttachment(
        issueKey,
        `session-logs-${feedbackData.id || Date.now()}.txt`,
        logsBuffer,
        'text/plain'
      );
      attachments.push({ type: 'logs', ...result[0] });
    } catch (err) {
      attachments.push({ type: 'logs', error: err.message });
    }
  }

  // Include debug info
  const debugInfo = {
    videoBufferReceived: !!feedbackData.videoBuffer,
    videoBufferSize: feedbackData.videoBuffer ? feedbackData.videoBuffer.length : 0,
    videoBase64Received: !!feedbackData.video,
    videoBase64Length: feedbackData.video ? feedbackData.video.length : 0,
    screenshotBufferReceived: !!feedbackData.screenshotBuffer,
    eventLogsCount: feedbackData.eventLogs ? feedbackData.eventLogs.length : 0
  };

  return {
    success: true,
    issueKey,
    issueId: issue.id,
    issueUrl: `https://${client.domain}/browse/${issueKey}`,
    attachments,
    debug: debugInfo
  };
}

/**
 * Handle status update (local -> Jira)
 */
async function handleStatusUpdate(client, issueKey, localStatus, config) {
  const jiraStatus = mapLocalStatusToJira(localStatus, config.statusMapping?.toJira);

  await client.transitionIssue(issueKey, jiraStatus);

  return {
    success: true,
    issueKey,
    newStatus: jiraStatus
  };
}

/**
 * Handle get status (Jira -> local)
 */
async function handleGetStatus(client, issueKey, config) {
  const jiraStatus = await client.getIssueStatus(issueKey);
  const localStatus = mapJiraStatusToLocal(jiraStatus, config.statusMapping?.fromJira);

  return {
    success: true,
    issueKey,
    jiraStatus,
    localStatus
  };
}

/**
 * Handle add comment
 */
async function handleAddComment(client, issueKey, comment) {
  await client.addComment(issueKey, comment);

  return {
    success: true,
    issueKey
  };
}

// ============================================
// FRAMEWORK-SPECIFIC EXPORTS
// ============================================

/**
 * Next.js App Router handler
 * Returns a function that can be directly exported as POST
 */
export function createNextAppHandler(config = {}) {
  const handler = createJiraHandler(config);

  return async (request) => {
    // Pass the request directly - parseFormData handles both FormData and JSON
    return handler(request, null);
  };
}

/**
 * Next.js Pages Router handler
 */
export function createNextPagesHandler(config = {}) {
  return createJiraHandler(config);
}

/**
 * Express middleware
 */
export function createExpressMiddleware(config = {}) {
  const handler = createJiraHandler(config);

  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Generic handler for any framework
 */
export function createGenericHandler(config = {}) {
  return createJiraHandler(config);
}

// ============================================
// WEBHOOK HANDLERS (For Jira Automation / Zapier)
// ============================================

/**
 * Format feedback for Jira Automation webhook
 */
export function formatForJiraAutomation(feedbackData, config = {}) {
  return {
    summary: `[Feedback] ${(feedbackData.feedback || '').substring(0, 200)}`,
    description: feedbackToJiraIssue(feedbackData, config).fields.description,
    type: feedbackData.type || 'bug',
    userName: feedbackData.userName || 'Anonymous',
    userEmail: feedbackData.userEmail || '',
    url: feedbackData.url || '',
    hasScreenshot: !!feedbackData.screenshot,
    hasVideo: !!feedbackData.video,
    timestamp: feedbackData.timestamp || new Date().toISOString()
  };
}

/**
 * Format feedback for Zapier webhook
 */
export function formatForZapier(feedbackData) {
  return {
    id: feedbackData.id,
    feedback: feedbackData.feedback,
    type: feedbackData.type,
    status: feedbackData.status,
    user_name: feedbackData.userName,
    user_email: feedbackData.userEmail,
    page_url: feedbackData.url,
    viewport: feedbackData.viewport ? `${feedbackData.viewport.width}x${feedbackData.viewport.height}` : '',
    has_screenshot: !!feedbackData.screenshot,
    has_video: !!feedbackData.video,
    element_selector: feedbackData.elementInfo?.selector || '',
    component_name: (feedbackData.elementInfo?.componentStack || [])[0] || '',
    source_file: feedbackData.elementInfo?.sourceFile || '',
    timestamp: feedbackData.timestamp || new Date().toISOString()
  };
}

// Default export for easy importing
export default createJiraHandler;
