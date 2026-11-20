// Leonida Legend — trophy tracker. Loads the trophy list and the roadmap
// from the guide's own data files, renders the checklist, and keeps earned
// trophies in localStorage. Nothing here reaches the network: the only
// fetches are the guide's own JSON files under data/.

const PROGRESS_KEY = 'leonida-legend-progress-v1';
const SETTINGS_KEY = 'leonida-legend-settings-v1';

const listEl = document.getElementById('trophyList');
const countEl = document.getElementById('shownCount');
const searchEl = document.getElementById('searchBox');
const chipsEl = document.getElementById('kindChips');
const gradeEl = document.getElementById('gradeFilter');
const hideEarnedEl = document.getElementById('hideEarned');
const spoilerEl = document.getElementById('spoilerToggle');
const onlineNoteEl = document.getElementById('onlineNote');
const fillEl = document.getElementById('progressFill');
const textEl = document.getElementById('progressText');

let allTrophies = [];
let roadmapData = { stages: [], note: '', title: '' };
let earned = new Set(readJSON(PROGRESS_KEY, []));
let prefs = readJSON(SETTINGS_KEY, { spoilers: false, hideEarned: false });
let kindFilter = 'all';
let openGuideId = null;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable: progress just won't persist
  }
}

function esc(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function gradeWord(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function spoilerHidden(trophy) {
  return prefs.spoilers && trophy.kind === 'story' && !earned.has(trophy.id);
}

function trophyVisible(trophy) {
  const query = searchEl.value.trim().toLowerCase();
  if (kindFilter === 'story' && trophy.kind !== 'story') return false;
  if (kindFilter === 'missable' && !trophy.missable) return false;
  if (kindFilter === 'collectibles' && trophy.kind !== 'collectibles') return false;
  if (kindFilter === 'activities' && trophy.kind !== 'activities') return false;
  if (kindFilter === 'online') return false;
  if (gradeEl.value !== 'all' && trophy.grade !== gradeEl.value) return false;
  if (prefs.hideEarned && earned.has(trophy.id)) return false;
  if (query) {
    const hay = (trophy.name + ' ' + trophy.description + ' ' + (trophy.guide || '') + ' ' + (trophy.count || '')).toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function renderProgress() {
  const done = allTrophies.filter((t) => earned.has(t.id)).length;
  const total = allTrophies.length || 55;
  fillEl.style.width = ((done / total) * 100).toFixed(1) + '%';
  textEl.textContent = done + ' / ' + total + ' earned';
}

function renderRoadmap() {
  const noteEl = document.getElementById('roadmapNote');
  noteEl.textContent = roadmapData.note || '';
  const stagesEl = document.getElementById('stages');
  stagesEl.replaceChildren();
  for (const stage of roadmapData.stages) {
    const members = allTrophies.filter((t) => t.stage === stage.number);
    const item = document.createElement('li');
    const earnedHere = members.filter((t) => earned.has(t.id)).length;
    item.innerHTML =
      '<h3><span class="num">' + stage.number + '</span>' + esc(stage.title) + '</h3>' +
      '<p class="hours">' + esc(stage.hours) + ' · ' + earnedHere + '/' + members.length + ' trophies in this stage</p>' +
      '<p>' + esc(stage.text) + '</p>';
    stagesEl.appendChild(item);
  }
}

function cardHTML(trophy) {
  const hidden = spoilerHidden(trophy);
  const name = hidden ? 'Hidden story trophy' : trophy.name;
  const desc = hidden ? 'Earn this trophy to reveal its name and description.' : trophy.description;
  const tags = [];
  tags.push('<span class="tag">' + esc(trophy.kind) + '</span>');
  if (trophy.hidden) tags.push('<span class="tag hidden">Hidden on PSN</span>');
  if (trophy.missable) tags.push('<span class="tag missable">⚠ Missable</span>');
  tags.push('<span class="tag">Stage ' + trophy.stage + '</span>');
  const open = openGuideId === trophy.id;
  let guide = '';
  if (open && !hidden) {
    const steps = (trophy.steps || []).map((s) => '<li>' + esc(s) + '</li>').join('');
    const links = (trophy.sources || [])
      .map((s) => '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a></li>')
      .join('');
    guide =
      '<div class="guide open">' +
      '<p>' + esc(trophy.guide || '') + '</p>' +
      (trophy.count ? '<p class="count-line"><strong>Count:</strong> ' + esc(trophy.count) + '</p>' : '') +
      (steps ? '<ol>' + steps + '</ol>' : '') +
      '<div class="sources"><strong>Sources</strong><ul>' + links + '</ul></div>' +
      '</div>';
  }
  return (
    '<div class="card-head">' +
    '<input type="checkbox" data-id="' + trophy.id + '"' + (earned.has(trophy.id) ? ' checked' : '') + ' aria-label="Mark ' + esc(name) + ' earned">' +
    '<div class="card-name"><h3>' + esc(name) + '</h3><p class="desc">' + esc(desc) + '</p></div>' +
    '<span class="grade ' + esc(trophy.grade) + '">' + esc(trophy.grade) + '</span>' +
    '</div>' +
    '<div class="tags">' + tags.join('') + '</div>' +
    (hidden
      ? '<p class="guide-btn" aria-hidden="true">Guide hidden until earned</p>'
      : '<button type="button" class="guide-btn" data-guide="' + trophy.id + '">' + (open ? 'Hide guide' : 'Read guide') + '</button>') +
    guide
  );
}

function renderList() {
  const shown = allTrophies.filter(trophyVisible);
  listEl.replaceChildren();
  if (shown.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-note';
    p.textContent = kindFilter === 'online'
      ? 'There are no online trophies in this list — all 55 are earned offline.'
      : 'No trophies match these filters. Try clearing the search or picking another kind.';
    listEl.appendChild(p);
  }
  for (const trophy of shown) {
    const article = document.createElement('article');
    article.className = 'card' + (earned.has(trophy.id) ? ' earned' : '');
    article.dataset.id = String(trophy.id);
    article.innerHTML = cardHTML(trophy);
    listEl.appendChild(article);
  }
  countEl.textContent = 'Showing ' + shown.length + ' of ' + allTrophies.length + ' trophies';
  onlineNoteEl.hidden = kindFilter !== 'online';
  renderProgress();
}

function saveProgress() {
  writeJSON(PROGRESS_KEY, [...earned]);
  writeJSON(SETTINGS_KEY, prefs);
}

function exportProgress() {
  const payload = { game: 'Grand Theft Auto VI', exportedAt: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error('bad file');
      const valid = new Set(allTrophies.map((t) => t.id));
      earned = new Set(ids.filter((id) => valid.has(Number(id))).map(Number));
      saveProgress();
      renderRoadmap();
      renderList();
    } catch {
      alert('That file is not a Leonida Legend progress export.');
    }
  };
  reader.readAsText(file);
}

listEl.addEventListener('change', (event) => {
  const box = event.target.closest('input[type="checkbox"][data-id]');
  if (!box) return;
  const id = Number(box.dataset.id);
  if (box.checked) earned.add(id); else earned.delete(id);
  saveProgress();
  renderRoadmap();
  renderList();
});

listEl.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-guide]');
  if (!btn) return;
  const id = Number(btn.dataset.guide);
  openGuideId = openGuideId === id ? null : id;
  renderList();
  if (openGuideId !== null) {
    const card = listEl.querySelector('[data-id="' + openGuideId + '"]');
    if (card) card.scrollIntoView({ block: 'nearest' });
  }
});

chipsEl.addEventListener('click', (event) => {
  const chip = event.target.closest('button[data-kind]');
  if (!chip) return;
  kindFilter = chip.dataset.kind;
  for (const c of chipsEl.querySelectorAll('.chip')) c.classList.toggle('active', c === chip);
  renderList();
});

searchEl.addEventListener('input', renderList);
gradeEl.addEventListener('change', renderList);

hideEarnedEl.addEventListener('change', () => {
  prefs.hideEarned = hideEarnedEl.checked;
  saveProgress();
  renderList();
});

spoilerEl.addEventListener('change', () => {
  prefs.spoilers = spoilerEl.checked;
  saveProgress();
  renderList();
});

document.getElementById('exportBtn').addEventListener('click', exportProgress);
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (file) importProgress(file);
  event.target.value = '';
});

async function boot() {
  const [trophyRes, roadmapRes] = await Promise.all([
    fetch('data/trophies.json'),
    fetch('data/roadmap.json'),
  ]);
  const trophyData = await trophyRes.json();
  roadmapData = await roadmapRes.json();
  allTrophies = trophyData.trophies || trophyData;

  hideEarnedEl.checked = prefs.hideEarned;
  spoilerEl.checked = prefs.spoilers;

  const params = new URLSearchParams(location.search);
  const guideParam = params.get('guide');
  if (guideParam) {
    const found = allTrophies.find((t) => String(t.id) === guideParam || t.name.toLowerCase() === guideParam.toLowerCase());
    if (found) openGuideId = found.id;
  }
  if (params.get('spoilers') === '1' || params.get('spoiler') === '1') {
    prefs.spoilers = true;
    spoilerEl.checked = true;
  }
  const earnedParam = params.get('earned');
  if (earnedParam) {
    const ids = earnedParam.split(',').map(Number).filter((n) => allTrophies.some((t) => t.id === n));
    for (const id of ids) earned.add(id);
    saveProgress();
  }

  renderRoadmap();
  renderList();

  if (params.get('scroll') === 'roadmap') {
    document.getElementById('roadmap').scrollIntoView();
  } else if (openGuideId !== null) {
    const card = listEl.querySelector('[data-id="' + openGuideId + '"]');
    if (card) card.scrollIntoView({ block: 'start' });
  }
  window.__shotReady = true;
}

boot();
