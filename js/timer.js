/* ============================================================
   timer.js — 计时器核心逻辑
   - 开始/停止计时
   - 后台时间追踪（时间戳差值法）
   - 界面实时刷新
   - 通知栏同步显示计时状态
   ============================================================ */

const Timer = (() => {
  // 状态
  let isRunning = false;
  let startTime = null;       // 开始时间戳
  let displayInterval = null; // 刷新界面的定时器
  let notifyInterval = null;  // 刷新通知的定时器
  let notificationId = null;  // 当前通知 ID

  // DOM 元素（延迟绑定）
  let elDisplay, elBtn, elBtnText, elRing, elTodayTime;

  // ==================== 初始化 ====================

  function init() {
    elDisplay = document.getElementById('timerDisplay');
    elBtn = document.getElementById('btnTimer');
    elBtnText = document.getElementById('btnTimerText');
    elRing = document.getElementById('ringProgress');
    elTodayTime = document.getElementById('todayTime');

    elBtn.addEventListener('click', () => {
      if (isRunning) {
        stopTimer();
      } else {
        startTimer();
      }
    });

    // 恢复未完成的计时
    restoreActiveSession();

    // 更新今日时间显示
    updateTodayDisplay();

    // 页面可见性变化时刷新显示
    document.addEventListener('visibilitychange', () => {
      if (isRunning && !document.hidden) {
        updateDisplay();
      }
    });
  }

  // ==================== 开始计时 ====================

  function startTimer() {
    if (isRunning) return;

    isRunning = true;
    startTime = Date.now();

    // 保存到 localStorage，防止页面关闭丢失
    Storage.saveActiveSession({ startTime });

    // 更新 UI
    elBtn.classList.add('running');
    elBtnText.textContent = '结束学习';

    // 启动显示刷新（每秒 5 次，保证秒级流畅）
    displayInterval = setInterval(updateDisplay, 200);
    updateDisplay();

    // 通知栏刷新（每 60 秒刷新一次，避免过于频繁）
    showNotification();
    notifyInterval = setInterval(updateNotification, 60000);

    // 请求通知权限
    requestNotificationPermission();
  }

  // ==================== 停止计时 ====================

  function stopTimer() {
    if (!isRunning) return;

    const endTime = Date.now();
    const duration = endTime - startTime;
    const date = formatDate(new Date(startTime));

    // 保存学习记录
    Storage.saveSession({
      id: String(startTime),
      date: date,
      startTime: startTime,
      endTime: endTime,
      duration: duration
    });

    // 清除状态
    isRunning = false;
    startTime = null;
    Storage.clearActiveSession();

    // 停止定时器
    clearInterval(displayInterval);
    clearInterval(notifyInterval);
    displayInterval = null;
    notifyInterval = null;

    // 更新 UI
    elBtn.classList.remove('running');
    elBtnText.textContent = '开始学习';
    elDisplay.textContent = '00:00:00';
    elRing.style.strokeDashoffset = '565.49';

    // 关闭通知
    closeNotification();

    // 刷新今日时间
    updateTodayDisplay();

    // 通知外部（统计和日历需要刷新）
    document.dispatchEvent(new CustomEvent('timerStopped'));
  }

  // ==================== 恢复计时 ====================

  /** 页面加载时检查是否有未完成的计时 */
  function restoreActiveSession() {
    const active = Storage.getActiveSession();
    if (active && active.startTime) {
      isRunning = true;
      startTime = active.startTime;

      elBtn.classList.add('running');
      elBtnText.textContent = '结束学习';

      displayInterval = setInterval(updateDisplay, 200);
      updateDisplay();

      showNotification();
      notifyInterval = setInterval(updateNotification, 60000);
    }
  }

  // ==================== 刷新显示 ====================

  function updateDisplay() {
    if (!isRunning || !startTime) return;

    const elapsed = Date.now() - startTime;
    const formatted = formatDuration(elapsed);

    // 更新数字显示
    elDisplay.textContent = formatted;

    // 更新进度环（每 60 秒一圈）
    const secondsInMinute = (elapsed / 1000) % 60;
    const progress = secondsInMinute / 60;
    const circumference = 565.49;
    const offset = circumference * (1 - progress);
    elRing.style.strokeDashoffset = String(offset);
  }

  /** 刷新"今日已学"显示 */
  function updateTodayDisplay() {
    const today = formatDate(new Date());
    let duration = Storage.getDateTotal(today);

    // 如果正在计时，加上当前计时
    if (isRunning && startTime &&
        formatDate(new Date(startTime)) === today) {
      duration += (Date.now() - startTime);
    }

    elTodayTime.textContent = formatDurationShort(duration);
  }

  // ==================== 通知管理 ====================

  async function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  function showNotification() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    closeNotification();

    const elapsed = Date.now() - startTime;
    notificationId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());

    // 使用 Service Worker 显示通知（更持久）
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'showNotification',
        id: notificationId,
        title: '学习中...',
        body: '已学习 ' + formatDuration(elapsed),
        tag: 'study-timer'
      });
    } else {
      // 回退：直接显示
      const notification = new Notification('学习中...', {
        body: '已学习 ' + formatDuration(elapsed),
        tag: 'study-timer',
        requireInteraction: true,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%234CAF50"/></svg>'
      });
      notificationId = 'direct';
    }
  }

  function updateNotification() {
    if (!isRunning) return;

    closeNotification();
    showNotification();
  }

  function closeNotification() {
    if (!('Notification' in window)) return;

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'closeNotification',
        id: notificationId
      });
    }

    // 关闭所有 tag 为 study-timer 的通知
    if ('getNotifications' in ServiceWorkerRegistration.prototype) {
      // 新版 API（如果可用）
    }
  }

  // 处理来自 SW 的消息（通知点击）
  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data?.type === 'notificationClicked') {
      // 用户点击了通知，聚焦到 App
      window.focus();
    }
  });

  // ==================== 工具函数 ====================

  /** 格式化时长 HH:MM:SS */
  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
      .map(n => String(n).padStart(2, '0'))
      .join(':');
  }

  /** 格式化时长（简短版）"X 小时 Y 分钟" */
  function formatDurationShort(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    if (totalMinutes < 60) {
      return totalMinutes + ' 分钟';
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) return hours + ' 小时';
    return hours + ' 小时 ' + minutes + ' 分钟';
  }

  /** 格式化日期 YYYY-MM-DD */
  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ==================== 公开状态查询 ====================

  function isActive() {
    return isRunning;
  }

  function getElapsedMs() {
    if (!isRunning || !startTime) return 0;
    return Date.now() - startTime;
  }

  // ==================== 公开 API ====================
  return {
    init,
    isActive,
    getElapsedMs,
    formatDuration,
    formatDurationShort,
    formatDate
  };
})();
