import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { App } from './app/App';
import { AdminApp } from './admin/AdminApp';
import './app/styles/index.css';

// Declared in useAppInit.ts's global augmentation; repeated here so this
// module can call it without importing the hook just for the side-effect.
declare global { interface Window { __splashProgress?: (pct: number) => void; } }

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('#root element not found in index.html');
}

// react-router is introduced here ONLY to carve out a real, bookmarkable
// /admin URL for the Admin CMS. Every other path ("*") renders the existing
// hand-rolled App unchanged — App/navigationStore.ts have no idea a router
// exists, and never will; this is the one seam between the two. See
// src/admin/AdminApp.tsx for the CMS's own nested routing.
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
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
