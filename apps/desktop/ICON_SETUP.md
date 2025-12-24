# App Icon Setup ✅

Your Donkey Ideas logo has been set up as the desktop app icon!

## Generated Files

✅ **icon.png** (206 KB)
   - Used for Linux and as fallback
   - Optimized to 512x512 pixels

✅ **icon.ico** (359 KB)
   - Used for Windows
   - Contains multiple sizes (16, 32, 48, 64, 128, 256)
   - Will appear in taskbar, window title, and installer

📁 **logo-original.png** (2.4 MB)
   - Original source file (kept for reference)

## Where Icons Appear

- **Taskbar** - When app is running
- **Window Title Bar** - Top-left corner of window
- **Installer** - When building the .exe installer
- **Start Menu** - After installation
- **Desktop Shortcut** - If created during install

## Configuration

The icons are configured in:
- `main.js` - Window icon (uses platform-specific format)
- `package.json` - Build configuration for electron-builder
- `electron-builder.yml` - Build settings

## Regenerating Icons

If you need to regenerate icons (e.g., after updating the logo):

```powershell
cd apps/desktop
npm run generate-icons
```

Or manually:
```powershell
node generate-icons.js
```

## macOS Icon (Optional)

For macOS builds, you can create an ICNS file:
1. Go to: https://cloudconvert.com/png-to-icns
2. Upload: `assets/logo-original.png`
3. Download and save as: `apps/desktop/assets/icon.icns`

This is optional - the app will work without it, but macOS users will see a generic icon.

## Testing

To see the icon:
1. Run the app: `npm run dev`
2. Check the window title bar (top-left)
3. Check the taskbar icon
4. Build the installer: `npm run build:win`
5. Install and check Start Menu / Desktop shortcut

---

**Status:** ✅ Icons configured and ready to use!

