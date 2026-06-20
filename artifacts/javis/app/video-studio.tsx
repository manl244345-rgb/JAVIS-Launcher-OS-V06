import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import colors from "@/constants/colors";

const C = colors.dark;

const TOOLS = [
  { id: "trim", label: "Trim", icon: "scissors" as const, desc: "Cut and trim video clips" },
  { id: "merge", label: "Merge", icon: "link" as const, desc: "Combine multiple videos" },
  { id: "enhance", label: "Enhance", icon: "star" as const, desc: "AI video enhancement" },
  { id: "captions", label: "Captions", icon: "type" as const, desc: "Auto-generate captions" },
  { id: "voice", label: "Replace Voice", icon: "mic" as const, desc: "Replace audio with AI voice" },
];

export default function VideoStudioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTool, setActiveTool] = useState<string | null>(null);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VIDEO STUDIO</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 40 }}>
        {/* Upload */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.uploadArea}>
            <Feather name="film" size={48} color={C.mutedForeground} />
            <Text style={styles.uploadLabel}>Select Video</Text>
            <Text style={styles.uploadSub}>MP4, MOV supported</Text>
          </TouchableOpacity>
        </View>

        {/* Tools Grid */}
        <View style={styles.toolsGrid}>
          {TOOLS.map(tool => (
            <TouchableOpacity
              key={tool.id}
              style={[styles.toolCard, activeTool === tool.id && styles.toolCardActive]}
              onPress={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
            >
              <Feather name={tool.icon} size={24} color={activeTool === tool.id ? C.primary : C.mutedForeground} />
              <Text style={[styles.toolLabel, activeTool === tool.id && styles.toolLabelActive]}>{tool.label}</Text>
              <Text style={styles.toolDesc}>{tool.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTool && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{TOOLS.find(t => t.id === activeTool)?.label?.toUpperCase()}</Text>
            <Text style={styles.infoText}>Select a video file first, then apply this tool. JAVIS will process it locally using AI.</Text>
            <TouchableOpacity style={styles.processBtn}>
              <Feather name="play" size={16} color={C.foreground} />
              <Text style={styles.processBtnText}>Process Video</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  card: { backgroundColor: C.surfaceElevated, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  uploadArea: { alignItems: "center", gap: 10, paddingVertical: 28 },
  uploadLabel: { color: C.foreground, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  uploadSub: { color: C.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" },
  toolsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  toolCard: {
    width: "46%",
    backgroundColor: C.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  toolCardActive: { borderColor: C.primary, backgroundColor: "rgba(204,0,0,0.08)" },
  toolLabel: { color: C.foreground, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  toolLabelActive: { color: C.primary },
  toolDesc: { color: C.mutedForeground, fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  cardTitle: { color: C.mutedForeground, fontSize: 10, fontFamily: "Orbitron_400Regular", letterSpacing: 2, marginBottom: 10 },
  infoText: { color: C.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 12 },
  processBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 14,
  },
  processBtnText: { color: C.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
