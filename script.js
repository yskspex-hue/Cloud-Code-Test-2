'use strict';

const currentTimeEl = document.getElementById('currentTime');
const currentDateEl = document.getElementById('currentDate');
const alarmTimeEl   = document.getElementById('alarmTime');
const alarmLabelEl  = document.getElementById('alarmLabel');
const addBtn        = document.getElementById('addBtn');
const alarmListEl   = document.getElementById('alarmList');
const overlay       = document.getElementById('overlay');
const ringTimeEl    = document.getElementById('ringTime');
const ringLabelEl   = document.getElementById('ringLabel');
const stopBtn       = document.getElementById('stopBtn');

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];

let alarms = loadAlarms();
let ringingId = null;
let audioCtx  = null;
let gainNode  = null;

// ── Clock ──────────────────────────────────────────────
function tick() {
  const now = new Date();
  const hh  = String(now.getHours()).padStart(2, '0');
  const mm  = String(now.getMinutes()).padStart(2, '0');
  const ss  = String(now.getSeconds()).padStart(2, '0');
  currentTimeEl.textContent = `${hh}:${mm}:${ss}`;

  const y  = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d  = String(now.getDate()).padStart(2, '0');
  const wd = DAYS[now.getDay()];
  currentDateEl.textContent = `${y}年${mo}月${d}日（${wd}）`;

  checkAlarms(`${hh}:${mm}`);
}

setInterval(tick, 1000);
tick();

// ── Alarm check ────────────────────────────────────────
function checkAlarms(currentHHMM) {
  if (ringingId !== null) return;

  for (const alarm of alarms) {
    if (!alarm.enabled) continue;
    if (alarm.time === currentHHMM) {
      triggerAlarm(alarm);
      break;
    }
  }
}

// ── Add alarm ──────────────────────────────────────────
addBtn.addEventListener('click', () => {
  const time  = alarmTimeEl.value;
  const label = alarmLabelEl.value.trim();

  if (!time) {
    alarmTimeEl.focus();
    return;
  }

  const alarm = { id: Date.now(), time, label, enabled: true };
  alarms.push(alarm);
  alarms.sort((a, b) => a.time.localeCompare(b.time));
  saveAlarms();
  renderAlarms();

  alarmTimeEl.value  = '';
  alarmLabelEl.value = '';
});

// ── Render ─────────────────────────────────────────────
function renderAlarms() {
  if (alarms.length === 0) {
    alarmListEl.innerHTML = '<li class="empty-message">アラームはまだありません</li>';
    return;
  }

  alarmListEl.innerHTML = alarms.map(a => `
    <li class="alarm-item ${a.enabled ? 'active' : 'disabled'}" data-id="${a.id}">
      <div class="alarm-info">
        <span class="alarm-time-text">${a.time}</span>
        ${a.label ? `<span class="alarm-label-text">${escapeHtml(a.label)}</span>` : ''}
      </div>
      <div class="alarm-controls">
        <label class="toggle" title="有効/無効">
          <input type="checkbox" ${a.enabled ? 'checked' : ''} data-action="toggle" data-id="${a.id}" />
          <span class="toggle-slider"></span>
        </label>
        <button class="btn btn-delete" data-action="delete" data-id="${a.id}" title="削除">✕</button>
      </div>
    </li>
  `).join('');
}

alarmListEl.addEventListener('change', e => {
  if (e.target.dataset.action !== 'toggle') return;
  const id    = Number(e.target.dataset.id);
  const alarm = alarms.find(a => a.id === id);
  if (alarm) {
    alarm.enabled = e.target.checked;
    saveAlarms();
    renderAlarms();
  }
});

alarmListEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-action="delete"]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  alarms   = alarms.filter(a => a.id !== id);
  saveAlarms();
  renderAlarms();
});

// ── Ring ───────────────────────────────────────────────
function triggerAlarm(alarm) {
  ringingId = alarm.id;
  ringTimeEl.textContent  = alarm.time;
  ringLabelEl.textContent = alarm.label || '';
  overlay.classList.remove('hidden');
  startBeep();
}

stopBtn.addEventListener('click', () => {
  stopBeep();
  overlay.classList.add('hidden');
  ringingId = null;
});

// ── Beep (Web Audio API) ───────────────────────────────
function startBeep() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  gainNode = audioCtx.createGain();
  gainNode.connect(audioCtx.destination);
  scheduleBeeps();
}

function scheduleBeeps() {
  if (!audioCtx || audioCtx.state === 'closed') return;
  beepTone(0,    0.15, 880);
  beepTone(0.2,  0.15, 880);
  beepTone(0.4,  0.15, 1100);
  beepTone(1.0,  0.15, 880);
  beepTone(1.2,  0.15, 880);
  beepTone(1.4,  0.15, 1100);
  setTimeout(scheduleBeeps, 2400);
}

function beepTone(delayS, durS, freq) {
  const osc  = audioCtx.createOscillator();
  const env  = audioCtx.createGain();
  osc.type   = 'sine';
  osc.frequency.value = freq;
  osc.connect(env);
  env.connect(gainNode);

  const t = audioCtx.currentTime + delayS;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.6, t + 0.01);
  env.gain.linearRampToValueAtTime(0, t + durS);

  osc.start(t);
  osc.stop(t + durS + 0.05);
}

function stopBeep() {
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}

// ── Persistence ────────────────────────────────────────
function saveAlarms() {
  localStorage.setItem('alarms', JSON.stringify(alarms));
}

function loadAlarms() {
  try {
    return JSON.parse(localStorage.getItem('alarms')) || [];
  } catch {
    return [];
  }
}

// ── Util ───────────────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

// ── Init ───────────────────────────────────────────────
renderAlarms();