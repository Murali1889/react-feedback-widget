# React Visual Feedback

A powerful, visual feedback collection tool for React applications with an integrated dashboard for managing user feedback. Users can select any element on your page, and the widget automatically captures a screenshot and context information.

## Features

### Feedback Collection
- 🎯 Visual element selection with hover highlighting
- 📸 Automatic screenshot capture with perfect CSS rendering
- 📝 Rich feedback form with context
- ⚡ Lightweight and performant
- 🎨 Works with any CSS framework (Tailwind, Bootstrap, Material-UI, etc.)
- ⌨️ Keyboard shortcuts (Ctrl+Q to activate, Esc to cancel)
- 🌓 Dark mode support

### Feedback Dashboard
- 📊 Professional dashboard with localStorage or custom data source
- 👨‍💻 Developer mode with full technical details
- 👤 User mode for simplified feedback view
- 🏷️ Status management with 7 professional status options
- 💬 Status change modal with developer comments
- 🔒 Permission system - Users can only view, developers can manage
- 🔄 Status change callbacks for database synchronization
- ⌨️ Dashboard keyboard shortcut (Ctrl+Shift+Q)

### Update Notifications
- 🔔 Beautiful notification component for feedback updates
- 📬 Show users when their feedback status changes
- 🎨 Grouped by status (Completed, In Progress, Other)
- 👋 Dismiss individual updates or all at once
- ⏰ Smart time formatting (e.g., "2 hours ago", "3 days ago")

## Installation

```bash
npm install react-visual-feedback
```

**Important:** Import the CSS file in your application:

```jsx
import 'react-visual-feedback/dist/index.css';
```

## Quick Start

### Basic Usage (Feedback Only)

```jsx
import React from 'react';
import { FeedbackProvider } from 'react-visual-feedback';
import 'react-visual-feedback/dist/index.css';

function App() {
  const handleFeedbackSubmit = async (feedbackData) => {
    console.log('Feedback received:', feedbackData);
    // Send to your backend
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

export default App;
```

### With Dashboard (Full Feature Set)

```jsx
import React from 'react';
import { FeedbackProvider, useFeedback } from 'react-visual-feedback';
import 'react-visual-feedback/dist/index.css';

function FeedbackButtons() {
  const { isActive, setIsActive, setIsDashboardOpen } = useFeedback();

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', gap: 10 }}>
      <button onClick={() => setIsDashboardOpen(true)}>
        📊 Dashboard
      </button>
      <button onClick={() => setIsActive(!isActive)}>
        {isActive ? '✕ Cancel' : '💬 Report Issue'}
      </button>
    </div>
  );
}

function App() {
  const handleFeedbackSubmit = async (feedbackData) => {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });
  };

  const handleStatusChange = async ({ id, status, comment }) => {
    // Update your database with status and developer comment
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
      isDeveloper={true}  // Set to false for user mode
      userName="John Doe"
      userEmail="john@example.com"
    >
      <YourApp />
      <FeedbackButtons />
    </FeedbackProvider>
  );
}

export default App;
```

### With Update Notifications

```jsx
import React, { useState } from 'react';
import {
  FeedbackProvider,
  FeedbackUpdatesNotification
} from 'react-visual-feedback';
import 'react-visual-feedback/dist/index.css';

function App() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [updates, setUpdates] = useState([
    {
      id: '1',
      title: 'Button not working on mobile',
      feedback: 'The submit button is not clickable',
      status: 'resolved',
      responseMessage: 'Fixed! The button now works on all devices.',
      resolvedBy: 'John Developer',
      updatedAt: '2025-11-02T14:30:00Z'
    },
    {
      id: '2',
      title: 'Add dark mode',
      feedback: 'Would be great to have dark mode',
      status: 'inProgress',
      responseMessage: 'Working on it! Should be ready next week.',
      assignedTo: 'Sarah Designer',
      estimatedResolutionDate: '2025-11-10T00:00:00Z',
      updatedAt: '2025-11-01T11:00:00Z'
    }
  ]);

  const handleDismissUpdate = (updateId) => {
    setUpdates(prev => prev.filter(u => u.id !== updateId));
  };

  const handleDismissAll = () => {
    setUpdates([]);
    setShowNotifications(false);
  };

  return (
    <FeedbackProvider onSubmit={handleFeedbackSubmit}>
      <YourApp />

      <button onClick={() => setShowNotifications(true)}>
        🔔 Updates ({updates.length})
      </button>

      <FeedbackUpdatesNotification
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        updates={updates}
        onDismissUpdate={handleDismissUpdate}
        onDismissAll={handleDismissAll}
      />
    </FeedbackProvider>
  );
}

export default App;
```

## Status Options

The dashboard includes 7 professional status options:

| Status | Color | Description |
|--------|-------|-------------|
| **Reported** 🔴 | Red | Initial feedback submission |
| **Opened** 🟠 | Amber | Acknowledged and under review |
| **In Progress** 🔵 | Blue | Actively being worked on |
| **Resolved** 🟢 | Green | Fixed and ready |
| **Released** 🟣 | Purple | Deployed to production |
| **Blocked** 🔴 | Red | Waiting on dependencies |
| **Won't Fix** ⚪ | Gray | Not planned for implementation |

## API Reference

### FeedbackProvider Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onSubmit` | `(feedbackData) => Promise<void>` | Yes | - | Callback when feedback is submitted |
| `onStatusChange` | `({ id, status, comment }) => void` | No | - | Callback when status changes (includes optional developer comment) |
| `children` | `ReactNode` | Yes | - | Your app components |
| `dashboard` | `boolean` | No | `false` | Enable dashboard feature |
| `dashboardData` | `Array` | No | `undefined` | Custom feedback data (uses localStorage if undefined) |
| `isDeveloper` | `boolean` | No | `false` | Enable developer mode with full permissions |
| `isUser` | `boolean` | No | `true` | Enable user mode (read-only) |
| `userName` | `string` | No | `'Anonymous'` | User name for feedback submissions |
| `userEmail` | `string` | No | `null` | User email for feedback submissions |
| `mode` | `'light' \| 'dark'` | No | `'light'` | Theme mode |

### useFeedback Hook

```jsx
const { isActive, setIsActive, setIsDashboardOpen } = useFeedback();
```

**Returns:**
- `isActive`: `boolean` - Whether feedback mode is active
- `setIsActive`: `(active: boolean) => void` - Activate/deactivate feedback mode
- `setIsDashboardOpen`: `(open: boolean) => void` - Open/close dashboard

### FeedbackUpdatesNotification Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | Yes | - | Controls notification visibility |
| `onClose` | `() => void` | Yes | - | Callback when notification is closed |
| `updates` | `Array` | Yes | - | Array of feedback updates to display |
| `onDismissUpdate` | `(id: string) => void` | No | - | Callback when a single update is dismissed |
| `onDismissAll` | `() => void` | No | - | Callback when all updates are dismissed |

**Update Object Structure:**
```typescript
{
  id: string,
  title?: string,
  feedback: string,
  status: 'reported' | 'opened' | 'inProgress' | 'resolved' | 'released' | 'blocked' | 'wontFix',
  responseMessage?: string,
  assignedTo?: string,
  resolvedBy?: string,
  estimatedResolutionDate?: string,
  updatedAt: string,
  createdAt?: string
}
```

### Feedback Data Structure

```typescript
{
  id: string,
  feedback: string,
  userName: string,
  userEmail: string | null,
  status: 'reported' | 'opened' | 'inProgress' | 'resolved' | 'released' | 'blocked' | 'wontFix',
  timestamp: string, // ISO 8601 format
  url: string,
  elementInfo: {
    tagName: string,
    id: string,
    className: string,
    selector: string,
    text: string,
    position: { x: number, y: number, width: number, height: number },
    styles: { backgroundColor: string, color: string, fontSize: string, fontFamily: string }
  },
  screenshot: string, // Base64 encoded PNG
  viewport: { width: number, height: number },
  userAgent: string
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Q` | Activate feedback mode |
| `Ctrl+Shift+Q` | Open dashboard (when dashboard is enabled) |
| `Esc` | Cancel/close feedback mode or dashboard |
| `Ctrl+Enter` | Submit feedback (when form is open) |

## Developer vs User Mode

### Developer Mode (`isDeveloper={true}`)
- ✅ View all technical details (element info, CSS, viewport, user agent)
- ✅ Change feedback status with optional comments
- ✅ Delete feedback items
- ✅ Full control over feedback management

### User Mode (`isDeveloper={false}`)
- ✅ View feedback submissions
- ✅ See current status and developer responses
- ❌ Cannot change status
- ❌ Cannot delete items

## How It Works

### Feedback Collection Flow

1. User activates the widget (Ctrl+Q or button click)
2. User hovers over elements to see them highlighted
3. User clicks on the problematic element
4. Widget captures a pixel-perfect screenshot
5. Feedback form appears with context pre-filled
6. User enters feedback and submits
7. Your `onSubmit` handler receives all data

### Dashboard Flow

1. User opens dashboard (Ctrl+Shift+Q or programmatically)
2. Dashboard displays all feedback submissions
3. Developer clicks status dropdown and selects new status
4. Status change modal appears for optional developer comment
5. Developer adds comment (optional) and confirms
6. `onStatusChange` callback triggered with `{ id, status, comment }`
7. Your backend updates the database
8. Dashboard reflects the new status

## Browser Support

- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## Local Development

```bash
# Clone repository
git clone https://github.com/Murali1889/react-feedback-widget.git
cd react-feedback-widget

# Install dependencies
npm install

# Build the widget
npm run build

# Run example app
cd example
npm install
npm run dev
```

Visit `http://localhost:8080` to see the demo!

## Components Exported

```jsx
import {
  FeedbackProvider,           // Main provider component
  useFeedback,               // Hook to control feedback state
  FeedbackUpdatesNotification // Notification component for updates
} from 'react-visual-feedback';
```

## What's New in v1.3.0

### Status Change with Comments
- 💬 Developers can add optional comments when changing status
- 📝 Comments are passed to `onStatusChange` callback
- 👥 Comments visible to users as developer responses

### Update Notifications Component
- 🔔 New `FeedbackUpdatesNotification` component
- 📬 Show users updates on their feedback
- 🎨 Beautifully grouped by status
- 👋 Dismiss individual or all updates

## License

MIT © 2025 Murali Vvrsn Gurajapu

## Contributing

Contributions welcome! Please submit a Pull Request.

## Issues

Report issues at: https://github.com/Murali1889/react-feedback-widget/issues

## Author

**Murali Vvrsn Gurajapu**
Email: murali.g@hyperverge.co

---

Made with ❤️ for better user feedback collection
