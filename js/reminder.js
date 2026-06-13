/* ============================================================
   reminder.js — 每日学习提醒
   - 根据设置的提醒时间，到点推送通知
   - 每分钟检查一次是否到达提醒时间
   - 同一天同一时间只提醒一次
   ============================================================ */

const Reminder = (() => {
  let checkInterval = null;
  let lastReminderDate = null; // 记录上次提醒的日期，避免重复

  // ==================== 初始化 ====================

  function init() {
    // 从 localStorage 恢复上次提醒日期
    lastReminderDate = localStorage.getItem('study_last_reminder_date');

    // 同步设置界面的状态
    syncSettingsUI();

    // 绑定设置界面事件
    document.getElementById('reminderToggle').addEventListener('change', e => {
      const settings = Storage.getSettings();
      settings.reminderEnabled = e.target.checked;
      Storage.saveSettings(settings);

      if (e.target.checked) {
        startChecking();
      } else {
        stopChecking();
      }
    });

    document.getElementById('reminderTime').addEventListener('change', e => {
      const settings = Storage.getSettings();
      settings.reminderTime = e.target.value;
      Storage.saveSettings(settings);
    });

    // 如果提醒已开启，启动检查
    const settings = Storage.getSettings();
    if (settings.reminderEnabled) {
      startChecking();
    }
  }

  // ==================== 设置界面同步 ====================

  function syncSettingsUI() {
    const settings = Storage.getSettings();
    document.getElementById('reminderToggle').checked = settings.reminderEnabled;
    document.getElementById('reminderTime').value = settings.reminderTime;
  }

  // ==================== 定时检查 ====================

  function startChecking() {
    stopChecking();

    // 立即检查一次
    checkReminder();

    // 每 30 秒检查一次
    checkInterval = setInterval(checkReminder, 30000);
  }

  function stopChecking() {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }

  function checkReminder() {
    const settings = Storage.getSettings();
    if (!settings.reminderEnabled) return;

    const now = new Date();
    const today = Timer.formatDate(now);

    // 今天已经提醒过了，跳过
    if (lastReminderDate === today) return;

    // 解析提醒时间
    const [hour, minute] = settings.reminderTime.split(':').map(Number);

    // 检查当前时间是否 >= 提醒时间（允许 2 分钟的误差窗口）
    const reminderMinutes = hour * 60 + minute;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentMinutes >= reminderMinutes && currentMinutes < reminderMinutes + 2) {
      sendReminder();
      lastReminderDate = today;
      localStorage.setItem('study_last_reminder_date', today);
    }
  }

  // ==================== 发送提醒 ====================

  function sendReminder() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
      // 尝试请求权限
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          doNotify();
        }
      });
      return;
    }

    doNotify();
  }

  function doNotify() {
    const messages = [
      '📚 该学习啦！今天的坚持，明天的收获。',
      '⏰ 学习时间到！每天进步一点点。',
      '🌟 别忘了今天的学习计划哦～',
      '💪 自律的人最自由，开始学习吧！',
      '🎯 设定的学习时间到了，加油！'
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];

    new Notification('学习计时器', {
      body: msg,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%234CAF50"/></svg>',
      tag: 'study-reminder',
      requireInteraction: true,
      vibrate: [200, 100, 200]
    });
  }

  // ==================== 公开 API ====================

  function refreshSettings() {
    syncSettingsUI();

    const settings = Storage.getSettings();
    if (settings.reminderEnabled) {
      startChecking();
    } else {
      stopChecking();
    }
  }

  return {
    init,
    refreshSettings
  };
})();
