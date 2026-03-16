# March Madness 2026: Bracket Dashboard

An interactive data dashboard for the 2026 NCAA Tournament, built to help make smarter bracket picks using efficiency ratings, head-to-head comparisons, and Monte Carlo simulation.

Live: **[march-madness-2026-one.vercel.app](https://march-madness-2026-one.vercel.app)**
Thread: **[x.com/sanakohli29/status/2033617651700826402](https://x.com/sanakohli29/status/2033617651700826402)**

---

## Features

### Dashboard
Overview of the full field. Top 10 teams by net efficiency, #1 seed radar comparison, upset alerts for seeds 10-13 with strong metrics, and region strength rankings.

### My Bracket
Interactive bracket picker for all four regions. Pick winners round by round through to the Final Four and Championship. Automatically surfaces Elite 8 and Sweet 16 picks in the summary panel.

### Compare
Head-to-head tool for any two teams in the field. Radar chart across six dimensions (offensive rating, defensive rating, 3P%, pace, rebounding, assist/TO), side-by-side bar chart for key scoring stats, and a full stat-by-stat breakdown table. Shows net efficiency edge and style matchup.

### Regions
Deep dive into each bracket region. Sort teams by seed, net rating, offensive rating, defensive rating, or KenPom rank. Net efficiency bar chart by seed, team cards with upset history rates, and cross-region comparison panel.

### Simulate
Monte Carlo bracket simulator. See the simulation section below.

Both the Men's and Women's 2026 brackets are supported via the toggle in the header.

---

## Monte Carlo Simulation

The Simulate tab runs the entire tournament thousands of times and aggregates results to show each team's probability of advancing to each round.

### Base Model

Win probability uses a logistic function on net efficiency ratings:

```
P(A beats B) = 1 / (1 + e^(−ΔNet / k))
```

Where `ΔNet = offRtg_A − defRtg_A − (offRtg_B − defRtg_B)` and `k` is the scale factor (controlled by the upset sensitivity slider). A lower `k` produces chalk-heavy results; a higher `k` flattens win probabilities and introduces more upsets.

### Adjustments

Three adjustments are layered on top of the base logistic model to better reflect what actually drives variance in tournament games:

#### 1. Pace Adjustment

More possessions per game = more chances for the better team to assert dominance (law of large numbers). Fast-paced matchups lower the effective scale factor, making chalk more likely. Slow, grind-it-out games inflate it. Either team can steal a close game with a few stops.

```
k_eff = k × (70 / avgPace)
```

A matchup between two 75-pace teams plays with `k_eff = 0.93k`. Two 65-pace teams play at `k_eff = 1.08k`, which is meaningfully more variance.

#### 2. Three-Point Variance

Three-point shooting is the highest-variance action in basketball. Teams that live beyond the arc can get hot or go cold, shifting the effective margin by several points in either direction. The model adds Gaussian noise to `ΔNet` scaled by how far above baseline (33%) both teams shoot from three:

```
noise ~ N(0, max(0, avg3P% − 33) × 0.35)
```

A matchup between two teams averaging 38% from three adds ~1.75 pts of standard deviation. Two 42% shooting teams add ~3.15 pts, which is enough to flip close matchups in either direction. This is the most common real-world explanation for March Madness upsets.

#### 3. Turnover Consistency (A/TO)

Teams with low assist-to-turnover ratios are more erratic. Turnovers create fast breaks and momentum swings that net rating doesn't fully capture. Low A/TO teams get additional Gaussian noise added to their matchup outcome:

```
noise ~ N(0, max(0, (1.4 − avgA/TO) × 2.5))
```

Teams at A/TO ≥ 1.4 are unaffected. A turnover-prone team at A/TO = 1.0 adds ~1 pt of standard deviation per game.

### Gaussian Noise

Both variance terms use the Box-Muller transform to sample from a normal distribution:

```
noise = std × √(−2 ln u₁) × cos(2π u₂),   u₁, u₂ ~ Uniform(0, 1)
```

### Output

Each simulation run returns per-team win probabilities for all six rounds: R64, R32, Sweet 16, Elite 8, Final Four, and Championship. The results table is sortable by any round. The upset picks panel flags seeds 9–14 where the model gives a higher R64 win probability than historical base rates.

### Limitations

The model uses team-level season averages. It does not account for injuries, single-game momentum, coaching adjustments, free-throw pressure in close games, or specific matchup styles. Treat it as a data-driven baseline, not a prediction.

---

## Data

- Seeds, records, and bracket placement from the official 2026 NCAA Selection Sunday announcement (March 15, 2026)
- Efficiency ratings (offensive rating, defensive rating, net rating) sourced from KenPom
- Historical seed matchup win rates from tournament records (R64 only)
- Men's and Women's brackets both included

---

## Stack

- **React + Vite 5**
- **Tailwind CSS v3**
- **Recharts** (radar charts, bar charts, horizontal bar charts)
- **Vercel** (deployment)

---

## Run Locally

```bash
git clone https://github.com/sanakohli/march-madness-2026
cd march-madness-2026
npm install
npm run dev
```
