const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
let pdfParse;

/**
 * Creates the main application window.
 */
function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Intercept close to implement unsaved-changes prompt
  mainWindow.on('close', async (e) => {
    try {
      const isDirty = await mainWindow.webContents.executeJavaScript('window.__app_isDirty === true');
      if (!isDirty) {
        return; // allow close immediately
      }
    } catch (_) {
      // If we cannot determine, fall back to prompting
    }

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Save', 'Quit without Saving', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      title: 'Unsaved Changes',
      message: 'There are unsaved changes. What would you like to do?'
    });
    // 0 Save, 1 Quit without Saving, 2 Cancel
    if (response === 0) {
      e.preventDefault();
      mainWindow.webContents.send('action:save-pdf-and-close');
    } else if (response === 2) {
      e.preventDefault();
    } // else allow close
  });

  // Build a simple macOS-friendly menu
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CommandOrControl+N',
          click: () => mainWindow.webContents.send('action:new-file')
        },
        {
          label: 'Open…',
          accelerator: 'CommandOrControl+O',
          click: async () => {
            const result = await handleOpenDialog(mainWindow);
            if (result && result.ok) {
              mainWindow.webContents.send('action:open-file-content', { content: result.content, filePath: result.filePath });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Save as PDF…',
          accelerator: 'CommandOrControl+S',
          click: () => mainWindow.webContents.send('action:save-pdf')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
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
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }]
              }
            ]
          : [
              { role: 'delete' },
              { type: 'separator' },
              { role: 'selectAll' }
            ])
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://www.electronjs.org');
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  return mainWindow;
}

let mainWindowRef;

app.whenReady().then(() => {
  mainWindowRef = createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindowRef = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC: Save current window contents as PDF
ipcMain.handle('save-current-pdf', async (event, opts) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { ok: false, error: 'No window' };

  try {
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Save as PDF',
      defaultPath: (opts && opts.defaultPath) || 'Untitled.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) {
      return { ok: false, canceled: true };
    }

    const pdfOptions = {
      marginsType: 0,
      printBackground: true,
      pageSize: 'A4',
      landscape: false,
      ...opts
    };

    const pdfBuffer = await win.webContents.printToPDF(pdfOptions);
    fs.writeFileSync(filePath, pdfBuffer);
    return { ok: true, filePath };
  } catch (error) {
    dialog.showErrorBox('Save as PDF Failed', String(error));
    return { ok: false, error: String(error) };
  }
});

ipcMain.handle('request-close', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { ok: false };
  win.destroy();
  return { ok: true };
});

// IPC: Open dialog (supports txt/md/pdf)
ipcMain.handle('open-dialog', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return handleOpenDialog(win);
});

async function handleOpenDialog(win) {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Open File',
      filters: [
        { name: 'Documents', extensions: ['txt', 'md', 'markdown', 'pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    if (canceled || !filePaths || !filePaths[0]) {
      return { ok: false, canceled: true };
    }
    const filePath = filePaths[0];
    const ext = path.extname(filePath).toLowerCase();
    let content = '';
    if (ext === '.pdf') {
      if (!pdfParse) {
        try {
          pdfParse = require('pdf-parse');
        } catch (e) {
          throw new Error('PDF support requires the "pdf-parse" package.');
        }
      }
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      content = (data && data.text) ? data.text : '';
    } else {
      content = fs.readFileSync(filePath, 'utf8');
    }
    return { ok: true, filePath, content };
  } catch (error) {
    dialog.showErrorBox('Open Failed', String(error));
    return { ok: false, error: String(error) };
  }
}


