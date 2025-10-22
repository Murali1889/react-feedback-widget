# Testing Guide

This guide will help you test the feedback widget locally.

## Quick Start

### Option 1: Test with Example App (Recommended)

The fastest way to test the widget is using the included example app:

```bash
# From the root directory
npm run build          # Build the widget
cd example            # Go to example directory
npm install           # Install example dependencies (first time only)
npm run dev           # Start the dev server
```

Open http://localhost:3000 in your browser.

### Option 2: Test in Your Own App

1. **Build the widget**:
   ```bash
   npm run build
   ```

2. **Link locally**:
   ```bash
   npm link
   ```

3. **In your test app**:
   ```bash
   npm link murali-feedback-widget-react
   ```

4. **Import and use**:
   ```jsx
   import { FeedbackProvider } from 'murali-feedback-widget-react';
   import 'murali-feedback-widget-react/dist/index.css';
   ```

## Testing Checklist

### Basic Functionality
- [ ] Widget activates with button click
- [ ] Widget activates with Ctrl+Q keyboard shortcut
- [ ] Elements highlight on hover
- [ ] Element info tooltip shows correct information
- [ ] Widget deactivates with Esc key

### Screenshot Capture
- [ ] Screenshot captures on element click
- [ ] Screenshot shows in feedback modal
- [ ] Screenshot captures full element (not cut off)
- [ ] Large elements are captured correctly

### Feedback Modal
- [ ] Modal opens after element selection
- [ ] Modal shows screenshot
- [ ] Textarea is focused automatically
- [ ] Form validation works (can't submit empty)
- [ ] Cancel button closes modal
- [ ] Close button (X) closes modal
- [ ] Backdrop click closes modal
- [ ] Submit button works
- [ ] Ctrl+Enter submits form

### Controlled Mode
- [ ] isActive prop controls widget state
- [ ] onActiveChange callback fires correctly
- [ ] Parent state updates work

### CSS & Styling
- [ ] All styles are applied correctly
- [ ] Modal is centered on screen
- [ ] z-index layering works (overlay > highlight > modal)
- [ ] Animations work smoothly
- [ ] No parent CSS interference (thanks to createPortal!)

### Data Capture
- [ ] Feedback text is captured
- [ ] Element info is correct (tagName, id, className, xpath)
- [ ] Screenshot is base64 encoded
- [ ] URL is captured
- [ ] User agent is captured
- [ ] Timestamp is captured
- [ ] Viewport dimensions are captured

## Common Issues

### CSS Not Loading
**Problem**: Styles are not applied
**Solution**: Make sure you import the CSS:
```jsx
import 'murali-feedback-widget-react/dist/index.css';
```

### Modal Not Showing
**Problem**: Modal doesn't appear
**Solution**: Check if createPortal is working. Make sure react-dom is installed.

### Screenshot Not Capturing
**Problem**: Screenshot is blank or fails
**Solution**:
- Check browser console for errors
- Ensure html2canvas is installed
- Some elements (like iframes or external images) may not capture due to CORS

### Elements Not Highlighting
**Problem**: Hover doesn't highlight elements
**Solution**:
- Check if isActive is true
- Verify overlay is rendering
- Check z-index of your app's elements

## Debug Mode

Add console logs to see what's happening:

```jsx
const handleFeedbackSubmit = async (feedbackData) => {
  console.log('Feedback Data:', feedbackData);
  console.log('Element Info:', feedbackData.elementInfo);
  console.log('Screenshot Length:', feedbackData.screenshot?.length);
};
```

## Browser DevTools

Use these tools to debug:
- **Console**: Check for errors and logs
- **Elements Inspector**: Verify DOM structure and portal rendering
- **Network Tab**: Check if CSS/JS files load
- **React DevTools**: Inspect component state and props

## Performance Testing

Test with:
- Large pages (100+ elements)
- Complex layouts
- Nested elements
- Scrollable content
- Fixed/sticky positioned elements
- Responsive designs (mobile/tablet/desktop)

## Browser Compatibility

Test in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## Getting Help

If you encounter issues:
1. Check the console for errors
2. Verify all dependencies are installed
3. Make sure you've imported the CSS
4. Review this testing guide
5. Open an issue on GitHub with details

## Making Changes & Testing

Development workflow:

1. **Make changes** to source files in `src/`
2. **Rebuild**: `npm run build`
3. **Test**: Refresh the example app (or your test app)
4. **Repeat** until satisfied

The example app uses the local `dist/` files, so changes appear immediately after rebuilding!

Happy testing! 🎉
