'use strict';

const VERSION = 'V01.03.00';
const STORAGE_KEY = 'dts-heftruck-oefenen-blokken-v2';
const PREVIOUS_KEY = 'dts-heftruck-oefenen-blokken-v1';
const LEGACY_KEY = 'dts-heftruck-oefenen-V01.01.00';
const byId = new Map(QUESTIONS.map(q => [q.id, q]));
const TOPICS = [
  {key: 'arbo', name: 'Arbowet en afspraken', ids: ['A01','A02','A03','A04','A05','V09','V10','V15']},
  {key: 'controle', name: 'Controleren, starten en parkeren', ids: ['V01','V04','R20','R15','K04','R03']},
  {key: 'verkeer', name: 'Verkeer, zicht en bochten', ids: ['V03','V14','R02','K13','V13','R14','R22']},
  {key: 'ondergrond', name: 'Ondergrond en hellingen', ids: ['K05','K06','K07','R06','R11','K12','R07','R12']},
  {key: 'stabiliteit', name: 'Stabiliteit en kantelen', ids: ['K02','K03','V05','K08','R09']},
  {key: 'capaciteit', name: 'Lastgewicht en lastdiagram', ids: ['V07','K09','V08','V02','V06','V11','R10','R18']},
  {key: 'opnemen', name: 'Last opnemen en vervoeren', ids: ['K10','K15','V17','R16','V16','V12','R04','R21']},
  {key: 'stapelen', name: 'Laden, lossen en stapelen', ids: ['K01','R05','K11','R01','R13','K16','R19']}
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

function emptyProgress() {
  return {blocks: {}, last: null, series: false};
}

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
  data.series = old.last === 'alles';
  data.last = topics.has(old.last) ? old.last : TOPICS.find(g => g.ids.includes(old.rounds?.alles?.current))?.key || null;
  return data;
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.blocks) {
      const clean = emptyProgress();
      clean.last = topics.has(saved.last) ? saved.last : null;
      clean.series = saved.series === true;
      for (const group of TOPICS) {
        const source = saved.blocks[group.key];
        if (!source) continue;
        const block = {};
        const result = cleanAnswers(group.ids, source.result);
        if (group.ids.every(id => result[id])) {
          block.result = result;
          block.lastIds = group.ids.filter(id => Array.isArray(source.lastIds) && source.lastIds.includes(id));
        }
        if (source.round && Array.isArray(source.round.ids)) {
          const ids = block.result ? group.ids.filter(id => source.round.ids.includes(id)) : group.ids;
          if (ids.length) block.round = newRound(ids, cleanAnswers(ids, source.round.answers), source.round.current);
        }
        clean.blocks[group.key] = block;
      }
      return clean;
    }
    const previous = JSON.parse(localStorage.getItem(PREVIOUS_KEY));
    if (previous?.items) return migrateProgress(previous);
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
    if (Array.isArray(legacy?.answers) && legacy.answers.length === QUESTIONS.length) {
      const items = {};
      QUESTIONS.forEach((q,i) => {
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
function complete(group) { return Boolean(block(group)?.result && !block(group).round); }
function points(id, answers) { return answers[id].filter(value => byId.get(id).correct.includes(value)).length; }
function missed(id) { return points(id, block().result) < byId.get(id).correct.length; }
function answeredCount(round) { return round.ids.filter(id => round.answers[id]?.length).length; }
function maxPoints(ids) { return ids.reduce((n,id) => n + byId.get(id).correct.length, 0); }
function totalPoints(ids, answers) { return ids.reduce((n,id) => n + points(id, answers), 0); }

function setScreen(view, focusId = 'screen-title') {
  const views = {home: renderHome, question: renderQuestion, result: renderResult, review: renderReview, overview: renderOverview};
  main.innerHTML = views[view]();
  const target = document.getElementById(focusId) || main;
  target.focus({preventScroll:true});
  if (focusId === 'topics-title') target.scrollIntoView({block:'start'});
  else window.scrollTo(0,0);
}
function openTopic(key, series = false) {
  topic = topics.get(key);
  progress.last = key;
  progress.series = series;
  if (!block()) progress.blocks[key] = {};
  if (complete(topic)) {
    showResult();
  } else {
    if (!block().round) block().round = newRound(topic.ids);
    save();
    setScreen('question');
  }
}
function openSeries() {
  const last = topics.get(progress.last);
  const next = progress.series && last && !complete(last) ? last : TOPICS.find(group => !complete(group));
  if (next) openTopic(next.key, true);
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
  b.result = {...b.result, ...r.answers};
  b.lastIds = r.ids;
  delete b.round;
  showResult();
}
function showResult() {
  repeatMissed = topic.ids.some(missed);
  repeatRight = !repeatMissed;
  save();
  setScreen('result');
}

function topicCard(group) {
  const b = block(group), r = b?.round;
  const count = r ? answeredCount(r) : b?.result ? group.ids.length : 0;
  const max = r?.ids.length || group.ids.length;
  const label = complete(group) ? 'Bekijk resultaat' : r ? 'Verder oefenen' : 'Start oefenblok';
  return `<button class="topic topic-link" data-action="open" data-key="${group.key}">
    <strong>${group.name}</strong>
    <span class="topic-count">${r && b.result ? 'Herhaling · ' : ''}${count} van ${max} beantwoord</span>
    <progress max="${max}" value="${count}" aria-label="Voortgang ${group.name}"></progress>
    <span class="topic-cta">${label} <span aria-hidden="true">→</span></span></button>`;
}

function renderHome() {
  const last = topics.get(progress.last);
  const finished = TOPICS.filter(complete).length;
  return `<section class="hero">
    <div class="hero-copy"><img class="hero-logo" src="./img/logo.webp" width="304" height="82" alt="Deltalinqs Training &amp; Services">
      <h1>Heftruck en<br class="hero-break"> reachtruck</h1>
      <p class="hero-intro">Oefen in je eigen tempo. Na elk onderwerp zie je je score en kun je de antwoorden met uitleg bekijken.</p>
      <div class="actions hero-actions"><button class="btn primary" data-action="topics">Kies een onderwerp ↓</button>
      ${last && block(last)?.round ? `<button class="btn secondary" data-action="resume">Ga verder met ${last.name.toLowerCase()}</button>` : ''}</div>
      <p class="hero-meta">Je voortgang wordt in deze browser bewaard.</p>
    </div><figure class="hero-photo"><img src="./img/hero.webp" width="850" height="478" alt="Bovenaanzicht van een heftruck in een magazijngang"></figure>
  </section><section class="home-info" aria-labelledby="topics-title">
    <div class="section-head"><h2 id="topics-title" tabindex="-1">Kies een oefenblok</h2><span class="count-chip">${finished} van ${TOPICS.length} onderwerpen afgerond</span></div>
    <div class="topic-grid">${TOPICS.map(topicCard).join('')}</div>
    <div class="actions all-actions"><button class="btn secondary" data-action="series">${finished === TOPICS.length ? 'Resultaten van alle onderwerpen' : 'Alle '+QUESTIONS.length+' vragen per onderwerp oefenen'}</button>
    ${finished && finished < TOPICS.length ? '<button class="text-button" data-action="overview">Mijn resultaten</button>' : ''}</div>
  </section>`;
}
function artwork(q) {
  if (!q.image) return '';
  return `<figure class="question-art${q.feedbackImage ? ' diagram' : ''}"><img src="./img/${q.image}.webp" alt="${q.alt}"></figure>`;
}
function feedbackBody(q, choices) {
  return `<ul class="review-options">${q.options.map((option, i) => {
    const right = q.correct.includes(i);
    const picked = choices.includes(i);
    const label = right ? (picked ? 'Juist gekozen · +1 punt' : 'Juist antwoord gemist') : picked ? 'Onjuist gekozen' : '';
    return `<li class="${right ? 'correct' : picked ? 'wrong' : ''}"><span class="option-letter" aria-hidden="true">${String.fromCharCode(65+i)}</span><div>${option}${label ? `<small>${label}</small>` : ''}</div></li>`;
  }).join('')}</ul><div class="feedback"><h3>Uitleg</h3><p>${q.feedback}</p>
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
  if (answeredCount(r) === r.ids.length) return 'Afronden en resultaat bekijken';
  return r.current === r.ids[r.ids.length-1] ? 'Naar open vraag' : 'Volgende vraag →';
}
function renderQuestion() {
  const b = block(), r = b.round, id = r.current, position = r.ids.indexOf(id);
  const q = byId.get(id), choices = r.answers[id] || [], count = answeredCount(r);
  return `<section class="work-area">
    <button class="text-button back-link" data-action="topics">← Onderwerpen</button>
    <div class="progress-head"><p class="eyebrow">${b.result ? 'Herhaling · ' : ''}${topic.name}</p><span>Vraag <strong>${position+1}</strong> / ${r.ids.length}</span></div>
    <progress id="round-progress" value="${count}" max="${r.ids.length}" aria-label="Beantwoorde vragen"></progress>
    <details class="question-map"><summary>Vragenoverzicht <span id="round-count">${count}/${r.ids.length} beantwoord</span></summary>
    <div class="map-sections"><div class="map-grid">${r.ids.map((key,i) =>
      `<button class="map-button${r.answers[key] ? ' filled' : ''}" data-action="jump" data-id="${key}" ${key === id ? 'aria-current="step"' : ''} aria-label="Vraag ${i+1}, ${r.answers[key] ? 'beantwoord' : 'open'}">${i+1}</button>`).join('')}</div></div></details>
    <article class="question-card"><div class="question-layout${q.image ? ' with-art' : ''}">
      <h1 id="screen-title" tabindex="-1">${q.prompt}</h1>${artwork(q)}
      <div class="question-content">${choicesForm(q, choices)}</div></div>
      <div class="question-actions"><button class="text-button" data-action="${position ? 'previous' : 'topics'}">${position ? '← Vorige vraag' : 'Terug naar onderwerpen'}</button>
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
  save();
}

function repeatIds() {
  return topic.ids.filter(id => missed(id) ? repeatMissed : repeatRight);
}
function repeatButtonText(n) {
  return n ? `Start herhaling (${n} ${n === 1 ? 'vraag' : 'vragen'})` : 'Start herhaling';
}
function renderResult() {
  const b = block(), errors = topic.ids.filter(missed).length, correct = topic.ids.length-errors;
  const repeatCount = repeatIds().length;
  const subset = b.lastIds?.length && b.lastIds.length < topic.ids.length;
  const nextGroup = TOPICS.find(group => !complete(group));
  return `<section class="work-area result">
    <button class="text-button back-link" data-action="topics">← Onderwerpen</button>
    <div class="result-banner"><div><p class="eyebrow">Onderwerp afgerond</p><h1 id="screen-title" tabindex="-1">${topic.name}</h1>
      <p>${correct} van de ${topic.ids.length} vragen volledig goed.</p>
      ${subset ? `<p>Deze herhaling: ${totalPoints(b.lastIds,b.result)} van ${maxPoints(b.lastIds)} punten.</p>` : ''}</div>
      <div class="score-number"><strong>${totalPoints(topic.ids,b.result)}</strong> / ${maxPoints(topic.ids)}<span>punten voor dit onderwerp</span></div></div>
    <div class="result-body"><h2>Antwoorden nakijken</h2>
      <div class="actions result-actions">
        <button class="btn primary" data-action="review-all">Bekijk alle ${topic.ids.length} vragen</button>
        <button class="btn secondary" data-action="review-missed" ${errors ? '' : 'disabled'}>Bekijk alleen fout of deels goed (${errors})</button>
      </div>
      <fieldset class="repeat-options"><legend>Welke vragen wil je opnieuw oefenen?</legend>
        <label><input id="repeat-missed" type="checkbox" ${repeatMissed ? 'checked' : ''} ${errors ? '' : 'disabled'}> Fout of deels goed (${errors})</label>
        <label><input id="repeat-right" type="checkbox" ${repeatRight ? 'checked' : ''} ${correct ? '' : 'disabled'}> Volledig goed (${correct})</label>
      </fieldset>
      <button class="btn secondary" data-action="repeat" ${repeatCount ? '' : 'disabled'}>${repeatButtonText(repeatCount)}</button>
    </div><div class="actions all-actions">
      ${progress.series ? `<button class="btn primary" data-action="${nextGroup ? 'series' : 'overview'}">${nextGroup ? 'Volgend onderwerp · '+nextGroup.name+' →' : 'Bekijk totaalresultaat'}</button>` : ''}
      <button class="text-button" data-action="topics">Naar de onderwerpen</button>
    </div></section>`;
}
function renderReview() {
  const id = reviewIds[reviewIndex], q = byId.get(id), answers = block().result;
  const score = points(id, answers), max = q.correct.length;
  const verdict = score === max ? 'Volledig goed' : score ? 'Gedeeltelijk goed' : 'Onjuist';
  const last = reviewIndex === reviewIds.length-1;
  return `<section class="work-area review">
    <button class="text-button back-link" data-action="result">← Terug naar je resultaat</button>
    <div class="progress-head"><p class="eyebrow">Nakijken · ${topic.name}</p><span>Vraag ${reviewIndex+1} / ${reviewIds.length}</span></div>
    <article class="question-card"><div class="question-layout${q.image ? ' with-art' : ''}">
      <h1 id="screen-title" tabindex="-1">${q.prompt}</h1>${artwork(q)}
      <div class="question-content"><h2 class="verdict">${verdict} · ${score}/${max} ${max===1 ? 'punt' : 'punten'}</h2>${feedbackBody(q, answers[id])}</div></div>
      <div class="question-actions"><button class="text-button" data-action="review-previous" ${reviewIndex ? '' : 'disabled'}>← Vorige vraag</button>
        <button class="btn primary" data-action="${last ? 'result' : 'review-next'}">${last ? 'Terug naar resultaat' : 'Volgende vraag →'}</button>
      </div></article></section>`;
}
function renderOverview() {
  const finished = TOPICS.filter(complete);
  const total = finished.reduce((sum,g) => sum + totalPoints(g.ids,block(g).result),0);
  const max = finished.reduce((sum,g) => sum + maxPoints(g.ids),0);
  return `<section class="work-area result"><button class="text-button back-link" data-action="topics">← Onderwerpen</button>
    <div class="result-banner"><div><p class="eyebrow">Afgeronde onderwerpen</p><h1 id="screen-title" tabindex="-1">Mijn resultaten</h1><p>${finished.length} van ${TOPICS.length} onderwerpen afgerond.</p></div>
      <div class="score-number"><strong>${total}</strong> / ${max}<span>punten</span></div></div>
    <div class="result-body"><div class="topic-grid">${finished.map(topicCard).join('')}</div>
    <div class="actions all-actions">${finished.length < TOPICS.length ? '<button class="btn primary" data-action="series">Verder oefenen →</button>' :
    '<button class="btn secondary" data-action="restart-series">Alle 57 vragen opnieuw oefenen</button>'}</div></div></section>`;
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
  TOPICS.forEach(group => { block(group).round = newRound(group.ids); });
  openTopic(TOPICS[0].key, true);
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
    case 'resume': openTopic(progress.last, progress.series); break;
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
    case 'repeat': startRepeat(); break;
    case 'restart-series':
      dialog.returnValue = 'cancel';
      dialog.showModal();
      break;
  }
});
main.innerHTML = renderHome();
