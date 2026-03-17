import * as defaultData from '../data/teams';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { PALETTE, regionColor } from '../utils/colors';

// Win probability using pace-adjusted logistic model (same formula as Monte Carlo)
function r64WinProb(team, opponent) {
  const netTeam = team.offRtg - team.defRtg;
  const netOpp  = opponent.offRtg - opponent.defRtg;
  const avgPace = (team.pace + opponent.pace) / 2;
  const kEff    = 10 * (70 / avgPace);
  return 1 / (1 + Math.exp(-(netTeam - netOpp) / kEff));
}

// Pick the single most compelling reason this lower seed is dangerous
function upsetReason(team, opponent) {
  const net     = team.offRtg - team.defRtg;
  const oppNet  = opponent.offRtg - opponent.defRtg;
  const gap     = oppNet - net; // how much they're being outclassed on paper
  const paceDiff = opponent.pace - team.pace; // positive = they slow it down

  if (team.fg3Pct >= 37.2) return { label: '3P% shooter', detail: `${team.fg3Pct}% from three` };
  if (team.defRtg <= 97.5) return { label: 'Elite defense', detail: `${team.defRtg} def rtg` };
  if (paceDiff > 5)        return { label: 'Pace disruptor', detail: `${team.pace} vs ${opponent.pace} pace` };
  if (team.astTov >= 2.15) return { label: 'Ball control', detail: `${team.astTov} A/TO` };
  if (team.rebMargin >= 4) return { label: 'Rebounding edge', detail: `+${team.rebMargin} reb margin` };
  if (gap < 8)             return { label: 'Competitive net', detail: `+${net.toFixed(1)} vs +${oppNet.toFixed(1)}` };
  return { label: 'Efficiency upside', detail: `+${net.toFixed(1)} net rtg` };
}

function StatPill({ label, value, sub, delay = 0, accent = '#f97316' }) {
  return (
    <div
      className="bg-court-800 rounded-lg p-4 border border-court-600 relative overflow-hidden animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: accent, opacity: 0.6 }} />
      <div className="absolute top-0 left-0 w-px" style={{ height: '60%', background: `linear-gradient(to bottom, ${accent}40, transparent)` }} />
      <p className="text-xs text-slate-500 uppercase mb-2 font-sans" style={{ letterSpacing: '0.12em', fontSize: '10px' }}>{label}</p>
      <p className="font-sport text-white leading-none stat-reveal" style={{ fontSize: '1.75rem', animationDelay: `${delay + 100}ms` }}>{value}</p>
      {sub && <p className="text-xs mt-1.5 font-sans" style={{ color: accent, opacity: 0.7 }}>{sub}</p>}
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
      <span className="text-slate-500 text-xs font-mono">{team.record}</span>
      <span className={`text-sm font-mono font-medium ${parseFloat(netEff) > 20 ? 'text-emerald-400' : parseFloat(netEff) > 15 ? 'text-hoop-400' : 'text-slate-400'}`}>
        +{netEff}
      </span>
    </div>
  );
}

function UpsetAlert({ pick }) {
  const { team, opponent, modelProb, histRate, edge, reason, regionColor } = pick;
  const edgeColor = edge >= 8 ? '#f97316' : edge >= 4 ? '#eab308' : '#22c55e';
  const barWidth  = Math.min(100, modelProb);

  return (
    <div className="bg-court-800 rounded-lg p-3 hover:brightness-110 transition-all"
      style={{ border: `1px solid ${regionColor}25`, borderLeft: `3px solid ${regionColor}` }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono bg-court-700 border border-court-600 px-1.5 py-0.5 rounded text-slate-300 shrink-0">#{team.seed}</span>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{team.name}</p>
            <p className="text-xs"><span className="font-medium" style={{ color: regionColor }}>{team.region}</span><span className="text-slate-500"> · {team.conf}</span></p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-sport text-lg leading-none" style={{ color: edgeColor }}>{modelProb.toFixed(1)}%</p>
          <p className="text-slate-600 text-xs">win prob</p>
        </div>
      </div>

      {/* Win probability bar */}
      <div className="h-1.5 bg-court-700 rounded-full mb-2">
        <div className="h-full rounded-full transition-all" style={{ width: `${barWidth}%`, background: edgeColor }} />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">
          vs <span className="text-slate-300">#{opponent.seed} {opponent.name}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-slate-600">hist: {histRate.toFixed(0)}%</span>
          {edge > 0 && (
            <span className="font-mono font-medium" style={{ color: edgeColor }}>+{edge.toFixed(1)}pp edge</span>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="text-xs px-1.5 py-0.5 rounded bg-court-700 border border-court-600 text-slate-400">{reason.label}</span>
        <span className="text-xs text-slate-600">{reason.detail}</span>
      </div>
    </div>
  );
}

export default function Dashboard({ bracketData = defaultData }) {
  const { TEAMS, UPSET_HISTORY } = bracketData;
  const REGIONS = bracketData.REGIONS;
  const sorted = [...TEAMS].sort((a, b) => (b.offRtg - b.defRtg) - (a.offRtg - a.defRtg));
  const top10 = sorted.slice(0, 10);

  // Compute real upset probabilities for seeds 9–14
  // UPSET_HISTORY keys: lower number first, e.g. '5v12' = 5-seed wins 64.7%
  const upsetPicks = TEAMS
    .filter(t => t.seed >= 9 && t.seed <= 14 && !t.id.includes('-ff'))
    .map(t => {
      const oppSeed  = 17 - t.seed;
      const opponent = TEAMS.find(o => o.region === t.region && o.seed === oppSeed);
      if (!opponent) return null;
      const histKey  = `${Math.min(t.seed, oppSeed)}v${Math.max(t.seed, oppSeed)}`;
      const histFavoredRate = UPSET_HISTORY[histKey] ?? 0.5;
      // team is always the lower seed here (seed 9-14), so their win = upset
      const histRate = (1 - histFavoredRate) * 100;
      const modelProb = r64WinProb(t, opponent) * 100;
      const edge = modelProb - histRate;
      const reason = upsetReason(t, opponent);
      const regionColor = PALETTE[REGIONS.indexOf(t.region)] ?? PALETTE[0];
      return { team: t, opponent, modelProb, histRate, edge, reason, regionColor };
    })
    .filter(Boolean)
    .sort((a, b) => b.modelProb - a.modelProb)
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

  const regionStrength = REGIONS.map((r, regionIdx) => {
    const teams = TEAMS.filter(t => t.region === r);
    const avgNet = teams.reduce((s, t) => s + (t.offRtg - t.defRtg), 0) / teams.length;
    const avgKenpom = teams.reduce((s, t) => s + t.kenpom, 0) / teams.length;
    return { region: r, regionIdx, color: PALETTE[regionIdx], avgNet: avgNet.toFixed(1), avgKenpom: avgKenpom.toFixed(0) };
  }).sort((a, b) => b.avgNet - a.avgNet);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Summary pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatPill delay={0}   accent={PALETTE[1]} label="Teams in Field"   value="64"  sub="4 regions · 16 seeds" />
        <StatPill delay={60}  accent={PALETTE[0]} label="Top Net Rating"   value={`+${(sorted[0].offRtg - sorted[0].defRtg).toFixed(1)}`} sub={sorted[0].name} />
        <StatPill delay={120} accent={PALETTE[3]} label="Top Upset Threat" value={upsetPicks[0]?.team.name ?? '—'} sub={`#${upsetPicks[0]?.team.seed} · ${upsetPicks[0]?.modelProb.toFixed(0)}% win prob`} />
        <StatPill delay={180} accent={PALETTE[2]} label="Strongest Region" value={regionStrength[0].region} sub={`Avg net +${regionStrength[0].avgNet}`} />
      </div>

      {/* #1 Seeds Radar — full width so the chart actually fills the space */}
      <div className="bg-court-900 rounded-xl border border-court-700 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div>
            <h2 className="font-sport text-white text-lg uppercase mb-0.5" style={{ letterSpacing: '0.06em' }}>#1 Seeds Comparison</h2>
            <p className="text-xs text-slate-500">Offensive Rating · Defensive Rating · 3P% · Pace · Rebounding · Assist/TO</p>
          </div>
          <div className="flex gap-6 flex-wrap">
            {ones.map((t, i) => (
              <div key={t.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: SEED_COLORS[i] }} />
                <span className="text-sm text-slate-300 font-medium">{t.name}</span>
                <span className="text-xs text-slate-500 font-mono">#{t.seed} {t.region}</span>
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart data={radarData} outerRadius="38%">
            <PolarGrid stroke="#2e333d" />
            <PolarAngleAxis dataKey="stat" tick={{ fill: '#94a3b8', fontSize: 13 }} />
            {ones.map((t, i) => (
              <Radar key={t.id} name={t.name} dataKey={t.name}
                stroke={SEED_COLORS[i]} fill={SEED_COLORS[i]} fillOpacity={0.14} strokeWidth={2.5} />
            ))}
            <Tooltip
              contentStyle={{ background: '#1a1d24', border: '1px solid #2e333d', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#e2e8f0' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 10 by net efficiency */}
        <div className="bg-court-900 rounded-xl border border-court-700 p-4">
          <h2 className="font-sport text-white text-lg uppercase mb-0.5" style={{ letterSpacing: '0.06em' }}>Top 10 Teams</h2>
          <p className="text-xs text-slate-500 mb-4">by net efficiency</p>
          {top10.map((t, i) => <TeamRow key={t.id} team={t} rank={i + 1} />)}
        </div>

        {/* Upset alerts */}
        <div className="bg-court-900 rounded-xl border border-court-700 p-4">
          <h2 className="font-sport text-white text-lg uppercase mb-0.5" style={{ letterSpacing: '0.06em' }}>Upset Alerts</h2>
          <p className="text-xs text-slate-500 mb-3">Seeds 9–14 · model win prob vs historical base rate</p>
          <div className="space-y-2">
            {upsetPicks.map(pick => <UpsetAlert key={pick.team.id} pick={pick} />)}
          </div>
        </div>

        {/* Region strength */}
        <div className="bg-court-900 rounded-xl border border-court-700 p-4">
          <h2 className="font-sport text-white text-lg uppercase mb-0.5" style={{ letterSpacing: '0.06em' }}>Region Strength</h2>
          <p className="text-xs text-slate-500 mb-4">Average net efficiency across all 16 teams in each region</p>
          <div className="space-y-4">
            {regionStrength.map((r) => {
              const maxNet = parseFloat(regionStrength[0].avgNet);
              const pct = (parseFloat(r.avgNet) / maxNet) * 100;
              return (
                <div key={r.region}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-sport text-sm uppercase" style={{ color: r.color, letterSpacing: '0.06em' }}>{r.region}</span>
                    <span className="text-slate-400 text-xs">avg net <span className="font-bold font-mono" style={{ color: r.color }}>+{r.avgNet}</span></span>
                  </div>
                  <div className="h-2 bg-court-700 rounded-full">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: r.color }} />
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
