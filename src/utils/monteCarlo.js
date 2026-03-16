// R64 bracket seed pairs (index into sorted-by-seed array)
// 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
const R64_PAIRS = [[0,15],[7,8],[4,11],[3,12],[5,10],[2,13],[6,9],[1,14]];

// Box-Muller: samples from N(0, std)
function gaussianNoise(std) {
  if (std <= 0) return 0;
  const u1 = Math.random();
  const u2 = Math.random();
  return std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Win probability with three adjustments on top of the base logistic model:
 *
 * 1. Pace adjustment — more possessions shrinks variance (lower effective scale = chalk);
 *    fewer possessions inflates variance (higher effective scale = upsets).
 *    effectiveScale = scaleFactor * (BASELINE_PACE / avgPace)
 *
 * 2. 3P% variance — three-point-heavy matchups are streakier. Adds Gaussian noise
 *    to the net-rating difference scaled by how far above baseline both teams shoot.
 *
 * 3. A/TO consistency — turnover-prone teams (low A/TO) are more volatile. Adds
 *    Gaussian noise inversely proportional to the average A/TO ratio.
 */
const BASELINE_PACE = 70; // possessions/game reference point

function winProb(teamA, teamB, scaleFactor) {
  const netA = teamA.offRtg - teamA.defRtg;
  const netB = teamB.offRtg - teamB.defRtg;
  let netDiff = netA - netB;

  // 1. Pace adjustment
  const avgPace = (teamA.pace + teamB.pace) / 2;
  const effectiveScale = scaleFactor * (BASELINE_PACE / avgPace);

  // 2. 3P% variance (fg3Pct stored as percentage, e.g. 36.5)
  const avg3Pct = (teamA.fg3Pct + teamB.fg3Pct) / 2;
  netDiff += gaussianNoise(Math.max(0, avg3Pct - 33) * 0.35);

  // 3. A/TO consistency — low ratios (< 1.4) add noise
  const avgAstTov = (teamA.astTov + teamB.astTov) / 2;
  netDiff += gaussianNoise(Math.max(0, (1.4 - avgAstTov) * 2.5));

  return 1 / (1 + Math.exp(-netDiff / effectiveScale));
}

function pick(teamA, teamB, scaleFactor) {
  return Math.random() < winProb(teamA, teamB, scaleFactor) ? teamA : teamB;
}

function simulateRegion(teams16, counts, scaleFactor) {
  let round = R64_PAIRS.map(([a, b]) => [teams16[a], teams16[b]]);
  const roundKeys = ['r64', 'r32', 's16', 'e8'];

  for (let rIdx = 0; rIdx < 4; rIdx++) {
    const nextRound = [];
    for (const [teamA, teamB] of round) {
      const winner = pick(teamA, teamB, scaleFactor);
      counts[winner.id][roundKeys[rIdx]]++;
      nextRound.push(winner);
    }
    round = [];
    for (let i = 0; i < nextRound.length; i += 2) {
      round.push([nextRound[i], nextRound[i + 1]]);
    }
  }

  return round[0][0];
}

function simulateFinalFour(regionChamps, counts, scaleFactor) {
  const semi1 = pick(regionChamps[0], regionChamps[1], scaleFactor);
  const semi2 = pick(regionChamps[2], regionChamps[3], scaleFactor);
  counts[semi1.id].f4++;
  counts[semi2.id].f4++;

  const champion = pick(semi1, semi2, scaleFactor);
  counts[champion.id].champ++;
  return champion;
}

export function runSimulation(bracketData, n = 10000, scaleFactor = 10) {
  const { TEAMS, REGIONS, getTeamsByRegion } = bracketData;

  const counts = {};
  for (const t of TEAMS) {
    counts[t.id] = { r64: 0, r32: 0, s16: 0, e8: 0, f4: 0, champ: 0 };
  }

  const regionTeams = {};
  for (const r of REGIONS) {
    regionTeams[r] = getTeamsByRegion(r);
  }

  for (let i = 0; i < n; i++) {
    const regionChamps = REGIONS.map(r => simulateRegion(regionTeams[r], counts, scaleFactor));
    simulateFinalFour(regionChamps, counts, scaleFactor);
  }

  const results = {};
  for (const t of TEAMS) {
    const c = counts[t.id];
    results[t.id] = {
      team: t,
      counts: c,
      probs: {
        r64:   (c.r64   / n) * 100,
        r32:   (c.r32   / n) * 100,
        s16:   (c.s16   / n) * 100,
        e8:    (c.e8    / n) * 100,
        f4:    (c.f4    / n) * 100,
        champ: (c.champ / n) * 100,
      },
    };
  }

  return { n, scaleFactor, results };
}
