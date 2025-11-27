# React Visual Feedback

A powerful, visual feedback collection tool for React applications with screen recording, session replay, and an integrated dashboard for managing user feedback.

## Features

### Feedback Collection
- **Visual Element Selection** - Click any element with hover highlighting
- **Screenshot Capture** - Automatic pixel-perfect screenshot with CSS rendering
- **Screen Recording** - Record screen with audio and capture console/network logs
- **Manual Feedback** - `Alt+A` to open form directly without selection
- **File Attachments** - Drag & drop support for Images, Videos, PDFs, and other files
- **Canvas Drawing** - Annotate screenshots with drawings and highlights
- **React Component Detection** - Automatically detects React component names and source files
- **Keyboard Shortcuts** - `Alt+Q` (Selection), `Alt+A` (Manual), `Alt+W` (Record), `Esc` (Cancel)

### Session Replay
- **Video Playback** - Watch recorded user sessions
- **Console Logs** - See console.log, errors, warnings synced with video
- **Network Requests** - Track API calls and responses
- **Expandable Logs Panel** - Slide-out panel on the right side (customizable)

### Dashboard
- **Professional UI** - Clean 700px slide-out panel
- **Developer Mode** - Full technical details (source file, component stack, viewport)
- **User Mode** - Simplified view for end users
- **8 Status Options** - New, Open, In Progress, Under Review, On Hold, Resolved, Closed, Won't Fix
- **Status Callbacks** - Sync with your database on status changes

### Theming
- **Light/Dark Mode** - Full theme support
- **styled-components** - No external CSS required

## Installation

```bash
npm install react-visual-feedback
```

**Peer Dependencies:**
```bash
npm install react react-dom styled-components
```

## Quick Start

### Basic Usage

```jsx
import React from 'react';
import { FeedbackProvider } from 'react-visual-feedback';

function App() {
  const handleFeedbackSubmit = async (feedbackData) => {
    console.log('Feedback received:', feedbackData);
    // feedbackData.attachment contains any manually uploaded file
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });
  };

  return (
    <FeedbackProvider onSubmit={handleFeedbackSubmit}>
      <YourApp />
    </FeedbackProvider>
  );
}
```

### With Dashboard & Screen Recording

```jsx
import React from 'react';
import { FeedbackProvider, useFeedback } from 'react-visual-feedback';

function FeedbackButtons() {
  const { isActive, setIsActive, setIsDashboardOpen, startRecording } = useFeedback();

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', gap: 10 }}>
      <button onClick={() => setIsDashboardOpen(true)}>Dashboard</button>
      <button onClick={startRecording}>Record Screen</button>
      <button onClick={() => setIsActive(!isActive)}>
        {isActive ? 'Cancel' : 'Report Issue'}
      </button>
    </div>
  );
}

function App() {
  const handleFeedbackSubmit = async (feedbackData) => {
    // feedbackData contains: feedback, screenshot, video, attachment, eventLogs, elementInfo, etc.
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });
  };

  const handleStatusChange = async ({ id, status, comment }) => {
    await fetch(`/api/feedback/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, comment })
    });
  };

  return (
    <FeedbackProvider
      onSubmit={handleFeedbackSubmit}
      onStatusChange={handleStatusChange}
      dashboard={true}
      isDeveloper={true}
      userName="John Doe"
      userEmail="john@example.com"
      mode="light"
      defaultOpen={false} // Set to true to open feedback form on mount
    >
      <YourApp />
      <FeedbackButtons />
    </FeedbackProvider>
  );
}
```

## API Reference

### FeedbackProvider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSubmit` | `(data) => Promise` | required | Callback when feedback is submitted |
| `onStatusChange` | `({id, status, comment}) => void` | - | Callback when status changes |
| `dashboard` | `boolean` | `false` | Enable dashboard feature |
| `dashboardData` | `Array` | - | Custom data (uses localStorage if undefined) |
| `isDeveloper` | `boolean` | `false` | Enable developer mode |
| `isUser` | `boolean` | `true` | Enable user mode |
| `userName` | `string` | `'Anonymous'` | User name |
| `userEmail` | `string` | `null` | User email |
| `mode` | `'light' \| 'dark'` | `'light'` | Theme mode |
| `isActive` | `boolean` | - | Controlled active state |
| `onActiveChange` | `(active) => void` | - | Callback for controlled mode |
| `defaultOpen` | `boolean` | `false` | Open manual feedback form immediately on mount |

### FeedbackDashboard Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | required | Control dashboard visibility |
| `onClose` | `() => void` | required | Callback when dashboard closes |
| `data` | `Array` | - | Feedback data (uses localStorage if undefined) |
| `isDeveloper` | `boolean` | `false` | Enable developer mode with delete |
| `isUser` | `boolean` | `true` | Enable user mode |
| `onStatusChange` | `({id, status, comment}) => void` | - | Callback when status changes |
| `mode` | `'light' \| 'dark'` | `'light'` | Theme mode |
| `isLoading` | `boolean` | `false` | Show loading state |
| `onRefresh` | `() => void` | - | Callback for refresh button |
| `title` | `string` | `'Feedback'` | Dashboard title |
| `statuses` | `object` | `DEFAULT_STATUSES` | Status configurations (label, color, icon) |
| `acceptableStatuses` | `string[]` | - | Array of status keys to show (e.g., `['open', 'resolved']`) |
| `showAllStatuses` | `boolean` | `true` | Show all statuses in filter |
| `error` | `string` | `null` | Error message to display |

### useFeedback Hook

```jsx
const {
  isActive,           // boolean - feedback mode active
  setIsActive,        // (active: boolean) => void
  setIsDashboardOpen, // (open: boolean) => void
  startRecording      // () => void - start screen recording
} = useFeedback();
```

### SessionReplay Props (for custom implementations)

```jsx
import { SessionReplay } from 'react-visual-feedback';

<SessionReplay
  videoSrc={videoDataUrl}      // Video source (data URL, blob URL, or http URL)
  eventLogs={logs}             // Array of log objects with timestamp
  mode="light"                 // Theme mode
  showLogsButton={true}        // Show/hide logs toggle button
  logsPanelWidth="320px"       // Width of logs panel
  defaultLogsOpen={false}      // Start with logs panel open
/>
```

## Data Structures

### Feedback Data (submitted via onSubmit)

```typescript
interface FeedbackData {
  id: string;                    // UUID
  feedback: string;              // User's feedback text
  type: 'bug' | 'feature' | 'improvement' | 'question' | 'other';
  userName: string;
  userEmail: string | null;
  status: string;                // 'new', 'open', 'inProgress', etc.
  timestamp: string;             // ISO 8601
  url: string;                   // Page URL
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };

  // Attachments
  screenshot?: string;           // Base64 PNG data URL (Automatic)
  video?: string;                // Base64 webm data URL (Recording)
  attachment?: File;             // Generic file (Manual Upload)

  eventLogs?: EventLog[];        // Console/network logs

  // Element info (for element selection)
  elementInfo?: {
    tagName: string;
    id: string;
    className: string;
    selector: string;
    text: string;
    position: { x: number; y: number; width: number; height: number };
    styles: { backgroundColor: string; color: string; fontSize: string };
    sourceFile?: string;         // React source file path
    lineNumber?: number;
    columnNumber?: number;
    componentStack?: string[];   // React component hierarchy
  };
}

interface EventLog {
  timestamp: number;             // Milliseconds from recording start
  type: 'log' | 'warn' | 'error' | 'info' | 'network';
  message: string;
  data?: any;
}
```

## Database Schema (SQL)

### PostgreSQL

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main feedback table
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'bug' CHECK (type IN ('bug', 'feature', 'improvement', 'question', 'other')),
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'open', 'inProgress', 'underReview', 'onHold', 'resolved', 'closed', 'wontFix')),

    -- User info
    user_name VARCHAR(255) DEFAULT 'Anonymous',
    user_email VARCHAR(255),

    -- Page context
    url TEXT,
    user_agent TEXT,
    viewport_width INTEGER,
    viewport_height INTEGER,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Screenshots table (separate for large data)
CREATE TABLE feedback_screenshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    screenshot TEXT NOT NULL,  -- Base64 encoded PNG
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Videos table (for screen recordings)
CREATE TABLE feedback_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    video_data TEXT,           -- Base64 encoded webm (for small videos)
    video_url TEXT,            -- URL to cloud storage (for large videos)
    duration_ms INTEGER,
    file_size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Generic attachments table
CREATE TABLE feedback_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    file_size_bytes BIGINT,
    file_data TEXT,            -- Base64 or URL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Event logs table (console logs, network requests)
CREATE TABLE feedback_event_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    timestamp_ms INTEGER NOT NULL,  -- Milliseconds from recording start
    log_type VARCHAR(20) NOT NULL CHECK (log_type IN ('log', 'warn', 'error', 'info', 'network')),
    message TEXT NOT NULL,
    data JSONB,                     -- Additional log data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Element info table (for element selection feedback)
CREATE TABLE feedback_element_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    tag_name VARCHAR(50),
    element_id VARCHAR(255),
    class_name TEXT,
    css_selector TEXT,
    inner_text TEXT,
    position_x INTEGER,
    position_y INTEGER,
    width INTEGER,
    height INTEGER,
    background_color VARCHAR(50),
    color VARCHAR(50),
    font_size VARCHAR(20),

    -- React component info
    source_file TEXT,
    line_number INTEGER,
    column_number INTEGER,
    component_stack TEXT[],

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Status history table (track status changes)
CREATE TABLE feedback_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    comment TEXT,
    changed_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_user_email ON feedback(user_email);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_event_logs_feedback_id ON feedback_event_logs(feedback_id);
CREATE INDEX idx_event_logs_timestamp ON feedback_event_logs(timestamp_ms);
CREATE INDEX idx_status_history_feedback_id ON feedback_status_history(feedback_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### MySQL

```sql
-- Main feedback table
CREATE TABLE feedback (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    feedback TEXT NOT NULL,
    type ENUM('bug', 'feature', 'improvement', 'question', 'other') DEFAULT 'bug',
    status ENUM('new', 'open', 'inProgress', 'underReview', 'onHold', 'resolved', 'closed', 'wontFix') DEFAULT 'new',

    -- User info
    user_name VARCHAR(255) DEFAULT 'Anonymous',
    user_email VARCHAR(255),

    -- Page context
    url TEXT,
    user_agent TEXT,
    viewport_width INT,
    viewport_height INT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status (status),
    INDEX idx_user_email (user_email),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Screenshots table
CREATE TABLE feedback_screenshots (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    feedback_id CHAR(36) NOT NULL,
    screenshot LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Videos table
CREATE TABLE feedback_videos (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    feedback_id CHAR(36) NOT NULL,
    video_data LONGTEXT,
    video_url TEXT,
    duration_ms INT,
    file_size_bytes BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attachments table
CREATE TABLE feedback_attachments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    feedback_id CHAR(36) NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    file_size_bytes BIGINT,
    file_data LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event logs table
CREATE TABLE feedback_event_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    feedback_id CHAR(36) NOT NULL,
    timestamp_ms INT NOT NULL,
    log_type ENUM('log', 'warn', 'error', 'info', 'network') NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
    INDEX idx_feedback_id (feedback_id),
    INDEX idx_timestamp (timestamp_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Element info table
CREATE TABLE feedback_element_info (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    feedback_id CHAR(36) NOT NULL,
    tag_name VARCHAR(50),
    element_id VARCHAR(255),
    class_name TEXT,
    css_selector TEXT,
    inner_text TEXT,
    position_x INT,
    position_y INT,
    width INT,
    height INT,
    background_color VARCHAR(50),
    color VARCHAR(50),
    font_size VARCHAR(20),
    source_file TEXT,
    line_number INT,
    column_number INT,
    component_stack JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Status history table
CREATE TABLE feedback_status_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    feedback_id CHAR(36) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    comment TEXT,
    changed_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
    INDEX idx_feedback_id (feedback_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Example API Endpoints (Node.js/Express)

```javascript
// POST /api/feedback - Submit new feedback
app.post('/api/feedback', async (req, res) => {
  const { feedback, type, userName, userEmail, url, userAgent,
          viewport, screenshot, video, attachment, eventLogs, elementInfo } = req.body;

  // Start transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert main feedback
    const feedbackResult = await client.query(`
      INSERT INTO feedback (feedback, type, user_name, user_email, url, user_agent, viewport_width, viewport_height)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [feedback, type, userName, userEmail, url, userAgent, viewport?.width, viewport?.height]);

    const feedbackId = feedbackResult.rows[0].id;

    // Insert screenshot if exists
    if (screenshot) {
      await client.query(`
        INSERT INTO feedback_screenshots (feedback_id, screenshot)
        VALUES ($1, $2)
      `, [feedbackId, screenshot]);
    }

    // Insert video if exists
    if (video) {
      await client.query(`
        INSERT INTO feedback_videos (feedback_id, video_data)
        VALUES ($1, $2)
      `, [feedbackId, video]);
    }
    
    // Insert manual attachment (generic file)
    if (attachment) {
       // Note: 'attachment' here is assumed to be pre-processed/uploaded file metadata + content
       // In a real app, you might handle file upload separately (multipart/form-data)
       await client.query(`
        INSERT INTO feedback_attachments (feedback_id, file_name, file_data)
        VALUES ($1, $2, $3)
      `, [feedbackId, attachment.name, attachment.data]);
    }

    // Insert event logs if exist
    if (eventLogs?.length) {
      for (const log of eventLogs) {
        await client.query(`
          INSERT INTO feedback_event_logs (feedback_id, timestamp_ms, log_type, message, data)
          VALUES ($1, $2, $3, $4, $5)
        `, [feedbackId, log.timestamp, log.type, log.message, JSON.stringify(log.data)]);
      }
    }

    // Insert element info if exists
    if (elementInfo) {
      await client.query(`
        INSERT INTO feedback_element_info
        (feedback_id, tag_name, element_id, class_name, css_selector, inner_text,
         position_x, position_y, width, height, source_file, line_number, column_number, component_stack)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [feedbackId, elementInfo.tagName, elementInfo.id, elementInfo.className,
          elementInfo.selector, elementInfo.text, elementInfo.position?.x, elementInfo.position?.y,
          elementInfo.position?.width, elementInfo.position?.height, elementInfo.sourceFile,
          elementInfo.lineNumber, elementInfo.columnNumber, elementInfo.componentStack]);
    }

    await client.query('COMMIT');
    res.json({ success: true, id: feedbackId });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// PATCH /api/feedback/:id/status - Update status
app.patch('/api/feedback/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, comment, changedBy } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current status
    const current = await client.query('SELECT status FROM feedback WHERE id = $1', [id]);
    const oldStatus = current.rows[0]?.status;

    // Update status
    await client.query('UPDATE feedback SET status = $1 WHERE id = $2', [status, id]);

    // Record history
    await client.query(`
      INSERT INTO feedback_status_history (feedback_id, old_status, new_status, comment, changed_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, oldStatus, status, comment, changedBy]);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Q` | Activate feedback mode (element selection) |
| `Alt+A` | Open Manual Feedback form |
| `Alt+W` | Start screen recording |
| `Alt+Shift+Q` | Open dashboard |
| `Esc` | Cancel/close |

## Status System

### Default Statuses

| Key | Label | Color | Icon |
|-----|-------|-------|------|
| `new` | New | Purple (#8b5cf6) | Inbox |
| `open` | Open | Amber (#f59e0b) | AlertCircle |
| `inProgress` | In Progress | Blue (#3b82f6) | Play |
| `underReview` | Under Review | Cyan (#06b6d4) | Eye |
| `onHold` | On Hold | Gray (#6b7280) | PauseCircle |
| `resolved` | Resolved | Green (#10b981) | CheckCircle |
| `closed` | Closed | Slate (#64748b) | Archive |
| `wontFix` | Won't Fix | Red (#ef4444) | Ban |

### Custom Statuses

You control which statuses are available. Pass your own `statuses` object and optionally `acceptableStatuses` array to control what's shown:

```jsx
import { FeedbackDashboard } from 'react-visual-feedback';

// Define your status configurations
const myStatuses = {
  open: {
    label: 'Open',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    textColor: '#92400e',
    icon: 'AlertCircle'  // Optional - defaults to AlertCircle if not provided
  },
  in_progress: {
    label: 'In Progress',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    textColor: '#1e40af',
    icon: 'Play'
  },
  resolved: {
    label: 'Resolved',
    color: '#10b981',
    bgColor: '#d1fae5',
    textColor: '#065f46',
    icon: 'CheckCircle'
  }
};

// Option 1: Show all statuses defined in myStatuses
<FeedbackDashboard
  isOpen={true}
  statuses={myStatuses}
  // ... other props
/>

// Option 2: Use acceptableStatuses to show only specific statuses
<FeedbackDashboard
  isOpen={true}
  statuses={myStatuses}
  acceptableStatuses={['open', 'resolved']}  // Only show these 2
  // ... other props
/>
```

#### Extending Default Statuses

If you want to keep the defaults and add more:

```jsx
import { DEFAULT_STATUSES } from 'react-visual-feedback';

const extendedStatuses = {
  ...DEFAULT_STATUSES,
  // Add new status
  testing: {
    key: 'testing',
    label: 'In Testing',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    textColor: '#6d28d9',
    icon: 'Bug'
  },
  // Override existing
  resolved: {
    ...DEFAULT_STATUSES.resolved,
    label: 'Fixed & Deployed'
  }
};
```

### Status Object Structure

```typescript
interface StatusConfig {
  key: string;        // Unique identifier
  label: string;      // Display name in UI
  color: string;      // Border and icon color (hex)
  bgColor: string;    // Background color (hex)
  textColor: string;  // Text color (hex)
  icon: string;       // Icon name from available icons
}
```

### Available Icons

The following icons from Lucide React are available for custom statuses:

| Icon Name | Description |
|-----------|-------------|
| `Inbox` | New items |
| `AlertCircle` | Warnings/alerts |
| `Play` | In progress |
| `Eye` | Under review |
| `PauseCircle` | Paused/on hold |
| `CheckCircle` | Completed/resolved |
| `Archive` | Archived/closed |
| `Ban` | Rejected/won't fix |
| `XCircle` | Cancelled |
| `HelpCircle` | Questions |
| `Lightbulb` | Ideas/features |
| `Bug` | Bug reports |
| `Zap` | Quick actions |
| `MessageSquare` | Comments |

### Status Utility Functions

```jsx
import {
  getStatusData,       // Get status config with safe defaults
  getIconComponent,    // Get icon component from name
  normalizeStatusKey,  // Normalize status key to available options
  StatusBadge,         // Status badge component
  StatusDropdown       // Status dropdown component
} from 'react-visual-feedback';

// Get status data with fallbacks for missing properties
const statusData = getStatusData('inProgress', customStatuses);
// Returns: { key, label, color, bgColor, textColor, icon }

// Get icon component from string name
const Icon = getIconComponent('CheckCircle');
// Returns: Lucide React component

// Normalize various status formats to valid keys
const key = normalizeStatusKey('in_progress', customStatuses);
// Returns: 'inProgress'
```

### Status Key Normalization

The widget automatically normalizes various status key formats:

| Input | Normalized To |
|-------|---------------|
| `reported`, `submitted`, `pending` | `new` |
| `doing`, `in_progress` | `inProgress` |
| `review`, `under_review` | `underReview` |
| `hold`, `on_hold`, `paused` | `onHold` |
| `done`, `fixed`, `completed` | `resolved` |
| `archived` | `closed` |
| `rejected`, `wont_fix`, `cancelled` | `wontFix` |

## Next.js Usage

This package uses browser-only APIs and requires client-side rendering. Use dynamic import with `ssr: false`:

```tsx
// providers/FeedbackProviderClient.tsx
'use client';

import dynamic from 'next/dynamic';

const FeedbackProvider = dynamic(
  () => import('react-visual-feedback').then((mod) => mod.FeedbackProvider),
  { ssr: false }
);

export default function FeedbackProviderClient({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) {
  return (
    <FeedbackProvider {...props}>
      {children}
    </FeedbackProvider>
  );
}
```

Then use in your layout:

```tsx
// app/layout.tsx
import FeedbackProviderClient from './providers/FeedbackProviderClient';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <FeedbackProviderClient
          onSubmit={async (data) => {
            await fetch('/api/feedback', {
              method: 'POST',
              body: JSON.stringify(data)
            });
          }}
          dashboard={true}
          mode="light"
        >
          {children}
        </FeedbackProviderClient>
      </body>
    </html>
  );
}
```

## Browser Support

- Chrome/Edge (recommended for screen recording)
- Firefox
- Safari
- Opera

## All Exports

```jsx
import {
  // Core components
  FeedbackProvider,
  FeedbackModal,
  FeedbackDashboard,
  FeedbackTrigger,
  CanvasOverlay,

  // Hooks
  useFeedback,

  // Status components
  StatusBadge,
  StatusDropdown,

  // Status utilities
  getStatusData,
  getIconComponent,
  normalizeStatusKey,
  DEFAULT_STATUSES,

  // Storage utilities
  saveFeedbackToLocalStorage,

  // Theme utilities
  getTheme,
  lightTheme,
  darkTheme,

  // General utilities
  getElementInfo,
  captureElementScreenshot,
  getReactComponentInfo,
  formatPath
} from 'react-visual-feedback';
```

## Changelog

### v1.5.0
- **Added**: Manual feedback mode (`Alt+A`) - open form without selecting an element
- **Added**: `defaultOpen` prop to automatically open form on mount
- **Added**: Drag & Drop file upload support
- **Added**: Support for generic file attachments (PDF, etc.)
- **Improved**: Dark mode colors for better contrast and readability
- **Improved**: Dashboard status badges now have solid backgrounds for better visibility
- **Improved**: Screenshot preview in dashboard with zoom overlay

### v1.4.2
- **Fixed**: Modal state not resetting after submission (was showing "Sending..." on reopen)
- **Added**: `Alt+W` keyboard shortcut for video recording
- **Improved**: Custom status documentation - clarified that users control which statuses appear
- **Fixed**: Prevented double submission by checking `isSubmitting` state

### v1.4.1
- **Fixed**: `Cannot read properties of undefined (reading 'icon')` error when status data is malformed
- **Added**: `getStatusData()` utility function for safe status access with defaults
- **Improved**: Defensive null checks in StatusBadge, StatusDropdown, and FeedbackDashboard
- **Added**: Export of status utility functions for custom implementations

### v1.4.0
- **Added**: Screen recording with session replay
- **Added**: Console and network log capture during recording
- **Added**: Session replay component with expandable logs panel
- **Improved**: Dashboard UI with video playback support

### v1.3.0
- **Added**: Canvas drawing and annotation support
- **Added**: Download all feedback as ZIP

### v1.2.0
- **Added**: Custom status configurations
- **Added**: Status normalization for various formats

### v1.1.0
- **Added**: Dark mode support
- **Added**: Developer/User mode views

### v1.0.0
- Initial release with element selection and screenshot capture

## License

MIT

## Author

**Murali Vvrsn Gurajapu**
Email: murali.g@hyperverge.co

---

Made with care for better user feedback collection
