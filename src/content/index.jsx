import React from 'react';
import { createRoot } from 'react-dom/client';
import ContentApp from './ContentApp';

import '../lib/supabase.js';
import '../matchHistory.js';
import '../invitations.js';
import '../queueMonitor.js';
import '../content.js';
import '../inject.css';

console.log('L4D2 Enhanced React Content Script Loaded');

const container = document.createElement('div');
container.id = 'l4d2-enhanced-root';
document.body.appendChild(container);

const root = createRoot(container);
root.render(<ContentApp />);
