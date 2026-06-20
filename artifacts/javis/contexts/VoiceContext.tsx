import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { VOICE_PROFILES, WAKE_WORDS } from "@/constants/config";
import { useAI } from "./AIContext";

interface VoiceContextType {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  selectedVoiceId: string;
  selectVoice: (id: string) => void;
  availableVoices: Speech.Voice[];
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState(VOICE_PROFILES[3].id);
  const [availableVoices, setAvailableVoices] = useState<Speech.Voice[]>([]);
  const { setAIState, sendMessage } = useAI();
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadVoices();
    loadSavedVoice();
  }, []);

  const loadVoices = async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      setAvailableVoices(voices);
    } catch (e) {}
  };

  const loadSavedVoice = async () => {
    const saved = await AsyncStorage.getItem("javis_voice_id");
    if (saved) setSelectedVoiceId(saved);
  };

  const selectVoice = useCallback(async (id: string) => {
    setSelectedVoiceId(id);
    await AsyncStorage.setItem("javis_voice_id", id);
  }, []);

  const speak = useCallback((text: string) => {
    if (!text) return;
    setIsSpeaking(true);
    setAIState("speaking");

    const profile = VOICE_PROFILES.find(v => v.id === selectedVoiceId) || VOICE_PROFILES[3];

    // Find a matching system voice (prefer male voices)
    const maleVoice = availableVoices.find(v =>
      v.identifier?.toLowerCase().includes("male") ||
      v.name?.toLowerCase().includes("en-us") ||
      v.quality === "Enhanced"
    );

    Speech.speak(text, {
      language: "en-US",
      pitch: profile.pitch,
      rate: profile.rate,
      voice: maleVoice?.identifier,
      onStart: () => setIsSpeaking(true),
      onDone: () => {
        setIsSpeaking(false);
        setAIState("idle");
      },
      onError: () => {
        setIsSpeaking(false);
        setAIState("idle");
      },
    });
  }, [selectedVoiceId, availableVoices, setAIState]);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
    setAIState("idle");
  }, [setAIState]);

  const startListening = useCallback(() => {
    if (Platform.OS === "web") {
      // Web fallback
      setIsListening(true);
      setAIState("listening");
      return;
    }

    setIsListening(true);
    setAIState("listening");
    setTranscript("");

    // On Android, use SpeechRecognition if available
    if (Platform.OS === "android" && (global as any).SpeechRecognition) {
      const recognition = new (global as any).SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const text = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join("");
        setTranscript(text);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (text.trim()) {
            stopListeningAndProcess(text.trim());
          }
        }, 1500);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setAIState("idle");
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  }, [setAIState]);

  const stopListeningAndProcess = useCallback(async (text: string) => {
    setIsListening(false);
    if (!text) {
      setAIState("idle");
      return;
    }
    setAIState("thinking");
    const response = await sendMessage(text);
    speak(response);
  }, [sendMessage, speak, setAIState]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setIsListening(false);
    if (transcript.trim()) {
      stopListeningAndProcess(transcript.trim());
    } else {
      setAIState("idle");
    }
  }, [transcript, stopListeningAndProcess, setAIState]);

  return (
    <VoiceContext.Provider value={{
      isListening, isSpeaking, transcript,
      startListening, stopListening, speak, stopSpeaking,
      selectedVoiceId, selectVoice, availableVoices,
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
