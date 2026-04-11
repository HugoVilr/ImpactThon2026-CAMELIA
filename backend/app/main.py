from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.db import DATABASE_LABEL, create_entry, init_db, list_entries

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

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
