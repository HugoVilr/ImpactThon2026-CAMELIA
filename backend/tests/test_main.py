import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

sys.path.append(str(Path(__file__).resolve().parents[1]))
from app import main
from app.main import EntryCreate, health, post_entry, root


def test_health() -> None:
    payload = health()
    assert payload["status"] == "ok"
    assert payload["service"] == "backend"
    assert isinstance(payload["database"], str)
    assert payload["database"] != ""


def test_root() -> None:
    assert root() == {"message": "CAMELIA API running"}


def test_post_entry_trims_values_and_calls_create_entry(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, str] = {}

    def fake_create_entry(title: str, category: str, description: str) -> dict[str, str | int]:
        captured["title"] = title
        captured["category"] = category
        captured["description"] = description
        return {
            "id": 123,
            "title": title,
            "category": category,
            "description": description,
            "created_at": "2026-04-11T01:00:00",
        }

    monkeypatch.setattr(main, "create_entry", fake_create_entry)

    response = post_entry(
        EntryCreate(
            title="  Protein X  ",
            category="  enzyme ",
            description="  Useful for tests ",
        )
    )

    assert captured == {
        "title": "Protein X",
        "category": "enzyme",
        "description": "Useful for tests",
    }
    assert response["id"] == 123


def test_post_entry_rejects_blank_fields() -> None:
    with pytest.raises(HTTPException) as exc:
        post_entry(
            EntryCreate(
                title="   ",
                category="valid",
                description="valid",
            )
        )

    assert exc.value.status_code == 422
    assert exc.value.detail == "Fields cannot be blank"
