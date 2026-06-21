import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import colors from "@/constants/colors";
import { AI_PROVIDERS, RESPONSE_MODES } from "@/constants/config";
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
    selectedProfileId, selectProfile,
    selectedGenderFilter, setGenderFilter,
    systemVoices, systemVoiceId, selectSystemVoice,
    speak,
  } = useVoice();

  const [tab, setTab] = useState<Tab>("ai");
  const [editName, setEditName] = useState(memory.name);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);

  const saveApiKey = async () => {
    await updateSettings({ apiKey: apiKey.trim() });
    Alert.alert("✅ Saved", "API key saved successfully.");
  };

  const saveName = async () => {
    await updateMemory({ name: editName.trim() });
    Alert.alert("✅ Saved", `JAVIS will now call you ${editName.trim() || "Sir"}.`);
  };

  const testVoice = () => {
    speak("JAVIS online. All systems operational, Sir.");
  };

  const tabs: Array<{ id: Tab; icon: any; label: string }> = [
    { id: "ai",      icon: "cpu",      label: "AI" },
    { id: "voice",   icon: "mic",      label: "Voice" },
    { id: "memory",  icon: "database", label: "Memory" },
    { id: "profile", icon: "user",     label: "Profile" },
    { id: "system",  icon: "zap",      label: "System" },
  ];

  const genderFiltered = selectedGenderFilter === "all"
    ? systemVoices
    : systemVoices.filter(v => detectGender(v) === selectedGenderFilter);

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

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
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
        style={styles.content}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── AI ── */}
        {tab === "ai" && (
          <>
            <Card title="PROVIDER">
              {Object.entries(AI_PROVIDERS).map(([key, prov]) => (
                <RadioItem
                  key={key}
                  label={prov.name}
                  sub={`${prov.models.length} models`}
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
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="sk-or-v1-... or gsk_..."
                  placeholderTextColor={C.mutedForeground}
                  secureTextEntry={!showApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setShowApiKey(v => !v)} style={styles.eyeBtn}>
                  <Feather name={showApiKey ? "eye-off" : "eye"} size={16} color={C.mutedForeground} />
                </TouchableOpacity>
              </View>
              <ActionBtn label="Save API Key" icon="save" onPress={saveApiKey} />
              <Text style={styles.hint}>
                OpenRouter: openrouter.ai/keys{"\n"}Groq: console.groq.com/keys
              </Text>
            </Card>

            <Card title="RESPONSE LENGTH">
              {RESPONSE_MODES.map(m => (
                <RadioItem
                  key={m.id}
                  label={m.name}
                  sub={`${m.maxTokens} tokens`}
                  active={settings.responseMode === m.id}
                  onPress={() => updateSettings({ responseMode: m.id })}
                />
              ))}
            </Card>
          </>
        )}

        {/* ── VOICE ── */}
        {tab === "voice" && (
          <>
            <Card title="GENDER FILTER">
              <View style={styles.genderRow}>
                {(["all", "male", "female", "neutral"] as const).map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderChip, selectedGenderFilter === g && styles.genderChipActive]}
                    onPress={() => setGenderFilter(g)}
                  >
                    <Text style={[styles.genderText, selectedGenderFilter === g && styles.genderTextActive]}>
                      {g === "all" ? "ALL" : g === "male" ? "♂ MALE" : g === "female" ? "♀ FEMALE" : "⊕ NEUTRAL"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            <Card title="VOICE PRESET">
              <Text style={styles.sectionHint}>Preset tone profiles — pitch & speed settings</Text>
              {PRESET_PROFILES.filter(p =>
                selectedGenderFilter === "all" || p.gender === selectedGenderFilter
              ).map(profile => (
                <TouchableOpacity
                  key={profile.id}
                  style={[styles.voiceItem, selectedProfileId === profile.id && styles.voiceItemActive]}
                  onPress={() => { selectProfile(profile.id); Haptics.selectionAsync(); }}
                >
                  <View style={styles.voiceLeft}>
                    <View style={[styles.voiceGenderDot, {
                      backgroundColor: profile.gender === "male" ? "#4488FF"
                        : profile.gender === "female" ? "#FF44AA"
                        : "#888888",
                    }]} />
                    <View>
                      <Text style={[styles.voiceLabel, selectedProfileId === profile.id && { color: "#FFFFFF" }]}>
                        {profile.name}
                      </Text>
                      <Text style={styles.voiceSub}>
                        Pitch {profile.pitch} · Rate {profile.rate}
                      </Text>
                    </View>
                  </View>
                  {selectedProfileId === profile.id && (
                    <View style={styles.voiceCheck}>
                      <Feather name="check" size={13} color={C.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </Card>

            {systemVoices.length > 0 && (
              <Card title={`SYSTEM VOICES (${genderFiltered.length})`}>
                <Text style={styles.sectionHint}>Device TTS voices — overrides preset when selected</Text>
                <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {genderFiltered.map(voice => {
                    const g = detectGender(voice);
                    return (
                      <TouchableOpacity
                        key={voice.identifier}
                        style={[styles.voiceItem, systemVoiceId === voice.identifier && styles.voiceItemActive]}
                        onPress={() => { selectSystemVoice(voice.identifier); Haptics.selectionAsync(); }}
                      >
                        <View style={styles.voiceLeft}>
                          <View style={[styles.voiceGenderDot, {
                            backgroundColor: g === "male" ? "#4488FF"
                              : g === "female" ? "#FF44AA"
                              : "#888888",
                          }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.voiceLabel, systemVoiceId === voice.identifier && { color: "#FFFFFF" }]}
                              numberOfLines={1}>
                              {voice.name || voice.identifier}
                            </Text>
                            <Text style={styles.voiceSub}>
                              {voice.language} · {g}
                              {voice.quality === "Enhanced" ? " · ✨ Enhanced" : ""}
                            </Text>
                          </View>
                        </View>
                        {systemVoiceId === voice.identifier && (
                          <View style={styles.voiceCheck}>
                            <Feather name="check" size={13} color={C.primary} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {systemVoiceId && (
                  <TouchableOpacity
                    style={[styles.clearBtn]}
                    onPress={() => selectSystemVoice("")}
                  >
                    <Text style={styles.clearBtnText}>Clear system voice (use preset)</Text>
                  </TouchableOpacity>
                )}
              </Card>
            )}

            <ActionBtn
              label="Test Current Voice"
              icon="volume-2"
              onPress={testVoice}
              color="#00FF44"
            />
          </>
        )}

        {/* ── MEMORY ── */}
        {tab === "memory" && (
          <>
            <Card title="MEMORY STATUS">
              <InfoRow label="Stored Conversations" value="Local only" />
              <InfoRow label="Last Updated" value={new Date(memory.lastUpdated).toLocaleDateString()} />
              <InfoRow label="Interests" value={`${memory.interests.length} entries`} />
              <InfoRow label="Goals" value={`${memory.goals.length} entries`} />
              <InfoRow label="Favorite Contacts" value={`${memory.favoriteContacts.length} saved`} />
            </Card>

            <Card title="MANAGE DATA">
              <TouchableOpacity
                style={[styles.dangerBtn]}
                onPress={() => Alert.alert(
                  "Clear History",
                  "Delete all conversation history? This cannot be undone.",
                  [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: clearConversations }]
                )}
              >
                <Feather name="trash-2" size={15} color="#FF4444" />
                <Text style={styles.dangerText}>Clear Conversation History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dangerBtn]}
                onPress={() => Alert.alert(
                  "Reset Memory",
                  "Reset all JAVIS memory including name, interests, and goals?",
                  [{ text: "Cancel" }, {
                    text: "Reset", style: "destructive",
                    onPress: () => updateMemory({ name: "", interests: [], goals: [], favoriteApps: [], favoriteContacts: [], habits: [] })
                  }]
                )}
              >
                <Feather name="refresh-ccw" size={15} color="#FF4444" />
                <Text style={styles.dangerText}>Reset All Memory</Text>
              </TouchableOpacity>
            </Card>
          </>
        )}

        {/* ── PROFILE ── */}
        {tab === "profile" && (
          <Card title="YOUR IDENTITY">
            <Text style={styles.fieldLabel}>Name (JAVIS will call you this)</Text>
            <TextInput
              style={styles.fieldInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name..."
              placeholderTextColor={C.mutedForeground}
            />
            <ActionBtn label="Save Name" icon="check" onPress={saveName} />

            <View style={{ height: 1, backgroundColor: "#1A1A1A", marginVertical: 8 }} />

            <Text style={styles.fieldLabel}>Interests (comma-separated)</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 70, textAlignVertical: "top" }]}
              value={memory.interests.join(", ")}
              onChangeText={text => updateMemory({ interests: text.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="tech, music, AI..."
              placeholderTextColor={C.mutedForeground}
              multiline
            />

            <Text style={styles.fieldLabel}>Goals (one per line)</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 70, textAlignVertical: "top" }]}
              value={memory.goals.join("\n")}
              onChangeText={text => updateMemory({ goals: text.split("\n").map(s => s.trim()).filter(Boolean) })}
              placeholder="Build a startup&#10;Learn AI..."
              placeholderTextColor={C.mutedForeground}
              multiline
            />
          </Card>
        )}

        {/* ── SYSTEM ── */}
        {tab === "system" && (
          <>
            <Card title="DEVICE PROFILE">
              <InfoRow label="Target Device" value="Redmi A1 (Android 12 Go)" />
              <InfoRow label="Build Type" value="Debug APK" />
              <InfoRow label="AI Backend" value="OpenRouter / Groq" />
              <InfoRow label="TTS Engine" value="expo-speech (system)" />
              <InfoRow label="Memory" value="AsyncStorage (local)" />
              <InfoRow label="App Version" value="1.0.0" />
            </Card>
            <Card title="PERFORMANCE">
              <Text style={styles.hint}>
                JAVIS is optimized for low-RAM devices. Qwen 3 Mini and Llama 3.1 8B are recommended for the Redmi A1.
                {"\n\n"}Voice processing uses the device's built-in TTS engine — no internet required for TTS.
                {"\n\n"}All memory is stored locally via AsyncStorage and never leaves the device.
              </Text>
            </Card>
            <Card title="BUILD">
              <InfoRow label="GitHub Repo" value="manl244345-rgb/JAVIS-..." />
              <InfoRow label="CI/CD" value="GitHub Actions" />
              <InfoRow label="Build Status" value="✅ Debug APK ready" />
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

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
  label: string; sub?: string; active: boolean;
  onPress: () => void; badge?: string; badgeColor?: string;
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
      {badge && (
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0F0F0F",
  },
  backBtn: { padding: 8 },
  headerTitle: { color: C.primary, fontSize: 14, fontFamily: "Orbitron_700Bold", letterSpacing: 3 },
  headerSub: { color: C.mutedForeground, fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  tabBar: { maxHeight: 52, marginVertical: 8 },
  tabChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: "#1A1A1A", backgroundColor: "#080808",
  },
  tabChipActive: { borderColor: C.primary, backgroundColor: "rgba(204,0,0,0.1)" },
  tabLabel: { color: C.mutedForeground, fontSize: 11, fontFamily: "Orbitron_400Regular", letterSpacing: 1 },
  tabLabelActive: { color: C.primary },
  content: { flex: 1 },
  card: {
    backgroundColor: "#080808",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#141414",
    gap: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  cardAccent: { width: 3, height: 16, backgroundColor: C.primary, borderRadius: 2 },
  cardTitle: { color: C.mutedForeground, fontSize: 9, fontFamily: "Orbitron_400Regular", letterSpacing: 2 },
  radioItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderRadius: 12,
    backgroundColor: "#0D0D0D", borderWidth: 1, borderColor: "#1A1A1A",
  },
  radioItemActive: { borderColor: "rgba(204,0,0,0.5)", backgroundColor: "rgba(204,0,0,0.06)" },
  radioDot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: "#333333",
  },
  radioDotActive: { borderColor: C.primary, backgroundColor: C.primary },
  radioLabel: { color: C.mutedForeground, fontSize: 13, fontFamily: "Inter_500Medium" },
  radioSub: { color: "#444444", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  badgeText: { fontSize: 9, fontFamily: "Orbitron_700Bold", letterSpacing: 1 },
  apiRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#0D0D0D", borderRadius: 12,
    borderWidth: 1, borderColor: "#1A1A1A",
    paddingHorizontal: 14,
  },
  apiInput: {
    flex: 1, color: "#FFFFFF", fontSize: 13,
    fontFamily: "Inter_400Regular", paddingVertical: 12,
  },
  eyeBtn: { padding: 8 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 12, paddingVertical: 13,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  hint: { color: "#444444", fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
  sectionHint: { color: "#333333", fontSize: 10, fontFamily: "Inter_400Regular", marginBottom: 4 },
  genderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  genderChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: "#1A1A1A",
    backgroundColor: "#0D0D0D",
  },
  genderChipActive: { borderColor: C.primary, backgroundColor: "rgba(204,0,0,0.1)" },
  genderText: { color: C.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold" },
  genderTextActive: { color: C.primary },
  voiceItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 12, borderRadius: 12,
    backgroundColor: "#0D0D0D", borderWidth: 1, borderColor: "#1A1A1A",
  },
  voiceItemActive: { borderColor: "rgba(204,0,0,0.5)", backgroundColor: "rgba(204,0,0,0.06)" },
  voiceLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  voiceGenderDot: { width: 8, height: 8, borderRadius: 4 },
  voiceLabel: { color: C.mutedForeground, fontSize: 13, fontFamily: "Inter_500Medium" },
  voiceSub: { color: "#444444", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  voiceCheck: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(204,0,0,0.15)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(204,0,0,0.3)",
  },
  clearBtn: {
    alignItems: "center", paddingVertical: 8, marginTop: 4,
    borderRadius: 8, borderWidth: 1, borderColor: "#222222",
  },
  clearBtnText: { color: "#555555", fontSize: 11, fontFamily: "Inter_400Regular" },
  dangerBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 12,
    backgroundColor: "rgba(255,68,68,0.06)",
    borderWidth: 1, borderColor: "rgba(255,68,68,0.2)",
  },
  dangerText: { color: "#FF4444", fontSize: 13, fontFamily: "Inter_500Medium" },
  fieldLabel: { color: C.mutedForeground, fontSize: 10, fontFamily: "Inter_400Regular", letterSpacing: 1 },
  fieldInput: {
    backgroundColor: "#0D0D0D", borderRadius: 12,
    borderWidth: 1, borderColor: "#1A1A1A",
    color: "#FFFFFF", paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: "Inter_400Regular",
  },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: "#0F0F0F",
  },
  infoLabel: { color: C.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" },
  infoValue: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_500Medium" },
});
