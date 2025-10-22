# Feedback Widget - Local Test Example

This example app demonstrates how to test the feedback widget locally during development.

## Quick Start

### 1. Install dependencies

```bash
cd example
npm install
```

### 2. Run the development server

```bash
npm run dev
```

The app will open in your browser at `http://localhost:3000`

## How to Test

1. **Activate Feedback Mode**
   - Click the "Report Issue" button in the bottom-right corner
   - OR press `Ctrl+Q` on your keyboard

2. **Select an Element**
   - Hover over any element on the page (it will be highlighted)
   - Click on the element to capture its screenshot

3. **Submit Feedback**
   - A modal will appear with the screenshot
   - Enter your feedback text
   - Click "Submit Feedback" or press `Ctrl+Enter`

4. **View the Data**
   - Open your browser's Developer Console (F12)
   - You'll see the complete feedback data logged

## Features Demonstrated

- **Uncontrolled Mode**: Using the `useFeedback` hook with the floating button
- **Controlled Mode**: Controlling the widget state from parent component
- **Keyboard Shortcuts**: `Ctrl+Q` to activate, `Esc` to cancel
- **Screenshot Capture**: Automatic element screenshot on click
- **Form Submission**: Complete feedback data structure

## Testing After Making Changes

If you make changes to the widget source code:

1. **Rebuild the widget**:
   ```bash
   cd ..  # Go back to root directory
   npm run build
   ```

2. **Refresh the browser** - The example uses the local dist files, so changes will be reflected immediately after rebuild

## Project Structure

```
example/
├── index.html          # HTML entry point
├── package.json        # Dependencies
├── vite.config.js      # Vite configuration
└── src/
    ├── main.jsx        # React entry point
    ├── App.jsx         # Main app component
    └── App.css         # Styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Notes

- The example imports directly from `../../dist/` to use your local build
- No npm link needed - just rebuild and refresh!
- Check the console for detailed feedback data on submission
