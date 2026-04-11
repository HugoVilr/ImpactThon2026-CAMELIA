from __future__ import annotations

import os
from typing import Any
from urllib.parse import quote_plus

import psycopg
from psycopg.rows import dict_row


def build_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    user = os.getenv("POSTGRES_USER", "camelia")
    password = quote_plus(os.getenv("POSTGRES_PASSWORD", "camelia"))
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    dbname = os.getenv("POSTGRES_DB", "camelia")

    return f"postgresql://{user}:{password}@{host}:{port}/{dbname}"


DATABASE_URL = build_database_url()
DATABASE_LABEL = (
    f"{os.getenv('POSTGRES_USER', 'camelia')}@"
    f"{os.getenv('POSTGRES_HOST', 'localhost')}:"
    f"{os.getenv('POSTGRES_PORT', '5432')}/"
    f"{os.getenv('POSTGRES_DB', 'camelia')}"
)

# Variable global para controlar si hay base de datos disponible
DB_ACTIVE = True

def get_connection() -> psycopg.Connection:
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def init_db() -> None:
    global DB_ACTIVE
    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS entries (
                        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                        title VARCHAR(120) NOT NULL,
                        category VARCHAR(50) NOT NULL,
                        description VARCHAR(500) NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """
                )
            connection.commit()
        DB_ACTIVE = True
    except Exception as e:
        print(f"⚠️ Alerta: No hay base de datos: {e}. Entrando en modo funcional limitado.")
        DB_ACTIVE = False


def list_entries() -> list[dict[str, Any]]:
    if not DB_ACTIVE:
        return [] # O devolver datos de prueba/mock

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, title, category, description, created_at
                FROM entries
                ORDER BY created_at DESC, id DESC
                """
            )
            rows = cursor.fetchall()

    return [dict(row) for row in rows]


def create_entry(title: str, category: str, description: str) -> dict[str, Any]:
    if not DB_ACTIVE:
        raise RuntimeError("No Database Connection Available. Operación en modo limitado.")

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO entries (title, category, description)
                VALUES (%s, %s, %s)
                RETURNING id, title, category, description, created_at
                """,
                (title, category, description),
            )
            row = cursor.fetchone()
        connection.commit()

    if row is None:
        raise RuntimeError("Could not load created entry")

    return dict(row)
