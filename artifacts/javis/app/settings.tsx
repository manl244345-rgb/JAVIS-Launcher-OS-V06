import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import colors from "@/constants/colors";
import {
  AI_PROVIDERS,
  ELEVENLABS_MODELS,
  JONATHAN_VOICE_PROFILE,
  KOKORO_DEFAULT_API,
  KOKORO_VOICES,
  RESPONSE_MODES,
  VOICE_PROVIDERS,
  VoiceProviderType,
} from "@/constants/config";
import { useAI } from "@/contexts/AIContext";
import { useMemory } from "@/contexts/MemoryContext";
import { PRESET_PROFILES, detectGender, useVoice } from "@/contexts/VoiceContext";

const C = colors.dark;
type Tab = "ai" | "voice" | "memory" | "profile" | "system";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateSettings } = useAI();
  const { memory, updateMemory, clearConversations } = useMemory();
  const {
    voiceSettings, updateVoiceSettings,
    presetProfiles, systemVoices,
    cloneJonathanVoice, testVoice, isCloning,
  } = useVoice();

  const [tab, setTab] = useState<Tab>("ai");
  const [editName, setEditName] = useState(memory.name);
  const [aiApiKey, setAiApiKey] = useState(settings.apiKey);
  const [showAiKey, setShowAiKey] = useState(false);
  const [elKey, setElKey] = useState(voiceSettings.elevenlabsApiKey);
  const [showElKey, setShowElKey] = useState(false);
  const [kokoroUrl, setKokoroUrl] = useState(voiceSettings.kokoroApiUrl || KOKORO_DEFAULT_API);

  const saveAiKey = async () => {
    await updateSettings({ apiKey: aiApiKey.trim() });
    Alert.alert("✅ Saved", "API key saved.");
  };

  const saveName = async () => {
    await updateMemory({ name: editName.trim() });
    Alert.alert("✅ Saved", `JAVIS will call you ${editName.trim() || "Sir"}.`);
  };

  const saveElKey = async () => {
    await updateVoiceSettings({ elevenlabsApiKey: elKey.trim() });
    Alert.alert("✅ Saved", "ElevenLabs key saved.");
  };

  const saveKokoroUrl = async () => {
    await updateVoiceSettings({ kokoroApiUrl: kokoroUrl.trim() });
    Alert.alert("✅ Saved", "Kokoro API URL saved. Tap Test Voice to verify.");
  };

  const handleCloneVoice = async () => {
    if (!voiceSettings.elevenlabsApiKey) {
      Alert.alert("API Key Required", "Save your ElevenLabs API key first.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const result = await cloneJonathanVoice();
    if (result.success) {
      Alert.alert("✅ Voice Cloned!", "Jonathan Livingston voice has been cloned and set as default. Tap Test Voice to hear it.");
    } else {
      Alert.alert("Clone Failed", result.error || "Unknown error. Check your ElevenLabs plan — voice cloning requires Creator tier or above.");
    }
  };

  const tabs: Array<{ id: Tab; icon: any; label: string }> = [
    { id: "ai",      icon: "cpu",      label: "AI" },
    { id: "voice",   icon: "mic",      label: "Voice" },
    { id: "memory",  icon: "database", label: "Memory" },
    { id: "profile", icon: "user",     label: "Profile" },
    { id: "system",  icon: "zap",      label: "System" },
  ];

  const filteredSystemVoices = voiceSettings.genderFilter === "all"
    ? systemVoices
    : systemVoices.filter(v => detectGender(v) === voiceSettings.genderFilter);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>SETTINGS</Text>
          <Text style={styles.headerSub}>JAVIS Configuration</Text>
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      >
        {tabs.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabChip, tab === t.id && styles.tabChipActive]}
            onPress={() => { setTab(t.id); Haptics.selectionAsync(); }}
          >
            <Feather name={t.icon} size={13} color={tab === t.id ? C.primary : C.mutedForeground} />
            <Text style={[styles.tabLabel, tab === t.id && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ══ AI TAB ══════════════════════════════════════════════════════════ */}
        {tab === "ai" && (
          <>
            <Card title="AI PROVIDER">
              {Object.entries(AI_PROVIDERS).map(([key, prov]) => (
                <RadioItem
                  key={key}
                  label={prov.name}
                  sub={`${prov.models.length} models available`}
                  active={settings.provider === key}
                  onPress={() => updateSettings({ provider: key as any, modelId: prov.models[0].id })}
                />
              ))}
            </Card>

            <Card title="MODEL">
              {AI_PROVIDERS[settings.provider].models.map(m => (
                <RadioItem
                  key={m.id}
                  label={m.name}
                  sub={m.tier}
                  active={settings.modelId === m.id}
                  onPress={() => updateSettings({ modelId: m.id })}
                  badge={m.tier === "fast" ? "FAST" : m.tier === "powerful" ? "PRO" : undefined}
                  badgeColor={m.tier === "fast" ? "#00FF44" : "#FF8800"}
                />
              ))}
            </Card>

            <Card title="API KEY">
              <View style={styles.apiRow}>
                <TextInput
                  style={styles.apiInput}
                  value={aiApiKey}
                  onChangeText={setAiApiKey}
                  placeholder="sk-or-v1-... or gsk_..."
                  placeholderTextColor={C.mutedForeground}
                  secureTextEntry={!showAiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowAiKey(v => !v)} style={styles.eyeBtn}>
                  <Feather name={showAiKey ? "eye-off" : "eye"} size={16} color={C.mutedForeground} />
                </TouchableOpacity>
              </View>
              <ActionBtn label="Save API Key" icon="save" onPress={saveAiKey} />
              <Text style={styles.hint}>
                {"OpenRouter (free tier): openrouter.ai/keys\nGroq (free, fast): console.groq.com/keys"}
              </Text>
            </Card>

            <Card title="RESPONSE LENGTH">
              {RESPONSE_MODES.map(m => (
                <RadioItem
                  key={m.id}
                  label={m.name}
                  sub={`Max ${m.maxTokens} tokens`}
                  active={settings.responseMode === m.id}
                  onPress={() => updateSettings({ responseMode: m.id })}
                />
              ))}
            </Card>
          </>
        )}

        {/* ══ VOICE TAB ═══════════════════════════════════════════════════════ */}
        {tab === "voice" && (
          <>
            {/* ── Provider selector ── */}
            <Card title="VOICE ENGINE">
              {(Object.entries(VOICE_PROVIDERS) as [VoiceProviderType, typeof VOICE_PROVIDERS[VoiceProviderType]][]).map(([key, prov]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.providerItem, voiceSettings.provider === key && styles.providerItemActive]}
                  onPress={() => { updateVoiceSettings({ provider: key }); Haptics.selectionAsync(); }}
                >
                  <View style={[styles.radioDot, voiceSettings.provider === key && styles.radioDotActive]} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.providerNameRow}>
                      <Text style={[styles.radioLabel, voiceSettings.provider === key && { color: "#FFFFFF" }]}>
                        {prov.name}
                      </Text>
                      {key === "kokoro" && (
                        <View style={styles.osBadge}>
                          <Text style={styles.osBadgeText}>FREE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.radioSub}>{prov.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </Card>

            {/* ── KOKORO config ── */}
            {voiceSettings.provider === "kokoro" && (
              <Card title="KOKORO — OPEN SOURCE TTS">
                <View style={styles.kokoroInfoBar}>
                  <Feather name="globe" size={14} color="#00FF44" />
                  <Text style={styles.kokoroInfoText}>
                    hexgrad/Kokoro-82M · No API key required · Free
                  </Text>
                </View>

                <Text style={styles.fieldLabel}>API ENDPOINT</Text>
                <View style={styles.apiRow}>
                  <TextInput
                    style={[styles.apiInput, { flex: 1 }]}
                    value={kokoroUrl}
                    onChangeText={setKokoroUrl}
                    placeholder={KOKORO_DEFAULT_API}
                    placeholderTextColor={C.mutedForeground}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setKokoroUrl(KOKORO_DEFAULT_API)}
                    style={styles.eyeBtn}
                  >
                    <Feather name="refresh-cw" size={14} color={C.mutedForeground} />
                  </TouchableOpacity>
                </View>
                <ActionBtn label="Save Endpoint" icon="save" onPress={saveKokoroUrl} />
                <Text style={styles.hint}>
                  {"Default: Kokoro FastAPI on HuggingFace Spaces (free, may be slow).\nSelf-host: github.com/remsky/Kokoro-FastAPI for instant response."}
                </Text>

                <Text style={styles.fieldLabel}>VOICE CHARACTER</Text>
                <View style={styles.kokoroVoicesGrid}>
                  {KOKORO_VOICES.map(v => (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.kokoroVoiceChip, voiceSettings.kokoroVoice === v.id && styles.kokoroVoiceChipActive]}
                      onPress={() => { updateVoiceSettings({ kokoroVoice: v.id }); Haptics.selectionAsync(); }}
                    >
                      <Text style={styles.kokoroVoiceGender}>
                        {v.gender === "male" ? "♂" : "♀"}
                      </Text>
                      <Text style={[styles.kokoroVoiceName, voiceSettings.kokoroVoice === v.id && { color: "#FFFFFF" }]}>
                        {v.name.split(" ")[0]}
                      </Text>
                      <Text style={styles.kokoroVoiceAccent} numberOfLines={1}>
                        {v.name.includes("British") ? "🇬🇧" : "🇺🇸"}
                      </Text>
                      {voiceSettings.kokoroVoice === v.id && (
                        <View style={styles.kokoroCheck}>
                          <Feather name="check" size={10} color={C.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.currentVoiceBar}>
                  <Feather name="volume-2" size={14} color={C.primary} />
                  <Text style={styles.currentVoiceText}>
                    Active: {KOKORO_VOICES.find(v => v.id === voiceSettings.kokoroVoice)?.name ?? "Adam"}
                  </Text>
                </View>
              </Card>
            )}

            {/* ── ELEVENLABS config ── */}
            {voiceSettings.provider === "elevenlabs" && (
              <Card title="ELEVENLABS — VOICE CLONING">
                <Text style={styles.fieldLabel}>API KEY</Text>
                <View style={styles.apiRow}>
                  <TextInput
                    style={styles.apiInput}
                    value={elKey}
                    onChangeText={setElKey}
                    placeholder="sk-..."
                    placeholderTextColor={C.mutedForeground}
                    secureTextEntry={!showElKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowElKey(v => !v)} style={styles.eyeBtn}>
                    <Feather name={showElKey ? "eye-off" : "eye"} size={16} color={C.mutedForeground} />
                  </TouchableOpacity>
                </View>
                <ActionBtn label="Save Key" icon="save" onPress={saveElKey} />
                <Text style={styles.hint}>elevenlabs.io → Profile → API Keys</Text>

                <View style={{ height: 1, backgroundColor: "#1A1A1A" }} />

                {/* Jonathan Clone card */}
                <View style={styles.cloneCard}>
                  <View style={styles.cloneTopRow}>
                    <View style={styles.cloneIconBox}>
                      <Text style={{ fontSize: 22 }}>💀</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.cloneNameRow}>
                        <Text style={styles.cloneName}>Jonathan Livingston</Text>
                        {voiceSettings.jonathanCloned && (
                          <View style={styles.clonedBadge}>
                            <Feather name="check-circle" size={11} color="#00FF44" />
                            <Text style={styles.clonedText}>CLONED</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.cloneDesc}>Authentic · Calming · Pleasant</Text>
                    </View>
                  </View>

                  <Text style={[styles.hint, { marginTop: 4 }]}>
                    Upload the bundled voice sample to ElevenLabs to create a custom clone. Requires Creator plan or above.
                  </Text>

                  <TouchableOpacity
                    style={[styles.cloneBtn, (isCloning || !voiceSettings.elevenlabsApiKey) && styles.cloneBtnDisabled]}
                    onPress={handleCloneVoice}
                    disabled={isCloning || !voiceSettings.elevenlabsApiKey}
                  >
                    {isCloning ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Feather name="zap" size={15} color="#FFFFFF" />
                    )}
                    <Text style={styles.cloneBtnText}>
                      {isCloning ? "Cloning Voice..." : voiceSettings.jonathanCloned ? "Re-Clone Voice" : "Clone Jonathan Livingston Voice"}
                    </Text>
                  </TouchableOpacity>

                  {voiceSettings.elevenlabsVoiceId ? (
                    <View style={styles.voiceIdRow}>
                      <Feather name="key" size={11} color="#444444" />
                      <Text style={styles.voiceIdText}>Voice ID: {voiceSettings.elevenlabsVoiceId.slice(0, 16)}...</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.fieldLabel}>TTS MODEL</Text>
                {ELEVENLABS_MODELS.map(m => (
                  <RadioItem
                    key={m.id}
                    label={m.name}
                    sub={`Speed cost: ${m.cost}`}
                    active={voiceSettings.elevenlabsModel === m.id}
                    onPress={() => updateVoiceSettings({ elevenlabsModel: m.id })}
                  />
                ))}
              </Card>
            )}

            {/* ── SYSTEM TTS config ── */}
            {voiceSettings.provider === "system" && (
              <>
                <Card title="GENDER FILTER">
                  <View style={styles.genderRow}>
                    {(["all", "male", "female", "neutral"] as const).map(g => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.genderChip, voiceSettings.genderFilter === g && styles.genderChipActive]}
                        onPress={() => updateVoiceSettings({ genderFilter: g })}
                      >
                        <Text style={[styles.genderText, voiceSettings.genderFilter === g && styles.genderTextActive]}>
                          {g === "all" ? "ALL" : g === "male" ? "♂ MALE" : g === "female" ? "♀ FEMALE" : "⊕ NEUTRAL"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Card>

                <Card title="VOICE PRESET">
                  {presetProfiles
                    .filter(p => voiceSettings.genderFilter === "all" || p.gender === voiceSettings.genderFilter)
                    .map(profile => (
                      <TouchableOpacity
                        key={profile.id}
                        style={[styles.voiceItem, voiceSettings.profileId === profile.id && styles.voiceItemActive]}
                        onPress={() => { updateVoiceSettings({ profileId: profile.id }); Haptics.selectionAsync(); }}
                      >
                        <View style={styles.voiceLeft}>
                          <View style={[styles.voiceGenderDot, {
                            backgroundColor: profile.gender === "male" ? "#4488FF"
                              : profile.gender === "female" ? "#FF44AA" : "#888888",
                          }]} />
                          <View>
                            <Text style={[styles.voiceLabel, voiceSettings.profileId === profile.id && { color: "#FFFFFF" }]}>
                              {profile.name}
                              {profile.id === "jonathan-livingston" ? "  ⭐" : ""}
                            </Text>
                            <Text style={styles.voiceSub}>
                              Pitch {profile.pitch} · Rate {profile.rate}
                              {profile.desc ? `  ·  ${profile.desc}` : ""}
                            </Text>
                          </View>
                        </View>
                        {voiceSettings.profileId === profile.id && (
                          <View style={styles.voiceCheck}>
                            <Feather name="check" size={13} color={C.primary} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                </Card>

                {systemVoices.length > 0 && (
                  <Card title={`DEVICE VOICES (${filteredSystemVoices.length})`}>
                    <Text style={styles.sectionHint}>Select a specific device TTS voice</Text>
                    <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {filteredSystemVoices.map(voice => {
                        const g = detectGender(voice);
                        const isActive = voiceSettings.systemVoiceId === voice.identifier;
                        return (
                          <TouchableOpacity
                            key={voice.identifier}
                            style={[styles.voiceItem, { marginBottom: 6 }, isActive && styles.voiceItemActive]}
                            onPress={() => {
                              updateVoiceSettings({ systemVoiceId: isActive ? "" : voice.identifier });
                              Haptics.selectionAsync();
                            }}
                          >
                            <View style={styles.voiceLeft}>
                              <View style={[styles.voiceGenderDot, {
                                backgroundColor: g === "male" ? "#4488FF" : g === "female" ? "#FF44AA" : "#888888",
                              }]} />
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.voiceLabel, isActive && { color: "#FFFFFF" }]} numberOfLines={1}>
                                  {voice.name || voice.identifier}
                                </Text>
                                <Text style={styles.voiceSub}>
                                  {voice.language} · {g}
                                  {(voice as any).quality === "Enhanced" ? " · ✨" : ""}
                                </Text>
                              </View>
                            </View>
                            {isActive && (
                              <View style={styles.voiceCheck}>
                                <Feather name="check" size={13} color={C.primary} />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    {voiceSettings.systemVoiceId ? (
                      <TouchableOpacity
                        style={styles.clearBtn}
                        onPress={() => updateVoiceSettings({ systemVoiceId: "" })}
                      >
                        <Text style={styles.clearBtnText}>Clear — use preset settings</Text>
                      </TouchableOpacity>
                    ) : null}
                  </Card>
                )}
              </>
            )}

            {/* Test voice — always visible */}
            <TouchableOpacity style={styles.testVoiceBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); testVoice(); }}>
              <Feather name="volume-2" size={18} color="#000000" />
              <Text style={styles.testVoiceBtnText}>Test JAVIS Voice</Text>
            </TouchableOpacity>

            <View style={styles.voiceInfoCard}>
              <Text style={styles.voiceInfoTitle}>Current Configuration</Text>
              <InfoRow label="Engine" value={VOICE_PROVIDERS[voiceSettings.provider].name} />
              {voiceSettings.provider === "kokoro" && (
                <InfoRow label="Voice" value={KOKORO_VOICES.find(v => v.id === voiceSettings.kokoroVoice)?.name ?? "Adam"} />
              )}
              {voiceSettings.provider === "elevenlabs" && (
                <InfoRow label="Cloned" value={voiceSettings.jonathanCloned ? "✅ Jonathan Livingston" : "❌ Not cloned yet"} />
              )}
              {voiceSettings.provider === "system" && (
                <InfoRow label="Preset" value={PRESET_PROFILES.find(p => p.id === voiceSettings.profileId)?.name ?? "Jonathan Livingston"} />
              )}
              <InfoRow label="Fallback" value="System TTS (always works)" />
            </View>
          </>
        )}

        {/* ══ MEMORY TAB ══════════════════════════════════════════════════════ */}
        {tab === "memory" && (
          <>
            <Card title="MEMORY STATUS">
              <InfoRow label="Storage"            value="Local (AsyncStorage)" />
              <InfoRow label="Last Updated"       value={new Date(memory.lastUpdated).toLocaleString()} />
              <InfoRow label="Interests"          value={`${memory.interests.length} entries`} />
              <InfoRow label="Goals"              value={`${memory.goals.length} entries`} />
              <InfoRow label="Favorite Contacts"  value={`${memory.favoriteContacts.length} saved`} />
              <InfoRow label="Favorite Apps"      value={`${memory.favoriteApps.length} saved`} />
            </Card>
            <Card title="DANGER ZONE">
              <DangerBtn
                label="Clear Conversation History"
                icon="trash-2"
                onPress={() => Alert.alert("Clear History", "Delete all conversations?", [
                  { text: "Cancel" },
                  { text: "Delete", style: "destructive", onPress: clearConversations },
                ])}
              />
              <DangerBtn
                label="Reset All Memory"
                icon="refresh-ccw"
                onPress={() => Alert.alert("Reset Memory", "Reset name, interests, goals, and favorites?", [
                  { text: "Cancel" },
                  {
                    text: "Reset", style: "destructive",
                    onPress: () => updateMemory({ name: "", interests: [], goals: [], favoriteApps: [], favoriteContacts: [], habits: [] }),
                  },
                ])}
              />
            </Card>
          </>
        )}

        {/* ══ PROFILE TAB ═════════════════════════════════════════════════════ */}
        {tab === "profile" && (
          <Card title="YOUR IDENTITY">
            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput
              style={styles.fieldInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name..."
              placeholderTextColor={C.mutedForeground}
            />
            <ActionBtn label="Save Name" icon="check" onPress={saveName} />

            <Divider />

            <Text style={styles.fieldLabel}>INTERESTS (comma-separated)</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 70, textAlignVertical: "top" }]}
              value={memory.interests.join(", ")}
              onChangeText={t => updateMemory({ interests: t.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="tech, music, AI, gaming..."
              placeholderTextColor={C.mutedForeground}
              multiline
            />

            <Text style={styles.fieldLabel}>GOALS (one per line)</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 80, textAlignVertical: "top" }]}
              value={memory.goals.join("\n")}
              onChangeText={t => updateMemory({ goals: t.split("\n").map(s => s.trim()).filter(Boolean) })}
              placeholder={"Build a startup\nLearn AI\nLaunch an app"}
              placeholderTextColor={C.mutedForeground}
              multiline
            />

            <Text style={styles.fieldLabel}>HABITS (comma-separated)</Text>
            <TextInput
              style={styles.fieldInput}
              value={memory.habits.join(", ")}
              onChangeText={t => updateMemory({ habits: t.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="morning workout, journaling..."
              placeholderTextColor={C.mutedForeground}
            />
          </Card>
        )}

        {/* ══ SYSTEM TAB ══════════════════════════════════════════════════════ */}
        {tab === "system" && (
          <>
            <Card title="DEVICE PROFILE">
              <InfoRow label="Target Device"  value="Redmi A1 (Android 12 Go)" />
              <InfoRow label="Build Type"     value="Debug APK" />
              <InfoRow label="App Version"    value="1.0.0" />
              <InfoRow label="AI Backend"     value="OpenRouter / Groq" />
              <InfoRow label="Voice Engine"   value={`Kokoro TTS (${VOICE_PROVIDERS[voiceSettings.provider].name})`} />
              <InfoRow label="Memory"         value="AsyncStorage — local only" />
            </Card>

            <Card title="VOICE PROVIDERS">
              <InfoRow label="Kokoro"      value="Open-source, free, no key" />
              <InfoRow label="ElevenLabs"  value="AI clone, needs API key" />
              <InfoRow label="System TTS"  value="Built-in Android TTS" />
              <InfoRow label="Default"     value="Kokoro (am_adam voice)" />
            </Card>

            <Card title="BUILD INFO">
              <InfoRow label="GitHub Repo"    value="manl244345-rgb/JAVIS-..." />
              <InfoRow label="CI/CD"          value="GitHub Actions" />
              <InfoRow label="APK"            value="✅ Debug APK ready" />
              <InfoRow label="Architecture"   value="Expo Router + React Native" />
            </Card>

            <Card title="PERFORMANCE TIPS">
              <Text style={styles.hint}>
                {"• Use Qwen 3 Mini or Llama 3.1 8B for best speed on Redmi A1 (2GB RAM)\n\n• Kokoro TTS may be slow on first request (cold start). Self-host for instant response.\n\n• Keep AI response mode at \"Balanced\" for best speed/quality.\n\n• All data stays on device — no cloud sync."}
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardAccent} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

function RadioItem({ label, sub, active, onPress, badge, badgeColor }: {
  label: string; sub?: string; active: boolean; onPress: () => void;
  badge?: string; badgeColor?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.radioItem, active && styles.radioItemActive]}
      onPress={onPress}
    >
      <View style={[styles.radioDot, active && styles.radioDotActive]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.radioLabel, active && { color: "#FFFFFF" }]}>{label}</Text>
        {sub && <Text style={styles.radioSub}>{sub}</Text>}
      </View>
      {badge && badgeColor && (
        <View style={[styles.badge, { backgroundColor: `${badgeColor}22`, borderColor: `${badgeColor}55` }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function ActionBtn({ label, icon, onPress, color = C.primary }: {
  label: string; icon: any; onPress: () => void; color?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: `${color}44`, backgroundColor: `${color}12` }]}
      onPress={onPress}
    >
      <Feather name={icon} size={15} color={color} />
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DangerBtn({ label, icon, onPress }: { label: string; icon: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.dangerBtn} onPress={onPress}>
      <Feather name={icon} size={15} color="#FF4444" />
      <Text style={styles.dangerText}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: "#1A1A1A", marginVertical: 4 }} />;
}

const C2 = colors.dark;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: "#0F0F0F",
  },
  backBtn: { padding: 8 },
  headerTitle: { color: C2.primary, fontSize: 14, fontFamily: "Orbitron_700Bold", letterSpacing: 3 },
  headerSub: { color: C2.mutedForeground, fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  tabBar: { maxHeight: 52, marginVertical: 8 },
  tabChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: "#1A1A1A", backgroundColor: "#080808",
  },
  tabChipActive: { borderColor: C2.primary, backgroundColor: "rgba(204,0,0,0.1)" },
  tabLabel: { color: C2.mutedForeground, fontSize: 11, fontFamily: "Orbitron_400Regular", letterSpacing: 1 },
  tabLabelActive: { color: C2.primary },

  card: {
    backgroundColor: "#080808", borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: "#141414", gap: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  cardAccent: { width: 3, height: 16, backgroundColor: C2.primary, borderRadius: 2 },
  cardTitle: { color: C2.mutedForeground, fontSize: 9, fontFamily: "Orbitron_400Regular", letterSpacing: 2 },

  radioItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderRadius: 12, backgroundColor: "#0D0D0D",
    borderWidth: 1, borderColor: "#1A1A1A",
  },
  radioItemActive: { borderColor: "rgba(204,0,0,0.5)", backgroundColor: "rgba(204,0,0,0.06)" },
  radioDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#333333" },
  radioDotActive: { borderColor: C2.primary, backgroundColor: C2.primary },
  radioLabel: { color: C2.mutedForeground, fontSize: 13, fontFamily: "Inter_500Medium" },
  radioSub: { color: "#444444", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 9, fontFamily: "Orbitron_700Bold", letterSpacing: 1 },

  apiRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0D0D0D", borderRadius: 12,
    borderWidth: 1, borderColor: "#1A1A1A", paddingHorizontal: 14,
  },
  apiInput: { flex: 1, color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_400Regular", paddingVertical: 12 },
  eyeBtn: { padding: 8 },

  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 12, paddingVertical: 13, borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  hint: { color: "#444444", fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
  sectionHint: { color: "#333333", fontSize: 10, fontFamily: "Inter_400Regular" },
  fieldLabel: { color: C2.mutedForeground, fontSize: 9, fontFamily: "Orbitron_400Regular", letterSpacing: 2, marginBottom: 2 },
  fieldInput: {
    backgroundColor: "#0D0D0D", borderRadius: 12, borderWidth: 1, borderColor: "#1A1A1A",
    color: "#FFFFFF", paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: "Inter_400Regular",
  },

  // Provider
  providerItem: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    padding: 14, borderRadius: 14, backgroundColor: "#0D0D0D",
    borderWidth: 1, borderColor: "#1A1A1A",
  },
  providerItemActive: { borderColor: "rgba(204,0,0,0.5)", backgroundColor: "rgba(204,0,0,0.06)" },
  providerNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  osBadge: {
    backgroundColor: "rgba(0,255,68,0.15)", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: "rgba(0,255,68,0.4)",
  },
  osBadgeText: { color: "#00FF44", fontSize: 8, fontFamily: "Orbitron_700Bold", letterSpacing: 1 },

  // Kokoro voices
  kokoroInfoBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(0,255,68,0.06)", borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: "rgba(0,255,68,0.2)",
  },
  kokoroInfoText: { color: "#00FF44", fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  kokoroVoicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kokoroVoiceChip: {
    alignItems: "center", gap: 2,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, backgroundColor: "#0D0D0D",
    borderWidth: 1, borderColor: "#1A1A1A",
    minWidth: 72, position: "relative",
  },
  kokoroVoiceChipActive: { borderColor: C2.primary, backgroundColor: "rgba(204,0,0,0.08)" },
  kokoroVoiceGender: { fontSize: 16 },
  kokoroVoiceName: { color: C2.mutedForeground, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  kokoroVoiceAccent: { fontSize: 10 },
  kokoroCheck: {
    position: "absolute", top: 3, right: 3,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "rgba(204,0,0,0.2)", alignItems: "center", justifyContent: "center",
  },
  currentVoiceBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#0D0D0D", borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: "rgba(204,0,0,0.2)",
  },
  currentVoiceText: { color: C2.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // ElevenLabs clone card
  cloneCard: {
    backgroundColor: "#0A0A0A", borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: "#1A1A1A", gap: 10,
  },
  cloneTopRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  cloneIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "#111111", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#222222",
  },
  cloneNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cloneName: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  clonedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,255,68,0.1)", borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: "rgba(0,255,68,0.3)",
  },
  clonedText: { color: "#00FF44", fontSize: 8, fontFamily: "Orbitron_700Bold", letterSpacing: 1 },
  cloneDesc: { color: C2.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" },
  cloneBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C2.primary, borderRadius: 12, paddingVertical: 13,
    shadowColor: C2.primary, shadowRadius: 10, shadowOpacity: 0.4, elevation: 6,
  },
  cloneBtnDisabled: { opacity: 0.45 },
  cloneBtnText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  voiceIdRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  voiceIdText: { color: "#333333", fontSize: 10, fontFamily: "Inter_400Regular" },

  // Voice items
  voiceItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 12, borderRadius: 12, backgroundColor: "#0D0D0D",
    borderWidth: 1, borderColor: "#1A1A1A",
  },
  voiceItemActive: { borderColor: "rgba(204,0,0,0.5)", backgroundColor: "rgba(204,0,0,0.06)" },
  voiceLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  voiceGenderDot: { width: 8, height: 8, borderRadius: 4 },
  voiceLabel: { color: C2.mutedForeground, fontSize: 13, fontFamily: "Inter_500Medium" },
  voiceSub: { color: "#444444", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  voiceCheck: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(204,0,0,0.15)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(204,0,0,0.3)",
  },
  clearBtn: {
    alignItems: "center", paddingVertical: 8, marginTop: 2,
    borderRadius: 8, borderWidth: 1, borderColor: "#222222",
  },
  clearBtnText: { color: "#555555", fontSize: 11, fontFamily: "Inter_400Regular" },

  genderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  genderChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: "#1A1A1A", backgroundColor: "#0D0D0D",
  },
  genderChipActive: { borderColor: C2.primary, backgroundColor: "rgba(204,0,0,0.1)" },
  genderText: { color: C2.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold" },
  genderTextActive: { color: C2.primary },

  // Test voice button
  testVoiceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#00FF44", borderRadius: 16, paddingVertical: 16,
    shadowColor: "#00FF44", shadowRadius: 16, shadowOpacity: 0.4, elevation: 8,
  },
  testVoiceBtnText: { color: "#000000", fontSize: 15, fontFamily: "Inter_700Bold" },

  voiceInfoCard: {
    backgroundColor: "#080808", borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: "#141414", gap: 2,
  },
  voiceInfoTitle: {
    color: C2.mutedForeground, fontSize: 9, fontFamily: "Orbitron_400Regular",
    letterSpacing: 2, marginBottom: 8,
  },

  dangerBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 12,
    backgroundColor: "rgba(255,68,68,0.06)", borderWidth: 1, borderColor: "rgba(255,68,68,0.2)",
  },
  dangerText: { color: "#FF4444", fontSize: 13, fontFamily: "Inter_500Medium" },

  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#0A0A0A",
  },
  infoLabel: { color: C2.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" },
  infoValue: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_500Medium", maxWidth: "55%" },
});
