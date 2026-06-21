import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import React, {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from "react";
import { Platform } from "react-native";
import { useAI } from "./AIContext";

export type VoiceGender = "male" | "female" | "neutral";

export interface VoiceProfile {
  id: string;
  name: string;
  gender: VoiceGender;
  pitch: number;
  rate: number;
  identifier?: string;
}

const PRESET_PROFILES: VoiceProfile[] = [
  { id: "deep-male",       name: "Deep Male",        gender: "male",    pitch: 0.7, rate: 0.85 },
  { id: "jarvis-male",     name: "JAVIS Classic",    gender: "male",    pitch: 0.75, rate: 0.9 },
  { id: "professional",    name: "Professional",     gender: "male",    pitch: 0.85, rate: 0.95 },
  { id: "natural-female",  name: "Natural Female",   gender: "female",  pitch: 1.15, rate: 0.95 },
  { id: "soft-female",     name: "Soft Female",      gender: "female",  pitch: 1.25, rate: 0.9  },
  { id: "neutral",         name: "Neutral",          gender: "neutral", pitch: 1.0,  rate: 1.0  },
  { id: "fast-male",       name: "Fast Male",        gender: "male",    pitch: 0.9,  rate: 1.2  },
  { id: "slow-deep",       name: "Slow & Deep",      gender: "male",    pitch: 0.65, rate: 0.75 },
];

function detectGender(voice: Speech.Voice): VoiceGender {
  const name = (voice.name || voice.identifier || "").toLowerCase();
  const femaleWords = ["female", "woman", "girl", "f1", "f2", "f3", "alice", "anna", "emily",
    "sarah", "lisa", "zira", "samantha", "victoria", "fiona", "karen", "moira",
    "tessa", "veena", "susan", "paulina", "amelie", "ioana", "joana"];
  const maleWords = ["male", "man", "guy", "m1", "m2", "m3", "james", "david", "daniel",
    "alex", "tom", "thomas", "fred", "jorge", "diego", "luca", "rishi",
    "carlos", "henrik", "oliver", "aaron"];
  if (femaleWords.some(w => name.includes(w))) return "female";
  if (maleWords.some(w => name.includes(w))) return "male";
  return "neutral";
}

interface VoiceContextType {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  selectedProfileId: string;
  selectProfile: (id: string) => void;
  selectedGenderFilter: VoiceGender | "all";
  setGenderFilter: (g: VoiceGender | "all") => void;
  presetProfiles: VoiceProfile[];
  systemVoices: Speech.Voice[];
  systemVoiceId: string;
  selectSystemVoice: (id: string) => void;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("jarvis-male");
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<VoiceGender | "all">("all");
  const [systemVoices, setSystemVoices] = useState<Speech.Voice[]>([]);
  const [systemVoiceId, setSystemVoiceId] = useState("");

  const { setAIState, sendMessage } = useAI();
  const recognitionRef = useRef<any>(null);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use refs so callbacks always see latest values
  const sendMessageRef = useRef(sendMessage);
  const setAIStateRef = useRef(setAIState);
  const selectedProfileIdRef = useRef(selectedProfileId);
  const systemVoiceIdRef = useRef(systemVoiceId);
  const systemVoicesRef = useRef(systemVoices);
  const transcriptRef = useRef(transcript);

  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);
  useEffect(() => { setAIStateRef.current = setAIState; }, [setAIState]);
  useEffect(() => { selectedProfileIdRef.current = selectedProfileId; }, [selectedProfileId]);
  useEffect(() => { systemVoiceIdRef.current = systemVoiceId; }, [systemVoiceId]);
  useEffect(() => { systemVoicesRef.current = systemVoices; }, [systemVoices]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  useEffect(() => {
    loadVoices();
    loadPreferences();
  }, []);

  const loadVoices = async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const english = voices.filter(v =>
        (v.language || "").toLowerCase().startsWith("en")
      );
      setSystemVoices(english.length > 0 ? english : voices);
    } catch (_) {}
  };

  const loadPreferences = async () => {
    const [pid, svid, gf] = await Promise.all([
      AsyncStorage.getItem("javis_voice_profile"),
      AsyncStorage.getItem("javis_system_voice"),
      AsyncStorage.getItem("javis_voice_gender"),
    ]);
    if (pid) setSelectedProfileId(pid);
    if (svid) setSystemVoiceId(svid);
    if (gf) setSelectedGenderFilter(gf as any);
  };

  const selectProfile = useCallback(async (id: string) => {
    setSelectedProfileId(id);
    await AsyncStorage.setItem("javis_voice_profile", id);
  }, []);

  const selectSystemVoice = useCallback(async (id: string) => {
    setSystemVoiceId(id);
    await AsyncStorage.setItem("javis_system_voice", id);
  }, []);

  const setGenderFilter = useCallback(async (g: VoiceGender | "all") => {
    setSelectedGenderFilter(g);
    await AsyncStorage.setItem("javis_voice_gender", g);
  }, []);

  const speak = useCallback((text: string) => {
    if (!text) return;
    setIsSpeaking(true);
    setAIStateRef.current("speaking");

    const profile = PRESET_PROFILES.find(p => p.id === selectedProfileIdRef.current) || PRESET_PROFILES[1];

    // Resolve system voice identifier
    let voiceIdentifier: string | undefined;
    if (systemVoiceIdRef.current) {
      const found = systemVoicesRef.current.find(v => v.identifier === systemVoiceIdRef.current);
      voiceIdentifier = found?.identifier;
    }

    if (!voiceIdentifier && systemVoicesRef.current.length > 0) {
      const gender = profile.gender;
      const match = systemVoicesRef.current.find(v => detectGender(v) === gender);
      voiceIdentifier = match?.identifier || systemVoicesRef.current[0]?.identifier;
    }

    Speech.speak(text, {
      language: "en-US",
      pitch: profile.pitch,
      rate: profile.rate,
      voice: voiceIdentifier,
      onStart: () => { setIsSpeaking(true); setAIStateRef.current("speaking"); },
      onDone: () => { setIsSpeaking(false); setAIStateRef.current("idle"); },
      onStopped: () => { setIsSpeaking(false); setAIStateRef.current("idle"); },
      onError: () => { setIsSpeaking(false); setAIStateRef.current("idle"); },
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
    setAIStateRef.current("idle");
  }, []);

  const processTranscript = useCallback(async (text: string) => {
    if (!text.trim()) { setAIStateRef.current("idle"); return; }
    setAIStateRef.current("thinking");
    try {
      const response = await sendMessageRef.current(text.trim());
      speak(response);
    } catch {
      setAIStateRef.current("idle");
    }
  }, [speak]);

  const processTranscriptRef = useRef(processTranscript);
  useEffect(() => { processTranscriptRef.current = processTranscript; }, [processTranscript]);

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
      const text = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join("");
      setTranscript(text);
      transcriptRef.current = text;

      if (silenceRef.current) clearTimeout(silenceRef.current);
      silenceRef.current = setTimeout(() => {
        if (transcriptRef.current.trim()) {
          rec.stop();
          setIsListening(false);
          processTranscriptRef.current(transcriptRef.current);
        }
      }, 1500);
    };

    rec.onerror = () => {
      setIsListening(false);
      setAIStateRef.current("idle");
    };

    rec.onend = () => { setIsListening(false); };

    recognitionRef.current = rec;
    try { rec.start(); } catch (_) { setIsListening(false); }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    if (silenceRef.current) clearTimeout(silenceRef.current);
    setIsListening(false);
    const t = transcriptRef.current;
    if (t.trim()) {
      processTranscriptRef.current(t);
    } else {
      setAIStateRef.current("idle");
    }
  }, []);

  return (
    <VoiceContext.Provider value={{
      isListening, isSpeaking, transcript,
      startListening, stopListening, speak, stopSpeaking,
      selectedProfileId, selectProfile,
      selectedGenderFilter, setGenderFilter,
      presetProfiles: PRESET_PROFILES,
      systemVoices, systemVoiceId, selectSystemVoice,
    }}>
      {children}
    </VoiceContext.Provider>
  );
}

export { PRESET_PROFILES, detectGender };

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be inside VoiceProvider");
  return ctx;
}
