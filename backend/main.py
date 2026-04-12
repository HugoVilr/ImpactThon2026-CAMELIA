import os
import json
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# IMPORTANTE: Usamos la librería moderna de 2026
from google import genai

# Intentamos la importación de la base de datos local
try:
    from app import db as app_db
except ImportError:
    import app.db as app_db

# 1. Cargar variables de entorno
load_dotenv()

# 2. Configuración de FastAPI
app = FastAPI(
    title="CAMELIA API - Protein Intelligence 2026",
    description="Agente Data Scientist especializado en análisis estructural de proteínas.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS DE DATOS ---
class AIDiscoveryRequest(BaseModel):
    protein_data: dict

class EntryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=1, max_length=500)

# --- INICIALIZACIÓN DE DB ---
@app.on_event("startup")
def startup() -> None:
    app_db.init_db()

# --- RUTAS PRINCIPALES ---

@app.get("/")
def root():
    return {"message": "CAMELIA API is active", "model": "Gemini 3 Flash"}

@app.post("/api/ai-discovery")
async def ai_discovery(payload: AIDiscoveryRequest):
    """
    Agente Data Scientist: Analiza datos de AlphaFold y genera un dossier profesional.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API Key no configurada.")

    # Inicialización del cliente moderno de 2026
    client = genai.Client(api_key=api_key)
    
    protein_json = json.dumps(payload.protein_data, indent=2)

    prompt = f"""Actúa como un biólogo computacional experto. 
Analiza estos resultados de AlphaFold (CESGA Cluster) y genera un Protein Intelligence Dossier técnico.

DATOS ESTRUCTURALES:
{protein_json}

ESTRUCTURA DEL REPORTE:
1. **Resumen Ejecutivo**: Potencial biotecnológico.
2. **Análisis de Fiabilidad**: Evaluación del pLDDT y regiones disordered.
3. **Wet Lab Feasibility**: Solubilidad y expresión sugerida.
4. **Alertas de Estabilidad**: Dominios inestables o riesgos de agregación.
5. **Hoja de Ruta**: Sugerencia de mutagénesis dirigida.

Responde exclusivamente en formato Markdown profesional."""

    try:
        # Generación usando Gemini 3 Flash
        response = client.models.generate_content(
            model="gemini-3-flash",
            contents=prompt
        )

        if not response.text:
            raise ValueError("Respuesta vacía del modelo.")

        return {"report": response.text, "is_fallback": False}

    except Exception as e:
        print(f"Error en el agente: {e}")
        # Fallback inteligente
        plddt = payload.protein_data.get("plddt_avg", "N/A")
        return {
            "report": f"#Reporte Simplificado\nError al conectar con el cerebro de IA.\n\n**Métrica detectada:** pLDDT {plddt}",
            "is_fallback": True
        }

# --- RUTAS DE BASE DE DATOS ---

@app.get("/api/entries")
def get_entries():
    return app_db.list_entries()

@app.post("/api/entries", status_code=201)
def post_entry(payload: EntryCreate):
    return app_db.create_entry(
        title=payload.title,
        category=payload.category,
        description=payload.description
    )