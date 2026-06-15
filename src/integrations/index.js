/**
 * React Visual Feedback - Client-Side Integration Manager
 *
 * Handles communication with integration endpoints and webhooks.
 * Used internally by FeedbackProvider and FeedbackDashboard.
 */

import {
  DEFAULT_SHEET_COLUMNS,
  DEFAULT_JIRA_FIELDS,
  DEFAULT_JIRA_STATUS_MAPPING,
  INTEGRATION_TYPES,
  feedbackToSheetRow,
  getSheetHeaders
} from './config.js';
import { isInsecureWebhookMode } from '../lib/feedbackSecurity.js';

const _warnedInsecureModes = new Set();
function maybeWarnInsecure(modeKey) {
  if (!modeKey || _warnedInsecureModes.has(modeKey)) return;
  _warnedInsecureModes.add(modeKey);
  console.warn(
    `[react-visual-feedback] Using insecure webhook mode "${modeKey}" — provider URL is shipped to the browser and acts as a secret. Switch to a server-mediated endpoint. See docs/production-security-checklist.md`
  );
}

// ============================================
// INTEGRATION CLIENT
// ============================================

export class IntegrationClient {
  constructor(config = {}) {
    this.jiraConfig = config.jira || null;
    this.sheetsConfig = config.sheets || null;
    this.onError = config.onError || (() => {});
    this.onSuccess = config.onSuccess || (() => {});
    this.getAuthHeaders = typeof config.getAuthHeaders === 'function' ? config.getAuthHeaders : null;
  }

  async _resolveAuthHeaders() {
    if (!this.getAuthHeaders) return {};
    try {
      const h = await this.getAuthHeaders();
      return h && typeof h === 'object' ? h : {};
    } catch {
      return {};
    }
  }

  /**
   * Send feedback to selected integrations
   * @param {Object} feedbackData - The feedback data to send
   * @param {Object} options - Optional. Specify which integrations to send to
   * @param {boolean} options.jira - Send to Jira (defaults to jiraConfig.enabled)
   * @param {boolean} options.sheets - Send to Sheets (defaults to sheetsConfig.enabled)
   */
  async sendFeedback(feedbackData, options = {}) {
    const results = {
      jira: null,
      sheets: null
    };

    // Determine which integrations to use
    // If options are provided, use them; otherwise fall back to config
    const sendToJira = options.jira !== undefined ? options.jira : this.jiraConfig?.enabled;
    const sendToSheets = options.sheets !== undefined ? options.sheets : this.sheetsConfig?.enabled;

    const promises = [];

    if (sendToJira && this.jiraConfig?.enabled) {
      promises.push(
        this.sendToJira(feedbackData)
          .then(r => { results.jira = r; })
          .catch(e => { results.jira = { success: false, error: e.message }; })
      );
    }

    if (sendToSheets && this.sheetsConfig?.enabled) {
      promises.push(
        this.sendToSheets(feedbackData)
          .then(r => { results.sheets = r; })
          .catch(e => { results.sheets = { success: false, error: e.message }; })
      );
    }

    await Promise.all(promises);

    return results;
  }

  /**
   * Send feedback to Jira
   */
  async sendToJira(feedbackData) {
    const config = this.jiraConfig;

    if (!config?.enabled) {
      return { success: false, error: 'Jira integration not enabled' };
    }

    const type = config.type || INTEGRATION_TYPES.JIRA.SERVER;

    if (isInsecureWebhookMode(type)) {
      maybeWarnInsecure(`jira:${type}`);
    }

    switch (type) {
      case INTEGRATION_TYPES.JIRA.SERVER:
        return this.sendToJiraServer(feedbackData, config);

      case INTEGRATION_TYPES.JIRA.AUTOMATION:
        return this.sendToJiraAutomation(feedbackData, config);

      case INTEGRATION_TYPES.JIRA.ZAPIER:
        return this.sendToZapier(feedbackData, config.webhookUrl, 'jira');

      default:
        throw new Error(`Unknown Jira integration type: ${type}`);
    }
  }

  /**
   * Send to our server handler using FormData for large file support
   */
  async sendToJiraServer(feedbackData, config) {
    const endpoint = config.endpoint || '/api/feedback/jira';

    // Use FormData for efficient binary data transfer
    const formData = new FormData();
    formData.append('action', 'create');

    // Separate binary data from metadata
    const { video, videoBlob, screenshot, eventLogs, ...metadata } = feedbackData;

    // Add metadata as JSON
    formData.append('metadata', JSON.stringify(metadata));

    // Add screenshot if present (as base64 string or blob)
    if (screenshot) {
      if (screenshot instanceof Blob) {
        formData.append('screenshot', screenshot, 'screenshot.png');
      } else if (typeof screenshot === 'string' && screenshot.startsWith('data:')) {
        // Convert base64 to blob for efficient transfer
        const screenshotBlob = await this.dataURLToBlob(screenshot);
        if (screenshotBlob) {
          formData.append('screenshot', screenshotBlob, 'screenshot.png');
        }
      }
    }

    // Add video if present (as blob - much more efficient than base64)
    if (videoBlob && videoBlob instanceof Blob) {
      const extension = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
      formData.append('video', videoBlob, `recording.${extension}`);
    } else if (video) {
      // Video is already base64 string - convert to blob
      if (typeof video === 'string' && video.startsWith('data:')) {
        const videoAsBlob = await this.dataURLToBlob(video);
        if (videoAsBlob) {
          const extension = video.includes('video/mp4') ? 'mp4' : 'webm';
          formData.append('video', videoAsBlob, `recording.${extension}`);
        }
      }
    }

    // Add event logs as JSON file
    if (eventLogs && eventLogs.length > 0) {
      const logsBlob = new Blob([JSON.stringify(eventLogs, null, 2)], { type: 'application/json' });
      formData.append('eventLogs', logsBlob, 'session-logs.json');
    }

    const authHeaders = await this._resolveAuthHeaders();
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type for multipart — the browser sets it with boundary.
      headers: { ...authHeaders },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const result = await response.json();
    this.onSuccess('jira', result);
    return result;
  }

  /**
   * Convert data URL to Blob
   */
  async dataURLToBlob(dataURL) {
    try {
      const response = await fetch(dataURL);
      return await response.blob();
    } catch (e) {
      return null;
    }
  }

  /**
   * Send to Jira Automation webhook
   */
  async sendToJiraAutomation(feedbackData, config) {
    if (!config.webhookUrl) {
      throw new Error('Jira Automation webhook URL not configured');
    }

    const payload = {
      summary: `[Feedback] ${(feedbackData.feedback || '').substring(0, 200)}`,
      description: feedbackData.feedback,
      type: feedbackData.type || 'bug',
      userName: feedbackData.userName || 'Anonymous',
      userEmail: feedbackData.userEmail || '',
      url: feedbackData.url || '',
      viewport: feedbackData.viewport ? `${feedbackData.viewport.width}x${feedbackData.viewport.height}` : '',
      hasScreenshot: !!feedbackData.screenshot,
      hasVideo: !!feedbackData.video,
      timestamp: feedbackData.timestamp || new Date().toISOString(),
      feedbackId: feedbackData.id
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Jira Automation webhook failed: ${response.status}`);
    }

    const result = { success: true, type: 'jira-automation' };
    this.onSuccess('jira', result);
    return result;
  }

  /**
   * Send feedback to Google Sheets
   */
  async sendToSheets(feedbackData) {
    const config = this.sheetsConfig;

    if (!config?.enabled) {
      return { success: false, error: 'Sheets integration not enabled' };
    }

    const type = config.type || INTEGRATION_TYPES.SHEETS.SERVER;

    if (isInsecureWebhookMode(type)) {
      maybeWarnInsecure(`sheets:${type}`);
    }

    switch (type) {
      case INTEGRATION_TYPES.SHEETS.SERVER:
      case INTEGRATION_TYPES.SHEETS.OAUTH:
        return this.sendToSheetsServer(feedbackData, config);

      case INTEGRATION_TYPES.SHEETS.APPS_SCRIPT:
        return this.sendToAppsScript(feedbackData, config);

      case INTEGRATION_TYPES.SHEETS.ZAPIER:
        return this.sendToZapier(feedbackData, config.webhookUrl, 'sheets');

      default:
        throw new Error(`Unknown Sheets integration type: ${type}`);
    }
  }

  /**
   * Send to our server handler
   */
  async sendToSheetsServer(feedbackData, config) {
    const endpoint = config.endpoint || '/api/feedback/sheets';

    const authHeaders = await this._resolveAuthHeaders();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        action: 'append',
        feedbackData
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const result = await response.json();
    this.onSuccess('sheets', result);
    return result;
  }

  /**
   * Send to Google Apps Script deployment
   */
  async sendToAppsScript(feedbackData, config) {
    if (!config.deploymentUrl) {
      throw new Error('Google Apps Script deployment URL not configured');
    }

    const response = await fetch(config.deploymentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'append',
        feedbackData
      })
    });

    if (!response.ok) {
      throw new Error(`Apps Script request failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Apps Script returned error');
    }

    this.onSuccess('sheets', result);
    return result;
  }

  /**
   * Send to Zapier webhook
   */
  async sendToZapier(feedbackData, webhookUrl, type) {
    if (!webhookUrl) {
      throw new Error(`Zapier webhook URL not configured for ${type}`);
    }

    const payload = {
      timestamp: new Date().toISOString(),
      id: feedbackData.id,
      feedback: feedbackData.feedback,
      type: feedbackData.type || 'bug',
      status: feedbackData.status || 'new',
      user_name: feedbackData.userName || 'Anonymous',
      user_email: feedbackData.userEmail || '',
      page_url: feedbackData.url || '',
      viewport: feedbackData.viewport ? `${feedbackData.viewport.width}x${feedbackData.viewport.height}` : '',
      has_screenshot: !!feedbackData.screenshot,
      has_video: !!feedbackData.video,
      element_selector: feedbackData.elementInfo?.selector || '',
      component_name: (feedbackData.elementInfo?.componentStack || [])[0] || ''
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Zapier webhook failed: ${response.status}`);
    }

    const result = { success: true, type: 'zapier' };
    this.onSuccess(type, result);
    return result;
  }

  /**
   * Update status in Jira
   */
  async updateJiraStatus(issueKey, status) {
    if (!this.jiraConfig?.enabled || !this.jiraConfig?.syncStatus) {
      return null;
    }

    const endpoint = this.jiraConfig.endpoint || '/api/feedback/jira';

    const authHeaders = await this._resolveAuthHeaders();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        action: 'updateStatus',
        issueKey,
        status
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update Jira status');
    }

    return response.json();
  }

  /**
   * Update status in Sheets
   */
  async updateSheetsStatus(feedbackId, status) {
    if (!this.sheetsConfig?.enabled) {
      return null;
    }

    const type = this.sheetsConfig.type || INTEGRATION_TYPES.SHEETS.SERVER;

    if (type === INTEGRATION_TYPES.SHEETS.APPS_SCRIPT) {
      const response = await fetch(this.sheetsConfig.deploymentUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateStatus',
          feedbackId,
          status
        })
      });
      return response.json();
    }

    const endpoint = this.sheetsConfig.endpoint || '/api/feedback/sheets';

    const authHeaders = await this._resolveAuthHeaders();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        action: 'updateStatus',
        feedbackId,
        status
      })
    });

    return response.json();
  }

  /**
   * Get Jira issue status
   */
  async getJiraStatus(issueKey) {
    if (!this.jiraConfig?.enabled) {
      return null;
    }

    const endpoint = this.jiraConfig.endpoint || '/api/feedback/jira';

    const authHeaders = await this._resolveAuthHeaders();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        action: 'getStatus',
        issueKey
      })
    });

    return response.json();
  }
}

// Expose for test cleanup
IntegrationClient._warnedModes = _warnedInsecureModes;

// ============================================
// REACT HOOK
// ============================================

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * React hook for managing integrations
 */
export function useIntegrations(config = {}) {
  const clientRef = useRef(null);
  const [status, setStatus] = useState({
    jira: { loading: false, error: null, result: null },
    sheets: { loading: false, error: null, result: null }
  });

  // Initialize client
  useEffect(() => {
    clientRef.current = new IntegrationClient({
      ...config,
      onSuccess: (type, result) => {
        setStatus(prev => ({
          ...prev,
          [type]: { loading: false, error: null, result }
        }));
      },
      onError: (type, error) => {
        setStatus(prev => ({
          ...prev,
          [type]: { loading: false, error: error.message, result: null }
        }));
      }
    });
  }, [config.jira?.enabled, config.sheets?.enabled]);

  /**
   * Send feedback to integrations
   */
  const sendFeedback = useCallback(async (feedbackData) => {
    if (!clientRef.current) return null;

    // Set loading state
    setStatus(prev => ({
      jira: config.jira?.enabled ? { ...prev.jira, loading: true } : prev.jira,
      sheets: config.sheets?.enabled ? { ...prev.sheets, loading: true } : prev.sheets
    }));

    try {
      const results = await clientRef.current.sendFeedback(feedbackData);

      // Update status based on results
      setStatus({
        jira: results.jira
          ? { loading: false, error: results.jira.error || null, result: results.jira }
          : { loading: false, error: null, result: null },
        sheets: results.sheets
          ? { loading: false, error: results.sheets.error || null, result: results.sheets }
          : { loading: false, error: null, result: null }
      });

      return results;
    } catch (error) {
      setStatus(prev => ({
        jira: { ...prev.jira, loading: false, error: error.message },
        sheets: { ...prev.sheets, loading: false, error: error.message }
      }));
      throw error;
    }
  }, [config.jira?.enabled, config.sheets?.enabled]);

  /**
   * Update status in integrations
   */
  const updateStatus = useCallback(async (feedbackItem, newStatus) => {
    if (!clientRef.current) return null;

    const results = {};

    if (feedbackItem.jiraKey && config.jira?.syncStatus) {
      results.jira = await clientRef.current.updateJiraStatus(feedbackItem.jiraKey, newStatus);
    }

    if (config.sheets?.enabled) {
      results.sheets = await clientRef.current.updateSheetsStatus(feedbackItem.id, newStatus);
    }

    return results;
  }, [config.jira?.syncStatus, config.sheets?.enabled]);

  return {
    status,
    sendFeedback,
    updateStatus,
    client: clientRef.current
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  DEFAULT_SHEET_COLUMNS,
  DEFAULT_JIRA_FIELDS,
  DEFAULT_JIRA_STATUS_MAPPING,
  INTEGRATION_TYPES,
  feedbackToSheetRow,
  getSheetHeaders
} from './config.js';

// Export Apps Script template getter for documentation
export { getAppsScriptTemplate } from './sheets.js';
