import React from 'react';
import { createRoot } from 'react-dom/client';
import NewTab from './NewTab';

const container = document.getElementById('newtab-root');
if (container) {
  const root = createRoot(container);
  root.render(<NewTab />);
} 