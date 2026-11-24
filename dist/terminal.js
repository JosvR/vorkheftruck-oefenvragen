'use strict';

let soundEnabled = false, terminalAudio = null, clipPlayback = 0;

const SCENES = {
  "arbo": {
    "alt": "Portofoon, helm en handschoenen in de ploegkamer",
    "x": 71,
    "y": 66,
    "ask": "Wat wil jij weten bij de ploegwissel?",
    "see": "Vraag welke afspraken vandaag gelden en of er iets aan de rijroutes is veranderd. Zo weet je waar je extra moet opletten."
  },
  "controle": {
    "alt": "Voorwiel van een gele heftruck in de stalling",
    "x": 45,
    "y": 52,
    "ask": "Wat zie je bij een rondje om de truck?",
    "see": "Je kunt het loopvlak en de zijkant van de band bekijken. Op de foto zie je maar één wiel. Loop in de praktijk de hele truck na volgens de controlelijst."
  },
  "verkeer": {
    "alt": "Een gemarkeerde voetgangersoversteek naast een blauwe loodsdeur",
    "x": 36,
    "y": 82,
    "ask": "Waar kan iemand jouw route kruisen?",
    "see": "De witte strepen lopen tot bij de loodsdeur. De deur en de hoek beperken je zicht op iemand die wil oversteken."
  },
  "ondergrond": {
    "alt": "Natte rijroute met een afvoergoot en los hout naast de loods",
    "x": 89,
    "y": 66,
    "ask": "Wat meld je over deze route?",
    "see": "Noem de plek én wat je zag. Hier liggen stukken hout rechts bij de loods en is de bestrating nat. Je collega weet nu waarop hij moet letten."
  },
  "stabiliteit": {
    "alt": "Industriële pomp op een stalen frame en een houten pallet",
    "x": 34,
    "y": 52,
    "ask": "Ligt het gewicht midden op de pallet?",
    "see": "Dat kun je aan deze foto niet bepalen. De pomp en de motor verdelen het gewicht niet vanzelf gelijk. Zoek de gegevens van de last op."
  },
  "capaciteit": {
    "alt": "Lange houten transportkist op de vloer van de goederenontvangst",
    "x": 55,
    "y": 45,
    "ask": "Kun je deze kist op hoogte wegzetten?",
    "see": "De buitenkant vertelt je onvoldoende. Voor het passende lastdiagram heb je onder meer het lastgewicht, de lastzwaartepuntafstand en de gewenste hefhoogte nodig."
  },
  "opnemen": {
    "alt": "Blauw transportrek met twee rechthoekige vorkopnames onderaan",
    "x": 64,
    "y": 83,
    "ask": "Welke openingen horen bij de vorken?",
    "see": "Onderaan het rek zie je twee rechthoekige vorkopnames. Controleer de instructie van het rek en stel de vorken af op de opnames."
  },
  "stapelen": {
    "alt": "Geopende vrachtwagentrailer en een pallet op de laadplaats",
    "x": 64,
    "y": 50,
    "ask": "Wat kun je vanaf hier nog niet zien?",
    "see": "De trailer staat klaar, maar de foto laat niet zien welke afspraken met de chauffeur zijn gemaakt. Stem vóór het laden af waar hij wacht en of de vrachtwagen veilig stilstaat."
  }
};
const CLIPS = {
  "verkeer": {
    "file": "uitzwaai",
    "title": "Linksaf. Waar gaat de achterkant heen?",
    "caption": "Volg de blauwe stip op de achterhoek. Terwijl de vorken naar links draaien, zwaait de achterkant eerst naar rechts.",
    "alt": "Bovenaanzicht van een links insturende heftruck met de baan van de rechterachterhoek."
  },
  "capaciteit": {
    "file": "vorkhiel",
    "title": "Van vorkhiel tot zwaartepunt",
    "caption": "Volg de gele maatlijn. Je meet horizontaal van de binnenkant van de vorkhiel tot recht onder het zwaartepunt van de last.",
    "alt": "Zijaanzicht van een vork met kist. De maatlijn loopt van de vorkhiel tot onder het lastzwaartepunt."
  }
};

function liftPoints() {
  return TOPICS.reduce((sum,group) => {
    const b = block(group);
    if (b?.result) return sum + group.ids.length;
    return sum + (b?.round ? answeredCount(b.round) : 0);
  }, 0);
}

function liftMeter(compact = false) {
  const count = liftPoints(), max = QUESTIONS.length;
  return `<section class="lift-meter${compact ? ' compact-meter' : ''}" aria-label="Hefmeter" data-points="${count}" style="--lift:${-100*count/max}px;--extension:${-42*count/max}px">
    <div class="lift-readout"><span class="meter-label">Hefmeter</span>
      <p class="meter-score"><strong data-lift-value>${count}</strong><span> / ${max}</span></p>
      <span class="meter-unit">hefpunten</span><span class="point-bump" aria-hidden="true">+1</span></div>
    <svg class="lift-scene" viewBox="0 0 330 174" aria-hidden="true" focusable="false">
      <defs><pattern id="grid-lift" width="17" height="17" patternUnits="userSpaceOnUse"><path d="M17 0H0V17" fill="none" stroke="#1f4351" stroke-width=".8"/></pattern></defs>
      <rect width="330" height="174" rx="6" fill="url(#grid-lift)"/>
      <g fill="none" stroke="#557888"><path d="M13 154H282M283 143V43"/><path d="M277 143h11m-11-33h11m-11-34h11m-11-33h11"/></g>
      <g fill="#bfd3d7" font-family="monospace" font-size="12"><text x="292" y="147">0</text><text x="292" y="114">19</text><text x="292" y="80">38</text><text x="292" y="47">57</text></g>
      <ellipse cx="153" cy="155" rx="119" ry="3" fill="#091920"/>
      <path d="M76 120V68l7-3h62l12 51" stroke="#c4d2d3" stroke-width="5" fill="none"/>
      <path d="M76 67l7-6h65l4 7z" fill="#e1ae4e"/><path d="M89 71h47l7 27H91z" fill="#406275" opacity=".55"/>
      <path d="M87 89l6 17h17" stroke="#101c27" stroke-width="8" fill="none"/><path d="M132 113l5-17m-7 1l14-4" stroke="#afc7c9" stroke-width="3"/>
      <path d="M53 109l6-7h34l13 16h24l10-17h19l10 32-14 10H62l-16-9z" fill="#f3ac35" stroke="#ffce72" stroke-width="1.5"/>
      <path d="M47 125h40l10 9h43l13-13 15 3-4 17H62l-16-8z" fill="#c17628"/><path d="M54 109h23m-24 5h24m-25 5h24" stroke="#77542e" stroke-width="2.5"/>
      <g fill="#13252c" stroke="#556774" stroke-width="3"><circle cx="71" cy="141" r="13"/><circle cx="149" cy="137" r="17"/></g>
      <g fill="#c2d2d4" stroke="#768d98" stroke-width="3"><circle cx="71" cy="141" r="5"/><circle cx="149" cy="137" r="7"/></g>
      <path d="M164 140V58h7v82" fill="#476474" stroke="#91a9b5" stroke-width="2"/>
      <g class="mast-stage"><path d="M170 125V55h6v70" fill="#7898a2" stroke="#c7d7d8" stroke-width="1.5"/></g>
      <g class="load-stage">
        <path d="M175 121h5v20h83v3h-89z" fill="#dbe4df"/><path d="M180 134h72v5h-72zM183 138h8v3h-8zm28 0h8v3h-8zm28 0h8v3h-8z" fill="#d6b17c"/>
        <path d="M181 108h67v26h-67z" fill="#bc8750" stroke="#f6ca83" stroke-width="1.6"/>
        <path d="M184 111l61 20m-61 0l61-20" stroke="#e9b675" stroke-width="3"/>
        <path d="M190 109v24m48-24v24" stroke="#605640" stroke-width="4"/>
        <path d="M255 143h20" stroke="#84ded2" stroke-dasharray="3 3"/><circle cx="282" cy="143" r="3" fill="#8fe7ce"/>
      </g></svg>
    <span class="sr-only" role="status" data-lift-status></span></section>`;
}

function updateLiftMeter() {
  const meter = main.querySelector('.lift-meter');
  if (!meter) return;
  const before = Number(meter.dataset.points), value = liftPoints();
  if (value === before) return;
  meter.dataset.points = value;
  meter.style.setProperty('--lift', `${-100*value/QUESTIONS.length}px`);
  meter.style.setProperty('--extension', `${-42*value/QUESTIONS.length}px`);
  meter.querySelector('[data-lift-value]').textContent = value;
  meter.querySelector('[data-lift-status]').textContent = `${value} van ${QUESTIONS.length} hefpunten`;
  const bump = meter.querySelector('.point-bump');
  bump.getAnimations?.().forEach(animation => animation.cancel());
  if (value > before) {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      bump.animate?.([{opacity:1,transform:'translateY(4px)'},{opacity:1,offset:.55},{opacity:0,transform:'translateY(-13px)'}], {duration:850});
    }
    playCue('lift');
  }
}

function setupSound() {
  try { soundEnabled = localStorage.getItem('dts-heftruck-geluid') === 'aan'; } catch { /* Stille start. */ }
  const button = document.getElementById('sound-switch');
  if (!(window.AudioContext || window.webkitAudioContext)) { button.hidden = true; return; }
  const refresh = () => {
    button.setAttribute('aria-pressed', String(soundEnabled));
    button.querySelector('span').textContent = soundEnabled ? 'Geluid aan' : 'Geluid uit';
  };
  refresh();
  button.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    try { localStorage.setItem('dts-heftruck-geluid', soundEnabled ? 'aan' : 'uit'); } catch { /* Werkt per venster. */ }
    refresh();
    if (soundEnabled) playCue('radio');
    else if (terminalAudio?.state === 'running') terminalAudio.suspend().catch(() => {});
  });
}

async function playCue(kind) {
  if (!soundEnabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    terminalAudio ||= new Audio();
    if (terminalAudio.state !== 'running') await terminalAudio.resume();
    if (!soundEnabled || terminalAudio.state !== 'running') return;
    const now = terminalAudio.currentTime;
    const cues = {
      lift: [[0, 115, 177, .23, .052, 'triangle'], [.14, 380, 420, .09, .028, 'sine']],
      radio: [[0, 620, 660, .065, .035, 'sine'], [.095, 490, 510, .09, .028, 'sine']],
      done: [[0, 277, 277, .13, .045, 'sine'], [.13, 370, 370, .14, .045, 'sine'], [.28, 494, 494, .24, .05, 'sine']]
    };
    for (const [delay, from, to, length, volume, type] of cues[kind]) {
      const oscillator = terminalAudio.createOscillator(), gain = terminalAudio.createGain();
      const at = now + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(from, at);
      oscillator.frequency.exponentialRampToValueAtTime(to, at + length);
      gain.gain.setValueAtTime(.0001, at);
      gain.gain.exponentialRampToValueAtTime(volume, at + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, at + length);
      oscillator.connect(gain); gain.connect(terminalAudio.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(at); oscillator.stop(at + length + .01);
    }
  } catch { /* Visuele feedback blijft beschikbaar. */ }
}

function scenePhoto(key, className = '') {
  return `<img class="${className}" src="./img/terminal/${key}.webp" alt="${SCENES[key].alt}" loading="lazy" decoding="async">`;
}

const PHOTO_SPOTS = {
  "controle": {
    "ask": "Waar zit de voorband aan de kant van de mast?",
    "zones": [
      [
        22,
        11,
        59,
        86
      ]
    ],
    "hint": "Kijk direct achter de mast, bij het grote wiel."
  },
  "verkeer": {
    "ask": "Waar kruist de looproute jouw rijroute?",
    "zones": [
      [
        12,
        73,
        55,
        83
      ],
      [
        13,
        83,
        65,
        91
      ],
      [
        15,
        91,
        78,
        100
      ]
    ],
    "hint": "Zoek de witte strepen op de vloer."
  },
  "ondergrond": {
    "ask": "Welk los materiaal ligt op de route?",
    "zones": [
      [
        72,
        55,
        99,
        74
      ]
    ],
    "hint": "Kijk langs de rechterkant van de loods."
  },
  "opnemen": {
    "ask": "Waar steek je de vorken in dit rek?",
    "zones": [
      [
        28,
        78,
        44,
        97
      ],
      [
        57,
        78,
        72,
        97
      ]
    ],
    "hint": "Zoek een van de twee rechthoekige openingen in de onderste balk."
  }
};

function photoDebrief() {
  const scene = SCENES[topic.key], spot = PHOTO_SPOTS[topic.key];
  const photo = `${scenePhoto(topic.key)}<span class="eye-spot" style="--x:${scene.x}%;--y:${scene.y}%" aria-hidden="true"></span>`;
  return `<section class="eye-card"><div class="eye-copy"><p class="kicker">${spot ? 'Zoek op de foto' : 'Kijkvraag'} · ${WORK_ORDERS[topic.key].location}</p><h2>${spot?.ask || scene.ask}</h2>
    <p class="eye-instruction">${spot ? 'Tik op de plek in de foto of bekijk de toelichting.' : 'Bekijk de foto. Wat zou jij aan je collega doorgeven?'}</p>
    <details class="look-answer"><summary>Bekijk de toelichting</summary><p>${scene.see}</p></details>
    <p class="spot-status" role="status"></p></div>
    ${spot ? `<button type="button" class="eye-image selectable-photo" data-action="spot" aria-label="${spot.ask} Activeer voor de toelichting.">${photo}<span class="your-spot" hidden aria-hidden="true"></span></button>` : `<div class="eye-image">${photo}</div>`}</section>`;
}

function inspectSpot(button,event) {
  const card = button.closest('.eye-card'), details = card.querySelector('details');
  if (event.detail === 0) { details.open = true; details.querySelector('summary').focus(); return; }
  const bounds = button.getBoundingClientRect();
  const x = 100*(event.clientX - bounds.left)/bounds.width, y = 100*(event.clientY - bounds.top)/bounds.height;
  const spot = PHOTO_SPOTS[topic.key];
  const found = spot.zones.some(([left,top,right,bottom]) => x >= left && x <= right && y >= top && y <= bottom);
  const marker = button.querySelector('.your-spot');
  marker.hidden = found;
  marker.style.setProperty('--x', `${x}%`); marker.style.setProperty('--y', `${y}%`);
  details.open = found;
  card.querySelector('.spot-status').textContent = found ? 'Gevonden. Lees wat dit betekent voor je werk.' : spot.hint;
  if (found) playCue('radio');
}

function teachingClip(key) {
  const clip = CLIPS[key];
  if (!clip) return '';
  return `<section class="clip-card"><div class="clip-copy"><p class="kicker">Bewegend uitgelegd</p>
    <h2>${clip.title}</h2><p>${clip.caption}</p>
    <button class="btn secondary clip-play" data-action="play-clip" data-clip="${key}">Speel de animatie af</button></div>
    <img class="clip-image" width="600" height="264" src="./img/terminal/${clip.file}-stil.webp" alt="${clip.alt}" loading="lazy"></section>`;
}

function playClip(button) {
  const clip = CLIPS[button.dataset.clip];
  if (!clip) return;
  const figure = button.closest('.clip-card').querySelector('.clip-image');
  const animated = new Image(600,264);
  animated.className = 'clip-image'; animated.alt = clip.alt;
  animated.src = `./img/terminal/${clip.file}.gif?afspelen=${++clipPlayback}`;
  figure.replaceWith(animated);
  button.textContent = 'Speel nog eens af';
}
