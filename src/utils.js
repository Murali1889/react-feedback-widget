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
  try {
    const { toPng } = await import('html-to-image');

    const options = {
      quality: 1,
      pixelRatio: 2,
      cacheBust: true,
      style: {
        transform: 'none',
        transformOrigin: 'top left'
      }
    };

    const dataUrl = await toPng(element, options);
    return dataUrl;
  } catch (error) {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      return canvas.toDataURL('image/png');
    } catch (fallbackError) {
      throw fallbackError;
    }
  }
};