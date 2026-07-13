// ============================================================
// 🔧 HABIT TRACKER v2 — CONFIGURATION
// ============================================================
// To add a new habit, just add a new entry to the HABITS array!
// The form, dashboard, scoring, charts, and badges auto-generate.
// ============================================================

const CONFIG = {
  // Google Apps Script Web App URL — UPDATE THIS after deploying!
  API_URL: 'https://script.google.com/macros/s/AKfycbw7wVWmVTN2NQEg_nRyruyvMz0e3tw3yn8E9k3scaLEgSYOcardEv_dtFpH0jhg6YExTA/exec',

  // App settings
  APP_NAME: 'Habit Tracker',
  STREAK_THRESHOLD: 70, // Score >= this counts as a streak day
  VERSION: '2.0.0',
};

// ============================================================
// 📋 HABIT DEFINITIONS
// ============================================================
// type: 'time' | 'number' | 'boolean' | 'choice' | 'text'
// target.type: 'time-range' | 'min' | 'max' | 'range' | 'boolean'
// ============================================================

const HABITS = [
  {
    id: 'wake_up',
    name: 'Wake Up Time',
    icon: '⏰',
    category: 'sleep',
    type: 'time',
    question: 'What time did you wake up today?',
    helpText: 'Target: 5:30 AM to 6:00 AM',
    placeholder: 'e.g., 5:45 AM',
    target: { type: 'time-range', start: '05:30', end: '06:00' },
    points: 15,
    partialPoints: 8,
    partialTarget: { type: 'time-range', start: '06:00', end: '06:30' },
    required: true,
    sheetColumn: 'Wake Up',
    badge: {
      name: 'Early Bird',
      icon: '🐦',
      description: 'Wake up on time for 7 consecutive days',
      streakDays: 7,
    },
  },
  {
    id: 'sleep_time',
    name: 'Sleep Time',
    icon: '🌙',
    category: 'sleep',
    type: 'time',
    question: 'What time did you go to sleep last night?',
    helpText: 'Target: 10:30 PM to 11:00 PM',
    placeholder: 'e.g., 10:45 PM',
    target: { type: 'time-range', start: '22:30', end: '23:00' },
    points: 15,
    partialPoints: 8,
    partialTarget: { type: 'time-range', start: '23:00', end: '23:30' },
    required: true,
    sheetColumn: 'Sleep Time',
    badge: {
      name: 'Night Owl Tamer',
      icon: '🦉',
      description: 'Sleep on time for 7 consecutive days',
      streakDays: 7,
    },
  },
  {
    id: 'sleep_hours',
    name: 'Sleep Duration',
    icon: '😴',
    category: 'sleep',
    type: 'number',
    unit: 'hours',
    question: 'How many hours did you sleep?',
    helpText: 'Target: Between 6 and 8 hours',
    placeholder: 'e.g., 7 or 7.5',
    target: { type: 'range', min: 6, max: 8 },
    points: 20,
    partialPoints: 10,
    partialTarget: { type: 'range', min: 5, max: 9 },
    required: true,
    validation: { min: 1, max: 24, step: 0.5 },
    sheetColumn: 'Hours Slept',
    badge: {
      name: 'Sleep Champion',
      icon: '💤',
      description: 'Hit sleep target for 14 consecutive days',
      streakDays: 14,
    },
  },
  {
    id: 'water',
    name: 'Water Intake',
    icon: '💧',
    category: 'health',
    type: 'number',
    unit: 'litres',
    question: 'How many litres of water did you drink today?',
    helpText: 'Target: At least 2 litres',
    placeholder: 'e.g., 2.5',
    target: { type: 'min', value: 2 },
    points: 15,
    partialPoints: 8,
    partialTarget: { type: 'min', value: 1.5 },
    required: true,
    validation: { min: 0, max: 20, step: 0.1 },
    sheetColumn: 'Water (L)',
    badge: {
      name: 'Hydration Hero',
      icon: '🌊',
      description: 'Drink 2+ litres for 7 consecutive days',
      streakDays: 7,
    },
  },
  {
    id: 'reading',
    name: 'Reading',
    icon: '📖',
    category: 'growth',
    type: 'number',
    unit: 'minutes',
    question: 'How many minutes did you read today?',
    helpText: 'Target: At least 20 minutes. Every page counts!',
    placeholder: 'e.g., 30',
    target: { type: 'min', value: 20 },
    points: 15,
    partialPoints: 8,
    partialTarget: { type: 'min', value: 10 },
    required: true,
    validation: { min: 0, max: 600, step: 1 },
    sheetColumn: 'Reading (min)',
    badge: {
      name: 'Bookworm',
      icon: '📚',
      description: 'Read 20+ min for 14 consecutive days',
      streakDays: 14,
    },
  },
  {
    id: 'walking',
    name: 'Walking',
    icon: '🚶',
    category: 'fitness',
    type: 'number',
    unit: 'minutes',
    question: 'How many minutes did you walk today?',
    helpText: 'Target: At least 25 minutes. Keep moving!',
    placeholder: 'e.g., 30',
    target: { type: 'min', value: 25 },
    points: 10,
    partialPoints: 5,
    partialTarget: { type: 'min', value: 15 },
    required: true,
    validation: { min: 0, max: 600, step: 1 },
    sheetColumn: 'Walking (min)',
    badge: {
      name: 'Trailblazer',
      icon: '🥾',
      description: 'Walk 25+ min for 14 consecutive days',
      streakDays: 14,
    },
  },
];

// Special follow-up item (not a regular habit)
const TODO_CONFIG = {
  id: 'tomorrow_todo',
  name: "Tomorrow's Todo",
  icon: '🎯',
  question: "What is your most important to-do for tomorrow?",
  helpText: "Set one key task. It'll appear tomorrow as a follow-up!",
  placeholder: 'e.g., Complete the project report',
  required: true,
  followUp: {
    question: 'Did you complete: "{TODO}"?',
    options: [
      { label: 'Yes, completed! ✅', value: 'completed', icon: '✅', points: 10 },
      { label: 'Partially done 🔄', value: 'partial', icon: '🔄', points: 5 },
      { label: "No, couldn't do it 😔", value: 'missed', icon: '😔', points: 0 },
    ],
  },
};

// ============================================================
// 🏆 REWARD DEFINITIONS
// ============================================================

const REWARDS = [
  {
    id: 'reward_3',
    streakDays: 3,
    name: 'A Movie',
    icon: '🎬',
    description: '3-day streak reward — Enjoy a movie!',
    color: '#a29bfe',
  },
  {
    id: 'reward_7',
    streakDays: 7,
    name: 'Temptation / Chocolate',
    icon: '🍫',
    description: '7-day streak reward — Treat yourself to chocolate!',
    color: '#6c5ce7',
  },
  {
    id: 'reward_14',
    streakDays: 14,
    name: 'Night Dinner',
    icon: '🍽️',
    description: '14-day streak reward — Enjoy a dinner out!',
    color: '#fd79a8',
  },
  {
    id: 'reward_21',
    streakDays: 21,
    name: 'Any Sweet',
    icon: '🍰',
    description: '21-day streak reward — Get your favorite sweet!',
    color: '#fdcb6e',
  },
  {
    id: 'reward_30',
    streakDays: 30,
    name: 'Buy Gadget ₹2K',
    icon: '📱',
    description: '30-day streak reward — Buy a gadget worth ₹2,000!',
    color: '#00b894',
  },
  {
    id: 'reward_60',
    streakDays: 60,
    name: 'Buy Gadget ₹5K',
    icon: '🎮',
    description: '60-day streak reward — Buy a gadget worth ₹5,000!',
    color: '#0984e3',
  },
  {
    id: 'reward_90',
    streakDays: 90,
    name: 'Buy Gadget ₹20K',
    icon: '💻',
    description: '90-day streak reward — Buy a gadget worth ₹20,000!',
    color: '#e84393',
  },
];

// ============================================================
// 🎮 LEVEL SYSTEM
// ============================================================

const LEVELS = [
  { level: 1, name: 'Beginner', icon: '🌱', xpRequired: 0, color: '#a29bfe' },
  { level: 2, name: 'Learner', icon: '📘', xpRequired: 200, color: '#74b9ff' },
  { level: 3, name: 'Warrior', icon: '⚔️', xpRequired: 500, color: '#55efc4' },
  { level: 4, name: 'Hero', icon: '🦸', xpRequired: 1000, color: '#ffeaa7' },
  { level: 5, name: 'Champion', icon: '🏆', xpRequired: 2000, color: '#fdcb6e' },
  { level: 6, name: 'Legend', icon: '👑', xpRequired: 4000, color: '#e17055' },
  { level: 7, name: 'Immortal', icon: '🌟', xpRequired: 7000, color: '#d63031' },
  { level: 8, name: 'Transcendent', icon: '✨', xpRequired: 10000, color: '#e84393' },
];

// ============================================================
// 🏅 SPECIAL BADGES (score-based)
// ============================================================

const SPECIAL_BADGES = [
  {
    id: 'perfect_day',
    name: 'Perfect Day',
    icon: '⭐',
    description: 'Score 100/100 in a single day',
    condition: 'single_day_score',
    threshold: 100,
    color: '#ffeaa7',
  },
  {
    id: 'consistent_week',
    name: 'Consistent Week',
    icon: '🏆',
    description: 'Average score ≥ 85 for a full week',
    condition: 'weekly_avg',
    threshold: 85,
    color: '#fdcb6e',
  },
  {
    id: 'monthly_champion',
    name: 'Monthly Champion',
    icon: '👑',
    description: 'Average score ≥ 80 for a full month',
    condition: 'monthly_avg',
    threshold: 80,
    color: '#e17055',
  },
  {
    id: 'discipline_master',
    name: 'Discipline Master',
    icon: '🧘',
    description: 'Get 10 perfect days in a single month',
    condition: 'perfect_days_month',
    threshold: 10,
    color: '#6c5ce7',
  },
];

// ============================================================
// 🎨 THEME CONFIGURATION
// ============================================================

const THEME = {
  colors: {
    bgPrimary: '#0a0a1a',
    bgSecondary: '#12122a',
    bgCard: 'rgba(255, 255, 255, 0.05)',
    bgCardHover: 'rgba(255, 255, 255, 0.08)',
    bgGlass: 'rgba(255, 255, 255, 0.06)',
    textPrimary: '#ffffff',
    textSecondary: '#a0a0b8',
    textMuted: '#6b6b80',
    accent: '#6c5ce7',
    accentLight: '#a29bfe',
    accentGlow: 'rgba(108, 92, 231, 0.4)',
    success: '#00b894',
    successGlow: 'rgba(0, 184, 148, 0.4)',
    warning: '#fdcb6e',
    warningGlow: 'rgba(253, 203, 110, 0.4)',
    danger: '#e17055',
    dangerGlow: 'rgba(225, 112, 85, 0.4)',
    fire: '#ff6b35',
    gold: '#ffd700',
    goldGlow: 'rgba(255, 215, 0, 0.4)',
  },
  gradients: {
    main: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%)',
    accent: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
    success: 'linear-gradient(135deg, #00b894, #55efc4)',
    fire: 'linear-gradient(135deg, #ff6b35, #ffd700)',
    card: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
    scoreHigh: 'linear-gradient(135deg, #00b894, #55efc4)',
    scoreMed: 'linear-gradient(135deg, #fdcb6e, #f39c12)',
    scoreLow: 'linear-gradient(135deg, #e17055, #d63031)',
  },
};

// ============================================================
// 🔧 UTILITY — Get total possible points
// ============================================================

function getTotalPossiblePoints() {
  let total = HABITS.reduce((sum, h) => sum + h.points, 0);
  total += TODO_CONFIG.followUp.options[0].points; // Max todo points
  return total;
}

// ============================================================
// 🔧 UTILITY — Get habit by ID
// ============================================================

function getHabitById(id) {
  return HABITS.find((h) => h.id === id) || null;
}

// ============================================================
// 🔧 UTILITY — Get current level from XP
// ============================================================

function getLevelFromXP(xp) {
  let currentLevel = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.xpRequired) {
      currentLevel = level;
    } else {
      break;
    }
  }
  return currentLevel;
}

// ============================================================
// 🔧 UTILITY — Get next level info
// ============================================================

function getNextLevel(xp) {
  const current = getLevelFromXP(xp);
  const nextIdx = LEVELS.findIndex((l) => l.level === current.level) + 1;
  if (nextIdx < LEVELS.length) {
    return {
      next: LEVELS[nextIdx],
      xpNeeded: LEVELS[nextIdx].xpRequired - xp,
      progress: (xp - current.xpRequired) / (LEVELS[nextIdx].xpRequired - current.xpRequired),
    };
  }
  return { next: null, xpNeeded: 0, progress: 1 };
}
