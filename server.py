import http.server
import socketserver
import webbrowser
import urllib.request
import urllib.parse
import os
import sys

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/tts":
            # Proxy TTS audio request
            query = urllib.parse.parse_qs(parsed.query)
            tl = query.get("tl", ["ml"])[0]
            q = query.get("q", [""])[0]
            if not q:
                self.send_error(400, "Missing query text 'q'")
                return
            
            google_url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={urllib.parse.quote(tl)}&client=tw-ob&q={urllib.parse.quote(q)}"
            try:
                req = urllib.request.Request(google_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=10) as response:
                    audio_data = response.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "audio/mpeg")
                    self.send_header("Content-Length", str(len(audio_data)))
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.send_header("Content-Disposition", f'inline; filename="voicestudio_{tl}.mp3"')
                    self.end_headers()
                    self.wfile.write(audio_data)
            except Exception as e:
                self.send_error(500, f"TTS fetch error: {e}")
            return

        super().do_GET()

    def log_message(self, format, *args):
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 60)
        print(f"[*] VoiceStudio Web Server running at: {url}")
        print(f"[*] Serving files from: {DIRECTORY}")
        print("[*] Press Ctrl+C to stop the server.")
        print("=" * 60)
        try:
            webbrowser.open(url)
        except Exception:
            pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down VoiceStudio Web Server.")
