from pydantic import BaseModel, Field

class CatalogSong(BaseModel):
    videoId: str = Field(pattern=r"^[A-Za-z0-9_-]{11}$")
    title: str
    artist: str
    duration: float | None = Field(default=None, ge=0)
    artwork: str = ""
