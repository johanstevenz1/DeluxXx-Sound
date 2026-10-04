import math
import re
from urllib.parse import urlparse
import requests
from ytmusicapi import YTMusic
from .schemas import CatalogSong

class TimeoutSession(requests.Session):
    """ytmusicapi usa esta sesión también para la petición inicial de visitante."""
    def request(self, method, url, **kwargs):
        kwargs.setdefault("timeout", (5, 12))
        return super().request(method, url, **kwargs)

def valid_video_id(value: object) -> bool:
    return isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9_-]{11}", value) is not None

def duration_seconds(value: object) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value) if math.isfinite(value) and value >= 0 else None
    if isinstance(value, str):
        try:
            if value.isdigit():
                return float(value)
            parts = value.split(":")
            if not 2 <= len(parts) <= 3 or not all(part.isdigit() for part in parts):
                return None
            seconds = 0
            for part in parts:
                seconds = seconds * 60 + int(part)
            return float(seconds)
        except (ValueError, OverflowError):
            return None
    return None

def thumbnail(items: object) -> str | None:
    if not isinstance(items, list):
        return None
    for item in reversed(items):
        if not isinstance(item, dict):
            continue
        url = item.get("url")
        if isinstance(url, str):
            parsed = urlparse(url)
            host = parsed.hostname or ""
            if parsed.scheme == "https" and (host.endswith(".ytimg.com") or host.endswith(".googleusercontent.com") or host.endswith(".ggpht.com")):
                return url
    return None

def normalize_search(items: object) -> list[CatalogSong]:
    if not isinstance(items, list):
        return []
    songs: list[CatalogSong] = []
    for item in items:
        if not isinstance(item, dict) or not valid_video_id(item.get("videoId")):
            continue
        artists = item.get("artists") or []
        names = [artist["name"] for artist in artists if isinstance(artist, dict) and isinstance(artist.get("name"), str)] if isinstance(artists, list) else []
        title = item.get("title")
        songs.append(CatalogSong(
            videoId=item["videoId"],
            title=title if isinstance(title, str) and title else "Sin título",
            artist=", ".join(names) or "Artista desconocido",
            duration=duration_seconds(item.get("duration_seconds")) if item.get("duration_seconds") is not None else duration_seconds(item.get("duration")),
            artwork=thumbnail(item.get("thumbnails")) or "",
        ))
        if len(songs) == 20:
            break
    return songs

def search(query: str, kind: str = "songs") -> list[CatalogSong]:
    # Una sesión por llamada evita compartir cookies mutables entre hilos.
    with TimeoutSession() as session:
        yt = YTMusic(requests_session=session, language="en", location="CO")
        return normalize_search(yt.search(query, filter=kind, limit=20))

def get_song(video_id: str) -> CatalogSong:
    with TimeoutSession() as session:
        details = YTMusic(requests_session=session, language="en", location="CO").get_song(video_id)
    video = details.get("videoDetails") or {}
    if not video or not video.get("title"):
        raise LookupError("No se encontraron metadatos de la canción.")
    return CatalogSong(
        videoId=video_id,
        title=video["title"],
        artist=video.get("author") or "Artista desconocido",
        duration=duration_seconds(video.get("lengthSeconds")),
        artwork=thumbnail((video.get("thumbnail") or {}).get("thumbnails")) or "",
    )
