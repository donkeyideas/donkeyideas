// Preload script - runs in a context that has access to both
// the DOM and Node.js APIs, but cannot directly access the main process

const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// the APIs in a safe way
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs you want to expose to the renderer process here
  // Example:
  // platform: process.platform,
  // version: process.versions.electron
});

// You can add more APIs here as needed
// For example, if you want to add file system access or other native features

