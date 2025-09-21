const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // Dialog methods
    showErrorDialog: (title, content) => ipcRenderer.invoke('show-error-dialog', title, content),
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

    // Menu event listeners
    onMenuNewMigration: (callback) => ipcRenderer.on('menu-new-migration', callback),
    onMenuOpenSettings: (callback) => ipcRenderer.on('menu-open-settings', callback),
    onMenuExportData: (callback) => ipcRenderer.on('menu-export-data', callback),

    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});