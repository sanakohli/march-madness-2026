import { useState } from 'react';
import * as defaultData from '../data/teams';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PALETTE, regionColor } from '../utils/colors';

const RISK_COLOR = { Low: '#22c55e', Medium: '#eab308', High: '#f97316' };
const STYLE_BADGE = {
  'Balanced':       'bg-blue-500/20 text-blue-400',
  'Defense-First':  'bg-emerald-500/20 text-emerald-400',
  'Pace & Space':   'bg-purple-500/20 text-purple-400',
  '3-Point Heavy':  'bg-yellow-500/20 text-yellow-400',
  'Athletic':       'bg-red-500/20 text-red-400',
  'Grind-It-Out':   'bg-slate-500/20 text-slate-400',
  'Post-Dominant':  'bg-orange-500/20 text-orange-400',
};

function TeamCard({ team, upsetHistory }) {
  const net = (team.offRtg - team.defRtg).toFixed(1);
  const matchup = `${team.seed}v${17 - team.seed}`;
  const historicalRate = upsetHistory[matchup];
  const upsetPct = historicalRate ? ((1 - historicalRate) * 100).toFixed(0) : null;

  return (
    <div className="bg-court-800 rounded-lg border border-court-600 p-3 hover:border-court-500 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-xs font-bold bg-court-700 border border-court-500 px-1.5 py-0.5 rounded text-slate-300 shrink-0">#{team.seed}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{team.name}</p>
          <p className="text-slate-500 text-xs">{team.conf} · {team.record}</p>
        </div>
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${STYLE_BADGE[team.style] || 'bg-court-700 text-slate-400'}`}>
          {team.style}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-2">
        <div>
          <p className="text-hoop-400 text-sm font-bold">{team.offRtg}</p>
          <p className="text-slate-600 text-xs">Off Rtg</p>
        </div>
        <div>
          <p className="text-blue-400 text-sm font-bold">{team.defRtg}</p>
          <p className="text-slate-600 text-xs">Def Rtg</p>
        </div>
        <div>
          <p className={`text-sm font-bold ${parseFloat(net) > 18 ? 'text-emerald-400' : parseFloat(net) > 12 ? 'text-hoop-400' : 'text-slate-400'}`}>+{net}</p>
          <p className="text-slate-600 text-xs">Net</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">KenPom <span className="text-slate-300">#{team.kenpom}</span></span>
        {upsetPct && (
          <span style={{ color: RISK_COLOR[team.upsetRisk] }}>
            {upsetPct}% upset hist.
          </span>
        )}
      </div>

      {/* Matchup info for early rounds */}
      <div className="mt-2 pt-2 border-t border-court-700 flex justify-between text-xs text-slate-600">
        <span>Pace: {team.pace}</span>
        <span>3P%: {team.fg3Pct}</span>
        <span>A/TO: {team.astTov}</span>
      </div>
    </div>
  );
}

export default function Regions({ bracketData = defaultData }) {
  const { getTeamsByRegion, REGIONS, UPSET_HISTORY } = bracketData;
  const [activeRegion, setActiveRegion] = useState(REGIONS[0]);
  const [sortBy, setSortBy] = useState('seed');
  const activeColor = PALETTE[REGIONS.indexOf(activeRegion)] || PALETTE[0];

  const teams = getTeamsByRegion(activeRegion);
  const sorted = [...teams].sort((a, b) => {
    if (sortBy === 'seed') return a.seed - b.seed;
    if (sortBy === 'net') return (b.offRtg - b.defRtg) - (a.offRtg - a.defRtg);
    if (sortBy === 'offense') return b.offRtg - a.offRtg;
    if (sortBy === 'defense') return a.defRtg - b.defRtg;
    if (sortBy === 'kenpom') return a.kenpom - b.kenpom;
    return 0;
  });

  const barData = [...teams].sort((a,b) => a.seed - b.seed).map(t => ({
    name: t.seed <= 9 ? t.name : `#${t.seed}`,
    'Off Rtg': t.offRtg,
    'Def Rtg': t.defRtg,
    net: parseFloat((t.offRtg - t.defRtg).toFixed(1)),
    seed: t.seed,
  }));

  const regionStats = REGIONS.map(r => {
    const ts = getTeamsByRegion(r);
    return {
      region: r,
      avgNet: (ts.reduce((s, t) => s + (t.offRtg - t.defRtg), 0) / ts.length).toFixed(1),
      top2Net: ((ts[0].offRtg - ts[0].defRtg) + (ts[1].offRtg - ts[1].defRtg)).toFixed(1),
      deepTeams: ts.filter(t => (t.offRtg - t.defRtg) > 12).length,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Region switcher + sort */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {REGIONS.map((r, rIdx) => {
            const color = PALETTE[rIdx];
            const isActive = activeRegion === r;
            return (
              <button key={r} onClick={() => setActiveRegion(r)}
                className={`px-4 py-1.5 rounded font-sport uppercase text-xs transition-all ${
                  isActive ? 'text-white' : 'bg-court-800 text-slate-400 hover:text-white border border-court-600'
                }`}
                style={isActive ? {
                  background: `${color}22`,
                  border: `1px solid ${color}60`,
                  color,
                  letterSpacing: '0.08em',
                } : { letterSpacing: '0.08em' }}>
                {r}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">Sort:</span>
          {[['seed','Seed'],['net','Net Rtg'],['offense','Off Rtg'],['defense','Def Rtg'],['kenpom','KenPom']].map(([val,label]) => (
            <button key={val} onClick={() => setSortBy(val)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                sortBy === val ? 'bg-hoop-500/20 text-hoop-400 border border-hoop-500/40' : 'text-slate-500 hover:text-slate-300'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Net efficiency bar chart */}
      <div className="bg-court-900 rounded-xl border border-court-700 p-4">
        <h2 className="font-sport text-white text-lg uppercase mb-0.5" style={{ letterSpacing: '0.06em' }}>{activeRegion} — Net Efficiency by Seed</h2>
        <p className="text-xs text-slate-500 mb-4">Off Rating minus Def Rating per 100 possessions</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e333d" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1a1d24', border: '1px solid #2e333d', borderRadius: 8, fontSize: 12 }}
              formatter={(val) => [`+${val}`, 'Net Rtg']}
            />
            <Bar dataKey="net" radius={[3,3,0,0]}>
              {barData.map((entry) => {
                const alpha = entry.net > 18 ? 'ff' : entry.net > 12 ? 'cc' : entry.net > 6 ? '66' : '33';
                return <Cell key={entry.name} fill={`${activeColor}${alpha}`} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Team cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sorted.map(t => <TeamCard key={t.id} team={t} upsetHistory={UPSET_HISTORY} />)}
      </div>

      {/* Cross-region comparison */}
      <div className="bg-court-900 rounded-xl border border-court-700 p-4">
        <h2 className="font-sport text-white text-lg uppercase mb-4" style={{ letterSpacing: '0.06em' }}>Cross-Region Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {regionStats.map((r, i) => {
            const rColor = PALETTE[REGIONS.indexOf(r.region)] || PALETTE[0];
            const isActive = activeRegion === r.region;
            return (
            <div key={r.region} className="rounded-lg p-3 border bg-court-800"
              style={{ borderColor: isActive ? `${rColor}50` : '#2e333d', background: isActive ? `${rColor}10` : '' }}>
              <p className="font-sport text-sm uppercase mb-2" style={{ color: rColor, letterSpacing: '0.06em' }}>{r.region}</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Avg Net</span><span className="text-white font-mono">+{r.avgNet}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">1+2 seeds net</span><span className="text-white font-mono">+{r.top2Net}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Deep teams</span><span className="text-white font-mono">{r.deepTeams}/16</span></div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
