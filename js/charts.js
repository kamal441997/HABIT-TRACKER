// ============================================================
// 📊 HABIT TRACKER v2 — CHARTS MODULE
// ============================================================
// Chart.js powered dashboard charts with animations.
// ============================================================

const Charts = (() => {
  let scoreChart = null;
  let radarChart = null;
  let weeklyChart = null;

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#a0a0b8',
          font: { family: "'Inter', sans-serif", size: 12 },
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(18, 18, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#a0a0b8',
        borderColor: 'rgba(108, 92, 231, 0.3)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: "'Inter', sans-serif", weight: 600 },
        bodyFont: { family: "'Inter', sans-serif" },
      },
    },
  };

  // ─── Score Trend Line Chart ───

  function createScoreTrend(canvasId, history, days = 7) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (scoreChart) scoreChart.destroy();

    const recent = history.slice(-days);
    const labels = recent.map((e) => {
      const parts = e.date?.split('-') || [];
      return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : e.date;
    });
    const scores = recent.map((e) => parseFloat(e.score) || 0);

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(108, 92, 231, 0.4)');
    gradient.addColorStop(1, 'rgba(108, 92, 231, 0.0)');

    scoreChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Daily Score',
            data: scores,
            borderColor: '#6c5ce7',
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#a29bfe',
            pointBorderColor: '#6c5ce7',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointHoverBorderWidth: 3,
          },
        ],
      },
      options: {
        ...chartDefaults,
        scales: {
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#6b6b80',
              font: { family: "'Inter', sans-serif" },
              callback: (v) => v + '%',
            },
          },
          x: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: {
              color: '#6b6b80',
              font: { family: "'Inter', sans-serif", size: 11 },
              maxRotation: 45,
            },
          },
        },
        animation: {
          duration: 1500,
          easing: 'easeOutQuart',
        },
      },
    });
  }

  // ─── Habit Balance Radar Chart ───

  function createRadarChart(canvasId, todayData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (radarChart) radarChart.destroy();

    const labels = HABITS.map((h) => h.icon + ' ' + h.name);
    const values = HABITS.map((h) => {
      if (!todayData || todayData[h.id] === undefined) return 0;
      return getHabitPercentage(h, todayData[h.id]);
    });

    radarChart = new Chart(canvas.getContext('2d'), {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: "Today's Performance",
            data: values,
            borderColor: '#6c5ce7',
            backgroundColor: 'rgba(108, 92, 231, 0.2)',
            pointBackgroundColor: '#a29bfe',
            pointBorderColor: '#6c5ce7',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            borderWidth: 2,
          },
        ],
      },
      options: {
        ...chartDefaults,
        scales: {
          r: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.08)' },
            angleLines: { color: 'rgba(255,255,255,0.08)' },
            pointLabels: {
              color: '#a0a0b8',
              font: { family: "'Inter', sans-serif", size: 11 },
            },
            ticks: {
              display: false,
            },
          },
        },
        animation: {
          duration: 1500,
          easing: 'easeOutQuart',
        },
      },
    });
  }

  // ─── Weekly Comparison Bar Chart ───

  function createWeeklyChart(canvasId, history) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (weeklyChart) weeklyChart.destroy();

    const last7 = history.slice(-7);
    const labels = last7.map((e) => e.day?.substring(0, 3) || '');
    const scores = last7.map((e) => parseFloat(e.score) || 0);

    const barColors = scores.map((s) =>
      s >= 80 ? '#00b894' : s >= 60 ? '#fdcb6e' : '#e17055'
    );

    weeklyChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Score',
            data: scores,
            backgroundColor: barColors,
            borderColor: barColors.map((c) => c + 'dd'),
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        ...chartDefaults,
        plugins: {
          ...chartDefaults.plugins,
          legend: { display: false },
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#6b6b80',
              font: { family: "'Inter', sans-serif" },
            },
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#a0a0b8',
              font: { family: "'Inter', sans-serif", size: 12, weight: 500 },
            },
          },
        },
        animation: {
          duration: 1200,
          easing: 'easeOutQuart',
        },
      },
    });
  }

  // ─── Calendar Heatmap (Custom Canvas) ───

  function createHeatmap(canvasId, history, days = 90) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const cellSize = 14;
    const cellGap = 3;
    const totalSize = cellSize + cellGap;
    const cols = Math.ceil(days / 7);

    canvas.width = cols * totalSize + 60;
    canvas.height = 7 * totalSize + 30;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Day labels
    const dayLabels = ['M', '', 'W', '', 'F', '', 'S'];
    ctx.fillStyle = '#6b6b80';
    ctx.font = "11px 'Inter', sans-serif";
    dayLabels.forEach((label, i) => {
      ctx.fillText(label, 0, 22 + i * totalSize);
    });

    // Build date → score map
    const scoreMap = {};
    history.forEach((e) => {
      if (e.date) scoreMap[e.date] = parseFloat(e.score) || 0;
    });

    // Draw cells
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const dayOfWeek = (date.getDay() + 6) % 7; // Mon=0
      const col = Math.floor((days - 1 - i) / 7);
      const x = 20 + col * totalSize;
      const y = 12 + dayOfWeek * totalSize;

      // Format date to match history
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateKey = `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
      const score = scoreMap[dateKey];

      if (score !== undefined) {
        if (score >= 80) ctx.fillStyle = '#00b894';
        else if (score >= 60) ctx.fillStyle = '#6c5ce7';
        else if (score >= 40) ctx.fillStyle = '#fdcb6e';
        else ctx.fillStyle = '#e17055';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
      }

      ctx.beginPath();
      ctx.roundRect(x, y, cellSize, cellSize, 3);
      ctx.fill();
    }
  }

  // ─── Helper: Get habit completion percentage ───

  function getHabitPercentage(habit, value) {
    if (value === undefined || value === null) return 0;
    const t = habit.target;
    if (!t) return 0;

    switch (t.type) {
      case 'min':
        return Math.min(100, (parseFloat(value) / t.value) * 100);
      case 'max':
        return parseFloat(value) <= t.value ? 100 : Math.max(0, 100 - ((parseFloat(value) - t.value) / t.value) * 100);
      case 'range': {
        const mid = (t.min + t.max) / 2;
        const v = parseFloat(value);
        if (v >= t.min && v <= t.max) return 100;
        if (v < t.min) return Math.max(0, (v / t.min) * 100);
        return Math.max(0, 100 - ((v - t.max) / mid) * 100);
      }
      case 'time-range':
        return API.checkTarget(habit, value) ? 100 : 30;
      default:
        return 0;
    }
  }

  // ─── Destroy all charts ───

  function destroyAll() {
    if (scoreChart) { scoreChart.destroy(); scoreChart = null; }
    if (radarChart) { radarChart.destroy(); radarChart = null; }
    if (weeklyChart) { weeklyChart.destroy(); weeklyChart = null; }
  }

  // ─── Public API ───

  return {
    createScoreTrend,
    createRadarChart,
    createWeeklyChart,
    createHeatmap,
    getHabitPercentage,
    destroyAll,
  };
})();
