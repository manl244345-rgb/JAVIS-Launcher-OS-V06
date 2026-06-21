import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState, useCallback } from "react";
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
import { Feather } from "@expo/vector-icons";
import * as Speech from "expo-speech";

import { SkullOrb } from "@/components/SkullOrb";
import { StatusBadge } from "@/components/StatusBadge";
import { VoiceWave } from "@/components/VoiceWave";
import colors from "@/constants/colors";
import { useAI } from "@/contexts/AIContext";
import { useAlarms } from "@/contexts/AlarmContext";
import { useMemory } from "@/contexts/MemoryContext";
import { useVoice } from "@/contexts/VoiceContext";

const { width: SW, height: SH } = Dimensions.get("window");
const C = colors.dark;

type Panel = null | "chat" | "memory" | "apps" | "mission";

const MOCK_APPS = [
  "Phone","Messages","Camera","Settings","Chrome","Maps","YouTube","Instagram",
  "WhatsApp","Spotify","Calculator","Calendar","Clock","Contacts","Files","Gallery",
  "Gmail","Drive","Translate","Assistant","Play Store","Keep","Tasks","Meet","TikTok","Snapchat",
];

function useGreeting(name: string) {
  const h = new Date().getHours();
  const t = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${t}${name ? `, ${name}` : ", Sir"}`;
}

function useClock() {
  const [now, setNow] = useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { aiState, sendMessage } = useAI();
  const { memory, conversations, commandLog } = useMemory();
  const { alarms } = useAlarms();
  const { isListening, isSpeaking, transcript, startListening, stopListening, speak } = useVoice();

  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState(conversations.slice(-30));
  const [appSearch, setAppSearch] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const panelAnim = useRef(new Animated.Value(0)).current;
  const panelDirRef = useRef<"left" | "right" | "up" | "down">("left");
  const [panelDir, setPanelDir] = useState<"left" | "right" | "up" | "down">("left");

  const now = useClock();
  const greeting = useGreeting(memory.name);
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

  const openPanel = useCallback((panel: Panel, dir: "left" | "right" | "up" | "down") => {
    if (activePanel === panel) { closePanel(); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    panelDirRef.current = dir;
    setPanelDir(dir);
    setActivePanel(panel);
    panelAnim.setValue(0);
    Animated.spring(panelAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 12 }).start();
  }, [activePanel]);

  const closePanel = useCallback(() => {
    Animated.timing(panelAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setActivePanel(null));
  }, []);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 18 || Math.abs(gs.dy) > 18,
    onPanResponderRelease: (_, gs) => {
      const { dx, dy } = gs;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < -40) openPanel("chat", "left");
        else if (dx > 40) openPanel("memory", "right");
      } else {
        if (dy < -40) openPanel("apps", "up");
        else if (dy > 40) openPanel("mission", "down");
      }
    },
  })).current;

  const handleOrbPress = useCallback(() => {
    if (isListening) stopListening();
    else if (isSpeaking) Speech.stop();
    else { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); startListening(); }
  }, [isListening, isSpeaking, stopListening, startListening]);

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isThinking) return;
    setChatInput("");
    const userMsg = { id: Date.now().toString(), role: "user" as const, content: text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setIsThinking(true);
    try {
      const resp = await sendMessage(text);
      setChatMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: "assistant" as const, content: resp, timestamp: Date.now() }]);
      speak(resp);
    } finally { setIsThinking(false); }
  }, [chatInput, isThinking, sendMessage, speak]);

  const filteredApps = MOCK_APPS.filter(a => a.toLowerCase().includes(appSearch.toLowerCase()));

  const panelTranslate = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      panelDir === "left" ? SW : panelDir === "right" ? -SW : panelDir === "up" ? SH : -SH,
      0,
    ],
  });

  const activeAlarms = alarms.filter(a => a.enabled);

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* HUD grid bg */}
      <View style={styles.bgGrid}>
        {[0.2,0.4,0.6,0.8].map(pos => (
          <View key={pos} style={[styles.gridLine, { top: `${pos*100}%` as any }]} />
        ))}
        {[0.25,0.5,0.75].map(pos => (
          <View key={pos} style={[styles.gridLineV, { left: `${pos*100}%` as any }]} />
        ))}
      </View>

      {/* Scan line */}
      <View style={styles.scanLineTop} />
      <View style={styles.scanLineBottom} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.timeText}>{timeStr}</Text>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>
        <View style={styles.headerRight}>
          <StatusBadge state={aiState} />
          {activeAlarms.length > 0 && (
            <TouchableOpacity style={styles.alarmBadge} onPress={() => router.push("/alarms")}>
              <Text style={styles.alarmBadgeIcon}>⏰</Text>
              <Text style={styles.alarmBadgeCount}>{activeAlarms.length}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.push("/settings")} style={styles.headerBtn}>
            <Feather name="settings" size={20} color={C.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Center Orb */}
      <View style={styles.orbSection}>
        {/* Corner brackets */}
        <View style={[styles.bracket, styles.bracketTL]} />
        <View style={[styles.bracket, styles.bracketTR]} />
        <View style={[styles.bracket, styles.bracketBL]} />
        <View style={[styles.bracket, styles.bracketBR]} />

        <TouchableOpacity onPress={handleOrbPress} activeOpacity={0.9} style={styles.orbWrapper}>
          <SkullOrb state={isListening ? "listening" : isSpeaking ? "speaking" : aiState} size={200} />
        </TouchableOpacity>

        {(isListening || isSpeaking) && (
          <View style={styles.waveContainer}>
            <VoiceWave isActive color={isListening ? "#FF2200" : "#4488FF"} />
          </View>
        )}

        {isListening && transcript ? (
          <View style={styles.transcriptBox}>
            <View style={styles.transcriptDot} />
            <Text style={styles.transcriptText} numberOfLines={2}>{transcript}</Text>
          </View>
        ) : (
          <Text style={styles.orbHint}>
            {isListening ? "LISTENING..." : isSpeaking ? "SPEAKING..." : "TAP ORB TO SPEAK"}
          </Text>
        )}

        {/* Gesture arrows */}
        <View style={styles.arrowTop}>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => openPanel("apps", "up")}>
            <Feather name="chevron-up" size={14} color={C.mutedForeground} />
            <Text style={styles.arrowLabel}>APPS</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.arrowLeft}>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => openPanel("memory", "right")}>
            <Feather name="chevron-left" size={14} color={C.mutedForeground} />
            <Text style={styles.arrowLabel}>MEM</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.arrowRight}>
          <TouchableOpacity style={styles.arrowBtnR} onPress={() => openPanel("chat", "left")}>
            <Text style={styles.arrowLabel}>CHAT</Text>
            <Feather name="chevron-right" size={14} color={C.mutedForeground} />
          </TouchableOpacity>
        </View>
        <View style={styles.arrowBottom}>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => openPanel("mission", "down")}>
            <Text style={styles.arrowLabel}>HUD</Text>
            <Feather name="chevron-down" size={14} color={C.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dock */}
      <View style={[styles.dock, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.dockRow}>
          {[
            { id: "phone",    icon: "phone",          label: "Phone",    color: "#00FF44", onPress: () => {} },
            { id: "contacts", icon: "users",          label: "Contacts", color: "#4488FF", onPress: () => router.push("/contacts") },
            { id: "alarms",   icon: "clock",          label: "Alarms",   color: "#FF8800", onPress: () => router.push("/alarms") },
            { id: "camera",   icon: "camera",         label: "Camera",   color: "#CC0000", onPress: () => {} },
            { id: "settings", icon: "settings",       label: "More",     color: "#888888", onPress: () => router.push("/settings") },
          ].map(app => (
            <TouchableOpacity
              key={app.id}
              style={styles.dockItem}
              onPress={() => { Haptics.selectionAsync(); app.onPress(); }}
            >
              <View style={[styles.dockIcon, { borderColor: `${app.color}33` }]}>
                <Feather name={app.icon as any} size={20} color={app.color} />
              </View>
              <Text style={styles.dockLabel}>{app.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Slide panels */}
      {activePanel && (
        <Animated.View style={[styles.panel, {
          transform: [
            panelDir === "left" || panelDir === "right"
              ? { translateX: panelTranslate }
              : { translateY: panelTranslate },
          ],
        }]}>
          <View style={[styles.panelInner, { paddingTop: insets.top + 16 }]}>
            <View style={styles.panelHeader}>
              <View style={styles.panelTitleRow}>
                <View style={styles.panelAccent} />
                <Text style={styles.panelTitle}>
                  {activePanel === "chat" ? "AI CHAT" : activePanel === "memory" ? "MEMORY CORE"
                    : activePanel === "apps" ? "ALL APPS" : "MISSION CONTROL"}
                </Text>
              </View>
              <TouchableOpacity onPress={closePanel} style={styles.closeBtn}>
                <Feather name="x" size={20} color={C.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* CHAT */}
            {activePanel === "chat" && (
              <View style={{ flex: 1, gap: 8 }}>
                <FlatList
                  data={chatMessages}
                  keyExtractor={m => m.id}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                  ListEmptyComponent={
                    <View style={styles.chatEmpty}>
                      <Text style={{ fontSize: 40 }}>💀</Text>
                      <Text style={styles.chatEmptyText}>JAVIS awaits your command</Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}>
                      {item.role === "assistant" && (
                        <Text style={styles.bubbleLabel}>JAVIS</Text>
                      )}
                      <Text style={[styles.bubbleText, item.role === "assistant" && { color: "#E0E0E0" }]}>
                        {item.content}
                      </Text>
                    </View>
                  )}
                />
                {isThinking && (
                  <View style={styles.thinkingRow}>
                    {[1,0.6,0.3].map((o,i) => (
                      <View key={i} style={[styles.dot, { opacity: o }]} />
                    ))}
                    <Text style={styles.thinkingText}>PROCESSING...</Text>
                  </View>
                )}
                <View style={styles.chatInputRow}>
                  <TouchableOpacity
                    style={[styles.micBtn, isListening && styles.micBtnActive]}
                    onPress={handleOrbPress}
                  >
                    <Feather name="mic" size={18} color={isListening ? "#FF2200" : C.mutedForeground} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.chatInput}
                    value={chatInput}
                    onChangeText={setChatInput}
                    placeholder="Command JAVIS..."
                    placeholderTextColor={C.mutedForeground}
                    onSubmitEditing={sendChat}
                    returnKeyType="send"
                  />
                  <TouchableOpacity onPress={sendChat} style={styles.sendBtn} disabled={isThinking}>
                    <Feather name="send" size={17} color={isThinking ? C.mutedForeground : C.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* MEMORY */}
            {activePanel === "memory" && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>
                <MemCard title="Identity" icon="user" color="#4488FF">
                  <Text style={styles.memValue}>{memory.name || "Not configured"}</Text>
                </MemCard>
                <MemCard title="Interests" icon="heart" color="#CC0000">
                  {memory.interests.length === 0
                    ? <Text style={styles.memEmpty}>None recorded</Text>
                    : <View style={styles.tagRow}>{memory.interests.map((it, i) => <Tag key={i}>{it}</Tag>)}</View>
                  }
                </MemCard>
                <MemCard title="Goals" icon="target" color="#00FF44">
                  {memory.goals.length === 0
                    ? <Text style={styles.memEmpty}>No goals set</Text>
                    : <View style={styles.tagRow}>{memory.goals.map((g, i) => <Tag key={i} color="#00FF44">{g}</Tag>)}</View>
                  }
                </MemCard>
                <MemCard title="Favorite Contacts" icon="users" color="#FF8800">
                  {memory.favoriteContacts.length === 0
                    ? <Text style={styles.memEmpty}>No favorites saved</Text>
                    : <View style={styles.tagRow}>{memory.favoriteContacts.map((c, i) => <Tag key={i} color="#FF8800">{c}</Tag>)}</View>
                  }
                </MemCard>
                <MemCard title="Favorite Apps" icon="star" color="#AA44FF">
                  {memory.favoriteApps.length === 0
                    ? <Text style={styles.memEmpty}>Learning your habits...</Text>
                    : <View style={styles.tagRow}>{memory.favoriteApps.map((a, i) => <Tag key={i} color="#AA44FF">{a}</Tag>)}</View>
                  }
                </MemCard>
                <Text style={styles.memUpdated}>
                  Last sync: {new Date(memory.lastUpdated).toLocaleString()}
                </Text>
              </ScrollView>
            )}

            {/* APPS */}
            {activePanel === "apps" && (
              <View style={{ flex: 1 }}>
                <View style={styles.searchBar}>
                  <Feather name="search" size={15} color={C.mutedForeground} />
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
                  contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
                  columnWrapperStyle={{ gap: 8 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.appGrid}
                      onPress={() => { Haptics.selectionAsync(); }}
                    >
                      <View style={styles.appGridIcon}>
                        <Feather name="grid" size={18} color={C.foreground} />
                      </View>
                      <Text style={styles.appGridLabel} numberOfLines={1}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* MISSION CONTROL */}
            {activePanel === "mission" && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
                <View style={styles.hudGrid}>
                  <HudStat icon="cpu" label="AI MODEL" value="Qwen 3 Mini" color="#4488FF" />
                  <HudStat icon="mic" label="VOICE" value="JAVIS TTS" color="#00FF44" />
                  <HudStat icon="clock" label="ALARMS" value={`${activeAlarms.length} active`} color="#FF8800" />
                  <HudStat icon="activity" label="STATUS" value={aiState.toUpperCase()} color={C.primary} />
                </View>

                <View style={styles.logSection}>
                  <Text style={styles.logTitle}>COMMAND LOG</Text>
                  {commandLog.length === 0 ? (
                    <Text style={styles.memEmpty}>No commands logged</Text>
                  ) : commandLog.slice(0, 15).map(log => (
                    <View key={log.id} style={styles.logRow}>
                      <View style={[styles.logDot, { backgroundColor: log.status === "success" ? "#00FF44" : C.primary }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.logDesc}>{log.description}</Text>
                        <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <Text style={styles.logTitle}>QUICK LAUNCH</Text>
                <View style={styles.quickGrid}>
                  {[
                    { icon: "image", label: "Image Studio", route: "/image-studio" },
                    { icon: "film",  label: "Video Studio",  route: "/video-studio" },
                    { icon: "users", label: "Contacts",      route: "/contacts" },
                    { icon: "clock", label: "Alarms",        route: "/alarms" },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.route}
                      style={styles.quickBtn}
                      onPress={() => { closePanel(); router.push(item.route as any); }}
                    >
                      <Feather name={item.icon as any} size={18} color={C.primary} />
                      <Text style={styles.quickBtnText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function MemCard({ title, icon, color = "#CC0000", children }: { title: string; icon: any; color?: string; children: React.ReactNode }) {
  return (
    <View style={[memStyles.card, { borderLeftColor: color }]}>
      <View style={memStyles.header}>
        <Feather name={icon} size={13} color={color} />
        <Text style={memStyles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Tag({ children, color = "#CC0000" }: { children: string; color?: string }) {
  return (
    <View style={[tagStyles.tag, { borderColor: `${color}55`, backgroundColor: `${color}15` }]}>
      <Text style={[tagStyles.text, { color }]}>{children}</Text>
    </View>
  );
}

function HudStat({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={[hudStyles.stat, { borderColor: `${color}33` }]}>
      <Feather name={icon} size={16} color={color} />
      <Text style={hudStyles.label}>{label}</Text>
      <Text style={[hudStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const C2 = colors.dark;

const memStyles = StyleSheet.create({
  card: {
    backgroundColor: "#0D0D0D",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderLeftWidth: 3,
    gap: 10,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: C2.mutedForeground, fontSize: 10, fontFamily: "Orbitron_400Regular", letterSpacing: 2 },
});

const tagStyles = StyleSheet.create({
  tag: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: { fontSize: 11, fontFamily: "Inter_500Medium" },
});

const hudStyles = StyleSheet.create({
  stat: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#0D0D0D",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 6,
    alignItems: "flex-start",
  },
  label: { color: C2.mutedForeground, fontSize: 9, fontFamily: "Orbitron_400Regular", letterSpacing: 1.5 },
  value: { fontSize: 12, fontFamily: "Orbitron_700Bold", letterSpacing: 1 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  bgGrid: { ...StyleSheet.absoluteFillObject },
  gridLine: {
    position: "absolute",
    left: 0, right: 0,
    height: 1,
    backgroundColor: "rgba(204,0,0,0.04)",
  },
  gridLineV: {
    position: "absolute",
    top: 0, bottom: 0,
    width: 1,
    backgroundColor: "rgba(204,0,0,0.04)",
  },
  scanLineTop: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: "rgba(204,0,0,0.5)",
  },
  scanLineBottom: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: "rgba(0,255,68,0.3)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  headerLeft: { gap: 0 },
  greeting: { color: C.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 0.5 },
  timeText: { color: "#FFFFFF", fontSize: 40, fontFamily: "Orbitron_700Bold", letterSpacing: 2, lineHeight: 46 },
  dateText: { color: C.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", letterSpacing: 1, marginTop: 2 },
  headerRight: { alignItems: "flex-end", gap: 8, marginTop: 4 },
  headerBtn: { padding: 6 },
  alarmBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,136,0,0.15)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,136,0,0.3)",
  },
  alarmBadgeIcon: { fontSize: 12 },
  alarmBadgeCount: { color: "#FF8800", fontSize: 11, fontFamily: "Orbitron_700Bold" },
  orbSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bracket: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: "rgba(204,0,0,0.4)",
  },
  bracketTL: { top: 20, left: 20, borderTopWidth: 2, borderLeftWidth: 2 },
  bracketTR: { top: 20, right: 20, borderTopWidth: 2, borderRightWidth: 2 },
  bracketBL: { bottom: 20, left: 20, borderBottomWidth: 2, borderLeftWidth: 2 },
  bracketBR: { bottom: 20, right: 20, borderBottomWidth: 2, borderRightWidth: 2 },
  orbWrapper: { alignItems: "center", justifyContent: "center" },
  waveContainer: { marginTop: 12 },
  transcriptBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 30,
    paddingVertical: 10,
    backgroundColor: "rgba(255,34,0,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,34,0,0.2)",
    maxWidth: SW - 60,
  },
  transcriptDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF2200", marginTop: 4 },
  transcriptText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  orbHint: { color: C.mutedForeground, fontSize: 10, letterSpacing: 3, marginTop: 14, fontFamily: "Orbitron_400Regular" },
  arrowTop: { position: "absolute", top: 0 },
  arrowLeft: { position: "absolute", left: 0 },
  arrowRight: { position: "absolute", right: 0 },
  arrowBottom: { position: "absolute", bottom: 0 },
  arrowBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 10 },
  arrowBtnR: { flexDirection: "row", alignItems: "center", gap: 4, padding: 10 },
  arrowLabel: { color: C.mutedForeground, fontSize: 8, letterSpacing: 2, fontFamily: "Orbitron_400Regular" },
  dock: {
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  dockRow: { flexDirection: "row", justifyContent: "space-around" },
  dockItem: { alignItems: "center", gap: 6 },
  dockIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dockLabel: { color: C.mutedForeground, fontSize: 9, fontFamily: "Inter_400Regular", letterSpacing: 0.5 },
  panel: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#030303",
    zIndex: 200,
  },
  panelInner: { flex: 1, paddingHorizontal: 18 },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#151515",
  },
  panelTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  panelAccent: { width: 3, height: 20, backgroundColor: C.primary, borderRadius: 2 },
  panelTitle: { color: C.primary, fontSize: 13, fontFamily: "Orbitron_700Bold", letterSpacing: 3 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#0F0F0F", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#1A1A1A" },
  chatEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 60 },
  chatEmptyText: { color: C.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" },
  bubble: { maxWidth: "88%", padding: 12, borderRadius: 16, gap: 4 },
  userBubble: { backgroundColor: C.primary, alignSelf: "flex-end", borderBottomRightRadius: 4 },
  aiBubble: {
    backgroundColor: "#0F0F0F",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(204,0,0,0.25)",
  },
  bubbleLabel: { color: "rgba(204,0,0,0.7)", fontSize: 9, fontFamily: "Orbitron_400Regular", letterSpacing: 1 },
  bubbleText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  thinkingRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 12, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary },
  thinkingText: { color: C.mutedForeground, fontSize: 9, fontFamily: "Orbitron_400Regular", letterSpacing: 2 },
  chatInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  micBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#0F0F0F", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#1A1A1A",
  },
  micBtnActive: { borderColor: "#FF2200", backgroundColor: "rgba(255,34,0,0.1)" },
  chatInput: {
    flex: 1,
    backgroundColor: "#0F0F0F",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    color: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(204,0,0,0.12)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(204,0,0,0.3)",
  },
  memValue: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_500Medium" },
  memEmpty: { color: C.mutedForeground, fontSize: 12, fontFamily: "Inter_400Regular" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  memUpdated: { color: "#333333", fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0F0F0F",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_400Regular" },
  appGrid: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 8 },
  appGridIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#1A1A1A",
  },
  appGridLabel: { color: C.mutedForeground, fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  hudGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  logSection: { gap: 8 },
  logTitle: { color: C.mutedForeground, fontSize: 9, fontFamily: "Orbitron_400Regular", letterSpacing: 2, marginBottom: 4 },
  logRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 },
  logDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  logDesc: { color: "#AAAAAA", fontSize: 12, fontFamily: "Inter_400Regular" },
  logTime: { color: "#444444", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0D0D0D",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    flex: 1,
    minWidth: "45%",
  },
  quickBtnText: { color: "#CCCCCC", fontSize: 12, fontFamily: "Inter_500Medium" },
});
