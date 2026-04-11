from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app import db as app_db

DATABASE_LABEL = app_db.DATABASE_LABEL


def init_db() -> None:
    app_db.init_db()


def list_entries() -> list[dict[str, Any]]:
    return app_db.list_entries()


def create_entry(title: str, category: str, description: str) -> dict[str, Any]:
    return app_db.create_entry(
        title=title,
        category=category,
        description=description,
    )

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(title="CAMELIA API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EntryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=1, max_length=500)
    sequence: str | None = None


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "CAMELIA API running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "backend",
        "database": DATABASE_LABEL,
    }


@app.get("/api/entries")
def get_entries() -> list[dict[str, str | int]]:
    return list_entries()


@app.post("/api/entries", status_code=201)
def post_entry(payload: EntryCreate) -> dict[str, str | int]:
    title = payload.title.strip()
    category = payload.category.strip()
    description = payload.description.strip()

    if not title or not category or not description:
        raise HTTPException(status_code=422, detail="Fields cannot be blank")

    return create_entry(
        title=title,
        category=category,
        description=description,
    )
