import { useState } from 'react';
import * as defaultData from '../data/teams';
import { simulateMatchup } from '../utils/monteCarlo';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

const STAT_LABELS = {
  offRtg: 'Off Rating', defRtg: 'Def Rating', ppg: 'PPG', oppPpg: 'Opp PPG',
  rebMargin: 'Reb Margin', astTov: 'Ast/TO', fg3Pct: '3P%', ftPct: 'FT%', pace: 'Pace',
};

function StatRow({ label, a, b, higherIsBetter = true }) {
  const aWins = higherIsBetter ? a > b : a < b;
  const bWins = higherIsBetter ? b > a : b < a;
  return (
    <div className="flex items-center gap-2 py-2 border-b border-court-700 last:border-0">
      <span className={`text-sm font-mono w-16 text-right ${aWins ? 'text-hoop-400 font-bold' : 'text-slate-400'}`}>{a}</span>
      <span className="text-xs text-slate-500 flex-1 text-center">{label}</span>
      <span className={`text-sm font-mono w-16 text-left ${bWins ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>{b}</span>
    </div>
  );
}

export default function Compare({ bracketData = defaultData }) {
  const { TEAMS, REGIONS } = bracketData;
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);

  const resolvedA = teamA && TEAMS.find(t => t.id === teamA.id) ? teamA : TEAMS[0];
  const resolvedB = teamB && TEAMS.find(t => t.id === teamB.id) ? teamB : TEAMS[1];

  const radarData = [
    { stat: 'Off Rtg',  [resolvedA.name]: resolvedA.offRtg,                      [resolvedB.name]: resolvedB.offRtg },
    { stat: 'Def',      [resolvedA.name]: 150 - resolvedA.defRtg,                 [resolvedB.name]: 150 - resolvedB.defRtg },
    { stat: '3P%',      [resolvedA.name]: resolvedA.fg3Pct * 2.5,                 [resolvedB.name]: resolvedB.fg3Pct * 2.5 },
    { stat: 'Pace',     [resolvedA.name]: resolvedA.pace,                         [resolvedB.name]: resolvedB.pace },
    { stat: 'Rebounds', [resolvedA.name]: resolvedA.rebMargin * 5 + 80,           [resolvedB.name]: resolvedB.rebMargin * 5 + 80 },
    { stat: 'Ast/TO',   [resolvedA.name]: resolvedA.astTov * 30,                  [resolvedB.name]: resolvedB.astTov * 30 },
    { stat: 'FT%',      [resolvedA.name]: resolvedA.ftPct,                        [resolvedB.name]: resolvedB.ftPct },
  ];

  const barData = [
    { name: 'PPG',      [resolvedA.name]: resolvedA.ppg,     [resolvedB.name]: resolvedB.ppg },
    { name: 'Opp PPG',  [resolvedA.name]: resolvedA.oppPpg,  [resolvedB.name]: resolvedB.oppPpg },
    { name: 'Off Rtg',  [resolvedA.name]: resolvedA.offRtg,  [resolvedB.name]: resolvedB.offRtg },
    { name: 'Def Rtg',  [resolvedA.name]: resolvedA.defRtg,  [resolvedB.name]: resolvedB.defRtg },
  ];

  const [simN, setSimN] = useState(10000);
  const [simResult, setSimResult] = useState(null);
  const [simRunning, setSimRunning] = useState(false);
  const [simTeamIds, setSimTeamIds] = useState(null);
  const [simMode, setSimMode] = useState('local');
  const [apiError, setApiError] = useState(false);

  const netA = (resolvedA.offRtg - resolvedA.defRtg).toFixed(1);
  const netB = (resolvedB.offRtg - resolvedB.defRtg).toFixed(1);
  const aFavored = parseFloat(netA) > parseFloat(netB);
  const gender = bracketData === defaultData ? 'men' : 'women';

  const currentPair = `${resolvedA.id}|${resolvedB.id}|${simMode}`;
  const simIsStale = simResult && simTeamIds !== currentPair;

  const handleSimulate = () => {
    setSimRunning(true);
    setApiError(false);

    if (simMode === 'bayesian') {
      fetch('/api/simulate-matchup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender,
          team_a_id: resolvedA.id,
          team_b_id: resolvedB.id,
          n: simN,
        }),
      })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(data => {
          setSimResult({
            probA: data.prob_a,
            probB: data.prob_b,
            baseProb: data.base_prob_a,
            strengthA: data.strength_a,
            strengthB: data.strength_b,
            isBayesian: true,
            factors: {
              avgPace: data.factors.avg_pace,
              paceVarianceAdded: data.factors.effective_scale > simN,
              avg3Pct: data.factors.avg_3pct,
              threeNoiseStd: data.factors.three_noise_std,
              avgAstTov: data.factors.avg_astov,
              toNoiseStd: data.factors.to_noise_std,
            },
          });
          setSimTeamIds(currentPair);
          setSimRunning(false);
        })
        .catch(() => { setApiError(true); setSimRunning(false); });
    } else {
      setTimeout(() => {
        const result = simulateMatchup(resolvedA, resolvedB, simN);
        setSimResult({ ...result, strengthA: null, strengthB: null, isBayesian: false });
        setSimTeamIds(currentPair);
        setSimRunning(false);
      }, 0);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Team selectors */}
      <div className="grid grid-cols-2 gap-4">
        {[{ team: resolvedA, setter: setTeamA, color: 'hoop' }, { team: resolvedB, setter: setTeamB, color: 'emerald' }].map(({ team, setter, color }, i) => (
          <div key={i} className="bg-court-900 rounded-xl border border-court-700 p-4">
            <label className="text-xs text-slate-500 uppercase tracking-wider block mb-2">Team {i === 0 ? 'A' : 'B'}</label>
            <select
              value={team.id}
              onChange={e => setter(TEAMS.find(t => t.id === e.target.value))}
              className="w-full bg-court-800 border border-court-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-hoop-500"
            >
              {REGIONS.map(r => (
                <optgroup key={r} label={r}>
                  {TEAMS.filter(t => t.region === r).sort((a,b) => a.seed - b.seed).map(t => (
                    <option key={t.id} value={t.id}>#{t.seed} {t.name} ({t.record})</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs bg-court-700 px-2 py-0.5 rounded text-slate-400">{team.conf}</span>
              <span className="text-xs bg-court-700 px-2 py-0.5 rounded text-slate-400">{team.region}</span>
              <span className="text-xs bg-court-700 px-2 py-0.5 rounded text-slate-400">KenPom #{team.kenpom}</span>
              <span className={`text-xs px-2 py-0.5 rounded ml-auto font-bold ${
                color === 'hoop' ? 'bg-hoop-500/20 text-hoop-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                Net +{(team.offRtg - team.defRtg).toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Verdict — broadcast graphic treatment */}
      <div className={`rounded-xl border relative overflow-hidden ${aFavored ? 'bg-hoop-500/8 border-hoop-500/30' : 'bg-emerald-500/8 border-emerald-500/30'}`}
        style={{ background: aFavored ? 'linear-gradient(135deg, rgba(249,115,22,0.06) 0%, transparent 60%)' : 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, transparent 60%)' }}>
        <div className={`absolute top-0 left-0 right-0 h-px ${aFavored ? 'bg-gradient-to-r from-transparent via-hoop-500/60 to-transparent' : 'bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent'}`} />
        <div className="px-8 py-6 text-center">
          <p className="text-xs text-slate-500 uppercase font-mono mb-4" style={{ letterSpacing: '0.18em', fontSize: '10px' }}>Efficiency Edge</p>
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className={`font-sport text-5xl uppercase leading-none ${aFavored ? 'text-hoop-400' : 'text-emerald-400'}`}
              style={{ letterSpacing: '0.04em', textShadow: aFavored ? '0 0 40px rgba(249,115,22,0.2)' : '0 0 40px rgba(34,197,94,0.2)' }}>
              {aFavored ? resolvedA.name : resolvedB.name}
            </span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-xs bg-court-800 border border-court-600 px-2 py-0.5 rounded text-slate-400">
              #{aFavored ? resolvedA.seed : resolvedB.seed}
            </span>
            <span className="text-slate-600 text-xs">leads by</span>
            <span className={`font-sport text-2xl ${aFavored ? 'text-hoop-400' : 'text-emerald-400'}`}>
              +{Math.abs(parseFloat(netA) - parseFloat(netB)).toFixed(1)}
            </span>
            <span className="text-slate-600 text-xs">pts / 100 poss.</span>
          </div>
          <p className="text-xs text-slate-600 mt-3 font-mono" style={{ letterSpacing: '0.08em' }}>
            {resolvedA.style.toUpperCase()} vs {resolvedB.style.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Game Simulation */}
      <div className="bg-court-900 rounded-xl border border-court-700 p-4">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div>
            <h2 className="font-sport text-white text-lg uppercase" style={{ letterSpacing: '0.06em' }}>Simulate This Matchup</h2>
            <p className="text-xs text-slate-500 mt-0.5">Win probability using pace, 3P% variance, and A/TO consistency adjustments</p>
          </div>
          <div className="flex items-center gap-3 ml-auto flex-wrap">
            {/* Model toggle */}
            <div className="flex bg-court-800 border border-court-600 rounded-lg p-0.5">
              {[['local', 'JS Local'], ['bayesian', 'Bayesian API']].map(([val, label]) => (
                <button key={val} onClick={() => setSimMode(val)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    simMode === val ? 'bg-hoop-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500">Sims:</span>
            {[1000, 5000, 10000].map(v => (
              <button key={v} onClick={() => setSimN(v)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  simN === v ? 'bg-hoop-500 text-white' : 'bg-court-800 border border-court-600 text-slate-400 hover:text-white'
                }`}>
                {v.toLocaleString()}
              </button>
            ))}
            <button onClick={handleSimulate} disabled={simRunning}
              className="px-4 py-1.5 bg-hoop-500 hover:bg-hoop-400 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition-colors">
              {simRunning ? 'Running…' : simIsStale ? 'Re-run ↺' : 'Run'}
            </button>
          </div>
        </div>

        {simMode === 'bayesian' && apiError && (
          <p className="text-xs text-red-400 mb-3">Backend offline — run <code className="bg-court-800 px-1 rounded">uvicorn backend.main:app --port 8000</code></p>
        )}
        {simIsStale && (
          <p className="text-xs text-yellow-400/70 mb-3">Teams or model changed — re-run to update.</p>
        )}

        {simResult && !simIsStale && (
          <div className="space-y-4">
            {/* Win probability bars */}
            <div className="space-y-3">
              {[
                { team: resolvedA, prob: simResult.probA, strength: simResult.strengthA, color: 'bg-hoop-500', textColor: 'text-hoop-400' },
                { team: resolvedB, prob: simResult.probB, strength: simResult.strengthB, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
              ].map(({ team, prob, strength, color, textColor }) => (
                <div key={team.id}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm font-semibold text-white">
                      {team.name}
                      {strength && (
                        <span className="text-slate-500 ml-2 text-xs font-normal">
                          {strength.mean > 0 ? '+' : ''}{strength.mean.toFixed(1)} <span className="text-slate-600">±{strength.std.toFixed(1)}</span>
                        </span>
                      )}
                    </span>
                    <span className={`text-xl font-bold font-mono ${textColor}`}>{prob.toFixed(1)}%</span>
                  </div>
                  <div className="h-4 bg-court-700 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${prob}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Bayesian note */}
            {simResult.isBayesian && (
              <p className="text-xs text-emerald-400/70 bg-emerald-500/5 border border-emerald-500/20 rounded px-3 py-2">
                Bayesian mode — strength estimates are schedule-adjusted posteriors. Teams with weak SoS are shrunk toward the field average, widening their uncertainty interval.
              </p>
            )}

            {/* Factor breakdown */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-court-700">
              <div className="bg-court-800 rounded-lg p-3 border border-court-700 text-center">
                <p className="text-xs text-slate-500 mb-1">Avg Pace</p>
                <p className="text-white font-bold text-sm">{simResult.factors.avgPace.toFixed(1)}</p>
                <p className={`text-xs mt-0.5 ${simResult.factors.paceVarianceAdded ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {simResult.factors.paceVarianceAdded ? 'slow game, higher variance' : 'fast game, chalk likely'}
                </p>
              </div>
              <div className="bg-court-800 rounded-lg p-3 border border-court-700 text-center">
                <p className="text-xs text-slate-500 mb-1">3P% Noise</p>
                <p className="text-white font-bold text-sm">{simResult.factors.avg3Pct.toFixed(1)}% avg</p>
                <p className={`text-xs mt-0.5 ${simResult.factors.threeNoiseStd > 1 ? 'text-yellow-400' : 'text-slate-500'}`}>
                  {simResult.factors.threeNoiseStd > 1
                    ? `±${simResult.factors.threeNoiseStd.toFixed(1)}pt noise`
                    : 'low 3P variance'}
                </p>
              </div>
              <div className="bg-court-800 rounded-lg p-3 border border-court-700 text-center">
                <p className="text-xs text-slate-500 mb-1">A/TO Noise</p>
                <p className="text-white font-bold text-sm">{simResult.factors.avgAstTov.toFixed(2)} avg</p>
                <p className={`text-xs mt-0.5 ${simResult.factors.toNoiseStd > 0.5 ? 'text-yellow-400' : 'text-slate-500'}`}>
                  {simResult.factors.toNoiseStd > 0.5
                    ? `±${simResult.factors.toNoiseStd.toFixed(1)}pt noise`
                    : 'disciplined, low noise'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Base model (net rating only): <span className="text-slate-400">{simResult.baseProb.toFixed(1)}%</span> for {resolvedA.name} ·
              Adjusted sim: <span className="text-slate-400">{simResult.probA.toFixed(1)}%</span>
            </p>
          </div>
        )}

        {!simResult && !simRunning && (
          <p className="text-xs text-slate-600 text-center py-4">
            Click <span className="text-hoop-400">Run</span> to simulate this matchup.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar */}
        <div className="bg-court-900 rounded-xl border border-court-700 p-4">
          <h2 className="font-sport text-white text-lg uppercase mb-0.5" style={{ letterSpacing: '0.06em' }}>Skill Comparison</h2>
          <p className="text-xs text-slate-500 mb-4">Radar across 7 dimensions</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2e333d" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Radar name={resolvedA.name} dataKey={resolvedA.name} stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={2} />
              <Radar name={resolvedB.name} dataKey={resolvedB.name} stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
              <Tooltip contentStyle={{ background: '#1a1d24', border: '1px solid #2e333d', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="bg-court-900 rounded-xl border border-court-700 p-4">
          <h2 className="font-sport text-white text-lg uppercase mb-0.5" style={{ letterSpacing: '0.06em' }}>Key Stats</h2>
          <p className="text-xs text-slate-500 mb-4">PPG, Opp PPG, Off Rtg, Def Rtg</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#2e333d" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={[50, 130]} />
              <Tooltip contentStyle={{ background: '#1a1d24', border: '1px solid #2e333d', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Bar dataKey={resolvedA.name} fill="#f97316" radius={[3,3,0,0]} />
              <Bar dataKey={resolvedB.name} fill="#22c55e" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stat-by-stat table */}
      <div className="bg-court-900 rounded-xl border border-court-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-sport text-hoop-400 text-base uppercase flex-1 text-center" style={{ letterSpacing: '0.04em' }}>{resolvedA.name}</span>
          <span className="text-slate-600 text-xs w-32 text-center font-mono uppercase tracking-widest">vs</span>
          <span className="font-sport text-emerald-400 text-base uppercase flex-1 text-center" style={{ letterSpacing: '0.04em' }}>{resolvedB.name}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <StatRow label="Off Rating"  a={resolvedA.offRtg}    b={resolvedB.offRtg}    />
            <StatRow label="Def Rating"  a={resolvedA.defRtg}    b={resolvedB.defRtg}    higherIsBetter={false} />
            <StatRow label="Net Rtg"     a={netA}            b={netB}            />
            <StatRow label="PPG"         a={resolvedA.ppg}       b={resolvedB.ppg}       />
            <StatRow label="Opp PPG"     a={resolvedA.oppPpg}    b={resolvedB.oppPpg}    higherIsBetter={false} />
          </div>
          <div>
            <StatRow label="Pace"        a={resolvedA.pace}      b={resolvedB.pace}      />
            <StatRow label="Reb Margin"  a={resolvedA.rebMargin} b={resolvedB.rebMargin} />
            <StatRow label="Ast/TO"      a={resolvedA.astTov}    b={resolvedB.astTov}    />
            <StatRow label="3P%"         a={resolvedA.fg3Pct}    b={resolvedB.fg3Pct}    />
            <StatRow label="FT%"         a={resolvedA.ftPct}     b={resolvedB.ftPct}     />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-court-700 grid grid-cols-2 gap-4 text-center text-xs text-slate-500">
          <div>KenPom #{resolvedA.kenpom} · {resolvedA.finalFours} Final Fours</div>
          <div>KenPom #{resolvedB.kenpom} · {resolvedB.finalFours} Final Fours</div>
        </div>
      </div>
    </div>
  );
}
