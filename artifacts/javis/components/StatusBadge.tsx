import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AIState } from "@/contexts/AIContext";
import colors from "@/constants/colors";

const STATE_LABELS: Record<AIState, string> = {
  idle: "STANDBY",
  listening: "LISTENING",
  thinking: "PROCESSING",
  executing: "EXECUTING",
  speaking: "SPEAKING",
  completed: "COMPLETE",
};

const STATE_COLORS: Record<AIState, string> = {
  idle: colors.dark.ledGreen,
  listening: "#FF4400",
  thinking: "#FF8800",
  executing: "#FFAA00",
  speaking: "#4488FF",
  completed: colors.dark.ledGreen,
};

export function StatusBadge({ state }: { state: AIState }) {
  const color = STATE_COLORS[state];
  return (
    <View style={[styles.container, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color, shadowColor: color }]} />
      <Text style={[styles.label, { color }]}>{STATE_LABELS[state]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
  },
});
