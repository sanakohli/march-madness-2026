import { useState } from 'react';
import * as defaultData from '../data/teams';
import { runSimulation } from '../utils/monteCarlo';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const ROUND_LABELS = { r64: 'R64', r32: 'R32', s16: 'S16', e8: 'E8', f4: 'F4', champ: 'Champ' };
const CHAMP_COLORS = ['#f97316','#fb923c','#fdba74','#fcd34d','#86efac','#6ee7b7','#67e8f9','#93c5fd'];

function ControlPanel({ n, setN, scaleFactor, setScaleFactor, onRun, isRunning }) {
  return (
    <div className="bg-court-900 rounded-xl border border-court-700 p-4">
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Simulations</label>
          <div className="flex gap-2">
            {[1000, 5000, 10000, 50000].map(v => (
              <button key={v} onClick={() => setN(v)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                  n === v ? 'bg-hoop-500 text-white' : 'bg-court-800 border border-court-600 text-slate-400 hover:text-white'
                }`}>
                {v.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1">
            Upset Sensitivity — scale: {scaleFactor}
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600">chalk</span>
            <input type="range" min={4} max={20} step={1} value={scaleFactor}
              onChange={e => setScaleFactor(Number(e.target.value))}
              className="w-32 accent-hoop-500" />
            <span className="text-xs text-slate-600">chaos</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Lower = chalk picks dominate · Higher = more upsets
          </p>
        </div>
        <button onClick={onRun} disabled={isRunning}
          className="px-6 py-2 bg-hoop-500 hover:bg-hoop-400 disabled:opacity-50 disabled:cursor-wait text-white font-semibold rounded-lg text-sm transition-colors ml-auto">
          {isRunning ? 'Simulating…' : 'Run Simulation'}
        </button>
      </div>
    </div>
  );
}

function ExplanationPanel({ show, toggle }) {
  return (
    <div className="bg-court-900 rounded-xl border border-court-700">
      <button onClick={toggle} className="w-full flex items-center justify-between p-4 text-left">
        <span className="text-white font-semibold text-sm">How does this work?</span>
        <span className="text-slate-500 text-xs">{show ? '▲ collapse' : '▼ expand'}</span>
      </button>
      {show && (
        <div className="px-4 pb-4 space-y-4 text-xs text-slate-400 border-t border-court-700 pt-4">
          <p>
            <span className="text-white font-semibold">Monte Carlo simulation</span> runs the entire
            tournament thousands of times, each time randomly deciding every game using a win probability model.
            Aggregating results shows how often each team advances under realistic randomness.
          </p>

          <div>
            <p className="text-white font-semibold mb-1">Base win probability</p>
            <code className="text-hoop-400 bg-court-800 px-2 py-0.5 rounded inline-block">
              P(A beats B) = 1 / (1 + e<sup>−ΔNet / k_eff</sup>)
            </code>
            <p className="mt-1">
              ΔNet = Offensive Rating − Defensive Rating difference (pts per 100 possessions).
              The scale factor <code className="text-hoop-400">k</code> controls chalk vs. chaos.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-white font-semibold">Three adjustments layered on top:</p>

            <div className="bg-court-800 rounded-lg p-3 border border-court-700">
              <p className="text-slate-200 font-medium mb-0.5">1. Pace adjustment</p>
              <p>
                More possessions = more chances for the better team to assert dominance (law of large numbers).
                Fast-paced games lower the effective scale factor, making chalk more likely.
                Slow, grind-it-out games inflate it — either team can steal a close game with a couple of stops.
              </p>
              <code className="text-hoop-400 bg-court-900 px-2 py-0.5 rounded inline-block mt-1">
                k_eff = k × (70 / avgPace)
              </code>
            </div>

            <div className="bg-court-800 rounded-lg p-3 border border-court-700">
              <p className="text-slate-200 font-medium mb-0.5">2. Three-point variance</p>
              <p>
                Three-point shooting is the highest-variance action in basketball. Teams that live
                beyond the arc can get hot or go stone cold, shifting the effective margin by several
                points in either direction. The model adds Gaussian noise to ΔNet scaled by how
                far above baseline (33%) both teams shoot from three.
              </p>
              <code className="text-hoop-400 bg-court-900 px-2 py-0.5 rounded inline-block mt-1">
                noise ~ N(0, max(0, avg3P% − 33) × 0.35)
              </code>
            </div>

            <div className="bg-court-800 rounded-lg p-3 border border-court-700">
              <p className="text-slate-200 font-medium mb-0.5">3. Turnover consistency (A/TO)</p>
              <p>
                Teams with low assist-to-turnover ratios are more erratic — turnovers create fast
                breaks and momentum swings that net rating doesn't capture. Low A/TO teams get
                additional noise added to their matchup outcome.
              </p>
              <code className="text-hoop-400 bg-court-900 px-2 py-0.5 rounded inline-block mt-1">
                noise ~ N(0, max(0, (1.4 − avgA/TO) × 2.5))
              </code>
            </div>
          </div>

          <p>
            <span className="text-white font-semibold">Limitations:</span> The model still ignores
            injuries, coaching adjustments, single-game momentum, free-throw pressure, and matchup
            specifics. Treat it as a data-driven starting point, not a prediction.
          </p>
        </div>
      )}
    </div>
  );
}

function ChampionshipChart({ results }) {
  const top8 = Object.values(results)
    .sort((a, b) => b.probs.champ - a.probs.champ)
    .slice(0, 8);

  const data = top8.map(r => ({
    name: r.team.name.length > 14 ? r.team.name.slice(0, 13) + '…' : r.team.name,
    pct: parseFloat(r.probs.champ.toFixed(1)),
    seed: r.team.seed,
  }));

  return (
    <div className="bg-court-900 rounded-xl border border-court-700 p-4">
      <h2 className="text-white font-semibold mb-1">Championship Probability</h2>
      <p className="text-xs text-slate-500 mb-4">Top 8 teams — % of simulations won</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" barSize={18}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2e333d" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
            tickFormatter={v => `${v}%`} />
          <YAxis dataKey="name" type="category" width={110} tick={{ fill: '#cbd5e1', fontSize: 10 }}
            axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#1a1d24', border: '1px solid #2e333d', borderRadius: 8, fontSize: 12 }}
            formatter={(val) => [`${val}%`, 'Champ %']}
          />
          <Bar dataKey="pct" radius={[0,3,3,0]}>
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={CHAMP_COLORS[i] || '#475569'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function UpsetAlerts({ results, upsetHistory }) {
  // Seeds 9–16 that are outperforming their historical upset rate by >3pp in R64
  const alerts = Object.values(results)
    .filter(r => r.team.seed >= 9 && r.team.seed <= 14)
    .map(r => {
      const matchup = `${r.team.seed}v${17 - r.team.seed}`;
      const histRate = upsetHistory[matchup];
      const histUpsetPct = histRate != null ? (1 - histRate) * 100 : null;
      const simUpsetPct = r.probs.r64;
      const diff = histUpsetPct != null ? simUpsetPct - histUpsetPct : null;
      return { ...r, simUpsetPct, histUpsetPct, diff };
    })
    .filter(r => r.diff != null && r.diff > 3)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 5);

  if (!alerts.length) return null;

  return (
    <div className="bg-court-900 rounded-xl border border-hoop-500/30 p-4">
      <h2 className="text-white font-semibold mb-1">Model Upset Picks</h2>
      <p className="text-xs text-slate-500 mb-3">
        Teams the model gives a higher R64 win % than historical base rates suggest
      </p>
      <div className="space-y-2">
        {alerts.map(r => (
          <div key={r.team.id} className="flex items-center gap-3 bg-court-800 border border-court-600 rounded-lg p-3">
            <span className="text-xs font-mono bg-court-700 border border-court-600 px-1.5 py-0.5 rounded text-slate-300">
              #{r.team.seed}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{r.team.name}</p>
              <p className="text-slate-500 text-xs">{r.team.region} · {r.team.conf}</p>
            </div>
            <div className="text-right text-xs">
              <p className="text-hoop-400 font-bold">{r.simUpsetPct.toFixed(1)}% model</p>
              <p className="text-slate-500">{r.histUpsetPct.toFixed(0)}% hist. base</p>
            </div>
            <span className="text-emerald-400 font-bold text-sm">+{r.diff.toFixed(1)}pp</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsTable({ results, sortKey, setSortKey, sortDir, setSortDir }) {
  const rows = Object.values(results);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...rows].sort((a, b) => {
    let av, bv;
    if (sortKey === 'seed') { av = a.team.seed; bv = b.team.seed; }
    else if (sortKey === 'name') { av = a.team.name; bv = b.team.name; }
    else if (sortKey === 'net') { av = a.team.offRtg - a.team.defRtg; bv = b.team.offRtg - b.team.defRtg; }
    else { av = a.probs[sortKey]; bv = b.probs[sortKey]; }

    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const cols = [
    { key: 'seed', label: 'Seed' },
    { key: 'name', label: 'Team' },
    { key: 'net', label: 'Net Rtg' },
    { key: 'r64', label: 'R64' },
    { key: 'r32', label: 'R32' },
    { key: 's16', label: 'S16' },
    { key: 'e8', label: 'E8' },
    { key: 'f4', label: 'F4' },
    { key: 'champ', label: 'Champ' },
  ];

  const pctColor = (pct) => {
    if (pct >= 30) return 'text-emerald-400 font-bold';
    if (pct >= 15) return 'text-hoop-400 font-bold';
    if (pct >= 5) return 'text-yellow-400';
    if (pct >= 1) return 'text-slate-300';
    return 'text-slate-600';
  };

  return (
    <div className="bg-court-900 rounded-xl border border-court-700 overflow-hidden">
      <div className="p-4 border-b border-court-700">
        <h2 className="text-white font-semibold">Full Results Table</h2>
        <p className="text-xs text-slate-500 mt-0.5">% of simulations each team advanced to each round · click headers to sort</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-court-700">
              {cols.map(c => (
                <th key={c.key} onClick={() => handleSort(c.key)}
                  className="px-3 py-2 text-left text-slate-500 font-medium cursor-pointer hover:text-slate-300 select-none whitespace-nowrap">
                  {c.label}
                  {sortKey === c.key && <span className="ml-1 text-hoop-400">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => {
              const net = (r.team.offRtg - r.team.defRtg).toFixed(1);
              return (
                <tr key={r.team.id} className="border-b border-court-800 hover:bg-court-800/50 transition-colors">
                  <td className="px-3 py-2 text-slate-400 font-mono">{r.team.seed}</td>
                  <td className="px-3 py-2">
                    <p className="text-white font-medium">{r.team.name}</p>
                    <p className="text-slate-600">{r.team.region}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-400 font-mono">+{net}</td>
                  {['r64','r32','s16','e8','f4','champ'].map(rk => (
                    <td key={rk} className={`px-3 py-2 font-mono ${pctColor(r.probs[rk])}`}>
                      {r.probs[rk] >= 0.1 ? r.probs[rk].toFixed(1) + '%' : '<0.1%'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Simulate({ bracketData = defaultData }) {
  const { UPSET_HISTORY } = bracketData;
  const [n, setN] = useState(10000);
  const [scaleFactor, setScaleFactor] = useState(10);
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [sortKey, setSortKey] = useState('champ');
  const [sortDir, setSortDir] = useState('desc');

  const handleRun = () => {
    setIsRunning(true);
    // setTimeout(0) lets React re-render the "Simulating…" state before blocking
    setTimeout(() => {
      const sim = runSimulation(bracketData, n, scaleFactor);
      setResults(sim.results);
      setIsRunning(false);
    }, 0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <ControlPanel
        n={n} setN={setN}
        scaleFactor={scaleFactor} setScaleFactor={setScaleFactor}
        onRun={handleRun} isRunning={isRunning}
      />

      <ExplanationPanel show={showExplanation} toggle={() => setShowExplanation(s => !s)} />

      {!results && !isRunning && (
        <div className="text-center py-16 text-slate-600">
          <p className="text-4xl mb-3">🎲</p>
          <p className="text-sm">Configure parameters above and click <span className="text-hoop-400">Run Simulation</span> to start.</p>
        </div>
      )}

      {isRunning && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-sm">Running {n.toLocaleString()} simulations…</p>
        </div>
      )}

      {results && !isRunning && (
        <>
          <div className="flex items-center gap-3 text-xs text-slate-500 bg-court-900 border border-court-700 rounded-lg px-4 py-2">
            <span>Ran <span className="text-white font-mono">{n.toLocaleString()}</span> simulations</span>
            <span>·</span>
            <span>Scale factor <span className="text-white font-mono">{scaleFactor}</span></span>
            <button onClick={handleRun} className="ml-auto text-hoop-400 hover:text-hoop-300 transition-colors">
              Re-run ↺
            </button>
          </div>

          <ChampionshipChart results={results} />

          <UpsetAlerts results={results} upsetHistory={UPSET_HISTORY} />

          <ResultsTable
            results={results}
            sortKey={sortKey} setSortKey={setSortKey}
            sortDir={sortDir} setSortDir={setSortDir}
          />
        </>
      )}
    </div>
  );
}
