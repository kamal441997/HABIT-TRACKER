// ============================================================
// 💾 HABIT TRACKER v2 — LOCAL STORAGE LAYER
// ============================================================
// Provides offline caching for fast loads & offline access.
// Data is always synced to Google Sheets as the source of truth.
// ============================================================

const Storage = (() => {
  const PREFIX = 'ht2_';

  // ─── Core Storage Methods ───

  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage: Failed to save', key, e);
    }
  }

  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Storage: Failed to read', key, e);
      return fallback;
    }
  }

  function remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  function clear() {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
  }

  // ─── History Cache ───

  function cacheHistory(data) {
    set('history', data);
    set('history_updated', Date.now());
  }

  function getCachedHistory() {
    return get('history', []);
  }

  function isHistoryCacheStale(maxAgeMs = 5 * 60 * 1000) {
    const updated = get('history_updated', 0);
    return Date.now() - updated > maxAgeMs;
  }

  // ─── Today's Entry ───

  function saveTodayEntry(entry) {
    const dateKey = new Date().toISOString().split('T')[0];
    set('today_' + dateKey, entry);
  }

  function getTodayEntry() {
    const dateKey = new Date().toISOString().split('T')[0];
    return get('today_' + dateKey, null);
  }

  function hasTodayEntry() {
    return getTodayEntry() !== null;
  }

  // ─── Yesterday's Todo ───

  function saveYesterdayTodo(todo) {
    set('yesterday_todo', todo);
  }

  function getYesterdayTodo() {
    return get('yesterday_todo', '');
  }

  // ─── Streak Data ───

  function saveStreakData(data) {
    set('streaks', data);
  }

  function getStreakData() {
    return get('streaks', {
      currentStreak: 0,
      bestStreak: 0,
      totalDays: 0,
    });
  }

  // ─── Rewards Data ───

  function saveRewards(rewards) {
    set('rewards', rewards);
  }

  function getRewards() {
    return get('rewards', []);
  }

  function saveEarnedBadges(badges) {
    set('badges', badges);
  }

  function getEarnedBadges() {
    return get('badges', []);
  }

  // ─── XP & Level ───

  function saveXP(xp) {
    set('xp', xp);
  }

  function getXP() {
    return get('xp', 0);
  }

  function addXP(points) {
    const current = getXP();
    const newXP = current + points;
    saveXP(newXP);
    return newXP;
  }

  // ─── Settings ───

  function saveSetting(key, value) {
    set('setting_' + key, value);
  }

  function getSetting(key, fallback) {
    return get('setting_' + key, fallback);
  }

  // ─── Pending Submissions (offline queue) ───

  function addPendingSubmission(entry) {
    const pending = get('pending', []);
    pending.push({ ...entry, timestamp: Date.now() });
    set('pending', pending);
  }

  function getPendingSubmissions() {
    return get('pending', []);
  }

  function clearPendingSubmissions() {
    set('pending', []);
  }

  // ─── New Reward Notifications ───

  function addNewRewardNotification(reward) {
    const notifications = get('reward_notifications', []);
    notifications.push({ ...reward, seen: false, timestamp: Date.now() });
    set('reward_notifications', notifications);
  }

  function getUnseenRewardNotifications() {
    const notifications = get('reward_notifications', []);
    return notifications.filter((n) => !n.seen);
  }

  function markRewardNotificationsSeen() {
    const notifications = get('reward_notifications', []);
    notifications.forEach((n) => (n.seen = true));
    set('reward_notifications', notifications);
  }

  // ─── Public API ───

  return {
    set,
    get,
    remove,
    clear,
    cacheHistory,
    getCachedHistory,
    isHistoryCacheStale,
    saveTodayEntry,
    getTodayEntry,
    hasTodayEntry,
    saveYesterdayTodo,
    getYesterdayTodo,
    saveStreakData,
    getStreakData,
    saveRewards,
    getRewards,
    saveEarnedBadges,
    getEarnedBadges,
    saveXP,
    getXP,
    addXP,
    saveSetting,
    getSetting,
    addPendingSubmission,
    getPendingSubmissions,
    clearPendingSubmissions,
    addNewRewardNotification,
    getUnseenRewardNotifications,
    markRewardNotificationsSeen,
  };
})();
