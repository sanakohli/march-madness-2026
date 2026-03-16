import { useState } from 'react';
import { TEAMS } from '../data/teams';
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

export default function Compare() {
  const [teamA, setTeamA] = useState(TEAMS.find(t => t.id === 'duke'));
  const [teamB, setTeamB] = useState(TEAMS.find(t => t.id === 'michigan'));

  const radarData = [
    { stat: 'Off Rtg',  [teamA.name]: teamA.offRtg,                      [teamB.name]: teamB.offRtg },
    { stat: 'Def',      [teamA.name]: 150 - teamA.defRtg,                 [teamB.name]: 150 - teamB.defRtg },
    { stat: '3P%',      [teamA.name]: teamA.fg3Pct * 2.5,                 [teamB.name]: teamB.fg3Pct * 2.5 },
    { stat: 'Pace',     [teamA.name]: teamA.pace,                         [teamB.name]: teamB.pace },
    { stat: 'Rebounds', [teamA.name]: teamA.rebMargin * 5 + 80,           [teamB.name]: teamB.rebMargin * 5 + 80 },
    { stat: 'Ast/TO',   [teamA.name]: teamA.astTov * 30,                  [teamB.name]: teamB.astTov * 30 },
    { stat: 'FT%',      [teamA.name]: teamA.ftPct,                        [teamB.name]: teamB.ftPct },
  ];

  const barData = [
    { name: 'PPG',      [teamA.name]: teamA.ppg,     [teamB.name]: teamB.ppg },
    { name: 'Opp PPG',  [teamA.name]: teamA.oppPpg,  [teamB.name]: teamB.oppPpg },
    { name: 'Off Rtg',  [teamA.name]: teamA.offRtg,  [teamB.name]: teamB.offRtg },
    { name: 'Def Rtg',  [teamA.name]: teamA.defRtg,  [teamB.name]: teamB.defRtg },
  ];

  const netA = (teamA.offRtg - teamA.defRtg).toFixed(1);
  const netB = (teamB.offRtg - teamB.defRtg).toFixed(1);
  const aFavored = parseFloat(netA) > parseFloat(netB);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Team selectors */}
      <div className="grid grid-cols-2 gap-4">
        {[{ team: teamA, setter: setTeamA, color: 'hoop' }, { team: teamB, setter: setTeamB, color: 'emerald' }].map(({ team, setter, color }, i) => (
          <div key={i} className="bg-court-900 rounded-xl border border-court-700 p-4">
            <label className="text-xs text-slate-500 uppercase tracking-wider block mb-2">Team {i === 0 ? 'A' : 'B'}</label>
            <select
              value={team.id}
              onChange={e => setter(TEAMS.find(t => t.id === e.target.value))}
              className="w-full bg-court-800 border border-court-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-hoop-500"
            >
              {['East','West','South','Midwest'].map(r => (
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
          {aFavored ? teamA.name : teamB.name}
        </p>
        <p className="text-slate-500 text-sm mt-1">
          Net efficiency advantage: <span className="text-white font-mono">+{Math.abs(parseFloat(netA) - parseFloat(netB)).toFixed(1)}</span> pts/100 possessions
        </p>
        <p className="text-xs text-slate-600 mt-2">Style matchup: <span className="text-slate-400">{teamA.style}</span> vs <span className="text-slate-400">{teamB.style}</span></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar */}
        <div className="bg-court-900 rounded-xl border border-court-700 p-4">
          <h2 className="text-white font-semibold mb-4">Skill Comparison (Radar)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2e333d" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Radar name={teamA.name} dataKey={teamA.name} stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={2} />
              <Radar name={teamB.name} dataKey={teamB.name} stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
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
              <Bar dataKey={teamA.name} fill="#f97316" radius={[3,3,0,0]} />
              <Bar dataKey={teamB.name} fill="#22c55e" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stat-by-stat table */}
      <div className="bg-court-900 rounded-xl border border-court-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-hoop-400 font-bold flex-1 text-center">{teamA.name}</span>
          <span className="text-slate-600 text-xs w-32 text-center">STAT</span>
          <span className="text-emerald-400 font-bold flex-1 text-center">{teamB.name}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <StatRow label="Off Rating"  a={teamA.offRtg}    b={teamB.offRtg}    />
            <StatRow label="Def Rating"  a={teamA.defRtg}    b={teamB.defRtg}    higherIsBetter={false} />
            <StatRow label="Net Rtg"     a={netA}            b={netB}            />
            <StatRow label="PPG"         a={teamA.ppg}       b={teamB.ppg}       />
            <StatRow label="Opp PPG"     a={teamA.oppPpg}    b={teamB.oppPpg}    higherIsBetter={false} />
          </div>
          <div>
            <StatRow label="Pace"        a={teamA.pace}      b={teamB.pace}      />
            <StatRow label="Reb Margin"  a={teamA.rebMargin} b={teamB.rebMargin} />
            <StatRow label="Ast/TO"      a={teamA.astTov}    b={teamB.astTov}    />
            <StatRow label="3P%"         a={teamA.fg3Pct}    b={teamB.fg3Pct}    />
            <StatRow label="FT%"         a={teamA.ftPct}     b={teamB.ftPct}     />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-court-700 grid grid-cols-2 gap-4 text-center text-xs text-slate-500">
          <div>KenPom #{teamA.kenpom} · {teamA.finalFours} Final Fours</div>
          <div>KenPom #{teamB.kenpom} · {teamB.finalFours} Final Fours</div>
        </div>
      </div>
    </div>
  );
}
