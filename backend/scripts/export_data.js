// Run once to generate backend/data/men.json and backend/data/women.json
// Usage: node backend/scripts/export_data.js
import { TEAMS as menTeams, REGIONS as menRegions, UPSET_HISTORY as menHistory } from '../../src/data/teams.js';
import { TEAMS as wTeams, REGIONS as wRegions, UPSET_HISTORY as wHistory } from '../../src/data/wteams.js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'data');

const FIELDS = ['id','name','seed','region','conf','record','wins','losses',
  'offRtg','defRtg','pace','sos','ppg','oppPpg','rebMargin','astTov',
  'fg3Pct','ftPct','kenpom','upsetRisk','style'];

const pick = t => Object.fromEntries(FIELDS.map(k => [k, t[k]]));

writeFileSync(join(outDir, 'men.json'), JSON.stringify({
  teams: menTeams.map(pick),
  regions: menRegions,
  upsetHistory: menHistory,
}, null, 2));

writeFileSync(join(outDir, 'women.json'), JSON.stringify({
  teams: wTeams.map(pick),
  regions: wRegions,
  upsetHistory: wHistory,
}, null, 2));

console.log('Exported men.json and women.json to backend/data/');
