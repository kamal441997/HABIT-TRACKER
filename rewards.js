// ============================================================
// 🏆 HABIT TRACKER v2 — REWARD & STREAK SYSTEM
// ============================================================

const Rewards = (() => {
  // ─── Calculate Streaks from History ───

  function calculateStreaks(history) {
    if (!history || history.length === 0) {
      return { currentStreak: 0, bestStreak: 0, totalDays: history ? history.length : 0 };
    }

    // Sort by date descending (most recent first)
    const sorted = [...history].sort((a, b) => {
      return parseHistoryDate(b.date) - parseHistoryDate(a.date);
    });

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Calculate current streak (from today going back)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sorted.length; i++) {
      const entryDate = parseHistoryDate(sorted[i].date);
      if (!entryDate) continue;

      const score = parseFloat(sorted[i].score) || 0;
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.round((expectedDate - entryDate) / (1000 * 60 * 60 * 24));

      if (Math.abs(daysDiff) <= 0 && score >= CONFIG.STREAK_THRESHOLD) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate best streak ever
    for (let i = 0; i < sorted.length; i++) {
      const score = parseFloat(sorted[i].score) || 0;
      if (score >= CONFIG.STREAK_THRESHOLD) {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    // Ensure best streak >= current streak
    if (currentStreak > bestStreak) bestStreak = currentStreak;

    const result = {
      currentStreak,
      bestStreak,
      totalDays: history.length,
    };

    Storage.saveStreakData(result);
    return result;
  }

  // ─── Check for New Rewards ───

  function checkNewRewards(currentStreak, earnedRewardIds) {
    const newRewards = [];

    for (const reward of REWARDS) {
      if (currentStreak >= reward.streakDays && !earnedRewardIds.includes(reward.id)) {
        newRewards.push(reward);
      }
    }

    return newRewards;
  }

  // ─── Get All Earned Rewards ───

  function getEarnedRewards(currentStreak, rewardLog = []) {
    const earned = [];
    const loggedIds = rewardLog.map((r) => r.id || r.rewardId);

    for (const reward of REWARDS) {
      if (currentStreak >= reward.streakDays || loggedIds.includes(reward.id)) {
        earned.push({ ...reward, earned: true });
      } else {
        earned.push({ ...reward, earned: false });
      }
    }

    return earned;
  }

  // ─── Get Next Reward ───

  function getNextReward(currentStreak) {
    for (const reward of REWARDS) {
      if (currentStreak < reward.streakDays) {
        return {
          ...reward,
          daysRemaining: reward.streakDays - currentStreak,
          progress: currentStreak / reward.streakDays,
        };
      }
    }
    return null; // All rewards earned!
  }

  // ─── Check Habit-Specific Badges ───

  function checkHabitBadges(history) {
    const earnedBadges = Storage.getEarnedBadges();
    const newBadges = [];

    for (const habit of HABITS) {
      if (!habit.badge) continue;
      if (earnedBadges.includes(habit.badge.name)) continue;

      // Check if habit target met for consecutive days
      const sorted = [...history].sort((a, b) =>
        parseHistoryDate(b.date) - parseHistoryDate(a.date)
      );

      let streak = 0;
      for (const entry of sorted) {
        const value = entry[habit.id];
        if (value !== undefined && API.checkTarget(habit, value)) {
          streak++;
        } else {
          break;
        }
      }

      if (streak >= habit.badge.streakDays) {
        newBadges.push(habit.badge);
        earnedBadges.push(habit.badge.name);
      }
    }

    Storage.saveEarnedBadges(earnedBadges);
    return newBadges;
  }

  // ─── Check Special Badges ───

  function checkSpecialBadges(history) {
    const earnedBadges = Storage.getEarnedBadges();
    const newBadges = [];

    for (const badge of SPECIAL_BADGES) {
      if (earnedBadges.includes(badge.id)) continue;

      let earned = false;

      switch (badge.condition) {
        case 'single_day_score':
          earned = history.some((e) => parseFloat(e.score) >= badge.threshold);
          break;

        case 'weekly_avg': {
          // Check last 7 entries
          const last7 = history.slice(-7);
          if (last7.length >= 7) {
            const avg = last7.reduce((s, e) => s + (parseFloat(e.score) || 0), 0) / 7;
            earned = avg >= badge.threshold;
          }
          break;
        }

        case 'monthly_avg': {
          // Check current month entries
          const now = new Date();
          const monthEntries = history.filter((e) => {
            const d = parseHistoryDate(e.date);
            return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });
          if (monthEntries.length >= 25) {
            const avg = monthEntries.reduce((s, e) => s + (parseFloat(e.score) || 0), 0) / monthEntries.length;
            earned = avg >= badge.threshold;
          }
          break;
        }

        case 'perfect_days_month': {
          const now2 = new Date();
          const perfectDays = history.filter((e) => {
            const d = parseHistoryDate(e.date);
            return (
              d &&
              d.getMonth() === now2.getMonth() &&
              d.getFullYear() === now2.getFullYear() &&
              parseFloat(e.score) >= 100
            );
          }).length;
          earned = perfectDays >= badge.threshold;
          break;
        }
      }

      if (earned) {
        newBadges.push(badge);
        earnedBadges.push(badge.id);
      }
    }

    Storage.saveEarnedBadges(earnedBadges);
    return newBadges;
  }

  // ─── Get All Badges Status ───

  function getAllBadgesStatus() {
    const earnedBadges = Storage.getEarnedBadges();
    const allBadges = [];

    // Habit badges
    for (const habit of HABITS) {
      if (!habit.badge) continue;
      allBadges.push({
        ...habit.badge,
        category: 'habit',
        habitId: habit.id,
        earned: earnedBadges.includes(habit.badge.name),
      });
    }

    // Special badges
    for (const badge of SPECIAL_BADGES) {
      allBadges.push({
        ...badge,
        category: 'special',
        earned: earnedBadges.includes(badge.id),
      });
    }

    return allBadges;
  }

  // ─── Calculate XP from score ───

  function scoreToXP(score) {
    return score; // 1:1 mapping — score IS XP earned that day
  }

  // ─── Helper: parse date ───

  function parseHistoryDate(dateStr) {
    if (!dateStr) return null;
    try {
      // Handle "dd-MMM-yyyy" format
      const parts = dateStr.toString().split('-');
      if (parts.length === 3) {
        const months = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
        };
        const day = parseInt(parts[0]);
        const month = months[parts[1]];
        const year = parseInt(parts[2]);
        if (month !== undefined && !isNaN(day) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
      // Fallback: try native Date parsing
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  }

  // ─── Public API ───

  return {
    calculateStreaks,
    checkNewRewards,
    getEarnedRewards,
    getNextReward,
    checkHabitBadges,
    checkSpecialBadges,
    getAllBadgesStatus,
    scoreToXP,
    parseHistoryDate,
  };
})();
