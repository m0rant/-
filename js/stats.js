/* ============================================================
   stats.js — 统计页面逻辑
   - 累计总时长 / 日均学习
   - 本周柱状图
   - 最近记录列表
   ============================================================ */

const Stats = (() => {
  // DOM 元素
  let elTotal, elDaily, elChartBars, elChartLabels, elRecentList;

  // ==================== 初始化 ====================

  function init() {
    elTotal = document.getElementById('statTotal');
    elDaily = document.getElementById('statDaily');
    elChartBars = document.getElementById('chartBars');
    elChartLabels = document.getElementById('chartLabels');
    elRecentList = document.getElementById('recentList');

    // 监听计时结束事件，自动刷新
    document.addEventListener('timerStopped', render);
  }

  // ==================== 渲染 ====================

  function render() {
    renderSummary();
    renderWeeklyChart();
    renderRecentRecords();
  }

  // ==================== 累计 / 日均 ====================

  function renderSummary() {
    const totalDuration = Storage.getTotalDuration();
    const dailyAverage = Storage.getDailyAverage();

    // 累计总时长
    if (totalDuration === 0) {
      elTotal.textContent = '0 小时';
    } else {
      const totalHours = totalDuration / 3600000;
      if (totalHours < 1) {
        const mins = Math.floor(totalDuration / 60000);
        elTotal.textContent = mins + ' 分钟';
      } else if (totalHours < 100) {
        elTotal.textContent = totalHours.toFixed(1) + ' 小时';
      } else {
        elTotal.textContent = Math.floor(totalHours) + ' 小时';
      }
    }

    // 日均
    if (dailyAverage === 0) {
      elDaily.textContent = '0 分钟';
    } else {
      const avgMinutes = dailyAverage / 60000;
      if (avgMinutes < 60) {
        elDaily.textContent = Math.round(avgMinutes) + ' 分钟';
      } else {
        const h = Math.floor(avgMinutes / 60);
        const m = Math.round(avgMinutes % 60);
        elDaily.textContent = h + 'h ' + m + 'm';
      }
    }
  }

  // ==================== 本周柱状图 ====================

  function renderWeeklyChart() {
    const days = getWeekDays();
    const dayData = days.map(d => ({
      label: d.label,
      date: d.dateStr,
      duration: Storage.getDateTotal(d.dateStr)
    }));

    const maxDuration = Math.max(...dayData.map(d => d.duration), 60000);

    // 柱状图
    elChartBars.innerHTML = dayData.map((d, i) => {
      const heightPct = d.duration > 0
        ? Math.max((d.duration / maxDuration) * 100, 4)
        : 0;
      const isToday = d.date === formatToday();
      const displayValue = d.duration > 0
        ? formatChartValue(d.duration)
        : '';

      return `
        <div class="chart-bar-wrap">
          <span class="chart-bar-value">${displayValue}</span>
          <div class="chart-bar${isToday ? ' today' : ''}"
               style="height: ${heightPct}%"></div>
        </div>`;
    }).join('');

    // 标签
    elChartLabels.innerHTML = dayData.map(d => {
      const isToday = d.date === formatToday();
      return `<span class="chart-label${isToday ? ' today' : ''}">${d.label}</span>`;
    }).join('');
  }

  /** 获取本周日期列表（周一到周日） */
  function getWeekDays() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // 以周一为起始（如果今天是周日，dayOfWeek=0）
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + mondayOffset + i);
      days.push({
        label: ['一','二','三','四','五','六','日'][i],
        dateStr: Timer.formatDate(date)
      });
    }
    return days;
  }

  function formatToday() {
    return Timer.formatDate(new Date());
  }

  function formatChartValue(ms) {
    const mins = Math.round(ms / 60000);
    if (mins < 60) return mins + '分';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) return h + 'h';
    return h + 'h' + m + 'm';
  }

  // ==================== 最近记录 ====================

  function renderRecentRecords() {
    const recent = Storage.getRecentSessions(5);

    if (recent.length === 0) {
      elRecentList.innerHTML = '<div class="empty-hint">还没有学习记录，快去开始吧 ✨</div>';
      return;
    }

    elRecentList.innerHTML = recent.map(s => {
      const dateLabel = formatDateLabel(s.date);
      const timeRange = formatTimeRange(s.startTime, s.endTime);
      const duration = Timer.formatDurationShort(s.duration);

      return `
        <div class="record-item">
          <div>
            <div class="record-date">${dateLabel}</div>
            <div class="record-time">${timeRange}</div>
          </div>
          <div class="record-duration">${duration}</div>
        </div>`;
    }).join('');
  }

  /** 格式化日期为友好显示 */
  function formatDateLabel(dateStr) {
    const today = formatToday();
    const yesterday = Timer.formatDate(
      new Date(Date.now() - 86400000)
    );

    if (dateStr === today) return '今天';
    if (dateStr === yesterday) return '昨天';

    const parts = dateStr.split('-');
    return parts[1] + '月' + parts[2] + '日';
  }

  /** 格式化时间范围 */
  function formatTimeRange(startMs, endMs) {
    const s = new Date(startMs);
    const e = new Date(endMs);
    const fmt = d =>
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0');
    return fmt(s) + ' - ' + fmt(e);
  }

  // ==================== 公开 API ====================
  return {
    init,
    render
  };
})();
