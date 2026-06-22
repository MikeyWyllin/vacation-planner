const DB = window.VACATION_DESTINATIONS?.destinations || [];
const META = window.VACATION_DESTINATIONS?.meta || { total: DB.length };

const $ = (id) => document.getElementById(id);
const HISTORY_KEY = 'vacationPlanner.savedTrips.v1';
const HISTORY_LIMIT = 25;

const state = {
  zip: '',
  origin: null,
  current: 0,
  answers: {},
  questions: [],
  lastResults: [],
  aiMode: false,
};

const KNOWN_ZIPS = {
  '20110': { city: 'Manassas', region: 'VA', country: 'US', lat: 38.7509, lon: -77.4753 },
  '20109': { city: 'Manassas', region: 'VA', country: 'US', lat: 38.7887, lon: -77.5189 },
  '20155': { city: 'Gainesville', region: 'VA', country: 'US', lat: 38.7957, lon: -77.6139 },
  '20136': { city: 'Bristow', region: 'VA', country: 'US', lat: 38.7226, lon: -77.5367 },
  '20148': { city: 'Brambleton', region: 'VA', country: 'US', lat: 38.9821, lon: -77.5386 },
  '20147': { city: 'Ashburn', region: 'VA', country: 'US', lat: 39.0438, lon: -77.4874 },
  '20001': { city: 'Washington', region: 'DC', country: 'US', lat: 38.9121, lon: -77.0177 },
  '10001': { city: 'New York', region: 'NY', country: 'US', lat: 40.7506, lon: -73.9972 },
  '90210': { city: 'Beverly Hills', region: 'CA', country: 'US', lat: 34.0901, lon: -118.4065 },
};

const ZIP_PREFIX_FALLBACK = {
  '0': { city: 'Northeast US', region: 'US', country: 'US', lat: 42.35, lon: -71.06 },
  '1': { city: 'New York/Pennsylvania region', region: 'US', country: 'US', lat: 41.20, lon: -75.50 },
  '2': { city: 'Mid-Atlantic region', region: 'US', country: 'US', lat: 38.70, lon: -77.40 },
  '3': { city: 'Southeast region', region: 'US', country: 'US', lat: 33.75, lon: -84.39 },
  '4': { city: 'Ohio Valley/Great Lakes region', region: 'US', country: 'US', lat: 39.96, lon: -83.00 },
  '5': { city: 'Upper Midwest region', region: 'US', country: 'US', lat: 44.98, lon: -93.27 },
  '6': { city: 'Central Midwest region', region: 'US', country: 'US', lat: 39.10, lon: -94.58 },
  '7': { city: 'Texas/Oklahoma/Louisiana region', region: 'US', country: 'US', lat: 32.78, lon: -96.80 },
  '8': { city: 'Mountain West region', region: 'US', country: 'US', lat: 39.74, lon: -104.99 },
  '9': { city: 'West Coast region', region: 'US', country: 'US', lat: 34.05, lon: -118.24 },
};

const DURATION_MAP = {
  '2-4 days': { min: 2, max: 4, drive: 280, label: 'quick trip' },
  '3-5 days': { min: 3, max: 5, drive: 450, label: 'long weekend' },
  '4-7 days': { min: 4, max: 7, drive: 650, label: 'full week-ish' },
  '1-2 weeks': { min: 7, max: 14, drive: 1100, label: 'big trip' },
  'More than 2 weeks': { min: 15, max: 30, drive: 2600, label: 'major trip' },
};

const BUDGETS = {
  'Under $100/night': [0, 100],
  '$100-$175/night': [100, 175],
  '$175-$250/night': [175, 250],
  '$250-$400/night': [250, 400],
  '$400-$650/night': [400, 650],
  '$650+/night': [650, 9999],
};

function milesBetween(a, b) {
  if (!a || !b) return 99999;
  const R = 3958.8;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
}

function unique(arr) { return [...new Set((arr || []).filter(Boolean))]; }
function answerArr(key) { return Array.isArray(state.answers[key]) ? state.answers[key] : (state.answers[key] ? [state.answers[key]] : []); }
function firstAnswer(key) { return answerArr(key)[0] || ''; }
function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function cloneData(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Saved trip history could not be read.', err);
    return [];
  }
}

function writeHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_LIMIT)));
  } catch (err) {
    console.warn('Saved trip history could not be written.', err);
  }
}

function formatSavedDate(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return 'Saved trip';
  }
}

function answerPreview(answers) {
  const duration = Array.isArray(answers?.duration) ? answers.duration[0] : answers?.duration;
  const travel = (Array.isArray(answers?.travelModes) ? answers.travelModes : []).map(x => typeof x === 'object' ? x.label : x).join(', ');
  const range = (Array.isArray(answers?.distance) ? answers.distance : []).map(x => typeof x === 'object' ? x.label : x).join(', ');
  return [duration, travel, range].filter(Boolean).join(' • ');
}

function saveTripHistory(results) {
  if (!Array.isArray(results) || !results.length) return;
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    zip: state.zip,
    origin: cloneData(state.origin),
    answers: cloneData(state.answers),
    results: cloneData(results.slice(0, 3)),
  };
  writeHistory([entry, ...readHistory()]);
  renderHistory();
}

function loadSavedTrip(id) {
  const entry = readHistory().find(item => item.id === id);
  if (!entry) return;
  state.zip = entry.zip || '';
  state.origin = entry.origin || null;
  state.answers = entry.answers || {};
  state.current = 0;
  renderResults(entry.results || [], 'ai', { save: false });
  $('resultsSummary').textContent = `Loaded saved AI suggestions from ${formatSavedDate(entry.createdAt)}.`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteSavedTrip(id) {
  writeHistory(readHistory().filter(item => item.id !== id));
  renderHistory();
}

function clearSavedTrips() {
  writeHistory([]);
  renderHistory();
}

function renderHistory() {
  const panel = $('historyPanel');
  const list = $('historyList');
  if (!panel || !list) return;
  const history = readHistory();
  panel.classList.toggle('hidden', history.length === 0);
  if (!history.length) {
    list.innerHTML = '';
    return;
  }
  list.innerHTML = history.map(entry => {
    const origin = entry.origin ? `${entry.origin.city || 'Unknown'}, ${entry.origin.region || ''}` : entry.zip || 'Unknown start';
    const names = (entry.results || []).map(r => r.name).filter(Boolean).slice(0, 3);
    return `
      <article class="history-item">
        <div>
          <strong>${escapeHTML(origin)}</strong>
          <span>${escapeHTML(formatSavedDate(entry.createdAt))}${answerPreview(entry.answers) ? ` • ${escapeHTML(answerPreview(entry.answers))}` : ''}</span>
          <p>${escapeHTML(names.join(' • ') || 'Saved AI suggestions')}</p>
        </div>
        <div class="history-actions">
          <button class="secondary compact" data-load-history="${escapeHTML(entry.id)}">Open</button>
          <button class="secondary compact danger" data-delete-history="${escapeHTML(entry.id)}">Delete</button>
        </div>
      </article>
    `;
  }).join('');
  list.querySelectorAll('[data-load-history]').forEach(btn => {
    btn.addEventListener('click', () => loadSavedTrip(btn.dataset.loadHistory));
  });
  list.querySelectorAll('[data-delete-history]').forEach(btn => {
    btn.addEventListener('click', () => deleteSavedTrip(btn.dataset.deleteHistory));
  });
}

function distanceAnswers() {
  return answerArr('distance').filter(v => v && typeof v === 'object');
}

function activeDistanceAnswer() {
  const choices = distanceAnswers();
  if (!choices.length) return null;
  const maxMiles = Math.max(...choices.map(v => Number(v.maxMiles) || 0));
  const allowInternational = choices.some(v => v.allowInternational) || maxMiles > 3200;
  const labels = choices.map(v => v.label).filter(Boolean);
  return {
    label: labels.join(', '),
    maxMiles,
    allowInternational,
  };
}

async function resolveZip(zip) {
  if (KNOWN_ZIPS[zip]) return { ...KNOWN_ZIPS[zip], zip, source: 'built-in' };
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, { cache: 'force-cache' });
    if (res.ok) {
      const data = await res.json();
      const place = data.places?.[0];
      if (place) {
        return {
          zip,
          city: place['place name'],
          region: place['state abbreviation'],
          country: 'US',
          lat: Number(place.latitude),
          lon: Number(place.longitude),
          source: 'zip-api',
        };
      }
    }
  } catch (err) {
    console.warn('Zip lookup failed, using prefix fallback', err);
  }
  const fallback = ZIP_PREFIX_FALLBACK[zip[0]] || ZIP_PREFIX_FALLBACK['2'];
  return { ...fallback, zip, source: 'prefix-fallback' };
}

function estimateDriveLimit() {
  const duration = DURATION_MAP[firstAnswer('duration')] || DURATION_MAP['3-5 days'];
  const modes = answerArr('travelModes');
  let max = duration.drive;
  if (modes.includes('RV')) max *= 0.85;
  if (modes.includes('Uber / rideshare')) max = Math.min(max, 180);
  if (modes.includes('Train')) max = Math.max(max, 550);
  if (modes.includes('Fly')) max = Math.max(max, 2400);
  if (modes.includes('Cruise')) max = Math.max(max, 1700);
  return Math.round(max / 50) * 50;
}

function examplesWithin(maxMiles, onlyDomestic = true) {
  if (!state.origin) return [];
  return DB
    .filter(d => !onlyDomestic || d.domestic)
    .map(d => ({ ...d, distance: milesBetween(state.origin, d) }))
    .filter(d => d.distance <= maxMiles && d.distance > 20)
    .sort((a, b) => b.sleepBudgetPerNight - a.sleepBudgetPerNight || a.distance - b.distance)
    .slice(0, 3)
    .map(d => d.name);
}

function distanceOptions() {
  const duration = DURATION_MAP[firstAnswer('duration')] || DURATION_MAP['3-5 days'];
  const modes = answerArr('travelModes');
  const driveBase = estimateDriveLimit();
  const driveOnly = modes.length && modes.every(m => ['Drive', 'RV', 'Uber / rideshare', 'Bus', 'Train'].includes(m));
  const radii = unique([
    Math.max(100, Math.round(driveBase * 0.45 / 50) * 50),
    Math.max(150, Math.round(driveBase * 0.75 / 50) * 50),
    Math.max(250, Math.round(driveBase / 50) * 50),
  ]).filter(n => n < 1800);
  const opts = radii.map(n => ({
    label: `Up to ${n} miles`,
    value: { label: `Up to ${n} miles`, maxMiles: n, allowInternational: false },
    sub: examplesWithin(n).length ? `Examples from your zip: ${examplesWithin(n).join(', ')}` : `Regional ${duration.label} range.`,
  }));
  if (modes.includes('Fly') || !driveOnly) {
    opts.push(
      { label: 'Anywhere in the U.S.', value: { label: 'Anywhere in the U.S.', maxMiles: 3200, allowInternational: false }, sub: 'Good when flying is on the table.' },
      { label: 'North America / Caribbean', value: { label: 'North America / Caribbean', maxMiles: 3600, allowInternational: true, regionLimit: 'nearInternational' }, sub: 'Canada, Mexico, Puerto Rico, Caribbean, Bahamas-style trips.' },
      { label: 'Worldwide', value: { label: 'Worldwide', maxMiles: 12000, allowInternational: true }, sub: 'No real distance cap. The app will prioritize fit over miles.' },
    );
  } else {
    opts.push(
      { label: 'I’ll drive farther if it’s worth it', value: { label: 'I’ll drive farther if it’s worth it', maxMiles: Math.min(1800, driveBase * 1.65), allowInternational: false }, sub: 'Still keeps the trip realistic for a drive-first vacation.' },
      { label: 'No distance limit', value: { label: 'No distance limit', maxMiles: 12000, allowInternational: true }, sub: 'Turns the distance filter loose.' },
    );
  }
  return opts;
}

function buildQuestions() {
  return [
    {
      id: 'duration', type: 'multi', text: 'How long do you want to be gone?',
      helper: 'This question comes first because distance only makes sense after the app knows how much time you have.',
      options: Object.keys(DURATION_MAP).map(x => ({ label: x, value: x })),
    },
    {
      id: 'travelModes', type: 'multi', text: 'How do you want to travel?',
      helper: 'Pick every method you would actually consider. This shapes the smart distance question next.',
      options: ['Drive', 'Fly', 'Train', 'Uber / rideshare', 'Bus', 'Cruise', 'RV'].map(x => ({ label: x, value: x })),
    },
    {
      id: 'distance', type: 'multi', text: 'How far are you willing to go?',
      helper: 'Pick any ranges that feel right, or type your own mileage limit below.',
      options: distanceOptions(),
    },
    {
      id: 'environment', type: 'multi', text: 'What environment do you want?',
      helper: 'Pick every vibe that sounds right. Mixed answers are good.',
      options: ['City', 'Beach', 'Lake', 'Woods', 'Mountain', 'Desert', 'College town', 'Historic town', 'Sports town', 'Small town', 'Island', 'Theme park', 'Wine country', 'Snow or ski', 'Remote areas'].map(x => ({ label: x, value: x.toLowerCase() })),
    },
    {
      id: 'lodging', type: 'multi', text: 'Where do you want to sleep?',
      helper: 'This filters the actual stay style: hotel, resort, cabin, camping, RV, etc.',
      options: ['Hotel', 'Motel', 'Resort', 'Airbnb or VRBO', 'Cabin', 'Camping', 'RV', 'Boutique inn', 'Hostel', 'Cruise'].map(x => ({ label: x, value: x })),
    },
    {
      id: 'sleepBudget', type: 'multi', text: 'What is your sleep-only budget per night?',
      helper: 'This is only for the place you sleep. Food, activities, shopping, tickets, and gas do not count here.',
      options: Object.keys(BUDGETS).map(x => ({ label: x, value: x })),
    },
    {
      id: 'activities', type: 'multi', text: 'What do you want to do on vacation?',
      helper: 'This is the biggest ranking question. Pick everything that matters.',
      options: [
        'Try new restaurants', 'Visit museums', 'Find activities for kids', 'Hike', 'Swim', 'See the skyline', 'Explore remote areas', 'Extreme sports', 'Pottery or paint and sip', 'See shows or theater', 'Go out to clubs or bars', 'Jazz bars', 'Sports game', 'Theme parks', 'Shopping', 'Wineries or breweries', 'Fishing or boating', 'Historic tours', 'Stargazing'
      ].map(x => ({ label: x, value: x.toLowerCase() })),
    },
    {
      id: 'tripPace', type: 'multi', text: 'What pace do you want?',
      helper: 'This keeps the app from recommending a packed city trip when you want to sit still.',
      options: ['Packed schedule', 'Balanced', 'Lazy and relaxing', 'Unplugged', 'Party-focused', 'Family-first'].map(x => ({ label: x, value: x })),
    },
    {
      id: 'groupType', type: 'multi', text: 'Who is going?',
      helper: 'Solo, couple, friends, kids, and family trips should not rank the same places.',
      options: ['Solo', 'Couple', 'Friends', 'Family with kids', 'Multi-generation family', 'Bachelor / bachelorette', 'Work trip mixed with fun'].map(x => ({ label: x, value: x })),
    },
    {
      id: 'climate', type: 'multi', text: 'What weather are you chasing?',
      helper: 'The app treats this as preference, not a guarantee.',
      options: ['Hot', 'Warm', 'Mild', 'Cold / snow', 'Low humidity', 'Doesn’t matter'].map(x => ({ label: x, value: x })),
    },
    {
      id: 'food', type: 'multi', text: 'What food scene matters?',
      helper: 'Food can push a destination over the top even when the scenery is similar.',
      options: ['Seafood', 'BBQ', 'Fine dining', 'Cheap eats', 'International food', 'Kid-friendly food', 'Healthy / vegan options', 'Local classics'].map(x => ({ label: x, value: x })),
    },
    {
      id: 'crowds', type: 'multi', text: 'How do you feel about crowds?',
      helper: 'Some places are great but annoying if you hate crowds.',
      options: ['Avoid crowds', 'Moderate crowds are fine', 'Touristy is fine', 'Big crowds are fine if nightlife is good'].map(x => ({ label: x, value: x })),
    },
    {
      id: 'nightlife', type: 'multi', text: 'What nighttime scene do you want?',
      helper: 'This separates quiet cabin/lake trips from city trips with bars, clubs, jazz, and shows.',
      options: ['None', 'Casual bars', 'Clubs', 'Jazz / live music', 'Theater', 'Sports bars', 'Late-night food'].map(x => ({ label: x, value: x })),
    },
    {
      id: 'fameLevel', type: 'multi', text: 'Do you want famous or hidden?',
      helper: 'This changes whether the app favors iconic spots or underrated places.',
      options: ['Iconic / famous', 'Hidden gem', 'Balanced', 'Easy repeatable family spot'].map(x => ({ label: x, value: x })),
    },
    {
      id: 'dealbreakers', type: 'text', text: 'Any must-haves or dealbreakers?',
      helper: 'Examples: no long flights, must have a pool, avoid party towns, needs stroller-friendly, must have direct flights.',
      options: [],
    },
  ];
}

function render() {
  state.questions = buildQuestions();
  const q = state.questions[state.current];
  $('heroQuestion').textContent = `${Math.min(state.current + 1, 15)}/15`;
  $('heroLabel').textContent = q ? q.id.replace(/([A-Z])/g, ' $1') : 'Results';
  $('homeStat').textContent = state.origin ? `${state.origin.city}, ${state.origin.region}` : '—';
  $('lengthStat').textContent = firstAnswer('duration') || '—';
  $('travelStat').textContent = answerArr('travelModes').length ? answerArr('travelModes').join(', ') : '—';
  $('rangeStat').textContent = activeDistanceAnswer()?.label || (state.origin ? `~${estimateDriveLimit()} mi` : '—');
  $('answeredStat').textContent = String(Object.keys(state.answers).filter(k => answerArr(k).length || typeof state.answers[k] === 'string').length);
  $('brainStat').textContent = state.aiMode ? 'AI refined' : `${META.total || DB.length} DB + AI`;

  if (!$('questionScreen').classList.contains('hidden')) renderQuestion(q);
}

function renderQuestion(q) {
  $('questionCounter').textContent = `Question ${state.current + 1} of 15`;
  $('questionType').textContent = q.type === 'text' ? 'Text answer' : 'Multi select';
  $('questionText').textContent = q.text;
  $('questionHelper').textContent = q.helper || '';
  $('optionGrid').innerHTML = '';
  $('textAnswerWrap').classList.toggle('hidden', q.type !== 'text');
  $('optionGrid').classList.toggle('hidden', q.type === 'text');

  if (q.type === 'text') {
    $('textAnswer').value = state.answers[q.id] || '';
  } else {
    const current = answerArr(q.id);
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option';
      const value = typeof opt.value === 'object' ? opt.value.label : opt.value;
      if (current.some(v => (typeof v === 'object' ? v.label : v) === value)) btn.classList.add('selected');
      btn.innerHTML = `<span class="option-title">${opt.label}</span>${opt.sub ? `<span class="option-sub">${opt.sub}</span>` : ''}`;
      btn.addEventListener('click', () => chooseAnswer(q, opt.value));
      $('optionGrid').appendChild(btn);
    });
    if (q.id === 'distance') renderCustomDistanceInput();
  }
  $('prevBtn').disabled = state.current === 0;
  $('nextBtn').textContent = state.current === state.questions.length - 1 ? 'Finish' : 'Next';
  renderAnswerTray();
}

function chooseAnswer(q, value) {
  const arr = answerArr(q.id);
  const valLabel = typeof value === 'object' ? value.label : value;
  const exists = arr.some(v => (typeof v === 'object' ? v.label : v) === valLabel);
  state.answers[q.id] = exists ? arr.filter(v => (typeof v === 'object' ? v.label : v) !== valLabel) : [...arr, value];
  if (q.id === 'duration' || q.id === 'travelModes') delete state.answers.distance;
  render();
}

function renderCustomDistanceInput() {
  const wrap = document.createElement('div');
  wrap.className = 'custom-distance';
  const custom = distanceAnswers().find(v => v.customMiles);
  wrap.innerHTML = `
    <label for="customMiles">Or type your own max miles</label>
    <input id="customMiles" inputmode="numeric" placeholder="Example: 850" value="${custom?.maxMiles || ''}" />
  `;
  $('optionGrid').appendChild(wrap);
  const input = $('customMiles');
  input.addEventListener('input', () => {
    const miles = Number(input.value.replace(/[^0-9]/g, ''));
    const existing = distanceAnswers().filter(v => !v.customMiles);
    if (!miles) {
      state.answers.distance = existing;
    } else {
      state.answers.distance = [
        ...existing,
        {
          label: `Custom: up to ${miles.toLocaleString()} miles`,
          maxMiles: miles,
          allowInternational: miles > 3200,
          customMiles: true,
        },
      ];
    }
    renderAnswerTray();
    $('rangeStat').textContent = activeDistanceAnswer()?.label || `~${estimateDriveLimit()} mi`;
  });
}

function renderAnswerTray() {
  const tray = $('answerTray');
  tray.innerHTML = '';
  Object.entries(state.answers).forEach(([key, value]) => {
    const vals = Array.isArray(value) ? value : [value];
    vals.filter(Boolean).forEach(v => {
      const chip = document.createElement('span');
      chip.className = 'answer-chip';
      chip.textContent = `${labelFor(key)}: ${typeof v === 'object' ? v.label : v}`;
      tray.appendChild(chip);
    });
  });
}

function labelFor(key) {
  return ({ duration: 'Length', travelModes: 'Travel', distance: 'Range', environment: 'Env', lodging: 'Sleep', sleepBudget: 'Budget', activities: 'Do', tripPace: 'Pace', groupType: 'Group', climate: 'Weather', food: 'Food', crowds: 'Crowds', nightlife: 'Night', fameLevel: 'Fame', dealbreakers: 'Notes' })[key] || key;
}

function normalize(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function intersects(a, b) {
  const aa = new Set((a || []).map(normalize));
  return (b || []).some(x => aa.has(normalize(x)) || [...aa].some(y => y.includes(normalize(x)) || normalize(x).includes(y)));
}
function countMatches(a, b) {
  const aa = (a || []).map(normalize);
  return (b || []).map(normalize).filter(x => aa.some(y => y === x || y.includes(x) || x.includes(y))).length;
}

function localRank() {
  const candidates = DB.map(dest => scoreDestination(dest)).sort((a, b) => b.score - a.score);
  return candidates.slice(0, 3);
}

function aiCandidatePool() {
  return DB
    .map(dest => scoreDestination(dest))
    .sort((a, b) => b.score - a.score)
    .map(c => ({
      name: c.name,
      region: c.region,
      country: c.country,
      domestic: c.domestic,
      lat: c.lat,
      lon: c.lon,
      distance: c.distance,
      score: c.score,
      category: c.category,
      environments: c.environments,
      activities: c.activities,
      lodging: c.lodging,
      travelModes: c.travelModes,
      idealMinDays: c.idealMinDays,
      idealMaxDays: c.idealMaxDays,
      sleepBudgetPerNight: c.sleepBudgetPerNight,
      familyScore: c.familyScore,
      nightlifeScore: c.nightlifeScore,
      remoteScore: c.remoteScore,
      tagScores: c.tagScores,
      seasonTags: c.seasonTags,
      tripStyleTags: c.tripStyleTags,
      masterNotes: c.masterNotes,
      localReasons: c.reasons,
      localWarnings: c.warnings,
    }));
}

function scoreDestination(dest) {
  const origin = state.origin || { lat: 38.75, lon: -77.47 };
  const distance = milesBetween(origin, dest);
  let score = 50;
  const reasons = [];
  const warnings = [];
  const duration = DURATION_MAP[firstAnswer('duration')];
  if (duration) {
    if (duration.max >= dest.idealMinDays && duration.min <= dest.idealMaxDays) {
      score += 18; reasons.push(`Trip length fits: ${dest.idealMinDays}-${dest.idealMaxDays} ideal days.`);
    } else if (duration.max < dest.idealMinDays) {
      score -= 24; warnings.push(`Might be rushed for ${firstAnswer('duration')}.`);
    } else {
      score += 5;
    }
  }

  const modes = answerArr('travelModes');
  const distanceAnswer = activeDistanceAnswer();
  const maxMiles = distanceAnswer?.maxMiles || estimateDriveLimit();
  const allowInternational = !!distanceAnswer?.allowInternational;
  if (!dest.domestic && !allowInternational) { score -= 85; warnings.push('International filtered down because range was not set for it.'); }
  if (distance > maxMiles) { score -= Math.min(90, Math.round((distance - maxMiles) / 45)); warnings.push(`Farther than selected range by about ${Math.max(0, distance - maxMiles)} miles.`); }
  else { score += 16; reasons.push(`Inside your selected range at about ${distance.toLocaleString()} miles away.`); }

  if (modes.length) {
    let modeFit = 0;
    if (modes.includes('Drive') && dest.domestic && distance <= maxMiles) modeFit += 16;
    if (modes.includes('Fly') && (distance >= 250 || !dest.domestic)) modeFit += 16;
    if (modes.includes('Train') && dest.domestic && distance <= 750) modeFit += 8;
    if (modes.includes('Bus') && dest.domestic && distance <= 650) modeFit += 6;
    if (modes.includes('RV') && dest.travelModes.includes('rv')) modeFit += 10;
    if (modes.includes('Cruise') && dest.travelModes.includes('cruise')) modeFit += 10;
    if (modes.includes('Uber / rideshare') && distance <= 180) modeFit += 12;
    score += modeFit || -12;
    if (modeFit) reasons.push(`Travel method matches: ${modes.join(', ')}.`);
  }

  const env = answerArr('environment');
  if (env.length) {
    const matches = countMatches(dest.environments, env);
    score += matches * 17;
    if (matches) reasons.push(`Environment match: ${dest.environments.filter(x => intersects([x], env)).join(', ') || dest.environments.slice(0,2).join(', ')}.`);
    else score -= 10;
  }

  const lodging = answerArr('lodging');
  if (lodging.length) {
    const matches = countMatches(dest.lodging, lodging);
    score += matches * 13;
    if (matches) reasons.push(`Sleep style works: ${dest.lodging.filter(x => intersects([x], lodging)).join(', ') || dest.lodging[0]}.`);
    else { score -= 18; warnings.push('Sleep style may not be the natural fit here.'); }
  }

  const budget = firstAnswer('sleepBudget');
  if (budget && BUDGETS[budget]) {
    const [min, max] = BUDGETS[budget];
    const target = dest.sleepBudgetPerNight;
    if (target <= max && target >= min * 0.6) { score += 20; reasons.push(`Sleep-only budget fits: database target around $${target}/night.`); }
    else if (target < min) { score += 5; reasons.push(`Likely under your sleep-only budget: around $${target}/night.`); }
    else { score -= Math.min(38, Math.round((target - max) / 8)); warnings.push(`Sleep cost may run high: database target around $${target}/night.`); }
  }

  const acts = answerArr('activities');
  if (acts.length) {
    const matches = countMatches(dest.activities, acts);
    score += matches * 8;
    if (matches) reasons.push(`Activity fit: ${dest.activities.filter(x => intersects([x], acts)).slice(0, 4).join(', ')}.`);
    else score -= 8;
  }

  const group = answerArr('groupType');
  if (group.includes('Family with kids') || group.includes('Multi-generation family')) {
    score += dest.familyScore;
    if (dest.familyScore >= 8) reasons.push('Good family/kid fit.');
  }
  if (group.includes('Bachelor / bachelorette') || group.includes('Friends')) score += dest.nightlifeScore;

  const pace = firstAnswer('tripPace');
  if (pace === 'Lazy and relaxing' && ['beach','island','lake','resort','woods'].includes(dest.category)) score += 14;
  if (pace === 'Packed schedule' && ['city','historic','theme'].includes(dest.category)) score += 12;
  if (pace === 'Unplugged' && dest.remoteScore >= 8) score += 16;
  if (pace === 'Party-focused' && dest.nightlifeScore >= 7) score += 16;
  if (pace === 'Family-first' && dest.familyScore >= 8) score += 14;

  const climate = answerArr('climate');
  if (climate.includes('Hot') && ['beach','island','desert'].includes(dest.category)) score += 10;
  if (climate.includes('Warm') && ['beach','island','city','resort'].includes(dest.category)) score += 8;
  if (climate.includes('Cold / snow') && ['ski','mountain'].includes(dest.category)) score += 13;
  if (climate.includes('Low humidity') && ['mountain','desert','ski'].includes(dest.category)) score += 8;

  const crowds = firstAnswer('crowds');
  if (crowds === 'Avoid crowds' && ['city','theme'].includes(dest.category)) score -= 11;
  if (crowds === 'Avoid crowds' && ['woods','remote','mountain','lake'].includes(dest.category)) score += 12;
  if (crowds === 'Touristy is fine' && ['theme','city','beach'].includes(dest.category)) score += 10;

  const nightlife = answerArr('nightlife');
  if (nightlife.includes('None') && dest.nightlifeScore <= 4) score += 10;
  if ((nightlife.includes('Clubs') || nightlife.includes('Jazz / live music') || nightlife.includes('Sports bars')) && dest.nightlifeScore >= 7) score += 12;
  if (nightlife.includes('Theater') && ['city','shows','historic'].includes(dest.category)) score += 10;

  const fame = firstAnswer('fameLevel');
  const iconic = ['New York City','Washington DC','Miami','Las Vegas','Paris','London','Tokyo','Rome','Orlando','Grand Canyon','Yellowstone National Park','Dubai','Barcelona','Santorini'].includes(dest.name);
  if (fame === 'Iconic / famous' && iconic) score += 16;
  if (fame === 'Hidden gem' && !iconic && ['historic','lake','woods','mountain','wine'].includes(dest.category)) score += 14;
  if (fame === 'Easy repeatable family spot' && dest.familyScore >= 8 && dest.domestic) score += 12;

  const notes = normalize(state.answers.dealbreakers);
  if (notes) {
    if (notes.includes('pool') && ['resort','beach','island','theme'].includes(dest.category)) score += 8;
    if (notes.includes('no party') && dest.nightlifeScore >= 8) score -= 16;
    if (notes.includes('stroller') && ['city','historic','theme','beach'].includes(dest.category)) score += 6;
    if (notes.includes('no long flight') && !dest.domestic) score -= 28;
    if (notes.includes('direct flight') && !dest.domestic) score -= 8;
  }

  score = clamp(Math.round(score), 0, 100);
  return { ...dest, distance, score, reasons: unique(reasons).slice(0, 5), warnings: unique(warnings).slice(0, 3) };
}

function renderResults(results, mode = 'local', options = {}) {
  state.lastResults = results;
  state.aiMode = mode === 'ai';
  $('zipScreen').classList.add('hidden');
  $('questionScreen').classList.add('hidden');
  $('resultsScreen').classList.remove('hidden');
  $('submitBar').classList.add('hidden');
  $('resultsGrid').innerHTML = '';
  const modeText = mode === 'ai' ? 'AI chose these from your answers, the 500-place database, and live web search.' : 'No AI picks were generated.';
  $('resultsSummary').textContent = `${modeText} Database size: ${META.us} U.S. + ${META.world} worldwide.`;
  results.slice(0, 3).forEach((r, i) => {
    const card = document.createElement('article');
    card.className = 'result-card';
    const region = r.domestic ? `${r.region}, United States` : r.region || r.country;
    const reasons = (r.reasons || r.why || []).slice(0, 5);
    const warnings = (r.warnings || r.watchouts || []).slice(0, 2);
    const details = [r.travelPlan, r.budgetRead, ...(r.searchNotes || [])].filter(Boolean).slice(0, 4);
    card.innerHTML = `
      <div class="rank">#${i + 1}</div>
      <h3>${r.name}</h3>
      <div class="result-meta">${region} • ${Number(r.distance || 0).toLocaleString()} miles away • sleep target ~$${r.sleepBudgetPerNight || r.sleepBudget || '—'}/night</div>
      <div class="score-bar"><div class="score-fill" style="width:${clamp(r.score || 82, 5, 100)}%"></div></div>
      <strong>${r.headline || fitHeadline(r)}</strong>
      <ul class="reason-list">
        ${reasons.map(x => `<li>✓ ${x}</li>`).join('')}
        ${warnings.map(x => `<li class="bad">Watch: ${x}</li>`).join('')}
        ${details.map(x => `<li>${x}</li>`).join('')}
      </ul>
      <div class="tags">${unique([r.category, ...(r.environments || [])]).slice(0, 5).map(t => `<span class="tag">${t}</span>`).join('')}</div>
    `;
    $('resultsGrid').appendChild(card);
  });
  $('promptBox').value = buildDeepPrompt(results);
  if (mode === 'ai' && options.save !== false) saveTripHistory(results);
  render();
}

function renderNoAiResults(message) {
  state.lastResults = [];
  state.aiMode = false;
  $('zipScreen').classList.add('hidden');
  $('questionScreen').classList.add('hidden');
  $('resultsScreen').classList.remove('hidden');
  $('submitBar').classList.add('hidden');
  $('resultsGrid').innerHTML = '';
  $('resultsSummary').textContent = message || 'AI did not return vacation suggestions yet.';
  $('promptBox').value = buildDeepPrompt([]);
  render();
}

function fitHeadline(r) {
  if (r.score >= 90) return 'Strong fit.';
  if (r.score >= 78) return 'Good fit with a few tradeoffs.';
  return 'Possible fit, but check the watchouts.';
}

function buildDeepPrompt(results = state.lastResults) {
  return `Act as a deep-search vacation destination generator. I am leaving from ${state.origin?.zip || state.zip} (${state.origin?.city || 'unknown'}, ${state.origin?.region || ''}). Here are my answers:\n\n${Object.entries(state.answers).map(([k,v]) => `${labelFor(k)}: ${Array.isArray(v) ? v.map(x => typeof x === 'object' ? x.label : x).join(', ') : (typeof v === 'object' ? v.label : v)}`).join('\n')}\n\nThe app's local top candidates are:\n${results.slice(0, 10).map((r,i) => `${i+1}. ${r.name}, ${r.region || r.country} — score ${r.score}, ${r.distance} miles, sleep target around $${r.sleepBudgetPerNight}/night`).join('\n')}\n\nDeep search current info and give me the top 3 places. Check lodging price reality for the sleep-only budget, current weather/season fit, kids/family activities if relevant, food scene, safety/practical travel issues, and whether the trip length makes sense. Do not recommend something just because it is famous. Explain why each place won and what could make it a bad pick.`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollAiJob(responseId, scored) {
  const started = Date.now();
  let attempt = 0;

  while (true) {
    attempt += 1;
    const elapsed = Math.round((Date.now() - started) / 1000);
    $('resultsSummary').textContent = `AI is still thinking. ${elapsed}s elapsed. No suggestions will show until the AI finishes.`;

    const res = await fetch('/api/check-recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseId }),
    });
    if (!res.ok) throw new Error(`AI status check ${res.status}`);

    const data = await res.json();
    if (data.mode === 'ai' && Array.isArray(data.picks) && data.picks.length) {
      const merged = data.picks.slice(0, 3).map((pick) => mergeAiPick(pick, scored));
      renderResults(merged, 'ai');
      return;
    }

    if (data.mode !== 'ai_pending') {
      renderNoAiResults(`AI did not return final picks. No suggestions are shown until AI processes the trip. ${data.message || ''} ${data.detail || ''}`.trim());
      return;
    }

    const delay = attempt < 12 ? 5000 : 10000;
    await sleep(delay);
  }
}

async function submitTrip() {
  $('zipScreen').classList.add('hidden');
  $('questionScreen').classList.add('hidden');
  $('resultsScreen').classList.remove('hidden');
  $('submitBar').classList.add('hidden');
  $('resultsGrid').innerHTML = '';
  $('resultsSummary').textContent = `AI is starting a deep background trip search. No suggestions will show until the AI finishes. Database size: ${META.us} U.S. + ${META.world} worldwide.`;
  $('aiLoading').classList.remove('hidden');
  const scored = aiCandidatePool();
  try {
    const res = await fetch('/api/start-recommend', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: state.origin, zip: state.zip, answers: state.answers, candidates: scored }),
    });
    if (!res.ok) throw new Error(`AI backend ${res.status}`);
    const data = await res.json();
    if (data.mode === 'ai_pending' && data.responseId) {
      await pollAiJob(data.responseId, scored);
    } else if (data.mode === 'ai' && Array.isArray(data.picks) && data.picks.length) {
      const merged = data.picks.slice(0, 3).map((pick) => mergeAiPick(pick, scored));
      renderResults(merged, 'ai');
    } else {
      renderNoAiResults(`AI did not return final picks. No suggestions are shown until AI processes the trip. ${data.message || ''} ${data.detail || ''}`.trim());
    }
  } catch (err) {
    console.info('AI backend unavailable. No suggestions shown.', err);
    renderNoAiResults(`AI backend error. No suggestions are shown until AI processes the trip: ${err.message}`);
  } finally {
    $('aiLoading').classList.add('hidden');
  }
}

function mergeAiPick(pick, scored) {
  const found = scored.find(x => normalize(x.name) === normalize(pick.name))
    || DB.map(d => scoreDestination(d)).find(x => normalize(x.name) === normalize(pick.name))
    || {};
  return {
    ...found,
    ...pick,
    name: pick.name || found.name,
    region: pick.region || found.region,
    country: pick.country || found.country,
    domestic: found.domestic ?? pick.domestic,
    distance: pick.distance ?? found.distance,
    sleepBudgetPerNight: found.sleepBudgetPerNight ?? pick.sleepBudgetPerNight,
    score: pick.score || found.score || 85,
    reasons: Array.isArray(pick.reasons) ? pick.reasons : (found.reasons || []),
    warnings: Array.isArray(pick.warnings) ? pick.warnings : (found.warnings || []),
    environments: found.environments || pick.environments || [],
    category: found.category || pick.category || 'trip',
  };
}

async function start() {
  const zip = $('zipInput').value.trim();
  if (!/^\d{5}$/.test(zip)) {
    $('zipMessage').innerHTML = '<span class="bad">Enter a real 5-digit U.S. zip code first.</span>';
    return;
  }
  $('startBtn').disabled = true;
  $('zipMessage').textContent = 'Finding starting point...';
  state.zip = zip;
  state.origin = await resolveZip(zip);
  $('zipScreen').classList.add('hidden');
  $('questionScreen').classList.remove('hidden');
  $('submitBar').classList.remove('hidden');
  $('zipMessage').textContent = state.origin.source === 'prefix-fallback' ? 'Zip API unavailable, using regional fallback.' : 'Zip locked.';
  $('startBtn').disabled = false;
  state.current = 0;
  render();
}

function nextQuestion() {
  const q = state.questions[state.current];
  if (q?.type === 'text') state.answers[q.id] = $('textAnswer').value.trim();
  if (state.current >= state.questions.length - 1) submitTrip();
  else { state.current += 1; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
}

function prevQuestion() {
  const q = state.questions[state.current];
  if (q?.type === 'text') state.answers[q.id] = $('textAnswer').value.trim();
  state.current = Math.max(0, state.current - 1);
  render();
}

function skipQuestion() {
  const q = state.questions[state.current];
  if (q) delete state.answers[q.id];
  nextQuestion();
}

function resetAll() {
  state.zip = ''; state.origin = null; state.current = 0; state.answers = {}; state.lastResults = []; state.aiMode = false;
  $('zipInput').value = '';
  $('zipScreen').classList.remove('hidden');
  $('questionScreen').classList.add('hidden');
  $('resultsScreen').classList.add('hidden');
  $('submitBar').classList.add('hidden');
  $('promptBox').style.display = 'none';
  render();
}

$('startBtn').addEventListener('click', start);
$('zipInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') start(); });
$('nextBtn').addEventListener('click', nextQuestion);
$('prevBtn').addEventListener('click', prevQuestion);
$('skipBtn').addEventListener('click', skipQuestion);
$('submitBtn').addEventListener('click', () => {
  const q = state.questions[state.current];
  if (q?.type === 'text') state.answers[q.id] = $('textAnswer').value.trim();
  submitTrip();
});
$('editBtn').addEventListener('click', () => {
  $('resultsScreen').classList.add('hidden');
  $('questionScreen').classList.remove('hidden');
  $('submitBar').classList.remove('hidden');
  render();
});
$('resetBtn').addEventListener('click', resetAll);
$('clearHistoryBtn')?.addEventListener('click', clearSavedTrips);
$('copyPromptBtn').addEventListener('click', async () => {
  $('copyPromptBtn').textContent = 'Running AI...';
  await submitTrip();
  $('copyPromptBtn').textContent = 'Run AI Again';
});
$('textAnswer').addEventListener('input', () => {
  const q = state.questions[state.current];
  if (q?.type === 'text') state.answers[q.id] = $('textAnswer').value.trim();
  renderAnswerTray();
});

renderHistory();
render();
