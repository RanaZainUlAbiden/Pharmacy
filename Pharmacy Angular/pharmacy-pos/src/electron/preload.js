const { contextBridge, ipcRenderer } = require('electron');

console.log('✅ Preload script is running');

contextBridge.exposeInMainWorld('electronAPI', {
    database: {
        query: (sql, params, method) => ipcRenderer.invoke('db-query', { sql, params, method }),
        getCurrentStock: () => ipcRenderer.invoke('db-get-current-stock'),
        getLowStock: () => ipcRenderer.invoke('db-get-low-stock'),
        getExpiringItems: (days) => ipcRenderer.invoke('db-get-expiring-items', days),
        getDailySales: () => ipcRenderer.invoke('db-get-daily-sales'),
        createSale: (saleData, items) => ipcRenderer.invoke('db-create-sale', saleData, items)
    },
    window: {
        minimize: () => ipcRenderer.send('window-minimize'),
        maximize: () => ipcRenderer.send('window-maximize'),
        close: () => ipcRenderer.send('window-close')
    }
});

console.log('✅ electronAPI exposed to window');