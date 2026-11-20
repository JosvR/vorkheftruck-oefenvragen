'use strict';

const VERSION = 'V01.02.00';
const STORAGE_KEY = 'dts-heftruck-oefenen-blokken-v1';
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
const ALL = {key: 'alles', name: 'Alle vragen', ids: QUESTIONS.map(q => q.id)};
const topics = new Map([...TOPICS, ALL].map(topic => [topic.key, topic]));
const main = document.getElementById('main');
const dialog = document.getElementById('confirm');
document.querySelectorAll('.version').forEach(el => { el.textContent = VERSION; });

let progress = loadProgress();
let topic = topics.get(progress.last) || TOPICS[0];
let missedOnly = false;
let confirmAction;

function cleanChoices(q, values) {
  return [...new Set(values)].filter(n => Number.isInteger(n) && n >= 0 && n < q.options.length)
    .slice(0, q.correct.length);
}

function loadProgress() {
  const clean = {items: {}, rounds: {}, last: null};
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === 'object') {
      for (const q of QUESTIONS) {
        const item = saved.items?.[q.id];
        if (!item) continue;
        const entry = {};
        if (Array.isArray(item.answer)) {
          const values = cleanChoices(q, item.answer);
          if (values.length) entry.answer = values;
        }
        if (Array.isArray(item.draft)) entry.draft = cleanChoices(q, item.draft);
        clean.items[q.id] = entry;
      }
      for (const group of topics.values()) {
        const round = saved.rounds?.[group.key];
        if (!round) continue;
        const ids = Array.isArray(round.retry) ? group.ids.filter(id => round.retry.includes(id)) : [];
        const order = ids.length ? ids : group.ids;
        clean.rounds[group.key] = {retry: ids.length ? ids : null, current: order.includes(round.current) ? round.current : order[0]};
      }
      clean.last = topics.has(saved.last) ? saved.last : null;
      return clean;
    }
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
    if (Array.isArray(legacy?.answers) && legacy.answers.length === QUESTIONS.length) {
      QUESTIONS.forEach((q, i) => {
        if (!Array.isArray(legacy.answers[i])) return;
        const values = cleanChoices(q, legacy.answers[i]);
        if (values.length) clean.items[q.id] = legacy.finished ? {answer: values} : {draft: values};
      });
      const current = QUESTIONS[legacy.current]?.id || ALL.ids[0];
      clean.rounds[ALL.key] = {current, retry: null};
      clean.last = ALL.key;
    }
  } catch { /* Oefenen werkt ook als de browser opslag blokkeert. */ }
  return clean;
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* De ronde blijft in dit venster beschikbaar. */ }
}
function reviewed(id) { return Array.isArray(progress.items[id]?.answer); }
function pending(id) { return !reviewed(id) || Array.isArray(progress.items[id].draft); }
function points(id) { return (progress.items[id]?.answer || []).filter(n => byId.get(id).correct.includes(n)).length; }
function missed(id) { return reviewed(id) && points(id) < byId.get(id).correct.length; }
function round() { return progress.rounds[topic.key]; }
function order() { return round().retry || topic.ids; }
function setScreen(view, focusId = 'screen-title') {
  const views = {home: renderHome, question: renderQuestion, result: renderResult};
  main.innerHTML = views[view]();
  const target = document.getElementById(focusId) || main;
  if (focusId === 'feedback-title' || focusId === 'topics-title') {
    target.focus();
    target.scrollIntoView({block: 'start'});
  } else {
    target.focus({preventScroll: true});
    window.scrollTo(0, 0);
  }
}
function openTopic(key) {
  topic = topics.get(key);
  if (!progress.rounds[key]) progress.rounds[key] = {current: topic.ids[0], retry: null};
  progress.last = key;
  if (round().retry && !round().retry.some(pending)) round().retry = null;
  const ids = order();
  const next = ids.find(pending);
  if (!next) return showResult();
  if (!pending(round().current)) round().current = next;
  goQuestion(round().current);
}
function goQuestion(id) {
  round().current = id;
  save();
  setScreen('question');
}
function showResult() {
  missedOnly = false;
  save();
  setScreen('result');
}

function renderHome() {
  const last = topics.get(progress.last);
  const completed = ALL.ids.filter(reviewed).length;
  return `<section class="hero">
    <div class="hero-copy">
      <img class="hero-logo" src="./img/logo.webp" width="304" height="82" alt="Deltalinqs Training &amp; Services">
      <h1>Heftruck en<br class="hero-break"> reachtruck</h1>
      <p class="hero-intro">Kies een onderwerp. Na elke vraag zie je wat goed ging en waarom.</p>
      <div class="actions hero-actions">
        <button class="btn primary" data-action="topics">Kies een onderwerp <span aria-hidden="true">↓</span></button>
        ${last && last.ids.some(pending) ? `<button class="btn secondary" data-action="open" data-key="${last.key}">Ga verder met ${last.name.toLowerCase()}</button>` : ''}
      </div>
      <p class="hero-meta">${completed ? `${completed} van de ${ALL.ids.length} vragen nagekeken` : 'Je voortgang wordt in deze browser bewaard.'}</p>
    </div>
    <figure class="hero-photo"><img src="./img/hero.webp" width="850" height="478" alt="Bovenaanzicht van een heftruck in een magazijngang"></figure>
  </section>
  <section class="home-info" aria-labelledby="topics-title">
    <div class="section-head"><h2 id="topics-title" tabindex="-1">Kies een oefenblok</h2><span class="count-chip">${TOPICS.length} onderwerpen · ${QUESTIONS.length} vragen</span></div>
    <div class="topic-grid">${TOPICS.map(group => {
      const count = group.ids.filter(reviewed).length;
      const inProgress = group.ids.some(id => progress.items[id]?.draft);
      const label = count === group.ids.length && !inProgress ? 'Bekijk resultaat' : count || inProgress ? 'Verder oefenen' : 'Start oefenblok';
      return `<button class="topic topic-link" data-action="open" data-key="${group.key}">
        <span class="topic-count">${count ? `${count}/${group.ids.length} nagekeken` : `${group.ids.length} vragen`}</span>
        <strong>${group.name}</strong><span class="topic-cta">${label} <span aria-hidden="true">→</span></span></button>`;
    }).join('')}</div>
    <div class="actions all-actions"><button class="btn secondary" data-action="open" data-key="alles">Alle ${QUESTIONS.length} vragen oefenen</button>
    ${completed ? '<button class="text-button" data-action="overview">Mijn resultaten</button>' : ''}</div>
  </section>`;
}

function artwork(q) {
  if (!q.image) return '';
  return `<figure class="question-art${q.feedbackImage ? ' diagram' : ''}"><img src="./img/${q.image}.webp" alt="${q.alt}"></figure>`;
}
function feedbackBody(q) {
  const choices = progress.items[q.id].answer;
  return `<ul class="review-options">${q.options.map((option, i) => {
    const right = q.correct.includes(i);
    const picked = choices.includes(i);
    const label = right ? (picked ? 'Juist gekozen · +1 punt' : 'Juist antwoord gemist') : picked ? 'Onjuist gekozen' : '';
    return `<li class="${right ? 'correct' : picked ? 'wrong' : ''}"><span class="option-letter" aria-hidden="true">${String.fromCharCode(65+i)}</span><div>${option}${label ? `<small>${label}</small>` : ''}</div></li>`;
  }).join('')}</ul><div class="feedback"><h3>Uitleg</h3><p>${q.feedback}</p>
    ${q.feedbackImage ? `<img class="feedback-image" src="./img/${q.feedbackImage}.webp" alt="${q.feedbackAlt}" loading="lazy" width="425" height="464">` : ''}</div>`;
}
function choicesForm(q) {
  const choices = progress.items[q.id]?.draft || [];
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
function renderQuestion() {
  const ids = order(), id = round().current, q = byId.get(id);
  const position = ids.indexOf(id);
  const checked = !pending(id);
  const count = ids.filter(key => !pending(key)).length;
  const nextOpen = ids.some(key => pending(key));
  const score = points(id);
  const verdict = score === q.correct.length ? 'Goed beantwoord' : score ? 'Gedeeltelijk goed' : 'Onjuist beantwoord';
  return `<section class="work-area">
    <button class="text-button back-link" data-action="topics">← Onderwerpen</button>
    <div class="progress-head"><p class="eyebrow">${round().retry ? 'Herhalen · ' : ''}${topic.name}</p><span>Vraag <strong>${position+1}</strong> / ${ids.length}</span></div>
    <progress max="${ids.length}" value="${count}" aria-label="Nagekeken vragen"></progress>
    <details class="question-map"><summary>Vragenoverzicht <span>${count}/${ids.length} nagekeken</span></summary>
      <div class="map-sections"><div class="map-grid">${ids.map((key,i) => `<button class="map-button${pending(key) ? '' : ' filled'}" data-action="jump" data-id="${key}" ${key===id ? 'aria-current="step"' : ''} aria-label="Vraag ${i+1}, ${pending(key) ? 'open' : 'nagekeken'}">${i+1}</button>`).join('')}</div></div></details>
    <article class="question-card">
      <div class="question-layout${q.image ? ' with-art' : ''}">
        <h1 id="screen-title" tabindex="-1">${q.prompt}</h1>${artwork(q)}
        <div class="question-content">${checked ? `<h2 class="verdict" id="feedback-title" tabindex="-1">${verdict} · ${score}/${q.correct.length} ${q.correct.length === 1 ? 'punt' : 'punten'}</h2>${feedbackBody(q)}` : choicesForm(q)}</div>
      </div>
      <div class="question-actions"><button class="text-button" data-action="block-result">Blokoverzicht</button>
      ${checked ? `<button class="btn primary" data-action="${nextOpen ? 'next' : 'block-result'}">${nextOpen ? 'Volgende vraag' : 'Bekijk resultaat'} →</button>` :
        `<button class="btn primary" data-action="check" ${progress.items[id]?.draft?.length ? '' : 'disabled'}>Controleer antwoord</button>`}
      </div>
    </article></section>`;
}
function updateSelection() {
  const id = round().current, limit = byId.get(id).correct.length;
  if (!pending(id)) return;
  const inputs = [...main.querySelectorAll('input[name="answer"]')];
  const choices = inputs.filter(input => input.checked).map(input => Number(input.value));
  if (choices.length > limit) return;
  progress.items[id] = {...progress.items[id], draft: choices};
  if (limit > 1) {
    inputs.forEach(input => { input.disabled = !input.checked && choices.length >= limit; });
    document.getElementById('selection-status').textContent = `${choices.length} van ${limit} gekozen`;
  }
  main.querySelector('[data-action="clear"]').hidden = !choices.length;
  main.querySelector('[data-action="check"]').disabled = !choices.length;
  save();
}

function renderResult() {
  const checked = topic.ids.filter(reviewed);
  const errors = checked.filter(missed);
  const visible = missedOnly ? errors : checked;
  const total = checked.reduce((sum,id) => sum + points(id), 0);
  const max = checked.reduce((sum,id) => sum + byId.get(id).correct.length, 0);
  return `<section class="work-area result">
    <button class="text-button back-link" data-action="topics">← Onderwerpen</button>
    <div class="result-banner"><div><p class="eyebrow">Jouw resultaat</p><h1 id="screen-title" tabindex="-1">${topic.name}</h1>
      <p>${checked.length} van de ${topic.ids.length} vragen nagekeken.</p></div>
      ${checked.length ? `<div class="score-number"><strong>${total}</strong> / ${max}<span>punten bij nagekeken vragen</span></div>` : ''}</div>
    <div class="result-body"><div class="actions">
      ${topic.ids.some(pending) ? '<button class="btn primary" data-action="continue">Verder oefenen</button>' : '<button class="btn primary" data-action="topics">Kies een ander onderwerp</button>'}
      ${errors.length ? `<button class="btn secondary" data-action="retry">Herhaal ${errors.length === 1 ? '1 gemiste vraag' : errors.length+' gemiste vragen'}</button>` : ''}
      ${checked.length ? '<button class="text-button" data-action="reset">Opnieuw beginnen</button>' : ''}</div>
    ${checked.length ? `<h2 class="review-heading">Je antwoorden</h2>
      <div class="filter-bar" aria-label="Filter antwoorden">
        <button class="btn secondary" data-action="filter-all" aria-pressed="${!missedOnly}">Alle nagekeken vragen</button>
        <button class="btn secondary" data-action="filter-missed" aria-pressed="${missedOnly}">Punten gemist (${errors.length})</button></div>
      <div class="review-list">${visible.map(id => {
        const q=byId.get(id), score=points(id);
        const kind=score === q.correct.length ? 'correct' : score ? 'partial' : 'missed';
        return `<details class="review-item"><summary><span class="review-number">${topic.ids.indexOf(id)+1}</span><span class="review-prompt">${q.prompt}</span>
          <span class="score-chip ${kind}">${score}/${q.correct.length} p</span></summary><div class="review-body">${feedbackBody(q)}</div></details>`;
      }).join('') || '<p>Je hebt bij deze vragen alle punten behaald.</p>'}</div>` : ''}</div></section>`;
}

function restart(ids, retry) {
  for (const id of ids) {
    if (retry) progress.items[id] = {...progress.items[id], draft: []};
    else delete progress.items[id];
  }
  if (!retry && topic === ALL) progress.rounds = {};
  progress.last = topic.key;
  progress.rounds[topic.key] = {retry: retry ? ids : null, current: ids[0]};
  goQuestion(ids[0]);
}
function confirmReset() {
  document.getElementById('confirm-title').textContent = 'Opnieuw beginnen?';
  document.getElementById('confirm-text').textContent = `Je wist je antwoorden voor ‘${topic.name}’ (${topic.ids.length} vragen).`;
  confirmAction = () => restart(topic.ids, false);
  dialog.returnValue = 'cancel';
  dialog.showModal();
}
dialog.addEventListener('close', () => {
  if (dialog.returnValue === 'ok') confirmAction?.();
  confirmAction = undefined;
});
main.addEventListener('change', event => { if (event.target.matches('input[name="answer"]')) updateSelection(); });
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  switch (button.dataset.action) {
    case 'home': setScreen('home'); break;
    case 'topics': setScreen('home', 'topics-title'); break;
    case 'open': openTopic(button.dataset.key); break;
    case 'jump': goQuestion(button.dataset.id); break;
    case 'clear':
      main.querySelectorAll('input[name="answer"]').forEach(el => { el.checked = false; });
      updateSelection();
      main.querySelector('input[name="answer"]').focus();
      break;
    case 'check': {
      const id = round().current;
      const draft = progress.items[id]?.draft;
      if (!draft?.length) break;
      progress.items[id] = {answer: draft};
      save();
      setScreen('question', 'feedback-title');
      break;
    }
    case 'next': {
      const ids = order(), start = ids.indexOf(round().current)+1;
      const next = [...ids.slice(start), ...ids.slice(0,start)].find(pending);
      if (next) goQuestion(next); else showResult();
      break;
    }
    case 'overview': topic = ALL; showResult(); break;
    case 'block-result': showResult(); break;
    case 'continue': openTopic(topic.key); break;
    case 'retry': restart(topic.ids.filter(missed), true); break;
    case 'reset': confirmReset(); break;
    case 'filter-all':
    case 'filter-missed':
      missedOnly = button.dataset.action === 'filter-missed';
      main.innerHTML = renderResult();
      main.querySelector(`[data-action="${button.dataset.action}"]`).focus({preventScroll:true});
      break;
  }
});
main.innerHTML = renderHome();
