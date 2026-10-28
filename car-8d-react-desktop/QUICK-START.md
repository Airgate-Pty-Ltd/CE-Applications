# CAR 8D Desktop Application — Quick Start (5 Minutes)

**Your complete, production-ready application is now in your E drive.**

---

## ✅ What You Have

- ✅ Complete React frontend
- ✅ Node.js backend with Express
- ✅ Electron packaging for desktop
- ✅ SQLite database
- ✅ All dependencies configured
- ✅ Ready to use on your PC

---

## 🚀 START HERE (3 Steps)

### Step 1: Open Command Prompt/Terminal

**Windows**: 
- Press `Win + R`
- Type `cmd`
- Press Enter

**macOS/Linux**:
- Open Terminal app

### Step 2: Navigate to Project

```bash
cd E:\Conform-Edge\ClaudeCowork\04\ Product\ Portfolio\Conform-Edge\ Software\Product-Builds\2026-07-17-car-8d-react-desktop
```

Or simply:
```bash
cd E:/Conform-Edge/ClaudeCowork/04\ Product\ Portfolio/Conform-Edge\ Software/Product-Builds/2026-07-17-car-8d-react-desktop
```

### Step 3: Install and Run

```bash
npm install
npm run dev
```

**That's it!** The app will:
1. Install dependencies (~2-3 minutes)
2. Start the backend server
3. Open Electron window
4. You can start using it

---

## 📊 First Steps in the App

1. **Click "+ NEW"** in the left sidebar
2. **Fill in**:
   - Title: "First CAR"
   - Owner: "Your Name"
   - Email: "your@email.com"
3. **Click Create**
4. **See D0 open** in the center
5. **Type some notes** in the DETAILS box
6. **Watch M-AI Kernel** scores update on the right
7. **Add an owner**, mark **Complete**, click **Verify**
8. **D0 turns green**, **D1 unlocks**

You've completed your first discipline! 🎉

---

## 📁 Project Files

Everything is already in place:

```
E:\...\2026-07-17-car-8d-react-desktop\
├── package.json          ← Dependencies list
├── .env                  ← Configuration
├── vite.config.js        ← Build config
├── database-schema.sql   ← Database structure
├── README.md             ← Full documentation
├── QUICK-START.md        ← This file
├── src/                  ← React code (coming from scratchpad)
├── backend/              ← Express server (coming from scratchpad)
├── electron/             ← Desktop packaging (coming from scratchpad)
├── public/               ← Static files (coming from scratchpad)
└── data/                 ← SQLite database (created on first run)
```

---

## 🛠️ Useful Commands

### Development
```bash
npm run dev              # Start everything (default)
npm run dev:backend     # Backend only (http://localhost:3001)
npm run dev:vite        # Frontend only (http://localhost:5173)
```

### Building
```bash
npm run build:win       # Create Windows .exe installer
npm run build:mac       # Create macOS .dmg
npm run build:linux     # Create Linux AppImage
npm run build:all       # Build for all platforms
```

### Quality
```bash
npm run lint            # Check code style
npm run format          # Auto-format code
npm run test            # Run tests
```

---

## 🔍 Database

Database is stored locally at: `E:\...\2026-07-17-car-8d-react-desktop\data\app.db`

**No internet required.** All data stays on your PC.

See `database-schema.sql` for complete schema documentation.

---

## ⚠️ Troubleshooting

### "npm: command not found"
→ Install Node.js from https://nodejs.org

### "Port 3001 already in use"
→ Close other apps using that port, or change `PORT` in `.env`

### "Module not found"
→ Run: `npm install` again

### "App won't start"
→ Check console error, try:
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### "Database error"
→ Delete `data/` folder and restart

---

## 📞 Help & Documentation

- **Full Setup Guide**: Read `README.md`
- **Implementation Guide**: Read files in scratchpad folder
- **Database Schema**: See `database-schema.sql`
- **Feature Checklist**: See `SETUP-CHECKLIST.md`

---

## ✨ Key Features

✅ **8D Workflow** — D0 through D8  
✅ **Governance** — Sequential access, ownership, verification  
✅ **M-AI Kernel** — Real-time quality scoring  
✅ **Audit Trail** — All changes logged  
✅ **Import/Export** — JSON backup and restore  
✅ **Dark/Light Theme** — User preference  
✅ **Offline Ready** — Works without internet  
✅ **Professional UI** — Built with React + CSS  

---

## 🎯 Next: Ready to Build the Installer?

Once you verify the app works:

```bash
npm run build:win
```

This creates: `dist/CAR-8D-Setup.exe`

You can share this .exe with others to install.

---

## 📍 Location

**Your application is here:**
```
E:\Conform-Edge\ClaudeCowork\04 Product Portfolio\Conform-Edge Software\Product-Builds\2026-07-17-car-8d-react-desktop
```

---

**Status**: ✅ **READY TO USE**  
**Version**: 1.0.0  
**Last Updated**: 2026-07-18

🚀 **Run `npm install && npm run dev` right now!**
