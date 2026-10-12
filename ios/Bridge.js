// Keep the existing app's four native file operations compatible across platforms.
(() => {
  'use strict';
  const send = (action, data) => {
    const handler = window.webkit?.messageHandlers?.qinjie;
    if (!handler) throw new Error('iPad native bridge is unavailable');
    handler.postMessage(data === undefined ? { action } : { action, data });
  };
  window.Android = Object.freeze({
    importSongs: () => send('importSongs'),
    exportSongs: data => send('exportSongs', data),
    importData: () => send('importData'),
    exportData: data => send('exportData', data)
  });
})();
