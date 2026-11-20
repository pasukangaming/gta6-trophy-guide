// Leonida Legend — the trophy tracker. Loads the trophy list and the
// roadmap from the guide's own data files, renders the checklist, and
// keeps earned trophies in localStorage. Nothing here reaches the
// network: the only fetches are the guide's own JSON files.

const STORE_KEY = 'leonida-legend-progress-v1';
const SETTINGS_KEY = 'leonida-legend-settings-v1';

const cardsEl = document.getElementById('cards');
const emptyEl = document.getElementById('empty');
const metaEl = document.getElementById('list-meta');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoilers');
const hideEarnedEl = document.getElementById('hide-earned');
const chipsEl = document.getElementById('kind-chips');

let trophies = [];
let roadmap = { stages: [] };
let earned = new Set(loadStored(STORE_KEY, []));
let settings = loadStored(SETTINGS_KEY, { spoilers: false, hideEarned: false });
let activeKind = 'all';

function loadStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function isStory(trophy) {
  return trophy.kind === 'story';
}

function isHiddenBySpoilers(trophy) {
  return settings.spoilers && isStory(trophy) && !earned.has(trophy.name);
}

function stageName(stage) {
  return 'Stage ' + stage + ' — ' + (roadmap.stages[stage - 1]?.title ?? 'Roadmap');
}

function renderRoadmap() {
  const stagesEl = document.getElementById('stages');
  stagesEl.replaceChildren();
  for (const stage of roadmap.stages) {
    const members = trophies.filter((t) => t.stage === stage.number);
    const article = document.createElement('article');
    article.className = 'stage';
    const h3 = document.createElement('h3');
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = stage.number;
    h3.append(num, document.createTextNode(stage.title));
    const hours = document.createElement('p');
    hours.className = 'stage-hours';
    hours.textContent = stage.hours + ' · ' + members.length + ' trophies';
    const text = document.createElement('p');
    text.textContent = stage.text;
    const list = document.createElement('ul');
    for (const t of members) {
      const li = document.createElement('li');
      const b = document.createElement('b');
      b.textContent = t.name;
      li.append(b, document.createTextNode(' — ' + t.description));
      list.append(li);
    }
    article.append(h3, hours, text, list);
    stagesEl.append(article);
  }
}

function sourceList(trophy) {
  const wrap = document.createElement('div');
  wrap.className = 'sources';
  const strong = document.createElement('strong');
  strong.textContent = 'Sources: ';
  wrap.append(strong, document.createTextNode('each fact above comes from one of these — check it there.'));
  const ul = document.createElement('ul');
  for (const s of trophy.sources ?? []) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    li.append(a);
    ul.append(li);
  }
  wrap.append(ul);
  return wrap;
}

function trophyCard(trophy) {
  const hidden = isHiddenBySpoilers(trophy);
  const isEarned = earned.has(trophy.name);
  const card = document.createElement('article');
  card.className = 'card' + (isEarned ? ' earned' : '');
  card.dataset.name = trophy.name;

  const top = document.createElement('div');
  top.className = 'card-top';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned;
  box.setAttribute('aria-label', 'Mark ' + trophy.name + ' as earned');
  box.addEventListener('change', () => {
    if (box.checked) earned.add(trophy.name);
    else earned.delete(trophy.name);
    saveStored(STORE_KEY, [...earned]);
    renderProgress();
    renderList();
  });
  const title = document.createElement('div');
  title.className = 'card-title';
  const h3 = document.createElement('h3');
  h3.textContent = hidden ? 'Hidden story trophy' : trophy.name;
  const desc = document.createElement('p');
  desc.className = 'official';
  desc.textContent = hidden
    ? 'Spoiler-safe mode is on — earn this trophy to reveal its name and description.'
    : trophy.description;
  title.append(h3, desc);
  const badge = document.createElement('span');
  badge.className = 'grade ' + trophy.grade;
  badge.textContent = gradeLabel(trophy.grade);
  top.append(box, title, badge);

  const tags = document.createElement('div');
  tags.className = 'tags';
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = trophy.kind === 'story' ? 'Story' : trophy.kind === 'collectibles' ? 'Collectibles' : 'Activities';
  tags.append(kindTag);
  if (trophy.hidden) {
    const hiddenTag = document.createElement('span');
    hiddenTag.className = 'tag hidden';
    hiddenTag.textContent = 'Hidden on PlayStation';
    tags.append(hiddenTag);
  }
  if (trophy.missable) {
    const missTag = document.createElement('span');
    missTag.className = 'tag missable';
    missTag.textContent = '⚠ Missable';
    tags.append(missTag);
  }
  const stageTag = document.createElement('span');
  stageTag.className = 'tag';
  stageTag.textContent = stageName(trophy.stage);
  tags.append(stageTag);

  card.append(top, tags);

  if (hidden) {
    const note = document.createElement('p');
    note.className = 'spoiler-note';
    note.textContent = 'Its guide stays hidden too, so the story stays unspoiled. Tick it off once you earn it.';
    card.append(note);
    return card;
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'guide-toggle';
  toggle.textContent = 'Show guide';
  const guide = document.createElement('div');
  guide.className = 'guide';
  const para = document.createElement('p');
  para.textContent = trophy.guide;
  guide.append(para);
  if (trophy.count) {
    const countNote = document.createElement('p');
    countNote.className = 'count-note';
    countNote.textContent = 'Count: ' + trophy.count;
    guide.append(countNote);
  }
  if (trophy.steps && trophy.steps.length) {
    const ol = document.createElement('ol');
    for (const step of trophy.steps) {
      const li = document.createElement('li');
      li.textContent = step;
      ol.append(li);
    }
    guide.append(ol);
  }
  guide.append(sourceList(trophy));
  toggle.addEventListener('click', () => {
    const open = guide.classList.toggle('open');
    toggle.textContent = open ? 'Hide guide' : 'Show guide';
  });
  card.append(toggle, guide);
  return card;
}

function visibleTrophies() {
  const query = searchEl.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (activeKind === 'missable' && !t.missable) return false;
    if (activeKind === 'online') return false;
    if (activeKind !== 'all' && activeKind !== 'missable' && t.kind !== activeKind) return false;
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
    if (settings.hideEarned && earned.has(t.name)) return false;
    if (query) {
      const hay = (t.name + ' ' + t.description + ' ' + t.guide + ' ' + (t.steps ?? []).join(' ')).toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

function renderList() {
  const shown = visibleTrophies();
  cardsEl.replaceChildren(...shown.map(trophyCard));
  emptyEl.hidden = shown.length !== 0;
  if (activeKind === 'online') {
    metaEl.textContent = 'No online trophies — all 55 are offline and single-player (KeenGamer). Showing 0 of 55.';
  } else {
    metaEl.textContent = `Showing ${shown.length} of ${trophies.length} trophies` +
      (earned.size ? ` · ${earned.size} earned` : '');
  }
}

function renderProgress() {
  const total = trophies.length || 55;
  const byGrade = {};
  for (const t of trophies) {
    byGrade[t.grade] = byGrade[t.grade] ?? { total: 0, earned: 0 };
    byGrade[t.grade].total += 1;
    if (earned.has(t.name)) byGrade[t.grade].earned += 1;
  }
  document.getElementById('progress-count').textContent = `${earned.size} of ${total} earned`;
  const fill = document.getElementById('progress-fill');
  fill.style.width = total ? `${Math.round((earned.size / total) * 100)}%` : '0%';
  document.getElementById('progress-bar-wrap').setAttribute('aria-valuenow', String(earned.size));
  const detail = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${gradeLabel(g)} ${byGrade[g]?.earned ?? 0}/${byGrade[g]?.total ?? 0}`)
    .join(' · ');
  document.getElementById('progress-detail').textContent = detail;
}

function renderAll() {
  renderRoadmap();
  renderProgress();
  renderList();
}

chipsEl.addEventListener('click', (event) => {
  const button = event.target.closest('[data-kind]');
  if (!button) return;
  activeKind = button.dataset.kind;
  for (const chip of chipsEl.querySelectorAll('.chip')) {
    chip.classList.toggle('active', chip === button);
  }
  renderList();
});

searchEl.addEventListener('input', renderList);
gradeEl.addEventListener('change', renderList);

spoilerEl.checked = settings.spoilers;
spoilerEl.addEventListener('change', () => {
  settings.spoilers = spoilerEl.checked;
  saveStored(SETTINGS_KEY, settings);
  renderList();
});

hideEarnedEl.checked = settings.hideEarned;
hideEarnedEl.addEventListener('change', () => {
  settings.hideEarned = hideEarnedEl.checked;
  saveStored(SETTINGS_KEY, settings);
  renderList();
});

document.getElementById('export').addEventListener('click', () => {
  const payload = {
    guide: 'Leonida Legend — GTA VI trophy progress',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('import').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(names)) throw new Error('no earned list');
    const known = new Set(trophies.map((t) => t.name));
    earned = new Set(names.filter((n) => known.has(n)));
    saveStored(STORE_KEY, [...earned]);
    renderProgress();
    renderList();
  } catch {
    alert('That file is not a Leonida Legend progress export.');
  }
  event.target.value = '';
});

document.getElementById('reset').addEventListener('click', () => {
  if (!earned.size) return;
  if (confirm('Clear all earned trophies? This cannot be undone (unless you exported a backup).')) {
    earned = new Set();
    saveStored(STORE_KEY, []);
    renderProgress();
    renderList();
  }
});

const [trophyDoc, roadmapDoc] = await Promise.all([
  (await fetch('data/trophies.json')).json(),
  (await fetch('data/roadmap.json')).json(),
]);
trophies = trophyDoc.trophies;
roadmap = roadmapDoc;
renderAll();
