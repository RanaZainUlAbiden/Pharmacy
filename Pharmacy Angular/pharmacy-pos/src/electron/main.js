const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const DatabaseManager = require('./database/db-manager');

let mainWindow;
let dbManager;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false,
        frame: true,
        backgroundColor: '#f5f5f5'
    });

    // IMPORTANT: In development, load from Angular dev server
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    
    if (isDev) {
        // Load from Angular dev server (must be running)
        mainWindow.loadURL('http://localhost:4200');
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load from file system
        const indexPath = path.join(__dirname, '../../dist/pharmacy-pos/browser/index.html');
        mainWindow.loadFile(indexPath).catch(err => {
            console.error('Failed to load index.html:', err);
        });
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    // Initialize database
    dbManager = new DatabaseManager();
    try {
        await dbManager.initialize();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
    }
    
    createWindow();
});

// Database query handler
ipcMain.handle('db-query', async (event, { sql, params, method }) => {
    try {
        return await dbManager.query(sql, params, method);
    } catch (error) {
        console.error('Database error:', error);
        throw error;
    }
});

// Specialized database handlers
ipcMain.handle('db-get-current-stock', async () => {
    return await dbManager.getCurrentStock();
});

ipcMain.handle('db-get-low-stock', async () => {
    return await dbManager.getLowStock();
});

ipcMain.handle('db-get-expiring-items', async (event, days) => {
    return await dbManager.getExpiringItems(days);
});

ipcMain.handle('db-get-daily-sales', async () => {
    return await dbManager.getDailySales();
});

ipcMain.handle('db-create-sale', async (event, saleData, items) => {
    return await dbManager.createSale(saleData, items);
});

// Window control handlers
ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.on('window-close', () => {
    mainWindow.close();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});