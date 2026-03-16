import { useState } from 'react';
import * as defaultData from '../data/teams';
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

  const netA = (resolvedA.offRtg - resolvedA.defRtg).toFixed(1);
  const netB = (resolvedB.offRtg - resolvedB.defRtg).toFixed(1);
  const aFavored = parseFloat(netA) > parseFloat(netB);

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

      {/* Verdict */}
      <div className={`rounded-xl border p-4 text-center ${aFavored ? 'bg-hoop-500/10 border-hoop-500/40' : 'bg-emerald-500/10 border-emerald-500/40'}`}>
        <p className="text-slate-400 text-sm">Based on net efficiency, the edge goes to</p>
        <p className={`text-2xl font-bold mt-1 ${aFavored ? 'text-hoop-400' : 'text-emerald-400'}`}>
          {aFavored ? resolvedA.name : resolvedB.name}
        </p>
        <p className="text-slate-500 text-sm mt-1">
          Net efficiency advantage: <span className="text-white font-mono">+{Math.abs(parseFloat(netA) - parseFloat(netB)).toFixed(1)}</span> pts/100 possessions
        </p>
        <p className="text-xs text-slate-600 mt-2">Style matchup: <span className="text-slate-400">{resolvedA.style}</span> vs <span className="text-slate-400">{resolvedB.style}</span></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar */}
        <div className="bg-court-900 rounded-xl border border-court-700 p-4">
          <h2 className="text-white font-semibold mb-4">Skill Comparison (Radar)</h2>
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
          <h2 className="text-white font-semibold mb-4">Key Stats Bar Chart</h2>
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
          <span className="text-hoop-400 font-bold flex-1 text-center">{resolvedA.name}</span>
          <span className="text-slate-600 text-xs w-32 text-center">STAT</span>
          <span className="text-emerald-400 font-bold flex-1 text-center">{resolvedB.name}</span>
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
