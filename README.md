# 🎲 Ludo Arena KE

A Ludo game for Kenya, with a free mode and a real-money *Beast* mode.

**The whole app is written in [ReScript](https://rescript-lang.org) 12.** No
TypeScript, no JavaScript application code — the engine, the UI, the wallet and
the entry point are all `.res` files that compile to plain ES modules. The only
JavaScript in the repo is the one-line CSS shim and the compiled output itself.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 36 engine + board + UI tests
npm run build    # rescript build && vite build  →  dist/
```

## Why ReScript

- **Sound types, cheap runtime.** ReScript compiles to small, readable ESM with
  no runtime type machinery; the bundle is ~250 kB (79 kB gzipped) including React.
- **Same deploy shape.** It emits static files, so the existing Render static
  service — `npm ci && npm run build` → `./dist` — keeps serving
  **https://ludoarenademo-1.onrender.com** with no infrastructure change.
- **It caught real bugs.** The compiler rejected option/number collisions and
  exhaustiveness holes that would have been silent runtime failures in JS.

## Architecture

```
src/
  engine/
    Types.res     state, players, tokens, rules
    Board.res     52-cell ring, yards, home columns, draw coordinates
    Rng.res       seeded mulberry32 + FNV-1a hashing
    Game.res      the rules: roll, move, captures, finishing, bot AI
    Verify.res    replay a finished match from its seed
  wallet/Wallet.res   integer-cent wallet, localStorage persistence
  components/         Lobby, GameScreen, BoardView, WalletModal, Chip
  App.res             app shell + bot driver
  Main.res            browser entry point
tests/                node:test suites (engine, board geometry, UI smoke)
```

### Verifiable matches

Every match is driven by a seed. `state.log` records each roll and move, and
`Verify.replay` re-derives the final state from the seed plus the players'
token choices. A tampered log fails `Verify.verify` — so a Beast-mode result can
be audited after the fact instead of being taken on trust.

### Money handling

All amounts are integer cents. `Wallet` never does float arithmetic on balances,
so rounding drift cannot reach a payout.

## Deployment

Render builds this repo with `npm ci && npm run build` and publishes `dist/`.
The blueprint is in `render.yaml`; pull-request previews are enabled.
`web/` is the previous Next.js experiment, kept for reference only and no longer
deployed.

---

# 🎲 Ludo Arena KE - M-Pesa Integrated Ludo Game

A full-featured Ludo game with Free Mode and Beast Mode (monetized) with M-Pesa integration for Kenya.

## 📋 Prerequisites

Before you begin, make sure you have the following installed on your computer:

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Choose the LTS (Long Term Support) version
   - After installation, verify by opening terminal and typing:
     ```bash
     node --version
     npm --version
     ```

2. **VS Code** (Visual Studio Code)
   - Download from: https://code.visualstudio.com/

3. **Git** (optional but recommended)
   - Download from: https://git-scm.com/

## 🚀 Step-by-Step Setup Instructions

### Step 1: Download/Clone the Project

**Option A: If you have the project files as a ZIP:**
1. Extract the ZIP file to a folder on your computer
2. Remember the folder location (e.g., `C:\Projects\ludo-arena` or `~/Projects/ludo-arena`)

**Option B: If using Git:**
```bash
git clone <your-repository-url>
cd ludo-arena
```

### Step 2: Open Project in VS Code

1. Open VS Code
2. Go to **File** → **Open Folder**
3. Navigate to and select your project folder
4. Click **Select Folder**

### Step 3: Open Terminal in VS Code

1. In VS Code, go to **Terminal** → **New Terminal**
   - Or use keyboard shortcut: `` Ctrl + ` `` (backtick)
2. A terminal panel will open at the bottom of VS Code

### Step 4: Install Dependencies

In the VS Code terminal, type:

```bash
npm install
```

Wait for the installation to complete. This may take 1-3 minutes.

### Step 5: Run the Development Server

In the VS Code terminal, type:

```bash
npm run dev
```

You should see output like:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Step 6: Open the Game in Browser

1. Hold `Ctrl` (or `Cmd` on Mac) and click on `http://localhost:5173/`
2. Or open your browser and go to: **http://localhost:5173/**

🎉 **The game should now be running!**

## 🎮 How to Play

### Free Mode
1. Click **Free Mode** on the home screen
2. Select number of players (2-4)
3. Click **Start Game**
4. Click **Roll Dice** on your turn
5. Click on a token to move it

### Beast Mode (With M-Pesa)
1. First, add money to your wallet:
   - Click **Wallet** on the home screen
   - Enter your M-Pesa phone number
   - Enter amount and click **Deposit via M-Pesa**
   - (In demo mode, click "Add Demo Credits")
2. Click **Beast Mode** on the home screen
3. Select entry fee and number of players
4. Click **Start Game**
5. Winner receives 90% of the prize pool!

## 🛠️ Useful VS Code Commands

| Action | Command |
|--------|---------|
| Start dev server | `npm run dev` |
| Stop dev server | `Ctrl + C` in terminal |
| Build for production | `npm run build` |
| Preview production build | `npm run preview` |

## 📁 Project Structure

```
ludo-arena/
├── src/
│   ├── components/
│   │   ├── GameScreen.tsx    # Main game screen
│   │   ├── HomeScreen.tsx    # Landing page
│   │   ├── LudoBoard.tsx     # Game board
│   │   ├── MpesaWallet.tsx   # M-Pesa wallet
│   │   └── WinnerModal.tsx   # Winner announcement
│   ├── hooks/
│   │   └── useGameState.ts   # Game logic
│   ├── services/
│   │   └── mpesa.ts          # M-Pesa API service
│   ├── types/
│   │   └── game.ts           # TypeScript types
│   ├── App.tsx               # Main app component
│   ├── index.css             # Styles
│   └── main.tsx              # Entry point
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 🔧 Recommended VS Code Extensions

Install these extensions for a better development experience:

1. **ES7+ React/Redux/React-Native snippets**
   - ID: `dsznajder.es7-react-js-snippets`

2. **Tailwind CSS IntelliSense**
   - ID: `bradlc.vscode-tailwindcss`

3. **Prettier - Code formatter**
   - ID: `esbenp.prettier-vscode`

4. **ESLint**
   - ID: `dbaeumer.vscode-eslint`

To install: Go to Extensions (Ctrl+Shift+X) → Search → Install

## 📱 M-Pesa Production Setup

For real M-Pesa integration, you need:

### 1. Safaricom Daraja Account
- Register at: https://developer.safaricom.co.ke/
- Create an app to get API credentials

### 2. Backend Server Required
You need a backend server (Node.js/Express recommended) to:
- Securely store API keys
- Handle STK Push requests
- Process M-Pesa callbacks
- Handle B2C payouts

### 3. Environment Variables
Create a `.env` file (never commit to git):
```env
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=your_shortcode
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
```

### 4. SSL Certificate
M-Pesa requires HTTPS for callbacks. Use services like:
- Ngrok (for testing)
- Let's Encrypt (for production)

## 🐛 Troubleshooting

### "npm is not recognized"
- Node.js is not installed or not in PATH
- Reinstall Node.js and restart VS Code

### "Port 5173 is already in use"
- Another app is using that port
- Stop the other app or change port:
  ```bash
  npm run dev -- --port 3000
  ```

### "Module not found" errors
- Dependencies not installed properly
- Run `npm install` again

### White screen / Nothing loads
- Check browser console (F12 → Console tab)
- Look for error messages

### Game not responding
- Refresh the page (F5)
- Clear browser cache (Ctrl+Shift+Delete)

## 📞 Support

If you encounter issues:
1. Check the browser console for errors (F12)
2. Make sure all dependencies are installed
3. Try deleting `node_modules` folder and running `npm install` again

## 📄 License

This project is for educational and commercial use.

---

Made with ❤️ for Kenya 🇰🇪
