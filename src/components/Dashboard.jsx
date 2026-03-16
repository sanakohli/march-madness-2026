import { TEAMS, UPSET_HISTORY } from '../data/teams';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';

const RISK_COLOR = { Low: 'text-emerald-400', Medium: 'text-yellow-400', High: 'text-red-400' };
const RISK_BG    = { Low: 'bg-emerald-400/10 border-emerald-400/30', Medium: 'bg-yellow-400/10 border-yellow-400/30', High: 'bg-red-400/10 border-red-400/30' };

function StatPill({ label, value, sub }) {
  return (
    <div className="bg-court-800 rounded-lg p-4 border border-court-600">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function TeamRow({ team, rank }) {
  const netEff = (team.offRtg - team.defRtg).toFixed(1);
  return (
    <div className="flex items-center gap-3 py-2 border-b border-court-700 last:border-0">
      <span className="text-slate-600 text-sm w-5 text-right">{rank}</span>
      <span className="text-slate-500 text-xs w-5 text-center font-mono border border-court-600 rounded px-1">{team.seed}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{team.name}</p>
        <p className="text-slate-500 text-xs">{team.region} · {team.conf}</p>
      </div>
      <span className="text-slate-400 text-sm font-mono">{team.record}</span>
      <span className={`text-sm font-bold ${parseFloat(netEff) > 20 ? 'text-emerald-400' : parseFloat(netEff) > 15 ? 'text-hoop-400' : 'text-slate-400'}`}>
        +{netEff}
      </span>
    </div>
  );
}

function UpsetAlert({ team }) {
  const matchup = `${team.seed}v${17 - team.seed}`;
  const historicalRate = UPSET_HISTORY[matchup] || 0.5;
  const upsetPct = ((1 - historicalRate) * 100).toFixed(0);
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${RISK_BG[team.upsetRisk]}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded bg-court-700 text-slate-300`}>#{team.seed}</span>
          <p className="text-white text-sm font-medium truncate">{team.name}</p>
        </div>
        <p className="text-slate-500 text-xs mt-0.5">{team.region} · {team.conf} · {team.record}</p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${RISK_COLOR[team.upsetRisk]}`}>{upsetPct}% upset</p>
        <p className="text-slate-600 text-xs">hist. rate</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const sorted = [...TEAMS].sort((a, b) => (b.offRtg - b.defRtg) - (a.offRtg - a.defRtg));
  const top10 = sorted.slice(0, 10);
  const upsetPicks = TEAMS.filter(t => t.seed >= 10 && t.seed <= 13 && t.upsetRisk !== 'Low')
    .sort((a, b) => (b.offRtg - b.defRtg) - (a.offRtg - a.defRtg))
    .slice(0, 6);

  const ones = TEAMS.filter(t => t.seed === 1);

  // Radar data for top 4 #1 seeds
  const radarData = [
    { stat: 'Off Rtg', ...Object.fromEntries(ones.map(t => [t.name, t.offRtg])) },
    { stat: 'Def Rtg', ...Object.fromEntries(ones.map(t => [t.name, 150 - t.defRtg])) },
    { stat: '3P%',     ...Object.fromEntries(ones.map(t => [t.name, t.fg3Pct * 2.5])) },
    { stat: 'Pace',    ...Object.fromEntries(ones.map(t => [t.name, t.pace])) },
    { stat: 'Reb',     ...Object.fromEntries(ones.map(t => [t.name, t.rebMargin * 5 + 80])) },
    { stat: 'A/TO',    ...Object.fromEntries(ones.map(t => [t.name, t.astTov * 30])) },
  ];

  const SEED_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7'];

  const regionStrength = ['East', 'West', 'South', 'Midwest'].map(r => {
    const teams = TEAMS.filter(t => t.region === r);
    const avgNet = teams.reduce((s, t) => s + (t.offRtg - t.defRtg), 0) / teams.length;
    const avgKenpom = teams.reduce((s, t) => s + t.kenpom, 0) / teams.length;
    return { region: r, avgNet: avgNet.toFixed(1), avgKenpom: avgKenpom.toFixed(0) };
  }).sort((a, b) => b.avgNet - a.avgNet);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Summary pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatPill label="Teams" value="64" sub="4 regions · 16 seeds" />
        <StatPill label="Top Team Net Rtg" value={`+${(sorted[0].offRtg - sorted[0].defRtg).toFixed(1)}`} sub={sorted[0].name} />
        <StatPill label="Biggest Upset Threat" value={upsetPicks[0]?.name ?? '—'} sub={`Seed #${upsetPicks[0]?.seed}`} />
        <StatPill label="Strongest Region" value={regionStrength[0].region} sub={`Avg net +${regionStrength[0].avgNet}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 10 by net efficiency */}
        <div className="lg:col-span-1 bg-court-900 rounded-xl border border-court-700 p-4">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span>Top 10 Teams</span>
            <span className="text-xs text-slate-500 font-normal ml-auto">by net efficiency</span>
          </h2>
          {top10.map((t, i) => <TeamRow key={t.id} team={t} rank={i + 1} />)}
        </div>

        {/* #1 Seeds Radar */}
        <div className="lg:col-span-2 bg-court-900 rounded-xl border border-court-700 p-4">
          <h2 className="text-white font-semibold mb-1">#1 Seeds Comparison</h2>
          <p className="text-xs text-slate-500 mb-3">Offensive Rating · Defensive Rating · 3P% · Pace · Rebounding · Assist/TO</p>
          <div className="flex gap-4 mb-3 flex-wrap">
            {ones.map((t, i) => (
              <div key={t.id} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: SEED_COLORS[i] }} />
                <span className="text-xs text-slate-300">{t.name}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2e333d" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              {ones.map((t, i) => (
                <Radar key={t.id} name={t.name} dataKey={t.name}
                  stroke={SEED_COLORS[i]} fill={SEED_COLORS[i]} fillOpacity={0.12} strokeWidth={2} />
              ))}
              <Tooltip
                contentStyle={{ background: '#1a1d24', border: '1px solid #2e333d', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upset alerts */}
        <div className="bg-court-900 rounded-xl border border-court-700 p-4">
          <h2 className="text-white font-semibold mb-1">Upset Alerts</h2>
          <p className="text-xs text-slate-500 mb-3">Seeds 10–13 with strong metrics — historical upset rates</p>
          <div className="space-y-2">
            {upsetPicks.map(t => <UpsetAlert key={t.id} team={t} />)}
          </div>
        </div>

        {/* Region strength */}
        <div className="bg-court-900 rounded-xl border border-court-700 p-4">
          <h2 className="text-white font-semibold mb-1">Region Strength</h2>
          <p className="text-xs text-slate-500 mb-4">Average net efficiency across all 16 teams in each region</p>
          <div className="space-y-4">
            {regionStrength.map((r, i) => {
              const maxNet = parseFloat(regionStrength[0].avgNet);
              const pct = (parseFloat(r.avgNet) / maxNet) * 100;
              return (
                <div key={r.region}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white font-medium">{r.region}</span>
                    <span className="text-slate-400">avg net <span className="text-hoop-400 font-bold">+{r.avgNet}</span></span>
                  </div>
                  <div className="h-2 bg-court-700 rounded-full">
                    <div className="h-full bg-hoop-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">avg KenPom rank: #{r.avgKenpom}</p>
                </div>
              );
            })}
          </div>

          {/* Style breakdown */}
          <div className="mt-6 pt-4 border-t border-court-700">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Team Styles in Field</p>
            <div className="flex flex-wrap gap-2">
              {['Balanced', 'Defense-First', 'Pace & Space', '3-Point Heavy', 'Athletic', 'Grind-It-Out', 'Post-Dominant'].map(style => {
                const count = TEAMS.filter(t => t.style === style).length;
                return (
                  <div key={style} className="bg-court-800 border border-court-600 rounded px-2 py-1 text-xs">
                    <span className="text-slate-400">{style}</span>
                    <span className="text-hoop-400 font-bold ml-1.5">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
