/* ============================================================
   storage.js — 数据存储层
   基于 localStorage 的简单键值存储
   管理：学习记录(sessions)、当前计时(activeSession)、设置(settings)
   ============================================================ */

const Storage = (() => {
  const KEYS = {
    SESSIONS: 'study_sessions',
    ACTIVE_SESSION: 'study_active',
    SETTINGS: 'study_settings'
  };

  // ==================== 基础读写 ====================

  function _read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Storage read error:', e);
      return null;
    }
  }

  function _write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Storage write error:', e);
    }
  }

  // ==================== 学习记录 ====================

  /** 获取所有学习记录 */
  function getSessions() {
    return _read(KEYS.SESSIONS) || [];
  }

  /** 保存一条学习记录 */
  function saveSession(session) {
    const sessions = getSessions();
    sessions.push(session);
    _write(KEYS.SESSIONS, sessions);
    return session;
  }

  /** 删除某条记录 */
  function deleteSession(id) {
    const sessions = getSessions().filter(s => s.id !== id);
    _write(KEYS.SESSIONS, sessions);
  }

  /** 获取指定日期的记录 */
  function getSessionsByDate(dateStr) {
    return getSessions().filter(s => s.date === dateStr);
  }

  /** 获取有记录的日期集合（用于日历标记） */
  function getRecordDates() {
    const dates = new Set();
    getSessions().forEach(s => dates.add(s.date));
    return dates;
  }

  /** 获取指定日期的总学习时长（毫秒） */
  function getDateTotal(dateStr) {
    return getSessionsByDate(dateStr)
      .reduce((sum, s) => sum + s.duration, 0);
  }

  /** 获取累计总时长（毫秒） */
  function getTotalDuration() {
    return getSessions().reduce((sum, s) => sum + s.duration, 0);
  }

  /** 计算日均学习时长（毫秒）——按有记录的天数算 */
  function getDailyAverage() {
    const sessions = getSessions();
    if (sessions.length === 0) return 0;

    const dates = new Set(sessions.map(s => s.date));
    const total = sessions.reduce((sum, s) => sum + s.duration, 0);
    return total / dates.size;
  }

  /** 获取最近 N 条记录（按时间倒序） */
  function getRecentSessions(n = 3) {
    return getSessions()
      .slice()
      .reverse()
      .slice(0, n);
  }

  // ==================== 当前计时 ====================

  /** 获取当前正在进行的计时（如果有的话） */
  function getActiveSession() {
    return _read(KEYS.ACTIVE_SESSION);
  }

  /** 保存当前计时状态 */
  function saveActiveSession(active) {
    _write(KEYS.ACTIVE_SESSION, active);
  }

  /** 清除当前计时状态 */
  function clearActiveSession() {
    localStorage.removeItem(KEYS.ACTIVE_SESSION);
  }

  // ==================== 设置 ====================

  /** 获取应用设置 */
  function getSettings() {
    return _read(KEYS.SETTINGS) || {
      reminderEnabled: false,
      reminderTime: '20:00'
    };
  }

  /** 保存应用设置 */
  function saveSettings(settings) {
    _write(KEYS.SETTINGS, settings);
  }

  // ==================== 工具函数 ====================

  /** 清除所有数据 */
  function clearAllData() {
    localStorage.removeItem(KEYS.SESSIONS);
    localStorage.removeItem(KEYS.ACTIVE_SESSION);
    localStorage.removeItem(KEYS.SETTINGS);
  }

  // ==================== 公开 API ====================
  return {
    getSessions,
    saveSession,
    deleteSession,
    getSessionsByDate,
    getRecordDates,
    getDateTotal,
    getTotalDuration,
    getDailyAverage,
    getRecentSessions,
    getActiveSession,
    saveActiveSession,
    clearActiveSession,
    getSettings,
    saveSettings,
    clearAllData
  };
})();
