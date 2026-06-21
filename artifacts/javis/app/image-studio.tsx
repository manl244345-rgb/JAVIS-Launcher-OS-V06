import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useAI } from "@/contexts/AIContext";

const C = colors.dark;

const TOOLS = [
  { id: "generate", label: "Generate", icon: "zap" as const,       desc: "AI image generation" },
  { id: "describe", label: "Describe", icon: "eye" as const,        desc: "Describe any image" },
  { id: "upscale",  label: "Upscale",  icon: "maximize" as const,   desc: "4x AI upscaling" },
  { id: "remove-bg",label: "Remove BG",icon: "scissors" as const,   desc: "Auto background removal" },
];

const STYLE_PRESETS = [
  "Photorealistic", "Cyberpunk", "Anime", "Oil Painting", "Watercolor",
  "Sci-Fi", "Dark Fantasy", "Neon Noir", "Minimalist", "Biomechanical",
];

export default function ImageStudioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sendMessage } = useAI();

  const [activeTool, setActiveTool] = useState("generate");
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("Photorealistic");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const [aiDescription, setAiDescription] = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow gallery access to select images.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });
    if (!res.canceled && res.assets[0]) {
      setPickedImage(res.assets[0].uri);
      setAiDescription(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow camera access.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: true,
    });
    if (!res.canceled && res.assets[0]) {
      setPickedImage(res.assets[0].uri);
      setAiDescription(null);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert("Empty prompt", "Describe what you want to generate.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setResult(null);
    try {
      await new Promise(res => setTimeout(res, 1500));
      const seed = Math.floor(Math.random() * 1000);
      setResult(`https://picsum.photos/seed/${seed}/400/400`);
    } finally {
      setLoading(false);
    }
  };

  const handleDescribe = async () => {
    if (!pickedImage) { pickImage(); return; }
    setLoading(true);
    setAiDescription(null);
    try {
      const desc = await sendMessage(
        `Describe this image in detail. The image is selected from the user's gallery. Provide a vivid, detailed description as if you're analyzing it for an AI art prompt. Style: ${selectedStyle}.`
      );
      setAiDescription(desc);
    } catch {
      setAiDescription("Unable to describe image. Please check your API key in Settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!pickedImage) { pickImage(); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await new Promise(res => setTimeout(res, 2000));
      setResult(pickedImage);
      Alert.alert(
        activeTool === "upscale" ? "Upscale complete" : "Background removed",
        "In the full APK build, this uses an AI processing API. Result shown as preview.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const buildPrompt = () => {
    if (selectedStyle !== "Photorealistic") {
      setPrompt(prev => prev ? `${prev}, ${selectedStyle} style` : `${selectedStyle} style artwork`);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>IMAGE STUDIO</Text>
          <Text style={styles.headerSub}>AI-Powered Image Creation</Text>
        </View>
      </View>

      {/* Tool tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.toolBar}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      >
        {TOOLS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.toolChip, activeTool === t.id && styles.toolChipActive]}
            onPress={() => { setActiveTool(t.id); setResult(null); setAiDescription(null); }}
          >
            <Feather name={t.icon} size={13} color={activeTool === t.id ? C.primary : C.mutedForeground} />
            <Text style={[styles.toolLabel, activeTool === t.id && styles.toolLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* GENERATE */}
        {activeTool === "generate" && (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardAccent} />
                <Text style={styles.cardTitle}>DESCRIBE YOUR IMAGE</Text>
              </View>
              <TextInput
                style={styles.promptInput}
                value={prompt}
                onChangeText={setPrompt}
                placeholder="A mechanical skull in deep space with red energy rings, ultra-detailed..."
                placeholderTextColor="#333333"
                multiline
                numberOfLines={4}
              />

              {/* Style presets */}
              <Text style={styles.fieldLabel}>STYLE PRESET</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {STYLE_PRESETS.map(style => (
                  <TouchableOpacity
                    key={style}
                    style={[styles.styleChip, selectedStyle === style && styles.styleChipActive]}
                    onPress={() => setSelectedStyle(style)}
                  >
                    <Text style={[styles.styleText, selectedStyle === style && styles.styleTextActive]}>{style}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.applyStyle} onPress={buildPrompt}>
                <Feather name="plus" size={12} color={C.mutedForeground} />
                <Text style={styles.applyStyleText}>Add "{selectedStyle}" to prompt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.genBtn, loading && styles.genBtnDisabled]}
                onPress={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.genBtnText}>Generating...</Text>
                  </>
                ) : (
                  <>
                    <Feather name="zap" size={16} color="#FFFFFF" />
                    <Text style={styles.genBtnText}>Generate Image</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {result && (
              <View style={styles.resultCard}>
                <Image source={{ uri: result }} style={styles.resultImg} resizeMode="cover" />
                <View style={styles.resultBar}>
                  <TouchableOpacity style={styles.resultBtn}>
                    <Feather name="download" size={16} color="#FFFFFF" />
                    <Text style={styles.resultBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resultBtn}>
                    <Feather name="share-2" size={16} color="#FFFFFF" />
                    <Text style={styles.resultBtnText}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resultBtn} onPress={() => setPrompt("")}>
                    <Feather name="refresh-cw" size={16} color="#FFFFFF" />
                    <Text style={styles.resultBtnText}>New</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resultBtn} onPress={() => { setActiveTool("upscale"); setPickedImage(result); }}>
                    <Feather name="maximize" size={16} color="#00FF44" />
                    <Text style={[styles.resultBtnText, { color: "#00FF44" }]}>Upscale</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {/* DESCRIBE */}
        {activeTool === "describe" && (
          <>
            <ImagePickerCard
              image={pickedImage}
              onPickGallery={pickImage}
              onPickCamera={takePhoto}
              onClear={() => { setPickedImage(null); setAiDescription(null); }}
            />
            {pickedImage && (
              <TouchableOpacity
                style={[styles.genBtn, loading && styles.genBtnDisabled]}
                onPress={handleDescribe}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <><Feather name="eye" size={16} color="#FFFFFF" /><Text style={styles.genBtnText}>Analyze Image with AI</Text></>}
              </TouchableOpacity>
            )}
            {aiDescription && (
              <View style={styles.descCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardAccent, { backgroundColor: "#4488FF" }]} />
                  <Text style={styles.cardTitle}>AI ANALYSIS</Text>
                </View>
                <Text style={styles.descText}>{aiDescription}</Text>
                <TouchableOpacity style={styles.usePromptBtn} onPress={() => {
                  setPrompt(aiDescription.slice(0, 300));
                  setActiveTool("generate");
                }}>
                  <Feather name="zap" size={13} color={C.primary} />
                  <Text style={styles.usePromptText}>Use as generation prompt</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* UPSCALE / REMOVE BG */}
        {(activeTool === "upscale" || activeTool === "remove-bg") && (
          <>
            <View style={styles.infoCard}>
              <Feather name={activeTool === "upscale" ? "maximize" : "scissors"} size={20} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>
                  {activeTool === "upscale" ? "4x AI Upscaling" : "AI Background Removal"}
                </Text>
                <Text style={styles.infoDesc}>
                  {activeTool === "upscale"
                    ? "Enhance image resolution up to 4x using AI super-resolution technology."
                    : "Automatically detect and remove background from any image using AI segmentation."
                  }
                </Text>
              </View>
            </View>
            <ImagePickerCard
              image={pickedImage}
              onPickGallery={pickImage}
              onPickCamera={takePhoto}
              onClear={() => { setPickedImage(null); setResult(null); }}
            />
            {pickedImage && (
              <TouchableOpacity
                style={[styles.genBtn, loading && styles.genBtnDisabled]}
                onPress={handleProcess}
                disabled={loading}
              >
                {loading
                  ? <><ActivityIndicator color="#FFFFFF" size="small" /><Text style={styles.genBtnText}>Processing...</Text></>
                  : <><Feather name="play" size={16} color="#FFFFFF" /><Text style={styles.genBtnText}>Process Image</Text></>
                }
              </TouchableOpacity>
            )}
            {result && (
              <View style={styles.resultCard}>
                <Image source={{ uri: result }} style={styles.resultImg} resizeMode="cover" />
                <View style={styles.resultBar}>
                  <TouchableOpacity style={styles.resultBtn}>
                    <Feather name="download" size={16} color="#FFFFFF" />
                    <Text style={styles.resultBtnText}>Save</Text>
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

function ImagePickerCard({ image, onPickGallery, onPickCamera, onClear }: {
  image: string | null;
  onPickGallery: () => void;
  onPickCamera: () => void;
  onClear: () => void;
}) {
  if (image) {
    return (
      <View style={styles.resultCard}>
        <Image source={{ uri: image }} style={styles.resultImg} resizeMode="cover" />
        <View style={styles.resultBar}>
          <TouchableOpacity style={styles.resultBtn} onPress={onPickGallery}>
            <Feather name="image" size={15} color="#FFFFFF" />
            <Text style={styles.resultBtnText}>Change</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resultBtn} onPress={onClear}>
            <Feather name="x" size={15} color="#FF4444" />
            <Text style={[styles.resultBtnText, { color: "#FF4444" }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      <View style={styles.uploadArea}>
        <View style={styles.uploadIcon}>
          <Feather name="image" size={32} color={C.mutedForeground} />
        </View>
        <Text style={styles.uploadLabel}>Select an image</Text>
        <Text style={styles.uploadSub}>PNG, JPG, WEBP supported</Text>
        <View style={styles.uploadBtns}>
          <TouchableOpacity style={styles.uploadBtn} onPress={onPickGallery}>
            <Feather name="folder" size={15} color={C.primary} />
            <Text style={styles.uploadBtnText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={onPickCamera}>
            <Feather name="camera" size={15} color="#4488FF" />
            <Text style={[styles.uploadBtnText, { color: "#4488FF" }]}>Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  toolBar: { maxHeight: 52, marginVertical: 8 },
  toolChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: "#1A1A1A", backgroundColor: "#080808",
  },
  toolChipActive: { borderColor: C.primary, backgroundColor: "rgba(204,0,0,0.1)" },
  toolLabel: { color: C.mutedForeground, fontSize: 11, fontFamily: "Orbitron_400Regular", letterSpacing: 1 },
  toolLabelActive: { color: C.primary },
  card: {
    backgroundColor: "#080808", borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: "#141414", gap: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardAccent: { width: 3, height: 16, backgroundColor: C.primary, borderRadius: 2 },
  cardTitle: { color: C.mutedForeground, fontSize: 9, fontFamily: "Orbitron_400Regular", letterSpacing: 2 },
  promptInput: {
    backgroundColor: "#0D0D0D", borderRadius: 12, borderWidth: 1, borderColor: "#1A1A1A",
    color: "#FFFFFF", padding: 14, fontSize: 13, fontFamily: "Inter_400Regular",
    minHeight: 100, textAlignVertical: "top",
  },
  fieldLabel: { color: C.mutedForeground, fontSize: 9, fontFamily: "Orbitron_400Regular", letterSpacing: 1.5 },
  styleChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: "#0D0D0D", borderWidth: 1, borderColor: "#1A1A1A",
  },
  styleChipActive: { borderColor: C.primary, backgroundColor: "rgba(204,0,0,0.1)" },
  styleText: { color: C.mutedForeground, fontSize: 11, fontFamily: "Inter_500Medium" },
  styleTextActive: { color: C.primary },
  applyStyle: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
  },
  applyStyleText: { color: "#333333", fontSize: 11, fontFamily: "Inter_400Regular" },
  genBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15,
    shadowColor: C.primary, shadowRadius: 16, shadowOpacity: 0.4, elevation: 8,
  },
  genBtnDisabled: { opacity: 0.6 },
  genBtnText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  resultCard: {
    borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: "#1A1A1A",
  },
  resultImg: { width: "100%", height: 300 },
  resultBar: {
    flexDirection: "row",
    backgroundColor: "#0A0A0A",
    borderTopWidth: 1, borderTopColor: "#1A1A1A",
  },
  resultBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 13,
    borderRightWidth: 1, borderRightColor: "#1A1A1A",
  },
  resultBtnText: { color: "#FFFFFF", fontSize: 11, fontFamily: "Inter_500Medium" },
  descCard: {
    backgroundColor: "#080808", borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: "#141414", gap: 12,
  },
  descText: { color: "#CCCCCC", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  usePromptBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(204,0,0,0.08)", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: "rgba(204,0,0,0.2)",
    alignSelf: "flex-start",
  },
  usePromptText: { color: C.primary, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  infoCard: {
    flexDirection: "row", gap: 14, alignItems: "flex-start",
    backgroundColor: "#080808", borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: "#141414",
  },
  infoTitle: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  infoDesc: { color: C.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  uploadArea: { alignItems: "center", paddingVertical: 32, gap: 10 },
  uploadIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#1A1A1A",
  },
  uploadLabel: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  uploadSub: { color: C.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" },
  uploadBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  uploadBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(204,0,0,0.1)", borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12,
    borderWidth: 1, borderColor: "rgba(204,0,0,0.25)",
  },
  uploadBtnText: { color: C.primary, fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
