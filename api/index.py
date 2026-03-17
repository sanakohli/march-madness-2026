import sys
from pathlib import Path

# Make the backend package importable from the project root
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.main import app  # noqa: F401 — Vercel picks up the ASGI app object
