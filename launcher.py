"""Abre el build local. El proceso pertenece a esta carpeta y solo escucha loopback."""
from pathlib import Path
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parent
URL = "http://127.0.0.1:8000"

def available() -> bool:
    try:
        with urllib.request.urlopen(URL + "/api/health", timeout=1) as response:
            return json.load(response).get("application") == "DeluxXx Sound"
    except (OSError, ValueError, urllib.error.URLError):
        return False

def main() -> None:
    if not (ROOT / "frontend" / "dist" / "index.html").is_file():
        raise RuntimeError("Falta el build. Ejecuta Instalar.cmd antes de iniciar.")
    if not available():
        runtime = ROOT / ".runtime"
        runtime.mkdir(exist_ok=True)
        with (runtime / "server.log").open("a", encoding="utf-8") as output:
            process = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
                cwd=ROOT / "backend", stdout=output, stderr=output,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            )
        (runtime / "server.pid").write_text(str(process.pid), encoding="utf-8")
        for _ in range(40):
            if available():
                break
            if process.poll() is not None:
                raise RuntimeError("No se pudo iniciar el servidor. Revisa .runtime/server.log y comprueba que el puerto 8000 esté libre.")
            time.sleep(0.25)
        else:
            process.terminate()
            raise RuntimeError("El servidor tardó demasiado en iniciar. Revisa .runtime/server.log.")
    webbrowser.open(URL)
    print("DeluxXx Sound abierto en " + URL)

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
