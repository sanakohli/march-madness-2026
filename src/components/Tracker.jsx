import { useState, useEffect } from 'react';
import * as defaultData from '../data/teams';
import { PALETTE } from '../utils/colors';

const ROUND_LABELS = ['R64', 'R32', 'S16', 'E8'];
const ROUND_NAMES  = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite Eight'];
const MATCHUP_ORDER = [0, 7, 4, 3, 5, 2, 6, 1];

// ── ESPN Sync Helpers ────────────────────────────────────────────────────────

const ESPN_URL = {
  men:   'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard',
  women: 'https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/scoreboard',
};

// Round-0 seed→matchup-slot: MATCHUP_ORDER pairs {seed1,seed8}→0, {seed5,seed4}→1, etc.
const TOP8_SLOT = { 1:0, 8:0, 5:1, 4:1, 6:2, 3:2, 7:3, 2:3 };
function seedToR0Slot(seed) {
  const s = seed <= 8 ? seed : 17 - seed; // map upset winners: 9→8, 12→5, etc.
  return TOP8_SLOT[s] ?? null;
}

function normName(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

const MANUAL_ALIASES = {
  'connecticut':                 'uconn',
  'connecticut huskies':         'uconn',
  'uconn huskies':               'uconn',
  'n iowa':                      'northern-iowa',
  'northern iowa panthers':      'northern-iowa',
  'ndsu':                        'ndsu',
  'n dakota st':                 'ndsu',
  'n dakota state':              'ndsu',
  'north dakota st':             'ndsu',
  'north dakota state bison':    'ndsu',
  'utah st':                     'utah-st',
  'utah st aggies':              'utah-st',
  'utah state aggies':           'utah-st',
  'miami':                       'miami-fl',
  'miami hurricanes':            'miami-fl',
  'ohio state buckeyes':         'ohio-st',
  'michigan state spartans':     'michigan-st',
  'iowa state cyclones':         'iowa-st',
  'texas am':                    'texas-am',
  'texas am aggies':             'texas-am',
  'saint johns':                 'st-johns',
  'saint johns red storm':       'st-johns',
  'cal baptist lancers':         'cal-baptist',
  'california baptist':          'cal-baptist',
  'california baptist lancers':  'cal-baptist',
  'kennesaw st':                 'kennesaw',
  'kennesaw st owls':            'kennesaw',
  'kennesaw state owls':         'kennesaw',
  'wright st':                   'wright-st',
  'wright st raiders':           'wright-st',
  'wright state raiders':        'wright-st',
  'tenn state':                  'tenn-st',
  'tennessee state tigers':      'tenn-st',
  'tennessee st':                'tenn-st',
  'north carolina tar heels':    'north-carolina',
  'saint marys gaels':           'saint-marys',
  'saint marys':                 'saint-marys',
  'saint louis billikens':       'saint-louis',
  'vcu rams':                    'vcu',
  'byu cougars':                 'byu',
  'santa clara broncos':         'santa-clara',
  'south florida bulls':         'south-florida',
  'high point panthers':         'high-point',
  'hawaii rainbow warriors':     'hawaii',
  'iowa state':                  'iowa-st',
};

function buildNameIndex(teams) {
  const idx = new Map();
  for (const t of teams) {
    if (t.id.includes('-ff')) continue;
    idx.set(normName(t.name), t);
  }
  for (const [alias, id] of Object.entries(MANUAL_ALIASES)) {
    const team = teams.find(t => t.id === id);
    if (team) idx.set(normName(alias), team);
  }
  return idx;
}

function matchTeam(espnName, nameIdx) {
  if (!espnName) return null;
  const norm = normName(espnName);
  const direct = nameIdx.get(norm);
  if (direct) return direct;
  // Partial: ESPN short name is a prefix of our name or vice-versa
  for (const [key, team] of nameIdx.entries()) {
    if (key.length >= 4 && (norm.startsWith(key) || key.startsWith(norm))) return team;
  }
  return null;
}

// ESPN note headline → internal round index (-1 = skip, null = unknown)
function espnNoteToRound(comp) {
  const headline = (comp.notes?.[0]?.headline || '').toLowerCase();
  if (!headline) return null;
  if (headline.includes('first four') || headline.includes('opening round')) return -1;
  if (headline.includes('first round'))     return -1; // 1v16 games not in our bracket
  if (headline.includes('second round'))    return 0;
  if (headline.includes('sweet sixteen') || headline.includes('sweet 16')) return 1;
  if (headline.includes('elite eight') || headline.includes('elite 8'))    return 2;
  if (headline.includes('final four') || headline.includes('semifinal'))   return 4;
  if (headline.includes('national championship') || headline.includes('championship game')) return 5;
  return null;
}

async function fetchESPNEvents(gender) {
  const base = ESPN_URL[gender] || ESPN_URL.men;
  const today = new Date();
  const start = new Date('2026-03-19');
  const end   = new Date(Math.min(today.getTime(), new Date('2026-04-08').getTime()));

  const dateStrings = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dateStrings.push(
      `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
    );
  }
  if (!dateStrings.length) return [];

  const responses = await Promise.all(
    dateStrings.map(date =>
      fetch(`${base}?groups=100&dates=${date}&limit=50`)
        .then(r => r.json())
        .catch(() => ({ events: [] }))
    )
  );

  const seen = new Set();
  const all  = [];
  for (const data of responses) {
    for (const ev of (data.events || [])) {
      if (!seen.has(ev.id)) { seen.add(ev.id); all.push(ev); }
    }
  }
  return all.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Given two teams and current partial results, find their bracket key across all rounds
function findBracketKey(t1id, t2id, REGIONS, TEAMS, getTeamsByRegion, results) {
  for (const region of REGIONS) {
    for (let round = 0; round <= 3; round++) {
      const matchups = buildRound(region, round, results, getTeamsByRegion, TEAMS);
      for (let mIdx = 0; mIdx < matchups.length; mIdx++) {
        const [a, b] = matchups[mIdx];
        if (!a || !b) continue;
        const ids = new Set([a.id, b.id]);
        if (ids.has(t1id) && ids.has(t2id)) return `${region}-${round}-${mIdx}`;
      }
    }
  }
  // FF
  const e8 = REGIONS.map(r => {
    const id = results[`${r}-3-0`];
    return id ? TEAMS.find(t => t.id === id) ?? null : null;
  });
  const ffPairs = [[e8[0], e8[1]], [e8[2], e8[3]]];
  for (let i = 0; i < 2; i++) {
    const [a, b] = ffPairs[i];
    if (a && b) {
      if ((a.id === t1id || a.id === t2id) && (b.id === t1id || b.id === t2id)) return `FF-${i}`;
    }
  }
  // Champ
  const c0 = results['FF-0'] ? TEAMS.find(t => t.id === results['FF-0']) : null;
  const c1 = results['FF-1'] ? TEAMS.find(t => t.id === results['FF-1']) : null;
  if (c0 && c1) {
    if ((c0.id === t1id || c0.id === t2id) && (c1.id === t1id || c1.id === t2id)) return 'CHAMP';
  }
  return null;
}

function processESPNEvents(events, TEAMS, REGIONS, getTeamsByRegion) {
  const nameIdx   = buildNameIndex(TEAMS);
  const newResults = {};
  const log = [];

  for (const event of events) {
    const comp = event.competitions?.[0];
    if (!comp?.status?.type?.completed) continue;

    const competitors = comp.competitors || [];
    if (competitors.length !== 2) continue;

    const winnerComp = competitors.find(c => c.winner);
    const loserComp  = competitors.find(c => !c.winner);
    if (!winnerComp) continue;

    const winner = matchTeam(winnerComp.team?.shortDisplayName || winnerComp.team?.displayName, nameIdx);
    const loser  = matchTeam(loserComp?.team?.shortDisplayName || loserComp?.team?.displayName, nameIdx);
    if (!winner) continue;

    const ourRound = espnNoteToRound(comp);
    if (ourRound === -1 || ourRound === null) continue;

    let key = null;

    if (ourRound === 0) {
      // Second Round: seed-based slot detection
      const slot = seedToR0Slot(winner.seed);
      if (slot !== null && winner.region && REGIONS.includes(winner.region)) {
        key = `${winner.region}-0-${slot}`;
      }
    } else if (ourRound >= 1 && ourRound <= 2) {
      // Sweet 16 (round 1) or Elite Eight (round 2)
      if (winner.region && loser) {
        key = findBracketKey(winner.id, loser.id, REGIONS, TEAMS, getTeamsByRegion, newResults);
      } else if (winner.region) {
        // Fallback: scan winner's region for round matchups
        const matchups = buildRound(winner.region, ourRound, newResults, getTeamsByRegion, TEAMS);
        for (let mIdx = 0; mIdx < matchups.length; mIdx++) {
          const [a, b] = matchups[mIdx];
          if (a?.id === winner.id || b?.id === winner.id) {
            key = `${winner.region}-${ourRound}-${mIdx}`;
            break;
          }
        }
      }
    } else if (ourRound === 4) {
      // Final Four
      if (loser) {
        key = findBracketKey(winner.id, loser.id, REGIONS, TEAMS, getTeamsByRegion, newResults);
      }
    } else if (ourRound === 5) {
      key = 'CHAMP';
    }

    if (key) {
      newResults[key] = winner.id;
      log.push({ winner, key, round: ourRound });
      // E8 winner also advances to FF slot
      if (ourRound === 2 && winner.region) {
        const rIdx = REGIONS.indexOf(winner.region);
        if (rIdx >= 0) newResults[`${winner.region}-3-0`] = winner.id;
      }
    }
  }

  return { newResults, log };
}

// ── Bracket builders ─────────────────────────────────────────────────────────

function winProb(teamA, teamB) {
  if (!teamA || !teamB) return 0.5;
  const net  = (teamA.offRtg - teamA.defRtg) - (teamB.offRtg - teamB.defRtg);
  const kEff = 10 * (70 / ((teamA.pace + teamB.pace) / 2));
  return 1 / (1 + Math.exp(-net / kEff));
}

function buildR64(region, getTeamsByRegion) {
  const teams = getTeamsByRegion(region);
  const pairs = [];
  for (let i = 0; i < MATCHUP_ORDER.length; i += 2)
    pairs.push([teams[MATCHUP_ORDER[i]], teams[MATCHUP_ORDER[i + 1]]]);
  return pairs;
}

function buildRound(region, round, results, getTeamsByRegion, allTeams) {
  if (round === 0) return buildR64(region, getTeamsByRegion);
  const prev = buildRound(region, round - 1, results, getTeamsByRegion, allTeams);
  const pairs = [];
  for (let i = 0; i < prev.length; i += 2) {
    const wA = results[`${region}-${round - 1}-${i}`];
    const wB = results[`${region}-${round - 1}-${i + 1}`];
    pairs.push([
      wA ? allTeams.find(t => t.id === wA) ?? null : null,
      wB ? allTeams.find(t => t.id === wB) ?? null : null,
    ]);
  }
  return pairs;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MatchupCard({ teamA, teamB, winnerId, onPick, regionColor, liveScore }) {
  if (!teamA && !teamB) return null;

  const probA     = winProb(teamA, teamB);
  const probB     = 1 - probA;
  const modelPick = probA >= probB ? teamA?.id : teamB?.id;
  const hasResult = !!winnerId;
  const modelCorrect = hasResult && winnerId === modelPick;

  function teamSeed(id) {
    return [teamA, teamB].find(t => t?.id === id)?.seed ?? 99;
  }
  const isUpset = hasResult && winnerId && teamSeed(winnerId) > teamSeed(modelPick);

  const live = liveScore?.find(g =>
    g.teams.some(c => c.id === teamA?.id) && g.teams.some(c => c.id === teamB?.id)
  );

  return (
    <div className={`bg-court-800 rounded-lg border overflow-hidden transition-all ${
      isUpset ? 'border-hoop-500/50' : hasResult ? 'border-court-600' : 'border-court-600 hover:border-court-500'
    }`}>
      {isUpset && (
        <div className="bg-hoop-500/10 px-3 py-1 flex items-center gap-2">
          <span className="text-hoop-400 text-xs font-sport uppercase" style={{ letterSpacing: '0.08em' }}>Upset</span>
        </div>
      )}
      {live && !hasResult && (
        <div className="px-3 py-1 bg-emerald-500/10 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs font-mono">LIVE</span>
          <span className="text-slate-400 text-xs font-mono ml-auto">
            {live.teams.find(c => c.id === teamA?.id)?.score ?? '—'} – {live.teams.find(c => c.id === teamB?.id)?.score ?? '—'}
          </span>
        </div>
      )}
      {[{ team: teamA, prob: probA }, { team: teamB, prob: probB }].map(({ team, prob }, idx) => {
        if (!team) return (
          <div key={idx} className="flex items-center gap-2 px-3 py-2 border-b border-court-700 last:border-0 opacity-30">
            <span className="text-slate-600 text-xs w-5 text-center">—</span>
            <span className="text-slate-600 text-xs">TBD</span>
          </div>
        );
        const isWinner = hasResult && winnerId === team.id;
        const isLoser  = hasResult && winnerId !== team.id;
        const isModel  = team.id === modelPick;
        return (
          <button key={team.id} onClick={() => onPick(winnerId === team.id ? null : team.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-all border-b border-court-700 last:border-0
              ${isWinner ? 'bg-court-700' : isLoser ? 'opacity-40' : 'hover:bg-court-700/50'}`}>
            <span className="text-xs font-mono w-5 text-center shrink-0"
              style={{ color: isWinner ? regionColor : '#64748b' }}>
              {team.seed}
            </span>
            <span className={`text-sm flex-1 truncate font-medium ${isWinner ? 'text-white' : 'text-slate-400'}`}>
              {team.name}
            </span>
            {!hasResult && (
              <span className={`text-xs font-mono shrink-0 ${isModel ? '' : 'text-slate-600'}`}
                style={isModel ? { color: regionColor } : {}}>
                {(prob * 100).toFixed(0)}%
              </span>
            )}
            {isWinner && <span className="text-xs shrink-0 font-medium" style={{ color: regionColor }}>W</span>}
            {isWinner && modelCorrect  && <span className="text-xs text-emerald-400 shrink-0">✓</span>}
            {isWinner && !modelCorrect && <span className="text-xs text-slate-500 shrink-0">✗</span>}
          </button>
        );
      })}
    </div>
  );
}

function SimpleMatchupCard({ teamA, teamB, winnerId, onPick, label }) {
  const probA    = winProb(teamA, teamB);
  const modelPick = probA >= 0.5 ? teamA?.id : teamB?.id;
  const hasResult = !!winnerId;
  return (
    <div className="bg-court-800 rounded-lg border border-court-600 overflow-hidden">
      {label && (
        <div className="px-3 py-1.5 border-b border-court-700">
          <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">{label}</span>
        </div>
      )}
      {[{ team: teamA, prob: probA }, { team: teamB, prob: 1 - probA }].map(({ team, prob }, idx) => {
        if (!team) return (
          <div key={idx} className="flex items-center gap-2 px-3 py-2.5 border-b border-court-700 last:border-0 opacity-30">
            <span className="text-slate-600 text-xs">TBD</span>
          </div>
        );
        const isWinner = hasResult && winnerId === team.id;
        const isLoser  = hasResult && winnerId !== team.id;
        const isModel  = team.id === modelPick;
        return (
          <button key={team.id} onClick={() => onPick(winnerId === team.id ? null : team.id)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all border-b border-court-700 last:border-0
              ${isWinner ? 'bg-court-700' : isLoser ? 'opacity-40' : 'hover:bg-court-700/50'}`}>
            <span className={`text-xs font-mono w-5 text-center shrink-0 ${isWinner ? 'text-hoop-400' : 'text-slate-600'}`}>{team.seed}</span>
            <span className={`text-sm flex-1 truncate font-medium ${isWinner ? 'text-white' : 'text-slate-400'}`}>{team.name}</span>
            <span className={`text-xs font-mono shrink-0 ${isModel ? 'text-hoop-400' : 'text-slate-600'}`}>{(prob * 100).toFixed(0)}%</span>
            {isWinner && <span className="text-xs text-emerald-400 shrink-0">{winnerId === modelPick ? '✓' : '✗'}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Tracker({ bracketData = defaultData, gender = 'men' }) {
  const { TEAMS, REGIONS, getTeamsByRegion } = bracketData;
  const storageKey = `tracker_results_${gender}`;

  const [results, setResults] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
    catch { return {}; }
  });
  const [activeRound, setActiveRound] = useState(0);
  const [syncing, setSyncing]         = useState(false);
  const [syncMsg, setSyncMsg]         = useState(null);   // { type: 'ok'|'err'|'info', text }
  const [liveScores, setLiveScores]   = useState([]);

  // Reset when switching genders
  useEffect(() => {
    try { setResults(JSON.parse(localStorage.getItem(storageKey) || '{}')); }
    catch { setResults({}); }
  }, [storageKey]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(results));
  }, [results, storageKey]);

  const regionColors = Object.fromEntries(REGIONS.map((r, i) => [r, PALETTE[i]]));

  function setPick(key, teamId) {
    setResults(prev => {
      const next = { ...prev };
      if (teamId === null) delete next[key]; else next[key] = teamId;
      return next;
    });
  }

  // ── ESPN Sync ───────────────────────────────────────────────────────────────

  async function handleESPNSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const events = await fetchESPNEvents(gender);
      if (!events.length) {
        setSyncMsg({ type: 'info', text: 'No tournament games found yet.' });
        return;
      }

      // Separate completed vs live
      const completed = events.filter(ev => ev.competitions?.[0]?.status?.type?.completed);
      const live = events.filter(ev => {
        const st = ev.competitions?.[0]?.status?.type;
        return st && !st.completed && st.state === 'in';
      });

      // Build live score data for display
      const liveData = live.map(ev => {
        const comp = ev.competitions?.[0];
        const teams = (comp?.competitors || []).map(c => ({
          id: matchTeam(c.team?.shortDisplayName || c.team?.displayName, buildNameIndex(TEAMS))?.id,
          score: c.score,
        }));
        return { teams };
      }).filter(g => g.teams.length === 2);
      setLiveScores(liveData);

      const { newResults, log } = processESPNEvents(completed, TEAMS, REGIONS, getTeamsByRegion);

      // Merge: ESPN is authoritative for completed games
      const merged = { ...results };
      for (const [k, v] of Object.entries(newResults)) merged[k] = v;
      const added = Object.keys(newResults).filter(k => results[k] !== newResults[k]).length;

      setResults(merged);
      if (added > 0) {
        setSyncMsg({ type: 'ok', text: `Synced ${added} result${added !== 1 ? 's' : ''}${live.length ? ` · ${live.length} game${live.length !== 1 ? 's' : ''} live` : ''}` });
      } else {
        setSyncMsg({ type: 'info', text: `Up to date${live.length ? ` · ${live.length} game${live.length !== 1 ? 's' : ''} live` : ''}` });
      }
    } catch (err) {
      setSyncMsg({ type: 'err', text: 'Could not reach ESPN. Try again.' });
    } finally {
      setSyncing(false);
    }
  }

  // ── Build matchup data ──────────────────────────────────────────────────────

  const regionalMatchups = REGIONS.map(region =>
    [0, 1, 2, 3].map(round => buildRound(region, round, results, getTeamsByRegion, TEAMS))
  );

  const e8Winners = REGIONS.map(r => {
    const id = results[`${r}-3-0`];
    return id ? TEAMS.find(t => t.id === id) ?? null : null;
  });
  const ffMatchups = [[e8Winners[0], e8Winners[1]], [e8Winners[2], e8Winners[3]]];
  const ffWinners  = [0, 1].map(i => results[`FF-${i}`] ? TEAMS.find(t => t.id === results[`FF-${i}`]) ?? null : null);
  const champion   = results['CHAMP'] ? TEAMS.find(t => t.id === results['CHAMP']) ?? null : null;

  // ── Accuracy stats ──────────────────────────────────────────────────────────

  const allGames = [];
  REGIONS.forEach((region, rIdx) => {
    [0, 1, 2, 3].forEach(round => {
      regionalMatchups[rIdx][round].forEach((pair, mIdx) => {
        const [teamA, teamB] = pair;
        if (!teamA || !teamB) return;
        const resultId  = results[`${region}-${round}-${mIdx}`];
        const prob      = winProb(teamA, teamB);
        const modelPick = prob >= 0.5 ? teamA : teamB;
        const winner    = resultId ? TEAMS.find(t => t.id === resultId) : null;
        allGames.push({ region, round, mIdx, teamA, teamB, modelPick, modelProb: Math.max(prob, 1-prob),
          winner, resultId, correct: winner ? winner.id === modelPick.id : null,
          isUpset: winner && winner.seed > modelPick.seed });
      });
    });
  });
  ffMatchups.forEach(([teamA, teamB], i) => {
    if (!teamA && !teamB) return;
    const resultId  = results[`FF-${i}`];
    const prob      = winProb(teamA, teamB);
    const modelPick = prob >= 0.5 ? teamA : teamB;
    const winner    = resultId ? TEAMS.find(t => t.id === resultId) : null;
    allGames.push({ region: 'Final Four', round: 4, mIdx: i, teamA, teamB,
      modelPick, modelProb: Math.max(prob, 1-prob), winner, resultId,
      correct: winner ? winner.id === modelPick?.id : null,
      isUpset: winner && modelPick && winner.seed > modelPick.seed });
  });
  if (ffWinners[0] || ffWinners[1]) {
    const [teamA, teamB] = ffWinners;
    const resultId  = results['CHAMP'];
    const prob      = winProb(teamA, teamB);
    const modelPick = prob >= 0.5 ? teamA : teamB;
    const winner    = resultId ? TEAMS.find(t => t.id === resultId) : null;
    allGames.push({ region: 'Championship', round: 5, teamA, teamB,
      modelPick, modelProb: Math.max(prob, 1-prob), winner, resultId,
      correct: winner ? winner.id === modelPick?.id : null,
      isUpset: winner && modelPick && winner.seed > modelPick.seed });
  }

  const played   = allGames.filter(g => g.winner);
  const correct  = played.filter(g => g.correct);
  const upsets   = played.filter(g => g.isUpset);
  const accuracy = played.length ? ((correct.length / played.length) * 100).toFixed(0) : null;
  const byRound  = [0,1,2,3,4,5].map(r => {
    const gs = allGames.filter(g => g.round === r && g.winner);
    return { played: gs.length, correct: gs.filter(g => g.correct).length };
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* Summary bar */}
      <div className="bg-court-900 rounded-xl border border-court-700 p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-slate-500 uppercase font-mono mb-1" style={{ letterSpacing: '0.12em', fontSize: '10px' }}>Games Played</p>
            <p className="font-sport text-white" style={{ fontSize: '2rem' }}>{played.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-mono mb-1" style={{ letterSpacing: '0.12em', fontSize: '10px' }}>Model Correct</p>
            <p className="font-sport text-emerald-400" style={{ fontSize: '2rem' }}>{correct.length}
              {accuracy && <span className="text-slate-500 text-base ml-1">{accuracy}%</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-mono mb-1" style={{ letterSpacing: '0.12em', fontSize: '10px' }}>Upsets</p>
            <p className="font-sport text-hoop-400" style={{ fontSize: '2rem' }}>{upsets.length}</p>
          </div>
          {champion && (
            <div className="ml-auto text-right">
              <p className="text-xs text-slate-500 uppercase font-mono mb-1" style={{ letterSpacing: '0.12em', fontSize: '10px' }}>Champion</p>
              <p className="font-sport text-hoop-400 text-xl uppercase" style={{ letterSpacing: '0.04em' }}>{champion.name}</p>
              <p className="text-xs text-slate-600">#{champion.seed} {champion.region}</p>
            </div>
          )}
        </div>

        {played.length > 0 && (
          <div className="mt-4 pt-4 border-t border-court-700 flex flex-wrap gap-4">
            {['R64','R32','S16','E8','F4','Champ'].map((label, i) => {
              const r = byRound[i];
              if (!r.played) return null;
              return (
                <div key={label} className="text-center">
                  <p className="text-xs text-slate-500 mb-0.5 font-mono">{label}</p>
                  <p className="text-sm font-mono text-white">{r.correct}/{r.played}</p>
                  <div className="h-1 w-12 bg-court-700 rounded-full mt-1">
                    <div className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${(r.correct / r.played) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Round tabs + ESPN sync */}
      <div className="flex gap-2 flex-wrap items-center">
        {ROUND_LABELS.map((label, i) => (
          <button key={label} onClick={() => setActiveRound(i)}
            className={`px-4 py-1.5 rounded font-sport uppercase text-xs transition-all ${
              activeRound === i ? 'bg-hoop-500 text-white' : 'bg-court-800 text-slate-400 hover:text-white border border-court-600'
            }`}
            style={{ letterSpacing: '0.08em' }}>
            {label}
            {byRound[i].played > 0 && (
              <span className="ml-1.5 font-sans text-xs opacity-60">{byRound[i].correct}/{byRound[i].played}</span>
            )}
          </button>
        ))}
        <button onClick={() => setActiveRound(4)}
          className={`px-4 py-1.5 rounded font-sport uppercase text-xs transition-all ${
            activeRound === 4 ? 'bg-hoop-500 text-white' : 'bg-court-800 text-slate-400 hover:text-white border border-court-600'
          }`}
          style={{ letterSpacing: '0.08em' }}>
          F4 + Champ
        </button>

        <div className="ml-auto flex items-center gap-2">
          {/* ESPN sync status */}
          {syncMsg && (
            <span className={`text-xs font-mono px-2 py-1 rounded border ${
              syncMsg.type === 'ok'  ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
              syncMsg.type === 'err' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
              'text-slate-400 border-court-600 bg-court-800'
            }`}>
              {syncMsg.text}
            </span>
          )}

          <button
            onClick={handleESPNSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sport uppercase border border-hoop-500/40 bg-hoop-500/10 text-hoop-400 hover:bg-hoop-500/20 transition-colors disabled:opacity-50"
            style={{ letterSpacing: '0.08em' }}>
            {syncing ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Syncing…
              </>
            ) : (
              <>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"/>
                </svg>
                ESPN Sync
              </>
            )}
          </button>

          <button onClick={() => { if (confirm('Clear all results?')) { setResults({}); setSyncMsg(null); } }}
            className="px-3 py-1.5 rounded text-xs text-slate-500 hover:text-red-400 border border-court-700 hover:border-red-400/40 transition-colors font-mono">
            Reset
          </button>
        </div>
      </div>

      {/* Regional rounds */}
      {activeRound < 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {REGIONS.map((region, rIdx) => {
            const color    = regionColors[region];
            const matchups = regionalMatchups[rIdx][activeRound];
            const entered  = matchups.filter((p, mIdx) => results[`${region}-${activeRound}-${mIdx}`] && p[0] && p[1]).length;
            const total    = matchups.filter(p => p[0] && p[1]).length;

            return (
              <div key={region} className="bg-court-900 rounded-xl border border-court-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-sport text-base uppercase" style={{ color, letterSpacing: '0.08em' }}>{region}</h2>
                  <span className="text-xs font-mono text-slate-500">{entered}/{total} entered</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {matchups.map((pair, mIdx) => (
                    <MatchupCard
                      key={mIdx}
                      teamA={pair[0]}
                      teamB={pair[1]}
                      winnerId={results[`${region}-${activeRound}-${mIdx}`] ?? null}
                      onPick={(id) => setPick(`${region}-${activeRound}-${mIdx}`, id)}
                      regionColor={color}
                      liveScore={liveScores}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Final Four + Championship */}
      {activeRound === 4 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-court-900 rounded-xl border border-court-700 p-4">
            <h2 className="font-sport text-white text-base uppercase mb-1" style={{ letterSpacing: '0.08em' }}>Semifinal 1</h2>
            <p className="text-xs text-slate-600 mb-3">{REGIONS[0]} vs {REGIONS[1]}</p>
            <SimpleMatchupCard
              teamA={e8Winners[0]} teamB={e8Winners[1]}
              winnerId={results['FF-0'] ?? null}
              onPick={(id) => setPick('FF-0', id)}
            />
          </div>
          <div className="bg-court-900 rounded-xl border border-court-700 p-4">
            <h2 className="font-sport text-white text-base uppercase mb-1" style={{ letterSpacing: '0.08em' }}>Semifinal 2</h2>
            <p className="text-xs text-slate-600 mb-3">{REGIONS[2]} vs {REGIONS[3]}</p>
            <SimpleMatchupCard
              teamA={e8Winners[2]} teamB={e8Winners[3]}
              winnerId={results['FF-1'] ?? null}
              onPick={(id) => setPick('FF-1', id)}
            />
          </div>
          <div className="bg-court-900 rounded-xl border border-hoop-500/20 p-4">
            <h2 className="font-sport text-hoop-400 text-base uppercase mb-4" style={{ letterSpacing: '0.08em' }}>Championship</h2>
            <SimpleMatchupCard
              teamA={ffWinners[0]} teamB={ffWinners[1]}
              winnerId={results['CHAMP'] ?? null}
              onPick={(id) => setPick('CHAMP', id)}
              label="National Championship"
            />
            {champion && (
              <div className="mt-4 text-center">
                <div className="inline-block px-4 py-2 rounded-lg bg-hoop-500/10 border border-hoop-500/30">
                  <p className="text-xs text-slate-500 font-mono mb-1" style={{ letterSpacing: '0.1em', fontSize: '10px' }}>2026 CHAMPION</p>
                  <p className="font-sport text-hoop-400 text-xl uppercase" style={{ letterSpacing: '0.04em' }}>{champion.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">#{champion.seed} · {champion.region}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upset log */}
      {upsets.length > 0 && (
        <div className="bg-court-900 rounded-xl border border-court-700 p-4">
          <h2 className="font-sport text-white text-lg uppercase mb-0.5" style={{ letterSpacing: '0.06em' }}>Upset Log</h2>
          <p className="text-xs text-slate-500 mb-4">{upsets.length} upset{upsets.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upsets.map((g, i) => {
              const loser  = g.winner?.id === g.teamA?.id ? g.teamB : g.teamA;
              const rLabel = ['R64','R32','S16','E8','F4','Champ'][g.round] ?? '';
              const rColor = regionColors[g.region] ?? '#f97316';
              const modelProb = g.modelPick?.id === g.winner?.id
                ? (1 - g.modelProb) * 100
                : g.modelProb * 100;
              return (
                <div key={i} className="bg-court-800 rounded-lg p-3 border border-hoop-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-sport text-hoop-400 text-xs uppercase" style={{ letterSpacing: '0.08em' }}>Upset</span>
                    <span className="text-xs font-mono text-slate-500">· {rLabel}</span>
                    {g.region !== 'Final Four' && g.region !== 'Championship' && (
                      <span className="text-xs font-sport uppercase ml-auto" style={{ color: rColor, letterSpacing: '0.06em' }}>{g.region}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-white text-sm font-medium">#{g.winner?.seed} {g.winner?.name}</p>
                      <p className="text-slate-500 text-xs">def. #{loser?.seed} {loser?.name}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-hoop-400 font-mono text-sm font-bold">{modelProb.toFixed(0)}%</p>
                      <p className="text-slate-600 text-xs">model gave</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Still alive */}
      {played.length > 0 && (
        <div className="bg-court-900 rounded-xl border border-court-700 p-4">
          <h2 className="font-sport text-white text-lg uppercase mb-0.5" style={{ letterSpacing: '0.06em' }}>Still Alive</h2>
          <p className="text-xs text-slate-500 mb-4">Teams not yet eliminated</p>
          <div className="flex flex-wrap gap-2">
            {TEAMS
              .filter(t => !t.id.includes('-ff'))
              .filter(t => !allGames.some(g => g.winner && g.winner.id !== t.id &&
                (g.teamA?.id === t.id || g.teamB?.id === t.id)))
              .sort((a, b) => (b.offRtg - b.defRtg) - (a.offRtg - a.defRtg))
              .map(t => (
                <div key={t.id} className="flex items-center gap-1.5 bg-court-800 border border-court-700 rounded-lg px-2.5 py-1.5">
                  <span className="text-xs font-mono text-slate-500">#{t.seed}</span>
                  <span className="text-sm text-white font-medium">{t.name}</span>
                  <span className="text-xs font-sport uppercase ml-1"
                    style={{ color: regionColors[t.region], fontSize: '10px', letterSpacing: '0.06em' }}>
                    {t.region}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
