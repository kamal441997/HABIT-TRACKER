// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║              🧭 HABIT TRACKER v2 — GOOGLE APPS SCRIPT BACKEND              ║
// ║                                                                            ║
// ║  Deployed as a Google Apps Script Web App (doGet / doPost).                ║
// ║  Serves as a REST API for the Habit Tracker v2 web frontend.               ║
// ║  Reads / writes data to a Google Sheet.                                    ║
// ║                                                                            ║
// ║  Author : Kamal                                                            ║
// ║  Version: 2.0                                                              ║
// ║  Date   : July 2026                                                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════════
// §1 — CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Central configuration object.
 * Replace placeholder values before deploying.
 */
const CONFIG = {
  // Google Sheet
  SHEET_NAME: '🧭 Habit Tracker v2 — Master Dashboard',
  TAB_DAILY: '📊 Daily Data',
  TAB_REWARDS: '🏆 Rewards Log',

  // Telegram (replace with real values)
  TELEGRAM_BOT_TOKEN: 'YOUR_TELEGRAM_BOT_TOKEN_HERE',
  TELEGRAM_CHAT_ID: 'YOUR_TELEGRAM_CHAT_ID_HERE',

  // Web App URL (set after first deployment)
  WEB_APP_URL: 'YOUR_WEB_APP_URL_HERE',

  // Scoring thresholds
  STREAK_THRESHOLD: 70, // Minimum daily score to count as a "streak day"

  // Date & day formats
  DATE_FORMAT: 'dd-MMM-yyyy', // e.g. 04-Jul-2026
  DAY_FORMAT: 'EEEE',         // e.g. Friday
};


// ═══════════════════════════════════════════════════════════════════════════════
// §2 — HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses a date string in "dd-MMM-yyyy" format into a JavaScript Date object.
 * @param {string} dateStr — e.g. "04-Jul-2026"
 * @returns {Date|null} Parsed Date or null on failure.
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = months[parts[1]];
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || month === undefined || isNaN(year)) return null;
    return new Date(year, month, day);
  } catch (e) {
    return null;
  }
}

/**
 * Returns the Monday of the week that contains the given date.
 * Useful for weekly aggregations.
 * @param {Date} date
 * @returns {Date}
 */
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Escapes special Markdown characters for Telegram MarkdownV2 messages.
 * @param {string} text
 * @returns {string}
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Formats a JavaScript Date using the configured date format.
 * @param {Date} date
 * @returns {string} e.g. "04-Jul-2026"
 */
function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), CONFIG.DATE_FORMAT);
}

/**
 * Formats a JavaScript Date to the day-of-week name.
 * @param {Date} date
 * @returns {string} e.g. "Friday"
 */
function formatDay(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), CONFIG.DAY_FORMAT);
}

/**
 * Builds a standard JSON success response with CORS headers.
 * @param {Object} data — The payload to return.
 * @returns {TextOutput}
 */
function jsonResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Builds a standard JSON error response.
 * @param {string} message — Human-readable error description.
 * @returns {TextOutput}
 */
function jsonError(message) {
  return jsonResponse({ success: false, error: message });
}

/**
 * Retrieves the master spreadsheet, creating it if necessary.
 * The spreadsheet ID is persisted in Script Properties.
 * @returns {Spreadsheet}
 */
function getMasterSheet() {
  const props = PropertiesService.getScriptProperties();
  let sheetId = props.getProperty('MASTER_SHEET_ID');

  if (sheetId) {
    try {
      return SpreadsheetApp.openById(sheetId);
    } catch (e) {
      // Sheet was deleted or inaccessible — recreate
      Logger.log('Stored sheet ID invalid, will create a new one: ' + e.message);
    }
  }

  // Create new spreadsheet
  return initializeSheet();
}

/**
 * Returns today's date at midnight (local timezone).
 * @returns {Date}
 */
function getToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}


// ═══════════════════════════════════════════════════════════════════════════════
// §3 — SHEET INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates the master Google Sheet with proper tabs, headers, formatting,
 * column widths, and conditional formatting rules.
 *
 * Tabs created:
 *   📊 Daily Data  — daily habit entries
 *   🏆 Rewards Log — earned rewards
 *
 * @returns {Spreadsheet} The newly created (or existing) spreadsheet.
 */
function initializeSheet() {
  const props = PropertiesService.getScriptProperties();

  // ── Create Spreadsheet ──────────────────────────────────────────────────
  const ss = SpreadsheetApp.create(CONFIG.SHEET_NAME);
  const ssId = ss.getId();
  props.setProperty('MASTER_SHEET_ID', ssId);
  Logger.log('✅ Created master sheet: ' + ssId);

  // ── 📊 Daily Data Tab ──────────────────────────────────────────────────
  const dailySheet = ss.getActiveSheet(); // first default sheet
  dailySheet.setName(CONFIG.TAB_DAILY);

  const dailyHeaders = [
    '📅 Date',
    '🗓️ Day',
    '⏰ Wake Up',
    '🌙 Sleep Time',
    '😴 Hours Slept',
    '💧 Water (L)',
    '📖 Reading (min)',
    '🚶 Walking (min)',
    '✅ Todo Status',
    '📝 Todo Notes',
    '📋 Tomorrow\'s Todo',
    '🏅 Daily Score'
  ];

  // Write headers
  const headerRange = dailySheet.getRange(1, 1, 1, dailyHeaders.length);
  headerRange.setValues([dailyHeaders]);

  // Style headers
  headerRange
    .setBackground('#1a73e8')    // Google blue
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  // Set row height for header
  dailySheet.setRowHeight(1, 40);

  // Freeze header row
  dailySheet.setFrozenRows(1);

  // Column widths (px)
  const dailyWidths = [120, 100, 100, 110, 110, 100, 120, 120, 110, 200, 200, 110];
  dailyWidths.forEach((w, i) => dailySheet.setColumnWidth(i + 1, w));

  // ── Conditional Formatting for Daily Score (Column L = 12) ─────────
  const scoreColumn = dailySheet.getRange('L2:L1000');

  // Score >= 70 → green background
  const ruleGreen = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThanOrEqualTo(70)
    .setBackground('#c6efce')
    .setFontColor('#006100')
    .setRanges([scoreColumn])
    .build();

  // Score 40–69 → yellow background
  const ruleYellow = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(40, 69)
    .setBackground('#ffeb9c')
    .setFontColor('#9c6500')
    .setRanges([scoreColumn])
    .build();

  // Score < 40 → red background
  const ruleRed = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(40)
    .setBackground('#ffc7ce')
    .setFontColor('#9c0006')
    .setRanges([scoreColumn])
    .build();

  dailySheet.setConditionalFormatRules([ruleGreen, ruleYellow, ruleRed]);

  // ── 🏆 Rewards Log Tab ─────────────────────────────────────────────────
  const rewardsSheet = ss.insertSheet(CONFIG.TAB_REWARDS);

  const rewardHeaders = [
    '📅 Date',
    '🎁 Reward Type',
    '🏷️ Reward Name',
    '🔥 Streak Days',
    '📝 Notes'
  ];

  const rewardHeaderRange = rewardsSheet.getRange(1, 1, 1, rewardHeaders.length);
  rewardHeaderRange.setValues([rewardHeaders]);

  // Style headers
  rewardHeaderRange
    .setBackground('#f9ab00')    // Amber / gold
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);

  rewardsSheet.setRowHeight(1, 40);
  rewardsSheet.setFrozenRows(1);

  const rewardWidths = [120, 140, 180, 110, 250];
  rewardWidths.forEach((w, i) => rewardsSheet.setColumnWidth(i + 1, w));

  Logger.log('✅ Sheet initialised with tabs: ' + CONFIG.TAB_DAILY + ', ' + CONFIG.TAB_REWARDS);
  return ss;
}


// ═══════════════════════════════════════════════════════════════════════════════
// §4 — SCORING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculates the daily habit score out of 100.
 *
 * Breakdown:
 *   Wake Up      — 15 pts  (5:30–6:00 AM = 15, 6:00–6:30 AM = 8)
 *   Sleep Time   — 15 pts  (10:30–11:00 PM = 15, 11:00–11:30 PM = 8)
 *   Hours Slept  — 20 pts  (6–8 h = 20, 5–6 or 8–9 h = 10)
 *   Water        — 15 pts  (≥2 L = 15, ≥1.5 L = 8)
 *   Reading      — 15 pts  (≥20 min = 15, ≥10 min = 8)
 *   Walking      — 10 pts  (≥25 min = 10, ≥15 min = 5)
 *   Todo         — 10 pts  (completed = 10, partial = 5, N/A = 10)
 *
 * @param {Object} data — Object with keys matching habit fields.
 * @returns {number} Score (0–100).
 */
function calculateDailyScore(data) {
  let score = 0;

  // ── Wake Up (15 pts) ───────────────────────────────────────────────────
  // Expected format: "HH:mm" (24-hour) e.g. "05:45"
  const wakeUp = parseTimeToMinutes(data.wakeUp);
  if (wakeUp !== null) {
    if (wakeUp >= 330 && wakeUp <= 360) {        // 5:30 – 6:00 AM
      score += 15;
    } else if (wakeUp > 360 && wakeUp <= 390) {  // 6:00 – 6:30 AM
      score += 8;
    }
  }

  // ── Sleep Time (15 pts) ────────────────────────────────────────────────
  // Expected format: "HH:mm" (24-hour) e.g. "22:45"
  const sleepTime = parseTimeToMinutes(data.sleepTime);
  if (sleepTime !== null) {
    if (sleepTime >= 1350 && sleepTime <= 1380) {      // 10:30 – 11:00 PM
      score += 15;
    } else if (sleepTime > 1380 && sleepTime <= 1410) { // 11:00 – 11:30 PM
      score += 8;
    }
  }

  // ── Hours Slept (20 pts) ───────────────────────────────────────────────
  const hoursSlept = parseFloat(data.hoursSlept) || 0;
  if (hoursSlept >= 6 && hoursSlept <= 8) {
    score += 20;
  } else if ((hoursSlept >= 5 && hoursSlept < 6) || (hoursSlept > 8 && hoursSlept <= 9)) {
    score += 10;
  }

  // ── Water (15 pts) ────────────────────────────────────────────────────
  const water = parseFloat(data.water) || 0;
  if (water >= 2) {
    score += 15;
  } else if (water >= 1.5) {
    score += 8;
  }

  // ── Reading (15 pts) ──────────────────────────────────────────────────
  const reading = parseFloat(data.reading) || 0;
  if (reading >= 20) {
    score += 15;
  } else if (reading >= 10) {
    score += 8;
  }

  // ── Walking (10 pts) ──────────────────────────────────────────────────
  const walking = parseFloat(data.walking) || 0;
  if (walking >= 25) {
    score += 10;
  } else if (walking >= 15) {
    score += 5;
  }

  // ── Todo Status (10 pts) ──────────────────────────────────────────────
  const todoStatus = String(data.todoStatus || '').toLowerCase().trim();
  if (todoStatus === 'completed') {
    score += 10;
  } else if (todoStatus === 'partial') {
    score += 5;
  } else if (todoStatus === 'n/a' || todoStatus === 'na') {
    score += 10; // No todo was set, so full marks
  }
  // "not completed" or anything else → 0

  return score;
}

/**
 * Converts a time string "HH:mm" to total minutes since midnight.
 * @param {string} timeStr — e.g. "05:45" or "22:30"
 * @returns {number|null} Minutes since midnight, or null if unparseable.
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = String(timeStr).trim().split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(mins)) return null;
  return hours * 60 + mins;
}


// ═══════════════════════════════════════════════════════════════════════════════
// §5 — STREAK CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculates streak statistics from the Daily Data sheet.
 *
 * A "streak day" is any day with a Daily Score >= CONFIG.STREAK_THRESHOLD (70).
 *
 * Returns:
 *   currentStreak   — consecutive qualifying days counting back from today
 *   bestStreak      — longest-ever consecutive qualifying run
 *   totalDaysTracked — total number of rows in the Daily Data tab
 *
 * @returns {Object} { currentStreak, bestStreak, totalDaysTracked }
 */
function calculateStreaks() {
  const ss = getMasterSheet();
  const sheet = ss.getSheetByName(CONFIG.TAB_DAILY);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    // No data rows
    return { currentStreak: 0, bestStreak: 0, totalDaysTracked: 0 };
  }

  const totalDaysTracked = lastRow - 1; // exclude header

  // Grab Date (col 1) and Score (col 12) for all data rows
  const dateValues = sheet.getRange(2, 1, totalDaysTracked, 1).getValues();   // [[date], ...]
  const scoreValues = sheet.getRange(2, 12, totalDaysTracked, 1).getValues(); // [[score], ...]

  // Build an array of { date, score } sorted newest-first
  const entries = [];
  for (let i = 0; i < totalDaysTracked; i++) {
    const d = parseDate(String(dateValues[i][0]));
    const s = parseFloat(scoreValues[i][0]) || 0;
    if (d) entries.push({ date: d, score: s });
  }
  entries.sort((a, b) => b.date - a.date); // newest first

  // ── Current Streak (from today going backwards) ────────────────────────
  let currentStreak = 0;
  const todayStr = formatDate(getToday());

  for (let i = 0; i < entries.length; i++) {
    const entryDateStr = formatDate(entries[i].date);

    // For the first entry, it must be today or yesterday to start counting
    if (i === 0) {
      const diffDays = Math.round((getToday() - entries[i].date) / 86400000);
      if (diffDays > 1) break; // gap — no current streak
    } else {
      // Check consecutive days (previous entry should be exactly 1 day later)
      const diffDays = Math.round((entries[i - 1].date - entries[i].date) / 86400000);
      if (diffDays !== 1) break; // gap in dates
    }

    if (entries[i].score >= CONFIG.STREAK_THRESHOLD) {
      currentStreak++;
    } else {
      break; // streak broken by low score
    }
  }

  // ── Best Streak (longest ever) ─────────────────────────────────────────
  // Sort oldest-first for this calculation
  const chronological = entries.slice().sort((a, b) => a.date - b.date);
  let bestStreak = 0;
  let runningStreak = 0;

  for (let i = 0; i < chronological.length; i++) {
    if (chronological[i].score >= CONFIG.STREAK_THRESHOLD) {
      // Check continuity with previous entry
      if (i === 0) {
        runningStreak = 1;
      } else {
        const diffDays = Math.round((chronological[i].date - chronological[i - 1].date) / 86400000);
        if (diffDays === 1) {
          runningStreak++;
        } else {
          runningStreak = 1; // reset — gap in dates
        }
      }
    } else {
      runningStreak = 0;
    }
    if (runningStreak > bestStreak) bestStreak = runningStreak;
  }

  return { currentStreak, bestStreak, totalDaysTracked };
}


// ═══════════════════════════════════════════════════════════════════════════════
// §6 — doGet — REST API (GET REQUESTS)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handles all GET requests to the web app.
 *
 * Supported actions (via ?action= query parameter):
 *   init             — Creates the master sheet if needed; returns sheet ID
 *   getHistory       — Returns last N days of daily data (?days=30)
 *   getToday         — Returns today's entry or null
 *   getYesterdayTodo — Returns yesterday's "Tomorrow's Todo" text
 *   getStreaks        — Returns streak statistics
 *   getRewards       — Returns all rewards from the Rewards Log
 *
 * @param {Object} e — Event object from Apps Script runtime.
 * @returns {TextOutput} JSON response.
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

    switch (action) {

      // ── INIT ────────────────────────────────────────────────────────────
      case 'init':
        return handleInit();

      // ── GET HISTORY ─────────────────────────────────────────────────────
      case 'getHistory':
        return handleGetHistory(e);

      // ── GET TODAY ───────────────────────────────────────────────────────
      case 'getToday':
        return handleGetToday();

      // ── GET YESTERDAY'S TODO ────────────────────────────────────────────
      case 'getYesterdayTodo':
        return handleGetYesterdayTodo();

      // ── GET STREAKS ─────────────────────────────────────────────────────
      case 'getStreaks':
        return handleGetStreaks();

      // ── GET REWARDS ─────────────────────────────────────────────────────
      case 'getRewards':
        return handleGetRewards();

      // ── UNKNOWN ─────────────────────────────────────────────────────────
      default:
        return jsonError('Unknown action: ' + action + '. Valid GET actions: init, getHistory, getToday, getYesterdayTodo, getStreaks, getRewards');
    }

  } catch (err) {
    Logger.log('❌ doGet error: ' + err.message);
    return jsonError('Server error: ' + err.message);
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// §7 — doPost — REST API (POST REQUESTS)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handles all POST requests to the web app.
 *
 * Expects JSON body with an "action" field:
 *   submitDaily — Saves today's habit data and returns saved row + score
 *   logReward   — Logs a reward to the Rewards Log tab
 *
 * @param {Object} e — Event object with e.postData.contents as JSON string.
 * @returns {TextOutput} JSON response.
 */
function doPost(e) {
  try {
    // Parse JSON payload
    if (!e || !e.postData || !e.postData.contents) {
      return jsonError('No POST data received.');
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || '';

    switch (action) {

      // ── SUBMIT DAILY ────────────────────────────────────────────────────
      case 'submitDaily':
        return handleSubmitDaily(payload);

      // ── LOG REWARD ──────────────────────────────────────────────────────
      case 'logReward':
        return handleLogReward(payload);

      // ── UNKNOWN ─────────────────────────────────────────────────────────
      default:
        return jsonError('Unknown POST action: ' + action + '. Valid POST actions: submitDaily, logReward');
    }

  } catch (err) {
    Logger.log('❌ doPost error: ' + err.message);
    return jsonError('Server error: ' + err.message);
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// §8 — GET ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ?action=init
 * Creates the master sheet if it doesn't exist and returns its ID.
 */
function handleInit() {
  const ss = getMasterSheet();
  return jsonResponse({
    success: true,
    sheetId: ss.getId(),
    sheetUrl: ss.getUrl(),
    message: 'Master sheet is ready.'
  });
}

/**
 * ?action=getHistory&days=30
 * Returns the last N days of daily data as a JSON array.
 * Defaults to 30 days if the parameter is omitted.
 */
function handleGetHistory(e) {
  const days = parseInt((e.parameter && e.parameter.days) || '30', 10);
  const ss = getMasterSheet();
  const sheet = ss.getSheetByName(CONFIG.TAB_DAILY);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return jsonResponse({ success: true, data: [], message: 'No data yet.' });
  }

  const totalRows = lastRow - 1;
  // Determine how many rows to return (most recent N days)
  const rowsToFetch = Math.min(days, totalRows);
  const startRow = lastRow - rowsToFetch + 1;

  const values = sheet.getRange(startRow, 1, rowsToFetch, 12).getValues();

  const history = values.map(function(row) {
    return {
      date: String(row[0]),
      day: String(row[1]),
      wakeUp: String(row[2]),
      sleepTime: String(row[3]),
      hoursSlept: row[4],
      water: row[5],
      reading: row[6],
      walking: row[7],
      todoStatus: String(row[8]),
      todoNotes: String(row[9]),
      tomorrowTodo: String(row[10]),
      dailyScore: row[11]
    };
  });

  // Return newest first
  history.reverse();

  return jsonResponse({ success: true, data: history, count: history.length });
}

/**
 * ?action=getToday
 * Checks if today's entry exists. Returns it or null.
 */
function handleGetToday() {
  const todayStr = formatDate(getToday());
  const ss = getMasterSheet();
  const sheet = ss.getSheetByName(CONFIG.TAB_DAILY);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return jsonResponse({ success: true, data: null, message: 'No entries yet.' });
  }

  // Search from the bottom (most recent) for efficiency
  const dateCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = dateCol.length - 1; i >= 0; i--) {
    if (String(dateCol[i][0]) === todayStr) {
      const row = sheet.getRange(i + 2, 1, 1, 12).getValues()[0];
      return jsonResponse({
        success: true,
        data: {
          date: String(row[0]),
          day: String(row[1]),
          wakeUp: String(row[2]),
          sleepTime: String(row[3]),
          hoursSlept: row[4],
          water: row[5],
          reading: row[6],
          walking: row[7],
          todoStatus: String(row[8]),
          todoNotes: String(row[9]),
          tomorrowTodo: String(row[10]),
          dailyScore: row[11]
        },
        message: 'Today\'s entry found.'
      });
    }
  }

  return jsonResponse({ success: true, data: null, message: 'No entry for today yet.' });
}

/**
 * ?action=getYesterdayTodo
 * Returns yesterday's "Tomorrow's Todo" text so the frontend can pre-fill it.
 */
function handleGetYesterdayTodo() {
  const yesterday = new Date(getToday());
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  const ss = getMasterSheet();
  const sheet = ss.getSheetByName(CONFIG.TAB_DAILY);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return jsonResponse({ success: true, todo: '', message: 'No previous entries.' });
  }

  const dateCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = dateCol.length - 1; i >= 0; i--) {
    if (String(dateCol[i][0]) === yesterdayStr) {
      const todoCell = sheet.getRange(i + 2, 11).getValue(); // Column K = Tomorrow's Todo
      return jsonResponse({
        success: true,
        todo: String(todoCell || ''),
        message: 'Yesterday\'s todo retrieved.'
      });
    }
  }

  return jsonResponse({ success: true, todo: '', message: 'No entry found for yesterday.' });
}

/**
 * ?action=getStreaks
 * Returns streak statistics.
 */
function handleGetStreaks() {
  const streaks = calculateStreaks();
  return jsonResponse({
    success: true,
    data: streaks
  });
}

/**
 * ?action=getRewards
 * Returns all earned rewards from the Rewards Log tab.
 */
function handleGetRewards() {
  const ss = getMasterSheet();
  const sheet = ss.getSheetByName(CONFIG.TAB_REWARDS);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return jsonResponse({ success: true, data: [], message: 'No rewards yet.' });
  }

  const totalRows = lastRow - 1;
  const values = sheet.getRange(2, 1, totalRows, 5).getValues();

  const rewards = values.map(function(row) {
    return {
      date: String(row[0]),
      rewardType: String(row[1]),
      rewardName: String(row[2]),
      streakDays: row[3],
      notes: String(row[4])
    };
  });

  // Return newest first
  rewards.reverse();

  return jsonResponse({ success: true, data: rewards, count: rewards.length });
}


// ═══════════════════════════════════════════════════════════════════════════════
// §9 — POST ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * action: 'submitDaily'
 * Submits today's habit data to the Daily Data sheet.
 *
 * Expected payload fields:
 *   wakeUp       — "HH:mm" (24h) e.g. "05:45"
 *   sleepTime    — "HH:mm" (24h) e.g. "22:30"
 *   hoursSlept   — number e.g. 7
 *   water        — number (litres) e.g. 2.5
 *   reading      — number (minutes) e.g. 30
 *   walking      — number (minutes) e.g. 25
 *   todoStatus   — "completed" | "partial" | "not completed" | "n/a"
 *   todoNotes    — string (optional)
 *   tomorrowTodo — string (optional)
 *
 * If today's row already exists, it is updated (overwritten).
 * Otherwise a new row is appended.
 */
function handleSubmitDaily(payload) {
  const ss = getMasterSheet();
  const sheet = ss.getSheetByName(CONFIG.TAB_DAILY);
  const today = getToday();
  const todayStr = formatDate(today);
  const dayStr = formatDay(today);

  // Calculate the daily score
  const score = calculateDailyScore(payload);

  // Build the row data
  const rowData = [
    todayStr,
    dayStr,
    payload.wakeUp || '',
    payload.sleepTime || '',
    parseFloat(payload.hoursSlept) || 0,
    parseFloat(payload.water) || 0,
    parseFloat(payload.reading) || 0,
    parseFloat(payload.walking) || 0,
    payload.todoStatus || '',
    payload.todoNotes || '',
    payload.tomorrowTodo || '',
    score
  ];

  // Check if today's entry already exists (update vs append)
  const lastRow = sheet.getLastRow();
  let existingRow = -1;

  if (lastRow > 1) {
    const dateCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = dateCol.length - 1; i >= 0; i--) {
      if (String(dateCol[i][0]) === todayStr) {
        existingRow = i + 2; // 1-indexed, +1 for header
        break;
      }
    }
  }

  if (existingRow > 0) {
    // Update existing row
    sheet.getRange(existingRow, 1, 1, 12).setValues([rowData]);
    Logger.log('✏️ Updated existing entry for ' + todayStr);
  } else {
    // Append new row
    sheet.appendRow(rowData);
    Logger.log('➕ Appended new entry for ' + todayStr);
  }

  // Return the saved data
  return jsonResponse({
    success: true,
    data: {
      date: todayStr,
      day: dayStr,
      wakeUp: payload.wakeUp || '',
      sleepTime: payload.sleepTime || '',
      hoursSlept: parseFloat(payload.hoursSlept) || 0,
      water: parseFloat(payload.water) || 0,
      reading: parseFloat(payload.reading) || 0,
      walking: parseFloat(payload.walking) || 0,
      todoStatus: payload.todoStatus || '',
      todoNotes: payload.todoNotes || '',
      tomorrowTodo: payload.tomorrowTodo || '',
      dailyScore: score
    },
    isUpdate: existingRow > 0,
    message: existingRow > 0 ? 'Today\'s entry updated.' : 'Today\'s entry saved.'
  });
}

/**
 * action: 'logReward'
 * Logs a reward to the Rewards Log tab.
 *
 * Expected payload fields:
 *   rewardType — string e.g. "🎬 Movie Night"
 *   rewardName — string e.g. "Watch Interstellar"
 *   streakDays — number e.g. 7
 *   notes      — string (optional)
 */
function handleLogReward(payload) {
  const ss = getMasterSheet();
  const sheet = ss.getSheetByName(CONFIG.TAB_REWARDS);
  const todayStr = formatDate(getToday());

  const rowData = [
    todayStr,
    payload.rewardType || '',
    payload.rewardName || '',
    parseInt(payload.streakDays, 10) || 0,
    payload.notes || ''
  ];

  sheet.appendRow(rowData);
  Logger.log('🎉 Reward logged: ' + payload.rewardName);

  return jsonResponse({
    success: true,
    data: {
      date: todayStr,
      rewardType: payload.rewardType || '',
      rewardName: payload.rewardName || '',
      streakDays: parseInt(payload.streakDays, 10) || 0,
      notes: payload.notes || ''
    },
    message: 'Reward logged successfully.'
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// §10 — TELEGRAM INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sends a message to the configured Telegram chat via the Bot API.
 * Uses MarkdownV2 formatting.
 *
 * @param {string} text — The message text (MarkdownV2 formatted).
 * @returns {Object} Telegram API response.
 */
function sendTelegramMessage(text) {
  const url = 'https://api.telegram.org/bot' + CONFIG.TELEGRAM_BOT_TOKEN + '/sendMessage';

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: CONFIG.TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: 'MarkdownV2'
    }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}

/**
 * Sends the web app URL to Telegram so the user can quickly open
 * the Habit Tracker form from their phone.
 *
 * This replaces the older approach of sending a Google Form link.
 */
function sendFormToTelegram() {
  const webAppUrl = CONFIG.WEB_APP_URL;

  const message =
    '🧭 *Habit Tracker v2*\n\n' +
    '📝 Time to log your daily habits\\!\n\n' +
    '👉 [Open Habit Tracker](' + escapeMarkdown(webAppUrl) + ')\n\n' +
    '_Track today, build tomorrow\\._';

  const result = sendTelegramMessage(message);

  if (result.ok) {
    Logger.log('✅ Telegram message sent successfully.');
  } else {
    Logger.log('❌ Telegram error: ' + JSON.stringify(result));
  }

  return result;
}

/**
 * Sets up a time-based trigger to send a daily reminder at 6:30 AM.
 *
 * Run this function ONCE manually from the Apps Script editor.
 * It will create a daily trigger that fires setupDailyReminder() every morning.
 *
 * To avoid duplicates, it first removes any existing triggers for
 * setupDailyReminder before creating a new one.
 */
function setupTelegramTrigger() {
  // Remove existing triggers for this function to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'setupDailyReminder') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('🗑️ Removed existing trigger for setupDailyReminder.');
    }
  });

  // Create new daily trigger at 6:30 AM
  ScriptApp.newTrigger('setupDailyReminder')
    .timeBased()
    .atHour(6)
    .nearMinute(30)
    .everyDays(1)
    .create();

  Logger.log('✅ Daily Telegram trigger set for ~6:30 AM.');
}

/**
 * Morning reminder function — called by the daily trigger.
 *
 * Sends a Telegram notification with:
 *   - A greeting based on the day of the week
 *   - Yesterday's streak info (if available)
 *   - A link to the web app
 */
function setupDailyReminder() {
  const today = getToday();
  const dayName = formatDay(today);

  // Get current streak for motivational context
  let streakInfo = '';
  try {
    const streaks = calculateStreaks();
    if (streaks.currentStreak > 0) {
      streakInfo = '\n🔥 Current streak: *' + escapeMarkdown(String(streaks.currentStreak)) + ' days*\\!';
    }
  } catch (e) {
    Logger.log('Could not calculate streaks for reminder: ' + e.message);
  }

  // Get yesterday's todo if available
  let todoReminder = '';
  try {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const ss = getMasterSheet();
    const sheet = ss.getSheetByName(CONFIG.TAB_DAILY);
    const lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      const dateCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = dateCol.length - 1; i >= 0; i--) {
        if (String(dateCol[i][0]) === yesterdayStr) {
          const todo = sheet.getRange(i + 2, 11).getValue();
          if (todo) {
            todoReminder = '\n\n📋 *Today\u0027s planned todo:*\n' + escapeMarkdown(String(todo));
          }
          break;
        }
      }
    }
  } catch (e) {
    Logger.log('Could not fetch yesterday\'s todo: ' + e.message);
  }

  const message =
    '☀️ *Good Morning\\!*\n' +
    '📅 ' + escapeMarkdown(dayName) + ', ' + escapeMarkdown(formatDate(today)) + '\n' +
    streakInfo +
    todoReminder +
    '\n\n📝 Don\u0027t forget to log your habits today\\!\n' +
    '👉 [Open Habit Tracker](' + escapeMarkdown(CONFIG.WEB_APP_URL) + ')';

  sendTelegramMessage(message);
  Logger.log('📬 Daily reminder sent for ' + formatDate(today));
}


// ═══════════════════════════════════════════════════════════════════════════════
// §11 — UTILITY / TESTING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick test function — run from the Apps Script editor to verify
 * that sheet creation and scoring work correctly.
 */
function testScoring() {
  const testData = {
    wakeUp: '05:45',
    sleepTime: '22:45',
    hoursSlept: 7,
    water: 2.5,
    reading: 25,
    walking: 30,
    todoStatus: 'completed'
  };

  const score = calculateDailyScore(testData);
  Logger.log('🧪 Test score (expect 100): ' + score);

  const testData2 = {
    wakeUp: '06:15',
    sleepTime: '23:15',
    hoursSlept: 5.5,
    water: 1.5,
    reading: 15,
    walking: 20,
    todoStatus: 'partial'
  };

  const score2 = calculateDailyScore(testData2);
  Logger.log('🧪 Test score 2 (expect 47): ' + score2);

  const testData3 = {
    wakeUp: '07:00',
    sleepTime: '01:00',
    hoursSlept: 4,
    water: 1,
    reading: 5,
    walking: 10,
    todoStatus: 'not completed'
  };

  const score3 = calculateDailyScore(testData3);
  Logger.log('🧪 Test score 3 (expect 0): ' + score3);
}

/**
 * Manually test the init flow — run from the script editor.
 */
function testInit() {
  const ss = initializeSheet();
  Logger.log('📋 Sheet created: ' + ss.getUrl());
}
