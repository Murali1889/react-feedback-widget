/**
 * Utility to save monitoring data (video, network, storage) to local files
 * Saves data in the example/monitoring-data folder
 */

/**
 * Download a file to the user's download folder
 */
function downloadFile(filename, content, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert data URL to Blob
 */
function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Save feedback with monitoring data to local files
 * @param {Object} feedbackData - Complete feedback data including sessionMonitoring
 */
export async function saveMonitoringData(feedbackData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const feedbackId = feedbackData.id || `feedback-${Date.now()}`;

  console.log('💾 Saving monitoring data locally...');

  try {
    // 1. Save the complete feedback data as JSON
    const feedbackJson = JSON.stringify(feedbackData, null, 2);
    downloadFile(
      `${feedbackId}-${timestamp}-complete.json`,
      feedbackJson,
      'application/json'
    );
    console.log('✅ Saved complete feedback JSON');

    // 2. Save session monitoring data separately
    if (feedbackData.sessionMonitoring) {
      const monitoring = feedbackData.sessionMonitoring;

      // Save monitoring data without video (to keep JSON file smaller)
      const monitoringData = {
        duration: monitoring.duration,
        clickEvents: monitoring.clickEvents,
        networkRequests: monitoring.networkRequests,
        storageChanges: monitoring.storageChanges,
        cursorPositions: monitoring.cursorPositions?.slice(0, 50), // First 50 positions
        metadata: monitoring.metadata
      };

      const monitoringJson = JSON.stringify(monitoringData, null, 2);
      downloadFile(
        `${feedbackId}-${timestamp}-monitoring.json`,
        monitoringJson,
        'application/json'
      );
      console.log('✅ Saved monitoring data JSON');

      // 3. Save video recording if available
      if (monitoring.recording) {
        const videoBlob = dataURLtoBlob(monitoring.recording);
        const videoUrl = URL.createObjectURL(videoBlob);
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = `${feedbackId}-${timestamp}-recording.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(videoUrl);
        console.log('✅ Saved video recording');
      }

      // 4. Save network requests separately
      if (monitoring.networkRequests && monitoring.networkRequests.length > 0) {
        const networkJson = JSON.stringify({
          totalRequests: monitoring.networkRequests.length,
          requests: monitoring.networkRequests
        }, null, 2);
        downloadFile(
          `${feedbackId}-${timestamp}-network.json`,
          networkJson,
          'application/json'
        );
        console.log('✅ Saved network requests');
      }

      // 5. Save storage changes separately
      if (monitoring.storageChanges && monitoring.storageChanges.length > 0) {
        const storageJson = JSON.stringify({
          totalChanges: monitoring.storageChanges.length,
          changes: monitoring.storageChanges
        }, null, 2);
        downloadFile(
          `${feedbackId}-${timestamp}-storage.json`,
          storageJson,
          'application/json'
        );
        console.log('✅ Saved storage changes');
      }

      // 6. Generate a summary report
      const summary = {
        feedbackId,
        timestamp,
        user: {
          name: feedbackData.userName,
          email: feedbackData.userEmail
        },
        feedback: feedbackData.feedback,
        url: feedbackData.url,
        monitoring: {
          duration: `${(monitoring.duration / 1000).toFixed(2)}s`,
          hasVideo: !!monitoring.recording,
          totalClicks: monitoring.clickEvents?.length || 0,
          totalNetworkRequests: monitoring.networkRequests?.length || 0,
          totalStorageChanges: monitoring.storageChanges?.length || 0,
          cursorTracked: monitoring.cursorPositions?.length || 0
        },
        files: [
          `${feedbackId}-${timestamp}-complete.json`,
          `${feedbackId}-${timestamp}-monitoring.json`,
          monitoring.recording && `${feedbackId}-${timestamp}-recording.webm`,
          monitoring.networkRequests?.length > 0 && `${feedbackId}-${timestamp}-network.json`,
          monitoring.storageChanges?.length > 0 && `${feedbackId}-${timestamp}-storage.json`
        ].filter(Boolean)
      };

      const summaryJson = JSON.stringify(summary, null, 2);
      downloadFile(
        `${feedbackId}-${timestamp}-summary.json`,
        summaryJson,
        'application/json'
      );
      console.log('✅ Saved summary report');

      console.log('🎉 All monitoring data saved successfully!');
      console.log('📊 Summary:', summary);

      return {
        success: true,
        summary,
        message: 'All monitoring data saved to Downloads folder'
      };
    } else {
      console.log('⚠️ No session monitoring data available');
      return {
        success: true,
        message: 'Feedback saved (no monitoring data)'
      };
    }
  } catch (error) {
    console.error('❌ Error saving monitoring data:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate a readable HTML report of the monitoring data
 */
export function generateMonitoringReport(feedbackData) {
  const monitoring = feedbackData.sessionMonitoring;
  if (!monitoring) return null;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Report - ${feedbackData.id || 'Unknown'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #667eea;
      margin-bottom: 24px;
      font-size: 32px;
    }
    h2 {
      color: #764ba2;
      margin: 24px 0 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #f0f0f0;
    }
    .section {
      margin-bottom: 32px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .meta-item {
      background: white;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .meta-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .meta-value {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
    .event {
      background: white;
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 8px;
      border-left: 4px solid #22c55e;
    }
    .network-req {
      border-left-color: #3b82f6;
    }
    .storage-change {
      border-left-color: #f59e0b;
    }
    .event-time {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }
    .event-details {
      font-size: 14px;
      color: #333;
    }
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Monaco', monospace;
      font-size: 13px;
    }
    video {
      width: 100%;
      max-width: 800px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Feedback Monitoring Report</h1>

    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">User</div>
        <div class="meta-value">${feedbackData.userName || 'Anonymous'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Email</div>
        <div class="meta-value">${feedbackData.userEmail || 'N/A'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Duration</div>
        <div class="meta-value">${(monitoring.duration / 1000).toFixed(2)}s</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Timestamp</div>
        <div class="meta-value">${new Date(feedbackData.timestamp).toLocaleString()}</div>
      </div>
    </div>

    <div class="section">
      <h2>💬 Feedback</h2>
      <p style="font-size: 16px; line-height: 1.6;">${feedbackData.feedback}</p>
    </div>

    ${monitoring.recording ? `
    <div class="section">
      <h2>🎥 Video Recording</h2>
      <video controls src="${monitoring.recording}"></video>
    </div>
    ` : ''}

    ${monitoring.clickEvents && monitoring.clickEvents.length > 0 ? `
    <div class="section">
      <h2>🖱️ Click Events (${monitoring.clickEvents.length})</h2>
      ${monitoring.clickEvents.map(click => `
        <div class="event">
          <div class="event-time">${new Date(click.timestamp).toLocaleTimeString()}</div>
          <div class="event-details">
            Clicked: <code>${click.element.tagName}</code>
            ${click.element.id ? ` #${click.element.id}` : ''}
            ${click.element.className ? ` .${click.element.className}` : ''}
            <br>Position: (${click.clickPosition.x}, ${click.clickPosition.y})
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${monitoring.networkRequests && monitoring.networkRequests.length > 0 ? `
    <div class="section">
      <h2>🌐 Network Requests (${monitoring.networkRequests.length})</h2>
      ${monitoring.networkRequests.map(req => `
        <div class="event network-req">
          <div class="event-time">${new Date(req.timestamp).toLocaleTimeString()}</div>
          <div class="event-details">
            <strong>${req.method}</strong> ${req.url}
            ${req.status ? `<br>Status: ${req.status} (${req.duration}ms)` : ''}
            ${req.error ? `<br><span style="color: #ef4444;">Error: ${req.error}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${monitoring.storageChanges && monitoring.storageChanges.length > 0 ? `
    <div class="section">
      <h2>💾 Storage Changes (${monitoring.storageChanges.length})</h2>
      ${monitoring.storageChanges.map(change => `
        <div class="event storage-change">
          <div class="event-time">${new Date(change.timestamp).toLocaleTimeString()}</div>
          <div class="event-details">
            <strong>${change.action}</strong>
            ${change.key ? `<code>${change.key}</code>` : '(all)'}
            ${change.value ? `: ${change.value.substring(0, 100)}...` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="section">
      <h2>ℹ️ Metadata</h2>
      <div class="event-details">
        <strong>URL:</strong> ${monitoring.metadata.url}<br>
        <strong>Viewport:</strong> ${monitoring.metadata.viewport.width}×${monitoring.metadata.viewport.height}<br>
        <strong>User Agent:</strong> ${monitoring.metadata.userAgent}
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * Download the HTML report
 */
export function downloadMonitoringReport(feedbackData) {
  const html = generateMonitoringReport(feedbackData);
  if (!html) {
    console.warn('No monitoring data to generate report');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const feedbackId = feedbackData.id || `feedback-${Date.now()}`;

  downloadFile(
    `${feedbackId}-${timestamp}-report.html`,
    html,
    'text/html'
  );

  console.log('✅ Saved HTML report');
}
