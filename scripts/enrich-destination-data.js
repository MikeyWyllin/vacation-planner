import fs from 'node:fs/promises';

const inputPath = new URL('../data/destinations.json', import.meta.url);
const outputJsonPath = new URL('../data/destinations.json', import.meta.url);
const outputJsPath = new URL('../data/destinations.js', import.meta.url);

function clampScore(value) {
  return Math.max(0, Math.min(5, Math.round(value)));
}

function norm(value) {
  return String(value || '').toLowerCase();
}

function includesAny(values, terms) {
  const haystack = Array.isArray(values) ? values.map(norm).join(' ') : norm(values);
  return terms.some(term => haystack.includes(term));
}

function scoreFromExisting(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return clampScore(number / 2);
}

function baseScore(destination, tag) {
  const category = norm(destination.category);
  const environments = destination.environments || [];
  const activities = destination.activities || [];
  const lodging = destination.lodging || [];
  const sleepBudget = Number(destination.sleepBudgetPerNight || 0);

  const envHas = (...terms) => includesAny(environments, terms);
  const actHas = (...terms) => includesAny(activities, terms);
  const lodgeHas = (...terms) => includesAny(lodging, terms);
  const catIs = (...terms) => terms.includes(category);

  const scores = {
    beach: catIs('beach', 'island') || envHas('beach', 'island') ? 5 : actHas('swim', 'fishing', 'boating') ? 2 : 0,
    lake: catIs('lake') || envHas('lake') ? 5 : actHas('fishing', 'boating') ? 3 : 0,
    mountain: catIs('mountain', 'ski') || envHas('mountain', 'ski') ? 5 : catIs('woods') ? 3 : 0,
    woods: catIs('woods', 'remote') || envHas('woods', 'remote') ? 5 : catIs('mountain', 'lake') ? 3 : 0,
    desert: catIs('desert') || envHas('desert') ? 5 : 0,
    city: catIs('city') || envHas('city') ? 5 : catIs('college', 'sports', 'historic') ? 3 : 0,
    historic: catIs('historic') || envHas('historic') || actHas('historic', 'museums') ? 5 : 0,
    collegeTown: catIs('college') || envHas('college') ? 5 : 0,
    sportsTown: catIs('sports') || envHas('sports') || actHas('sports game') ? 5 : 0,
    themePark: catIs('theme') || actHas('theme parks') ? 5 : 0,
    island: catIs('island') || envHas('island') ? 5 : 0,
    resort: catIs('resort') || lodgeHas('resort') ? 5 : 0,
    ski: catIs('ski') || envHas('ski') ? 5 : 0,
    remote: scoreFromExisting(destination.remoteScore) || (catIs('remote') ? 5 : catIs('woods', 'mountain', 'lake', 'island') ? 3 : 1),
    nightlife: scoreFromExisting(destination.nightlifeScore) || (actHas('clubs', 'bars', 'jazz') ? 5 : catIs('city') ? 4 : catIs('historic', 'college') ? 3 : 1),
    family: scoreFromExisting(destination.familyScore) || (actHas('kids', 'theme parks', 'swim') ? 5 : catIs('city', 'beach', 'lake', 'historic') ? 4 : 2),
    crowds: catIs('theme', 'city') ? 5 : catIs('beach', 'island', 'sports') ? 4 : catIs('historic', 'college', 'resort') ? 3 : catIs('remote', 'woods') ? 1 : 2,
    quiet: catIs('remote', 'woods', 'lake', 'mountain') ? 5 : catIs('island', 'resort') ? 3 : catIs('city', 'theme') ? 1 : 2,
    luxury: sleepBudget >= 420 || catIs('resort', 'island', 'ski') ? 5 : sleepBudget >= 300 ? 4 : sleepBudget >= 220 ? 3 : 2,
    budget: sleepBudget <= 160 ? 5 : sleepBudget <= 220 ? 4 : sleepBudget <= 300 ? 3 : sleepBudget <= 420 ? 2 : 1,
    outdoorAdventure: actHas('hike', 'extreme', 'fishing', 'boating', 'stargazing') || catIs('mountain', 'woods', 'desert', 'lake', 'ski') ? 5 : catIs('beach', 'island') ? 4 : 1,
    foodScene: actHas('restaurants', 'wineries', 'breweries') || catIs('city', 'historic', 'college') ? 5 : catIs('resort', 'beach') ? 3 : 2,
    museums: actHas('museums', 'historic') || catIs('city', 'historic') ? 5 : 1,
    shows: actHas('shows', 'theater') || catIs('shows', 'city') ? 5 : catIs('historic') ? 3 : 1,
    shopping: actHas('shopping') || catIs('city', 'resort', 'beach') ? 4 : 1,
    kidActivities: actHas('kids', 'theme parks', 'swim') || catIs('theme') ? 5 : catIs('city', 'beach', 'lake') ? 4 : 2,
    waterActivities: actHas('swim', 'fishing', 'boating') || catIs('beach', 'lake', 'island', 'waterfall') ? 5 : 0,
    extremeSports: actHas('extreme') || catIs('mountain', 'ski', 'desert') ? 4 : 0,
    arts: actHas('pottery', 'paint', 'museums') || catIs('city', 'historic') ? 4 : 1,
    stargazing: actHas('stargazing') || catIs('desert', 'remote', 'mountain') ? 5 : 1,
    romantic: catIs('island', 'beach', 'historic', 'resort', 'wine') ? 5 : catIs('city', 'mountain', 'lake') ? 3 : 1,
    hiddenGem: catIs('remote', 'woods', 'lake', 'historic', 'wine') ? 4 : catIs('city', 'theme') ? 1 : 2,
    touristy: catIs('theme', 'city', 'beach', 'island', 'resort') ? 5 : catIs('historic', 'ski') ? 4 : 2,
    rvFriendly: lodgeHas('rv') || catIs('lake', 'woods', 'mountain', 'desert', 'remote') ? 5 : catIs('city') ? 1 : 3,
    camping: lodgeHas('camping') || catIs('woods', 'mountain', 'desert', 'lake', 'remote') ? 5 : 1,
    hotel: lodgeHas('hotel') ? 5 : catIs('city', 'historic', 'college') ? 4 : 2,
    cabin: lodgeHas('cabin') || catIs('mountain', 'woods', 'lake', 'ski') ? 5 : 1,
    airbnb: lodgeHas('airbnb', 'vrbo') ? 5 : 3,
  };

  return scores[tag] || 0;
}

function buildScores(destination) {
  const tags = [
    'beach', 'lake', 'mountain', 'woods', 'desert', 'city', 'historic', 'collegeTown',
    'sportsTown', 'themePark', 'island', 'resort', 'ski', 'remote', 'nightlife',
    'family', 'crowds', 'quiet', 'luxury', 'budget', 'outdoorAdventure', 'foodScene',
    'museums', 'shows', 'shopping', 'kidActivities', 'waterActivities', 'extremeSports',
    'arts', 'stargazing', 'romantic', 'hiddenGem', 'touristy', 'rvFriendly', 'camping',
    'hotel', 'cabin', 'airbnb',
  ];

  return Object.fromEntries(tags.map(tag => [tag, clampScore(baseScore(destination, tag))]));
}

function seasonTags(destination) {
  const category = norm(destination.category);
  if (category === 'ski') return ['winter', 'cold weather', 'snow season'];
  if (['beach', 'island', 'lake'].includes(category)) return ['spring', 'summer', 'early fall'];
  if (['desert'].includes(category)) return ['fall', 'winter', 'spring'];
  if (['mountain', 'woods'].includes(category)) return ['spring', 'summer', 'fall'];
  if (['city', 'historic', 'college', 'sports'].includes(category)) return ['year-round'];
  return ['season varies'];
}

function tripStyleTags(scores) {
  const styles = [];
  if (scores.family >= 4) styles.push('family-friendly');
  if (scores.nightlife >= 4) styles.push('nightlife-forward');
  if (scores.quiet >= 4) styles.push('quiet escape');
  if (scores.outdoorAdventure >= 4) styles.push('outdoor-heavy');
  if (scores.luxury >= 4) styles.push('luxury-leaning');
  if (scores.budget >= 4) styles.push('budget-friendly');
  if (scores.touristy >= 4) styles.push('popular/touristy');
  if (scores.hiddenGem >= 4) styles.push('hidden-gem leaning');
  return styles;
}

function enrich(destination) {
  const tagScores = buildScores(destination);
  return {
    ...destination,
    tagVersion: 2,
    tagScores,
    seasonTags: seasonTags(destination),
    tripStyleTags: tripStyleTags(tagScores),
    masterNotes: [
      `Crowds ${tagScores.crowds}/5`,
      `Nightlife ${tagScores.nightlife}/5`,
      `Family ${tagScores.family}/5`,
      `Outdoor ${tagScores.outdoorAdventure}/5`,
      `Budget ${tagScores.budget}/5`,
    ].join('; '),
  };
}

const parsed = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const source = Array.isArray(parsed) ? parsed : parsed.destinations;
if (!Array.isArray(source)) throw new Error('data/destinations.json must contain an array or { destinations: [] }');

const destinations = source.map(enrich);
const meta = {
  total: destinations.length,
  us: destinations.filter(d => d.domestic).length,
  world: destinations.filter(d => !d.domestic).length,
  tagVersion: 2,
  scoreScale: '0-5, where 0 means not a fit and 5 means very strong fit',
};

const json = `${JSON.stringify({ meta, destinations }, null, 2)}\n`;
await fs.writeFile(outputJsonPath, json);
await fs.writeFile(outputJsPath, `window.VACATION_DESTINATIONS = ${json};\n`);

console.log(`Enriched ${destinations.length} destinations with tagVersion ${meta.tagVersion}.`);
