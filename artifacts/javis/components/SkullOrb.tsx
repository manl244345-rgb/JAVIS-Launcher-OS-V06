import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { AIState } from "@/contexts/AIContext";

interface SkullOrbProps {
  state: AIState;
  size?: number;
}

export function SkullOrb({ state, size = 220 }: SkullOrbProps) {
  const ring1Rotate = useRef(new Animated.Value(0)).current;
  const ring2Rotate = useRef(new Animated.Value(0)).current;
  const ring3Rotate = useRef(new Animated.Value(0)).current;
  const outerPulse = useRef(new Animated.Value(1)).current;
  const eyeGlow = useRef(new Animated.Value(0.5)).current;
  const skullScale = useRef(new Animated.Value(1)).current;
  const glowIntensity = useRef(new Animated.Value(0.3)).current;
  const scanLine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    ring1Rotate.stopAnimation();
    ring2Rotate.stopAnimation();
    ring3Rotate.stopAnimation();
    outerPulse.stopAnimation();
    eyeGlow.stopAnimation();
    skullScale.stopAnimation();
    glowIntensity.stopAnimation();
    scanLine.stopAnimation();

    switch (state) {
      case "idle": runIdle(); break;
      case "listening": runListening(); break;
      case "thinking": runThinking(); break;
      case "executing": runExecuting(); break;
      case "speaking": runSpeaking(); break;
      case "completed": runCompleted(); break;
    }
  }, [state]);

  const spinLoop = (val: Animated.Value, dur: number, dir = 1) =>
    Animated.loop(Animated.timing(val, { toValue: dir, duration: dur, easing: Easing.linear, useNativeDriver: true })).start();

  const pulseLoop = (val: Animated.Value, lo: number, hi: number, dur: number) =>
    Animated.loop(Animated.sequence([
      Animated.timing(val, { toValue: hi, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(val, { toValue: lo, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

  const runIdle = () => {
    spinLoop(ring1Rotate, 9000);
    spinLoop(ring2Rotate, 14000, -1);
    spinLoop(ring3Rotate, 18000);
    pulseLoop(eyeGlow, 0.3, 0.7, 2500);
    pulseLoop(glowIntensity, 0.2, 0.5, 3000);
    Animated.loop(Animated.sequence([
      Animated.timing(scanLine, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(scanLine, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
  };

  const runListening = () => {
    spinLoop(ring1Rotate, 2000);
    spinLoop(ring2Rotate, 3500, -1);
    spinLoop(ring3Rotate, 5000);
    pulseLoop(outerPulse, 0.95, 1.08, 350);
    pulseLoop(eyeGlow, 0.7, 1.0, 200);
    Animated.timing(glowIntensity, { toValue: 0.9, duration: 300, useNativeDriver: true }).start();
  };

  const runThinking = () => {
    spinLoop(ring1Rotate, 1200);
    spinLoop(ring2Rotate, 2000, -1);
    spinLoop(ring3Rotate, 3000);
    pulseLoop(glowIntensity, 0.4, 0.9, 600);
    pulseLoop(skullScale, 0.97, 1.03, 800);
    pulseLoop(eyeGlow, 0.3, 0.8, 400);
  };

  const runExecuting = () => {
    spinLoop(ring1Rotate, 600);
    spinLoop(ring2Rotate, 900, -1);
    spinLoop(ring3Rotate, 1500);
    pulseLoop(outerPulse, 1.0, 1.12, 300);
    Animated.timing(glowIntensity, { toValue: 1.0, duration: 200, useNativeDriver: true }).start();
    Animated.timing(eyeGlow, { toValue: 1.0, duration: 200, useNativeDriver: true }).start();
  };

  const runSpeaking = () => {
    spinLoop(ring1Rotate, 4000);
    spinLoop(ring2Rotate, 6000, -1);
    spinLoop(ring3Rotate, 8000);
    pulseLoop(eyeGlow, 0.6, 1.0, 300);
    pulseLoop(outerPulse, 0.98, 1.06, 500);
    pulseLoop(glowIntensity, 0.5, 0.85, 400);
  };

  const runCompleted = () => {
    spinLoop(ring1Rotate, 6000);
    Animated.sequence([
      Animated.timing(glowIntensity, { toValue: 1.0, duration: 250, useNativeDriver: true }),
      Animated.timing(glowIntensity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(skullScale, { toValue: 1.06, duration: 200, useNativeDriver: true }),
      Animated.timing(skullScale, { toValue: 1.0, duration: 350, useNativeDriver: true }),
    ]).start();
    Animated.timing(eyeGlow, { toValue: 0.7, duration: 400, useNativeDriver: true }).start();
  };

  const spin1 = ring1Rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const spin2 = ring2Rotate.interpolate({ inputRange: [-1, 0], outputRange: ["-360deg", "0deg"] });
  const spin3 = ring3Rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const scanY = scanLine.interpolate({ inputRange: [0, 1], outputRange: [0, size - 40] });

  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isThinking = state === "thinking";
  const isExecuting = state === "executing";

  const ringColor = isListening ? "#FF2200"
    : isThinking ? "#FF6600"
    : isExecuting ? "#FF0000"
    : isSpeaking ? "#FF3300"
    : "#CC0000";

  const ledColor = (state === "idle" || state === "completed") ? "#00FF44"
    : isListening ? "#FF4400"
    : "#FFCC00";

  const eyeColor = isListening ? "#FF4400"
    : isSpeaking ? "#44AAFF"
    : isThinking ? "#FF8800"
    : "#FFFFFF";

  const s = size;
  const core = s * 0.72;
  const skull = s * 0.62;

  return (
    <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>

      {/* Outer ambient glow */}
      <Animated.View style={{
        position: "absolute",
        width: s + 40,
        height: s + 40,
        borderRadius: (s + 40) / 2,
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: ringColor,
        opacity: glowIntensity,
        transform: [{ scale: outerPulse }],
        shadowColor: ringColor,
        shadowRadius: 40,
        shadowOpacity: 0.8,
        elevation: 20,
      }} />

      {/* Ring 3 — slow outer dashed */}
      <Animated.View style={{
        position: "absolute",
        width: s + 10,
        height: s + 10,
        borderRadius: (s + 10) / 2,
        borderWidth: 1,
        borderColor: `${ringColor}55`,
        borderStyle: "dashed",
        transform: [{ rotate: spin3 }],
      }} />

      {/* Ring 1 — main spinning ring with markers */}
      <Animated.View style={{
        position: "absolute",
        width: s,
        height: s,
        borderRadius: s / 2,
        borderWidth: 3,
        borderColor: ringColor,
        borderTopColor: "transparent",
        borderLeftColor: "transparent",
        transform: [{ rotate: spin1 }],
        shadowColor: ringColor,
        shadowRadius: 16,
        shadowOpacity: 1,
        elevation: 10,
      }} />

      {/* Ring 2 — counter-spin inner ring */}
      <Animated.View style={{
        position: "absolute",
        width: s - 20,
        height: s - 20,
        borderRadius: (s - 20) / 2,
        borderWidth: 2,
        borderColor: `${ringColor}88`,
        borderTopColor: "transparent",
        borderRightColor: "transparent",
        transform: [{ rotate: spin2 }],
      }} />

      {/* Core shell — dark metallic */}
      <Animated.View style={{
        position: "absolute",
        width: core,
        height: core,
        borderRadius: core / 2,
        backgroundColor: "#060606",
        borderWidth: 2,
        borderColor: "#1F0000",
        transform: [{ scale: skullScale }],
        shadowColor: "#CC0000",
        shadowRadius: 20,
        shadowOpacity: 0.5,
        elevation: 8,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}>

        {/* Scan line effect */}
        <Animated.View style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: `${ringColor}44`,
          transform: [{ translateY: scanY }],
        }} />

        {/* Grid overlay */}
        <View style={StyleSheet.absoluteFill}>
          {[0.25, 0.5, 0.75].map(pos => (
            <View key={pos} style={{
              position: "absolute",
              top: `${pos * 100}%` as any,
              left: 0, right: 0,
              height: 1,
              backgroundColor: "#1A0000",
            }} />
          ))}
        </View>

        {/* SKULL FACE */}
        <View style={{ alignItems: "center", justifyContent: "center", width: skull, height: skull }}>

          {/* Cranium top dome */}
          <View style={{
            width: skull * 0.76,
            height: skull * 0.38,
            backgroundColor: "#E8E8E8",
            borderTopLeftRadius: skull * 0.5,
            borderTopRightRadius: skull * 0.5,
            borderBottomLeftRadius: skull * 0.1,
            borderBottomRightRadius: skull * 0.1,
            position: "absolute",
            top: skull * 0.05,
            borderWidth: 1,
            borderColor: "#AAAAAA",
            shadowColor: "#FFFFFF",
            shadowRadius: 8,
            shadowOpacity: 0.3,
            elevation: 4,
          }}>
            {/* Cranium panel lines */}
            <View style={{ position: "absolute", top: "30%", left: 0, right: 0, height: 1, backgroundColor: "#CCCCCC" }} />
            <View style={{ position: "absolute", top: 0, bottom: 0, left: "45%", width: 1, backgroundColor: "#CCCCCC" }} />
            <View style={{
              position: "absolute", top: "10%", left: "15%", right: "15%", height: 1,
              backgroundColor: "#BBBBBB",
              transform: [{ rotate: "5deg" }],
            }} />
            {/* Temple veins */}
            <View style={{ position: "absolute", top: "50%", left: "8%", width: skull * 0.08, height: 2, backgroundColor: "#CC0000", opacity: 0.6, borderRadius: 1 }} />
            <View style={{ position: "absolute", top: "60%", right: "8%", width: skull * 0.06, height: 2, backgroundColor: "#CC0000", opacity: 0.6, borderRadius: 1 }} />
          </View>

          {/* Cheekbones */}
          <View style={{
            position: "absolute",
            top: skull * 0.4,
            width: skull * 0.82,
            height: skull * 0.22,
            backgroundColor: "#D0D0D0",
            borderRadius: skull * 0.05,
            borderWidth: 1,
            borderColor: "#999999",
          }}>
            {/* Zygomatic arch lines */}
            <View style={{ position: "absolute", top: "30%", left: 0, right: 0, height: 1, backgroundColor: "#BBBBBB" }} />
          </View>

          {/* Eye sockets */}
          <View style={{
            position: "absolute",
            top: skull * 0.28,
            flexDirection: "row",
            gap: skull * 0.1,
          }}>
            {/* Left eye */}
            <Animated.View style={{
              width: skull * 0.22,
              height: skull * 0.19,
              backgroundColor: "#000000",
              borderRadius: skull * 0.06,
              borderWidth: 2,
              borderColor: "#333333",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: eyeColor,
              shadowRadius: 10,
              shadowOpacity: eyeGlow,
              elevation: 8,
            }}>
              <Animated.View style={{
                width: skull * 0.12,
                height: skull * 0.10,
                backgroundColor: eyeColor,
                borderRadius: skull * 0.06,
                opacity: eyeGlow,
                shadowColor: eyeColor,
                shadowRadius: 8,
                shadowOpacity: 1,
                elevation: 6,
              }} />
            </Animated.View>

            {/* Right eye */}
            <Animated.View style={{
              width: skull * 0.22,
              height: skull * 0.19,
              backgroundColor: "#000000",
              borderRadius: skull * 0.06,
              borderWidth: 2,
              borderColor: "#333333",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: eyeColor,
              shadowRadius: 10,
              shadowOpacity: eyeGlow,
              elevation: 8,
            }}>
              <Animated.View style={{
                width: skull * 0.12,
                height: skull * 0.10,
                backgroundColor: eyeColor,
                borderRadius: skull * 0.06,
                opacity: eyeGlow,
                shadowColor: eyeColor,
                shadowRadius: 8,
                shadowOpacity: 1,
                elevation: 6,
              }} />
            </Animated.View>
          </View>

          {/* Nose cavity — inverted heart shape */}
          <View style={{
            position: "absolute",
            top: skull * 0.5,
            width: skull * 0.12,
            height: skull * 0.1,
            backgroundColor: "#000000",
            borderRadius: skull * 0.06,
            borderWidth: 1,
            borderColor: "#222222",
          }} />

          {/* Maxilla (upper jaw area) */}
          <View style={{
            position: "absolute",
            top: skull * 0.59,
            width: skull * 0.7,
            height: skull * 0.08,
            backgroundColor: "#C8C8C8",
            borderRadius: skull * 0.02,
            borderWidth: 1,
            borderColor: "#999999",
          }} />

          {/* Jaw */}
          <View style={{
            position: "absolute",
            top: skull * 0.66,
            width: skull * 0.68,
            height: skull * 0.14,
            backgroundColor: "#D4D4D4",
            borderBottomLeftRadius: skull * 0.08,
            borderBottomRightRadius: skull * 0.08,
            borderTopLeftRadius: skull * 0.02,
            borderTopRightRadius: skull * 0.02,
            borderWidth: 1,
            borderColor: "#AAAAAA",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: 2,
          }}>
            {/* Teeth */}
            <View style={{ flexDirection: "row", gap: 2, paddingHorizontal: 4 }}>
              {[0.9, 1.0, 1.0, 1.0, 1.0, 0.9].map((h, i) => (
                <View key={i} style={{
                  width: skull * 0.078,
                  height: skull * 0.085 * h,
                  backgroundColor: "#F5F5F5",
                  borderRadius: skull * 0.01,
                  borderWidth: 1,
                  borderColor: "#CCCCCC",
                  shadowColor: "#FFFFFF",
                  shadowRadius: 2,
                  shadowOpacity: 0.5,
                  elevation: 2,
                }} />
              ))}
            </View>
          </View>

        </View>

        {/* Circuit traces on sides */}
        <View style={{ position: "absolute", left: 6, top: "20%", width: 12, height: 1, backgroundColor: "#CC0000", opacity: 0.7 }} />
        <View style={{ position: "absolute", left: 6, top: "25%", width: 8, height: 1, backgroundColor: "#00FF44", opacity: 0.5 }} />
        <View style={{ position: "absolute", right: 6, top: "20%", width: 12, height: 1, backgroundColor: "#CC0000", opacity: 0.7 }} />
        <View style={{ position: "absolute", right: 6, top: "25%", width: 8, height: 1, backgroundColor: "#00FF44", opacity: 0.5 }} />

        {/* Glow overlay */}
        <Animated.View style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: ringColor,
          opacity: Animated.multiply(glowIntensity, 0.06),
          borderRadius: core / 2,
        }} />
      </Animated.View>

      {/* LED indicators */}
      <View style={[styles.led, {
        left: s * 0.07,
        top: "42%",
        backgroundColor: ledColor,
        shadowColor: ledColor,
        shadowRadius: 10,
        elevation: 10,
      }]} />
      <View style={[styles.led, {
        right: s * 0.07,
        top: "42%",
        backgroundColor: ledColor,
        shadowColor: ledColor,
        shadowRadius: 10,
        elevation: 10,
      }]} />
      <View style={[styles.led, {
        bottom: s * 0.04,
        width: 10,
        height: 4,
        borderRadius: 2,
        backgroundColor: ledColor,
        shadowColor: ledColor,
        shadowRadius: 8,
        elevation: 8,
      }]} />
      <View style={[styles.led, {
        bottom: s * 0.04 + 8,
        width: 6,
        height: 3,
        borderRadius: 2,
        backgroundColor: `${ledColor}99`,
        shadowColor: ledColor,
        shadowRadius: 6,
        elevation: 6,
      }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  led: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
  },
});
