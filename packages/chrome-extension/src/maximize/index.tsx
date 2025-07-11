import React from 'react';
import { createRoot } from 'react-dom/client';
import MaximizeView from './MaximizeView';

const container = document.getElementById('maximize-root');
if (container) {
  const root = createRoot(container);
  root.render(<MaximizeView />);
}