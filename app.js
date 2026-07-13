// ============================================================
// 🚀 HABIT TRACKER v2 — MAIN APPLICATION
// ============================================================
// Orchestrates all modules: loads data, initializes UI, routes.
// ============================================================

const App = (() => {
  let isInitialized = false;
  let historyData = [];
  let streakData = { currentStreak: 0, bestStreak: 0, totalDays: 0 };

  // ─── INITIALIZE ───

  async function init() {
    if (isInitialized) return;
    isInitialized = true;

    console.log('🧭 Habit Tracker v2 starting...');

    // Init particle background
    Animations.initParticles('particleCanvas');

    // Setup navigation
    setupNavigation();

    // Setup ripple effects
    setupRippleEffects();

    // Show API warning if not configured
    if (!API.isConfigured()) {
      showConfigWarning();
    }

    // Load data and render
    await loadData();

    // Sync any pending submissions
    API.syncPending();

    console.log('✅ Habit Tracker v2 initialized!');
  }

  // ─── LOAD DATA ───

  async function loadData() {
    // Show skeleton loading
    const checkinContainer = document.getElementById('checkinContent');
    const dashContainer = document.getElementById('dashboardContent');
    if (dashContainer) Animations.showSkeleton(dashContainer);

    try {
      // Load history
      historyData = await API.getHistory(90);

      // Calculate streaks
      streakData = Rewards.calculateStreaks(historyData);

      // Render streak banner
      const streakBanner = document.getElementById('streakBanner');
      if (streakBanner) {
        UI.renderStreakBanner(streakBanner, streakData, Storage.getXP());
      }

      // Check if today is already submitted
      const todayEntry = getTodayFromHistory(historyData);

      if (todayEntry) {
        // Already submitted
        if (checkinContainer) UI.renderAlreadySubmitted(checkinContainer, todayEntry);
      } else {
        // Show check-in form
        const yesterdayTodo = await API.getYesterdayTodo();
        if (checkinContainer) UI.renderCheckin(checkinContainer, yesterdayTodo);
      }

      // Render dashboard
      if (dashContainer) UI.renderDashboard(dashContainer, historyData, streakData);

      // Render rewards
      const rewardsContainer = document.getElementById('rewardsContent');
      if (rewardsContainer) UI.renderRewards(rewardsContainer, streakData);

      // Render history
      const historyContainer = document.getElementById('historyContent');
      if (historyContainer) UI.renderHistory(historyContainer, historyData);

      // Check for unseen reward notifications
      const unseen = Storage.getUnseenRewardNotifications();
      if (unseen.length > 0) {
        unseen.forEach((n) => {
          Animations.showToast(`${n.icon} ${n.name} reward earned!`, 'reward', 5000);
        });
        Storage.markRewardNotificationsSeen();
      }
    } catch (error) {
      console.error('Error loading data:', error);

      // Fallback to cached data
      historyData = Storage.getCachedHistory();
      streakData = Storage.getStreakData();

      // Still render with cached data
      const streakBanner = document.getElementById('streakBanner');
      if (streakBanner) UI.renderStreakBanner(streakBanner, streakData, Storage.getXP());

      const checkinContainer2 = document.getElementById('checkinContent');
      const yesterdayTodo = Storage.getYesterdayTodo();
      if (checkinContainer2) UI.renderCheckin(checkinContainer2, yesterdayTodo);
    }
  }

  // ─── HELPERS ───

  function getTodayFromHistory(history) {
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const todayStr = `${String(today.getDate()).padStart(2, '0')}-${months[today.getMonth()]}-${today.getFullYear()}`;

    return history.find((e) => e.date === todayStr) || null;
  }

  function setupNavigation() {
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const screen = tab.dataset.screen;
        if (screen) {
          UI.switchScreen(screen);

          // Refresh data when switching screens
          if (screen === 'dashboardScreen') {
            const dashContainer = document.getElementById('dashboardContent');
            if (dashContainer && historyData.length > 0) {
              UI.renderDashboard(dashContainer, historyData, streakData);
            }
          }
          if (screen === 'rewardsScreen') {
            const rewardsContainer = document.getElementById('rewardsContent');
            if (rewardsContainer) {
              UI.renderRewards(rewardsContainer, streakData);
            }
          }
        }
      });
    });
  }

  function setupRippleEffects() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (btn) {
        Animations.createRipple(e, btn);
      }
    });
  }

  function showConfigWarning() {
    const warning = document.getElementById('configWarning');
    if (warning) {
      warning.style.display = 'flex';
    }
  }

  // ─── REFRESH ───

  async function refresh() {
    historyData = await API.getHistory(90);
    streakData = Rewards.calculateStreaks(historyData);

    const streakBanner = document.getElementById('streakBanner');
    if (streakBanner) UI.renderStreakBanner(streakBanner, streakData, Storage.getXP());
  }

  // ─── Public API ───

  return {
    init,
    refresh,
    getData: () => ({ history: historyData, streaks: streakData }),
  };
})();

// ─── Auto-initialize on DOM ready ───
document.addEventListener('DOMContentLoaded', () => App.init());
