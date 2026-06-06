/* ─── Config ──────────────────────────────────────────────────────────────── */
const API_BASE = 'http://localhost:8000';

/* ─── State ───────────────────────────────────────────────────────────────── */
let salesData = [];
let trendChart = null;
let productChart = null;
let chatContext = null;

/* ─── DOM ─────────────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

/* ─────────────────────────────────────────────────────────────────────────── */
/* PARTICLE BACKGROUND                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
(function initParticles() {
  const canvas = $('particles');
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.6 + 0.1,
      color: Math.random() > 0.5 ? '124,58,237' : '6,182,212'
    };
  }

  for (let i = 0; i < 80; i++) particles.push(createParticle());

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();

      // Connect nearby particles
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[j].x - p.x, dy = particles[j].y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(124,58,237,${0.08 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ─────────────────────────────────────────────────────────────────────────── */
/* NAVIGATION                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
const tabTitles = { dashboard: 'Dashboard', transcript: 'Transcript Analyser', salesdata: 'Sales Data Hub', insights: 'AI Insights', chat: 'Ask Your Data' };

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const tab = item.dataset.tab;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    item.classList.add('active');
    $(`tab-${tab}`).classList.add('active');
    $('pageTitle').textContent = tabTitles[tab] || tab;
    // Close sidebar on mobile
    if (window.innerWidth <= 768) document.querySelector('.sidebar').classList.remove('open');
  });
});

$('menuToggle').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));

/* ─────────────────────────────────────────────────────────────────────────── */
/* DARK MODE                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
$('darkToggle').addEventListener('click', () => {
  document.body.classList.toggle('light');
  $('darkToggle').textContent = document.body.classList.contains('light') ? '🌞' : '🌙';
  if (trendChart) updateChartColors();
});

/* ─────────────────────────────────────────────────────────────────────────── */
/* UTILITY                                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */
function showLoader(text = 'Analysing with Claude AI...') {
  $('loaderText').textContent = text;
  $('loaderOverlay').classList.remove('hidden');
}

function hideLoader() { $('loaderOverlay').classList.add('hidden'); }

function showToast(msg, type = 'info') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  setTimeout(() => t.classList.add('hidden'), 3500);
}

function fmt(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toFixed(0);
}

function signalEmoji(type) {
  const map = { buying_interest: '💚', objection: '🚫', confusion: '❓', urgency: '⚡', competitor_mention: '🥊', price_sensitivity: '💸', positive_sentiment: '😊', negative_sentiment: '😟', follow_up_needed: '📅' };
  return map[type] || '🔍';
}

function signalColor(type) {
  const map = { buying_interest: '#34d399', objection: '#fb7185', confusion: '#fbbf24', urgency: '#22d3ee', competitor_mention: '#818cf8', price_sensitivity: '#fbbf24', positive_sentiment: '#34d399', negative_sentiment: '#fb7185', follow_up_needed: '#22d3ee' };
  return map[type] || '#a855f7';
}

async function apiCall(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + endpoint, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API error');
  }
  return res.json();
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* TRANSCRIPT ANALYSER                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
const SAMPLE_TRANSCRIPT = `Rep: Thanks for taking the time to meet today. How has the quarter been looking for your team?
Prospect: Honestly, a bit rough. We've been struggling to hit our targets consistently.
Rep: I totally understand. That's actually one of the core problems our platform addresses. Let me show you how it works.
Prospect: That's actually interesting — we've been looking for something like this.
Rep: Our platform runs at $499 per seat per month.
Prospect: That seems steep. We currently pay under $200 per seat.
Rep: If your team closes even one extra deal per quarter, it pays for itself 10x over.
Prospect: Hmm. Can you send me a pricing deck and maybe a case study? I'd like to share it with my manager before making any decision.
Rep: Absolutely. When do you think you'd be in a position to decide?
Prospect: We're planning budgets in about 6 weeks, so ideally before then.`;

$('loadSampleTranscript').addEventListener('click', () => {
  $('transcriptInput').value = SAMPLE_TRANSCRIPT;
});

$('clearTranscriptBtn').addEventListener('click', () => {
  $('transcriptInput').value = '';
  $('signalsContainer').innerHTML = `<div class="signals-empty"><div class="empty-state"><div class="empty-icon">🎙️</div><p>Paste a transcript and click Analyse to see AI-detected signals</p></div></div>`;
  $('transcriptSummary').classList.add('hidden');
});

$('analyseBtn').addEventListener('click', async () => {
  const transcript = $('transcriptInput').value.trim();
  if (!transcript) { showToast('Please paste a transcript first', 'error'); return; }
  showLoader('Detecting signals with Claude AI...');
  try {
    const result = await apiCall('/analyse', 'POST', { transcript });
    renderSignals(result);
    showToast('✅ Analysis complete!', 'success');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  } finally {
    hideLoader();
  }
});

function renderSignals(result) {
  const { signals = [], overall_sentiment, deal_score, summary } = result;
  const container = $('signalsContainer');

  if (!signals.length) {
    container.innerHTML = '<p class="empty-msg">No signals detected. Try a longer transcript.</p>';
    return;
  }

  container.innerHTML = signals.map((s, i) => `
    <div class="signal-card ${s.type}" style="animation-delay:${i * 0.08}s">
      <div class="signal-type" style="background:${signalColor(s.type)}22;color:${signalColor(s.type)}">
        ${signalEmoji(s.type)} ${s.type.replace(/_/g, ' ')}
      </div>
      <div class="signal-quote">"${s.quote}"</div>
      <div class="signal-tip">💡 ${s.tip}</div>
      ${s.confidence !== undefined ? `
        <div class="signal-confidence">
          <span>Confidence: ${s.confidence}%</span>
          <div class="confidence-bar"><div class="confidence-fill" style="width:${s.confidence}%"></div></div>
        </div>` : ''}
    </div>`).join('');

  if (overall_sentiment || deal_score !== undefined || summary) {
    const sumEl = $('transcriptSummary');
    sumEl.innerHTML = `
      <div class="summary-row">
        <span class="summary-badge ${overall_sentiment || 'neutral'}">
          ${overall_sentiment === 'positive' ? '😊' : overall_sentiment === 'negative' ? '😟' : '😐'} ${overall_sentiment || 'neutral'} sentiment
        </span>
        ${deal_score !== undefined ? `
          <div class="deal-score-bar" style="flex:1">
            <span style="font-weight:700;color:var(--purple-300)">Deal Score: ${deal_score}</span>
            <div class="deal-bar-track"><div class="deal-bar-fill" style="width:${deal_score}%"></div></div>
          </div>` : ''}
      </div>
      ${summary ? `<p style="font-size:13px;color:var(--text-secondary);line-height:1.6">${summary}</p>` : ''}`;
    sumEl.classList.remove('hidden');
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SALES DATA                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
// Drag-and-drop
const uploadZone = $('uploadZone');
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
uploadZone.addEventListener('click', () => $('fileInput').click());

$('fileInput').addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

$('loadDemoData2').addEventListener('click', loadDemo);
$('loadDemoBtn').addEventListener('click', () => { loadDemo(); navTo('salesdata'); });

async function loadDemo() {
  showLoader('Generating demo data...');
  try {
    const res = await apiCall('/sample-data');
    salesData = res.data;
    renderDataPreview(salesData);
    showToast(`✅ Loaded ${salesData.length} records`, 'success');
  } catch {
    salesData = generateLocalDemo();
    renderDataPreview(salesData);
    showToast('✅ Loaded local demo data', 'success');
  } finally {
    hideLoader();
  }
}

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      let data;
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(e.target.result);
        data = Array.isArray(parsed) ? parsed : parsed.data || [];
      } else {
        // CSV
        const lines = e.target.result.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        data = lines.slice(1).filter(l => l.trim()).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
          return Object.fromEntries(headers.map((h, i) => [h, isNaN(vals[i]) ? vals[i] : Number(vals[i])]));
        });
      }
      salesData = data;
      renderDataPreview(salesData);
      showToast(`✅ Loaded ${salesData.length} records`, 'success');
    } catch {
      showToast('❌ Failed to parse file', 'error');
    }
  };
  reader.readAsText(file);
}

function renderDataPreview(data) {
  const preview = $('dataPreview');
  if (!data.length) return;
  preview.classList.remove('hidden');
  $('dataRecordCount').textContent = `${data.length} records`;

  const keys = Object.keys(data[0]).slice(0, 8);
  $('tableHead').innerHTML = keys.map(k => `<th>${k}</th>`).join('');
  $('tableBody').innerHTML = data.slice(0, 20).map(row =>
    `<tr>${keys.map(k => `<td>${typeof row[k] === 'number' && k.toLowerCase().includes('sale') ? fmt(row[k]) : row[k] ?? '—'}</td>`).join('')}</tr>`
  ).join('');
}

$('runAnalysisBtn').addEventListener('click', runFullAnalysis);

async function runFullAnalysis() {
  if (!salesData.length) { showToast('No data loaded', 'error'); return; }
  showLoader('Running AI analysis...');
  try {
    const [analysis, insights] = await Promise.all([
      apiCall('/analyze', 'POST', { data: salesData }),
      apiCall('/get-insights', 'POST', { data: salesData })
    ]);
    renderDashboard(analysis);
    renderInsights(insights);
    chatContext = JSON.stringify({ total: analysis.total_revenue, signals: analysis.signals?.length, top: analysis.top_product });
    showToast('✅ Analysis complete! Check Dashboard & Insights tabs.', 'success');
    navTo('dashboard');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  } finally {
    hideLoader();
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* DASHBOARD RENDER                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
function renderDashboard(analysis) {
  const { total_revenue, top_product, worst_product, alerts = [], product_breakdown = [], customer_signals = {}, chart_data = {} } = analysis;

  // KPIs
  animateCounter('kpiRevenue', total_revenue || 0, v => fmt(v));
  $('kpiOrders').textContent = salesData.length;
  $('kpiTopProduct').textContent = top_product || '—';
  $('kpiAlerts').textContent = alerts.length;

  // Charts
  if (chart_data.trend) renderTrendChart(chart_data.trend);
  if (chart_data.products) renderProductChart(chart_data.products);

  // Alerts
  const alertsList = $('alertsList');
  if (alerts.length) {
    alertsList.innerHTML = alerts.map(a => `
      <div class="alert-item ${a.type}">
        <span class="alert-icon">${a.type === 'spike' ? '🚀' : '📉'}</span>
        <span>${a.message}</span>
      </div>`).join('');
  } else {
    alertsList.innerHTML = '<p class="empty-msg">No significant alerts 🎉</p>';
  }

  // Customers
  const customerList = $('customerList');
  if (customer_signals.high_value?.length) {
    customerList.innerHTML = customer_signals.high_value.map((c, i) => `
      <div class="customer-row">
        <div>
          <span style="color:var(--text-muted);margin-right:8px">#${i + 1}</span>
          <span class="customer-name">${c.customer}</span>
        </div>
        <div>
          <span class="customer-value">${fmt(c.total)}</span>
          <span style="font-size:11px;color:var(--text-muted);margin-left:6px">${c.orders} orders</span>
        </div>
      </div>`).join('');
  }
}

function animateCounter(id, target, format) {
  const el = $(id);
  const start = 0, duration = 1200;
  const startTime = performance.now();
  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = format ? format(start + (target - start) * eased) : Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* CHARTS                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
const chartDefaults = {
  font: { family: "'Segoe UI', system-ui, sans-serif" },
  color: '#a09dc0'
};

function renderTrendChart(data) {
  const ctx = document.getElementById('trendChart');
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Revenue',
        data: data.values,
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124,58,237,0.12)',
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#a855f7',
        pointBorderColor: '#1a1a2e',
        pointBorderWidth: 2,
        tension: 0.45,
        fill: true
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.parsed.y) } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#a09dc0', maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#a09dc0', callback: v => fmt(v) } }
      }
    }
  });
}

function renderProductChart(data) {
  const ctx = document.getElementById('productChart');
  if (productChart) productChart.destroy();
  const colors = ['#7c3aed','#06b6d4','#34d399','#fbbf24','#fb7185','#818cf8','#f97316'];
  productChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: colors.slice(0, data.labels.length),
        borderColor: '#12121e',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#a09dc0', font: { size: 12 }, padding: 14 } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${fmt(ctx.parsed)}` } }
      }
    }
  });
}

function updateChartColors() {
  [trendChart, productChart].forEach(c => { if (c) { c.options.scales?.x && (c.options.scales.x.ticks.color = '#a09dc0'); c.update(); } });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* INSIGHTS RENDER                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
function renderInsights(data) {
  const { insights = [], executive_summary, key_metrics = {}, predictions = [] } = data;
  const container = $('insightsContainer');

  container.innerHTML = `
    ${executive_summary ? `<div class="exec-summary">${executive_summary}</div>` : ''}
    <div class="insights-grid">
      ${insights.map((ins, i) => `
        <div class="insight-card" style="animation-delay:${i * 0.07}s">
          <div class="insight-title">
            <span class="insight-impact-dot impact-${ins.impact}"></span>
            ${ins.title}
          </div>
          <div class="insight-desc">${ins.description}</div>
          <div class="insight-priority priority-${ins.priority}">● ${ins.priority} priority</div>
        </div>`).join('')}
    </div>
    ${predictions.length ? `
      <h3 style="margin-bottom:14px;font-size:16px">🔮 AI Predictions</h3>
      <div class="predictions-grid">
        ${predictions.map(p => `
          <div class="prediction-card">
            <div class="pred-period">${p.period}</div>
            <div class="pred-text">${p.forecast}</div>
            <div class="pred-confidence">Confidence: ${p.confidence}%</div>
          </div>`).join('')}
      </div>` : ''}
    ${Object.keys(key_metrics).length ? `
      <div class="panel" style="margin-top:8px">
        <div class="panel-header"><h3>📊 Key Metrics</h3></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0">
          ${Object.entries(key_metrics).map(([k, v]) => `
            <div style="padding:16px 20px;border-right:1px solid var(--border-light)">
              <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">${k.replace(/_/g,' ')}</div>
              <div style="font-size:15px;font-weight:700;color:var(--text-primary)">${typeof v === 'number' ? fmt(v) : v}</div>
            </div>`).join('')}
        </div>
      </div>` : ''}`;
}

$('goToDataBtn').addEventListener('click', () => navTo('salesdata'));

/* ─────────────────────────────────────────────────────────────────────────── */
/* CHAT                                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */
async function sendChat(message) {
  const messages = $('chatMessages');
  messages.innerHTML += `<div class="chat-msg user"><div class="msg-avatar">You</div><div class="msg-bubble">${message}</div></div>`;

  const typing = document.createElement('div');
  typing.className = 'chat-msg assistant typing-indicator';
  typing.innerHTML = `<div class="msg-avatar">AI</div><div class="msg-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
  messages.appendChild(typing);
  messages.scrollTop = messages.scrollHeight;

  try {
    const res = await apiCall('/chat', 'POST', { question: message, context: chatContext });
    typing.remove();
    messages.innerHTML += `<div class="chat-msg assistant"><div class="msg-avatar">AI</div><div class="msg-bubble">${res.answer}</div></div>`;
  } catch (err) {
    typing.remove();
    messages.innerHTML += `<div class="chat-msg assistant"><div class="msg-avatar">AI</div><div class="msg-bubble" style="color:var(--rose-400)">Sorry, I couldn't process that. ${err.message}</div></div>`;
  }
  messages.scrollTop = messages.scrollHeight;
}

$('chatSendBtn').addEventListener('click', () => {
  const q = $('chatInput').value.trim();
  if (!q) return;
  $('chatInput').value = '';
  sendChat(q);
});

$('chatInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('chatSendBtn').click(); } });

document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => sendChat(btn.dataset.q));
});

/* ─────────────────────────────────────────────────────────────────────────── */
/* HELPERS                                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */
function navTo(tab) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  const item = document.querySelector(`.nav-item[data-tab="${tab}"]`);
  if (item) item.classList.add('active');
  $(`tab-${tab}`).classList.add('active');
  $('pageTitle').textContent = tabTitles[tab] || tab;
}

function generateLocalDemo() {
  const products = ['CRM Pro', 'Analytics Suite', 'AutoPilot', 'DataSync', 'LeadBot'];
  const cats = ['Software', 'Analytics', 'Automation', 'Integration', 'AI Tools'];
  const customers = Array.from({ length: 20 }, (_, i) => `Customer_${i + 1}`);
  const data = [];
  const base = new Date('2024-01-01');
  for (let i = 0; i < 90; i++) {
    const d = new Date(base); d.setDate(d.getDate() + i);
    const pi = i % products.length;
    data.push({
      date: d.toISOString().slice(0, 10),
      product: products[pi],
      category: cats[pi],
      sales: Math.max(1000, 15000 + Math.sin(i / 10) * 8000 + Math.random() * 5000),
      units: Math.floor(Math.random() * 150) + 10,
      customer: customers[Math.floor(Math.random() * customers.length)],
      region: ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)],
      rep: `Rep_${Math.floor(Math.random() * 5) + 1}`
    });
  }
  return data;
}

/* ─── Check API status on load ───────────────────────────────────────────── */
(async function checkAPI() {
  try {
    await fetch(API_BASE + '/');
  } catch {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('.api-status span:last-child');
    if (dot) { dot.style.background = '#fb7185'; dot.style.boxShadow = '0 0 8px #fb7185'; }
    if (text) text.textContent = 'API Offline';
  }
})();