# Interface Design System — March Madness 2026

Extracted from: `src/components/*.jsx`, `tailwind.config.js`

---

## Direction

Dark sports dashboard. Deep charcoal backgrounds, orange accent, borders-only depth. Dense data at every level — stats, seeds, ratings — so spacing is intentional and compact. Monospace values for numbers.

---

## Color Tokens

### Backgrounds (court scale)
| Token      | Hex       | Use                          |
|------------|-----------|------------------------------|
| court-950  | `#0a0c10` | Page background              |
| court-900  | `#111318` | Primary card background      |
| court-800  | `#1a1d24` | Secondary card / input bg    |
| court-700  | `#22262f` | Primary borders, dividers    |
| court-600  | `#2e333d` | Secondary borders, chart grid|

### Accent (hoop scale — basketball orange)
| Token     | Hex       | Use                              |
|-----------|-----------|----------------------------------|
| hoop-500  | `#f97316` | Active state, CTA, bars, fills   |
| hoop-400  | `#fb923c` | Highlighted values, accent text  |
| hoop-300  | `#fdba74` | Lighter highlight (sparingly)    |

### Text hierarchy (Tailwind slate)
| Class        | Use                              |
|--------------|----------------------------------|
| text-white   | Primary content, headings        |
| slate-300    | Secondary labels, legend text    |
| slate-400    | Body text, stat labels           |
| slate-500    | Muted text, metadata, sub-labels |
| slate-600    | Very muted, timestamps, hints    |

### Semantic colors
| Color      | Token / Hex   | Meaning                        |
|------------|---------------|-------------------------------|
| emerald-400| `#22c55e`     | Positive, good, success, low risk |
| yellow-400 | `#eab308`     | Medium risk, caution           |
| red-400    | `#f87171`     | High risk                      |
| orange-400 | `#f97316`     | High risk alt (shared w/ hoop) |
| blue-400   | `#60a5fa`     | Defensive rating, neutral stat |

---

## Spacing Scale

Base: 4px. Tailwind units map to 4px increments.

| Tailwind  | px  | Use                              |
|-----------|-----|----------------------------------|
| 0.5       | 2px | Sub-label gap, toggle padding    |
| 1         | 4px | Icon gap, tight label spacing    |
| 1.5       | 6px | Badge padding, small gaps        |
| 2         | 8px | Row gaps, icon-to-text           |
| 3         | 12px| Card padding (sm), row padding   |
| 4         | 16px| Card padding (primary), grid gap |
| 6         | 24px| Section gap, large grid gap      |

**Section rhythm:** `space-y-6` or `gap-6` between major sections, `space-y-2`/`gap-3` inside cards.

---

## Border Radius

| Class        | px   | Use                             |
|--------------|------|---------------------------------|
| `rounded`    | 4px  | Badges, tags, mini pills        |
| `rounded-lg` | 8px  | Secondary cards, buttons        |
| `rounded-xl` | 12px | Primary content cards           |
| `rounded-full`| —   | Progress bars, color dots       |

---

## Depth

**Borders only** — no box shadows in the component layer.

- Primary separation: `border border-court-700`
- Secondary separation: `border border-court-600`
- Active/selected highlight: `border-hoop-500/40` on `bg-hoop-500/10`
- Chart grid lines: `stroke="#2e333d"` (court-600)
- Tooltips: `background: #1a1d24, border: 1px solid #2e333d, borderRadius: 8px`

---

## Patterns

### Primary Card
```
bg-court-900 rounded-xl border border-court-700 p-4
```
Used for: Dashboard panels, region chart, simulation results, radar chart.

Card header pattern:
```jsx
<h2 className="text-white font-semibold mb-1">{title}</h2>
<p className="text-xs text-slate-500 mb-3">{subtitle}</p>
```

### Secondary Card / Team Card
```
bg-court-800 rounded-lg border border-court-600 p-3
hover:border-court-500 transition-colors
```
Used for: Team cards in Regions, upset alert rows.

### Stat Pill (summary KPI)
```
bg-court-800 rounded-lg p-4 border border-court-600
```
Content: `text-xs text-slate-500 uppercase tracking-wider` label + `text-2xl font-bold text-white` value + `text-xs text-slate-500` sub.

### Tag / Badge (style, seed number)
```
bg-court-700 border border-court-500 px-1.5 py-0.5 rounded text-xs text-slate-300
```
Colored style badges use: `bg-{color}-500/20 text-{color}-400`

### Inline Pill (style count, small)
```
bg-court-800 border border-court-600 rounded px-2 py-1 text-xs
```

---

## Buttons

### Nav / Tab Button (primary)
```
px-4 py-1.5 rounded text-sm font-medium transition-colors
Active:   bg-hoop-500 text-white
Inactive: text-slate-400 hover:text-white hover:bg-court-700
```

### Toggle Button (men/women, model)
```
px-3 py-1 rounded text-xs font-semibold transition-colors
Container: bg-court-800 border border-court-600 rounded-lg p-0.5
Active:   bg-hoop-500 text-white
Inactive: text-slate-400 hover:text-white
```

### Sort / Filter Button (small)
```
px-2 py-1 rounded text-xs transition-colors
Active:   bg-hoop-500/20 text-hoop-400 border border-hoop-500/40
Inactive: text-slate-500 hover:text-slate-300
```

### Region / Option Button (outlined inactive)
```
px-4 py-1.5 rounded text-sm font-medium transition-colors
Active:   bg-hoop-500 text-white
Inactive: bg-court-800 text-slate-400 hover:text-white border border-court-600
```

---

## Typography

| Role            | Classes                                          |
|-----------------|--------------------------------------------------|
| Section heading | `text-white font-semibold`                       |
| Large stat      | `text-2xl font-bold text-white`                  |
| Body            | `text-sm text-white` or `text-sm text-slate-400` |
| Sub-label       | `text-xs text-slate-500`                         |
| Category label  | `text-xs text-slate-500 uppercase tracking-wider`|
| Numeric value   | `font-mono text-white`                           |
| Accent value    | `text-hoop-400 font-bold`                        |

---

## Layout

- **Page container:** `max-w-7xl mx-auto px-4`
- **Page top padding:** `py-6`
- **Section spacing:** `space-y-6`
- **Two-column primary:** `grid grid-cols-1 lg:grid-cols-3 gap-6` (1 + 2 split)
- **Four-column KPI row:** `grid grid-cols-2 md:grid-cols-4 gap-4`
- **Team card grid:** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3`
- **Header height:** `h-14` (56px), sticky with `backdrop-blur`

---

## Progress / Data Bars

```jsx
<div className="h-2 bg-court-700 rounded-full">
  <div className="h-full bg-hoop-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
</div>
```

Thin variant (StatBar): `h-1.5`

---

## Chart Defaults

All charts use `<ResponsiveContainer width="100%">` via Recharts.

```js
// Shared chart style
grid stroke: "#2e333d"
axis tick: { fill: '#64748b', fontSize: 10/11 }
axisLine: false, tickLine: false
tooltip: { background: '#1a1d24', border: '1px solid #2e333d', borderRadius: 8, fontSize: 12 }
```

Bar radius: `[3,3,0,0]` (top corners only)
Bar fill scale by value: `>18 → #f97316`, `>12 → #fb923c`, `>6 → #64748b`, `else → #374151`
Radar fill opacity: `0.12`, stroke width: `2`
