import http.server
import socketserver
import webbrowser
import urllib.request
import urllib.parse
import socket
import os
import sys

INITIAL_PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_HEAD(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/tts":
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            return
        super().do_HEAD()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/tts":
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

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def find_available_server(start_port=3000, max_attempts=10):
    socketserver.TCPServer.allow_reuse_address = True
    for port in range(start_port, start_port + max_attempts):
        try:
            httpd = socketserver.TCPServer(("", port), Handler)
            return httpd, port
        except OSError:
            continue
    return None, None

if __name__ == "__main__":
    os.chdir(DIRECTORY)

    # Check if port 3000 is already active and serving
    if is_port_in_use(INITIAL_PORT):
        print("=" * 60)
        print(f"[*] VoiceStudio Web Server is ALREADY RUNNING at: http://localhost:{INITIAL_PORT}")
        print("[*] Opening your browser directly...")
        print("=" * 60)
        try:
            webbrowser.open(f"http://localhost:{INITIAL_PORT}")
        except Exception:
            pass
        sys.exit(0)

    httpd, port = find_available_server(INITIAL_PORT)
    if not httpd:
        print(f"[!] Could not bind to port {INITIAL_PORT} through {INITIAL_PORT+9}. Opening index.html directly...")
        webbrowser.open(os.path.join(DIRECTORY, "index.html"))
        sys.exit(1)

    url = f"http://localhost:{port}"
    print("=" * 60)
    print(f"[*] VoiceStudio Web Server started at: {url}")
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
