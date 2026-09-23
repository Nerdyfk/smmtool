/* Toolkity Next - Dashboard Real-Time Velocity & Network Growth Chart */

class DashboardChartController {
  constructor() {
    this.container = document.getElementById('dashboard-chart-container');
    this.svg = document.getElementById('dashboard-velocity-svg');
    this.areaPath = document.getElementById('chart-area-path');
    this.strokePath = document.getElementById('chart-stroke-path');
    this.pointsGroup = document.getElementById('chart-points-group');
    this.tooltip = document.getElementById('chart-tooltip');
    this.tooltipTime = document.getElementById('tooltip-time');
    this.tooltipVal = document.getElementById('tooltip-val');
    this.timeTicks = document.getElementById('chart-time-ticks');

    // Telemetry display elements
    this.telPeak = document.getElementById('chart-telemetry-peak');
    this.telAvg = document.getElementById('chart-telemetry-avg');
    this.telCompletion = document.getElementById('chart-telemetry-completion');
    this.telClusters = document.getElementById('chart-telemetry-clusters');

    this.activeTimeframe = '24h';
    this.datasets = {
      '24h': {
        area: 'M 0 185 C 60 170, 100 120, 160 110 C 220 100, 260 145, 320 125 C 380 105, 420 55, 480 65 C 540 75, 580 40, 640 45 C 700 50, 740 75, 800 55 L 800 185 L 0 185 Z',
        stroke: 'M 0 185 C 60 170, 100 120, 160 110 C 220 100, 260 145, 320 125 C 380 105, 420 55, 480 65 C 540 75, 580 40, 640 45 C 700 50, 740 75, 800 55',
        points: [
          { cx: 160, cy: 110, val: '640 orders/h', time: '04:00 AM' },
          { cx: 320, cy: 125, val: '520 orders/h', time: '08:00 AM' },
          { cx: 480, cy: 65,  val: '1,180 orders/h', time: '12:00 PM' },
          { cx: 640, cy: 45,  val: '1,420 orders/h', time: '16:00 PM (Peak)' },
          { cx: 800, cy: 55,  val: '1,385 orders/h', time: 'Live Now', isLive: true }
        ],
        ticks: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Live Now'],
        peak: '1,420 orders/h',
        avg: '890 orders/h',
        completion: '99.96%',
        clusters: '14 Nodes Active'
      },
      '7d': {
        area: 'M 0 185 C 80 140, 140 160, 200 130 C 260 95, 340 110, 400 75 C 460 45, 540 85, 600 50 C 660 25, 720 40, 800 35 L 800 185 L 0 185 Z',
        stroke: 'M 0 185 C 80 140, 140 160, 200 130 C 260 95, 340 110, 400 75 C 460 45, 540 85, 600 50 C 660 25, 720 40, 800 35',
        points: [
          { cx: 200, cy: 130, val: '18.4k orders', time: 'Monday' },
          { cx: 400, cy: 75,  val: '24.9k orders', time: 'Wednesday' },
          { cx: 600, cy: 50,  val: '31.2k orders', time: 'Friday' },
          { cx: 800, cy: 35,  val: '38.6k orders', time: 'Today', isLive: true }
        ],
        ticks: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sunday (Now)'],
        peak: '38,620 orders/day',
        avg: '26,450 orders/day',
        completion: '99.98%',
        clusters: '16 Clusters Online'
      },
      '30d': {
        area: 'M 0 185 C 90 155, 180 135, 270 120 C 360 100, 450 115, 540 80 C 630 50, 710 35, 800 28 L 800 185 L 0 185 Z',
        stroke: 'M 0 185 C 90 155, 180 135, 270 120 C 360 100, 450 115, 540 80 C 630 50, 710 35, 800 28',
        points: [
          { cx: 270, cy: 120, val: '142k requests', time: 'Week 1' },
          { cx: 540, cy: 80,  val: '215k requests', time: 'Week 2' },
          { cx: 800, cy: 28,  val: '348k requests', time: 'Week 4 (Current)', isLive: true }
        ],
        ticks: ['Week 1', 'Week 2', 'Week 3', 'Week 4 (Live)'],
        peak: '1.24M orders/mo',
        avg: '890k orders/mo',
        completion: '99.94%',
        clusters: 'Global Multi-Zone'
      }
    };

    this.init();
  }

  init() {
    if (!this.container || !this.svg) return;
    this.bindButtons();
    this.renderTimeframe('24h');
    this.startLiveSimulation();
  }

  bindButtons() {
    const buttons = document.querySelectorAll('.chart-timeframe-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tf = e.currentTarget.getAttribute('data-timeframe');
        if (!tf || tf === this.activeTimeframe) return;

        buttons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        this.activeTimeframe = tf;
        this.renderTimeframe(tf);
      });
    });
  }

  renderTimeframe(tf) {
    const data = this.datasets[tf];
    if (!data) return;

    if (this.areaPath) this.areaPath.setAttribute('d', data.area);
    if (this.strokePath) this.strokePath.setAttribute('d', data.stroke);

    if (this.pointsGroup) {
      this.pointsGroup.innerHTML = data.points.map((p, idx) => `
        <circle cx="${p.cx}" cy="${p.cy}" r="${p.isLive ? '5' : '4.5'}"
          class="${p.isLive ? 'chart-point-pulse' : 'chart-point'}"
          data-val="${p.val}"
          data-time="${p.time}"
          data-idx="${idx}">
        </circle>
      `).join('');

      this.bindPoints();
    }

    if (this.timeTicks && data.ticks) {
      this.timeTicks.innerHTML = data.ticks.map((t, idx) => {
        const isLast = idx === data.ticks.length - 1;
        return `<span style="${isLast ? 'color: var(--color-emerald); font-weight: 700;' : ''}">${t}</span>`;
      }).join('');
    }

    if (this.telPeak) this.telPeak.textContent = data.peak;
    if (this.telAvg) this.telAvg.textContent = data.avg;
    if (this.telCompletion) this.telCompletion.textContent = data.completion;
    if (this.telClusters) this.telClusters.textContent = data.clusters;
  }

  bindPoints() {
    const circles = this.pointsGroup.querySelectorAll('circle');
    circles.forEach(c => {
      const showTooltip = () => {
        const val = c.getAttribute('data-val');
        const time = c.getAttribute('data-time');
        if (this.tooltipTime) this.tooltipTime.textContent = time;
        if (this.tooltipVal) this.tooltipVal.textContent = val;
        if (this.tooltip) {
          this.tooltip.style.opacity = '1';
          this.tooltip.style.transform = 'scale(1)';
        }
      };

      c.addEventListener('mouseenter', showTooltip);
      c.addEventListener('touchstart', showTooltip, { passive: true });
    });
  }

  startLiveSimulation() {
    // Subtle real-time oscillation to keep the chart dynamically live
    setInterval(() => {
      if (this.activeTimeframe !== '24h') return;
      const liveCircle = this.pointsGroup?.querySelector('.chart-point-pulse');
      if (!liveCircle) return;

      const randomJitter = Math.floor(Math.random() * 40) - 20;
      const currentRate = 1385 + randomJitter;
      liveCircle.setAttribute('data-val', `${currentRate.toLocaleString()} orders/h`);

      if (this.telPeak) {
        const peakVal = Math.max(1420, currentRate + 15);
        this.telPeak.textContent = `${peakVal.toLocaleString()} orders/h`;
      }
    }, 4500);
  }
}

// Instantiate on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.dashboardChart = new DashboardChartController();
});
