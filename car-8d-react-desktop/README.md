# CAR 8D Desktop Application — React + Electron

Complete desktop application for 8D Corrective Action Reports.

## 📥 Quick Start (Windows, Mac, Linux)

### 1. Install Node.js
- Download from: https://nodejs.org (v16 or higher)
- Install with default settings

### 2. Open Terminal/Command Prompt
- Navigate to this folder: `E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\Conform-Edge Software\Product-Builds\2026-07-17-car-8d-react-desktop`

### 3. Install Dependencies
```bash
npm install
```
(Takes 2-5 minutes on first run)

### 4. Start the Application
```bash
npm run dev
```

### 5. Use the App
- Desktop window opens automatically
- Click "+ NEW" to create your first CAR
- Start entering D0 information
- Watch M-AI Kernel score in real-time
- Complete workflow D0 → D8
- Export to JSON when done

---

## 📁 Project Structure

```
2026-07-17-car-8d-react-desktop/
├── backend/              # Node.js/Express server
├── electron/             # Electron desktop packaging
├── src/                  # React frontend code
├── public/               # Static assets
├── data/                 # Database (created on first run)
├── dist/                 # Built app (created during build)
├── package.json          # Dependencies
├── vite.config.js        # Build configuration
├── .env                  # Environment variables
└── README.md             # This file
```

---

## 🛠️ Commands

```bash
# Development (hot reload)
npm run dev

# Build for your platform
npm run build:win         # Windows .exe
npm run build:mac         # macOS .dmg
npm run build:linux       # Linux AppImage

# Quality checks
npm run lint
npm run format
npm run test
```

---

## 📊 Features

✅ Full 8D workflow (D0-D8)  
✅ M-AI Kernel quality auditing  
✅ Governance enforcement  
✅ Real-time scoring  
✅ Audit trail logging  
✅ Import/export JSON  
✅ Dark/light theme  
✅ Professional UI  
✅ SQLite database (local, no cloud)  
✅ Offline-first design  

---

## 📚 Additional Files

- `IMPLEMENTATION-GUIDE.md` — Detailed setup walkthrough
- `SETUP-CHECKLIST.md` — Feature checklist and next steps
- `database-schema.sql` — Complete SQL schema documentation
- `package.json` — All dependencies listed

---

## 🔧 Troubleshooting

### Port 3001 already in use?
```bash
# Windows: Find and stop the process
netstat -ano | findstr :3001

# Mac/Linux: Find and kill
lsof -i :3001
kill -9 <PID>
```

### npm not found?
- Restart your terminal/command prompt
- Verify Node.js installed: `node --version`

### App won't start?
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Database issues?
```bash
# Delete and recreate database
rm -rf data/
npm run dev
```

---

## 📖 For More Help

1. Read `IMPLEMENTATION-GUIDE.md` for detailed setup
2. Check `database-schema.sql` for data structure
3. See `SETUP-CHECKLIST.md` for feature overview

---

**Version**: 1.0.0  
**Built with**: React 18 + Electron 28 + Node.js + SQLite  
**Status**: ✅ Production Ready  
**Location**: E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\Conform-Edge Software\Product-Builds\2026-07-17-car-8d-react-desktop

🚀 **Ready to use on your PC!**
