const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icon.png'), // Add icon file
        show: false, // Don't show until ready
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
    });

    // Load the app
    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../build/index.html')}`;

    mainWindow.loadURL(startUrl);

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        // Open DevTools in development
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });
}

// Application event handlers
app.whenReady().then(() => {
    createWindow();

    // macOS: Re-create window when dock icon is clicked
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Set up application menu
    createMenu();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        require('electron').shell.openExternal(navigationUrl);
    });
});

// Create application menu
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Migration',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-new-migration');
                    }
                },
                {
                    label: 'Open Settings',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        mainWindow.webContents.send('menu-open-settings');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Export Data',
                    click: async () => {
                        const result = await dialog.showSaveDialog(mainWindow, {
                            title: 'Export Migration Data',
                            defaultPath: 'migration-export.json',
                            filters: [
                                { name: 'JSON Files', extensions: ['json'] }
                            ]
                        });

                        if (!result.canceled) {
                            mainWindow.webContents.send('menu-export-data', result.filePath);
                        }
                    }
                },
                { type: 'separator' },
                process.platform === 'darwin' ?
                    { role: 'close' } :
                    { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectall' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                ...(process.platform === 'darwin' ? [
                    { role: 'close' },
                    { role: 'front' }
                ] : [
                    { role: 'close' }
                ])
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About HelloKahwin Migration Tool',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About',
                            message: 'HelloKahwin Migration Tool',
                            detail: 'Version 1.0.0\nA tool for migrating content from TWN to HelloKahwin with translation capabilities.'
                        });
                    }
                },
                {
                    label: 'Documentation',
                    click: () => {
                        require('electron').shell.openExternal('https://docs.hellokahwin.com');
                    }
                }
            ]
        }
    ];

    // macOS menu adjustments
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services', submenu: [] },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC handlers for communication with renderer process
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('show-error-dialog', async (event, title, content) => {
    const result = await dialog.showErrorBox(title, content);
    return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
});