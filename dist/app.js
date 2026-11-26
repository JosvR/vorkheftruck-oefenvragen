'use strict';

const VERSION = 'V01.07.00';
const STORAGE_KEY = 'dts-heftruck-oefenen-blokken-v2';
const PREVIOUS_KEY = 'dts-heftruck-oefenen-blokken-v1';
const LEGACY_KEY = 'dts-heftruck-oefenen-V01.01.00';
const LEGACY_QUESTION_COUNT = 57;
const HEIGHT_QUESTIONS_REVISION = 1;
const REVISED_HEIGHT_QUESTIONS = new Set(['H02', 'H03']);
const byId = new Map(QUESTIONS.map(q => [q.id, q]));
const TOPICS = [
  {key: 'arbo', name: 'Arbowet en verantwoordelijkheden', ids: ['A01','A02','A03','A04','A05','V09','V10']},
  {key: 'afspraken', name: 'Werkafspraken en gevarenetiketten', ids: ['V15','N01','N02','N03','N04']},
  {key: 'transport', name: 'Transportmiddelen kiezen', ids: ['N05','N06','N07','N08','N09','N10']},
  {key: 'voorzet', name: 'Voorzetapparatuur', ids: ['N11','N12','N13','N14','N15','K15','R18']},
  {key: 'techniek', name: 'Heftruck Techniek', ids: ['N16','N17','N18','N19','N20','N21','N22']},
  {key: 'energie', name: 'Aandrijving, accu en Ex-zones', ids: ['N23','N24','N25','N26','N27']},
  {key: 'controle', name: 'Aanvangscontrole en storingen', ids: ['V01','N29','N28','V04','R20','R15']},
  {key: 'verkeer', name: 'Verkeer, zicht en bochten', ids: ['V03','V14','R02','K13','V13','N30','R22']},
  {key: 'ondergrond', name: 'Ondergrond en transportroute', ids: ['K05','K06','K07','R06','R11','R14','N31']},
  {key: 'hellingen', name: 'Rijden op hellingen', ids: ['K12','R07','R12','N32','N33']},
  {key: 'hoogtes', name: 'De vijf hoogtes van de heftruck', ids: ['H01','H02','R19','H03','H04','H05']},
  {key: 'last', name: 'Lastgewicht en zwaartepunt', ids: ['V07','K09','V08','V02','R10','N34']},
  {key: 'capaciteit', name: 'Lastdiagram en typeplaat', ids: ['N37','V06','V11','N35','N36','N38']},
  {key: 'stabiliteit', name: 'Stabiliteit en kantelen', ids: ['K02','K03','V05','K08','R09','N39','N40']},
  {key: 'opnemen', name: 'Last opnemen en vervoeren', ids: ['K10','V17','R16','V16','V12','R04','R21']},
  {key: 'pallets', name: 'Pallets en andere lastdragers', ids: ['N41','N42','N43','N44','N45','N52','K16']},
  {key: 'stellingen', name: 'Magazijnstellingen', ids: ['N46','N47','N48','N49','K11','R01','R13']},
  {key: 'stapelen', name: 'Laden, lossen en parkeren', ids: ['K01','R05','N50','N51','K04','R03']}
];
const ROUTE_STAGES = [
  {name: 'Voor je vertrekt', groups: TOPICS.slice(0, 7)},
  {name: 'Rijden en heffen', groups: TOPICS.slice(7, 14)},
  {name: 'Laden, opslaan en afronden', groups: TOPICS.slice(14)}
];
const topics = new Map(TOPICS.map(topic => [topic.key, topic]));
const main = document.getElementById('main');
const dialog = document.getElementById('confirm');
document.querySelectorAll('.version').forEach(el => { el.textContent = VERSION; });

function cleanChoices(q, values) {
  return [...new Set(values)].filter(n => Number.isInteger(n) && n >= 0 && n < q.options.length)
    .slice(0, q.correct.length);
}

function cleanAnswers(ids, source) {
  const answers = {};
  for (const id of ids) {
    if (!Array.isArray(source?.[id])) continue;
    const values = cleanChoices(byId.get(id), source[id]);
    if (values.length) answers[id] = values;
  }
  return answers;
}

function newRound(ids, answers = {}, current = null) {
  return {ids, answers, current: ids.includes(current) ? current : ids.find(id => !answers[id]) || ids[0]};
}

function emptyProgress() { return {blocks: {}, last: null, savedIds: [], heightQuestionsRevision: HEIGHT_QUESTIONS_REVISION}; }

// In de vorige versie werden antwoorden los van elkaar nagekeken.
// Alleen onderwerpen waarvan alle antwoorden al waren nagekeken krijgen een resultaat.
function migrateProgress(old) {
  const data = emptyProgress();
  if (!old?.items) return data;
  for (const group of TOPICS) {
    const submitted = {}, written = {};
    let hasDraft = false;
    for (const id of group.ids) {
      const item = old.items[id];
      if (!item) continue;
      if (Array.isArray(item.answer)) submitted[id] = item.answer;
      if (Array.isArray(item.draft)) hasDraft = true;
      written[id] = item.draft ?? item.answer;
    }
    const previous = cleanAnswers(group.ids, submitted);
    const answers = cleanAnswers(group.ids, written);
    if (!Object.keys(previous).length && !Object.keys(answers).length && !hasDraft) continue;
    const block = {};
    const savedRound = old.rounds?.[group.key];
    const current = old.last === 'alles' ? old.rounds?.alles?.current : savedRound?.current;
    if (group.ids.every(id => previous[id])) {
      block.result = previous;
      if (hasDraft) {
        const retry = savedRound?.retry || old.rounds?.alles?.retry || [];
        const ids = group.ids.filter(id => (Array.isArray(retry) && retry.includes(id)) || Array.isArray(old.items[id]?.draft));
        block.round = newRound(ids, cleanAnswers(ids, written), current);
      }
    } else {
      block.round = newRound(group.ids, answers, current);
    }
    data.blocks[group.key] = block;
  }
  data.last = topics.has(old.last) ? old.last : TOPICS.find(g => g.ids.includes(old.rounds?.alles?.current))?.key || null;
  return data;
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.blocks) {
      const clean = emptyProgress();
      const sources = Object.values(saved.blocks).filter(Boolean);
      // Vraag-ID's blijven geldig als een vraag naar een andere werkorder verhuist.
      const results = Object.assign({}, ...sources.map(source => source.result));
      const drafts = Object.assign({}, ...sources.map(source => source.round?.answers));
      const roundIds = new Set(sources.flatMap(source => Array.isArray(source.round?.ids) ? source.round.ids : []));
      const lastQuestion = saved.blocks[saved.last]?.round?.current;
      const lastGroup = TOPICS.find(group => group.ids.includes(lastQuestion));
      clean.last = lastGroup?.key || (topics.has(saved.last) ? saved.last : null);
      if (Array.isArray(saved.savedIds)) clean.savedIds = [...new Set(saved.savedIds.filter(id => byId.has(id)))];
      for (const group of TOPICS) {
        const source = saved.blocks[group.key];
        const block = {};
        const answerIds = (saved.heightQuestionsRevision ?? 0) < HEIGHT_QUESTIONS_REVISION
          ? group.ids.filter(id => !REVISED_HEIGHT_QUESTIONS.has(id))
          : group.ids;
        const result = cleanAnswers(answerIds, results);
        const current = lastGroup === group ? lastQuestion : source?.round?.current;
        if (source?.radio === 0 || source?.radio === 1) block.radio = source.radio;
        if (group.ids.every(id => result[id])) {
          block.result = result;
          block.lastIds = group.ids.filter(id => Array.isArray(source?.lastIds) && source.lastIds.includes(id));
          if (Number.isInteger(source?.lastImproved) && source.lastImproved > 0) block.lastImproved = source.lastImproved;
          const ids = group.ids.filter(id => roundIds.has(id));
          if (ids.length) block.round = newRound(ids, cleanAnswers(ids, drafts), current);
        } else {
          const answers = {...result, ...cleanAnswers(answerIds, drafts)};
          if (Object.keys(answers).length || (roundIds.has(current) && group.ids.includes(current))) {
            block.round = newRound(group.ids, answers, current);
          }
        }
        if (Object.keys(block).length) clean.blocks[group.key] = block;
      }
      return clean;
    }
    const previous = JSON.parse(localStorage.getItem(PREVIOUS_KEY));
    if (previous?.items) return migrateProgress(previous);
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
    if (Array.isArray(legacy?.answers) && legacy.answers.length === LEGACY_QUESTION_COUNT) {
      const items = {};
      QUESTIONS.slice(0, LEGACY_QUESTION_COUNT).forEach((q,i) => {
        if (legacy.answers[i]?.length) items[q.id] = legacy.finished ? {answer: legacy.answers[i]} : {draft: legacy.answers[i]};
      });
      return migrateProgress({items, last: 'alles', rounds: {alles: {current: QUESTIONS[legacy.current]?.id}}});
    }
  } catch { /* De ronde kan in het huidige venster doorgaan zonder lokale opslag. */ }
  return emptyProgress();
}

let progress = loadProgress();
let topic = topics.get(progress.last) || TOPICS[0];
let reviewIds = [], reviewIndex = 0;
let repeatRight = false, repeatMissed = true;

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* De ronde blijft in dit venster beschikbaar. */ }
}
function block(group = topic) { return progress.blocks[group.key]; }
function complete(group) { return Boolean(block(group)?.result); }
function points(id, answers) { return answers[id].filter(value => byId.get(id).correct.includes(value)).length; }
function missed(id) { return points(id, block().result) < byId.get(id).correct.length; }
function answeredCount(round) { return round.ids.filter(id => round.answers[id]?.length).length; }
function maxPoints(ids) { return ids.reduce((n,id) => n + byId.get(id).correct.length, 0); }
function totalPoints(ids, answers) { return ids.reduce((n,id) => n + points(id, answers), 0); }

function setScreen(view, focusId = 'screen-title') {
  const views = {home: renderHome, briefing: renderBriefing, question: renderQuestion, result: renderResult, review: renderReview, overview: renderOverview};
  main.innerHTML = views[view]();
  const target = document.getElementById(focusId) || main;
  target.focus({preventScroll:true});
  if (focusId === 'topics-title') target.scrollIntoView({block:'start'});
  else window.scrollTo(0,0);
}
function openTopic(key) {
  topic = topics.get(key);
  progress.last = key;
  if (!block()) progress.blocks[key] = {};
  save();
  if (block().round) setScreen('question');
  else if (complete(topic)) showResult();
  else setScreen('briefing');
}
function openSeries() {
  const next = recommendedOrder();
  if (next) openTopic(next.key);
  else setScreen('overview');
}
function goQuestion(id) {
  block().round.current = id;
  save();
  setScreen('question');
}
function finishRound() {
  const b = block(), r = b.round;
  if (answeredCount(r) !== r.ids.length) return;
  b.lastImproved = b.result ? r.ids.filter(id => {
    const required = byId.get(id).correct.length;
    return points(id, b.result) < required && points(id, r.answers) === required;
  }).length : 0;
  b.result = {...b.result, ...r.answers};
  b.lastIds = r.ids;
  delete b.round;
  playCue('done');
  showResult();
}
function showResult() {
  repeatMissed = topic.ids.some(missed);
  repeatRight = !repeatMissed;
  save();
  setScreen('result');
}

function topicCard(group) {
  const b = block(group), r = b?.round, order = WORK_ORDERS[group.key];
  const count = r ? answeredCount(r) : complete(group) ? group.ids.length : 0;
  const max = r?.ids.length || group.ids.length;
  const label = r ? (b.result ? 'Herhaling' : 'In uitvoering') : complete(group) ? 'Afgerond' : 'Open';
  return `<button class="order-card" data-action="open" data-key="${group.key}">
    <span class="order-thumbnail">${scenePhoto(group.key)}</span>
    <span class="order-top"><span class="order-code">WO ${orderNumber(group)}</span><span class="order-status ${r ? 'active' : complete(group) ? 'done' : ''}">${label}</span></span>
    <strong>${order.title}</strong><span class="order-topic">${group.name}</span>
    <span class="order-bottom"><span>${order.location}</span><span>${count}/${max}</span></span>
    <progress max="${max}" value="${count}" aria-label="Beantwoorde vragen bij ${group.name}"></progress>
  </button>`;
}

function renderHome() {
  const finished = TOPICS.filter(complete).length, next = recommendedOrder();
  const active = TOPICS.some(group => block(group)?.round) || finished > 0;
  let startLabel = 'Bekijk je dienstoverdracht';
  if (next) {
    const number = TOPICS.indexOf(next) + 1;
    startLabel = active ? `Ga verder met werkorder ${number}` : `Start met werkorder ${number}`;
  }
  return `<section class="shift-hero">
    <img class="shift-photo" src="./img/terminal/kade.webp" alt="Een heftruck bij de verlichte loods aan de kade bij het begin van de dienst" fetchpriority="high">
    <div class="shift-copy"><p class="kicker">Oefendienst · Heftruck &amp; reachtruck</p>
      <h1 id="screen-title" tabindex="-1">Jouw dienst op<br><em>de terminal</em></h1>
      <p class="course-intro">Bereid je voor op de cursus <strong>Veilig werken met een heftruck</strong>. Leer de theorie en oefen met vragen over onderwerpen die ook op het examen kunnen terugkomen.</p>
      <p>${finished === TOPICS.length
        ? `Je hebt alle ${TOPICS.length} werkorders afgerond. Open je logboek en neem je bewaarde vragen mee naar de praktijktraining.`
        : `Begin met één werkorder van 5 tot 7 vragen. Na elk blok zie je je resultaat en krijg je een stempel in je logboek. Je kunt later verder oefenen.`}</p>
      <div class="actions"><button class="btn shift-start" data-action="series">${startLabel}</button>
      <button class="hero-link" data-action="topics">Kies een thema</button></div>
    </div></section>
    <div class="shift-dashboard">${liftMeter()}<div class="shift-strip"><div><p class="kicker">Jouw dienst</p><strong>${finished} van ${TOPICS.length} werkorders afgerond</strong>
      <div class="segments" aria-hidden="true">${TOPICS.map(group => `<i class="${complete(group) ? 'done' : block(group)?.round ? 'started' : ''}"></i>`).join('')}</div>
    </div><button class="text-button" data-action="overview">Mijn logboek${progress.savedIds.length ? ' (' + progress.savedIds.length + ')' : ''}</button></div></div>
    ${finished < TOPICS.length ? `<section class="work-instructions" aria-labelledby="instructions-title">
      <h2 id="instructions-title">Zo pak je een werkorder aan</h2>
      <ol>
        <li><strong>Lees de werksituatie.</strong> Kies daarna <b>Begin met oefenen</b> en beantwoord de vragen. Elke vraag telt één keer mee voor de ${QUESTIONS.length} hefpunten, ook als je antwoord fout is.</li>
        <li><strong>Bekijk je feedback.</strong> Kies na de laatste vraag <b>Rond de werkorder af</b>. Lees de uitleg en oefen lastige vragen nog eens.</li>
        <li><strong>Neem je vragen mee.</strong> Iets bespreken met je trainer? Kies bij de uitleg <b>Bewaar voor de training</b>. De vraag staat dan in <b>Mijn logboek</b>. Ga daarna verder met de volgende werkorder.</li>
      </ol>
    </section>` : ''}
    <section class="home-info" aria-labelledby="topics-title"><div class="section-head">
      <div><h2 id="topics-title" tabindex="-1">Werkorders van deze dienst</h2><p class="board-intro">Volg de voorgestelde route of open een thema. Je voortgang blijft bewaard op dit apparaat en in deze browser.</p></div>
    </div><div class="work-stages">${ROUTE_STAGES.map(stage => {
      const stageDone = stage.groups.filter(complete).length;
      const opened = !next || stage.groups.includes(next);
      return `<details class="work-stage" ${opened ? 'open' : ''}>
        <summary><strong>${stage.name}</strong><span>${stageDone === stage.groups.length ? 'Afgerond' : stageDone + '/' + stage.groups.length + ' afgerond'}</span></summary>
        <div class="order-grid">${stage.groups.map(topicCard).join('')}</div></details>`;
    }).join('')}</div></section>`;
}
function recommendedOrder() {
  const last = topics.get(progress.last);
  if (last && !complete(last)) return last;
  if (last && block(last)?.round) return last;
  return TOPICS.find(group => block(group)?.round) || TOPICS.find(group => !complete(group));
}

function orderNumber(group) {
  return String(TOPICS.indexOf(group) + 1).padStart(2, '0');
}

function renderBriefing() {
  const order = WORK_ORDERS[topic.key];
  return `<section class="work-area"><button class="text-button back-link" data-action="topics">Werkorderbord</button>
    <article class="brief-card"><div class="brief-top"><span class="order-code">WO ${orderNumber(topic)}</span><span>${order.location}</span></div>
    <div class="brief-scene">${scenePhoto(topic.key)}<div class="brief-scene-copy"><p class="kicker">Jouw opdracht</p><h1 id="screen-title" tabindex="-1">${order.title}</h1><p class="brief-story">${order.briefing}</p></div></div>
    <div class="brief-start"><div><strong>${topic.name}</strong><span>${topic.ids.length} vragen · Feedback na de werkorder</span></div>
    <button class="btn primary" data-action="begin-order">Begin met oefenen</button></div></article></section>`;
}

function renderRadio() {
  const order = WORK_ORDERS[topic.key], selection = block().radio;
  if (!order.replies) return '';
  return `<section class="radio-card" aria-labelledby="radio-title"><p class="kicker">Ploegoverdracht · ${order.location}</p>
    <h2 id="radio-title">Je collega aan de portofoon</h2><p>${order.call}</p>
    <div class="radio-replies">${order.replies.map(([label],i) =>
      `<button class="radio-reply" data-action="radio" data-index="${i}" aria-pressed="${selection === i}">${label}</button>`).join('')}</div>
    <p class="radio-response" role="status">${Number.isInteger(selection) ? order.replies[selection][1] : ''}</p></section>`;
}

function toggleNote(id) {
  if (progress.savedIds.includes(id)) progress.savedIds = progress.savedIds.filter(saved => saved !== id);
  else progress.savedIds.push(id);
  save();
}

function bookmarkLabel(id) {
  return progress.savedIds.includes(id) ? 'Bewaard voor de training' : 'Bewaar voor de training';
}

function artwork(q) {
  if (!q.image) return '';
  return `<figure class="question-art${q.diagram || q.feedbackImage ? ' diagram' : ''}${q.wideArt ? ' wide-art' : ''}">
    <img src="./img/${q.image}.webp" alt="${q.alt}">${q.chartTable ? loadChartTable() : ''}</figure>`;
}
function loadChartTable() {
  const rows = [
    [5030, 910, 990, 1080, 1200],
    [4830, 1060, 1150, 1260, 1400],
    [4100, 1170, 1280, 1400, 1550],
    [3300, 1210, 1320, 1440, 1600]
  ];
  return `<details class="chart-table"><summary>Lees het lastdiagram als tabel</summary>
    <table><caption>Maximaal gewicht in kg per hefhoogte en lastzwaartepuntafstand</caption>
    <thead><tr><th scope="col">Hefhoogte</th>${[800,700,600,500].map(distance => `<th scope="col">${distance} mm</th>`).join('')}</tr></thead>
    <tbody>${rows.map(([height, ...weights]) => `<tr><th scope="row">${height} mm</th>${weights.map(weight => `<td>${weight}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;
}
function feedbackBody(q, choices) {
  return `<ul class="review-options">${q.options.map((option, i) => {
    const right = q.correct.includes(i);
    const picked = choices.includes(i);
    const label = right ? (picked ? 'Juist gekozen' : 'Juist antwoord gemist') : picked ? 'Onjuist gekozen' : '';
    return `<li class="${right ? 'correct' : picked ? 'wrong' : ''}"><span class="option-letter" aria-hidden="true">${String.fromCharCode(65+i)}</span><div>${option}${label ? `<small>${label}</small>` : ''}</div></li>`;
  }).join('')}</ul><div class="feedback"><h3>Waarom dit antwoord?</h3><p>${q.feedback}</p>
    ${q.feedbackImage ? `<img class="feedback-image" src="./img/${q.feedbackImage}.webp" alt="${q.feedbackAlt}" loading="lazy" width="425" height="464">` : ''}</div>`;
}
function choicesForm(q, choices) {
  const limit = q.correct.length;
  return `<p class="choice-instruction" id="choice-instruction">${limit === 1 ? 'Kies één antwoord.' : `Er zijn ${limit} juiste antwoorden. Kies er maximaal ${limit}.`}</p>
    <fieldset class="choices" aria-describedby="choice-instruction"><legend class="sr-only">Antwoordmogelijkheden</legend>
    ${q.options.map((option, i) => `<label class="choice">
      <input name="answer" type="${limit === 1 ? 'radio' : 'checkbox'}" value="${i}" ${choices.includes(i) ? 'checked' : ''} ${limit > 1 && choices.length >= limit && !choices.includes(i) ? 'disabled' : ''}>
      <span class="option-letter" aria-hidden="true">${String.fromCharCode(65+i)}</span><span>${option}</span>
    </label>`).join('')}</fieldset>
    <div class="choice-status"><p id="selection-status" role="status">${limit > 1 ? `${choices.length} van ${limit} gekozen` : ''}</p>
      <button class="text-button" data-action="clear" ${choices.length ? '' : 'hidden'}>Wis keuze</button></div>`;
}
function advanceLabel(r) {
  if (answeredCount(r) === r.ids.length) return 'Rond de werkorder af';
  return r.current === r.ids[r.ids.length-1] ? 'Naar open vraag' : 'Volgende vraag';
}
function renderQuestion() {
  const b = block(), r = b.round, id = r.current, position = r.ids.indexOf(id);
  const q = byId.get(id), choices = r.answers[id] || [], count = answeredCount(r);
  return `<section class="work-area">
    <button class="text-button back-link" data-action="topics">Werkorderbord</button>
    <div class="progress-head"><p class="eyebrow">WO ${orderNumber(topic)} · ${b.result ? 'Herhaling · ' : ''}${topic.name}</p><span>Vraag <strong>${position+1}</strong> / ${r.ids.length}</span></div>
    <progress id="round-progress" value="${count}" max="${r.ids.length}" aria-label="Beantwoorde vragen"></progress>
    <details class="question-map"><summary>Vragenoverzicht <span id="round-count">${count}/${r.ids.length} beantwoord</span></summary>
    <div class="map-sections"><div class="map-grid">${r.ids.map((key,i) =>
      `<button class="map-button${r.answers[key] ? ' filled' : ''}" data-action="jump" data-id="${key}" ${key === id ? 'aria-current="step"' : ''} aria-label="Vraag ${i+1}, ${r.answers[key] ? 'beantwoord' : 'open'}">${i+1}</button>`).join('')}</div></div></details>
    <article class="question-card playing-card"><div class="question-layout${q.wideArt ? ' with-wide-art' : q.image ? ' with-art' : ''}">
      <h1 id="screen-title" tabindex="-1">${q.prompt}</h1>${artwork(q)}
      <div class="question-content">${choicesForm(q, choices)}</div></div>
      ${liftMeter(true)}
      <div class="question-actions"><button class="text-button" data-action="${position ? 'previous' : 'topics'}">${position ? 'Vorige vraag' : 'Werkorderbord'}</button>
      <button class="btn primary" data-action="advance" ${choices.length ? '' : 'disabled'}>${advanceLabel(r)}</button></div>
    </article></section>`;
}
function updateSelection() {
  const r = block().round, id = r.current, limit = byId.get(id).correct.length;
  const inputs = [...main.querySelectorAll('input[name="answer"]')];
  const choices = inputs.filter(input => input.checked).map(input => Number(input.value));
  if (choices.length > limit) return;
  if (choices.length) r.answers[id] = choices; else delete r.answers[id];
  if (limit > 1) {
    inputs.forEach(input => { input.disabled = !input.checked && choices.length >= limit; });
    document.getElementById('selection-status').textContent = `${choices.length} van ${limit} gekozen`;
  }
  main.querySelector('[data-action="clear"]').hidden = !choices.length;
  const next = main.querySelector('[data-action="advance"]');
  next.disabled = !choices.length;
  next.textContent = advanceLabel(r);
  const count = answeredCount(r);
  document.getElementById('round-progress').value = count;
  document.getElementById('round-count').textContent = `${count}/${r.ids.length} beantwoord`;
  const marker = main.querySelector('[aria-current="step"]');
  marker.classList.toggle('filled', Boolean(choices.length));
  marker.setAttribute('aria-label', `Vraag ${r.ids.indexOf(id)+1}, ${choices.length ? 'beantwoord' : 'open'}`);
  updateLiftMeter();
  save();
}

function repeatIds() {
  return topic.ids.filter(id => missed(id) ? repeatMissed : repeatRight);
}
function repeatButtonText(n) {
  return n ? `Start herhaling (${n} ${n === 1 ? 'vraag' : 'vragen'})` : 'Start herhaling';
}
function renderResult() {
  const b = block(), errors = topic.ids.filter(missed).length, correct = topic.ids.length - errors;
  const repeatCount = repeatIds().length, order = WORK_ORDERS[topic.key], next = recommendedOrder();
  const finished = TOPICS.filter(complete).length;
  const stage = ROUTE_STAGES.find(item => item.groups.includes(topic));
  const stageDone = stage.groups.filter(complete).length;
  const focusQuestion = byId.get(topic.ids.find(missed) || topic.ids[0]);
  return `<section class="work-area result">
    <button class="text-button back-link" data-action="topics">Werkorderbord</button>
    <header class="result-banner signed-order"><div><p class="eyebrow">WO ${orderNumber(topic)} afgerond · ${finished} van ${TOPICS.length} werkorders</p>
      <h1 id="screen-title" tabindex="-1">${order.title}</h1><p>${topic.name}</p></div><div class="completion-stamp"><span>Afgerond</span><strong>WO ${orderNumber(topic)}</strong></div></header>
    <section class="work-reward" aria-label="Stempel voor deze werkorder">
      <div><p class="kicker">Stempel in je logboek</p><h2>${order.stamp}</h2>
      <p class="reward-stage">${stage.name} · ${stageDone === stage.groups.length ? 'fase afgerond' : `${stageDone}/${stage.groups.length} afgerond`}</p></div>
      <div class="reward-count"><strong>${correct}/${topic.ids.length} juist</strong>
      <span>${b.lastImproved ? `${b.lastImproved} ${b.lastImproved === 1 ? 'vraag verbeterd' : 'vragen verbeterd'} bij je herhaling` : errors ? 'Je kunt je leerpunten opnieuw oefenen.' : 'Alle antwoorden volledig goed.'}</span></div>
    </section>
    <section class="result-body"><h2>Wat neem je mee?</h2>
      <p class="result-intro">${errors ? `${correct} van de ${topic.ids.length} vragen volledig goed. Bekijk de uitleg bij ${errors === 1 ? 'de vraag die je nog kunt aanscherpen' : 'de '+errors+' vragen die je nog kunt aanscherpen'}.` : 'Je hebt alle vragen volledig goed. Bij het terugkijken lees je de uitleg en kun je vragen bewaren voor de praktijktraining.'}</p>
      <div class="debrief-example"><p class="order-code">Uit jouw werkorder</p><h3>${focusQuestion.prompt}</h3><p>${focusQuestion.feedback}</p></div>
      <div class="actions result-actions"><button class="btn ${errors ? 'primary' : 'secondary'}" data-action="review-missed" ${errors ? '' : 'disabled'}>Bekijk mijn leerpunten (${errors})</button>
        <button class="btn ${errors ? 'secondary' : 'primary'}" data-action="review-all">Bekijk alle ${topic.ids.length} antwoorden</button>
        ${errors ? '<button class="btn secondary" data-action="repeat-learn">Oefen mijn leerpunten opnieuw</button>' : ''}</div>
      <details class="details-panel"><summary>Resultaat en opnieuw oefenen</summary>
      <p>${totalPoints(topic.ids,b.result)} van ${maxPoints(topic.ids)} antwoordpunten.</p>
      ${b.lastIds?.length && b.lastIds.length < topic.ids.length ? `<p>Laatste herhaling · ${totalPoints(b.lastIds,b.result)} van ${maxPoints(b.lastIds)} antwoordpunten.</p>` : ''}
      <fieldset class="repeat-options"><legend>Welke vragen neem je mee?</legend>
        <label><input id="repeat-missed" type="checkbox" ${repeatMissed ? 'checked' : ''} ${errors ? '' : 'disabled'}> Fout of deels goed (${errors})</label>
        <label><input id="repeat-right" type="checkbox" ${repeatRight ? 'checked' : ''} ${correct ? '' : 'disabled'}> Volledig goed (${correct})</label></fieldset>
      <button class="btn secondary" data-action="repeat" ${repeatCount ? '' : 'disabled'}>${repeatButtonText(repeatCount)}</button></details>
    </section><div class="actions all-actions"><button class="btn primary" data-action="${next ? 'series' : 'overview'}">${next ? 'Volgende werkorder · '+next.name : 'Bekijk je dienstoverdracht'}</button>
      ${next ? '<button class="text-button" data-action="overview">Klaar voor nu</button>' : ''}</div>
    ${photoDebrief()}${teachingClip(topic.key)}${renderRadio()}</section>`;
}
function renderReview() {
  const id = reviewIds[reviewIndex], q = byId.get(id), answers = block().result;
  const score = points(id, answers), max = q.correct.length;
  const verdict = score === max ? 'Volledig goed' : score ? 'Gedeeltelijk goed' : 'Onjuist';
  const last = reviewIndex === reviewIds.length-1;
  return `<section class="work-area review">
    <button class="text-button back-link" data-action="result">Terug naar de nabespreking</button>
    <div class="progress-head"><p class="eyebrow">Nakijken · ${topic.name}</p><span>Vraag ${reviewIndex+1} / ${reviewIds.length}</span></div>
    <article class="question-card"><div class="question-layout${q.wideArt ? ' with-wide-art' : q.image ? ' with-art' : ''}">
      <h1 id="screen-title" tabindex="-1">${q.prompt}</h1>${artwork(q)}
      <div class="question-content"><h2 class="verdict">${verdict}</h2>${feedbackBody(q, answers[id])}
        <button class="note-btn" aria-pressed="${progress.savedIds.includes(id)}" data-action="bookmark" data-id="${id}">${bookmarkLabel(id)}</button></div></div>
      <div class="question-actions"><button class="text-button" data-action="review-previous" ${reviewIndex ? '' : 'disabled'}>Vorige vraag</button>
        <button class="btn primary" data-action="${last ? 'result' : 'review-next'}">${last ? 'Terug naar de nabespreking' : 'Volgende vraag'}</button>
      </div></article></section>`;
}
function renderOverview() {
  const finished = TOPICS.filter(complete), allDone = finished.length === TOPICS.length;
  const saved = progress.savedIds.map(id => byId.get(id));
  return `<section class="work-area result"><button class="text-button back-link" data-action="topics">Werkorderbord</button>
    <header class="result-banner"><div><p class="eyebrow">Logboek · Intern transport</p><h1 id="screen-title" tabindex="-1">${allDone ? 'Dienst overgedragen' : 'Mijn logboek'}</h1>
    <p>${allDone ? `Je hebt alle ${QUESTIONS.length} vragen geoefend. Neem je bespreekpunten mee naar de praktijktraining.` : `${finished.length} van de ${TOPICS.length} werkorders afgerond.`}</p></div></header>
    ${liftMeter()}${finished.length ? `<section class="result-body stamp-book"><h2>Je werkorderstempels</h2>
      <ul>${finished.map(group => `<li><strong>${WORK_ORDERS[group.key].stamp}</strong><span>${group.name}</span></li>`).join('')}</ul></section>` : ''}
    <section class="result-body"><h2>Bespreken tijdens de training</h2>
    ${saved.length ? `<ul class="log-list">${saved.map(q => `<li><details><summary>${q.prompt}</summary><p>${q.feedback}</p>
      <button class="text-button" data-action="remove-note" data-id="${q.id}">Verwijder dit bespreekpunt</button></details></li>`).join('')}</ul>` :
      '<p class="result-intro">Wil je iets aan de trainer vragen? Kies bij de uitleg van een vraag voor ‘Bewaar voor de training’. Je vindt die vragen hier terug.</p>'}
    </section>
    <div class="actions all-actions">${allDone ? `<button class="btn secondary" data-action="restart-series">Nieuwe oefendienst starten</button>` : '<button class="btn primary" data-action="series">Verder met de dienst</button>'}</div></section>`;
}

function nextQuestion() {
  const r = block().round;
  if (!r.answers[r.current]?.length) return;
  if (answeredCount(r) === r.ids.length) return finishRound();
  const next = r.ids[r.ids.indexOf(r.current)+1] || r.ids.find(id => !r.answers[id]);
  goQuestion(next);
}
function startReview(onlyMissed) {
  reviewIds = onlyMissed ? topic.ids.filter(missed) : topic.ids;
  reviewIndex = 0;
  if (reviewIds.length) setScreen('review');
}
function startRepeat() {
  const ids = repeatIds();
  if (!ids.length) return;
  block().round = newRound(ids);
  save();
  setScreen('question');
}
dialog.addEventListener('close', () => {
  if (dialog.returnValue !== 'ok') return;
  progress.blocks = {};
  openTopic(TOPICS[0].key);
});
main.addEventListener('change', event => {
  if (event.target.matches('input[name="answer"]')) updateSelection();
  if (event.target.matches('.repeat-options input')) {
    repeatMissed = document.getElementById('repeat-missed').checked;
    repeatRight = document.getElementById('repeat-right').checked;
    const size = repeatIds().length, button = main.querySelector('[data-action="repeat"]');
    button.disabled = !size;
    button.textContent = repeatButtonText(size);
  }
});
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;
  switch (button.dataset.action) {
    case 'home': setScreen('home'); break;
    case 'topics': setScreen('home', 'topics-title'); break;
    case 'open': openTopic(button.dataset.key); break;
    case 'begin-order':
      block().round = newRound(topic.ids);
      save();
      setScreen('question');
      break;
    case 'spot': inspectSpot(button, event); break;
    case 'play-clip': playClip(button); break;
    case 'radio': {
      playCue('radio');
      const choice = Number(button.dataset.index);
      block().radio = choice;
      save();
      main.querySelectorAll('.radio-reply').forEach(reply => reply.setAttribute('aria-pressed', String(reply === button)));
      main.querySelector('.radio-response').textContent = WORK_ORDERS[topic.key].replies[choice][1];
      break;
    }
    case 'bookmark': {
      const id = button.dataset.id;
      toggleNote(id);
      button.setAttribute('aria-pressed', String(progress.savedIds.includes(id)));
      button.textContent = bookmarkLabel(id);
      break;
    }
    case 'remove-note':
      toggleNote(button.dataset.id);
      setScreen('overview');
      break;
    case 'series': openSeries(); break;
    case 'jump': goQuestion(button.dataset.id); break;
    case 'previous': {
      const r = block().round;
      goQuestion(r.ids[r.ids.indexOf(r.current)-1]);
      break;
    }
    case 'advance': nextQuestion(); break;
    case 'clear':
      main.querySelectorAll('input[name="answer"]').forEach(el => { el.checked = false; });
      updateSelection();
      main.querySelector('input[name="answer"]').focus();
      break;
    case 'overview': setScreen('overview'); break;
    case 'review-all': startReview(false); break;
    case 'review-missed': startReview(true); break;
    case 'review-previous': reviewIndex--; setScreen('review'); break;
    case 'review-next': reviewIndex++; setScreen('review'); break;
    case 'result': setScreen('result'); break;
    case 'repeat-learn':
      repeatMissed = true;
      repeatRight = false;
      startRepeat();
      break;
    case 'repeat': startRepeat(); break;
    case 'restart-series':
      dialog.returnValue = 'cancel';
      dialog.showModal();
      break;
  }
});
setupSound();
main.innerHTML = renderHome();
