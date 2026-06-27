import React from 'react';
import { createRoot } from 'react-dom/client';
import Popup from './Popup';
import './popup.css';
import { LanguageProvider } from './i18n';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <Popup />
    </LanguageProvider>
  </React.StrictMode>
);

