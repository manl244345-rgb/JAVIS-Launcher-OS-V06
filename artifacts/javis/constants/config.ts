export const AI_PROVIDERS = {
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      { id: "qwen/qwen3-mini", name: "Qwen 3 Mini", tier: "fast" },
      { id: "microsoft/phi-3-mini-128k-instruct", name: "Phi-3 Mini", tier: "fast" },
      { id: "google/gemma-3n-e4b-it:free", name: "Gemma Small", tier: "fast" },
      { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", tier: "balanced" },
      { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", tier: "powerful" },
    ],
  },
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    models: [
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", tier: "fast" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", tier: "balanced" },
    ],
  },
};

export const VOICE_PROFILES = [
  { id: "jarvis-male", name: "Jarvis Male", pitch: 0.8, rate: 0.9 },
  { id: "professional-male", name: "Professional Male", pitch: 0.85, rate: 0.95 },
  { id: "friendly-male", name: "Friendly Male", pitch: 0.9, rate: 1.0 },
  { id: "deep-male", name: "Deep Male", pitch: 0.7, rate: 0.85 },
];

export const SYSTEM_PROMPT = `You are JAVIS, an advanced AI assistant and Android launcher. You are intelligent, precise, and helpful like Jarvis from Iron Man. You have a calm, authoritative masculine voice. You assist with opening apps, making calls, setting alarms, managing tasks, answering questions, and anything the user needs. You always verify your actions and report back. You never claim to do something without actually doing it. Keep responses concise but complete. Address the user as "Sir" occasionally.`;

export const MAX_CONVERSATION_HISTORY = 100;

export const WAKE_WORDS = ["hey javis", "javis", "hey jarvis"];

export const RESPONSE_MODES = [
  { id: "short", name: "Short", maxTokens: 150 },
  { id: "balanced", name: "Balanced", maxTokens: 400 },
  { id: "detailed", name: "Detailed", maxTokens: 800 },
  { id: "expert", name: "Expert", maxTokens: 2000 },
];
