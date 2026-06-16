import React from 'react';
import { createPortal } from 'react-dom';
import { useDOMElement } from '../hooks/useDOMElement';

export default function QueueMonitorPortal() {
  const container = useDOMElement('#playerpanel');

  if (!container) return null;

  return createPortal(
    <div id="l4d2-react-queue-monitor">
      {/* React version of QueueMonitor will go here, currently vanilla JS handles it */}
    </div>,
    container.parentElement
  );
}
