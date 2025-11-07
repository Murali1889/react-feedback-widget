export const getElementSelector = (element) => {
  if (!element || element === document.body) return 'body';
  const path = [];
  let current = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    }

    if (current.className) {
      const classes = current.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        selector += `.${classes[0]}`;
      }
    }

    const siblings = Array.from(current.parentElement?.children || [])
      .filter(el => el.tagName === current.tagName);

    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-of-type(${index})`;
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
};

export const getElementInfo = (element) => {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);

  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || null,
    className: element.className || null,
    textContent: element.textContent?.slice(0, 100) || null,
    selector: getElementSelector(element),
    position: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    },
    styles: {
      backgroundColor: computedStyle.backgroundColor,
      color: computedStyle.color,
      fontSize: computedStyle.fontSize,
      fontFamily: computedStyle.fontFamily
    }
  };
};

export const captureElementScreenshot = async (element) => {
  // Suppress console errors temporarily to prevent CORS errors from showing
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  let corsErrorsSuppressed = false;

  const suppressCORSErrors = () => {
    console.error = (...args) => {
      const message = args[0]?.toString() || '';
      // Suppress known CORS-related errors from html-to-image
      if (
        message.includes('Error inlining remote css file') ||
        message.includes('Error loading remote stylesheet') ||
        message.includes('Error while reading CSS rules') ||
        message.includes('Cannot access rules') ||
        message.includes('SecurityError') ||
        message.includes('Failed to read the \'cssRules\' property')
      ) {
        corsErrorsSuppressed = true;
        return; // Suppress the error
      }
      originalConsoleError(...args);
    };

    console.warn = (...args) => {
      const message = args[0]?.toString() || '';
      // Suppress known CORS warnings
      if (message.includes('css file') || message.includes('stylesheet')) {
        return;
      }
      originalConsoleWarn(...args);
    };
  };

  const restoreConsole = () => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  };

  try {
    const { toPng } = await import('html-to-image');

    // Suppress CORS errors during screenshot capture
    suppressCORSErrors();

    const options = {
      quality: 1,
      pixelRatio: 2,
      cacheBust: true,
      skipFonts: false,
      skipAutoScale: false,
      includeQueryParams: false,
      // Add CORS handling for external resources
      fetchRequestInit: {
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache'
      },
      // Filter function to skip problematic external resources
      filter: (node) => {
        // Skip external stylesheets from CDNs that may cause CORS issues
        if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
          const href = node.href || '';
          // Allow same-origin stylesheets only
          if (href && !href.startsWith(window.location.origin) && href.includes('http')) {
            return false;
          }
        }
        // Also skip style tags that import external resources
        if (node.tagName === 'STYLE') {
          const content = node.textContent || '';
          if (content.includes('@import') && content.includes('http')) {
            return false;
          }
        }
        return true;
      },
      style: {
        transform: 'none',
        transformOrigin: 'top left'
      }
    };

    try {
      const dataUrl = await toPng(element, options);
      restoreConsole();

      if (corsErrorsSuppressed && process.env.NODE_ENV !== 'production') {
        console.log('[Feedback Widget] Screenshot captured successfully despite CORS warnings');
      }

      return dataUrl;
    } catch (pngError) {
      restoreConsole();

      // If it's a CORS-related error, try again with more aggressive filtering
      if (pngError.message?.includes('CSS') || pngError.message?.includes('SecurityError')) {
        console.warn('[Feedback Widget] CORS error encountered, attempting with fallback method');
        throw pngError; // Fall through to html2canvas
      }
      throw pngError;
    }
  } catch (error) {
    restoreConsole();

    // If html-to-image fails (CORS or other issues), fallback to html2canvas
    console.warn('[Feedback Widget] html-to-image failed, using html2canvas fallback:', error.message);

    try {
      // Suppress CORS errors for html2canvas too
      suppressCORSErrors();

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        ignoreElements: (el) => {
          // Ignore external stylesheets
          if (el.tagName === 'LINK' && el.rel === 'stylesheet') {
            const href = el.href || '';
            return href && !href.startsWith(window.location.origin) && href.includes('http');
          }
          return false;
        },
        // Ignore CORS errors and continue
        onclone: (clonedDoc) => {
          // Remove problematic external stylesheets from the cloned document
          const externalLinks = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
          externalLinks.forEach(link => {
            const href = link.href || '';
            if (href && !href.startsWith(window.location.origin) && href.includes('http')) {
              link.remove();
            }
          });
        }
      });

      restoreConsole();
      return canvas.toDataURL('image/png');
    } catch (fallbackError) {
      restoreConsole();
      console.error('[Feedback Widget] Both screenshot methods failed:', fallbackError);
      // Return null instead of throwing, so the feedback can still be submitted without a screenshot
      return null;
    }
  }
};