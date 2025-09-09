const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

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
  mainWindow.on('close', (e) => {
    // Prevent the window from closing immediately
    e.preventDefault();
    
    // Check for unsaved changes synchronously first
    mainWindow.webContents.executeJavaScript('window.__app_isDirty === true')
      .then((isDirty) => {
        if (!isDirty) {
          // No unsaved changes, allow close by removing listeners and closing
          mainWindow.removeAllListeners('close');
          mainWindow.close();
          return;
        }
        
        // Show dialog for unsaved changes
        dialog.showMessageBox(mainWindow, {
          type: 'question',
          buttons: ['Save', 'Quit without Saving', 'Cancel'],
          defaultId: 0,
          cancelId: 2,
          title: 'Unsaved Changes',
          message: 'There are unsaved changes. What would you like to do?'
        }).then(({ response }) => {
          // 0 Save, 1 Quit without Saving, 2 Cancel
          if (response === 0) {
            // Save and then close
            mainWindow.webContents.send('action:save-pdf-and-close');
          } else if (response === 1) {
            // Quit without saving - force close without triggering the event again
            mainWindow.removeAllListeners('close');
            mainWindow.close();
          } else if (response === 2) {
            // Cancel - window stays open (already prevented)
          }
        }).catch(() => {
          // If dialog fails, allow close
          mainWindow.removeAllListeners('close');
          mainWindow.close();
        });
      })
      .catch(() => {
        // If we cannot determine dirty state, allow close
        mainWindow.removeAllListeners('close');
        mainWindow.close();
      });
  });

  // Intercept reload and close shortcuts to implement unsaved-changes prompt
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control || input.meta) {
      if (input.key.toLowerCase() === 'r') {
        event.preventDefault();
        handleReloadWithUnsavedCheck(mainWindow);
      } else if (input.key.toLowerCase() === 'w') {
        event.preventDefault();
        handleCloseWithUnsavedCheck(mainWindow);
      }
    }
  });

  // Also intercept the reload menu item
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (navigationUrl === mainWindow.webContents.getURL()) {
      event.preventDefault();
      handleReloadWithUnsavedCheck(mainWindow);
    }
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
          click: () => handleNewWithUnsavedCheck(mainWindow)
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
        isMac ? { 
          label: 'Close Window',
          accelerator: 'CommandOrControl+W',
          click: () => handleCloseWithUnsavedCheck(mainWindow)
        } : { role: 'quit' }
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
            ]),
        { type: 'separator' },
        {
          label: 'Text Alignment',
          submenu: [
            {
              label: 'Align Left',
              accelerator: 'CommandOrControl+L',
              click: () => mainWindow.webContents.executeJavaScript('document.execCommand("justifyLeft", false, null)')
            },
            {
              label: 'Center',
              accelerator: 'CommandOrControl+E',
              click: () => mainWindow.webContents.executeJavaScript('document.execCommand("justifyCenter", false, null)')
            },
            {
              label: 'Align Right',
              accelerator: 'CommandOrControl+J',
              click: () => mainWindow.webContents.executeJavaScript('document.execCommand("justifyRight", false, null)')
            }
          ]
        }
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

// Function to handle reload with unsaved changes check
async function handleReloadWithUnsavedCheck(win) {
  try {
    const isDirty = await win.webContents.executeJavaScript('window.__app_isDirty === true');
    if (!isDirty) {
      win.reload();
      return;
    }
  } catch (_) {
    // If we cannot determine, allow reload
    win.reload();
    return;
  }

  const { response } = await dialog.showMessageBox(win, {
    type: 'question',
    buttons: ['Save', 'Reload without Saving', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    title: 'Unsaved Changes',
    message: 'There are unsaved changes. What would you like to do?'
  });
  // 0 Save, 1 Reload without Saving, 2 Cancel
  if (response === 0) {
    // Save and then reload
    win.webContents.send('action:save-pdf-and-reload');
  } else if (response === 1) {
    // Reload without saving
    win.reload();
  } // else cancel - do nothing
}

// Function to handle new file with unsaved changes check
async function handleNewWithUnsavedCheck(win) {
  try {
    const isDirty = await win.webContents.executeJavaScript('window.__app_isDirty === true');
    if (!isDirty) {
      win.webContents.send('action:new-file');
      return;
    }
  } catch (_) {
    // If we cannot determine, allow new file
    win.webContents.send('action:new-file');
    return;
  }

  const { response } = await dialog.showMessageBox(win, {
    type: 'question',
    buttons: ['Save', 'New without Saving', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    title: 'Unsaved Changes',
    message: 'There are unsaved changes. What would you like to do?'
  });
  // 0 Save, 1 New without Saving, 2 Cancel
  if (response === 0) {
    // Save and then create new file
    win.webContents.send('action:save-pdf-and-new');
  } else if (response === 1) {
    // Create new file without saving
    win.webContents.send('action:new-file');
  } // else cancel - do nothing
}

// Function to handle close with unsaved changes check
async function handleCloseWithUnsavedCheck(win) {
  try {
    const isDirty = await win.webContents.executeJavaScript('window.__app_isDirty === true');
    if (!isDirty) {
      win.close();
      return;
    }
  } catch (_) {
    // If we cannot determine, allow close
    win.close();
    return;
  }

  const { response } = await dialog.showMessageBox(win, {
    type: 'question',
    buttons: ['Save', 'Quit without Saving', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    title: 'Unsaved Changes',
    message: 'There are unsaved changes. What would you like to do?'
  });
  // 0 Save, 1 Quit without Saving, 2 Cancel
  if (response === 0) {
    // Save and then close
    win.webContents.send('action:save-pdf-and-close');
  } else if (response === 1) {
    // Quit without saving - force close without triggering the event again
    win.removeAllListeners('close');
    win.close();
  } // else cancel - do nothing
}

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

    // Set document title for PDF metadata using the actual saved filename
    const actualFileName = filePath.split('/').pop().replace(/\.pdf$/, '');
    await win.webContents.executeJavaScript(`document.title = "${actualFileName}";`);

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

// IPC: Update PDF title after saving
ipcMain.handle('update-pdf-title', async (event, title) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { ok: false };
  
  try {
    await win.webContents.executeJavaScript(`document.title = "${title}";`);
    return { ok: true };
  } catch (error) {
    console.error('Failed to update PDF title:', error);
    return { ok: false, error: String(error) };
  }
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
        { name: 'Documents', extensions: ['txt', 'md', 'markdown', 'pdf', 'html', 'htm'] },
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
      // For now, use the simpler pdf-parse approach
      // We can enhance this later with better formatting preservation
      try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        const textContent = (data && data.text) ? data.text : '';
        
        // Convert plain text to HTML with proper paragraph structure
        // Group consecutive non-empty lines into paragraphs
        const lines = textContent.split('\n').map(line => line.trim());
        const paragraphs = [];
        let currentParagraph = [];
        
        for (const line of lines) {
          if (line.length > 0) {
            currentParagraph.push(line);
          } else if (currentParagraph.length > 0) {
            // Empty line - end current paragraph
            paragraphs.push(currentParagraph.join(' '));
            currentParagraph = [];
          }
        }
        
        // Add final paragraph if exists
        if (currentParagraph.length > 0) {
          paragraphs.push(currentParagraph.join(' '));
        }
        
        content = paragraphs.map(p => `<p>${p}</p>`).join('');
          
        console.log('PDF extracted successfully with basic formatting');
      } catch (error) {
        console.error('PDF parsing error:', error);
        content = '';
      }
    } else if (ext === '.html' || ext === '.htm') {
      // For HTML files, read as-is to preserve formatting
      content = fs.readFileSync(filePath, 'utf8');
    } else {
      // For text files (txt, md), preserve line breaks but convert to HTML
      const textContent = fs.readFileSync(filePath, 'utf8');
      content = textContent
        .split('\n')
        .map(line => line.trim() ? `<p>${line}</p>` : '<br>')
        .join('');
    }
    return { ok: true, filePath, content };
  } catch (error) {
    dialog.showErrorBox('Open Failed', String(error));
    return { ok: false, error: String(error) };
  }
}


