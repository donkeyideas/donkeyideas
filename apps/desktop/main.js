const { app, BrowserWindow, Menu, Tray, nativeImage, shell } = require('electron');
const path = require('path');
const http = require('http');

// Keep a global reference of the window object
let mainWindow = null;
let tray = null;

// Dashboard URL - Update this to your hosted dashboard URL
// For local development, use: http://localhost:3001
// For production, use: https://app.donkeyideas.com (or your actual URL)
const DASHBOARD_URL = 'http://localhost:3001';

// Function to check if server is ready
function waitForServer(url, maxAttempts = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkServer = () => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'HEAD',
        timeout: 1000
      };
      
      const req = http.request(options, (res) => {
        resolve(true);
      });
      
      req.on('error', () => {
        attempts++;
        if (attempts >= maxAttempts) {
          reject(new Error('Server not available after maximum attempts'));
        } else {
          setTimeout(checkServer, interval);
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        attempts++;
        if (attempts >= maxAttempts) {
          reject(new Error('Server not available after maximum attempts'));
        } else {
          setTimeout(checkServer, interval);
        }
      });
      
      req.end();
    };
    
    checkServer();
  });
}

function createWindow() {
  // Create the browser window
  // Set icon based on platform
  const iconPath = process.platform === 'win32' 
    ? path.join(__dirname, 'assets', 'icon.ico')
    : process.platform === 'darwin'
    ? path.join(__dirname, 'assets', 'icon.icns')
    : path.join(__dirname, 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    icon: iconPath, // Platform-specific icon
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    show: false, // Don't show until ready
    titleBarStyle: 'default'
  });

  // Load the dashboard URL (with retry logic)
  const loadDashboard = async () => {
    try {
      // In development, wait for server to be ready
      if (process.env.NODE_ENV === 'development') {
        console.log('Waiting for web server to be ready...');
        try {
          await waitForServer(DASHBOARD_URL);
          console.log('Web server is ready!');
        } catch (error) {
          console.warn('Server not ready yet, will retry on load...');
        }
      }
      
      await mainWindow.loadURL(DASHBOARD_URL);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      // Show error page if connection fails
      mainWindow.loadURL(`data:text/html;charset=utf-8,
      <html>
        <head>
          <title>Connection Error - Donkey Ideas Dashboard</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #0a0a0a;
              color: #fff;
            }
            .container {
              text-align: center;
              max-width: 500px;
              padding: 2rem;
            }
            h1 { color: #fff; margin-bottom: 1rem; }
            p { color: #888; line-height: 1.6; }
            code {
              background: #1a1a1a;
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              color: #4ade80;
            }
            .button {
              display: inline-block;
              margin-top: 1.5rem;
              padding: 0.75rem 1.5rem;
              background: #3b82f6;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              cursor: pointer;
            }
            .button:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ Cannot Connect to Dashboard</h1>
            <p>The dashboard server is not running or not accessible at:</p>
            <p><code>${DASHBOARD_URL}</code></p>
            <p><strong>To fix this:</strong></p>
            <ol style="text-align: left; display: inline-block;">
              <li>Open a terminal and run: <code>npm run dev</code></li>
              <li>Wait for the server to start</li>
              <li>Click the button below to retry</li>
            </ol>
            <button class="button" onclick="window.location.reload()">Retry Connection</button>
          </div>
        </body>
      </html>
    `);
    }
  };
  
  loadDashboard();

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus the window
    if (process.platform === 'darwin') {
      app.dock.show();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Optional: Open DevTools in development
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
    mainWindow.webContents.openDevTools();
  }
  
  // Auto-reload when web app updates (in development)
  if (process.env.NODE_ENV === 'development') {
    // Reload when navigation completes (handles hot-reload from Next.js)
    mainWindow.webContents.on('did-finish-load', () => {
      // Small delay to ensure page is fully loaded
      setTimeout(() => {
        // Check if we're on an error page, if so, try reloading
        mainWindow.webContents.executeJavaScript(`
          document.title.includes('Connection Error') || 
          document.body.textContent.includes('Cannot Connect')
        `).then((isErrorPage) => {
          if (isErrorPage) {
            // Retry loading after a delay
            setTimeout(() => {
              mainWindow.reload();
            }, 2000);
          }
        }).catch(() => {
          // Ignore errors
        });
      }, 500);
    });
  }

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.reload();
            }
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.reloadIgnoringCache();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
        { role: 'selectAll', label: 'Select All' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Actual Size' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Fullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Minimize' },
        { role: 'close', label: 'Close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Open Dashboard in Browser',
          click: () => {
            shell.openExternal(DASHBOARD_URL);
          }
        },
        {
          label: 'About Donkey Ideas',
          click: () => {
            // You can add an about dialog here
            shell.openExternal('https://donkeyideas.com');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about', label: 'About ' + app.getName() },
        { type: 'separator' },
        { role: 'services', label: 'Services' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide ' + app.getName() },
        { role: 'hideOthers', label: 'Hide Others' },
        { role: 'unhide', label: 'Show All' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit ' + app.getName() }
      ]
    });

    // Window menu
    template[4].submenu = [
      { role: 'close', label: 'Close' },
      { role: 'minimize', label: 'Minimize' },
      { role: 'zoom', label: 'Zoom' },
      { type: 'separator' },
      { role: 'front', label: 'Bring All to Front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createTray() {
  // Optional: Create system tray icon
  // You'll need to add an icon file for this to work
  // const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  // const icon = nativeImage.createFromPath(iconPath);
  // 
  // tray = new Tray(icon);
  // const contextMenu = Menu.buildFromTemplate([
  //   {
  //     label: 'Show Dashboard',
  //     click: () => {
  //       if (mainWindow) {
  //         mainWindow.show();
  //       } else {
  //         createWindow();
  //       }
  //     }
  //   },
  //   {
  //     label: 'Quit',
  //     click: () => {
  //       app.quit();
  //     }
  //   }
  // ]);
  // tray.setToolTip('Donkey Ideas Dashboard');
  // tray.setContextMenu(contextMenu);
  // 
  // tray.on('click', () => {
  //   if (mainWindow) {
  //     mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  //   }
  // });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationURL) => {
    navigationEvent.preventDefault();
    shell.openExternal(navigationURL);
  });
});

// Handle certificate errors (for self-signed certs in development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // In development, you might want to allow self-signed certs
  if (process.env.NODE_ENV === 'development') {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

