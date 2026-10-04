import logging
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from . import ytmusic_service
from .schemas import CatalogSong

app = FastAPI(title="DeluxXx Sound", version="1.0.0")
logger = logging.getLogger("deluxxx.catalog")
origins = os.getenv("DELUXXX_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET"], allow_headers=["Content-Type"])

@app.middleware("http")
async def player_referrer_policy(request, call_next):
    response = await call_next(request)
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "application": "DeluxXx Sound"}

@app.get("/api/search", response_model=list[CatalogSong])
def search(q: str = Query(min_length=2, max_length=150), kind: str = Query(default="songs", pattern="^(songs|videos)$")) -> list[CatalogSong]:
    query = q.strip()
    if len(query) < 2:
        raise HTTPException(422, "Escribe al menos dos caracteres.")
    try:
        return ytmusic_service.search(query, kind)
    except Exception:
        logger.warning("No se pudo consultar YouTube Music", exc_info=True)
        raise HTTPException(502, "YouTube Music no respondió. Comprueba tu conexión e intenta de nuevo.") from None

@app.get("/api/songs/{video_id}", response_model=CatalogSong)
def song(video_id: str) -> CatalogSong:
    if not ytmusic_service.valid_video_id(video_id):
        raise HTTPException(422, "Identificador de YouTube inválido.")
    try:
        return ytmusic_service.get_song(video_id)
    except LookupError as error:
        raise HTTPException(404, str(error)) from None
    except Exception:
        logger.warning("No se pudieron obtener metadatos", exc_info=True)
        raise HTTPException(502, "No se pudieron obtener los metadatos de YouTube Music.") from None

# El build usa el mismo origen que /api: también funciona sin Vite.
frontend = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend.is_dir():
    app.mount("/", StaticFiles(directory=frontend, html=True), name="frontend")
