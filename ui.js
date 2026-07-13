// ============================================================
// 🖥️ HABIT TRACKER v2 — UI RENDERER
// ============================================================
// Renders all screens: Check-in, Dashboard, Rewards, History
// All rendering is config-driven from HABITS array.
// ============================================================

const UI = (() => {
  let currentQuestion = 0;
  let formValues = {};
  let todoStatus = null;
  let yesterdayTodo = '';

  // ─── NAVIGATION ───

  function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));

    const screen = document.getElementById(screenId);
    const tab = document.querySelector(`[data-screen="${screenId}"]`);

    if (screen) screen.classList.add('active');
    if (tab) tab.classList.add('active');
  }

  // ─── STREAK BANNER ───

  function renderStreakBanner(container, streakData, xp) {
    const level = getLevelFromXP(xp);
    const nextInfo = getNextLevel(xp);
    const progressPct = Math.round(nextInfo.progress * 100);

    const flames = '🔥'.repeat(Math.min(streakData.currentStreak, 15));

    container.innerHTML = `
      <div class="streak-info">
        <span class="streak-fire">${streakData.currentStreak > 0 ? '🔥' : '❄️'}</span>
        <div class="streak-text">
          <span class="streak-count">${streakData.currentStreak > 0 ? `Day ${streakData.currentStreak} Streak!` : 'No Active Streak'}</span>
          <span class="streak-label">${streakData.currentStreak > 0 ? 'Keep it going!' : 'Start today to build one!'}</span>
        </div>
      </div>
      <div class="xp-section">
        <div class="xp-info">
          <span class="xp-level">${level.icon} Level ${level.level} — ${level.name}</span>
          <span>${xp} XP${nextInfo.next ? ` / ${nextInfo.next.xpRequired}` : ''}</span>
        </div>
        <div class="xp-bar-track">
          <div class="xp-bar-fill" style="width: ${progressPct}%"></div>
        </div>
      </div>
    `;
  }

  // ─── CHECK-IN SCREEN ───

  function renderCheckin(container, yesterdayTodoText) {
    yesterdayTodo = yesterdayTodoText || '';
    currentQuestion = 0;
    formValues = {};
    todoStatus = null;

    let html = '';

    // Yesterday's todo follow-up
    if (yesterdayTodo) {
      html += `
        <div class="glass-card todo-followup anim-fade-in-up" id="todoFollowup">
          <h3 class="section-header"><span class="section-header-icon">📋</span> Yesterday's To-Do</h3>
          <div class="todo-task-text">"${yesterdayTodo}"</div>
          <div class="todo-options">
            ${TODO_CONFIG.followUp.options
              .map(
                (opt) => `
              <button class="todo-option" data-value="${opt.value}" onclick="UI.selectTodoOption('${opt.value}')">
                ${opt.icon} ${opt.label}
              </button>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    // Question card container
    html += `<div id="questionContainer"></div>`;

    // Progress dots & navigation
    html += `
      <div class="progress-dots" id="progressDots">
        ${HABITS.map((_, i) => `<span class="progress-dot ${i === 0 ? 'current' : ''}" data-index="${i}"></span>`).join('')}
        <span class="progress-dot" data-index="${HABITS.length}"></span>
      </div>
      <div class="question-nav">
        <span class="question-counter" id="questionCounter">Question 1 of ${HABITS.length + 1}</span>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ghost" id="prevBtn" onclick="UI.prevQuestion()" style="display:none;">← Back</button>
          <button class="btn btn-accent" id="nextBtn" onclick="UI.nextQuestion()">Next →</button>
        </div>
      </div>
    `;

    container.innerHTML = html;
    renderQuestion(0);
  }

  function renderQuestion(index) {
    const container = document.getElementById('questionContainer');
    if (!container) return;

    currentQuestion = index;

    // Update progress dots
    document.querySelectorAll('.progress-dot').forEach((dot, i) => {
      dot.classList.remove('filled', 'current');
      if (i < index) dot.classList.add('filled');
      if (i === index) dot.classList.add('current');
    });

    // Update counter
    const counter = document.getElementById('questionCounter');
    if (counter) counter.textContent = `Question ${index + 1} of ${HABITS.length + 1}`;

    // Update nav buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (prevBtn) prevBtn.style.display = index > 0 ? 'inline-flex' : 'none';

    const isLastQuestion = index === HABITS.length;
    if (nextBtn) {
      nextBtn.textContent = isLastQuestion ? 'Submit ✨' : 'Next →';
      if (isLastQuestion) {
        nextBtn.className = 'btn btn-success';
        nextBtn.onclick = () => UI.submitForm();
      } else {
        nextBtn.className = 'btn btn-accent';
        nextBtn.onclick = () => UI.nextQuestion();
      }
    }

    // Render the question
    if (index < HABITS.length) {
      const habit = HABITS[index];
      const savedValue = formValues[habit.id] || '';

      container.innerHTML = `
        <div class="glass-card question-card">
          <span class="question-icon">${habit.icon}</span>
          <h2 class="question-title">${habit.question}</h2>
          <p class="question-help">${habit.helpText}</p>
          ${renderInput(habit, savedValue)}
        </div>
      `;

      // Focus input
      setTimeout(() => {
        const input = container.querySelector('.question-input, .time-selector select');
        if (input) input.focus();
      }, 100);
    } else {
      // Tomorrow's todo question
      const savedTodo = formValues['tomorrow_todo'] || '';
      container.innerHTML = `
        <div class="glass-card question-card">
          <span class="question-icon">${TODO_CONFIG.icon}</span>
          <h2 class="question-title">${TODO_CONFIG.question}</h2>
          <p class="question-help">${TODO_CONFIG.helpText}</p>
          <textarea
            class="question-input"
            id="input_tomorrow_todo"
            placeholder="${TODO_CONFIG.placeholder}"
            rows="3"
            oninput="UI.saveInput('tomorrow_todo', this.value)"
          >${savedTodo}</textarea>
        </div>
      `;
    }
  }

  function renderInput(habit, savedValue) {
    if (habit.type === 'time') {
      // Parse saved value or default
      let hour = '', minute = '', period = 'AM';
      if (savedValue) {
        const match = savedValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (match) {
          hour = match[1];
          minute = match[2];
          period = match[3].toUpperCase();
        }
      }

      const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1)
        .map((h) => `<option value="${h}" ${h == hour ? 'selected' : ''}>${h}</option>`)
        .join('');

      const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5)
        .map((m) => {
          const mStr = String(m).padStart(2, '0');
          return `<option value="${mStr}" ${mStr === minute ? 'selected' : ''}>${mStr}</option>`;
        })
        .join('');

      return `
        <div class="time-selector" id="input_${habit.id}">
          <select onchange="UI.saveTimeInput('${habit.id}')" data-part="hour">
            <option value="">Hr</option>
            ${hourOptions}
          </select>
          <span class="time-separator">:</span>
          <select onchange="UI.saveTimeInput('${habit.id}')" data-part="minute">
            <option value="">Min</option>
            ${minuteOptions}
          </select>
          <select onchange="UI.saveTimeInput('${habit.id}')" data-part="period">
            <option value="AM" ${period === 'AM' ? 'selected' : ''}>AM</option>
            <option value="PM" ${period === 'PM' ? 'selected' : ''}>PM</option>
          </select>
        </div>
      `;
    }

    if (habit.type === 'number') {
      const v = habit.validation || {};
      return `
        <input
          type="number"
          class="question-input"
          id="input_${habit.id}"
          value="${savedValue}"
          placeholder="${habit.placeholder || ''}"
          ${v.min !== undefined ? `min="${v.min}"` : ''}
          ${v.max !== undefined ? `max="${v.max}"` : ''}
          ${v.step !== undefined ? `step="${v.step}"` : ''}
          oninput="UI.saveInput('${habit.id}', this.value)"
          onkeydown="if(event.key==='Enter')UI.nextQuestion()"
        />
        ${habit.unit ? `<span style="color:var(--text-muted);font-size:0.85rem;margin-top:6px;display:block;">${habit.unit}</span>` : ''}
      `;
    }

    return `
      <input
        type="text"
        class="question-input"
        id="input_${habit.id}"
        value="${savedValue}"
        placeholder="${habit.placeholder || ''}"
        oninput="UI.saveInput('${habit.id}', this.value)"
        onkeydown="if(event.key==='Enter')UI.nextQuestion()"
      />
    `;
  }

  function saveInput(habitId, value) {
    formValues[habitId] = value;
  }

  function saveTimeInput(habitId) {
    const container = document.getElementById(`input_${habitId}`);
    if (!container) return;
    const hour = container.querySelector('[data-part="hour"]').value;
    const minute = container.querySelector('[data-part="minute"]').value;
    const period = container.querySelector('[data-part="period"]').value;

    if (hour && minute) {
      formValues[habitId] = `${hour}:${minute} ${period}`;
    }
  }

  function selectTodoOption(value) {
    todoStatus = value;
    formValues['todo_status'] = value;
    document.querySelectorAll('.todo-option').forEach((opt) => {
      opt.classList.toggle('selected', opt.dataset.value === value);
    });
  }

  function nextQuestion() {
    // Validate current input
    if (currentQuestion < HABITS.length) {
      const habit = HABITS[currentQuestion];
      const value = formValues[habit.id];
      if (habit.required && (!value || value.toString().trim() === '')) {
        const inputEl = document.querySelector(`#input_${habit.id}, .question-card .question-input`);
        if (inputEl) {
          inputEl.classList.add('error');
          Animations.shake(inputEl);
          setTimeout(() => inputEl.classList.remove('error'), 2000);
        }
        Animations.showToast('Please fill in this field', 'warning');
        return;
      }
    }

    if (currentQuestion < HABITS.length) {
      renderQuestion(currentQuestion + 1);
    }
  }

  function prevQuestion() {
    if (currentQuestion > 0) {
      renderQuestion(currentQuestion - 1);
    }
  }

  async function submitForm() {
    // Validate todo (now optional)
    let todoValue = formValues['tomorrow_todo'];
    if (!todoValue || todoValue.trim() === '') {
      formValues['tomorrow_todo'] = 'None set';
    }

    // Build entry
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const entry = {
      date: `${String(today.getDate()).padStart(2, '0')}-${months[today.getMonth()]}-${today.getFullYear()}`,
      day: days[today.getDay()],
      ...formValues,
      todo_status: todoStatus || 'N/A',
    };

    // Calculate score
    entry.score = API.calculateScore(formValues);

    // Show submitting state
    const container = document.querySelector('.checkin-container');
    if (container) {
      container.innerHTML = `
        <div class="glass-card submitted-card">
          <span class="submitted-icon anim-pulse">⏳</span>
          <h2 class="submitted-title">Submitting...</h2>
        </div>
      `;
    }

    // Submit
    const result = await API.submitDaily(entry);

    // Show success
    renderSubmittedState(container, entry);

    // Check rewards
    const history = await API.getHistory(90);
    const streaks = Rewards.calculateStreaks(history);
    const earnedIds = Storage.getRewards().map((r) => r.id);
    const newRewards = Rewards.checkNewRewards(streaks.currentStreak, earnedIds);
    const newBadges = [
      ...Rewards.checkHabitBadges(history),
      ...Rewards.checkSpecialBadges(history),
    ];

    // Show celebrations
    setTimeout(() => {
      if (entry.score >= 90) {
        Animations.confetti({ count: 100 });
        Animations.showToast(`Amazing! You scored ${entry.score}/100!`, 'reward');
      } else if (entry.score >= 70) {
        Animations.showToast(`Great job! You scored ${entry.score}/100`, 'success');
      } else {
        Animations.showToast(`You scored ${entry.score}/100. Keep improving!`, 'info');
      }
    }, 500);

    // New rewards
    for (const reward of newRewards) {
      setTimeout(() => {
        Animations.celebrate(
          `${reward.icon} ${reward.name} Unlocked!`,
          reward.description
        );
        Storage.addNewRewardNotification(reward);
        API.logReward(reward);
      }, 1500);
    }

    // New badges
    for (const badge of newBadges) {
      setTimeout(() => {
        Animations.showToast(`Badge unlocked: ${badge.icon} ${badge.name}!`, 'badge', 5000);
      }, 2500);
    }

    // Refresh streak banner
    renderStreakBanner(
      document.getElementById('streakBanner'),
      streaks,
      Storage.getXP()
    );
  }

  function renderSubmittedState(container, entry) {
    if (!container) return;

    const scoreClass = entry.score >= 80 ? 'success' : entry.score >= 60 ? 'warning' : 'danger';
    const scoreGradient = entry.score >= 80
      ? 'linear-gradient(135deg, var(--success), var(--success-light))'
      : entry.score >= 60
      ? 'linear-gradient(135deg, var(--warning), #f39c12)'
      : 'linear-gradient(135deg, var(--danger), #d63031)';

    const messages = [
      entry.score >= 90 ? '🏆 Outstanding performance!' : '',
      entry.score >= 70 && entry.score < 90 ? '💪 Good job, keep pushing!' : '',
      entry.score < 70 ? "📈 Room to grow. Tomorrow's a new day!" : '',
    ].filter(Boolean);

    container.innerHTML = `
      <div class="glass-card submitted-card anim-pop-in">
        <span class="submitted-icon">✅</span>
        <h2 class="submitted-title">Day Logged Successfully!</h2>
        <div class="submitted-score" style="background:${scoreGradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;" id="scoreValue">0</div>
        <p class="submitted-message">${messages[0]}</p>
        <div style="margin-top:var(--space-lg);display:flex;gap:var(--space-md);justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-accent" onclick="UI.switchScreen('dashboardScreen')">📊 View Dashboard</button>
          <button class="btn btn-ghost" onclick="UI.switchScreen('rewardsScreen')">🏆 Check Rewards</button>
        </div>
      </div>
    `;

    // Animate score counter
    const scoreEl = document.getElementById('scoreValue');
    if (scoreEl) {
      Animations.animateCounter(scoreEl, entry.score, 1500, '', ' / 100');
    }
  }

  // ─── DASHBOARD SCREEN ───

  function renderDashboard(container, history, streakData) {
    const todayEntry = history.length > 0 ? history[history.length - 1] : null;
    const score = todayEntry ? parseFloat(todayEntry.score) || 0 : 0;

    let html = '';

    // Stat cards
    html += `
      <div class="stat-cards">
        <div class="tilt-card stat-card score anim-fade-in-up stagger-1">
          <div class="stat-card-value" id="dashScore">0</div>
          <div class="stat-card-label">Today's Score</div>
        </div>
        <div class="tilt-card stat-card streak anim-fade-in-up stagger-2">
          <div class="stat-card-value" id="dashStreak">0</div>
          <div class="stat-card-label">Day Streak</div>
        </div>
        <div class="tilt-card stat-card level anim-fade-in-up stagger-3">
          <div class="stat-card-value">${getLevelFromXP(Storage.getXP()).icon}</div>
          <div class="stat-card-label">Lv.${getLevelFromXP(Storage.getXP()).level} ${getLevelFromXP(Storage.getXP()).name}</div>
        </div>
      </div>
    `;

    // Progress rings
    html += `<h3 class="section-header"><span class="section-header-icon">🎯</span> Habit Progress</h3>`;
    html += `<div class="progress-rings">`;
    HABITS.forEach((habit, i) => {
      const value = todayEntry ? todayEntry[habit.id] : undefined;
      const pct = value !== undefined ? Charts.getHabitPercentage(habit, value) : 0;
      const radius = 38;
      const circumference = 2 * Math.PI * radius;
      const color = pct >= 100 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';

      html += `
        <div class="progress-ring-item anim-fade-in-up stagger-${i + 1}">
          <svg class="progress-ring-svg" width="90" height="90">
            <circle class="progress-ring-bg" cx="45" cy="45" r="${radius}" stroke-width="6" />
            <circle class="progress-ring-fill" cx="45" cy="45" r="${radius}" stroke-width="6"
              stroke="${color}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${circumference}"
              data-percentage="${Math.min(pct, 100)}"
              data-circumference="${circumference}"
            />
            <text class="progress-ring-text" x="45" y="45" text-anchor="middle" dy="4">${habit.icon}</text>
          </svg>
          <span class="progress-ring-label">${habit.name}</span>
        </div>
      `;
    });
    html += `</div>`;

    // Charts
    html += `
      <div class="chart-grid">
        <div class="glass-card chart-card anim-fade-in-up">
          <h3>📈 Score Trend</h3>
          <div class="chart-wrapper"><canvas id="scoreTrendChart"></canvas></div>
        </div>
        <div class="glass-card chart-card anim-fade-in-up">
          <h3>🕸️ Habit Balance</h3>
          <div class="chart-wrapper"><canvas id="radarChart"></canvas></div>
        </div>
      </div>
      <div class="glass-card chart-card anim-fade-in-up">
        <h3>📊 Weekly Overview</h3>
        <div class="chart-wrapper"><canvas id="weeklyChart"></canvas></div>
      </div>
    `;

    container.innerHTML = html;

    // Animate counters
    setTimeout(() => {
      const scoreEl = document.getElementById('dashScore');
      const streakEl = document.getElementById('dashStreak');
      if (scoreEl) Animations.animateCounter(scoreEl, score, 1500);
      if (streakEl) Animations.animateCounter(streakEl, streakData.currentStreak, 1000);
    }, 200);

    // Animate progress rings
    setTimeout(() => {
      document.querySelectorAll('.progress-ring-fill').forEach((circle) => {
        const pct = parseFloat(circle.dataset.percentage) || 0;
        Animations.animateProgressRing(circle, pct);
      });
    }, 400);

    // Create charts
    setTimeout(() => {
      Charts.createScoreTrend('scoreTrendChart', history, 14);
      Charts.createRadarChart('radarChart', todayEntry);
      Charts.createWeeklyChart('weeklyChart', history);
    }, 500);

    // Init tilt effects
    setTimeout(() => Animations.initTiltEffects(), 300);
  }

  // ─── REWARDS SCREEN ───

  function renderRewards(container, streakData) {
    const rewardLog = Storage.getRewards();
    const earnedRewards = Rewards.getEarnedRewards(streakData.currentStreak, rewardLog);
    const nextReward = Rewards.getNextReward(streakData.currentStreak);
    const badges = Rewards.getAllBadgesStatus();

    let html = '';

    // Current streak & next reward progress
    const flameCount = Math.min(streakData.currentStreak, 20);
    const flames = Array.from({ length: flameCount }, () => '<span>🔥</span>').join('');

    // Find last earned reward
    const lastEarned = [...earnedRewards].reverse().find((r) => r.earned);

    html += `
      <div class="reward-progress-card anim-fade-in-up">
        <div class="reward-streak-flames">${flames || '❄️'}</div>
        <div class="reward-unlocked-text">
          ${streakData.currentStreak > 0
            ? `${streakData.currentStreak} Day Streak${lastEarned ? ` — ${lastEarned.name} Unlocked!` : '!'}`
            : 'Start Your Streak Today!'}
        </div>
        ${nextReward ? `
          <div class="reward-next-text">
            Next: ${nextReward.icon} ${nextReward.name} (${nextReward.streakDays}-day streak) — ${nextReward.daysRemaining} days to go!
          </div>
          <div class="reward-progress-bar">
            <div class="reward-progress-fill" style="width: ${Math.round(nextReward.progress * 100)}%"></div>
          </div>
        ` : '<div class="reward-next-text">🎉 All rewards unlocked! You are legendary!</div>'}
      </div>
    `;

    // Reward milestones list
    html += `<h3 class="section-header"><span class="section-header-icon">🎁</span> Reward Milestones</h3>`;
    html += `<div class="rewards-list">`;
    REWARDS.forEach((reward, i) => {
      const isEarned = streakData.currentStreak >= reward.streakDays ||
        rewardLog.some((r) => r.id === reward.id);
      html += `
        <div class="reward-item ${isEarned ? 'earned' : 'locked'} anim-fade-in-up stagger-${i + 1}">
          <span class="reward-item-icon">${reward.icon}</span>
          <div class="reward-item-info">
            <div class="reward-item-name">${reward.name}</div>
            <div class="reward-item-desc">${reward.description}</div>
          </div>
          <span class="reward-item-days">${isEarned ? '✅ Earned' : `${reward.streakDays} days`}</span>
        </div>
      `;
    });
    html += `</div>`;

    // Badges
    html += `<h3 class="section-header"><span class="section-header-icon">🏅</span> Your Badges</h3>`;
    html += `<div class="badges-grid">`;
    badges.forEach((badge, i) => {
      html += `
        <div class="glass-card badge-card ${badge.earned ? 'earned' : 'locked'} anim-fade-in-up stagger-${i + 1}">
          <span class="badge-icon">${badge.icon}</span>
          <div class="badge-name">${badge.name}</div>
          <div class="badge-description">${badge.description}</div>
          <span class="badge-status ${badge.earned ? 'earned' : 'locked'}">
            ${badge.earned ? '✅ Earned' : '🔒 Locked'}
          </span>
        </div>
      `;
    });
    html += `</div>`;

    // Reward History
    const earnedLogs = rewardLog.filter((r) => r.date);
    if (earnedLogs.length > 0) {
      html += `<h3 class="section-header"><span class="section-header-icon">📜</span> Reward History</h3>`;
      html += `<div class="glass-card"><div class="reward-timeline">`;
      earnedLogs.reverse().forEach((r) => {
        html += `
          <div class="reward-timeline-item">
            <span class="reward-timeline-date">${r.date}</span>
            <div class="reward-timeline-name">${r.icon || '🏆'} ${r.name || r.rewardName}</div>
          </div>
        `;
      });
      html += `</div></div>`;
    }

    container.innerHTML = html;
  }

  // ─── HISTORY SCREEN ───

  function renderHistory(container, history) {
    let html = '';

    // Heatmap
    html += `
      <h3 class="section-header"><span class="section-header-icon">🗓️</span> Activity Heatmap</h3>
      <div class="glass-card heatmap-container anim-fade-in-up">
        <canvas id="heatmapCanvas"></canvas>
      </div>
    `;

    // History table
    html += `<h3 class="section-header" style="margin-top:var(--space-lg);"><span class="section-header-icon">📋</span> Daily Log</h3>`;

    if (history.length === 0) {
      html += `
        <div class="glass-card empty-state">
          <span class="empty-state-icon">📭</span>
          <p class="empty-state-text">No entries yet. Complete your first daily check-in!</p>
        </div>
      `;
    } else {
      html += `<div class="glass-card" style="overflow-x:auto;">`;
      html += `<table class="history-table"><thead><tr>`;
      html += `<th>Date</th><th>Day</th>`;
      HABITS.forEach((h) => {
        html += `<th>${h.icon}</th>`;
      });
      html += `<th>⭐ Score</th></tr></thead><tbody>`;

      [...history].reverse().forEach((entry) => {
        const score = parseFloat(entry.score) || 0;
        const scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-med' : 'score-low';

        html += `<tr><td>${entry.date || ''}</td><td>${entry.day ? entry.day.substring(0, 3) : ''}</td>`;
        HABITS.forEach((h) => {
          const val = entry[h.id];
          const met = val !== undefined && API.checkTarget(h, val);
          html += `<td style="color:${met ? 'var(--success)' : 'var(--text-secondary)'}">${val !== undefined ? val : '—'}</td>`;
        });
        html += `<td class="${scoreClass}">${score}</td></tr>`;
      });

      html += `</tbody></table></div>`;
    }

    container.innerHTML = html;

    // Render heatmap
    setTimeout(() => {
      Charts.createHeatmap('heatmapCanvas', history, 90);
    }, 300);
  }

  // ─── ALREADY SUBMITTED STATE ───

  function renderAlreadySubmitted(container, todayEntry) {
    const score = parseFloat(todayEntry.score) || 0;
    container.innerHTML = `
      <div class="glass-card submitted-card anim-fade-in-up">
        <span class="submitted-icon">✅</span>
        <h2 class="submitted-title">Today's Check-in Complete!</h2>
        <div class="submitted-score" style="background:linear-gradient(135deg, var(--success), var(--success-light));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${score} / 100</div>
        <p class="submitted-message">You've already logged today. Come back tomorrow! 💪</p>
        <div style="margin-top:var(--space-lg);display:flex;gap:var(--space-md);justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-accent" onclick="UI.switchScreen('dashboardScreen')">📊 Dashboard</button>
          <button class="btn btn-ghost" onclick="UI.switchScreen('rewardsScreen')">🏆 Rewards</button>
        </div>
      </div>
    `;
  }

  // ─── Public API ───

  return {
    switchScreen,
    renderStreakBanner,
    renderCheckin,
    renderDashboard,
    renderRewards,
    renderHistory,
    renderAlreadySubmitted,
    renderSubmittedState,
    selectTodoOption,
    saveInput,
    saveTimeInput,
    nextQuestion,
    prevQuestion,
    submitForm,
    getFormValues: () => formValues,
  };
})();
