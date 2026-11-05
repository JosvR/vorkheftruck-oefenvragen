'use strict';

const VERSION = 'V01.01.00';
const STORAGE_KEY = 'dts-heftruck-oefenen-' + VERSION;
const GROUPS = [
  {prefix: 'A', name: 'Arbowet', description: 'Plichten, RI&E en veilig werken'},
  {prefix: 'K', name: 'Kennis toepassen', description: 'Risico’s herkennen en keuzes maken'},
  {prefix: 'V', name: 'Veiligheid', description: 'Stabiliteit, omgeving en capaciteit'},
  {prefix: 'R', name: 'Bediening', description: 'Rijden, laden, stapelen en parkeren'}
];
const main = document.getElementById('main');
const dialog = document.getElementById('confirm');
document.getElementById('version').textContent = VERSION;

let attempt = loadAttempt();
let screen = 'home';
let current = attempt?.current ?? 0;
let filter = 'all';
let mapOpen = false;
let confirmAction;

function loadAttempt() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!data || !Array.isArray(data.answers) || data.answers.length !== QUESTIONS.length) return null;
    const answers = QUESTIONS.map((q, i) => {
      const stored = Array.isArray(data.answers[i]) ? data.answers[i] : [];
      return [...new Set(stored)].filter(n => Number.isInteger(n) && n >= 0 && n < q.options.length)
        .slice(0, q.correct.length);
    });
    const current = Number.isInteger(data.current) && QUESTIONS[data.current] ? data.current : 0;
    return {answers, current, finished: data.finished === true};
  } catch {
    return null;
  }
}

function saveAttempt() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
  } catch {
    // The current attempt is still available in memory if storage is disabled.
  }
}

function countAnswered() {
  return attempt.answers.filter(answers => answers.length > 0).length;
}

function score(index) {
  return attempt.answers[index].filter(answer => QUESTIONS[index].correct.includes(answer)).length;
}

function renderHome() {
  const saved = attempt && !attempt.finished;
  const startText = attempt?.finished ? 'Bekijk je resultaat' : saved ? 'Ga verder met oefenen' : 'Start met oefenen';
  return `
    <section class="hero">
      <div class="hero-copy">
        <img class="hero-logo" src="./img/logo.webp" width="304" height="82" alt="Deltalinqs Training &amp; Services">
        <p class="eyebrow"><span class="dot"></span> VOORBEREIDING OP JE TRAINING</p>
        <h1>Heftruck en<br class="hero-break"> reachtruck</h1>
        <p class="hero-intro">Oefen zelfstandig met praktijksituaties over veilig werken, rijden en lasten verplaatsen.</p>
        <div class="actions hero-actions">
          <button class="btn primary" type="button" data-action="start">${startText} <span aria-hidden="true">→</span></button>
          ${attempt ? '<button class="btn secondary" type="button" data-action="reset">Opnieuw beginnen</button>' : ''}
        </div>
        <p class="hero-meta">${saved ? `${countAnswered()} van de ${QUESTIONS.length} vragen ingevuld op dit apparaat` : 'In je eigen tempo · Zonder account'}</p>
      </div>
      <figure class="hero-photo">
        <img src="./img/hero.webp" width="850" height="478" alt="Bovenaanzicht van een heftruck in een magazijngang">
        <figcaption><span class="photo-rule"></span> INTERN TRANSPORT</figcaption>
      </figure>
    </section>
    <section class="home-info" aria-labelledby="how">
      <div class="section-head">
        <div><p class="eyebrow">ZELFSTUDIE</p><h2 id="how">Zo werkt de oefentoets</h2></div>
        <span class="count-chip">${QUESTIONS.length} vragen · 4 onderwerpen</span>
      </div>
      <div class="topic-grid">${GROUPS.map((g, i) => `
        <article class="topic"><span class="topic-no">0${i + 1}</span><h3>${g.name}</h3><p>${g.description}</p></article>`).join('')}</div>
      <p class="info-note">Bij sommige vragen kies je meerdere antwoorden. Elk juist gekozen antwoord telt voor één punt. Na afloop zie je je eigen keuzes, de gemiste antwoorden en de uitleg. Je kunt tussendoor stoppen en in dezelfde browser verdergaan.</p>
    </section>`;
}

function renderMap() {
  return `<details class="question-map"${mapOpen ? ' open' : ''}>
    <summary>Vragenoverzicht <span>${countAnswered()}/${QUESTIONS.length} ingevuld</span></summary>
    <div class="map-sections">${GROUPS.map(group => `
      <div><p>${group.name}</p><div class="map-grid">${QUESTIONS.flatMap((q, i) => q.id.startsWith(group.prefix) ? [`
        <button type="button" class="map-button${attempt.answers[i].length ? ' filled' : ''}" data-action="jump" data-index="${i}" ${i === current ? 'aria-current="step"' : ''} aria-label="Vraag ${i + 1}, ${attempt.answers[i].length ? 'ingevuld' : 'open'}">${i + 1}</button>`] : []).join('')}</div></div>`).join('')}
    </div>
  </details>`;
}

function artwork(q) {
  if (!q.image) return '';
  return `<figure class="question-art${q.feedbackImage ? ' diagram' : ''}"><img src="./img/${q.image}.webp" alt="${q.alt}"><figcaption>Beeld bij dit onderwerp</figcaption></figure>`;
}

function limitText(q) {
  const limit = q.correct.length;
  return limit === 1 ? 'Kies één antwoord.' : `Kies ${limit} antwoorden.`;
}

function renderQuestion() {
  const q = QUESTIONS[current];
  const group = GROUPS.find(g => q.id.startsWith(g.prefix));
  const answers = attempt.answers[current];
  const limit = q.correct.length;
  const isLast = current === QUESTIONS.length - 1;
  return `<section class="work-area">
    <div class="progress-head"><p class="eyebrow">${group.name}</p><span>Vraag <strong>${current + 1}</strong> / ${QUESTIONS.length}</span></div>
    <progress max="${QUESTIONS.length}" value="${countAnswered()}" aria-label="Ingevulde vragen"></progress>
    ${renderMap()}
    <article class="question-card">
      <div class="question-layout${q.image ? ' with-art' : ''}">
        <h1 id="screen-title" tabindex="-1">${q.prompt}</h1>
        ${artwork(q)}
        <div class="question-content">
          <p class="choice-instruction" id="choice-instruction">${limitText(q)}</p>
          <fieldset class="choices" aria-describedby="choice-instruction">
            <legend class="sr-only">Antwoordmogelijkheden</legend>
            ${q.options.map((option, i) => `
              <label class="choice">
                <input name="answer" type="${limit === 1 ? 'radio' : 'checkbox'}" value="${i}" ${answers.includes(i) ? 'checked' : ''} ${limit > 1 && answers.length >= limit && !answers.includes(i) ? 'disabled' : ''}>
                <span class="option-letter" aria-hidden="true">${String.fromCharCode(65 + i)}</span>
                <span>${option}</span>
              </label>`).join('')}
          </fieldset>
          <div class="choice-status">
            <p id="selection-status" role="status">${limit > 1 ? selectionMessage(answers.length, limit) : ''}</p>
            <button type="button" class="text-button" data-action="clear"${answers.length ? '' : ' hidden'}>Wis keuze</button>
          </div>
        </div>
      </div>
      <div class="question-actions">
        <button class="btn secondary" type="button" data-action="${current ? 'previous' : 'home'}"><span aria-hidden="true">←</span> ${current ? 'Vorige' : 'Startpagina'}</button>
        ${isLast ? '' : '<button class="text-button finish-link" type="button" data-action="finish">Afronden</button>'}
        <button class="btn primary" type="button" data-action="${isLast ? 'finish' : 'next'}">${isLast ? 'Bekijk resultaat' : 'Volgende'} <span aria-hidden="true">→</span></button>
      </div>
    </article>
  </section>`;
}

function selectionMessage(count, limit) {
  return count === limit ? `${count} van ${limit} gekozen. Wis of deselecteer een keuze om te wisselen.` : `${count} van ${limit} gekozen.`;
}

function updateSelection() {
  const inputs = [...main.querySelectorAll('input[name="answer"]')];
  const answers = inputs.filter(input => input.checked).map(input => Number(input.value));
  const limit = QUESTIONS[current].correct.length;
  if (answers.length > limit) return;
  attempt.answers[current] = answers;
  if (limit > 1) {
    inputs.forEach(input => { input.disabled = !input.checked && answers.length >= limit; });
    document.getElementById('selection-status').textContent = selectionMessage(answers.length, limit);
  }
  main.querySelector('[data-action="clear"]').hidden = !answers.length;
  main.querySelector('progress').value = countAnswered();
  const map = main.querySelector('.question-map');
  map.querySelector('summary span').textContent = `${countAnswered()}/${QUESTIONS.length} ingevuld`;
  const marker = map.querySelector('[aria-current="step"]');
  marker.classList.toggle('filled', answers.length > 0);
  marker.setAttribute('aria-label', `Vraag ${current + 1}, ${answers.length ? 'ingevuld' : 'open'}`);
  saveAttempt();
}

function renderResult() {
  const max = QUESTIONS.reduce((total, q) => total + q.correct.length, 0);
  const points = QUESTIONS.reduce((total, q, i) => total + score(i), 0);
  const complete = QUESTIONS.filter((q, i) => score(i) === q.correct.length).length;
  return `<section class="work-area result">
    <div class="result-banner">
      <div><p class="eyebrow">OEFENRONDE AFGEROND</p><h1 id="screen-title" tabindex="-1">Je resultaat</h1>
      <p>${complete} van de ${QUESTIONS.length} vragen volledig goed.</p></div>
      <div class="score-number"><strong>${points}</strong> / ${max}<span>punten</span></div>
    </div>
    <div class="result-body">
      <h2>Per onderwerp</h2>
      <div class="result-groups">
        ${GROUPS.map(group => {
          const indices = QUESTIONS.flatMap((q, i) => q.id.startsWith(group.prefix) ? [i] : []);
          const groupMax = indices.reduce((total, i) => total + QUESTIONS[i].correct.length, 0);
          const groupPoints = indices.reduce((total, i) => total + score(i), 0);
          return `<div class="result-group"><div><strong>${group.name}</strong><span>${groupPoints} / ${groupMax} punten</span></div><progress max="${groupMax}" value="${groupPoints}" aria-label="Punten voor ${group.name}"></progress></div>`;
        }).join('')}
      </div>
      <div class="actions">
        <button class="btn primary" type="button" data-action="review">Bekijk alle antwoorden <span aria-hidden="true">→</span></button>
        ${complete < QUESTIONS.length ? '<button class="btn secondary" type="button" data-action="review-missed">Bekijk wat je gemist hebt</button>' : ''}
        <button class="text-button" type="button" data-action="reset">Opnieuw beginnen</button>
      </div>
    </div>
  </section>`;
}

function renderReview() {
  const visible = QUESTIONS.map((q, i) => {
    const points = score(i);
    const max = q.correct.length;
    if (filter === 'missed' && points === max) return '';
    const answers = attempt.answers[i];
    const state = points === max ? 'correct' : points ? 'partial' : 'missed';
    return `<details class="review-item">
      <summary>
        <span class="review-number">${i + 1}</span>
        <span class="review-prompt">${q.prompt}</span>
        <span class="score-chip ${state}">${points}/${max} p</span>
      </summary>
      <div class="review-body">
        ${answers.length ? '' : '<p class="unanswered">Je hebt deze vraag overgeslagen.</p>'}
        <ul class="review-options">${q.options.map((option, j) => {
          const right = q.correct.includes(j);
          const picked = answers.includes(j);
          const kind = right ? 'correct' : picked ? 'wrong' : '';
          const label = right ? (picked ? 'Juist gekozen · +1 punt' : 'Juist antwoord gemist') : picked ? 'Onjuist gekozen' : '';
          return `<li class="${kind}"><span class="option-letter" aria-hidden="true">${String.fromCharCode(65 + j)}</span><div>${option}${label ? `<small>${label}</small>` : ''}</div></li>`;
        }).join('')}</ul>
        <div class="feedback">
          <h3>Uitleg</h3><p>${q.feedback}</p>
          ${q.feedbackImage ? `<img class="feedback-image" src="./img/${q.feedbackImage}.webp" alt="${q.feedbackAlt}" loading="lazy" width="425" height="464">` : ''}
        </div>
      </div>
    </details>`;
  }).join('');
  return `<section class="work-area review">
    <button class="text-button back-link" type="button" data-action="result"><span aria-hidden="true">←</span> Naar je resultaat</button>
    <p class="eyebrow">NAKIJKEN</p><h1 id="screen-title" tabindex="-1">Bekijk je antwoorden</h1>
    <p>Open een vraag om je keuzes, de punten en de uitleg te zien.</p>
    <div class="filter-bar" aria-label="Filter antwoorden">
      <button class="btn secondary" type="button" aria-pressed="${filter === 'all'}" data-action="filter-all">Alle vragen</button>
      <button class="btn secondary" type="button" aria-pressed="${filter === 'missed'}" data-action="filter-missed">Punten gemist</button>
    </div>
    <div class="review-list">${visible || '<p class="feedback">Je hebt alle vragen volledig goed beantwoord.</p>'}</div>
  </section>`;
}

function render({focus = true} = {}) {
  const views = {home: renderHome, question: renderQuestion, result: renderResult, review: renderReview};
  main.innerHTML = views[screen]();
  if (focus) {
    (document.getElementById('screen-title') || main).focus({preventScroll: true});
    window.scrollTo(0, 0);
  }
  const map = main.querySelector('.question-map');
  map?.addEventListener('toggle', () => { mapOpen = map.open; });
}

function goToQuestion(index, {keepMap = false} = {}) {
  current = index;
  attempt.current = index;
  mapOpen = keepMap && mapOpen;
  screen = 'question';
  saveAttempt();
  render();
}

function newAttempt() {
  attempt = {answers: QUESTIONS.map(() => []), current: 0, finished: false};
  goToQuestion(0);
}

function finish() {
  attempt.finished = true;
  saveAttempt();
  screen = 'result';
  render();
}

function confirm(title, message, buttonText, callback) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-text').textContent = message;
  document.getElementById('confirm-ok').textContent = buttonText;
  confirmAction = callback;
  dialog.returnValue = 'cancel';
  dialog.showModal();
}

dialog.setAttribute('aria-labelledby', 'confirm-title');
dialog.setAttribute('aria-describedby', 'confirm-text');
dialog.addEventListener('close', () => {
  if (dialog.returnValue === 'ok') confirmAction?.();
  confirmAction = undefined;
});

main.addEventListener('change', event => {
  if (event.target.matches('input[name="answer"]')) updateSelection();
});

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  switch (button.dataset.action) {
    case 'home': screen = 'home'; render(); break;
    case 'start':
      if (!attempt) newAttempt();
      else if (attempt.finished) { screen = 'result'; render(); }
      else goToQuestion(attempt.current);
      break;
    case 'previous': goToQuestion(current - 1); break;
    case 'next': goToQuestion(current + 1); break;
    case 'jump': goToQuestion(Number(button.dataset.index), {keepMap: true}); break;
    case 'clear': {
      main.querySelectorAll('input[name="answer"]').forEach(input => { input.checked = false; });
      updateSelection();
      main.querySelector('input[name="answer"]').focus({preventScroll: true});
      break;
    }
    case 'finish': {
      const open = QUESTIONS.length - countAnswered();
      if (!open) finish();
      else confirm('Oefentoets afronden?', `${open} ${open === 1 ? 'vraag is' : 'vragen zijn'} nog leeg. Je kunt je antwoorden na het afronden nakijken.`, 'Rond af', finish);
      break;
    }
    case 'reset':
      confirm('Opnieuw beginnen?', 'Je eerdere antwoorden op dit apparaat worden gewist.', 'Begin opnieuw', newAttempt);
      break;
    case 'result': screen = 'result'; render(); break;
    case 'review':
    case 'review-missed':
      filter = button.dataset.action === 'review' ? 'all' : 'missed';
      screen = 'review'; render(); break;
    case 'filter-all':
    case 'filter-missed':
      filter = button.dataset.action === 'filter-all' ? 'all' : 'missed';
      render({focus: false});
      main.querySelector(`[data-action="${button.dataset.action}"]`).focus();
      break;
  }
});

render({focus: false});
