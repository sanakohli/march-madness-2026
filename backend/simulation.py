"""
Fully-vectorized bracket simulation using Bayesian posterior samples.

Key idea
--------
Instead of running N independent simulations one at a time (Python loop over N),
we run all N simulations in parallel using NumPy advanced indexing.

For each game in the bracket, both teams' strengths are sampled from their
posteriors, the three variance adjustments (pace, 3P%, A/TO) are applied, and
N game outcomes are determined simultaneously.

Bracket slots for later rounds may differ across simulations (simulation 42 might
have Michigan vs Arizona while simulation 43 has Michigan vs Purdue depending on
who won earlier). We handle this with numpy fancy indexing:
    net_a[s] = strengths[a_slot[s], s]    (different team per sim)
which resolves to a single vectorized gather operation.
"""

import numpy as np
from numpy.typing import NDArray

# R64 bracket seed-index pairs (index into sorted-by-seed list)
# 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
R64_PAIRS: list[tuple[int, int]] = [
    (0, 15), (7, 8), (4, 11), (3, 12),
    (5, 10), (2, 13), (6, 9), (1, 14),
]

BASELINE_PACE = 70.0


def _game_batch(
    a_slots: NDArray,      # (n,) team absolute-indices for side A
    b_slots: NDArray,      # (n,) team absolute-indices for side B
    strengths: NDArray,    # (n_teams, n) pre-sampled posterior strengths
    team_pace: NDArray,    # (n_teams,)
    team_fg3: NDArray,     # (n_teams,)
    team_asto: NDArray,    # (n_teams,)
    n: int,
    scale_factor: float,
) -> NDArray:
    """
    Simulate n games simultaneously. Returns boolean (n,) — True means A wins.
    """
    sim_idx = np.arange(n)

    # Sample team strengths from posterior (vectorized gather)
    net_a = strengths[a_slots, sim_idx]
    net_b = strengths[b_slots, sim_idx]
    net_diff = net_a - net_b

    # 1. Pace adjustment: k_eff = k × (70 / avg_pace)
    avg_pace = (team_pace[a_slots] + team_pace[b_slots]) / 2.0
    effective_scale = scale_factor * (BASELINE_PACE / avg_pace)

    # 2. Three-point variance
    avg_fg3 = (team_fg3[a_slots] + team_fg3[b_slots]) / 2.0
    three_std = np.maximum(0.0, (avg_fg3 - 33.0) * 0.35)
    net_diff += np.random.standard_normal(n) * three_std

    # 3. A/TO consistency
    avg_asto = (team_asto[a_slots] + team_asto[b_slots]) / 2.0
    to_std = np.maximum(0.0, (1.4 - avg_asto) * 2.5)
    net_diff += np.random.standard_normal(n) * to_std

    p_a = 1.0 / (1.0 + np.exp(np.clip(-net_diff / effective_scale, -500.0, 500.0)))
    return np.random.random(n) < p_a


def simulate_bracket(
    all_teams: list[dict],
    teams_by_region: dict[str, list[dict]],
    posteriors: dict[str, tuple[float, float]],
    n: int = 10_000,
    scale_factor: float = 10.0,
) -> dict:
    """
    Run n vectorized bracket simulations.

    Returns
    -------
    dict with:
      - 'probs': {team_id: {r64, r32, s16, e8, f4, champ}} as percentages
      - 'strengths': {team_id: {mean, std}} posterior parameters
    """
    n_teams = len(all_teams)
    team_idx_map = {t["id"]: i for i, t in enumerate(all_teams)}

    # Team stat arrays for vectorized lookup
    team_pace = np.array([t["pace"] for t in all_teams])
    team_fg3 = np.array([t["fg3Pct"] for t in all_teams])
    team_asto = np.array([t["astTov"] for t in all_teams])

    # Pre-sample strengths for all teams across all n simulations
    mus = np.array([posteriors[t["id"]][0] for t in all_teams])
    sigmas = np.array([posteriors[t["id"]][1] for t in all_teams])
    strengths = np.random.normal(mus[:, None], sigmas[:, None], (n_teams, n))

    # Advancement counts: shape (n_teams, 6)  [r64,r32,s16,e8,f4,champ]
    counts = np.zeros((n_teams, 6), dtype=np.int64)

    region_list = list(teams_by_region.keys())
    region_champs: list[NDArray] = []  # list of (n,) arrays of absolute team indices

    for region in region_list:
        teams16 = teams_by_region[region]
        abs_idx = np.array([team_idx_map[t["id"]] for t in teams16])  # (16,)

        # R64 — 8 fixed matchups ------------------------------------------------
        r64_winners = np.empty((8, n), dtype=int)
        for m, (ai, bi) in enumerate(R64_PAIRS):
            a_slots = np.full(n, abs_idx[ai])
            b_slots = np.full(n, abs_idx[bi])
            wins_a = _game_batch(a_slots, b_slots, strengths, team_pace, team_fg3, team_asto, n, scale_factor)
            r64_winners[m] = np.where(wins_a, abs_idx[ai], abs_idx[bi])
            np.add.at(counts[:, 0], r64_winners[m], 1)

        # R32 — 4 matchups ------------------------------------------------------
        r32_winners = np.empty((4, n), dtype=int)
        for m in range(4):
            wins_a = _game_batch(r64_winners[2*m], r64_winners[2*m+1], strengths, team_pace, team_fg3, team_asto, n, scale_factor)
            r32_winners[m] = np.where(wins_a, r64_winners[2*m], r64_winners[2*m+1])
            np.add.at(counts[:, 1], r32_winners[m], 1)

        # S16 — 2 matchups ------------------------------------------------------
        s16_winners = np.empty((2, n), dtype=int)
        for m in range(2):
            wins_a = _game_batch(r32_winners[2*m], r32_winners[2*m+1], strengths, team_pace, team_fg3, team_asto, n, scale_factor)
            s16_winners[m] = np.where(wins_a, r32_winners[2*m], r32_winners[2*m+1])
            np.add.at(counts[:, 2], s16_winners[m], 1)

        # E8 — 1 matchup --------------------------------------------------------
        wins_a = _game_batch(s16_winners[0], s16_winners[1], strengths, team_pace, team_fg3, team_asto, n, scale_factor)
        e8_winner = np.where(wins_a, s16_winners[0], s16_winners[1])
        np.add.at(counts[:, 3], e8_winner, 1)
        region_champs.append(e8_winner)

    # Final Four ----------------------------------------------------------------
    wins_sf1 = _game_batch(region_champs[0], region_champs[1], strengths, team_pace, team_fg3, team_asto, n, scale_factor)
    sf1 = np.where(wins_sf1, region_champs[0], region_champs[1])
    np.add.at(counts[:, 4], sf1, 1)

    wins_sf2 = _game_batch(region_champs[2], region_champs[3], strengths, team_pace, team_fg3, team_asto, n, scale_factor)
    sf2 = np.where(wins_sf2, region_champs[2], region_champs[3])
    np.add.at(counts[:, 4], sf2, 1)

    # Championship --------------------------------------------------------------
    wins_champ = _game_batch(sf1, sf2, strengths, team_pace, team_fg3, team_asto, n, scale_factor)
    champs = np.where(wins_champ, sf1, sf2)
    np.add.at(counts[:, 5], champs, 1)

    # Build output
    round_keys = ["r64", "r32", "s16", "e8", "f4", "champ"]
    probs = {}
    for i, t in enumerate(all_teams):
        probs[t["id"]] = {k: round(float(counts[i, j]) / n * 100, 2) for j, k in enumerate(round_keys)}

    return {
        "probs": probs,
        "strengths": {t["id"]: {"mean": posteriors[t["id"]][0], "std": posteriors[t["id"]][1]} for t in all_teams},
    }


def simulate_matchup(
    team_a: dict,
    team_b: dict,
    posteriors: dict[str, tuple[float, float]],
    n: int = 10_000,
    scale_factor: float = 10.0,
) -> dict:
    """Single-game simulation between two teams."""
    # Build minimal two-team arrays
    teams = [team_a, team_b]
    team_pace = np.array([t["pace"] for t in teams])
    team_fg3 = np.array([t["fg3Pct"] for t in teams])
    team_asto = np.array([t["astTov"] for t in teams])

    mu_a, sigma_a = posteriors[team_a["id"]]
    mu_b, sigma_b = posteriors[team_b["id"]]
    strengths = np.array([
        np.random.normal(mu_a, sigma_a, n),
        np.random.normal(mu_b, sigma_b, n),
    ])  # (2, n)

    a_slots = np.zeros(n, dtype=int)
    b_slots = np.ones(n, dtype=int)
    wins_a = _game_batch(a_slots, b_slots, strengths, team_pace, team_fg3, team_asto, n, scale_factor)

    prob_a = float(wins_a.sum()) / n * 100

    # Base probability (no posterior uncertainty, no noise)
    net_a = team_a["offRtg"] - team_a["defRtg"]
    net_b = team_b["offRtg"] - team_b["defRtg"]
    base_prob = 1.0 / (1.0 + np.exp(-(net_a - net_b) / scale_factor)) * 100

    avg_pace = (team_a["pace"] + team_b["pace"]) / 2.0
    avg_fg3 = (team_a["fg3Pct"] + team_b["fg3Pct"]) / 2.0
    avg_asto = (team_a["astTov"] + team_b["astTov"]) / 2.0

    return {
        "prob_a": round(prob_a, 1),
        "prob_b": round(100 - prob_a, 1),
        "base_prob_a": round(base_prob, 1),
        "strength_a": {"mean": round(mu_a, 2), "std": round(sigma_a, 2)},
        "strength_b": {"mean": round(mu_b, 2), "std": round(sigma_b, 2)},
        "factors": {
            "avg_pace": round(avg_pace, 1),
            "effective_scale": round(scale_factor * (BASELINE_PACE / avg_pace), 2),
            "avg_3pct": round(avg_fg3, 1),
            "three_noise_std": round(max(0.0, (avg_fg3 - 33) * 0.35), 2),
            "avg_astov": round(avg_asto, 2),
            "to_noise_std": round(max(0.0, (1.4 - avg_asto) * 2.5), 2),
        },
    }
