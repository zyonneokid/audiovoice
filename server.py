import http.server
import socketserver
import webbrowser
import urllib.request
import urllib.parse
import socket
import os
import sys
import asyncio

try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False

INITIAL_PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Comprehensive Neural Voice Mapping for Multi-Age & Multi-Gender Characters
VOICE_CATALOG = {
    "ml": {  # Malayalam
        "male": ("ml-IN-MidhunNeural", "+0Hz", "+0%"),
        "female": ("ml-IN-SobhanaNeural", "+0Hz", "+0%"),
        "baby": ("ml-IN-SobhanaNeural", "+62Hz", "+24%"),
        "kid": ("ml-IN-SobhanaNeural", "+36Hz", "+12%"),
        "teenage": ("ml-IN-MidhunNeural", "+14Hz", "+8%"),
        "senior": ("ml-IN-MidhunNeural", "-28Hz", "-16%"),
    },
    "en": {  # English
        "male": ("en-US-GuyNeural", "+0Hz", "+0%"),
        "female": ("en-US-JennyNeural", "+0Hz", "+0%"),
        "baby": ("en-US-AnaNeural", "+45Hz", "+20%"),
        "kid": ("en-US-AnaNeural", "+0Hz", "+0%"),  # Natural child voice
        "teenage": ("en-US-ChristopherNeural", "+0Hz", "+0%"),  # Natural teen voice
        "senior": ("en-US-TonyNeural", "-18Hz", "-14%"),
    },
    "hi": {  # Hindi
        "male": ("hi-IN-MadhurNeural", "+0Hz", "+0%"),
        "female": ("hi-IN-SwaraNeural", "+0Hz", "+0%"),
        "baby": ("hi-IN-SwaraNeural", "+64Hz", "+22%"),
        "kid": ("hi-IN-SwaraNeural", "+36Hz", "+12%"),
        "teenage": ("hi-IN-MadhurNeural", "+15Hz", "+8%"),
        "senior": ("hi-IN-MadhurNeural", "-26Hz", "-16%"),
    },
    "ta": {  # Tamil
        "male": ("ta-IN-ValluvarNeural", "+0Hz", "+0%"),
        "female": ("ta-IN-PallaviNeural", "+0Hz", "+0%"),
        "baby": ("ta-IN-PallaviNeural", "+62Hz", "+22%"),
        "kid": ("ta-IN-PallaviNeural", "+35Hz", "+12%"),
        "teenage": ("ta-IN-ValluvarNeural", "+14Hz", "+8%"),
        "senior": ("ta-IN-ValluvarNeural", "-26Hz", "-16%"),
    },
    "te": {  # Telugu
        "male": ("te-IN-MohanNeural", "+0Hz", "+0%"),
        "female": ("te-IN-ShrutiNeural", "+0Hz", "+0%"),
        "baby": ("te-IN-ShrutiNeural", "+62Hz", "+22%"),
        "kid": ("te-IN-ShrutiNeural", "+35Hz", "+12%"),
        "teenage": ("te-IN-MohanNeural", "+14Hz", "+8%"),
        "senior": ("te-IN-MohanNeural", "-26Hz", "-16%"),
    },
}

DEFAULT_FALLBACK_VOICE = {
    "male": ("en-US-GuyNeural", "+0Hz", "+0%"),
    "female": ("en-US-JennyNeural", "+0Hz", "+0%"),
    "baby": ("en-US-AnaNeural", "+40Hz", "+20%"),
    "kid": ("en-US-AnaNeural", "+0Hz", "+0%"),
    "teenage": ("en-US-ChristopherNeural", "+0Hz", "+0%"),
    "senior": ("en-US-TonyNeural", "-18Hz", "-14%"),
}

def calc_pitch_rate(base_pitch_str, base_rate_str, user_pitch=1.0, user_speed=1.0, timbre='normal'):
    try:
        base_pitch_val = int(base_pitch_str.replace('Hz', '').replace('+', ''))
    except Exception:
        base_pitch_val = 0
    try:
        base_rate_val = int(base_rate_str.replace('%', '').replace('+', ''))
    except Exception:
        base_rate_val = 0

    user_pitch_offset = int((user_pitch - 1.0) * 30)
    user_rate_offset = int((user_speed - 1.0) * 50)

    if timbre == 'deep':
        user_pitch_offset -= 14
        user_rate_offset -= 4
    elif timbre == 'warm':
        user_pitch_offset -= 6
    elif timbre == 'hero':
        user_pitch_offset += 8
    elif timbre == 'villain':
        user_pitch_offset -= 22
        user_rate_offset -= 10
    elif timbre == 'whisper':
        user_rate_offset -= 8

    total_pitch = base_pitch_val + user_pitch_offset
    total_rate = base_rate_val + user_rate_offset

    return f"{total_pitch:+d}Hz", f"{total_rate:+d}%"

async def generate_neural_speech(text, voice_name, pitch_str="+0Hz", rate_str="+0%"):
    communicate = edge_tts.Communicate(text, voice_name, pitch=pitch_str, rate=rate_str)
    chunks = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            chunks.append(chunk["data"])
    return b"".join(chunks)

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
            tl = query.get("tl", ["ml"])[0].lower()
            q = query.get("q", [""])[0]
            persona = query.get("persona", ["male"])[0].lower()
            timbre = query.get("timbre", ["normal"])[0].lower()

            try:
                user_pitch = float(query.get("pitch", [1.0])[0])
            except Exception:
                user_pitch = 1.0

            try:
                user_speed = float(query.get("speed", [1.0])[0])
            except Exception:
                user_speed = 1.0

            if not q:
                self.send_error(400, "Missing query text 'q'")
                return

            audio_data = None

            # Attempt High-Fidelity Edge-TTS with Age & Persona Voice Model
            if HAS_EDGE_TTS:
                lang_catalog = VOICE_CATALOG.get(tl, DEFAULT_FALLBACK_VOICE)
                voice_tuple = lang_catalog.get(persona, lang_catalog.get("male", ("en-US-GuyNeural", "+0Hz", "+0%")))
                voice_name, base_pitch, base_rate = voice_tuple
                
                # Check for explicit voice override
                explicit_voice = query.get("voice", [None])[0]
                if explicit_voice and not explicit_voice.startswith("neural-"):
                    voice_name = explicit_voice

                pitch_str, rate_str = calc_pitch_rate(base_pitch, base_rate, user_pitch, user_speed, timbre)

                try:
                    sys.stderr.write(f"[*] Edge-TTS Synthesizing: voice={voice_name}, persona={persona}, pitch={pitch_str}, rate={rate_str}, text={q[:30]}...\n")
                    audio_data = asyncio.run(generate_neural_speech(q, voice_name, pitch_str, rate_str))
                except Exception as e:
                    sys.stderr.write(f"[!] Edge-TTS synthesis failed ({e}). Falling back to Google TTS proxy...\n")
                    audio_data = None

            # Fallback to Google TTS if Edge-TTS failed or unavailable
            if not audio_data:
                google_url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={urllib.parse.quote(tl)}&client=tw-ob&q={urllib.parse.quote(q)}"
                try:
                    req = urllib.request.Request(google_url, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, timeout=10) as response:
                        audio_data = response.read()
                except Exception as e:
                    self.send_error(500, f"TTS fetch error: {e}")
                    return

            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(len(audio_data)))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Disposition", f'inline; filename="voicestudio_{tl}_{persona}.mp3"')
            self.end_headers()
            self.wfile.write(audio_data)
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
    print(f"[*] Neural Voice Engine Active (Edge-TTS + Multi-Age Personas)")
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
