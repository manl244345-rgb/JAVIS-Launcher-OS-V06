import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
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
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Speech from "expo-speech";

import { SkullOrb } from "@/components/SkullOrb";
import { StatusBadge } from "@/components/StatusBadge";
import { VoiceWave } from "@/components/VoiceWave";
import colors from "@/constants/colors";
import { useAI } from "@/contexts/AIContext";
import { useMemory } from "@/contexts/MemoryContext";
import { useVoice } from "@/contexts/VoiceContext";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const C = colors.dark;

type Panel = null | "chat" | "memory" | "apps" | "mission";

const FAVORITE_APPS = [
  { id: "phone", label: "Phone", icon: "phone" as const },
  { id: "messages", label: "Messages", icon: "message-square" as const },
  { id: "camera", label: "Camera", icon: "camera" as const },
  { id: "settings", label: "Settings", icon: "settings" as const },
];

const MOCK_APPS = [
  "Phone", "Messages", "Camera", "Settings", "Chrome", "Maps",
  "YouTube", "Instagram", "WhatsApp", "Spotify", "Calculator", "Calendar",
  "Clock", "Contacts", "Files", "Gallery", "Gmail", "Drive",
  "Translate", "Assistant", "Play Store", "Keep Notes", "Tasks", "Meet",
];

function useGreeting(name: string) {
  const h = new Date().getHours();
  const timeLabel = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const who = name ? `, ${name}` : ", Sir";
  return `${timeLabel}${who}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { aiState, sendMessage } = useAI();
  const { memory, conversations, commandLog } = useMemory();
  const { isListening, isSpeaking, transcript, startListening, stopListening, speak } = useVoice();

  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState(conversations.slice(-20));
  const [appSearch, setAppSearch] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const panelAnim = useRef(new Animated.Value(0)).current;
  const panelDir = useRef<"left" | "right" | "up" | "down">("left");

  const greeting = useGreeting(memory.name);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  const openPanel = (panel: Panel, dir: "left" | "right" | "up" | "down") => {
    if (activePanel === panel) return closePanel();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    panelDir.current = dir;
    setActivePanel(panel);
    panelAnim.setValue(0);
    Animated.spring(panelAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
  };

  const closePanel = () => {
    Animated.timing(panelAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setActivePanel(null);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 20 || Math.abs(gs.dy) > 20,
      onPanResponderRelease: (_, gs) => {
        const { dx, dy } = gs;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx < -50) openPanel("chat", "left");
          else if (dx > 50) openPanel("memory", "right");
        } else {
          if (dy < -50) openPanel("apps", "up");
          else if (dy > 50) openPanel("mission", "down");
        }
      },
    })
  ).current;

  const handleOrbPress = () => {
    if (isListening) {
      stopListening();
    } else if (isSpeaking) {
      Speech.stop();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      startListening();
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || isThinking) return;
    const text = chatInput.trim();
    setChatInput("");
    const userMsg = { id: Date.now().toString(), role: "user" as const, content: text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setIsThinking(true);
    try {
      const resp = await sendMessage(text);
      const aiMsg = { id: (Date.now() + 1).toString(), role: "assistant" as const, content: resp, timestamp: Date.now() };
      setChatMessages(prev => [...prev, aiMsg]);
      speak(resp);
    } finally {
      setIsThinking(false);
    }
  };

  const filteredApps = MOCK_APPS.filter(a =>
    a.toLowerCase().includes(appSearch.toLowerCase())
  );

  const panelTranslate = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      panelDir.current === "left" ? SCREEN_W
        : panelDir.current === "right" ? -SCREEN_W
        : panelDir.current === "up" ? SCREEN_H
        : -SCREEN_H,
      0
    ],
  });

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Background grid */}
      <View style={styles.bgGrid} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.timeText}>{timeStr}</Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>
        <View style={styles.headerRight}>
          <StatusBadge state={aiState} />
          <TouchableOpacity onPress={() => router.push("/settings")} style={styles.headerIcon}>
            <Feather name="settings" size={22} color={C.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Center: Orb */}
      <View style={styles.orbSection}>
        <TouchableOpacity onPress={handleOrbPress} activeOpacity={0.9} style={styles.orbWrapper}>
          <SkullOrb state={isListening ? "listening" : isSpeaking ? "speaking" : aiState} size={220} />
        </TouchableOpacity>

        {/* Voice wave */}
        {(isListening || isSpeaking) && (
          <View style={styles.waveContainer}>
            <VoiceWave isActive={true} color={isListening ? "#FF4400" : "#4488FF"} />
          </View>
        )}
        {isListening && transcript ? (
          <Text style={styles.transcript} numberOfLines={2}>{transcript}</Text>
        ) : (
          <Text style={styles.orbHint}>
            {isListening ? "LISTENING..." : isSpeaking ? "SPEAKING..." : "TAP TO SPEAK"}
          </Text>
        )}

        {/* Gesture hints */}
        <View style={styles.gestureHints}>
          <TouchableOpacity onPress={() => openPanel("apps", "up")} style={styles.gestureHint}>
            <Feather name="chevron-up" size={16} color={C.mutedForeground} />
            <Text style={styles.gestureLabel}>APPS</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.gestureHintsH}>
          <TouchableOpacity onPress={() => openPanel("memory", "right")} style={styles.gestureHint}>
            <Feather name="chevron-left" size={16} color={C.mutedForeground} />
            <Text style={styles.gestureLabel}>MEM</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openPanel("chat", "left")} style={styles.gestureHint}>
            <Text style={styles.gestureLabel}>CHAT</Text>
            <Feather name="chevron-right" size={16} color={C.mutedForeground} />
          </TouchableOpacity>
        </View>
        <View style={styles.gestureHintsBottom}>
          <TouchableOpacity onPress={() => openPanel("mission", "down")} style={styles.gestureHint}>
            <Text style={styles.gestureLabel}>CONTROL</Text>
            <Feather name="chevron-down" size={16} color={C.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Favorites */}
      <View style={[styles.favoritesBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) }]}>
        <View style={styles.favoritesRow}>
          {FAVORITE_APPS.map(app => (
            <TouchableOpacity key={app.id} style={styles.favoriteItem} onPress={() => Haptics.selectionAsync()}>
              <View style={styles.appIcon}>
                <Feather name={app.icon} size={22} color={C.foreground} />
              </View>
              <Text style={styles.appLabel}>{app.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Slide Panels */}
      {activePanel && (
        <Animated.View style={[styles.panel, { transform: [{ translateX: panelDir.current === "left" || panelDir.current === "right" ? panelTranslate : 0 }, { translateY: panelDir.current === "up" || panelDir.current === "down" ? panelTranslate : 0 }] }]}>
          <View style={[styles.panelInner, { paddingTop: insets.top + 16 }]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>
                {activePanel === "chat" ? "AI CHAT"
                  : activePanel === "memory" ? "MEMORY"
                  : activePanel === "apps" ? "ALL APPS"
                  : "MISSION CONTROL"}
              </Text>
              <TouchableOpacity onPress={closePanel}>
                <Feather name="x" size={22} color={C.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* CHAT PANEL */}
            {activePanel === "chat" && (
              <View style={styles.chatPanel}>
                <FlatList
                  data={chatMessages}
                  keyExtractor={m => m.id}
                  inverted={false}
                  style={styles.chatList}
                  contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Feather name="message-circle" size={40} color={C.mutedForeground} />
                      <Text style={styles.emptyText}>Say something to JAVIS</Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <View style={[styles.msgBubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}>
                      <Text style={[styles.msgText, item.role === "assistant" && styles.aiText]}>
                        {item.content}
                      </Text>
                    </View>
                  )}
                />
                {isThinking && (
                  <View style={styles.thinkingRow}>
                    <View style={styles.dot} />
                    <View style={[styles.dot, { opacity: 0.6 }]} />
                    <View style={[styles.dot, { opacity: 0.3 }]} />
                  </View>
                )}
                <View style={styles.chatInputRow}>
                  <TextInput
                    style={styles.chatInput}
                    value={chatInput}
                    onChangeText={setChatInput}
                    placeholder="Ask JAVIS anything..."
                    placeholderTextColor={C.mutedForeground}
                    onSubmitEditing={sendChat}
                    returnKeyType="send"
                  />
                  <TouchableOpacity onPress={sendChat} style={styles.sendBtn} disabled={isThinking}>
                    <Feather name="send" size={18} color={isThinking ? C.mutedForeground : C.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* MEMORY PANEL */}
            {activePanel === "memory" && (
              <ScrollView style={styles.memoryPanel} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
                <MemoryCard title="Identity" icon="user">
                  <Text style={styles.memValue}>{memory.name || "Not set"}</Text>
                </MemoryCard>
                <MemoryCard title="Interests" icon="heart">
                  {memory.interests.length === 0
                    ? <Text style={styles.memEmpty}>None recorded yet</Text>
                    : memory.interests.map((it, i) => <Text key={i} style={styles.memTag}>{it}</Text>)
                  }
                </MemoryCard>
                <MemoryCard title="Goals" icon="target">
                  {memory.goals.length === 0
                    ? <Text style={styles.memEmpty}>No goals set</Text>
                    : memory.goals.map((g, i) => <Text key={i} style={styles.memTag}>{g}</Text>)
                  }
                </MemoryCard>
                <MemoryCard title="Favorite Apps" icon="star">
                  {memory.favoriteApps.length === 0
                    ? <Text style={styles.memEmpty}>Learning your preferences...</Text>
                    : memory.favoriteApps.map((a, i) => <Text key={i} style={styles.memTag}>{a}</Text>)
                  }
                </MemoryCard>
                <MemoryCard title="Favorite Contacts" icon="users">
                  {memory.favoriteContacts.length === 0
                    ? <Text style={styles.memEmpty}>No contacts saved</Text>
                    : memory.favoriteContacts.map((c, i) => <Text key={i} style={styles.memTag}>{c}</Text>)
                  }
                </MemoryCard>
                <Text style={[styles.memEmpty, { textAlign: "center", marginTop: 8 }]}>
                  Last updated: {new Date(memory.lastUpdated).toLocaleString()}
                </Text>
              </ScrollView>
            )}

            {/* APPS PANEL */}
            {activePanel === "apps" && (
              <View style={{ flex: 1 }}>
                <View style={styles.searchRow}>
                  <Feather name="search" size={16} color={C.mutedForeground} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    value={appSearch}
                    onChangeText={setAppSearch}
                    placeholder="Search apps..."
                    placeholderTextColor={C.mutedForeground}
                  />
                </View>
                <FlatList
                  data={filteredApps}
                  keyExtractor={a => a}
                  numColumns={4}
                  contentContainerStyle={{ gap: 4, paddingBottom: 24 }}
                  columnWrapperStyle={{ gap: 4 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.gridApp}
                      onPress={() => {
                        Haptics.selectionAsync();
                        closePanel();
                      }}
                    >
                      <View style={styles.gridAppIcon}>
                        <Feather name="grid" size={20} color={C.foreground} />
                      </View>
                      <Text style={styles.gridAppLabel} numberOfLines={1}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* MISSION CONTROL */}
            {activePanel === "mission" && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
                <MissionRow icon="cpu" label="AI Model" value={`OpenRouter • qwen/qwen3-mini`} />
                <MissionRow icon="mic" label="Voice" value="Kokoro Deep Male" />
                <MissionRow icon="battery" label="Battery" value="Detecting..." />
                <MissionRow icon="wifi" label="Network" value="Connected" />
                <MissionRow icon="activity" label="Current Task" value={aiState.toUpperCase()} />
                <Text style={[styles.panelTitle, { fontSize: 12, marginTop: 8 }]}>COMMAND LOG</Text>
                {commandLog.length === 0 ? (
                  <Text style={styles.memEmpty}>No commands logged yet</Text>
                ) : (
                  commandLog.slice(0, 20).map(log => (
                    <View key={log.id} style={styles.logItem}>
                      <View style={[styles.logDot, { backgroundColor: log.status === "success" ? C.ledGreen : C.primary }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.logDesc}>{log.description}</Text>
                        <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
                      </View>
                    </View>
                  ))
                )}

                <View style={styles.quickActions}>
                  <TouchableOpacity style={styles.qaBtn} onPress={() => { closePanel(); router.push("/image-studio"); }}>
                    <Feather name="image" size={20} color={C.primary} />
                    <Text style={styles.qaBtnText}>Image Studio</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.qaBtn} onPress={() => { closePanel(); router.push("/video-studio"); }}>
                    <Feather name="film" size={20} color={C.primary} />
                    <Text style={styles.qaBtnText}>Video Studio</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function MemoryCard({ title, icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <View style={styles.memCard}>
      <View style={styles.memCardHeader}>
        <Feather name={icon} size={14} color={C.primary} />
        <Text style={styles.memCardTitle}>{title}</Text>
      </View>
      <View style={styles.memCardContent}>{children}</View>
    </View>
  );
}

function MissionRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.missionRow}>
      <Feather name={icon} size={16} color={C.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.missionLabel}>{label}</Text>
        <Text style={styles.missionValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  bgGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  headerIcon: {
    padding: 4,
  },
  greeting: {
    color: C.mutedForeground,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
  timeText: {
    color: C.foreground,
    fontSize: 36,
    fontFamily: "Orbitron_700Bold",
    letterSpacing: 2,
  },
  dateText: {
    color: C.mutedForeground,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 1,
  },
  orbSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  orbWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  waveContainer: {
    marginTop: 16,
  },
  transcript: {
    color: C.foreground,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
    letterSpacing: 0.5,
  },
  orbHint: {
    color: C.mutedForeground,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 12,
    fontFamily: "Orbitron_400Regular",
  },
  gestureHints: {
    position: "absolute",
    top: 0,
    alignItems: "center",
  },
  gestureHintsH: {
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
    width: SCREEN_W,
    paddingHorizontal: 20,
  },
  gestureHintsBottom: {
    position: "absolute",
    bottom: 0,
    alignItems: "center",
  },
  gestureHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 8,
  },
  gestureLabel: {
    color: C.mutedForeground,
    fontSize: 9,
    letterSpacing: 2,
    fontFamily: "Orbitron_400Regular",
  },
  favoritesBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  favoritesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  favoriteItem: {
    alignItems: "center",
    gap: 6,
  },
  appIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  appLabel: {
    color: C.mutedForeground,
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  panel: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#050505",
    zIndex: 100,
  },
  panelInner: {
    flex: 1,
    paddingHorizontal: 20,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  panelTitle: {
    color: C.primary,
    fontSize: 14,
    fontFamily: "Orbitron_700Bold",
    letterSpacing: 3,
  },
  chatPanel: {
    flex: 1,
    gap: 8,
  },
  chatList: {
    flex: 1,
  },
  msgBubble: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: C.primary,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: C.surfaceElevated,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(204,0,0,0.3)",
  },
  msgText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  aiText: {
    color: C.foreground,
  },
  thinkingRow: {
    flexDirection: "row",
    gap: 4,
    paddingVertical: 8,
    paddingLeft: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  chatInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: C.surface,
    color: C.foreground,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: C.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
  },
  emptyText: {
    color: C.mutedForeground,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  memoryPanel: {
    flex: 1,
  },
  memCard: {
    backgroundColor: C.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  memCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  memCardTitle: {
    color: C.mutedForeground,
    fontSize: 11,
    fontFamily: "Orbitron_400Regular",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  memCardContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  memValue: {
    color: C.foreground,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  memTag: {
    color: C.primary,
    backgroundColor: "rgba(204,0,0,0.15)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(204,0,0,0.3)",
  },
  memEmpty: {
    color: C.mutedForeground,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    color: C.foreground,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  gridApp: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
    maxWidth: (SCREEN_W - 40) / 4,
  },
  gridAppIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: C.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  gridAppLabel: {
    color: C.mutedForeground,
    fontSize: 10,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surfaceElevated,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  missionLabel: {
    color: C.mutedForeground,
    fontSize: 10,
    fontFamily: "Orbitron_400Regular",
    letterSpacing: 1,
  },
  missionValue: {
    color: C.foreground,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  logItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  logDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  logDesc: {
    color: C.foreground,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  logTime: {
    color: C.mutedForeground,
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  qaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(204,0,0,0.3)",
  },
  qaBtnText: {
    color: C.foreground,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
