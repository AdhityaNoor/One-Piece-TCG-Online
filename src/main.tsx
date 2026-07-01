import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './app/styles/index.css';

// Declared in useAppInit.ts's global augmentation; repeated here so this
// module can call it without importing the hook just for the side-effect.
declare global { interface Window { __splashProgress?: (pct: number) => void; } }

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('#root element not found in index.html');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Tell the HTML splash bar that the bundle is loaded (jumps from creep to 10%).
// This runs synchronously before the first rAF so the HTML bar updates in the
// same paint that React's SplashScreen first renders.
window.__splashProgress?.(10);

// Remove the native HTML splash once React has mounted and painted one frame.
requestAnimationFrame(() => {
  document.getElementById('splash')?.remove();
});
