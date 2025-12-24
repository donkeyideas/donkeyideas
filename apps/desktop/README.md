# Donkey Ideas Desktop App

Electron wrapper for the Donkey Ideas Dashboard.

## Quick Start

### 1. Install Dependencies

```bash
cd apps/desktop
npm install
```

### 2. Configure Dashboard URL

Edit `main.js` and update the `DASHBOARD_URL` constant:

```javascript
const DASHBOARD_URL = 'https://app.donkeyideas.com'; // Your hosted dashboard URL
```

Or set it via environment variable:

```bash
# Windows PowerShell
$env:DASHBOARD_URL="https://app.donkeyideas.com"; npm start

# Windows CMD
set DASHBOARD_URL=https://app.donkeyideas.com && npm start

# macOS/Linux
DASHBOARD_URL=https://app.donkeyideas.com npm start
```

### 3. Run in Development

```bash
npm run dev
```

Or from the root directory:

```bash
npm run desktop:dev
```

### 4. Build for Production

```bash
# Build for current platform
npm run build

# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux
```

The installer will be in the `dist` folder.

## Features

- ✅ Native desktop window
- ✅ Menu bar with standard options
- ✅ Keyboard shortcuts
- ✅ External links open in default browser
- ✅ Window state management
- ✅ Security best practices (context isolation)

## Optional: Add App Icons

Place icon files in the `assets` folder:
- `icon.ico` - Windows icon (256x256)
- `icon.icns` - macOS icon (512x512)
- `icon.png` - Linux icon (512x512)

You can generate these from a single PNG using tools like:
- [Electron Icon Maker](https://www.electron.build/icons)
- [CloudConvert](https://cloudconvert.com/)

## Troubleshooting

### App won't start
- Make sure your dashboard URL is accessible
- Check that Node.js 20+ is installed
- Try running with `DEBUG=true npm run dev` to see errors

### Can't connect to dashboard
- Verify the URL is correct in `main.js`
- Check if the dashboard server is running
- For localhost, make sure the dashboard is running on port 3001

### Build fails
- Make sure all dependencies are installed: `npm install`
- Check that electron-builder is installed
- On Windows, you may need Visual Studio Build Tools

## Development Tips

- Press `Ctrl+Shift+I` (or `Cmd+Option+I` on Mac) to open DevTools
- Use `Ctrl+R` to reload the app
- External links automatically open in your default browser

