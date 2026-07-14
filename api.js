// ============================================================
// 🌐 HABIT TRACKER v2 — API LAYER
// ============================================================
// Communicates with Google Apps Script Web App backend.
// All methods return Promises. Falls back to cache on failure.
// ============================================================

const API = (() => {
  function getBaseUrl() {
    return CONFIG.API_URL;
  }

  function isConfigured() {
    return CONFIG.API_URL && CONFIG.API_URL !== 'YOUR_APPS_SCRIPT_WEB_APP_URL';
  }

  // ─── GET Request ───

  async function get(action, params = {}) {
    if (!isConfigured()) {
      console.warn('API: Not configured. Using demo/cached data.');
      return null;
    }

    const url = new URL(getBaseUrl());
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
      });
      const data = await response.json();
      if (data.success === false) {
        throw new Error(data.error || 'API error');
      }
      return data;
    } catch (error) {
      console.error('API GET error:', action, error);
      throw error;
    }
  }

  // ─── POST Request ───

  async function post(action, payload = {}) {
    if (!isConfigured()) {
      console.warn('API: Not configured. Saving to local storage only.');
      return null;
    }

    try {
      const response = await fetch(getBaseUrl(), {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await response.json();
      if (data.success === false) {
        throw new Error(data.error || 'API error');
      }
      return data;
    } catch (error) {
      console.error('API POST error:', action, error);
      throw error;
    }
  }

  // ─── API Methods ───

  async function initSheet() {
    return await get('init');
  }

  async function getHistory(days = 30) {
    try {
      const response = await get('getHistory', { days: days.toString() });
      if (response && response.data) {
        // Map backend keys to frontend keys
        const history = response.data.map(row => ({
          date: row.date,
          day: row.day,
          wake_up: row.wakeUp,
          sleep_time: row.sleepTime,
          sleep_hours: row.hoursSlept,
          water: row.water,
          reading: row.reading,
          walking: row.walking,
          todo_status: row.todoStatus,
          todo_notes: row.todoNotes,
          tomorrow_todo: row.tomorrowTodo,
          score: row.dailyScore
        }));
        Storage.cacheHistory(history);
        return history;
      }
    } catch (e) {
      console.log('API: Falling back to cached history');
    }
    return Storage.getCachedHistory();
  }

  async function getToday() {
    try {
      const response = await get('getToday');
      if (response && response.data) {
        const row = response.data;
        return {
          date: row.date,
          day: row.day,
          wake_up: row.wakeUp,
          sleep_time: row.sleepTime,
          sleep_hours: row.hoursSlept,
          water: row.water,
          reading: row.reading,
          walking: row.walking,
          todo_status: row.todoStatus,
          todo_notes: row.todoNotes,
          tomorrow_todo: row.tomorrowTodo,
          score: row.dailyScore
        };
      }
      return null;
    } catch (e) {
      return Storage.getTodayEntry();
    }
  }

  async function getYesterdayTodo() {
    try {
      const response = await get('getYesterdayTodo');
      if (response && response.todo !== undefined) {
        Storage.saveYesterdayTodo(response.todo);
        return response.todo;
      }
    } catch (e) {
      console.log('API: Falling back to cached todo');
    }
    return Storage.getYesterdayTodo();
  }

  async function getStreaks() {
    try {
      const response = await get('getStreaks');
      if (response && response.data) {
        Storage.saveStreakData(response.data);
        return response.data;
      }
    } catch (e) {
      console.log('API: Falling back to cached streaks');
    }
    return Storage.getStreakData();
  }

  async function getRewardsLog() {
    try {
      const response = await get('getRewards');
      if (response && response.data) {
        Storage.saveRewards(response.data);
        return response.data;
      }
    } catch (e) {
      console.log('API: Falling back to cached rewards');
    }
    return Storage.getRewards();
  }

  async function submitDaily(entry) {
    // Always save locally first
    Storage.saveTodayEntry(entry);

    // Add XP based on score
    const newXP = Storage.addXP(entry.score || 0);

    // Map to backend keys
    const backendPayload = {
      wakeUp: entry.wake_up || '',
      sleepTime: entry.sleep_time || '',
      hoursSlept: entry.sleep_hours || 0,
      water: entry.water || 0,
      reading: entry.reading || 0,
      walking: entry.walking || 0,
      todoStatus: entry.todo_status || 'N/A',
      todoNotes: entry.todo_notes || '',
      tomorrowTodo: entry.tomorrow_todo || ''
    };

    try {
      const result = await post('submitDaily', backendPayload);
      if (result && result.success) {
        // Sync succeeded — clear any pending queue
        Storage.clearPendingSubmissions();
        return { ...result, xp: newXP, synced: true };
      }
    } catch (e) {
      // API failed — queue for later sync
      Storage.addPendingSubmission(entry);
      console.log('API: Submission queued for later sync');
    }

    return { success: true, xp: newXP, synced: false };
  }

  async function logReward(reward) {
    try {
      return await post('logReward', { reward });
    } catch (e) {
      console.log('API: Reward log failed, saved locally');
      return null;
    }
  }

  // ─── Sync pending submissions ───

  async function syncPending() {
    const pending = Storage.getPendingSubmissions();
    if (pending.length === 0 || !isConfigured()) return;

    console.log(`API: Syncing ${pending.length} pending submissions...`);
    let synced = 0;

    for (const entry of pending) {
      try {
        await post('submitDaily', { entry });
        synced++;
      } catch (e) {
        break; // Stop on first failure
      }
    }

    if (synced > 0) {
      const remaining = pending.slice(synced);
      Storage.clearPendingSubmissions();
      remaining.forEach((e) => Storage.addPendingSubmission(e));
      console.log(`API: Synced ${synced}/${pending.length} entries`);
    }
  }

  // ─── Calculate score locally ───

  function calculateScore(values) {
    let score = 0;

    HABITS.forEach((habit) => {
      const val = values[habit.id];
      if (val === undefined || val === null || val === '') return;

      if (checkTarget(habit, val)) {
        score += habit.points;
      } else if (habit.partialTarget && checkTarget({ target: habit.partialTarget }, val)) {
        score += habit.partialPoints || 0;
      }
    });

    // Todo points
    const todoStatus = values.todo_status;
    if (todoStatus) {
      const option = TODO_CONFIG.followUp.options.find((o) => o.value === todoStatus);
      if (option) score += option.points;
    } else {
      // No todo was set = no penalty
      score += TODO_CONFIG.followUp.options[0].points;
    }

    return score;
  }

  function checkTarget(habit, value) {
    const t = habit.target;
    if (!t) return false;

    switch (t.type) {
      case 'min':
        return parseFloat(value) >= t.value;
      case 'max':
        return parseFloat(value) <= t.value;
      case 'range':
        const num = parseFloat(value);
        return num >= t.min && num <= t.max;
      case 'time-range':
        return isTimeInRange(value, t.start, t.end);
      case 'boolean':
        return value === true || value === 'true' || value === 'Yes';
      default:
        return false;
    }
  }

  function isTimeInRange(timeStr, start, end) {
    const minutes = parseTimeToMinutes(timeStr);
    if (minutes === null) return false;
    const startMin = parseTimeToMinutes(start);
    const endMin = parseTimeToMinutes(end);
    if (startMin === null || endMin === null) return false;
    return minutes >= startMin && minutes <= endMin;
  }

  function parseTimeToMinutes(timeStr) {
    if (!timeStr) return null;

    // Handle HH:MM format
    let match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }

    // Handle "5:45 AM" / "10:30 PM" format
    match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      let hours = parseInt(match[1]);
      const mins = parseInt(match[2]);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + mins;
    }

    // Handle "5:45AM" without space
    match = timeStr.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
    if (match) {
      let hours = parseInt(match[1]);
      const mins = parseInt(match[2]);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + mins;
    }

    return null;
  }

  // ─── Public API ───

  return {
    isConfigured,
    initSheet,
    getHistory,
    getToday,
    getYesterdayTodo,
    getStreaks,
    getRewardsLog,
    submitDaily,
    logReward,
    syncPending,
    calculateScore,
    checkTarget,
    parseTimeToMinutes,
  };
})();
