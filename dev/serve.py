"""Servidor local para probar el campus.
- Sin caché: cada cambio se ve al recargar.
- Con soporte de "Range": los videos se pueden adelantar y retroceder (como en el hosting real).
Uso: python dev/serve.py [puerto]   ->  http://localhost:8750
"""
import http.server
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8750


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_head(self):
        rng = self.headers.get("Range")
        path = self.translate_path(self.path)
        m = re.match(r"bytes=(\d*)-(\d*)$", rng or "")
        if not m or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        start = int(m.group(1)) if m.group(1) else max(0, size - int(m.group(2) or 0))
        end = int(m.group(2)) if m.group(1) and m.group(2) else size - 1
        end = min(end, size - 1)
        if start > end:
            self.send_error(416)
            return None
        f = open(path, "rb")
        f.seek(start)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        self._remaining = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        rem = getattr(self, "_remaining", None)
        if rem is None:
            return super().copyfile(source, outputfile)
        while rem > 0:
            chunk = source.read(min(65536, rem))
            if not chunk:
                break
            try:
                outputfile.write(chunk)
            except (BrokenPipeError, ConnectionResetError):
                break
            rem -= len(chunk)
        self._remaining = None

    def log_message(self, fmt, *args):
        pass


Handler.extensions_map.update({".js": "text/javascript", ".mjs": "text/javascript", ".woff2": "font/woff2", ".mp4": "video/mp4"})

if __name__ == "__main__":
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as srv:
        print(f"Campus en http://localhost:{PORT}")
        srv.serve_forever()
