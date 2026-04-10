import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))
from app.main import health, root


def test_health() -> None:
    assert health() == {"status": "ok", "service": "backend"}


def test_root() -> None:
    assert root() == {"message": "CAMELIA API running"}
