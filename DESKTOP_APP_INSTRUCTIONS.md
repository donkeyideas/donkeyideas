# Donkey Ideas Desktop App - Setup Instructions

## Overview

This desktop app is a simple Electron wrapper that loads your hosted Donkey Ideas dashboard in a native desktop window. It's perfect for personal use and provides a native app experience.

## Prerequisites

- Node.js 20+ installed
- Your dashboard deployed and accessible via URL
- npm or yarn package manager

## Step-by-Step Setup

### Step 1: Install Dependencies

Navigate to the desktop app directory and install dependencies:

```powershell
cd "C:\Users\beltr\Donkey Ideas\apps\desktop"
npm install
```

This will install:
- `electron` - The Electron framework
- `electron-builder` - For building installers
- `cross-env` - For cross-platform environment variables

### Step 2: Configure Your Dashboard URL

Open `apps/desktop/main.js` and find this line (around line 8):

```javascript
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3001';
```

**Update it to your hosted dashboard URL:**

```javascript
const DASHBOARD_URL = 'https://app.donkeyideas.com'; // Replace with your actual URL
```

**OR** use an environment variable (recommended for flexibility):

```powershell
# Windows PowerShell
$env:DASHBOARD_URL="https://app.donkeyideas.com"
```

### Step 3: Test the Desktop App

Run the app in development mode:

```powershell
cd "C:\Users\beltr\Donkey Ideas\apps\desktop"
npm run dev
```

Or from the root directory:

```powershell
cd "C:\Users\beltr\Donkey Ideas"
npm run desktop:dev
```

The app should open and load your dashboard. You'll see:
- A native desktop window
- Your dashboard loaded inside
- Menu bar at the top
- DevTools open (in development mode)

### Step 4: Build the Installer (Optional)

Once you've tested and everything works, build an installer:

```powershell
cd "C:\Users\beltr\Donkey Ideas\apps\desktop"
npm run build
```

Or build specifically for Windows:

```powershell
npm run build:win
```

The installer will be created in `apps/desktop/dist/` folder.

**For Windows**, you'll get:
- `Donkey Ideas Dashboard Setup.exe` - Full installer
- `Donkey Ideas Dashboard Setup.exe` - Can be distributed to install on other machines

## Configuration Options

### Change Window Size

Edit `apps/desktop/main.js`:

```javascript
mainWindow = new BrowserWindow({
  width: 1400,  // Change default width
  height: 900,  // Change default height
  // ...
});
```

### Disable DevTools in Development

In `main.js`, comment out or remove:

```javascript
if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
  mainWindow.webContents.openDevTools();
}
```

### Add App Icons (Optional)

1. Create icon files:
   - `icon.ico` (256x256) for Windows
   - `icon.icns` (512x512) for macOS
   - `icon.png` (512x512) for Linux

2. Place them in `apps/desktop/assets/` folder

3. The build process will automatically use them

You can create icons from a PNG using:
- Online tools: https://www.electron.build/icons
- Or use ImageMagick/other tools

### Enable System Tray (Optional)

Uncomment the `createTray()` function in `main.js` and add a tray icon file.

## Usage

### Running the App

**Development mode:**
```powershell
npm run desktop:dev
```

**Production mode:**
```powershell
npm run desktop:start
```

**After building installer:**
- Double-click the `.exe` installer
- Follow installation wizard
- Launch from Start Menu or Desktop shortcut

### Keyboard Shortcuts

- `Ctrl+R` (or `Cmd+R` on Mac) - Reload the app
- `Ctrl+Shift+R` - Force reload (ignores cache)
- `Ctrl+Q` (or `Cmd+Q` on Mac) - Quit
- `F11` - Toggle fullscreen
- `Ctrl+Shift+I` - Open DevTools

### Menu Bar

The app includes a standard menu bar:
- **File** - Reload, Quit
- **Edit** - Copy, Paste, etc.
- **View** - Zoom, Fullscreen, DevTools
- **Window** - Minimize, Close
- **Help** - Open dashboard in browser, About

## Troubleshooting

### "Cannot find module 'electron'"

**Solution:** Install dependencies:
```powershell
cd apps/desktop
npm install
```

### App opens but shows "Cannot connect" or blank page

**Solution:** 
1. Check that `DASHBOARD_URL` in `main.js` is correct
2. Verify your dashboard is accessible in a browser
3. Check for CORS issues (shouldn't be a problem if loading the full page)

### Build fails with "electron-builder not found"

**Solution:**
```powershell
cd apps/desktop
npm install electron-builder --save-dev
```

### App is slow or uses too much memory

**Solution:** This is normal for Electron apps. They use Chromium which is memory-intensive. Consider:
- Closing other browser tabs
- Using the web version if memory is a concern
- The app will use ~200-400MB RAM typically

### External links don't open

**Solution:** This should work automatically. If not, check that your default browser is set correctly in Windows settings.

## Advanced Configuration

### Custom Protocol Handler

To enable `donkeyideas://` links, add to `main.js`:

```javascript
app.setAsDefaultProtocolClient('donkeyideas');
```

### Auto-Update (Future Enhancement)

For auto-updates, you'll need:
1. A server to host update files
2. `electron-updater` package
3. Code signing certificate (for production)

This is optional for personal use.

### Offline Detection

You can add offline detection by listening to network events:

```javascript
mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
  if (errorCode === -106) { // ERR_INTERNET_DISCONNECTED
    // Show offline message
  }
});
```

## File Structure

```
apps/desktop/
├── main.js          # Main Electron process
├── preload.js       # Security bridge (runs before page loads)
├── package.json     # Dependencies and build config
├── assets/          # Icons (optional)
│   ├── icon.ico     # Windows icon
│   ├── icon.icns    # macOS icon
│   └── icon.png     # Linux icon
└── dist/            # Build output (created after build)
    └── Donkey Ideas Dashboard Setup.exe
```

## Next Steps

1. ✅ Test the app with your dashboard URL
2. ✅ Customize window size and settings if needed
3. ✅ Build the installer
4. ✅ Install and test the built app
5. ✅ (Optional) Add app icons
6. ✅ (Optional) Set up auto-launch on Windows startup

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review `apps/desktop/README.md` for more details
3. Check Electron documentation: https://www.electronjs.org/docs
4. Check electron-builder docs: https://www.electron.build/

## Notes

- The desktop app is just a wrapper - all your dashboard code stays on the server
- No changes needed to your dashboard code
- Authentication works the same as in a browser
- All features work exactly as they do in the web version
- The app is essentially a specialized browser window for your dashboard

---

**Ready to use!** Just update the URL and run `npm run desktop:dev` to test.

