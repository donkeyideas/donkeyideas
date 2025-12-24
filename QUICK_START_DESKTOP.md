# 🚀 Quick Start - Desktop App

## 3 Simple Steps

### 1. Install Dependencies
```powershell
cd "C:\Users\beltr\Donkey Ideas\apps\desktop"
npm install
```

### 2. Update Dashboard URL
Edit `apps/desktop/main.js` line 8:
```javascript
const DASHBOARD_URL = 'https://your-dashboard-url.com'; // ← Change this
```

### 3. Run the App
```powershell
npm run dev
```

That's it! The app will open and load your dashboard.

---

## Build Installer (Optional)

After testing, create an installer:

```powershell
npm run build
```

The `.exe` installer will be in the `dist` folder.

---

## Full Instructions

See `DESKTOP_APP_INSTRUCTIONS.md` for complete details.

