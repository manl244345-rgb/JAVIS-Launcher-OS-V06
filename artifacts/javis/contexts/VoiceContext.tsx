import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import React, {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from "react";
import { Platform } from "react-native";

import {
  JONATHAN_VOICE_PROFILE,
  KOKORO_DEFAULT_API,
  VoiceProviderType,
} from "@/constants/config";
import { useAI } from "./AIContext";

export type VoiceGender = "male" | "female" | "neutral";

export interface VoiceProfile {
  id: string;
  name: string;
  gender: VoiceGender;
  pitch: number;
  rate: number;
  desc?: string;
}

export const PRESET_PROFILES: VoiceProfile[] = [
  {
    id: "jonathan-livingston",
    name: "Jonathan Livingston",
    gender: "male",
    pitch: JONATHAN_VOICE_PROFILE.pitch,
    rate: JONATHAN_VOICE_PROFILE.rate,
    desc: "Authentic, calming & pleasant — Default",
  },
  { id: "deep-male",      name: "Deep Male",       gender: "male",    pitch: 0.70, rate: 0.85 },
  { id: "jarvis-classic", name: "JAVIS Classic",   gender: "male",    pitch: 0.75, rate: 0.90 },
  { id: "professional",   name: "Professional",    gender: "male",    pitch: 0.85, rate: 0.95 },
  { id: "natural-female", name: "Natural Female",  gender: "female",  pitch: 1.15, rate: 0.95 },
  { id: "soft-female",    name: "Soft Female",     gender: "female",  pitch: 1.25, rate: 0.90 },
  { id: "neutral-ai",     name: "Neutral AI",      gender: "neutral", pitch: 1.00, rate: 1.00 },
];

export function detectGender(voice: Speech.Voice): VoiceGender {
  const n = (voice.name || voice.identifier || "").toLowerCase();
  const f = ["female","woman","girl","alice","anna","emily","sarah","lisa","zira","samantha",
    "victoria","fiona","karen","moira","tessa","veena","bella","emma","isabella"];
  const m = ["male","man","guy","james","david","daniel","alex","tom","fred","jorge","luca",
    "adam","michael","george","lewis","oliver","rishi"];
  if (f.some(w => n.includes(w))) return "female";
  if (m.some(w => n.includes(w))) return "male";
  return "neutral";
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export interface VoiceSettings {
  provider: VoiceProviderType;
  profileId: string;
  genderFilter: VoiceGender | "all";
  systemVoiceId: string;
  elevenlabsApiKey: string;
  elevenlabsVoiceId: string;
  elevenlabsModel: string;
  kokoroApiUrl: string;
  kokoroVoice: string;
  jonathanCloned: boolean;
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  provider: "kokoro",                       // ← Kokoro is default
  profileId: "jonathan-livingston",
  genderFilter: "all",
  systemVoiceId: "",
  elevenlabsApiKey: "",
  elevenlabsVoiceId: "",
  elevenlabsModel: "eleven_turbo_v2_5",
  kokoroApiUrl: KOKORO_DEFAULT_API,         // public HF space
  kokoroVoice: "am_adam",                   // deep American male (closest to Jonathan)
  jonathanCloned: false,
};

export interface VoiceContextType {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  voiceSettings: VoiceSettings;
  updateVoiceSettings: (s: Partial<VoiceSettings>) => Promise<void>;
  presetProfiles: VoiceProfile[];
  systemVoices: Speech.Voice[];
  cloneJonathanVoice: () => Promise<{ success: boolean; error?: string }>;
  testVoice: () => void;
  isCloning: boolean;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [transcript, setTranscript]   = useState("");
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [systemVoices, setSystemVoices]   = useState<Speech.Voice[]>([]);
  const [isCloning, setIsCloning]         = useState(false);

  const { setAIState, sendMessage } = useAI();

  const sendMessageRef     = useRef(sendMessage);
  const setAIStateRef      = useRef(setAIState);
  const voiceSettingsRef   = useRef(voiceSettings);
  const systemVoicesRef    = useRef(systemVoices);
  const transcriptRef      = useRef(transcript);
  const recognitionRef     = useRef<any>(null);
  const silenceRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSoundRef    = useRef<Audio.Sound | null>(null);

  useEffect(() => { sendMessageRef.current = sendMessage; },     [sendMessage]);
  useEffect(() => { setAIStateRef.current = setAIState; },       [setAIState]);
  useEffect(() => { voiceSettingsRef.current = voiceSettings; },  [voiceSettings]);
  useEffect(() => { systemVoicesRef.current = systemVoices; },    [systemVoices]);
  useEffect(() => { transcriptRef.current = transcript; },        [transcript]);

  useEffect(() => {
    loadPreferences();
    loadSystemVoices();
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  const loadSystemVoices = async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const eng = voices.filter(v => (v.language || "").toLowerCase().startsWith("en"));
      setSystemVoices(eng.length > 0 ? eng : voices);
    } catch (_) {}
  };

  const loadPreferences = async () => {
    const raw = await AsyncStorage.getItem("javis_voice_settings_v2");
    if (raw) {
      try { setVoiceSettings({ ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(raw) }); } catch (_) {}
    }
  };

  const updateVoiceSettings = useCallback(async (updates: Partial<VoiceSettings>) => {
    const next = { ...voiceSettingsRef.current, ...updates };
    setVoiceSettings(next);
    voiceSettingsRef.current = next;
    await AsyncStorage.setItem("javis_voice_settings_v2", JSON.stringify(next));
  }, []);

  // ── Binary audio playback (Kokoro / ElevenLabs) ──────────────────────────
  const playBinaryAudio = useCallback(async (
    url: string,
    method: "GET" | "POST",
    headers: Record<string, string>,
    body?: string,
  ): Promise<boolean> => {
    try {
      // Stop anything currently playing
      if (currentSoundRef.current) {
        await currentSoundRef.current.stopAsync().catch(() => {});
        await currentSoundRef.current.unloadAsync().catch(() => {});
        currentSoundRef.current = null;
      }

      const resp = await fetch(url, { method, headers, body });
      if (!resp.ok) {
        console.warn(`[Voice] HTTP ${resp.status} from ${url}`);
        return false;
      }

      const arrayBuf = await resp.arrayBuffer();
      const base64   = uint8ToBase64(new Uint8Array(arrayBuf));
      const tmpPath  = `${FileSystem.cacheDirectory}javis_tts_${Date.now()}.mp3`;

      await FileSystem.writeAsStringAsync(tmpPath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { sound } = await Audio.Sound.createAsync({ uri: tmpPath });
      currentSoundRef.current = sound;

      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          setIsSpeaking(false);
          setAIStateRef.current("idle");
          sound.unloadAsync().catch(() => {});
          if (currentSoundRef.current === sound) currentSoundRef.current = null;
        }
      });

      await sound.playAsync();
      return true;
    } catch (e) {
      console.warn("[Voice] playBinaryAudio error:", e);
      return false;
    }
  }, []);

  // ── Main speak ────────────────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Stop current
    if (currentSoundRef.current) {
      await currentSoundRef.current.stopAsync().catch(() => {});
      await currentSoundRef.current.unloadAsync().catch(() => {});
      currentSoundRef.current = null;
    }
    Speech.stop();

    setIsSpeaking(true);
    setAIStateRef.current("speaking");

    const vs = voiceSettingsRef.current;

    // ── KOKORO (open source TTS) ──
    if (vs.provider === "kokoro") {
      const url = `${(vs.kokoroApiUrl || KOKORO_DEFAULT_API).replace(/\/$/, "")}/audio/speech`;
      const ok = await playBinaryAudio(
        url, "POST",
        { "Content-Type": "application/json", "Accept": "audio/mpeg" },
        JSON.stringify({
          model: "kokoro",
          input: text,
          voice: vs.kokoroVoice || "am_adam",
          response_format: "mp3",
          speed: 0.95,
        }),
      );
      if (ok) return;
      // fall through to system TTS
      console.warn("[Voice] Kokoro failed — falling back to System TTS");
    }

    // ── ELEVENLABS ──
    if (vs.provider === "elevenlabs" && vs.elevenlabsApiKey && vs.elevenlabsVoiceId) {
      const ok = await playBinaryAudio(
        `https://api.elevenlabs.io/v1/text-to-speech/${vs.elevenlabsVoiceId}`,
        "POST",
        {
          "xi-api-key": vs.elevenlabsApiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        JSON.stringify({
          text,
          model_id: vs.elevenlabsModel || "eleven_turbo_v2_5",
          voice_settings: { stability: 0.78, similarity_boost: 0.88, style: 0.12, use_speaker_boost: true },
        }),
      );
      if (ok) return;
    }

    // ── SYSTEM TTS (expo-speech) — always works ──
    const profile = PRESET_PROFILES.find(p => p.id === vs.profileId) || PRESET_PROFILES[0];
    let voiceId: string | undefined = vs.systemVoiceId || undefined;
    if (!voiceId && systemVoicesRef.current.length > 0) {
      const m = systemVoicesRef.current.find(v => detectGender(v) === profile.gender);
      voiceId = m?.identifier ?? systemVoicesRef.current[0]?.identifier;
    }

    Speech.speak(text, {
      language: "en-US",
      pitch: profile.pitch,
      rate: profile.rate,
      voice: voiceId,
      onStart:   () => { setIsSpeaking(true);  setAIStateRef.current("speaking"); },
      onDone:    () => { setIsSpeaking(false); setAIStateRef.current("idle"); },
      onStopped: () => { setIsSpeaking(false); setAIStateRef.current("idle"); },
      onError:   () => { setIsSpeaking(false); setAIStateRef.current("idle"); },
    });
  }, [playBinaryAudio]);

  const stopSpeaking = useCallback(async () => {
    if (currentSoundRef.current) {
      await currentSoundRef.current.stopAsync().catch(() => {});
      await currentSoundRef.current.unloadAsync().catch(() => {});
      currentSoundRef.current = null;
    }
    Speech.stop();
    setIsSpeaking(false);
    setAIStateRef.current("idle");
  }, []);

  const testVoice = useCallback(() => {
    speak("JAVIS online. Kokoro voice engine active. All systems operational, Sir.");
  }, [speak]);

  // ── Clone Jonathan Livingston voice via ElevenLabs ────────────────────────
  const cloneJonathanVoice = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const apiKey = voiceSettingsRef.current.elevenlabsApiKey;
    if (!apiKey) return { success: false, error: "Add your ElevenLabs API key first." };

    setIsCloning(true);
    try {
      // Locate the bundled sample MP3
      let fileUri = "";
      try {
        const { Asset } = await import("expo-asset");
        const asset = Asset.fromModule(require("@/assets/sounds/jonathan_sample.mp3"));
        await asset.downloadAsync();
        fileUri = asset.localUri ?? "";
      } catch (_) {}

      if (!fileUri) return { success: false, error: "Could not load voice sample file." };

      const fd = new FormData();
      fd.append("name", "Jonathan Livingston — JAVIS");
      fd.append("description", "Authentic, calming & pleasant male voice for JAVIS AI launcher");
      fd.append("labels", JSON.stringify({ gender: "male", accent: "american", style: "conversational" }));
      fd.append("files", { uri: fileUri, type: "audio/mpeg", name: "jonathan_sample.mp3" } as any);

      const resp = await fetch("https://api.elevenlabs.io/v1/voices/add", {
        method: "POST",
        headers: { "xi-api-key": apiKey, Accept: "application/json" },
        body: fd,
      });

      if (!resp.ok) {
        const txt = await resp.text();
        return { success: false, error: `ElevenLabs ${resp.status}: ${txt.slice(0, 200)}` };
      }

      const data = await resp.json();
      await updateVoiceSettings({ elevenlabsVoiceId: data.voice_id, jonathanCloned: true, provider: "elevenlabs" });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message ?? "Unknown error" };
    } finally {
      setIsCloning(false);
    }
  }, [updateVoiceSettings]);

  // ── Speech recognition ────────────────────────────────────────────────────
  const processTranscript = useCallback(async (text: string) => {
    if (!text.trim()) { setAIStateRef.current("idle"); return; }
    setAIStateRef.current("thinking");
    try {
      const response = await sendMessageRef.current(text.trim());
      speak(response);
    } catch { setAIStateRef.current("idle"); }
  }, [speak]);

  const processRef = useRef(processTranscript);
  useEffect(() => { processRef.current = processTranscript; }, [processTranscript]);

  const startListening = useCallback(() => {
    setIsListening(true);
    setTranscript("");
    setAIStateRef.current("listening");

    if (Platform.OS === "web") return;
    const SpeechRec = (global as any).SpeechRecognition || (global as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (event: any) => {
      const text = Array.from(event.results as any[]).map((r: any) => r[0].transcript).join("");
      setTranscript(text);
      transcriptRef.current = text;
      if (silenceRef.current) clearTimeout(silenceRef.current);
      silenceRef.current = setTimeout(() => {
        if (transcriptRef.current.trim()) { rec.stop(); setIsListening(false); processRef.current(transcriptRef.current); }
      }, 1500);
    };
    rec.onerror = () => { setIsListening(false); setAIStateRef.current("idle"); };
    rec.onend   = () => { setIsListening(false); };
    recognitionRef.current = rec;
    try { rec.start(); } catch (_) { setIsListening(false); }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch (_) {} }
    if (silenceRef.current) clearTimeout(silenceRef.current);
    setIsListening(false);
    const t = transcriptRef.current;
    if (t.trim()) processRef.current(t);
    else setAIStateRef.current("idle");
  }, []);

  return (
    <VoiceContext.Provider value={{
      isListening, isSpeaking, transcript,
      startListening, stopListening, speak, stopSpeaking,
      voiceSettings, updateVoiceSettings,
      presetProfiles: PRESET_PROFILES,
      systemVoices,
      cloneJonathanVoice,
      testVoice,
      isCloning,
    }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be inside VoiceProvider");
  return ctx;
}
