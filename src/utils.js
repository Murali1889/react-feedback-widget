import { domToPng } from 'modern-screenshot';

// =====================================================================
// PART 1: METADATA & COMPONENT DETECTION (PRESERVED)
// =====================================================================

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
      // Handle both HTML elements (string) and SVG elements (SVGAnimatedString)
      const classNameStr = typeof current.className === 'string'
        ? current.className
        : current.className.baseVal || '';

      if (classNameStr) {
        const classes = classNameStr.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          selector += `.${classes[0]}`;
        }
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

// Check if a component name is valid (not minified or internal)
const isValidComponentName = (name) => {
  if (!name) return false;
  if (name.length < 3) return false;
  if (name[0] === name[0].toLowerCase() && name[0] !== name[0].toUpperCase()) return false;
  
  const internalNames = [
    'Fragment', 'Suspense', 'StrictMode', 'Profiler',
    'Provider', 'Consumer', 'Context', 'Portal',
    'ForwardRef', 'Memo', 'Lazy'
  ];
  if (internalNames.includes(name)) return false;
  if (name.startsWith('_')) return false;

  return true;
};

// Try to get source file path from React DevTools data or error stack
const getComponentSourceInfo = (fiber) => {
  try {
    if (fiber._debugSource) {
      return {
        fileName: fiber._debugSource.fileName,
        lineNumber: fiber._debugSource.lineNumber,
        columnNumber: fiber._debugSource.columnNumber
      };
    }
    if (fiber.memoizedProps?.__source) {
      return {
        fileName: fiber.memoizedProps.__source.fileName,
        lineNumber: fiber.memoizedProps.__source.lineNumber
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};

// Get React component name from a DOM element
export const getReactComponentInfo = (element) => {
  if (!element) return null;

  const componentInfo = {
    componentName: null,
    componentStack: [],
    props: null,
    sourceFile: null
  };

  try {
    const fiberKey = Object.keys(element).find(
      key => key.startsWith('__reactFiber$') ||
             key.startsWith('__reactInternalInstance$')
    );

    if (fiberKey) {
      let fiber = element[fiberKey];
      let depth = 0;
      const maxDepth = 20;

      while (fiber && depth < maxDepth) {
        depth++;

        if (fiber.type) {
          let componentName = null;
          let sourceInfo = null;

          if (typeof fiber.type === 'function') {
            componentName = fiber.type.displayName || fiber.type.name || null;
            sourceInfo = getComponentSourceInfo(fiber);
          }
          else if (typeof fiber.type === 'object' && fiber.type !== null) {
            if (fiber.type.displayName) {
              componentName = fiber.type.displayName;
            } else if (fiber.type.render?.displayName || fiber.type.render?.name) {
              componentName = fiber.type.render.displayName || fiber.type.render.name;
            } else if (fiber.type.type?.displayName || fiber.type.type?.name) {
              componentName = fiber.type.type.displayName || fiber.type.type.name;
            }
            sourceInfo = getComponentSourceInfo(fiber);
          }

          if (isValidComponentName(componentName)) {
            if (!componentInfo.componentName) {
              componentInfo.componentName = componentName;
              componentInfo.sourceFile = sourceInfo;

              if (fiber.memoizedProps) {
                try {
                  const safeProps = {};
                  for (const [key, value] of Object.entries(fiber.memoizedProps)) {
                    if (key.startsWith('__') || key === 'children') continue;
                    if (typeof value === 'string' ||
                        typeof value === 'number' ||
                        typeof value === 'boolean' ||
                        value === null ||
                        value === undefined) {
                      safeProps[key] = value;
                    }
                  }
                  if (Object.keys(safeProps).length > 0) {
                    componentInfo.props = safeProps;
                  }
                } catch (e) { }
              }
            }

            if (componentInfo.componentStack.length < 5 &&
                !componentInfo.componentStack.includes(componentName)) {
              componentInfo.componentStack.push(componentName);
            }
          }
        }
        fiber = fiber.return;
      }
    }
  } catch (error) {
    console.warn('[Feedback] Could not detect React component:', error);
  }

  return componentInfo.componentName ? componentInfo : null;
};

export const getElementInfo = (element) => {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);

  const className = element.className
    ? (typeof element.className === 'string' ? element.className : element.className.baseVal || '')
    : null;

  const reactInfo = getReactComponentInfo(element);

  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || null,
    className: className,
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
    },
    reactComponent: reactInfo?.componentName || null,
    reactComponentStack: reactInfo?.componentStack || [],
    reactProps: reactInfo?.props || null,
    sourceFile: reactInfo?.sourceFile || null
  };
};

// =====================================================================
// PART 2: OPTIMIZED SCREENSHOT LOGIC (UPDATED)
// =====================================================================

/**
 * Finds the "Visual Context".
 * If you click a transparent text span, this finds the Card/Container behind it.
 * If you click the body, it returns the body.
 */
const getContextElement = (element) => {
  let current = element;
  
  // 1. If we selected the body/html, return body immediately
  if (!current || current === document.body || current === document.documentElement) {
    return document.body;
  }

  // 2. Walk up to find a container with a defined background
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const bgColor = style.backgroundColor;
    const bgImage = style.backgroundImage;
    
    // Check if this element actually "paints" something
    const hasVisibleBg = 
      (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') ||
      (bgImage && bgImage !== 'none');

    // Also check for shadows (common in cards)
    const hasShadow = style.boxShadow && style.boxShadow !== 'none';

    if (hasVisibleBg || hasShadow) {
      return current;
    }
    current = current.parentElement;
  }
  
  // Fallback
  return element.parentElement || document.body;
};

/**
 * Smart Crop.
 * Ensures we only get the visible part of the element, avoiding "White Space" 
 * and respecting the current scroll position.
 */
const cropImageToSelection = (dataUrl, contextRect, selectionRect, scale) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Calculate intersection: The target relative to the Context
      let sourceX = (selectionRect.left - contextRect.left);
      let sourceY = (selectionRect.top - contextRect.top);
      let sourceW = selectionRect.width;
      let sourceH = selectionRect.height;

      // Handle Negative Offsets (if content is scrolled out of view)
      // This prevents the "White Space" bug at the top
      if (sourceX < 0) { sourceW += sourceX; sourceX = 0; }
      if (sourceY < 0) { sourceH += sourceY; sourceY = 0; }

      // Clamp dimensions to the actual image size
      // This prevents capturing "Empty" space below the element
      const maxW = (img.width / scale) - sourceX;
      const maxH = (img.height / scale) - sourceY;
      
      sourceW = Math.min(sourceW, maxW);
      sourceH = Math.min(sourceH, maxH);

      // Apply Scale (Retina/High DPI)
      const sX = sourceX * scale;
      const sY = sourceY * scale;
      const sW = sourceW * scale;
      const sH = sourceH * scale;

      if (sW <= 0 || sH <= 0) {
        return resolve(dataUrl);
      }

      const canvas = document.createElement('canvas');
      canvas.width = sW;
      canvas.height = sH;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(
        img,
        sX, sY, sW, sH,  // Source Crop
        0, 0, sW, sH     // Destination
      );

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const captureElementScreenshot = async (element) => {
  if (!element) return null;

  console.log('[Feedback] Selected element:', element.tagName);

  // 1. Get Geometry of the specific thing user clicked
  const selectionRect = element.getBoundingClientRect();
  
  // 2. Find the Context (Parent with Background)
  const contextElement = getContextElement(element);
  const contextRect = contextElement.getBoundingClientRect();
  
  // 3. High Quality Scale
  const SCALE = 3;

  // 4. Configuration
  const isBody = contextElement === document.body || contextElement === document.documentElement;

  // CRITICAL: Force capture of current Viewport ONLY if it's the body.
  // This solves the "capturing off-screen/scrolling" issue.
  const captureOptions = {
    scale: SCALE,
    backgroundColor: null, // Respect transparency
    style: {
      transform: 'none',
      opacity: '1',
      transition: 'none'
    },
    // Exclude feedback tool
    filter: (node) => {
      if (node.classList) {
         return !node.classList.contains('feedback-overlay') && 
                !node.classList.contains('feedback-modal') &&
                !node.classList.contains('feedback-highlight');
      }
      return true;
    }
  };

  // If capturing the whole page/body, RESTRICT to window dimensions
  if (isBody) {
      captureOptions.width = window.innerWidth;
      captureOptions.height = window.innerHeight;
      captureOptions.style.height = `${window.innerHeight}px`;
      captureOptions.style.overflow = 'hidden';
  }

  try {
    console.log('[Feedback] Capturing context:', contextElement.tagName);
    
    // 5. Capture
    const dataUrl = await domToPng(contextElement, captureOptions);

    if (dataUrl) {
      // 6. If we captured the Body, we are done (it's already viewport-sized due to options above)
      if (isBody) {
          console.log('[Feedback] Body captured (Viewport only).');
          return dataUrl;
      }

      // 7. If we captured a Card/Container, Crop it to the specific button/row selected
      if (contextElement !== element) {
        console.log('[Feedback] Cropping context to selection...');
        return await cropImageToSelection(
          dataUrl, 
          contextRect, 
          selectionRect, 
          SCALE
        );
      }
      
      return dataUrl;
    }

  } catch (e) {
    console.error('[Feedback] Screenshot failed:', e);
  }
  
  return null;
};

export const formatPath = (path) => {
  if (!path) return 'Unknown';
  // Try to grab everything after 'src' or 'components'
  const match = path.match(/(src\/.*|components\/.*)/);
  if (match) return match[0];
  
  // Fallback: just show the last 3 parts of the path
  const parts = path.split('/');
  if (parts.length > 3) {
    return '.../' + parts.slice(-3).join('/');
  }
  return path;
};
