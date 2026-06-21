import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
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
import { Alarm, useAlarms } from "@/contexts/AlarmContext";

const C = colors.dark;

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const REPEAT_OPTIONS: Array<{ id: Alarm["repeat"]; label: string }> = [
  { id: "once",     label: "Once" },
  { id: "daily",    label: "Daily" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekends", label: "Weekends" },
  { id: "custom",   label: "Custom" },
];

function formatTime(h: number, m: number) {
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, "0");
  const ampm = h < 12 ? "AM" : "PM";
  return `${hh}:${mm} ${ampm}`;
}

function timeUntil(alarm: Alarm): string {
  const now = new Date();
  const next = new Date();
  next.setHours(alarm.hour, alarm.minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const diff = next.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

interface AlarmModalProps {
  visible: boolean;
  initial?: Alarm | null;
  onSave: (data: Omit<Alarm, "id" | "createdAt">) => void;
  onClose: () => void;
}

function AlarmModal({ visible, initial, onSave, onClose }: AlarmModalProps) {
  const [hour, setHour] = useState(initial?.hour ?? 7);
  const [minute, setMinute] = useState(initial?.minute ?? 0);
  const [label, setLabel] = useState(initial?.label ?? "");
  const [repeat, setRepeat] = useState<Alarm["repeat"]>(initial?.repeat ?? "once");
  const [days, setDays] = useState<number[]>(initial?.days ?? []);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);

  const adjustHour = (delta: number) => setHour(h => (h + delta + 24) % 24);
  const adjustMinute = (delta: number) => setMinute(m => (m + delta + 60) % 60);

  const toggleDay = (d: number) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const handleSave = () => {
    onSave({ hour, minute, label, repeat, days, enabled });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />

          <Text style={modalStyles.title}>{initial ? "EDIT ALARM" : "NEW ALARM"}</Text>

          {/* Time picker */}
          <View style={modalStyles.timePicker}>
            {/* Hour */}
            <View style={modalStyles.spinnerCol}>
              <TouchableOpacity onPress={() => adjustHour(1)} style={modalStyles.arrowBtn}>
                <Feather name="chevron-up" size={24} color={C.primary} />
              </TouchableOpacity>
              <Text style={modalStyles.timeDigit}>{String(hour).padStart(2, "0")}</Text>
              <TouchableOpacity onPress={() => adjustHour(-1)} style={modalStyles.arrowBtn}>
                <Feather name="chevron-down" size={24} color={C.primary} />
              </TouchableOpacity>
            </View>

            <Text style={modalStyles.colon}>:</Text>

            {/* Minute */}
            <View style={modalStyles.spinnerCol}>
              <TouchableOpacity onPress={() => adjustMinute(5)} style={modalStyles.arrowBtn}>
                <Feather name="chevron-up" size={24} color={C.primary} />
              </TouchableOpacity>
              <Text style={modalStyles.timeDigit}>{String(minute).padStart(2, "0")}</Text>
              <TouchableOpacity onPress={() => adjustMinute(-5)} style={modalStyles.arrowBtn}>
                <Feather name="chevron-down" size={24} color={C.primary} />
              </TouchableOpacity>
            </View>

            {/* AM/PM */}
            <View style={modalStyles.ampmCol}>
              <TouchableOpacity
                style={[modalStyles.ampmBtn, hour < 12 && modalStyles.ampmActive]}
                onPress={() => { if (hour >= 12) setHour(h => h - 12); }}
              >
                <Text style={[modalStyles.ampmText, hour < 12 && modalStyles.ampmTextActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.ampmBtn, hour >= 12 && modalStyles.ampmActive]}
                onPress={() => { if (hour < 12) setHour(h => h + 12); }}
              >
                <Text style={[modalStyles.ampmText, hour >= 12 && modalStyles.ampmTextActive]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Label */}
          <TextInput
            style={modalStyles.labelInput}
            value={label}
            onChangeText={setLabel}
            placeholder="Alarm label (optional)..."
            placeholderTextColor={C.mutedForeground}
          />

          {/* Repeat */}
          <Text style={modalStyles.sectionLabel}>REPEAT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {REPEAT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[modalStyles.repeatChip, repeat === opt.id && modalStyles.repeatChipActive]}
                onPress={() => setRepeat(opt.id)}
              >
                <Text style={[modalStyles.repeatChipText, repeat === opt.id && modalStyles.repeatChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Custom days */}
          {repeat === "custom" && (
            <View style={modalStyles.daysRow}>
              {DAYS.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[modalStyles.dayBtn, days.includes(i) && modalStyles.dayBtnActive]}
                  onPress={() => toggleDay(i)}
                >
                  <Text style={[modalStyles.dayText, days.includes(i) && modalStyles.dayTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Enabled toggle */}
          <View style={modalStyles.enableRow}>
            <Text style={modalStyles.enableLabel}>Alarm Enabled</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              thumbColor={enabled ? C.primary : "#555555"}
              trackColor={{ false: "#222222", true: "rgba(204,0,0,0.4)" }}
            />
          </View>

          {/* Save */}
          <View style={modalStyles.btnRow}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.saveBtn} onPress={handleSave}>
              <Feather name="check" size={16} color="#FFFFFF" />
              <Text style={modalStyles.saveText}>Save Alarm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AlarmsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { alarms, addAlarm, updateAlarm, deleteAlarm, toggleAlarm } = useAlarms();
  const [modalVisible, setModalVisible] = useState(false);
  const [editAlarm, setEditAlarm] = useState<Alarm | null>(null);

  const openAdd = () => {
    setEditAlarm(null);
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const openEdit = (alarm: Alarm) => {
    setEditAlarm(alarm);
    setModalVisible(true);
  };

  const handleSave = async (data: Omit<Alarm, "id" | "createdAt">) => {
    if (editAlarm) {
      await updateAlarm(editAlarm.id, data);
    } else {
      await addAlarm(data);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (alarm: Alarm) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    deleteAlarm(alarm.id);
  };

  const renderAlarm = ({ item }: { item: Alarm }) => (
    <TouchableOpacity style={styles.alarmCard} onPress={() => openEdit(item)} activeOpacity={0.85}>
      <View style={styles.alarmLeft}>
        <View style={[styles.alarmIndicator, { backgroundColor: item.enabled ? C.primary : "#333333" }]} />
        <View>
          <Text style={[styles.alarmTime, !item.enabled && { opacity: 0.4 }]}>
            {formatTime(item.hour, item.minute)}
          </Text>
          {item.label ? (
            <Text style={styles.alarmLabel}>{item.label}</Text>
          ) : null}
          <View style={styles.alarmMeta}>
            <Text style={styles.alarmRepeat}>
              {item.repeat === "custom"
                ? item.days.map(d => DAY_LABELS[d]).join(", ")
                : REPEAT_OPTIONS.find(o => o.id === item.repeat)?.label}
            </Text>
            {item.enabled && (
              <Text style={styles.alarmCountdown}> · in {timeUntil(item)}</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.alarmRight}>
        <Switch
          value={item.enabled}
          onValueChange={() => toggleAlarm(item.id)}
          thumbColor={item.enabled ? C.primary : "#555555"}
          trackColor={{ false: "#222222", true: "rgba(204,0,0,0.4)" }}
          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
        />
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
          <Feather name="trash-2" size={15} color="#FF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={C.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>ALARMS</Text>
          <Text style={styles.headerSub}>{alarms.filter(a => a.enabled).length} active</Text>
        </View>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Feather name="plus" size={22} color={C.primary} />
        </TouchableOpacity>
      </View>

      {alarms.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⏰</Text>
          <Text style={styles.emptyTitle}>No Alarms Set</Text>
          <Text style={styles.emptyText}>Tap + to create your first alarm</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openAdd}>
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.emptyBtnText}>Add Alarm</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={a => a.id}
          renderItem={renderAlarm}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={openAdd}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <AlarmModal
        visible={modalVisible}
        initial={editAlarm}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />
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
  },
  backBtn: { padding: 8, width: 40 },
  addBtn: { padding: 8, width: 40, alignItems: "flex-end" },
  headerTitle: {
    color: C.primary,
    fontSize: 14,
    fontFamily: "Orbitron_700Bold",
    letterSpacing: 3,
  },
  headerSub: {
    color: C.mutedForeground,
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  alarmCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0D0D0D",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  alarmLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  alarmIndicator: { width: 3, height: 52, borderRadius: 2 },
  alarmTime: {
    color: "#FFFFFF",
    fontSize: 32,
    fontFamily: "Orbitron_700Bold",
    letterSpacing: 1,
  },
  alarmLabel: {
    color: C.mutedForeground,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  alarmMeta: { flexDirection: "row", marginTop: 2 },
  alarmRepeat: {
    color: C.mutedForeground,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  alarmCountdown: {
    color: "#00FF44",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  alarmRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,68,68,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,68,68,0.2)",
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontFamily: "Orbitron_700Bold", letterSpacing: 2 },
  emptyText: { color: C.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowRadius: 16,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#080808",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    gap: 16,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#333333",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  title: {
    color: C.primary,
    fontSize: 14,
    fontFamily: "Orbitron_700Bold",
    letterSpacing: 3,
    textAlign: "center",
  },
  timePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D0D0D",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  spinnerCol: { alignItems: "center", gap: 4 },
  arrowBtn: { padding: 6 },
  timeDigit: {
    color: "#FFFFFF",
    fontSize: 48,
    fontFamily: "Orbitron_700Bold",
    letterSpacing: 2,
    minWidth: 72,
    textAlign: "center",
  },
  colon: {
    color: C.primary,
    fontSize: 42,
    fontFamily: "Orbitron_700Bold",
    marginBottom: 8,
  },
  ampmCol: { gap: 8, marginLeft: 8 },
  ampmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#222222",
  },
  ampmActive: {
    backgroundColor: "rgba(204,0,0,0.15)",
    borderColor: C.primary,
  },
  ampmText: {
    color: C.mutedForeground,
    fontSize: 13,
    fontFamily: "Orbitron_700Bold",
    letterSpacing: 1,
  },
  ampmTextActive: { color: C.primary },
  labelInput: {
    backgroundColor: "#0D0D0D",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    color: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  sectionLabel: {
    color: C.mutedForeground,
    fontSize: 10,
    fontFamily: "Orbitron_400Regular",
    letterSpacing: 2,
  },
  repeatChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#0D0D0D",
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  repeatChipActive: {
    backgroundColor: "rgba(204,0,0,0.12)",
    borderColor: C.primary,
  },
  repeatChipText: {
    color: C.mutedForeground,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  repeatChipTextActive: { color: C.primary },
  daysRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  dayBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    maxWidth: 40,
  },
  dayBtnActive: { backgroundColor: "rgba(204,0,0,0.15)", borderColor: C.primary },
  dayText: { color: C.mutedForeground, fontSize: 12, fontFamily: "Inter_700Bold" },
  dayTextActive: { color: C.primary },
  enableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0D0D0D",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  enableLabel: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_500Medium" },
  btnRow: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222222",
  },
  cancelText: { color: C.mutedForeground, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowRadius: 12,
    shadowOpacity: 0.5,
    elevation: 8,
  },
  saveText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
