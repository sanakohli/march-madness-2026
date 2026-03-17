"""
March Madness 2026 — Bayesian bracket API
Run: uvicorn backend.main:app --reload --port 8000
"""

import json
import time
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.bayesian import compute_posteriors, strength_summary, fit_hierarchical
from backend.simulation import simulate_bracket, simulate_matchup

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="March Madness Bayesian API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

@lru_cache(maxsize=2)
def load_bracket(gender: str) -> dict:
    path = DATA_DIR / f"{'men' if gender == 'men' else 'women'}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Data not found for gender={gender}")
    with open(path) as f:
        return json.load(f)


def get_teams_by_region(teams: list[dict], regions: list[str]) -> dict[str, list[dict]]:
    return {
        r: sorted([t for t in teams if t["region"] == r], key=lambda t: t["seed"])
        for r in regions
    }


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class SimulateBracketRequest(BaseModel):
    gender: str = "men"
    n: int = 10_000
    scale_factor: float = 10.0


class SimulateMatchupRequest(BaseModel):
    gender: str = "men"
    team_a_id: str
    team_b_id: str
    n: int = 10_000
    scale_factor: float = 10.0


class HierarchicalRequest(BaseModel):
    gender: str = "men"
    draws: int = 1000
    tune: int = 500


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/strengths/{gender}")
def get_strengths(gender: str, sigma_obs_base: float = 3.0):
    """
    Return Bayesian posterior strength estimates for all teams.
    Includes raw net rating, posterior mean/std, and 90% credible interval.
    """
    if gender not in ("men", "women"):
        raise HTTPException(status_code=400, detail="gender must be 'men' or 'women'")

    data = load_bracket(gender)
    teams = data["teams"]
    posteriors = compute_posteriors(teams, sigma_obs_base=sigma_obs_base)
    summary = strength_summary(teams, posteriors)

    return {
        "gender": gender,
        "model": "conjugate_normal",
        "sigma_obs_base": sigma_obs_base,
        "teams": summary,
    }


@app.post("/api/simulate-bracket")
def api_simulate_bracket(req: SimulateBracketRequest):
    """
    Run n vectorized bracket simulations using Bayesian team strengths.
    Returns per-team round-advancement probabilities with posterior uncertainty.
    """
    if req.gender not in ("men", "women"):
        raise HTTPException(status_code=400, detail="gender must be 'men' or 'women'")
    if not (100 <= req.n <= 100_000):
        raise HTTPException(status_code=400, detail="n must be between 100 and 100,000")

    data = load_bracket(req.gender)
    teams = data["teams"]
    regions = data["regions"]
    teams_by_region = get_teams_by_region(teams, regions)
    posteriors = compute_posteriors(teams)

    t0 = time.perf_counter()
    result = simulate_bracket(teams, teams_by_region, posteriors, n=req.n, scale_factor=req.scale_factor)
    elapsed = round(time.perf_counter() - t0, 3)

    # Annotate result with team metadata
    team_map = {t["id"]: t for t in teams}
    annotated = []
    for tid, probs in result["probs"].items():
        t = team_map[tid]
        s = result["strengths"][tid]
        annotated.append({
            "id": tid,
            "name": t["name"],
            "seed": t["seed"],
            "region": t["region"],
            "net_rating": round(t["offRtg"] - t["defRtg"], 2),
            "strength_mean": round(s["mean"], 2),
            "strength_std": round(s["std"], 2),
            "probs": probs,
        })

    return {
        "gender": req.gender,
        "n": req.n,
        "scale_factor": req.scale_factor,
        "model": "bayesian_conjugate",
        "elapsed_s": elapsed,
        "results": annotated,
    }


@app.post("/api/simulate-matchup")
def api_simulate_matchup(req: SimulateMatchupRequest):
    """
    Simulate a single head-to-head matchup using Bayesian strengths.
    """
    if req.gender not in ("men", "women"):
        raise HTTPException(status_code=400, detail="gender must be 'men' or 'women'")

    data = load_bracket(req.gender)
    teams = data["teams"]
    team_map = {t["id"]: t for t in teams}

    if req.team_a_id not in team_map:
        raise HTTPException(status_code=404, detail=f"Team not found: {req.team_a_id}")
    if req.team_b_id not in team_map:
        raise HTTPException(status_code=404, detail=f"Team not found: {req.team_b_id}")

    posteriors = compute_posteriors(teams)
    result = simulate_matchup(
        team_map[req.team_a_id],
        team_map[req.team_b_id],
        posteriors,
        n=req.n,
        scale_factor=req.scale_factor,
    )
    return result


@app.post("/api/fit-hierarchical")
def api_fit_hierarchical(req: HierarchicalRequest):
    """
    Fit a full PyMC hierarchical model. Slower but more principled —
    uses region-level partial pooling and full MCMC inference.
    """
    if req.gender not in ("men", "women"):
        raise HTTPException(status_code=400, detail="gender must be 'men' or 'women'")

    data = load_bracket(req.gender)
    teams = data["teams"]

    try:
        t0 = time.perf_counter()
        posteriors = fit_hierarchical(teams, draws=req.draws, tune=req.tune)
        elapsed = round(time.perf_counter() - t0, 1)
        summary = strength_summary(teams, posteriors)
        return {
            "gender": req.gender,
            "model": "hierarchical_pymc",
            "draws": req.draws,
            "elapsed_s": elapsed,
            "teams": summary,
        }
    except ImportError as e:
        raise HTTPException(status_code=501, detail=str(e))
