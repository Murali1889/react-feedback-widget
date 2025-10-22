# React Visual Feedback

A powerful, visual feedback collection tool for React applications. Users can select any element on your page, and the widget automatically captures a screenshot and context information.

## Features

- 🎯 Visual element selection with hover highlighting
- 📸 Automatic screenshot capture of selected elements with perfect CSS rendering
- 📝 Feedback form with rich context
- ⚡ Lightweight and performant
- 🎨 Works with any CSS framework (Tailwind, Bootstrap, Material-UI, etc.)
- ⌨️ Keyboard shortcuts (Ctrl+Q to activate, Esc to cancel, Ctrl+Enter to submit)
- 🌓 Dark mode support

## Installation

```bash
npm install react-visual-feedback
```

**Important:** Import the CSS file in your application:

```jsx
import 'react-visual-feedback/dist/index.css';
```

## Quick Start

### 1. Wrap your app with FeedbackProvider

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

### 2. Add a feedback trigger button (optional)

```jsx
import { useFeedback } from 'react-visual-feedback';

function FeedbackButton() {
  const { setIsActive } = useFeedback();

  return (
    <button onClick={() => setIsActive(true)}>
      Report Issue
    </button>
  );
}
```

## Usage

### Keyboard Shortcuts
- **Ctrl+Q** - Activate feedback mode
- **Esc** - Cancel/deactivate
- **Ctrl+Enter** - Submit feedback (when form is open)

### Programmatic Activation (Uncontrolled Mode)
Use the `useFeedback` hook to control the widget programmatically:

```jsx
import { useFeedback } from 'react-visual-feedback';

function MyComponent() {
  const { isActive, setIsActive } = useFeedback();

  return (
    <button onClick={() => setIsActive(!isActive)}>
      {isActive ? 'Cancel Feedback' : 'Give Feedback'}
    </button>
  );
}
```

### Controlled Mode
You can control the widget's active state from the parent component:

```jsx
import React, { useState } from 'react';
import { FeedbackProvider } from 'react-visual-feedback';

function App() {
  const [isFeedbackActive, setIsFeedbackActive] = useState(false);

  const handleFeedbackSubmit = async (feedbackData) => {
    console.log('Feedback:', feedbackData);
    // Submit to your backend
  };

  return (
    <div>
      <button onClick={() => setIsFeedbackActive(!isFeedbackActive)}>
        {isFeedbackActive ? 'Cancel' : 'Report Bug'}
      </button>

      <FeedbackProvider
        onSubmit={handleFeedbackSubmit}
        isActive={isFeedbackActive}
        onActiveChange={setIsFeedbackActive}
      >
        <YourApp />
      </FeedbackProvider>
    </div>
  );
}
```

## API Reference

### FeedbackProvider

The main provider component that wraps your application.

**Props:**
- `onSubmit` (required): `(feedbackData) => Promise<void>` - Callback function when feedback is submitted
- `children`: React nodes
- `isActive` (optional): `boolean` - Control the widget active state from parent (controlled mode)
- `onActiveChange` (optional): `(active: boolean) => void` - Callback when active state changes (used with controlled mode)

**Feedback Data Structure:**
```javascript
{
  feedback: "User's feedback text",
  elementInfo: {
    tagName: "div",
    id: "element-id",
    className: "element-classes",
    selector: "div.card > button.primary",
    textContent: "Element text content",
    position: {
      x: 100,
      y: 200,
      width: 300,
      height: 50
    },
    styles: {
      backgroundColor: "rgb(255, 255, 255)",
      color: "rgb(0, 0, 0)",
      fontSize: "16px",
      fontFamily: "Arial, sans-serif"
    }
  },
  screenshot: "data:image/png;base64,...", // Base64 encoded screenshot
  url: "https://yourapp.com/current-page",
  userAgent: "Mozilla/5.0...",
  timestamp: "2025-10-22T10:30:00.000Z"
}
```

### useFeedback

Hook to access feedback widget state and controls.

**Returns:**
- `isActive`: boolean - Whether the widget is currently active
- `setIsActive`: (active: boolean) => void - Function to activate/deactivate the widget

## Styling

The widget comes with default styles, but you can customize them by targeting these CSS classes:

```css
.feedback-overlay { /* Background overlay when active */ }
.feedback-highlight { /* Element highlight border */ }
.feedback-tooltip { /* Element info tooltip */ }
.feedback-modal { /* Feedback form modal */ }
.feedback-backdrop { /* Modal backdrop */ }
.feedback-modal-content { /* Modal content container */ }
.feedback-screenshot { /* Screenshot preview */ }
```

## Example Implementation

```jsx
import React from 'react';
import { FeedbackProvider, useFeedback } from 'react-visual-feedback';
import 'react-visual-feedback/dist/index.css';

function FeedbackButton() {
  const { isActive, setIsActive } = useFeedback();

  return (
    <button
      onClick={() => setIsActive(true)}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '12px 24px',
        background: isActive ? '#ef4444' : '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      {isActive ? '✕ Cancel' : '💬 Report Issue'}
    </button>
  );
}

function App() {
  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      const response = await fetch('https://your-api.com/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      });

      if (response.ok) {
        alert('Thank you for your feedback!');
      }
    } catch (error) {
      alert('Failed to submit feedback. Please try again.');
    }
  };

  return (
    <FeedbackProvider onSubmit={handleFeedbackSubmit}>
      <div>
        <h1>My Application</h1>
        <p>Press Ctrl+Q or click the button to report issues</p>
        <FeedbackButton />
      </div>
    </FeedbackProvider>
  );
}

export default App;
```

## How It Works

1. User activates the widget (Ctrl+Q or button click)
2. User hovers over elements to see them highlighted
3. User clicks on the problematic element
4. Widget captures a pixel-perfect screenshot of the selected element
5. Feedback form appears with element context pre-filled and large screenshot preview
6. User enters their feedback and submits (or presses Ctrl+Enter)
7. Your `onSubmit` handler receives all the data

## Browser Support

- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Opera: ✅

## Screenshot Capture

The widget uses `html-to-image` library for accurate screenshot capture with fallback to `html2canvas`. This ensures:
- Perfect CSS rendering including Tailwind, Bootstrap, and custom styles
- Accurate colors, fonts, and layout
- Support for gradients, shadows, and modern CSS features
- High-resolution screenshots (2x pixel ratio)

## Dependencies

- React ^16.8.0 || ^17.0.0 || ^18.0.0
- react-dom ^16.8.0 || ^17.0.0 || ^18.0.0
- html-to-image ^1.11.13
- html2canvas ^1.4.1 (fallback)
- lucide-react ^0.263.1

## Local Development & Testing

Want to test the widget locally? We've included a complete example app!

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Murali1889/react-feedback-widget.git
cd react-feedback-widget

# 2. Install dependencies
npm install

# 3. Build the widget
npm run build

# 4. Run the example app
cd example
npm install
npm run dev
```

The example app will open at `http://localhost:8080` with a fully working demo!

### What's Included

- ✅ Complete working example with Tailwind CSS
- ✅ Both light and dark mode support
- ✅ Controlled and uncontrolled mode examples
- ✅ Interactive test elements (buttons, forms, cards, gradients)
- ✅ Console logging to see feedback data
- ✅ Hot reload for fast development

### Making Changes

1. Edit source files in `src/`
2. Run `npm run build` in the root directory
3. Refresh the example app browser - changes will be reflected!

See `example/README.md` for more details.

## License

MIT © 2025 Murali

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Issues

If you encounter any issues, please report them at:
https://github.com/Murali1889/react-feedback-widget/issues

## Author

**Murali**
Email: murali.g@hyperverge.co

---

Made with ❤️ for better user feedback collection
