from fastapi.testclient import TestClient
from app.main import app
from app import ytmusic_service as service
from app.schemas import CatalogSong

client = TestClient(app)

def test_health():
    assert client.get("/api/health").json()["status"] == "ok"

def test_normalization_and_limit():
    entries = [{"videoId": "abcdefghijk", "title": "Tema", "artists": [{"name": "A"}, {"name": "B"}], "duration": "3:15", "thumbnails": [{"url": "https://i.ytimg.com/vi/abcdefghijk/default.jpg"}]}] * 30
    entries.insert(0, {"videoId": None})
    songs = service.normalize_search(entries)
    assert len(songs) == 20
    assert songs[0].artist == "A, B"
    assert songs[0].duration == 195
    assert songs[0].artwork.startswith("https://")

def test_bad_metadata():
    assert service.normalize_search(None) == []
    assert service.normalize_search([{"videoId": "bad"}]) == []
    song = service.normalize_search([{"videoId": "abcdefghijk", "duration_seconds": float("nan"), "artists": None}])[0]
    assert song.title == "Sin título"
    assert song.duration is None
    assert service.thumbnail([{"url":"javascript:alert(1)"}]) is None

def test_query_validation():
    assert client.get("/api/search", params={"q":"a"}).status_code == 422
    assert client.get("/api/search", params={"q":"  "}).status_code == 422
    assert client.get("/api/search", params={"q":"x"*151}).status_code == 422
    assert client.get("/api/songs/invalid").status_code == 422
    assert client.get("/api/search",params={"q":"tema","kind":"invalid"}).status_code == 422

def test_search_uses_service(monkeypatch):
    calls = []
    def fake_search(query,kind):
        calls.append((query,kind))
        return [CatalogSong(videoId="abcdefghijk",title="Tema",artist="A",duration=90)]
    monkeypatch.setattr(service,"search",fake_search)
    response = client.get("/api/search",params={"q":"  tema  "})
    assert response.status_code == 200
    assert calls == [("tema","songs")]
    assert client.get("/api/search",params={"q":"tema","kind":"videos"}).status_code == 200
    assert calls[-1] == ("tema","videos")
    assert response.json()[0]["title"] == "Tema"

def test_unavailable_catalog_is_recoverable(monkeypatch):
    def broken(query,kind):
        raise RuntimeError("upstream")
    monkeypatch.setattr(service,"search",broken)
    response = client.get("/api/search",params={"q":"tema"})
    assert response.status_code == 502
    assert "intenta de nuevo" in response.json()["detail"]
    assert client.get("/api/health").status_code == 200

def test_timeout_is_applied(monkeypatch):
    captured = {}
    def fake_request(self,method,url,**kwargs):
        captured.update(kwargs)
        return object()
    monkeypatch.setattr("requests.Session.request",fake_request)
    with service.TimeoutSession() as session:
        session.get("https://example.test")
    assert captured["timeout"] == (5,12)

def test_song_endpoint(monkeypatch):
    monkeypatch.setattr(service,"get_song",lambda video_id: CatalogSong(videoId=video_id,title="Tema",artist="A"))
    assert client.get("/api/songs/abcdefghijk").json()["title"] == "Tema"

def test_referrer_policy_for_embedded_player():
    response = client.get("/api/health")
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
