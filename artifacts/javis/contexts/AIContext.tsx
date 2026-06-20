import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AI_PROVIDERS, MAX_CONVERSATION_HISTORY, RESPONSE_MODES, SYSTEM_PROMPT } from "@/constants/config";
import { useMemory } from "./MemoryContext";

export type AIState = "idle" | "listening" | "thinking" | "executing" | "speaking" | "completed";

interface AISettings {
  provider: keyof typeof AI_PROVIDERS;
  modelId: string;
  apiKey: string;
  responseMode: string;
}

interface AIContextType {
  aiState: AIState;
  setAIState: (s: AIState) => void;
  settings: AISettings;
  updateSettings: (s: Partial<AISettings>) => Promise<void>;
  sendMessage: (userText: string) => Promise<string>;
  isStreaming: boolean;
  lastResponse: string;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: "openrouter",
  modelId: "qwen/qwen3-mini",
  apiKey: "",
  responseMode: "detailed",
};

const AIContext = createContext<AIContextType | null>(null);

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [aiState, setAIState] = useState<AIState>("idle");
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastResponse, setLastResponse] = useState("");
  const { conversations, addMessage, getContext, addCommandLog } = useMemory();

  useEffect(() => {
    AsyncStorage.getItem("javis_ai_settings").then(s => {
      if (s) setSettings(JSON.parse(s));
    });
  }, []);

  const updateSettings = useCallback(async (updates: Partial<AISettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    await AsyncStorage.setItem("javis_ai_settings", JSON.stringify(updated));
  }, [settings]);

  const sendMessage = useCallback(async (userText: string): Promise<string> => {
    if (!settings.apiKey) {
      return "Please configure your AI provider API key in Settings.";
    }

    addMessage({ role: "user", content: userText, timestamp: Date.now() });
    setAIState("thinking");
    setIsStreaming(true);

    const provider = AI_PROVIDERS[settings.provider];
    const mode = RESPONSE_MODES.find(m => m.id === settings.responseMode) || RESPONSE_MODES[2];
    const memCtx = getContext();

    const systemContent = SYSTEM_PROMPT + (memCtx ? `\n\nContext about the user:\n${memCtx}` : "");

    const messages = [
      { role: "system", content: systemContent },
      ...conversations.slice(-MAX_CONVERSATION_HISTORY).map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: userText },
    ];

    try {
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://javis.launcher",
        },
        body: JSON.stringify({
          model: settings.modelId,
          messages,
          max_tokens: mode.maxTokens,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantText = data.choices?.[0]?.message?.content || "I encountered an issue. Please try again.";

      addMessage({ role: "assistant", content: assistantText, timestamp: Date.now() });
      setLastResponse(assistantText);
      setAIState("speaking");
      addCommandLog({
        type: "provider_switch",
        description: `AI responded via ${settings.provider}`,
        timestamp: Date.now(),
        status: "success",
      });

      return assistantText;
    } catch (err: any) {
      const errMsg = `Error: ${err.message}. Attempting failover...`;
      setAIState("idle");
      addCommandLog({
        type: "error",
        description: `AI call failed: ${err.message}`,
        timestamp: Date.now(),
        status: "failure",
      });
      return errMsg;
    } finally {
      setIsStreaming(false);
    }
  }, [settings, conversations, addMessage, getContext, addCommandLog]);

  return (
    <AIContext.Provider value={{
      aiState, setAIState,
      settings, updateSettings,
      sendMessage, isStreaming, lastResponse,
    }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error("useAI must be inside AIProvider");
  return ctx;
}
