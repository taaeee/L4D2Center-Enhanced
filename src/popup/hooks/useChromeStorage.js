import { useState, useEffect } from 'react';

export function useChromeStorage(key, defaultValue) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    chrome.storage.local.get([key], (result) => {
      if (result[key] !== undefined) {
        setValue(result[key]);
      }
    });

    const listener = (changes, namespace) => {
      if (namespace === 'local' && changes[key]) {
        setValue(changes[key].newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, [key]);

  const setStorageValue = (newValue) => {
    setValue(newValue);
    chrome.storage.local.set({ [key]: newValue });
  };

  return [value, setStorageValue];
}
