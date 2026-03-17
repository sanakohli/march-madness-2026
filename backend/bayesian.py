"""
Bayesian team strength estimation using a conjugate Normal-Normal model.

Model
-----
Prior:      θ_i ~ N(μ_pop, σ_pop²)
Likelihood: x_i | θ_i ~ N(θ_i, σ_obs_i²)
Posterior:  θ_i | x_i ~ N(μ_post_i, σ_post_i²)

Where x_i is the observed season net rating (offRtg - defRtg), and σ_obs_i is
inflated for teams with weak schedules — they've been tested less rigorously, so
their observed rating carries more uncertainty about their true quality.

The posterior shrinks weak-schedule outliers toward the population mean while
trusting strong-schedule teams' ratings more directly.
"""

import numpy as np
from typing import Optional

# How much schedule strength inflates observation noise.
# At max SoS penalty (weakest schedule), noise is SOS_SCALE × larger.
SOS_SCALE = 1.5
BASE_SIGMA_OBS = 3.0  # baseline observation noise in net-rating points


def compute_posteriors(
    teams: list[dict],
    sigma_obs_base: float = BASE_SIGMA_OBS,
    sos_scale: float = SOS_SCALE,
) -> dict[str, tuple[float, float]]:
    """
    Compute posterior (mean, std) for each team's true strength.

    Parameters
    ----------
    teams : list of team dicts (from the JSON data)
    sigma_obs_base : base observation noise in net-rating points
    sos_scale : multiplier range for schedule-strength adjustment

    Returns
    -------
    dict mapping team_id -> (posterior_mean, posterior_std)
    """
    net_ratings = np.array([t["offRtg"] - t["defRtg"] for t in teams])
    sos_ranks = np.array([t["sos"] for t in teams], dtype=float)

    # Population prior from the full field
    mu_pop = float(np.mean(net_ratings))
    sigma_pop = float(np.std(net_ratings))

    # Schedule-adjusted observation noise.
    # sos_rank = 1 → best schedule → minimal penalty (noise ≈ base).
    # sos_rank = max → weakest schedule → noise ≈ base × (1 + sos_scale).
    max_sos = float(np.max(sos_ranks))
    sos_normalized = (sos_ranks - 1.0) / max(max_sos - 1.0, 1.0)  # [0, 1]
    sigma_obs = sigma_obs_base * (1.0 + sos_normalized * sos_scale)

    # Conjugate update
    precision_prior = 1.0 / sigma_pop ** 2
    precision_likelihood = 1.0 / sigma_obs ** 2
    precision_post = precision_prior + precision_likelihood

    sigma_post = np.sqrt(1.0 / precision_post)
    mu_post = (mu_pop * precision_prior + net_ratings * precision_likelihood) / precision_post

    return {
        t["id"]: (float(mu_post[i]), float(sigma_post[i]))
        for i, t in enumerate(teams)
    }


def strength_summary(teams: list[dict], posteriors: dict) -> list[dict]:
    """
    Return a list of per-team summary dicts for the API response.
    Includes raw net rating, posterior mean/std, and 90% credible interval.
    """
    result = []
    for t in teams:
        mu, sigma = posteriors[t["id"]]
        net = t["offRtg"] - t["defRtg"]
        result.append({
            "id": t["id"],
            "name": t["name"],
            "seed": t["seed"],
            "region": t["region"],
            "conf": t["conf"],
            "net_rating": round(net, 2),
            "strength_mean": round(mu, 2),
            "strength_std": round(sigma, 2),
            "ci_90_low": round(mu - 1.645 * sigma, 2),
            "ci_90_high": round(mu + 1.645 * sigma, 2),
            # Shrinkage: how much the posterior mean moved from the raw rating
            "shrinkage": round(net - mu, 2),
        })
    return sorted(result, key=lambda x: -x["strength_mean"])


# ---------------------------------------------------------------------------
# Optional: PyMC hierarchical model
# ---------------------------------------------------------------------------

def fit_hierarchical(teams: list[dict], draws: int = 1000, tune: int = 500):
    """
    Fit a hierarchical Bayesian model using PyMC.

    Model:
        mu_global ~ N(0, 15)
        sigma_global ~ HalfNormal(8)
        mu_region[r] ~ N(mu_global, sigma_global)     ← region effects
        sigma_region ~ HalfNormal(4)
        theta[i] ~ N(mu_region[region[i]], sigma_region)  ← team strength
        sigma_obs ~ HalfNormal(3)
        x[i] ~ N(theta[i], sigma_obs)                 ← observed net rating

    Returns posterior samples as a dict {team_id: (mean, std)}.
    """
    try:
        import pymc as pm
        import arviz as az
    except ImportError:
        raise ImportError("PyMC is required for hierarchical fitting. pip install pymc")

    net_ratings = np.array([t["offRtg"] - t["defRtg"] for t in teams])
    region_names = sorted(set(t["region"] for t in teams))
    region_idx = np.array([region_names.index(t["region"]) for t in teams])
    n_regions = len(region_names)
    n_teams = len(teams)

    with pm.Model():
        mu_global = pm.Normal("mu_global", mu=0, sigma=15)
        sigma_global = pm.HalfNormal("sigma_global", sigma=8)

        mu_region = pm.Normal(
            "mu_region", mu=mu_global, sigma=sigma_global, shape=n_regions
        )
        sigma_region = pm.HalfNormal("sigma_region", sigma=4)

        theta = pm.Normal(
            "theta",
            mu=mu_region[region_idx],
            sigma=sigma_region,
            shape=n_teams,
        )

        sigma_obs = pm.HalfNormal("sigma_obs", sigma=3)
        pm.Normal("obs", mu=theta, sigma=sigma_obs, observed=net_ratings)

        trace = pm.sample(
            draws,
            tune=tune,
            return_inferencedata=True,
            progressbar=False,
            cores=1,
        )

    theta_samples = trace.posterior["theta"].values.reshape(-1, n_teams)
    means = theta_samples.mean(axis=0)
    stds = theta_samples.std(axis=0)

    return {t["id"]: (float(means[i]), float(stds[i])) for i, t in enumerate(teams)}
