import { useState, useEffect } from 'react';

export function useDOMElement(selector) {
  const [element, setElement] = useState(null);

  useEffect(() => {
    // Check if it already exists
    const el = document.querySelector(selector);
    if (el) {
      setElement(el);
      return;
    }

    // Otherwise, wait for it
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        setElement(el);
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [selector]);

  return element;
}
