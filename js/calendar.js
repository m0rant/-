/* ============================================================
   calendar.js — 日历页面逻辑
   - 月视图渲染
   - 月份切换
   - 记录标记（绿点）
   - 日期点击查看详情弹窗
   ============================================================ */

const Calendar = (() => {
  // 当前显示的年份和月份
  let currentYear, currentMonth;

  // DOM 元素
  let elGrid, elMonthLabel, elModal, elModalDate, elModalTime, elModalSessions;

  // ==================== 初始化 ====================

  function init() {
    elGrid = document.getElementById('calendarGrid');
    elMonthLabel = document.getElementById('monthLabel');
    elModal = document.getElementById('dayModal');
    elModalDate = document.getElementById('modalDate');
    elModalTime = document.getElementById('modalTime');
    elModalSessions = document.getElementById('modalSessions');

    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth() + 1; // 1-12

    // 月份切换按钮
    document.getElementById('btnPrevMonth').addEventListener('click', () => {
      changeMonth(-1);
    });
    document.getElementById('btnNextMonth').addEventListener('click', () => {
      changeMonth(1);
    });

    // 关闭弹窗
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    elModal.addEventListener('click', e => {
      if (e.target === elModal) closeModal();
    });

    // 监听计时结束事件，自动刷新
    document.addEventListener('timerStopped', () => {
      render();
    });
  }

  // ==================== 渲染 ====================

  function render() {
    renderCalendarGrid();
    updateMonthLabel();
  }

  // ==================== 月份切换 ====================

  function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    } else if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    render();
  }

  function updateMonthLabel() {
    elMonthLabel.textContent = currentYear + '年 ' + currentMonth + '月';
  }

  // ==================== 日历网格 ====================

  function renderCalendarGrid() {
    const recordDates = Storage.getRecordDates();
    const today = Timer.formatDate(new Date());

    // 计算该月第一天和最后一天
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0=周日

    // 上个月的最后几天（补齐）
    const prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate();

    let html = '';

    // 填充上个月的日期（灰色）
    for (let i = 0; i < startDayOfWeek; i++) {
      const day = prevMonthLastDay - startDayOfWeek + i + 1;
      html += `<div class="day-cell other-month">${day}</div>`;
    }

    // 该月的日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === today;
      const hasRecord = recordDates.has(dateStr);

      let cls = 'day-cell';
      if (isToday) cls += ' today';
      if (hasRecord) cls += ' has-record';

      html += `<div class="${cls}" data-date="${dateStr}">${day}</div>`;
    }

    // 填充下个月的日期（凑满 6 行 42 格）
    const totalCells = startDayOfWeek + daysInMonth;
    const remaining = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
    for (let day = 1; day <= remaining; day++) {
      html += `<div class="day-cell other-month">${day}</div>`;
    }

    elGrid.innerHTML = html;

    // 绑定点击事件
    elGrid.querySelectorAll('.day-cell:not(.other-month)').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.dataset.date;
        showDayDetail(dateStr);
      });
    });
  }

  // ==================== 日期详情弹窗 ====================

  function showDayDetail(dateStr) {
    const sessions = Storage.getSessionsByDate(dateStr);
    const totalMs = Storage.getDateTotal(dateStr);
    const today = Timer.formatDate(new Date());

    // 格式化日期标题
    let dateLabel;
    if (dateStr === today) {
      dateLabel = '今天';
    } else {
      const parts = dateStr.split('-');
      dateLabel = parts[0] + '年' + parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日';
    }
    elModalDate.textContent = dateLabel;

    // 时长
    elModalTime.textContent = totalMs > 0
      ? Timer.formatDurationShort(totalMs)
      : '暂无记录';

    // 详细记录列表
    if (sessions.length === 0) {
      elModalSessions.innerHTML = '<p style="text-align:center;color:#888;">这一天还没有学习记录</p>';
    } else {
      elModalSessions.innerHTML = sessions.map((s, i) => {
        const startTime = new Date(s.startTime);
        const endTime = new Date(s.endTime);
        const fmt = d =>
          String(d.getHours()).padStart(2, '0') + ':' +
          String(d.getMinutes()).padStart(2, '0');

        return `
          <div class="modal-session-item">
            <span>第 ${i + 1} 段</span>
            <span>${fmt(startTime)} - ${fmt(endTime)}</span>
            <span>${Timer.formatDurationShort(s.duration)}</span>
          </div>`;
      }).join('');
    }

    elModal.classList.add('show');
  }

  function closeModal() {
    elModal.classList.remove('show');
  }

  // ==================== 公开 API ====================
  return {
    init,
    render
  };
})();
