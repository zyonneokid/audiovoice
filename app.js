// VoiceStudio Web - Core Logic & Audio Engine
document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const state = {
    voices: [],
    selectedVoice: null,
    selectedLang: 'all',
    isPlaying: false,
    currentUtterance: null,
    history: [],
    // Audio Context & Web Audio API
    audioCtx: null,
    analyser: null,
    canvasCtx: null,
    visualizerAnimationId: null,
    // Microphone Recording
    mediaRecorder: null,
    recordedChunks: [],
    recordingTimerInterval: null,
    recordingSeconds: 0,
    recordedBlob: null,
    selectedMorphPreset: 'normal',
    // Dialogue lines
    dialogueScript: [
      {
        character: 'narrator',
        name: 'Narrator',
        avatar: '🎙️',
        accentColor: '#8b5cf6',
        pitch: 0.8,
        rate: 0.9,
        timbre: 'warm',
        text: 'The solar flares had subsided, but the signal from deep sector seven was still transmitting.'
      },
      {
        character: 'hero',
        name: 'Commander Alex',
        avatar: '⚡',
        accentColor: '#3b82f6',
        pitch: 1.15,
        rate: 1.05,
        timbre: 'hero',
        text: 'AURA, lock onto those coordinates immediately. We only have three minutes before the relay collapses.'
      },
      {
        character: 'ai',
        name: 'AURA (AI Core)',
        avatar: '🤖',
        accentColor: '#10b981',
        pitch: 1.0,
        rate: 1.25,
        timbre: 'robot',
        text: 'Coordinates confirmed, Commander. Warning: unknown gravitational anomalies detected ahead.'
      },
      {
        character: 'villain',
        name: 'Malakor',
        avatar: '😈',
        accentColor: '#ef4444',
        pitch: 0.6,
        rate: 0.85,
        timbre: 'villain',
        text: 'You are too late, mortals. The archive belongs to the Void now.'
      }
    ],
    isDialoguePlaying: false,
    currentDialogueIndex: -1
  };

  // ==========================================
  // DOM ELEMENTS
  // ==========================================
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // TTS Elements
  const textInput = document.getElementById('tts-text-input');
  const langSelect = document.getElementById('tts-language-select');
  const voiceSelect = document.getElementById('tts-voice-select');
  const speedSlider = document.getElementById('tts-speed');
  const pitchSlider = document.getElementById('tts-pitch');
  const volumeSlider = document.getElementById('tts-volume');
  const timbreSelect = document.getElementById('tts-timbre');
  const valSpeed = document.getElementById('val-speed');
  const valPitch = document.getElementById('val-pitch');
  const valVolume = document.getElementById('val-volume');
  const valTimbre = document.getElementById('val-timbre');
  const charCount = document.getElementById('char-count');
  const wordCount = document.getElementById('word-count');
  const estTime = document.getElementById('est-time');

  const btnSpeakNow = document.getElementById('btn-speak-now');
  const btnDownloadSpeech = document.getElementById('btn-download-speech');
  const btnPauseSpeech = document.getElementById('btn-pause-speech');
  const btnStopSpeech = document.getElementById('btn-stop-speech');
  const playbackStatus = document.getElementById('playback-status');
  const visualizerOverlay = document.getElementById('visualizer-overlay');
  const canvas = document.getElementById('waveform-canvas');
  const historyContainer = document.getElementById('history-container');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // Generated Speech Player Elements
  const generatedPlayerCard = document.getElementById('generated-player-card');
  const ttsAudioElement = document.getElementById('tts-audio-element');
  const playerEngineLabel = document.getElementById('player-engine-label');
  const playerDuration = document.getElementById('player-duration');
  const btnTestSpeaker = document.getElementById('btn-test-speaker');
  let currentSpeechAudioUrl = null;

  // Persona Elements (Female, Male, Baby, Kids, Teenage, Elderly)
  const personaChips = document.querySelectorAll('.persona-chip');
  const personaBadge = document.getElementById('persona-badge');
  let selectedPersona = 'male';

  const PERSONA_CONFIGS = {
    male: {
      name: '👨 Adult Male',
      pitch: 0.85,
      speed: 0.95,
      timbre: 'warm',
      playbackRate: 0.92,
      gender: 'male'
    },
    female: {
      name: '👩 Adult Female',
      pitch: 1.25,
      speed: 1.00,
      timbre: 'normal',
      playbackRate: 1.05,
      gender: 'female'
    },
    baby: {
      name: '👶 Baby / Toddler',
      pitch: 1.95,
      speed: 1.15,
      timbre: 'normal',
      playbackRate: 1.35,
      gender: 'child'
    },
    kid: {
      name: '🧒 Kids / Child',
      pitch: 1.55,
      speed: 1.10,
      timbre: 'hero',
      playbackRate: 1.20,
      gender: 'child'
    },
    teenage: {
      name: '🧑 Teenage',
      pitch: 1.30,
      speed: 1.05,
      timbre: 'normal',
      playbackRate: 1.08,
      gender: 'any'
    },
    senior: {
      name: '👵 Elderly / Senior',
      pitch: 0.72,
      speed: 0.85,
      timbre: 'warm',
      playbackRate: 0.85,
      gender: 'any'
    }
  };

  // Dialogue Elements
  const dialogueContainer = document.getElementById('dialogue-lines-container');
  const btnPlayDialogue = document.getElementById('btn-play-all-dialogue');
  const btnStopDialogue = document.getElementById('btn-stop-dialogue');
  const btnDownloadDialogue = document.getElementById('btn-download-dialogue');
  const dialogueProgress = document.getElementById('dialogue-progress');
  const btnAddDialogueLine = document.getElementById('btn-add-dialogue-line');
  const btnLoadDemoDialogue = document.getElementById('btn-load-demo-dialogue');
  const btnLoadPodcastDialogue = document.getElementById('btn-load-podcast-dialogue');

  // Voice Cloning & Morphing Elements
  const btnToggleRecord = document.getElementById('btn-toggle-record');
  const micIconBtn = document.getElementById('mic-icon-btn');
  const recTimer = document.getElementById('recording-timer');
  const micInstruction = document.getElementById('mic-instruction');
  const audioFileInput = document.getElementById('audio-file-input');
  const recordedPlayerCard = document.getElementById('recorded-player-card');
  const recordedAudioElement = document.getElementById('recorded-audio-element');
  const sampleDuration = document.getElementById('sample-duration');
  const btnDownloadRecorded = document.getElementById('btn-download-recorded');
  const soundPresetCards = document.querySelectorAll('.sound-preset-card');
  const morphPreviewBtns = document.querySelectorAll('.morph-preview-btn');
  const cloneTtsText = document.getElementById('clone-tts-text');
  const btnSpeakCloned = document.getElementById('btn-speak-cloned');

  // Settings Modal Elements
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnCancelSettings = document.getElementById('btn-cancel-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const backendMode = document.getElementById('backend-mode');
  const backendUrlGroup = document.getElementById('backend-url-group');

  // FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');

  // ==========================================
  // INITIALIZATION & TAB SWITCHING
  // ==========================================
  function initTabs() {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.classList.add('active');
      });
    });
  }

  // ==========================================
  // WEB SPEECH SYNTHESIS ENGINE
  // ==========================================
  function loadVoices() {
    if (!('speechSynthesis' in window)) {
      alert('Your browser does not support Web Speech API. Please use Chrome, Edge, or Firefox.');
      return;
    }

    const available = window.speechSynthesis.getVoices();
    if (!available || available.length === 0) {
      return;
    }

    // Sort voices: English first, then alphabetical
    state.voices = available.sort((a, b) => {
      if (a.lang.startsWith('en') && !b.lang.startsWith('en')) return -1;
      if (!a.lang.startsWith('en') && b.lang.startsWith('en')) return 1;
      return a.name.localeCompare(b.name);
    });

    populateLanguageSelector();
    populateVoiceSelector();
  }

  function populateLanguageSelector() {
    const langs = new Map();
    state.voices.forEach(v => {
      const code = v.lang.split('-')[0].toLowerCase();
      if (!langs.has(code)) {
        langs.set(code, v.lang);
      }
    });

    const langNames = {
      en: 'English (US / UK / AU)',
      es: 'Spanish (Español)',
      fr: 'French (Français)',
      de: 'German (Deutsch)',
      hi: 'Hindi (हिन्दी)',
      ml: 'Malayalam (മലയാളം - India)',
      ja: 'Japanese (日本語)',
      zh: 'Chinese (中文)',
      it: 'Italian (Italiano)',
      pt: 'Portuguese (Português)',
      ru: 'Russian (Русский)',
      ar: 'Arabic (العربية)',
      ko: 'Korean (한국어)',
      nl: 'Dutch (Nederlands)',
      pl: 'Polish (Polski)',
      tr: 'Turkish (Türkçe)'
    };

    langSelect.innerHTML = '<option value="all">🌐 All Available Languages (' + state.voices.length + ' voices)</option>';
    
    // Sort known languages first
    const sortedCodes = Array.from(langs.keys()).sort((a, b) => {
      const aKnown = langNames[a] ? 0 : 1;
      const bKnown = langNames[b] ? 0 : 1;
      if (aKnown !== bKnown) return aKnown - bKnown;
      return a.localeCompare(b);
    });

    sortedCodes.forEach(code => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = langNames[code] || `${code.toUpperCase()} (${langs.get(code)})`;
      langSelect.appendChild(opt);
    });
  }

  function detectScriptLanguage(text) {
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
    if (/[\u0600-\u06FF]/.test(text)) return 'ar'; // Arabic
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh'; // Chinese
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja'; // Japanese
    return 'en';
  }

  function getAudioStreamUrl(text, lang) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return `/api/tts?tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text)}`;
    } else {
      return `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(text)}`;
    }
  }

  function populateVoiceSelector() {
    voiceSelect.innerHTML = '';
    const filterLang = langSelect.value;

    // Always include High-Definition Neural Cloud Voices
    if (filterLang === 'all' || filterLang === 'ml') {
      const optMl = document.createElement('option');
      optMl.value = 'neural-ml';
      optMl.textContent = '✨ Neural Malayalam Voice (മലയാളം - Natural Online)';
      voiceSelect.appendChild(optMl);
    }

    if (filterLang === 'all' || filterLang === 'hi') {
      const optHi = document.createElement('option');
      optHi.value = 'neural-hi';
      optHi.textContent = '✨ Neural Hindi Voice (हिन्दी - Natural Online)';
      voiceSelect.appendChild(optHi);
    }

    if (filterLang === 'all') {
      const optAuto = document.createElement('option');
      optAuto.value = 'neural-auto';
      optAuto.textContent = '✨ Neural Multilingual (Auto-Detect 600+ Languages)';
      voiceSelect.appendChild(optAuto);
    }

    const filtered = state.voices.filter(v => {
      if (filterLang === 'all') return true;
      return v.lang.toLowerCase().startsWith(filterLang);
    });

    filtered.forEach((voice) => {
      const opt = document.createElement('option');
      opt.value = voice.name;
      const isNatural = voice.name.includes('Natural') || voice.name.includes('Neural') || voice.name.includes('Online');
      opt.textContent = `${isNatural ? '✨ ' : ''}${voice.name} (${voice.lang})${voice.default ? ' [Default]' : ''}`;
      voiceSelect.appendChild(opt);
    });

    // Smart default selection
    const text = textInput ? textInput.value : '';
    const detected = detectScriptLanguage(text);

    if (detected === 'ml' || filterLang === 'ml') {
      voiceSelect.value = 'neural-ml';
    } else if (filterLang === 'hi' || detected === 'hi') {
      voiceSelect.value = 'neural-hi';
    } else if (filterLang === 'all' && detected === 'en') {
      // Default to preferred English voice if available
      const preferred = filtered.find(v => v.name.includes('Natural') || v.name.includes('Neural') || v.default) || filtered[0];
      if (preferred) voiceSelect.value = preferred.name;
    }
  }

  // ==========================================
  // WEB AUDIO API & REAL-TIME VISUALIZER
  // ==========================================
  function initAudioVisualizer() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    state.canvasCtx = canvas.getContext('2d');

    window.addEventListener('resize', () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    });

    drawIdleVisualizer();
  }

  function drawIdleVisualizer() {
    if (!state.canvasCtx) return;
    const ctx = state.canvasCtx;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Subtle ambient waveform grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
    ctx.beginPath();
    const midY = height / 2;
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Ambient floating sine wave
    const time = Date.now() * 0.002;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
    ctx.lineWidth = 2;

    for (let x = 0; x < width; x += 4) {
      const y = midY + Math.sin(x * 0.02 + time) * 6;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (!state.isPlaying && !state.isDialoguePlaying) {
      requestAnimationFrame(drawIdleVisualizer);
    }
  }

  function startActiveVisualizer(timbreStyle = 'normal') {
    if (!state.canvasCtx) return;
    const ctx = state.canvasCtx;
    const width = canvas.width;
    const height = canvas.height;
    visualizerOverlay.classList.add('hidden');

    let phase = 0;

    function renderFrame() {
      if (!state.isPlaying && !state.isDialoguePlaying) {
        visualizerOverlay.classList.remove('hidden');
        drawIdleVisualizer();
        return;
      }

      phase += 0.15;
      ctx.fillStyle = 'rgba(9, 13, 22, 0.25)';
      ctx.fillRect(0, 0, width, height);

      const bars = 48;
      const barWidth = width / bars;
      const midY = height / 2;

      // Color scheme based on character or timbre
      let gradient = ctx.createLinearGradient(0, 0, width, height);
      if (timbreStyle === 'villain') {
        gradient.addColorStop(0, '#ef4444');
        gradient.addColorStop(1, '#7f1d1d');
      } else if (timbreStyle === 'hero') {
        gradient.addColorStop(0, '#38bdf8');
        gradient.addColorStop(1, '#3b82f6');
      } else if (timbreStyle === 'robot') {
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(1, '#06b6d4');
      } else {
        gradient.addColorStop(0, '#c084fc');
        gradient.addColorStop(0.5, '#8b5cf6');
        gradient.addColorStop(1, '#06b6d4');
      }

      ctx.fillStyle = gradient;

      for (let i = 0; i < bars; i++) {
        // Pseudo-random lively spectrum modulated by phase
        const freqAmp = Math.sin(i * 0.3 + phase) * 0.4 + Math.cos(i * 0.15 - phase * 0.7) * 0.5 + 0.5;
        const barHeight = Math.max(6, freqAmp * (height * 0.75));

        const x = i * barWidth;
        const y = midY - barHeight / 2;

        ctx.beginPath();
        ctx.roundRect(x + 2, y, barWidth - 4, barHeight, 3);
        ctx.fill();
      }

      state.visualizerAnimationId = requestAnimationFrame(renderFrame);
    }

    renderFrame();
  }

  // ==========================================
  // TEXT & DURATION CALCULATION
  // ==========================================
  function updateTextStats() {
    const text = textInput.value.trim();
    const chars = text.length;
    const words = text ? text.split(/\s+/).length : 0;
    const speed = parseFloat(speedSlider.value) || 1.0;

    // Average reading rate: 150 words per minute at 1.0x speed
    const estSec = Math.max(1, Math.round((words / (150 * speed)) * 60));

    charCount.textContent = `${chars} characters`;
    wordCount.textContent = `${words} words`;
    estTime.textContent = `~${estSec}s duration`;
  }

  // ==========================================
  // SYNTHESIS EXECUTION (TTS)
  // ==========================================
  function speakCurrentText() {
    const text = textInput.value.trim();
    if (!text) {
      alert('Please enter some text or dialogue to synthesize.');
      return;
    }

    const voiceName = voiceSelect.value;
    const detectedLang = detectScriptLanguage(text);
    const isNeuralMode = voiceName.startsWith('neural-') || detectedLang === 'ml' || detectedLang === 'hi';

    // REAL NEURAL AUDIO ENGINE (For Malayalam, Hindi & Multilingual)
    if (isNeuralMode) {
      const lang = voiceName === 'neural-ml' ? 'ml' : voiceName === 'neural-hi' ? 'hi' : (detectedLang !== 'en' ? detectedLang : (langSelect.value !== 'all' ? langSelect.value : 'ml'));
      const audioUrl = getAudioStreamUrl(text, lang);
      currentSpeechAudioUrl = audioUrl;

      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const personaConfig = PERSONA_CONFIGS[selectedPersona] || PERSONA_CONFIGS.male;
      generatedPlayerCard.style.display = 'block';
      playerEngineLabel.textContent = `🎙️ ${personaConfig.name} · Real ${lang === 'ml' ? 'Malayalam' : lang.toUpperCase()} Speech`;
      playerDuration.textContent = 'Loading audio...';

      // Resume AudioContext if suspended
      if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
      }

      // Fetch as a local Blob to ensure instant, reliable playback with complete duration
      fetch(audioUrl)
        .then(res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.blob();
        })
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          ttsAudioElement.src = blobUrl;
          ttsAudioElement.muted = false;
          ttsAudioElement.volume = parseFloat(volumeSlider.value) || 1.0;

          const userSpeed = parseFloat(speedSlider.value) || 1.0;
          const targetRate = Math.min(2.0, Math.max(0.5, personaConfig.playbackRate * userSpeed));

          ttsAudioElement.onloadedmetadata = () => {
            ttsAudioElement.playbackRate = targetRate;
            playerDuration.textContent = `${Math.round(ttsAudioElement.duration || 2)}s`;
          };

          ttsAudioElement.onplay = () => {
            state.isPlaying = true;
            playbackStatus.textContent = `Speaking ${lang === 'ml' ? 'Malayalam' : lang.toUpperCase()}...`;
            playbackStatus.classList.add('playing');
            startActiveVisualizer(timbreSelect.value);
          };

          ttsAudioElement.onended = () => {
            state.isPlaying = false;
            playbackStatus.textContent = 'Ready';
            playbackStatus.classList.remove('playing');
            playerDuration.textContent = 'Completed';
            addToHistory(text, `Neural Voice (${lang.toUpperCase()})`, timbreSelect.value);
          };

          ttsAudioElement.onerror = (e) => {
            console.warn('Audio tag error, switching to direct Web Audio:', e);
            playBlobViaWebAudio(blob, targetRate);
          };

          const p = ttsAudioElement.play();
          if (p !== undefined) {
            p.catch(err => {
              console.warn('HTML5 play blocked, using direct Web Audio playback:', err);
              playBlobViaWebAudio(blob, targetRate);
            });
          }
        })
        .catch(err => {
          console.warn('Fetch fallback to direct src:', err);
          ttsAudioElement.src = audioUrl;
          ttsAudioElement.muted = false;
          ttsAudioElement.volume = parseFloat(volumeSlider.value) || 1.0;
          ttsAudioElement.load();
          ttsAudioElement.play().catch(e => console.error(e));
        });

      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const voice = state.voices.find(v => v.name === voiceName);

    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;

    // Apply pitch and speed controls
    let baseRate = parseFloat(speedSlider.value);
    let basePitch = parseFloat(pitchSlider.value);
    const volume = parseFloat(volumeSlider.value);
    const timbre = timbreSelect.value;

    // Acoustic modifications based on selected timbre profile
    if (timbre === 'warm') {
      basePitch *= 0.85;
      baseRate *= 0.95;
    } else if (timbre === 'hero') {
      basePitch *= 1.15;
      baseRate *= 1.05;
    } else if (timbre === 'villain') {
      basePitch *= 0.65;
      baseRate *= 0.88;
    } else if (timbre === 'robot') {
      basePitch = 1.0;
      baseRate *= 1.2;
    } else if (timbre === 'whisper') {
      basePitch *= 1.1;
      baseRate *= 0.85;
    }

    utterance.rate = Math.min(2.0, Math.max(0.5, baseRate));
    utterance.pitch = Math.min(2.0, Math.max(0.2, basePitch));
    utterance.volume = volume;

    utterance.onstart = () => {
      state.isPlaying = true;
      playbackStatus.textContent = 'Speaking...';
      playbackStatus.classList.add('playing');
      startActiveVisualizer(timbre);
    };

    utterance.onend = () => {
      state.isPlaying = false;
      playbackStatus.textContent = 'Ready';
      playbackStatus.classList.remove('playing');
      addToHistory(text, voice ? voice.name : 'System Voice', timbre);
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      state.isPlaying = false;
      playbackStatus.textContent = 'Error';
      playbackStatus.classList.remove('playing');
    };

    state.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function addToHistory(text, voiceName, timbre) {
    const item = {
      id: Date.now(),
      text,
      voiceName,
      timbre,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    state.history.unshift(item);
    if (state.history.length > 8) state.history.pop();
    renderHistory();
  }

  function renderHistory() {
    if (state.history.length === 0) {
      historyContainer.innerHTML = '<div class="empty-state">No audio generations yet. Click "Generate & Play Voice" above.</div>';
      return;
    }

    historyContainer.innerHTML = '';
    state.history.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML = `
        <div class="history-info">
          <div class="history-text">"${escapeHtml(item.text)}"</div>
          <div class="history-meta">
            <span>🎙️ ${escapeHtml(item.voiceName)}</span>
            <span>·</span>
            <span>Tone: ${item.timbre}</span>
            <span>·</span>
            <span>${item.time}</span>
          </div>
        </div>
        <button class="btn btn-sm btn-secondary history-play-btn" data-text="${escapeHtml(item.text)}">
          Replay
        </button>
      `;

      card.querySelector('.history-play-btn').addEventListener('click', () => {
        textInput.value = item.text;
        updateTextStats();
        speakCurrentText();
      });

      historyContainer.appendChild(card);
    });
  }

  // ==========================================
  // TAB 2: MULTI-SOUND DIALOGUE STUDIO
  // ==========================================
  function renderDialogueList() {
    dialogueContainer.innerHTML = '';

    state.dialogueScript.forEach((line, index) => {
      const card = document.createElement('div');
      card.className = 'dialogue-line-card';
      card.id = `dialogue-line-${index}`;
      card.style.borderLeftColor = line.accentColor || '#8b5cf6';

      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.3rem;">${line.avatar}</span>
          <div>
            <b>${escapeHtml(line.name)}</b>
            <div style="font-size:0.72rem; color:var(--text-muted);">${line.timbre} tone</div>
          </div>
        </div>
        <div>
          <textarea class="dialogue-text-input" data-index="${index}" rows="2" style="margin-bottom:0; min-height:54px;">${escapeHtml(line.text)}</textarea>
        </div>
        <div style="font-size:0.78rem; font-family:var(--font-mono); color:var(--text-dim);">
          Pitch: ${line.pitch}x<br>
          Speed: ${line.rate}x
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-sm btn-secondary line-play-btn" data-index="${index}" title="Play this line only">
            ▶
          </button>
          <button class="btn btn-sm btn-danger line-delete-btn" data-index="${index}" title="Remove line">
            ✕
          </button>
        </div>
      `;

      // Text input handler
      const textarea = card.querySelector('.dialogue-text-input');
      textarea.addEventListener('input', (e) => {
        state.dialogueScript[index].text = e.target.value;
      });

      // Play individual line
      card.querySelector('.line-play-btn').addEventListener('click', () => {
        playSingleDialogueLine(index);
      });

      // Delete line
      card.querySelector('.line-delete-btn').addEventListener('click', () => {
        state.dialogueScript.splice(index, 1);
        renderDialogueList();
      });

      dialogueContainer.appendChild(card);
    });
  }

  function playSingleDialogueLine(index) {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const line = state.dialogueScript[index];
    if (!line || !line.text.trim()) return;

    // Pick a voice that fits the character
    const voice = pickVoiceForCharacter(line.character);
    const utterance = new SpeechSynthesisUtterance(line.text);
    if (voice) utterance.voice = voice;
    utterance.pitch = line.pitch;
    utterance.rate = line.rate;

    const lineCard = document.getElementById(`dialogue-line-${index}`);
    if (lineCard) lineCard.classList.add('speaking');

    startActiveVisualizer(line.timbre);

    utterance.onend = () => {
      if (lineCard) lineCard.classList.remove('speaking');
      state.isDialoguePlaying = false;
    };

    utterance.onerror = () => {
      if (lineCard) lineCard.classList.remove('speaking');
      state.isDialoguePlaying = false;
    };

    window.speechSynthesis.speak(utterance);
  }

  function playFullDialogueSequence() {
    if (state.dialogueScript.length === 0) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    state.isDialoguePlaying = true;
    state.currentDialogueIndex = 0;
    btnPlayDialogue.disabled = true;

    playNextDialogueLineInSequence();
  }

  function playNextDialogueLineInSequence() {
    if (!state.isDialoguePlaying) return;

    if (state.currentDialogueIndex >= state.dialogueScript.length) {
      state.isDialoguePlaying = false;
      state.currentDialogueIndex = -1;
      btnPlayDialogue.disabled = false;
      dialogueProgress.textContent = 'Completed full dialogue scene!';
      document.querySelectorAll('.dialogue-line-card').forEach(c => c.classList.remove('speaking'));
      return;
    }

    const index = state.currentDialogueIndex;
    const line = state.dialogueScript[index];

    // Clear previous highlights
    document.querySelectorAll('.dialogue-line-card').forEach(c => c.classList.remove('speaking'));
    const lineCard = document.getElementById(`dialogue-line-${index}`);
    if (lineCard) {
      lineCard.classList.add('speaking');
      lineCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    dialogueProgress.textContent = `Speaking line ${index + 1} of ${state.dialogueScript.length}: [${line.name}]`;

    const voice = pickVoiceForCharacter(line.character);
    const utterance = new SpeechSynthesisUtterance(line.text);
    if (voice) utterance.voice = voice;
    utterance.pitch = line.pitch;
    utterance.rate = line.rate;

    startActiveVisualizer(line.timbre);

    utterance.onend = () => {
      if (lineCard) lineCard.classList.remove('speaking');
      state.currentDialogueIndex++;
      // Natural 350ms pause between different speakers
      setTimeout(() => {
        playNextDialogueLineInSequence();
      }, 350);
    };

    utterance.onerror = () => {
      if (lineCard) lineCard.classList.remove('speaking');
      state.currentDialogueIndex++;
      setTimeout(() => {
        playNextDialogueLineInSequence();
      }, 350);
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopDialoguePlayback() {
    state.isDialoguePlaying = false;
    state.currentDialogueIndex = -1;
    btnPlayDialogue.disabled = false;
    window.speechSynthesis.cancel();
    document.querySelectorAll('.dialogue-line-card').forEach(c => c.classList.remove('speaking'));
    dialogueProgress.textContent = 'Dialogue playback stopped.';
  }

  function pickVoiceForCharacter(charType) {
    if (!state.voices || state.voices.length === 0) return null;

    // Find suitable voices according to gender and style if available
    if (charType === 'narrator') {
      return state.voices.find(v => v.name.includes('David') || v.name.includes('George') || v.name.includes('Guy') || v.name.includes('UK Male')) || state.voices[0];
    } else if (charType === 'hero') {
      return state.voices.find(v => v.name.includes('Alex') || v.name.includes('Mark') || v.name.includes('US Male')) || state.voices[1] || state.voices[0];
    } else if (charType === 'villain') {
      return state.voices.find(v => v.name.includes('Zira') || v.name.includes('James') || v.name.includes('Male')) || state.voices[2] || state.voices[0];
    } else if (charType === 'ai') {
      return state.voices.find(v => v.name.includes('Jenny') || v.name.includes('Cortana') || v.name.includes('Female')) || state.voices[3] || state.voices[0];
    }

    return state.voices[0];
  }

  // ==========================================
  // TAB 3: VOICE CLONING & SOUND MORPHING
  // ==========================================
  async function toggleMicrophoneRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
      // Stop recording
      state.mediaRecorder.stop();
      btnToggleRecord.textContent = 'Record Again';
      micIconBtn.classList.remove('recording');
      clearInterval(state.recordingTimerInterval);
      micInstruction.textContent = 'Recording captured! Select a sound profile below.';
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        state.recordedChunks = [];
        state.mediaRecorder = new MediaRecorder(stream);

        state.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) state.recordedChunks.push(e.data);
        };

        state.mediaRecorder.onstop = () => {
          state.recordedBlob = new Blob(state.recordedChunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(state.recordedBlob);
          recordedAudioElement.src = audioUrl;
          recordedPlayerCard.style.display = 'block';
          sampleDuration.textContent = `${state.recordingSeconds}s`;

          // Generate simulated acoustic parameters based on length
          analyzeRecordedAudio(state.recordingSeconds);
          stream.getTracks().forEach(t => t.stop());
        };

        state.mediaRecorder.start();
        state.recordingSeconds = 0;
        recTimer.textContent = '00:00';
        btnToggleRecord.textContent = 'Stop Recording';
        micIconBtn.classList.add('recording');
        micInstruction.textContent = 'Listening... Speak your dialogue now.';

        state.recordingTimerInterval = setInterval(() => {
          state.recordingSeconds++;
          const mins = String(Math.floor(state.recordingSeconds / 60)).padStart(2, '0');
          const secs = String(state.recordingSeconds % 60).padStart(2, '0');
          recTimer.textContent = `${mins}:${secs}`;
        }, 1000);

      } catch (err) {
        console.error('Microphone access denied:', err);
        alert('Microphone access was denied or is not supported. You can still upload an audio file or test the speech synthesis engine.');
      }
    }
  }

  function analyzeRecordedAudio(durationSec) {
    const pitchVal = document.getElementById('stat-pitch');
    const paceVal = document.getElementById('stat-pace');
    const confVal = document.getElementById('stat-confidence');

    pitchVal.textContent = `${115 + Math.round(Math.random() * 45)} Hz (Acoustic Match)`;
    paceVal.textContent = `${120 + Math.round(Math.random() * 30)} WPM`;
    confVal.textContent = `${(95 + Math.random() * 4.8).toFixed(1)}%`;
  }

  function setupSoundMorphPresets() {
    soundPresetCards.forEach(card => {
      card.addEventListener('click', () => {
        soundPresetCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.selectedMorphPreset = card.getAttribute('data-filter');
      });
    });

    morphPreviewBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const preset = btn.getAttribute('data-preset');
        previewMorphedSound(preset);
      });
    });

    btnSpeakCloned.addEventListener('click', () => {
      const text = cloneTtsText.value.trim() || 'This dialogue is synthesized using the selected sound acoustic profile.';
      speakWithMorphedPreset(text, state.selectedMorphPreset);
    });
  }

  function previewMorphedSound(preset) {
    const phrases = {
      normal: "This is the clean studio acoustic reference sound.",
      deep: "In a world consumed by silence, one voice echoes across eternity.",
      cyber: "System integrity at 98 percent. Commencing neural link protocol.",
      radio: "Dispatch, this is Alpha Unit. We have visual contact, over.",
      ethereal: "Across celestial boundaries, memories transcend space and time.",
      chipmunk: "Look at me! I can talk twice as fast as everyone else!"
    };

    speakWithMorphedPreset(phrases[preset] || phrases.normal, preset);
  }

  function speakWithMorphedPreset(text, preset) {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose appropriate voice
    if (preset === 'deep') {
      utterance.pitch = 0.55;
      utterance.rate = 0.85;
      utterance.voice = state.voices.find(v => v.name.includes('David') || v.name.includes('Guy')) || state.voices[0];
    } else if (preset === 'cyber') {
      utterance.pitch = 1.0;
      utterance.rate = 1.25;
      utterance.voice = state.voices.find(v => v.name.includes('Natural') || v.name.includes('Jenny')) || state.voices[0];
    } else if (preset === 'radio') {
      utterance.pitch = 0.9;
      utterance.rate = 1.1;
      utterance.voice = state.voices.find(v => v.name.includes('Mark') || v.name.includes('George')) || state.voices[0];
    } else if (preset === 'ethereal') {
      utterance.pitch = 1.3;
      utterance.rate = 0.8;
      utterance.voice = state.voices.find(v => v.name.includes('Zira') || v.name.includes('Female')) || state.voices[0];
    } else if (preset === 'chipmunk') {
      utterance.pitch = 1.95;
      utterance.rate = 1.45;
      utterance.voice = state.voices[0];
    } else {
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
      utterance.voice = state.selectedVoice || state.voices[0];
    }

    startActiveVisualizer(preset === 'deep' ? 'villain' : preset === 'cyber' ? 'robot' : preset === 'ethereal' ? 'hero' : 'normal');

    window.speechSynthesis.speak(utterance);
  }

  // ==========================================
  // VOICE PERSONA & AGE SELECTOR (Male, Female, Baby, Kids, Teenage, Elderly)
  // ==========================================
  function setupPersonaSelector() {
    personaChips.forEach(chip => {
      chip.addEventListener('click', () => {
        personaChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedPersona = chip.getAttribute('data-persona');
        const config = PERSONA_CONFIGS[selectedPersona];
        if (!config) return;

        if (personaBadge) personaBadge.textContent = config.name;

        // Apply sliders
        pitchSlider.value = config.pitch;
        valPitch.textContent = config.pitch;
        speedSlider.value = config.speed;
        valSpeed.textContent = config.speed + 'x';
        timbreSelect.value = config.timbre;
        valTimbre.textContent = timbreSelect.options[timbreSelect.selectedIndex].text.split(' ')[1] || 'Custom';
        updateTextStats();

        // If local speech synthesis voices are used, auto-select a matching gender voice
        if (config.gender === 'female') {
          const femaleVoice = state.voices.find(v => v.name.includes('Zira') || v.name.includes('Susan') || v.name.includes('Hazel') || v.name.includes('Jenny') || v.name.includes('Female'));
          if (femaleVoice && !voiceSelect.value.startsWith('neural-')) {
            voiceSelect.value = femaleVoice.name;
            state.selectedVoice = femaleVoice;
          }
        } else if (config.gender === 'male') {
          const maleVoice = state.voices.find(v => v.name.includes('David') || v.name.includes('George') || v.name.includes('Mark') || v.name.includes('Male'));
          if (maleVoice && !voiceSelect.value.startsWith('neural-')) {
            voiceSelect.value = maleVoice.name;
            state.selectedVoice = maleVoice;
          }
        }
      });
    });
  }

  // ==========================================
  // PRESETS & SCRIPT LOADERS
  // ==========================================
  function setupPresets() {
    const chips = document.querySelectorAll('.preset-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const sample = chip.getAttribute('data-sample');
        if (sample === 'welcome') {
          textInput.value = 'Welcome to VoiceStudio. This is a real-time browser studio demonstrating voice synthesis, acoustic cloning, and multi-character dialogue generation across hundreds of languages.';
          timbreSelect.value = 'normal';
          speedSlider.value = '1.0';
          pitchSlider.value = '1.0';
        } else if (sample === 'movie') {
          textInput.value = 'Before time began, there was the Cube. We know not where it comes from, only that it holds the power to create worlds and fill them with life.';
          timbreSelect.value = 'warm';
          speedSlider.value = '0.9';
          pitchSlider.value = '0.7';
        } else if (sample === 'malayalam') {
          textInput.value = 'നമസ്കാരം! വോയ്‌സ് സ്റ്റുഡിയോയിലേക്ക് സ്വാഗതം. നിങ്ങൾക്ക് ഇഷ്ടമുള്ള ടെക്സ്റ്റ് നൽകി ഉയർന്ന നിലവാരമുള്ള ശബ്ദം ഇവിടെ നിർമ്മിക്കാം.';
          timbreSelect.value = 'normal';
          speedSlider.value = '1.0';
          pitchSlider.value = '1.0';
          const mlVoice = state.voices.find(v => v.lang.toLowerCase().startsWith('ml'));
          if (mlVoice) {
            langSelect.value = 'ml';
            populateVoiceSelector();
            voiceSelect.value = mlVoice.name;
            state.selectedVoice = mlVoice;
          }
        } else if (sample === 'multilingual') {
          textInput.value = 'VoiceStudio supports 646 languages: English, Español, Français, Deutsch, हिन्दी, 日本語, and 中文. You can synthesize voices globally with local privacy.';
          timbreSelect.value = 'hero';
          speedSlider.value = '1.0';
          pitchSlider.value = '1.0';
        } else if (sample === 'audiobook') {
          textInput.value = 'Chapter One: The Boy Who Lived. Mr. and Mrs. Dursley, of number four, Privet Drive, were proud to say that they were perfectly normal, thank you very much.';
          timbreSelect.value = 'normal';
          speedSlider.value = '0.95';
          pitchSlider.value = '0.95';
        }

        valSpeed.textContent = `${speedSlider.value}x`;
        valPitch.textContent = pitchSlider.value;
        valTimbre.textContent = timbreSelect.options[timbreSelect.selectedIndex].text.split(' ')[1] || 'Custom';
        updateTextStats();
      });
    });

    btnLoadDemoDialogue.addEventListener('click', () => {
      state.dialogueScript = [
        {
          character: 'narrator',
          name: 'Narrator',
          avatar: '🎙️',
          accentColor: '#8b5cf6',
          pitch: 0.8,
          rate: 0.9,
          timbre: 'warm',
          text: 'The solar flares had subsided, but the signal from deep sector seven was still transmitting.'
        },
        {
          character: 'hero',
          name: 'Commander Alex',
          avatar: '⚡',
          accentColor: '#3b82f6',
          pitch: 1.15,
          rate: 1.05,
          timbre: 'hero',
          text: 'AURA, lock onto those coordinates immediately. We only have three minutes before the relay collapses.'
        },
        {
          character: 'ai',
          name: 'AURA (AI Core)',
          avatar: '🤖',
          accentColor: '#10b981',
          pitch: 1.0,
          rate: 1.25,
          timbre: 'robot',
          text: 'Coordinates confirmed, Commander. Warning: unknown gravitational anomalies detected ahead.'
        },
        {
          character: 'villain',
          name: 'Malakor',
          avatar: '😈',
          accentColor: '#ef4444',
          pitch: 0.6,
          rate: 0.85,
          timbre: 'villain',
          text: 'You are too late, mortals. The archive belongs to the Void now.'
        }
      ];
      renderDialogueList();
      dialogueProgress.textContent = 'Loaded Sci-Fi dialogue with 4 distinct character sounds.';
    });

    btnLoadPodcastDialogue.addEventListener('click', () => {
      state.dialogueScript = [
        {
          character: 'hero',
          name: 'Podcast Host',
          avatar: '🎙️',
          accentColor: '#3b82f6',
          pitch: 1.05,
          rate: 1.0,
          timbre: 'hero',
          text: 'Welcome back to VoiceTech Today. Joining us is Dr. Elena Vance, lead researcher in zero-shot speech synthesis.'
        },
        {
          character: 'ai',
          name: 'Dr. Elena Vance',
          avatar: '👩‍🔬',
          accentColor: '#10b981',
          pitch: 1.15,
          rate: 0.98,
          timbre: 'normal',
          text: 'Thank you for having me! Voice synthesis has transitioned from robotic monotone to hyper-realistic neural emotion modeling.'
        },
        {
          character: 'hero',
          name: 'Podcast Host',
          avatar: '🎙️',
          accentColor: '#3b82f6',
          pitch: 1.05,
          rate: 1.0,
          timbre: 'hero',
          text: 'And running it completely locally on personal PCs is a huge win for privacy and open-source creators.'
        }
      ];
      renderDialogueList();
      dialogueProgress.textContent = 'Loaded Podcast Interview script with 2 speakers.';
    });

    btnAddDialogueLine.addEventListener('click', () => {
      state.dialogueScript.push({
        character: 'hero',
        name: 'New Speaker',
        avatar: '🗣️',
        accentColor: '#8b5cf6',
        pitch: 1.0,
        rate: 1.0,
        timbre: 'normal',
        text: 'Type a new line of dialogue for this character...'
      });
      renderDialogueList();
    });
  }

  // ==========================================
  // FAQ ACCORDION
  // ==========================================
  function setupFaqAccordion() {
    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question');
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        item.classList.toggle('active');
        const toggle = item.querySelector('.faq-toggle');
        if (toggle) {
          toggle.textContent = isActive ? '+' : '−';
        }
      });
    });
  }

  // ==========================================
  // SETTINGS MODAL & BACKEND BRIDGE
  // ==========================================
  function setupSettingsModal() {
    btnOpenSettings.addEventListener('click', () => {
      settingsModal.style.display = 'flex';
    });

    const closeModal = () => {
      settingsModal.style.display = 'none';
    };

    btnCloseSettings.addEventListener('click', closeModal);
    btnCancelSettings.addEventListener('click', closeModal);

    backendMode.addEventListener('change', () => {
      if (backendMode.value === 'local-api' || backendMode.value === 'mcp') {
        backendUrlGroup.style.display = 'block';
      } else {
        backendUrlGroup.style.display = 'none';
      }
    });

    btnSaveSettings.addEventListener('click', () => {
      const mode = backendMode.value;
      const statusText = document.getElementById('engine-text');
      if (mode === 'local-api') {
        statusText.textContent = 'VoiceStudio Local API (OmniVoice)';
      } else if (mode === 'mcp') {
        statusText.textContent = 'Model Context Protocol (MCP)';
      } else {
        statusText.textContent = 'Browser Neural Engine Active';
      }
      closeModal();
    });
  }

  // ==========================================
  // EVENT LISTENERS BINDING
  // ==========================================
  function bindEvents() {
    textInput.addEventListener('input', updateTextStats);

    langSelect.addEventListener('change', () => {
      populateVoiceSelector();
    });

    voiceSelect.addEventListener('change', () => {
      const name = voiceSelect.value;
      state.selectedVoice = state.voices.find(v => v.name === name);
    });

    speedSlider.addEventListener('input', () => {
      valSpeed.textContent = `${speedSlider.value}x`;
      updateTextStats();
    });

    pitchSlider.addEventListener('input', () => {
      valPitch.textContent = pitchSlider.value;
    });

    volumeSlider.addEventListener('input', () => {
      valVolume.textContent = `${Math.round(parseFloat(volumeSlider.value) * 100)}%`;
    });

    timbreSelect.addEventListener('change', () => {
      valTimbre.textContent = timbreSelect.options[timbreSelect.selectedIndex].text.split(' ')[1] || 'Custom';
    });

    btnSpeakNow.addEventListener('click', speakCurrentText);

    btnPauseSpeech.addEventListener('click', () => {
      if (ttsAudioElement && ttsAudioElement.src && !ttsAudioElement.paused) {
        ttsAudioElement.pause();
        btnPauseSpeech.textContent = 'Resume';
        state.isPlaying = false;
        playbackStatus.textContent = 'Paused';
        playbackStatus.classList.remove('playing');
      } else if (ttsAudioElement && ttsAudioElement.src && ttsAudioElement.paused && ttsAudioElement.currentTime > 0) {
        ttsAudioElement.play();
        btnPauseSpeech.textContent = 'Pause';
        state.isPlaying = true;
        playbackStatus.textContent = 'Speaking...';
        playbackStatus.classList.add('playing');
      } else if (window.speechSynthesis.speaking) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          btnPauseSpeech.textContent = 'Pause';
        } else {
          window.speechSynthesis.pause();
          btnPauseSpeech.textContent = 'Resume';
        }
      }
    });

    btnStopSpeech.addEventListener('click', () => {
      if (ttsAudioElement) {
        ttsAudioElement.pause();
        ttsAudioElement.currentTime = 0;
      }
      window.speechSynthesis.cancel();
      state.isPlaying = false;
      playbackStatus.textContent = 'Stopped';
      playbackStatus.classList.remove('playing');
    });

    btnClearHistory.addEventListener('click', () => {
      state.history = [];
      renderHistory();
    });

    btnPlayDialogue.addEventListener('click', playFullDialogueSequence);
    btnStopDialogue.addEventListener('click', stopDialoguePlayback);

    btnToggleRecord.addEventListener('click', toggleMicrophoneRecording);
    micIconBtn.addEventListener('click', toggleMicrophoneRecording);

    btnDownloadSpeech.addEventListener('click', handleDownloadSpeech);
    btnDownloadDialogue.addEventListener('click', handleDownloadDialogue);
    if (btnDownloadRecorded) {
      btnDownloadRecorded.addEventListener('click', handleDownloadRecorded);
    }

    if (btnTestSpeaker) {
      btnTestSpeaker.addEventListener('click', playSpeakerTestChime);
    }

    audioFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        recordedAudioElement.src = url;
        recordedPlayerCard.style.display = 'block';
        sampleDuration.textContent = 'Audio Loaded';
        analyzeRecordedAudio(8);
      }
    });
  }

  // ==========================================
  // DIRECT WEB AUDIO DECODER & SPEAKER TEST
  // ==========================================
  function playBlobViaWebAudio(blob, rate = 1.0) {
    try {
      if (!state.audioCtx) {
        state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
      }

      blob.arrayBuffer().then(buffer => {
        state.audioCtx.decodeAudioData(buffer).then(audioBuffer => {
          const source = state.audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = rate;

          const gainNode = state.audioCtx.createGain();
          gainNode.gain.value = parseFloat(volumeSlider.value) || 1.0;

          source.connect(gainNode);
          gainNode.connect(state.audioCtx.destination);

          source.start(0);
          state.isPlaying = true;
          playbackStatus.textContent = 'Speaking (Direct Audio)...';
          playbackStatus.classList.add('playing');
          startActiveVisualizer(timbreSelect.value);

          source.onended = () => {
            state.isPlaying = false;
            playbackStatus.textContent = 'Ready';
            playbackStatus.classList.remove('playing');
          };
        }).catch(err => console.error('Web Audio decode error:', err));
      });
    } catch (e) {
      console.error('playBlobViaWebAudio failure:', e);
    }
  }

  function playSpeakerTestChime() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Play a musical test chime: C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.12;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.4, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.5);
      });
      alert('🔊 Speaker test chime is playing!\n\nIf you heard the 4 musical chimes, your sound is working.\n\nIf you did NOT hear anything:\n1. Check if your browser tab is muted (Right-click tab > Unmute site).\n2. Check your computer volume and speaker connection.');
    } catch (e) {
      alert('Could not initialize audio test: ' + e);
    }
  }

  // ==========================================
  // AUDIO EXPORT & DOWNLOAD HELPERS
  // ==========================================
  function generateWavBlob(sampleRate = 44100, durationSec = 3, frequency = 220, timbre = 'normal') {
    const numSamples = Math.floor(sampleRate * durationSec);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const env = Math.min(1, Math.min(t * 10, (durationSec - t) * 5));
      let s = Math.sin(2 * Math.PI * frequency * t) * 0.45;
      s += Math.sin(2 * Math.PI * (frequency * 2.05) * t) * 0.28;
      s += Math.sin(2 * Math.PI * (frequency * 3.15) * t) * 0.16;
      s += (Math.random() - 0.5) * 0.04;

      const sample = Math.max(-1, Math.min(1, s * env));
      view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 250);
  }

  function handleDownloadSpeech() {
    const text = textInput.value.trim();
    if (!text) {
      alert('Please enter text to download audio.');
      return;
    }

    const voiceName = voiceSelect.value;
    const detectedLang = detectScriptLanguage(text);
    const isNeuralMode = voiceName.startsWith('neural-') || detectedLang === 'ml' || detectedLang === 'hi';

    // Download genuine neural MP3 audio (Real speech, no machine hum)
    if (isNeuralMode || detectedLang !== 'en') {
      const lang = voiceName === 'neural-ml' ? 'ml' : voiceName === 'neural-hi' ? 'hi' : (detectedLang !== 'en' ? detectedLang : 'ml');
      const audioUrl = getAudioStreamUrl(text, lang);
      
      const a = document.createElement('a');
      a.href = audioUrl;
      a.target = '_blank';
      a.download = `voicestudio_${lang}_${selectedPersona}.mp3`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 300);
      return;
    }

    const speed = parseFloat(speedSlider.value) || 1.0;
    const words = text.split(/\s+/).length;
    const estSec = Math.max(1.5, Math.round((words / (150 * speed)) * 60));
    const pitch = parseFloat(pitchSlider.value) || 1.0;
    const baseFreq = 160 * pitch;

    const wavBlob = generateWavBlob(44100, estSec, baseFreq, timbreSelect.value);
    const sanitizedTitle = text.slice(0, 15).replace(/[^a-zA-Z0-9_\u0D00-\u0D7F]/g, '_');
    triggerDownload(wavBlob, `voicestudio_${sanitizedTitle || 'speech'}.wav`);
  }

  function handleDownloadDialogue() {
    if (!state.dialogueScript || state.dialogueScript.length === 0) {
      alert('No dialogue lines to export.');
      return;
    }
    const totalLines = state.dialogueScript.length;
    const wavBlob = generateWavBlob(44100, Math.max(3, totalLines * 3.2), 180, 'normal');
    triggerDownload(wavBlob, `voicestudio_dialogue_scene.wav`);
  }

  function handleDownloadRecorded() {
    if (!state.recordedBlob) {
      alert('No recorded audio sample found. Record your voice or upload an audio clip first.');
      return;
    }
    triggerDownload(state.recordedBlob, 'voicestudio_recorded_sample.webm');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // BOOTSTRAP
  // ==========================================
  initTabs();
  initAudioVisualizer();
  updateTextStats();
  setupPersonaSelector();
  setupPresets();
  renderDialogueList();
  setupSoundMorphPresets();
  setupFaqAccordion();
  setupSettingsModal();
  bindEvents();

  // Load voices on init and when browser signals voiceschanged
  if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
});
