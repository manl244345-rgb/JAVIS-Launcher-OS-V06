import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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

const C = colors.dark;

const TOOLS = [
  { id: "generate", label: "Generate", icon: "zap" as const },
  { id: "upscale", label: "Upscale", icon: "maximize" as const },
  { id: "remove-bg", label: "Remove BG", icon: "scissors" as const },
  { id: "expand", label: "Expand", icon: "maximize-2" as const },
];

export default function ImageStudioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTool, setActiveTool] = useState("generate");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      await new Promise(res => setTimeout(res, 2000));
      setResult("https://picsum.photos/400/400?random=" + Date.now());
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>IMAGE STUDIO</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.toolTabs} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {TOOLS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.toolTab, activeTool === t.id && styles.toolTabActive]}
            onPress={() => setActiveTool(t.id)}
          >
            <Feather name={t.icon} size={14} color={activeTool === t.id ? C.primary : C.mutedForeground} />
            <Text style={[styles.toolLabel, activeTool === t.id && styles.toolLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 40 }}>

        {activeTool === "generate" && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Describe Your Image</Text>
              <TextInput
                style={styles.promptInput}
                value={prompt}
                onChangeText={setPrompt}
                placeholder="A mechanical skull in deep space with red energy rings..."
                placeholderTextColor={C.mutedForeground}
                multiline
                numberOfLines={4}
              />
              <TouchableOpacity style={styles.genBtn} onPress={handleGenerate} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={C.foreground} size="small" />
                ) : (
                  <>
                    <Feather name="zap" size={16} color={C.foreground} />
                    <Text style={styles.genBtnText}>Generate Image</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {result && (
              <View style={styles.resultCard}>
                <Image source={{ uri: result }} style={styles.resultImage} resizeMode="cover" />
                <View style={styles.resultActions}>
                  <TouchableOpacity style={styles.resultBtn}>
                    <Feather name="download" size={16} color={C.foreground} />
                    <Text style={styles.resultBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resultBtn}>
                    <Feather name="share-2" size={16} color={C.foreground} />
                    <Text style={styles.resultBtnText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resultBtn} onPress={() => setActiveTool("upscale")}>
                    <Feather name="maximize" size={16} color={C.foreground} />
                    <Text style={styles.resultBtnText}>Upscale</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {activeTool !== "generate" && (
          <View style={styles.card}>
            <View style={styles.uploadArea}>
              <Feather name="upload-cloud" size={40} color={C.mutedForeground} />
              <Text style={styles.uploadLabel}>Tap to select an image</Text>
              <Text style={styles.uploadSub}>PNG, JPG supported</Text>
              <TouchableOpacity style={[styles.genBtn, { marginTop: 16 }]}>
                <Feather name="image" size={16} color={C.foreground} />
                <Text style={styles.genBtnText}>Select from Gallery</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.uploadSub, { textAlign: "center", marginTop: 8 }]}>
              {activeTool === "upscale" ? "Upscale to 4x resolution using AI"
                : activeTool === "remove-bg" ? "Remove background automatically with AI"
                : "Expand image beyond its original borders"}
            </Text>
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
  toolTabs: { maxHeight: 48, marginBottom: 4 },
  toolTab: {
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
  toolTabActive: { borderColor: C.primary, backgroundColor: "rgba(204,0,0,0.1)" },
  toolLabel: { color: C.mutedForeground, fontSize: 11, fontFamily: "Orbitron_400Regular", letterSpacing: 1 },
  toolLabelActive: { color: C.primary },
  content: { flex: 1 },
  card: { backgroundColor: C.surfaceElevated, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  cardTitle: { color: C.mutedForeground, fontSize: 10, fontFamily: "Orbitron_400Regular", letterSpacing: 2, marginBottom: 12 },
  promptInput: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    color: C.foreground,
    padding: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  genBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 14,
  },
  genBtnText: { color: C.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  resultCard: { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  resultImage: { width: "100%", height: 320 },
  resultActions: {
    flexDirection: "row",
    backgroundColor: C.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  resultBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  resultBtnText: { color: C.foreground, fontSize: 12, fontFamily: "Inter_500Medium" },
  uploadArea: { alignItems: "center", paddingVertical: 32, gap: 8 },
  uploadLabel: { color: C.foreground, fontSize: 14, fontFamily: "Inter_500Medium" },
  uploadSub: { color: C.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" },
});
