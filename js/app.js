/* ============================================================
   app.js — 主入口逻辑
   - 初始化所有模块
   - Tab 切换
   - 设置弹窗
   - Service Worker 注册
   ============================================================ */

const App = (() => {

  // ==================== 初始化 ====================

  function init() {
    // 注册 Service Worker
    registerSW();

    // 初始化各个模块
    Timer.init();
    Stats.init();
    Calendar.init();
    Reminder.init();

    // Tab 切换
    initTabNavigation();

    // 设置弹窗
    initSettingsPanel();

    // 清除数据确认弹窗
    initClearDataPanel();

    // 渲染初始视图
    Stats.render();
    Calendar.render();

    // 定时更新今日时间显示（计时中时需要）
    setInterval(() => {
      const todayEl = document.getElementById('todayTime');
      if (todayEl && Timer.isActive()) {
        const today = Timer.formatDate(new Date());
        let duration = Storage.getDateTotal(today);
        duration += Timer.getElapsedMs();
        todayEl.textContent = Timer.formatDurationShort(duration);
      }
    }, 10000);
  }

  // ==================== Service Worker ====================

  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(reg => {
          console.log('SW registered:', reg.scope);

          // 处理 SW 的 notificationclick 事件
          // （通过 message 通道在 timer.js 中处理）
        })
        .catch(err => {
          console.log('SW registration failed:', err);
        });
    }
  }

  // ==================== Tab 导航 ====================

  function initTabNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = {
      pageTimer: document.getElementById('pageTimer'),
      pageStats: document.getElementById('pageStats'),
      pageCalendar: document.getElementById('pageCalendar')
    };

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const pageId = item.dataset.page;

        // 更新导航状态
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        // 切换页面
        Object.values(pages).forEach(p => p.classList.remove('active'));
        pages[pageId].classList.add('active');

        // 切换时刷新数据
        if (pageId === 'pageStats') {
          Stats.render();
        } else if (pageId === 'pageCalendar') {
          Calendar.render();
        }
      });
    });
  }

  // ==================== 设置面板 ====================

  function initSettingsPanel() {
    const settingsModal = document.getElementById('settingsModal');

    // 打开设置
    document.getElementById('btnSettings').addEventListener('click', () => {
      // 同步最新的设置状态
      Reminder.refreshSettings();
      settingsModal.classList.add('show');
    });

    // 关闭设置
    document.getElementById('btnCloseSettings').addEventListener('click', () => {
      settingsModal.classList.remove('show');
    });

    // 点击遮罩关闭
    settingsModal.addEventListener('click', e => {
      if (e.target === settingsModal) {
        settingsModal.classList.remove('show');
      }
    });
  }

  // ==================== 清除数据 ====================

  function initClearDataPanel() {
    const confirmModal = document.getElementById('confirmModal');

    // 点击清除按钮
    document.getElementById('btnClearData').addEventListener('click', () => {
      confirmModal.classList.add('show');
    });

    // 取消
    document.getElementById('btnCancelClear').addEventListener('click', () => {
      confirmModal.classList.remove('show');
    });

    // 确认清除
    document.getElementById('btnConfirmClear').addEventListener('click', () => {
      Storage.clearAllData();

      // 关闭所有弹窗
      confirmModal.classList.remove('show');
      document.getElementById('settingsModal').classList.remove('show');

      // 重置计时器状态
      if (Timer.isActive()) {
        // 如果正在计时，通过停止来关闭（不做保存是因为数据已清除）
        location.reload();
        return;
      }

      // 刷新所有视图
      document.getElementById('timerDisplay').textContent = '00:00:00';
      document.getElementById('todayTime').textContent = '0 分钟';
      Stats.render();
      Calendar.render();

      // 清除提醒记录
      localStorage.removeItem('study_last_reminder_date');
    });

    // 点击遮罩关闭
    confirmModal.addEventListener('click', e => {
      if (e.target === confirmModal) {
        confirmModal.classList.remove('show');
      }
    });
  }

  // ==================== 启动 ====================

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init };
})();
