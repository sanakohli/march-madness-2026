import { useState, useEffect } from 'react';
import * as defaultData from '../data/teams';
import { PALETTE } from '../utils/colors';

const ROUND_NAMES = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8', 'Final Four', 'Championship'];

// Seed matchups for R64: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
const MATCHUP_ORDER = [0,7, 4,3, 5,2, 6,1]; // indices into sorted-by-seed array

function buildInitialMatchups(region, getTeamsByRegion) {
  const teams = getTeamsByRegion(region); // sorted seed 1–16
  const pairs = [];
  for (let i = 0; i < MATCHUP_ORDER.length; i += 2) {
    pairs.push([teams[MATCHUP_ORDER[i]], teams[MATCHUP_ORDER[i + 1]]]);
  }
  return pairs; // 8 matchups
}

function getRiskColor(team) {
  if (!team) return '';
  const net = team.offRtg - team.defRtg;
  if (net > 20) return 'border-emerald-500/50';
  if (net > 15) return 'border-hoop-500/50';
  return 'border-court-600';
}

function TeamSlot({ team, isWinner, onClick, dimmed }) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-dashed border-court-600 opacity-30">
        <span className="text-slate-600 text-xs w-4">—</span>
        <span className="text-slate-600 text-xs">TBD</span>
      </div>
    );
  }
  const net = (team.offRtg - team.defRtg).toFixed(1);
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded border text-left transition-all
        ${isWinner ? 'bg-hoop-500/20 border-hoop-500 text-white' : `bg-court-800 ${getRiskColor(team)} text-slate-300 hover:bg-court-700 hover:text-white`}
        ${dimmed ? 'opacity-40' : 'opacity-100'}
      `}
    >
      <span className={`text-xs w-4 shrink-0 font-mono ${isWinner ? 'text-hoop-400' : 'text-slate-500'}`}>{team.seed}</span>
      <span className="text-xs flex-1 truncate font-medium">{team.name}</span>
      <span className="text-xs text-slate-600 shrink-0 hidden sm:block">{team.record}</span>
      <span className={`text-xs shrink-0 ${parseFloat(net) > 18 ? 'text-emerald-400' : 'text-slate-600'}`}>+{net}</span>
    </button>
  );
}

function Matchup({ top, bottom, winner, onPick }) {
  return (
    <div className="flex flex-col gap-0.5">
      <TeamSlot team={top} isWinner={winner?.id === top?.id} onClick={() => top && onPick(top)} dimmed={winner && winner.id !== top?.id} />
      <TeamSlot team={bottom} isWinner={winner?.id === bottom?.id} onClick={() => bottom && onPick(bottom)} dimmed={winner && winner.id !== bottom?.id} />
    </div>
  );
}

function RegionBracket({ region, picks, onPick, getTeamsByRegion }) {
  const r64 = buildInitialMatchups(region, getTeamsByRegion);

  // Build rounds from picks
  const rounds = [r64]; // round 0 = R64 matchups

  for (let round = 1; round < 4; round++) {
    const prevRound = rounds[round - 1];
    const newRound = [];
    for (let i = 0; i < prevRound.length; i += 2) {
      const winnerA = picks[`${region}-${round-1}-${i}`];
      const winnerB = picks[`${region}-${round-1}-${i+1}`];
      newRound.push([winnerA || null, winnerB || null]);
    }
    rounds.push(newRound);
  }

  const roundLabels = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8'];

  return (
    <div>
      <h3 className="font-sport text-hoop-400 text-base uppercase mb-3" style={{ letterSpacing: '0.08em' }}>{region}</h3>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {rounds.map((matchups, rIdx) => (
          <div key={rIdx} className="flex flex-col justify-around gap-2 shrink-0" style={{ minWidth: 160 }}>
            <p className="text-xs text-slate-600 text-center mb-1">{roundLabels[rIdx]}</p>
            {matchups.map((pair, mIdx) => (
              <Matchup
                key={mIdx}
                top={pair[0]}
                bottom={pair[1]}
                winner={picks[`${region}-${rIdx}-${mIdx}`]}
                onPick={(team) => onPick(region, rIdx, mIdx, team, rounds)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Bracket({ bracketData = defaultData }) {
  const { getTeamsByRegion, REGIONS } = bracketData;
  const [picks, setPicks] = useState({});
  const [activeRegion, setActiveRegion] = useState(REGIONS[0]);

  // Reset picks and active region when switching between men's/women's
  useEffect(() => {
    setPicks({});
    setActiveRegion(REGIONS[0]);
  }, [REGIONS[0]]);

  const handlePick = (region, round, matchupIdx, team, rounds) => {
    const newPicks = { ...picks };
    newPicks[`${region}-${round}-${matchupIdx}`] = team;

    // Clear downstream picks if this team already had different picks
    // Next round matchup index
    let nextMatchup = Math.floor(matchupIdx / 2);
    let nextRound = round + 1;
    while (nextRound < 4) {
      const key = `${region}-${nextRound}-${nextMatchup}`;
      const existingWinner = newPicks[key];
      if (!existingWinner) break;
      // Check if existing winner was from this matchup slot
      delete newPicks[key];
      nextMatchup = Math.floor(nextMatchup / 2);
      nextRound++;
    }

    setPicks(newPicks);
  };

  const getEliteEight = () => REGIONS.map(r => picks[`${r}-3-0`]).filter(Boolean);
  const eliteEight = getEliteEight();

  const finalFourPicks = [0,1,2,3].map(i => picks[`FF-${i}`]);

  const handleFFPick = (slot, team) => {
    const newPicks = { ...picks };
    newPicks[`FF-${slot}`] = team;
    // clear championship picks if FF picks change
    delete newPicks['champ-0'];
    delete newPicks['champ-1'];
    delete newPicks['champion'];
    setPicks(newPicks);
  };

  const ffMatchups = [
    [eliteEight[0], eliteEight[1]],
    [eliteEight[2], eliteEight[3]],
  ];

  const champMatchups = [[finalFourPicks[0], finalFourPicks[1]], [finalFourPicks[2], finalFourPicks[3]]];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Region tabs */}
      <div className="flex gap-2 flex-wrap">
        {REGIONS.map((r, rIdx) => {
          const color = PALETTE[rIdx];
          const isActive = activeRegion === r;
          return (
            <button key={r} onClick={() => setActiveRegion(r)}
              className={`px-4 py-1.5 rounded font-sport uppercase text-xs transition-all ${
                isActive ? '' : 'bg-court-800 text-slate-400 hover:text-white border border-court-600'
              }`}
              style={isActive ? {
                background: `${color}20`,
                border: `1px solid ${color}55`,
                color,
                letterSpacing: '0.08em',
              } : { letterSpacing: '0.08em' }}>
              {r}
              {picks[`${r}-3-0`] && <span className="ml-2 opacity-60" style={{ fontSize: '10px' }}>→ {picks[`${r}-3-0`].name}</span>}
            </button>
          );
        })}
      </div>

      <div className="bg-court-900 rounded-xl border border-court-700 p-4">
        <RegionBracket region={activeRegion} picks={picks} onPick={handlePick} getTeamsByRegion={getTeamsByRegion} />
      </div>

      {/* Final Four + Championship */}
      {eliteEight.length > 0 && (
        <div className="bg-court-900 rounded-xl border border-hoop-500/30 p-4">
          <h2 className="font-sport text-hoop-400 text-lg uppercase mb-4" style={{ letterSpacing: '0.08em' }}>Final Four & Championship</h2>
          <div className="flex flex-wrap gap-8 items-start justify-center">
            {/* FF Semi 1 */}
            <div>
              <p className="text-xs text-slate-600 mb-2 text-center">{REGIONS[0]} vs {REGIONS[1]} winner</p>
              <Matchup
                top={eliteEight[0]}
                bottom={eliteEight[1]}
                winner={picks['FF-0']}
                onPick={(t) => { const p = {...picks}; p['FF-0'] = t; delete p['champion']; setPicks(p); }}
              />
            </div>
            {/* FF Semi 2 */}
            <div>
              <p className="text-xs text-slate-600 mb-2 text-center">{REGIONS[2]} vs {REGIONS[3]} winner</p>
              <Matchup
                top={eliteEight[2]}
                bottom={eliteEight[3]}
                winner={picks['FF-1']}
                onPick={(t) => { const p = {...picks}; p['FF-1'] = t; delete p['champion']; setPicks(p); }}
              />
            </div>

            {/* Championship */}
            {(picks['FF-0'] || picks['FF-1']) && (
              <div>
                <p className="text-xs text-slate-600 mb-2 text-center">🏆 Championship</p>
                <Matchup
                  top={picks['FF-0']}
                  bottom={picks['FF-1']}
                  winner={picks['champion']}
                  onPick={(t) => { const p = {...picks}; p['champion'] = t; setPicks(p); }}
                />
                {picks['champion'] && (
                  <div className="mt-3 text-center">
                    <p className="text-hoop-400 font-bold text-sm">🏆 {picks['champion'].name}</p>
                    <p className="text-slate-600 text-xs">Your 2026 Champion</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Picks summary */}
      <div className="bg-court-900 rounded-xl border border-court-700 p-4">
        <h2 className="font-sport text-white text-lg uppercase mb-3" style={{ letterSpacing: '0.06em' }}>Your Picks</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {REGIONS.map(r => {
            const e8 = picks[`${r}-3-0`];
            const s16 = [picks[`${r}-2-0`], picks[`${r}-2-1`]].filter(Boolean);
            return (
              <div key={r} className="bg-court-800 rounded-lg p-3 border border-court-600">
                <p className="text-hoop-400 text-xs font-bold uppercase mb-2">{r}</p>
                <p className="text-xs text-slate-500 mb-1">Elite 8</p>
                <p className="text-white text-sm font-medium">{e8?.name ?? '—'}</p>
                <p className="text-xs text-slate-500 mt-2 mb-1">Sweet 16</p>
                {s16.length ? s16.map(t => <p key={t.id} className="text-slate-300 text-xs">{t.name}</p>) : <p className="text-slate-600 text-xs">—</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
