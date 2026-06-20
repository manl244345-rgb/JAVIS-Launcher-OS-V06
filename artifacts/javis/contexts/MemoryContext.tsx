import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface Memory {
  name: string;
  interests: string[];
  goals: string[];
  favoriteApps: string[];
  favoriteContacts: string[];
  habits: string[];
  preferences: Record<string, string>;
  routines: Record<string, string>;
  lastUpdated: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface CommandLog {
  id: string;
  type: "app_open" | "call" | "alarm" | "error" | "provider_switch" | "memory_update" | "voice";
  description: string;
  timestamp: number;
  status: "success" | "failure" | "pending";
}

interface MemoryContextType {
  memory: Memory;
  conversations: ConversationMessage[];
  commandLog: CommandLog[];
  updateMemory: (updates: Partial<Memory>) => Promise<void>;
  addMessage: (msg: Omit<ConversationMessage, "id">) => void;
  clearConversations: () => void;
  addCommandLog: (log: Omit<CommandLog, "id">) => void;
  getContext: () => string;
}

const DEFAULT_MEMORY: Memory = {
  name: "",
  interests: [],
  goals: [],
  favoriteApps: [],
  favoriteContacts: [],
  habits: [],
  preferences: {},
  routines: {},
  lastUpdated: new Date().toISOString(),
};

const MemoryContext = createContext<MemoryContextType | null>(null);

const STORAGE_KEYS = {
  MEMORY: "javis_memory",
  CONVERSATIONS: "javis_conversations",
  COMMAND_LOG: "javis_command_log",
};

export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const [memory, setMemory] = useState<Memory>(DEFAULT_MEMORY);
  const [conversations, setConversations] = useState<ConversationMessage[]>([]);
  const [commandLog, setCommandLog] = useState<CommandLog[]>([]);

  useEffect(() => {
    loadFromStorage();
  }, []);

  const loadFromStorage = async () => {
    try {
      const [mem, convs, logs] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.MEMORY),
        AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.COMMAND_LOG),
      ]);
      if (mem) setMemory(JSON.parse(mem));
      if (convs) setConversations(JSON.parse(convs));
      if (logs) setCommandLog(JSON.parse(logs));
    } catch (e) {
      console.error("Failed to load from storage:", e);
    }
  };

  const updateMemory = useCallback(async (updates: Partial<Memory>) => {
    const updated = { ...memory, ...updates, lastUpdated: new Date().toISOString() };
    setMemory(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(updated));
  }, [memory]);

  const addMessage = useCallback((msg: Omit<ConversationMessage, "id">) => {
    const newMsg: ConversationMessage = {
      ...msg,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setConversations(prev => {
      const updated = [...prev, newMsg].slice(-100);
      AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearConversations = useCallback(() => {
    setConversations([]);
    AsyncStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
  }, []);

  const addCommandLog = useCallback((log: Omit<CommandLog, "id">) => {
    const newLog: CommandLog = {
      ...log,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setCommandLog(prev => {
      const updated = [newLog, ...prev].slice(0, 200);
      AsyncStorage.setItem(STORAGE_KEYS.COMMAND_LOG, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getContext = useCallback(() => {
    const parts: string[] = [];
    if (memory.name) parts.push(`User's name: ${memory.name}`);
    if (memory.interests.length) parts.push(`Interests: ${memory.interests.join(", ")}`);
    if (memory.goals.length) parts.push(`Goals: ${memory.goals.join(", ")}`);
    if (memory.favoriteApps.length) parts.push(`Favorite apps: ${memory.favoriteApps.join(", ")}`);
    if (memory.habits.length) parts.push(`Known habits: ${memory.habits.join(", ")}`);
    const recent = conversations.slice(-10).map(m => `${m.role}: ${m.content}`).join("\n");
    if (recent) parts.push(`Recent conversation:\n${recent}`);
    return parts.join("\n");
  }, [memory, conversations]);

  return (
    <MemoryContext.Provider value={{
      memory, conversations, commandLog,
      updateMemory, addMessage, clearConversations, addCommandLog, getContext,
    }}>
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory() {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error("useMemory must be inside MemoryProvider");
  return ctx;
}
