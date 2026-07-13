# 🧭 Habit Tracker v2 — Premium Web App + Google Sheets

A beautiful, gamified daily habit tracker with Google Sheets as the cloud backend. Features glassmorphic dark UI, animated progress tracking, streak-based rewards, and badge system.

## ✨ Features

- 📝 **Daily Check-in** — Step-by-step animated question cards
- 📊 **Dashboard** — Score trends, radar chart, progress rings
- 🏆 **Rewards** — Streak milestones with real rewards
- 🏅 **Badges** — Earn badges for consistent habits
- 🎮 **XP & Levels** — Gamification with levels (Beginner → Transcendent)
- 📅 **History** — Calendar heatmap & daily log table
- 📱 **Cross-device** — Works on phone, tablet, laptop
- ✨ **Premium Animations** — Confetti, particles, 3D tilt, animated counters
- 🔔 **Telegram Reminders** — Daily reminder via Telegram bot

## 🚀 Quick Start (Local Only — No Backend)

1. Open `index.html` in your browser
2. Start tracking! Data saves to your browser's localStorage

> ⚠️ Without the backend, data stays in your browser only. Follow the steps below for cross-device sync.

## 🔧 Full Setup (With Google Sheets Backend)

### Step 1: Create the Google Apps Script

1. Go to [script.google.com](https://script.google.com)
2. Click **New Project**
3. Delete any existing code in the editor
4. Copy the entire contents of `backend/AppScript.gs` and paste it in
5. Click **Save** (💾) and name the project **"Habit Tracker v2 API"**

### Step 2: Initialize the Sheet

1. In the Apps Script editor, select `initializeSheet` from the function dropdown
2. Click **Run** ▶️
3. Grant permissions when prompted
4. Check **Execution Log** — you'll see the Sheet URL

### Step 3: Deploy as Web App

1. Click **Deploy** → **New Deployment**
2. Click the gear icon ⚙️ → Select **Web App**
3. Set:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy**
5. **Copy the Web App URL** — it looks like: `https://script.google.com/macros/s/ABC.../exec`

### Step 4: Connect the Web App

1. Open `js/config.js`
2. Replace `'YOUR_APPS_SCRIPT_WEB_APP_URL'` with your Web App URL:
   ```javascript
   API_URL: 'https://script.google.com/macros/s/YOUR_ID/exec',
   ```
3. Save and refresh the web app

### Step 5: Host on GitHub Pages (for Cross-device Access)

1. Create a GitHub repository
2. Push all files to the repository
3. Go to **Settings** → **Pages**
4. Set Source to **main** branch, folder **/ (root)**
5. Your app is live at `https://yourusername.github.io/habit-tracker-v2/`

## 📱 Setting Up Telegram Reminders

### Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Follow the prompts to name your bot
4. BotFather will give you a **Bot Token** like: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
5. **Save this token**

### Step 2: Get Your Chat ID

1. Search for **@userinfobot** on Telegram
2. Send it any message
3. It will reply with your **Chat ID** (a number like `123456789`)
4. **Save this number**

### Step 3: Configure in Apps Script

1. Open your Apps Script project
2. In `AppScript.gs`, find the CONFIG section at the top
3. Replace the placeholders:
   ```javascript
   TELEGRAM_BOT_TOKEN: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
   TELEGRAM_CHAT_ID: "123456789",
   WEB_APP_URL: "https://yourusername.github.io/habit-tracker-v2/"
   ```
4. Save the file

### Step 4: Set Up Daily Trigger

1. In Apps Script, select `setupTelegramTrigger` from the function dropdown
2. Click **Run** ▶️
3. Grant permissions when prompted
4. You'll now receive a Telegram message every morning at ~6:30 AM!

### Step 5: Test It

1. Select `sendFormToTelegram` and click **Run** ▶️
2. Check Telegram — you should receive a test message with your tracker link

## 🔧 Adding New Habits

Open `js/config.js` and add a new entry to the `HABITS` array:

```javascript
{
  id: 'meditation',           // Unique ID
  name: 'Meditation',         // Display name
  icon: '🧘',                 // Emoji icon
  category: 'wellness',       // Category
  type: 'number',             // time | number | boolean | text
  unit: 'minutes',            // Unit label
  question: 'How many minutes did you meditate today?',
  helpText: 'Even 5 minutes counts! Target: 10+ minutes',
  placeholder: 'e.g., 15',
  target: { type: 'min', value: 10 },   // Target definition
  points: 15,                  // Max points for this habit
  partialPoints: 8,            // Points for partial completion
  partialTarget: { type: 'min', value: 5 },
  required: true,
  sheetColumn: 'Meditation (min)',
  badge: {
    name: 'Zen Master',
    icon: '🧘',
    description: 'Meditate 10+ min for 7 consecutive days',
    streakDays: 7,
  },
}
```

**That's it!** The form question, dashboard ring, chart, scoring, and badge will all auto-generate.

> Note: After adding new habits, redeploy the Apps Script and update the sheet headers if you're using the Google Sheets backend.

## 📊 Scoring System

| Habit | Full Points | Partial Points |
|-------|------------|----------------|
| ⏰ Wake Up (5:30-6:00 AM) | 15 | 8 (6:00-6:30) |
| 🌙 Sleep (10:30-11:00 PM) | 15 | 8 (11:00-11:30) |
| 😴 Sleep Hours (6-8 hrs) | 20 | 10 (5-6 or 8-9) |
| 💧 Water (≥ 2L) | 15 | 8 (≥ 1.5L) |
| 📖 Reading (≥ 20 min) | 15 | 8 (≥ 10 min) |
| 🚶 Walking (≥ 25 min) | 10 | 5 (≥ 15 min) |
| ✅ Todo completed | 10 | 5 (partial) |
| **Total** | **100** | |

## 🏆 Streak Rewards

| Streak | Reward |
|--------|--------|
| 🔥 3 days | A Movie 🎬 |
| 🔥 7 days | Temptation / Chocolate 🍫 |
| 🔥 14 days | Night Dinner 🍽️ |
| 🔥 21 days | Any Sweet 🍰 |
| 🔥 30 days | Buy Gadget ₹2K 📱 |
| 🔥 60 days | Buy Gadget ₹5K 🎮 |
| 🔥 90 days | Buy Gadget ₹20K 💻 |

> A streak day = daily score ≥ 70/100

## 📁 Project Structure

```
habit-tracker-v2/
├── index.html                 # Main single-page app
├── css/
│   ├── styles.css             # Design system & component styles
│   └── animations.css         # All keyframe animations
├── js/
│   ├── config.js              # 🔧 Habit definitions (edit to add habits)
│   ├── storage.js             # LocalStorage cache layer
│   ├── api.js                 # Google Sheets API communication
│   ├── rewards.js             # Streak & reward logic
│   ├── animations.js          # Confetti, particles, effects
│   ├── charts.js              # Chart.js dashboards
│   ├── ui.js                  # UI rendering
│   └── app.js                 # Main app controller
├── backend/
│   └── AppScript.gs           # Google Apps Script backend
└── README.md
```

## License

Personal use. Built with ❤️
