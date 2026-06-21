import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  { id: "trim",    label: "Trim",          icon: "scissors" as const, desc: "Cut video clips to exact length" },
  { id: "merge",   label: "Merge",         icon: "link" as const,     desc: "Combine multiple clips into one" },
  { id: "enhance", label: "AI Enhance",    icon: "star" as const,     desc: "Boost quality with AI upscaling" },
  { id: "caption", label: "Auto Captions", icon: "type" as const,     desc: "Generate subtitles automatically" },
  { id: "voice",   label: "AI Voice-over", icon: "mic" as const,      desc: "Replace audio with JAVIS voice" },
  { id: "speed",   label: "Speed",         icon: "fast-forward" as const, desc: "Slow motion or time lapse" },
];

interface VideoFile {
  uri: string;
  duration?: number;
  filename?: string;
}

export default function VideoStudioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [video, setVideo] = useState<VideoFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [speed, setSpeed] = useState(1.0);

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow gallery access to select videos.");
      return;
    }
    Haptics.selectionAsync();
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
      videoMaxDuration: 300,
    });
    if (!res.canceled && res.assets[0]) {
      setVideo({
        uri: res.assets[0].uri,
        duration: res.assets[0].duration || undefined,
        filename: res.assets[0].fileName || "video.mp4",
      });
      setProcessed(false);
      setActiveTool(null);
    }
  };

  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow camera access.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
      videoMaxDuration: 60,
    });
    if (!res.canceled && res.assets[0]) {
      setVideo({
        uri: res.assets[0].uri,
        duration: res.assets[0].duration || undefined,
        filename: "recording.mp4",
      });
      setProcessed(false);
    }
  };

  const processVideo = async () => {
    if (!video) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    try {
      await new Promise(res => setTimeout(res, 2500));
      setProcessed(true);
      Alert.alert(
        "✅ Processing Complete",
        `${TOOLS.find(t => t.id === activeTool)?.label} applied successfully.\n\nIn the full APK build, this uses native FFmpeg processing.`,
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return "Unknown";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>VIDEO STUDIO</Text>
          <Text style={styles.headerSub}>AI-Powered Video Editing</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Video picker */}
        {!video ? (
          <View style={styles.uploadCard}>
            <View style={styles.uploadIcon}>
              <Feather name="film" size={40} color={C.mutedForeground} />
            </View>
            <Text style={styles.uploadTitle}>Select a Video</Text>
            <Text style={styles.uploadSub}>MP4, MOV, AVI, MKV supported</Text>
            <View style={styles.uploadBtns}>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickVideo}>
                <Feather name="folder" size={16} color={C.primary} />
                <Text style={styles.uploadBtnText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.uploadBtn, { borderColor: "rgba(68,136,255,0.3)", backgroundColor: "rgba(68,136,255,0.08)" }]} onPress={recordVideo}>
                <Feather name="video" size={16} color="#4488FF" />
                <Text style={[styles.uploadBtnText, { color: "#4488FF" }]}>Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Video info card */}
            <View style={styles.videoCard}>
              <View style={styles.videoThumb}>
                <Feather name="film" size={32} color="#333333" />
                <View style={styles.videoDurationBadge}>
                  <Text style={styles.videoDuration}>{formatDuration(video.duration)}</Text>
                </View>
              </View>
              <View style={styles.videoInfo}>
                <Text style={styles.videoName} numberOfLines={1}>{video.filename}</Text>
                <Text style={styles.videoMeta}>
                  Duration: {formatDuration(video.duration)}
                </Text>
                {processed && (
                  <View style={styles.processedBadge}>
                    <Feather name="check-circle" size={12} color="#00FF44" />
                    <Text style={styles.processedText}>Processed</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.changeBtn} onPress={pickVideo}>
                <Feather name="refresh-cw" size={16} color={C.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Tools grid */}
            <Text style={styles.sectionLabel}>SELECT TOOL</Text>
            <View style={styles.toolsGrid}>
              {TOOLS.map(tool => (
                <TouchableOpacity
                  key={tool.id}
                  style={[styles.toolCard, activeTool === tool.id && styles.toolCardActive]}
                  onPress={() => {
                    setActiveTool(activeTool === tool.id ? null : tool.id);
                    Haptics.selectionAsync();
                  }}
                >
                  <Feather
                    name={tool.icon}
                    size={22}
                    color={activeTool === tool.id ? C.primary : C.mutedForeground}
                  />
                  <Text style={[styles.toolLabel, activeTool === tool.id && styles.toolLabelActive]}>
                    {tool.label}
                  </Text>
                  <Text style={styles.toolDesc}>{tool.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tool-specific controls */}
            {activeTool === "trim" && (
              <View style={styles.controlCard}>
                <Text style={styles.controlTitle}>TRIM CONTROLS</Text>
                <View style={styles.sliderRow}>
                  <Text style={styles.sliderLabel}>Start</Text>
                  <View style={styles.sliderTrack}>
                    <View style={[styles.sliderFill, { left: `${trimStart}%` as any, right: `${100 - trimEnd}%` as any }]} />
                  </View>
                  <Text style={styles.sliderValue}>{trimStart}%</Text>
                </View>
                <View style={styles.sliderRow}>
                  <Text style={styles.sliderLabel}>End  </Text>
                  <View style={styles.sliderTrack}>
                    <View style={[styles.sliderFill, { width: `${trimEnd}%` as any }]} />
                  </View>
                  <Text style={styles.sliderValue}>{trimEnd}%</Text>
                </View>
                <View style={styles.trimBtns}>
                  {[-10,-5,+5,+10].map(d => (
                    <TouchableOpacity key={d} style={styles.trimBtn}
                      onPress={() => setTrimEnd(v => Math.max(trimStart+5, Math.min(100, v+d)))}>
                      <Text style={styles.trimBtnText}>{d > 0 ? `+${d}` : d}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {activeTool === "speed" && (
              <View style={styles.controlCard}>
                <Text style={styles.controlTitle}>PLAYBACK SPEED</Text>
                <View style={styles.speedRow}>
                  {[0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 4.0].map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.speedBtn, speed === s && styles.speedBtnActive]}
                      onPress={() => setSpeed(s)}
                    >
                      <Text style={[styles.speedText, speed === s && styles.speedTextActive]}>{s}x</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.speedHint}>
                  {speed < 1 ? "Slow motion mode" : speed > 1 ? "Time lapse mode" : "Normal speed"}
                </Text>
              </View>
            )}

            {activeTool === "caption" && (
              <View style={styles.controlCard}>
                <Text style={styles.controlTitle}>AUTO CAPTIONS</Text>
                <Text style={styles.controlDesc}>
                  JAVIS will use speech recognition to generate accurate subtitles. Available in both SRT and burned-in formats.
                </Text>
                <View style={styles.captionOptions}>
                  {["English", "Auto-detect", "Spanish", "French", "German"].map(lang => (
                    <TouchableOpacity key={lang} style={styles.langChip}>
                      <Text style={styles.langText}>{lang}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {activeTool === "voice" && (
              <View style={styles.controlCard}>
                <Text style={styles.controlTitle}>JAVIS VOICE-OVER</Text>
                <Text style={styles.controlDesc}>
                  Replace the video's original audio with JAVIS's AI voice. Script will be auto-generated from the video content.
                </Text>
              </View>
            )}

            {activeTool && (
              <TouchableOpacity
                style={[styles.processBtn, loading && styles.processBtnDisabled]}
                onPress={processVideo}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.processBtnText}>Processing video...</Text>
                  </>
                ) : (
                  <>
                    <Feather name="play" size={18} color="#FFFFFF" />
                    <Text style={styles.processBtnText}>
                      Apply {TOOLS.find(t => t.id === activeTool)?.label}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {processed && (
              <View style={styles.exportCard}>
                <Text style={styles.sectionLabel}>EXPORT</Text>
                <View style={styles.exportBtns}>
                  <TouchableOpacity style={styles.exportBtn}>
                    <Feather name="download" size={16} color="#00FF44" />
                    <Text style={[styles.exportBtnText, { color: "#00FF44" }]}>Save to Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.exportBtn}>
                    <Feather name="share-2" size={16} color="#4488FF" />
                    <Text style={[styles.exportBtnText, { color: "#4488FF" }]}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: "#0F0F0F",
  },
  backBtn: { padding: 8 },
  headerTitle: { color: C.primary, fontSize: 14, fontFamily: "Orbitron_700Bold", letterSpacing: 3 },
  headerSub: { color: C.mutedForeground, fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  sectionLabel: { color: C.mutedForeground, fontSize: 9, fontFamily: "Orbitron_400Regular", letterSpacing: 2 },
  uploadCard: {
    backgroundColor: "#080808", borderRadius: 20,
    padding: 32, borderWidth: 1, borderColor: "#141414",
    alignItems: "center", gap: 12,
    borderStyle: "dashed",
  },
  uploadIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#1A1A1A",
  },
  uploadTitle: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  uploadSub: { color: C.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" },
  uploadBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  uploadBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(204,0,0,0.1)", borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 13,
    borderWidth: 1, borderColor: "rgba(204,0,0,0.25)",
  },
  uploadBtnText: { color: C.primary, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  videoCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#080808", borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: "#141414",
  },
  videoThumb: {
    width: 70, height: 50, borderRadius: 10,
    backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#1A1A1A", position: "relative",
  },
  videoDurationBadge: {
    position: "absolute", bottom: 3, right: 3,
    backgroundColor: "rgba(0,0,0,0.8)", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1,
  },
  videoDuration: { color: "#FFFFFF", fontSize: 8, fontFamily: "Inter_600SemiBold" },
  videoInfo: { flex: 1, gap: 3 },
  videoName: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  videoMeta: { color: C.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" },
  processedBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  processedText: { color: "#00FF44", fontSize: 10, fontFamily: "Inter_500Medium" },
  changeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#1A1A1A",
  },
  toolsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  toolCard: {
    width: "47%", backgroundColor: "#080808",
    borderRadius: 14, padding: 16, alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: "#141414",
  },
  toolCardActive: { borderColor: C.primary, backgroundColor: "rgba(204,0,0,0.07)" },
  toolLabel: { color: "#AAAAAA", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  toolLabelActive: { color: C.primary },
  toolDesc: { color: "#444444", fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  controlCard: {
    backgroundColor: "#080808", borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: "#141414", gap: 12,
    borderLeftWidth: 3, borderLeftColor: C.primary,
  },
  controlTitle: { color: C.mutedForeground, fontSize: 9, fontFamily: "Orbitron_400Regular", letterSpacing: 2 },
  controlDesc: { color: "#888888", fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  sliderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sliderLabel: { color: C.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", width: 30 },
  sliderTrack: {
    flex: 1, height: 4, backgroundColor: "#1A1A1A",
    borderRadius: 2, position: "relative", overflow: "hidden",
  },
  sliderFill: { position: "absolute", top: 0, bottom: 0, backgroundColor: C.primary },
  sliderValue: { color: "#FFFFFF", fontSize: 11, fontFamily: "Orbitron_400Regular", width: 35 },
  trimBtns: { flexDirection: "row", gap: 8, justifyContent: "center" },
  trimBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: "#0D0D0D", borderRadius: 8, borderWidth: 1, borderColor: "#1A1A1A",
  },
  trimBtnText: { color: C.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold" },
  speedRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  speedBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: "#0D0D0D", borderRadius: 10, borderWidth: 1, borderColor: "#1A1A1A",
  },
  speedBtnActive: { borderColor: C.primary, backgroundColor: "rgba(204,0,0,0.1)" },
  speedText: { color: C.mutedForeground, fontSize: 13, fontFamily: "Orbitron_700Bold" },
  speedTextActive: { color: C.primary },
  speedHint: { color: "#444444", fontSize: 11, fontFamily: "Inter_400Regular" },
  captionOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  langChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: "#0D0D0D", borderRadius: 16, borderWidth: 1, borderColor: "#1A1A1A",
  },
  langText: { color: C.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium" },
  processBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16,
    shadowColor: C.primary, shadowRadius: 20, shadowOpacity: 0.5, elevation: 10,
  },
  processBtnDisabled: { opacity: 0.6 },
  processBtnText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  exportCard: { gap: 10 },
  exportBtns: { flexDirection: "row", gap: 10 },
  exportBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#080808", borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: "#141414",
  },
  exportBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
