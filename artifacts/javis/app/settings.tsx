import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { AI_PROVIDERS, RESPONSE_MODES, VOICE_PROFILES } from "@/constants/config";
import { useAI } from "@/contexts/AIContext";
import { useMemory } from "@/contexts/MemoryContext";
import { useVoice } from "@/contexts/VoiceContext";

const C = colors.dark;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateSettings } = useAI();
  const { memory, updateMemory, clearConversations } = useMemory();
  const { selectedVoiceId, selectVoice } = useVoice();
  const [editName, setEditName] = useState(memory.name);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("ai");

  const saveApiKey = async () => {
    await updateSettings({ apiKey });
    Alert.alert("Saved", "API key saved successfully.");
  };

  const saveName = async () => {
    await updateMemory({ name: editName });
    Alert.alert("Saved", "Profile updated.");
  };

  const Section = ({ id, title, icon }: { id: string; title: string; icon: any }) => (
    <TouchableOpacity
      style={[styles.sectionTab, activeSection === id && styles.sectionTabActive]}
      onPress={() => setActiveSection(id)}
    >
      <Feather name={icon} size={14} color={activeSection === id ? C.primary : C.mutedForeground} />
      <Text style={[styles.sectionLabel, activeSection === id && styles.sectionLabelActive]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.sectionTabs} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        <Section id="ai" title="AI" icon="cpu" />
        <Section id="voice" title="Voice" icon="mic" />
        <Section id="memory" title="Memory" icon="database" />
        <Section id="profile" title="Profile" icon="user" />
        <Section id="performance" title="Performance" icon="zap" />
      </ScrollView>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 40 }}>

        {/* AI Settings */}
        {activeSection === "ai" && (
          <>
            <SettingsCard title="API Provider">
              {Object.entries(AI_PROVIDERS).map(([key, prov]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.radioItem, settings.provider === key && styles.radioItemActive]}
                  onPress={() => updateSettings({ provider: key as any })}
                >
                  <View style={[styles.radioDot, settings.provider === key && styles.radioDotActive]} />
                  <Text style={styles.radioLabel}>{prov.name}</Text>
                </TouchableOpacity>
              ))}
            </SettingsCard>

            <SettingsCard title="AI Model">
              {AI_PROVIDERS[settings.provider].models.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.radioItem, settings.modelId === m.id && styles.radioItemActive]}
                  onPress={() => updateSettings({ modelId: m.id })}
                >
                  <View style={[styles.radioDot, settings.modelId === m.id && styles.radioDotActive]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.radioLabel}>{m.name}</Text>
                    <Text style={styles.radioSub}>{m.tier}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </SettingsCard>

            <SettingsCard title="API Key">
              <View style={styles.apiRow}>
                <TextInput
                  style={styles.apiInput}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="sk-or-..."
                  placeholderTextColor={C.mutedForeground}
                  secureTextEntry={!showApiKey}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowApiKey(v => !v)} style={styles.eyeBtn}>
                  <Feather name={showApiKey ? "eye-off" : "eye"} size={16} color={C.mutedForeground} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={saveApiKey}>
                <Text style={styles.saveBtnText}>Save API Key</Text>
              </TouchableOpacity>
            </SettingsCard>

            <SettingsCard title="Response Mode">
              {RESPONSE_MODES.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.radioItem, settings.responseMode === m.id && styles.radioItemActive]}
                  onPress={() => updateSettings({ responseMode: m.id })}
                >
                  <View style={[styles.radioDot, settings.responseMode === m.id && styles.radioDotActive]} />
                  <Text style={styles.radioLabel}>{m.name} ({m.maxTokens} tokens)</Text>
                </TouchableOpacity>
              ))}
            </SettingsCard>
          </>
        )}

        {/* Voice Settings */}
        {activeSection === "voice" && (
          <>
            <SettingsCard title="Voice Profile">
              {VOICE_PROFILES.map(vp => (
                <TouchableOpacity
                  key={vp.id}
                  style={[styles.radioItem, selectedVoiceId === vp.id && styles.radioItemActive]}
                  onPress={() => selectVoice(vp.id)}
                >
                  <View style={[styles.radioDot, selectedVoiceId === vp.id && styles.radioDotActive]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.radioLabel}>{vp.name}</Text>
                    <Text style={styles.radioSub}>Pitch: {vp.pitch} · Rate: {vp.rate}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </SettingsCard>

            <SettingsCard title="Voice Cloning">
              <Text style={styles.infoText}>Upload an audio sample to create a custom voice profile. Stored locally on your device.</Text>
              <TouchableOpacity style={[styles.saveBtn, { opacity: 0.5 }]}>
                <Feather name="upload" size={14} color={C.foreground} />
                <Text style={styles.saveBtnText}>Upload Voice Sample</Text>
              </TouchableOpacity>
              <Text style={styles.comingSoon}>Voice cloning requires APK build</Text>
            </SettingsCard>
          </>
        )}

        {/* Memory Settings */}
        {activeSection === "memory" && (
          <>
            <SettingsCard title="Memory Status">
              <InfoRow label="Conversations" value={`Stored locally`} />
              <InfoRow label="Last Updated" value={new Date(memory.lastUpdated).toLocaleDateString()} />
              <InfoRow label="Interests" value={`${memory.interests.length} entries`} />
              <InfoRow label="Goals" value={`${memory.goals.length} entries`} />
            </SettingsCard>

            <SettingsCard title="Manage Memory">
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: "rgba(255,0,0,0.1)" }]}
                onPress={() => Alert.alert("Clear History", "Clear all conversation history?", [
                  { text: "Cancel" },
                  { text: "Clear", style: "destructive", onPress: clearConversations },
                ])}
              >
                <Feather name="trash-2" size={14} color={C.primary} />
                <Text style={[styles.saveBtnText, { color: C.primary }]}>Clear Conversations</Text>
              </TouchableOpacity>
            </SettingsCard>
          </>
        )}

        {/* Profile */}
        {activeSection === "profile" && (
          <SettingsCard title="Your Profile">
            <Text style={styles.fieldLabel}>Your Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="What should JAVIS call you?"
              placeholderTextColor={C.mutedForeground}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveName}>
              <Text style={styles.saveBtnText}>Save Profile</Text>
            </TouchableOpacity>
          </SettingsCard>
        )}

        {/* Performance */}
        {activeSection === "performance" && (
          <SettingsCard title="Performance Profile">
            <InfoRow label="Target Device" value="Redmi A1 (Android 12 Go)" />
            <InfoRow label="Default AI" value="Qwen 3 Mini (Fast)" />
            <InfoRow label="Default Voice" value="Expo Speech TTS" />
            <InfoRow label="Memory Mode" value="AsyncStorage (Local)" />
            <InfoRow label="Build Target" value="APK via GitHub Actions" />
            <Text style={[styles.infoText, { marginTop: 8 }]}>
              JAVIS is optimized for low-RAM devices. Heavy models are disabled by default.
            </Text>
          </SettingsCard>
        )}
      </ScrollView>
    </View>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.cardContent}>{children}</View>
    </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { padding: 6 },
  headerTitle: {
    color: C.primary,
    fontSize: 14,
    fontFamily: "Orbitron_700Bold",
    letterSpacing: 3,
  },
  sectionTabs: {
    maxHeight: 48,
    marginBottom: 4,
  },
  sectionTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  sectionTabActive: {
    borderColor: C.primary,
    backgroundColor: "rgba(204,0,0,0.1)",
  },
  sectionLabel: {
    color: C.mutedForeground,
    fontSize: 11,
    fontFamily: "Orbitron_400Regular",
    letterSpacing: 1,
  },
  sectionLabelActive: { color: C.primary },
  content: { flex: 1 },
  card: {
    backgroundColor: C.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: {
    color: C.mutedForeground,
    fontSize: 10,
    fontFamily: "Orbitron_400Regular",
    letterSpacing: 2,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  cardContent: { gap: 10 },
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: "transparent",
  },
  radioItemActive: {
    borderColor: "rgba(204,0,0,0.4)",
    backgroundColor: "rgba(204,0,0,0.08)",
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.mutedForeground,
  },
  radioDotActive: {
    borderColor: C.primary,
    backgroundColor: C.primary,
  },
  radioLabel: {
    color: C.foreground,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  radioSub: {
    color: C.mutedForeground,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  apiRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
  },
  apiInput: {
    flex: 1,
    color: C.foreground,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingVertical: 12,
  },
  eyeBtn: { padding: 8 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(204,0,0,0.15)",
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(204,0,0,0.3)",
    marginTop: 4,
  },
  saveBtnText: {
    color: C.foreground,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  fieldLabel: {
    color: C.mutedForeground,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    color: C.foreground,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  infoLabel: { color: C.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" },
  infoValue: { color: C.foreground, fontSize: 12, fontFamily: "Inter_500Medium" },
  infoText: { color: C.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  comingSoon: { color: "rgba(204,0,0,0.5)", fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
});
