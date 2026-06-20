import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { AIState } from "@/contexts/AIContext";

interface SkullOrbProps {
  state: AIState;
  size?: number;
}

export function SkullOrb({ state, size = 220 }: SkullOrbProps) {
  const ringPulse = useRef(new Animated.Value(1)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;
  const innerGlow = useRef(new Animated.Value(0.3)).current;
  const outerRing = useRef(new Animated.Value(1)).current;
  const eyeGlow = useRef(new Animated.Value(0.4)).current;
  const skullScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    stopAllAnimations();

    if (state === "idle") {
      animateIdle();
    } else if (state === "listening") {
      animateListening();
    } else if (state === "thinking") {
      animateThinking();
    } else if (state === "executing") {
      animateExecuting();
    } else if (state === "speaking") {
      animateSpeaking();
    } else if (state === "completed") {
      animateCompleted();
    }
  }, [state]);

  const stopAllAnimations = () => {
    ringPulse.stopAnimation();
    ringRotate.stopAnimation();
    innerGlow.stopAnimation();
    outerRing.stopAnimation();
    eyeGlow.stopAnimation();
    skullScale.stopAnimation();
  };

  const animateIdle = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(innerGlow, { toValue: 0.5, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(innerGlow, { toValue: 0.2, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(eyeGlow, { toValue: 0.6, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(eyeGlow, { toValue: 0.2, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  };

  const animateListening = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1.1, duration: 300, useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 0.95, duration: 300, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    Animated.timing(innerGlow, { toValue: 0.9, duration: 400, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(eyeGlow, { toValue: 1.0, duration: 200, useNativeDriver: true }),
        Animated.timing(eyeGlow, { toValue: 0.6, duration: 200, useNativeDriver: true }),
      ])
    ).start();
  };

  const animateThinking = () => {
    Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(innerGlow, { toValue: 0.8, duration: 500, useNativeDriver: true }),
        Animated.timing(innerGlow, { toValue: 0.4, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(skullScale, { toValue: 1.02, duration: 600, useNativeDriver: true }),
        Animated.timing(skullScale, { toValue: 0.98, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };

  const animateExecuting = () => {
    Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(outerRing, { toValue: 1.15, duration: 400, useNativeDriver: true }),
        Animated.timing(outerRing, { toValue: 1.0, duration: 400, useNativeDriver: true }),
      ])
    ).start();
    Animated.timing(innerGlow, { toValue: 1.0, duration: 300, useNativeDriver: true }).start();
    Animated.timing(eyeGlow, { toValue: 1.0, duration: 300, useNativeDriver: true }).start();
  };

  const animateSpeaking = () => {
    Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1.05, duration: 400, useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 0.97, duration: 400, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(eyeGlow, { toValue: 0.9, duration: 300, useNativeDriver: true }),
        Animated.timing(eyeGlow, { toValue: 0.5, duration: 300, useNativeDriver: true }),
      ])
    ).start();
  };

  const animateCompleted = () => {
    Animated.sequence([
      Animated.timing(innerGlow, { toValue: 1.0, duration: 300, useNativeDriver: true }),
      Animated.timing(innerGlow, { toValue: 0.5, duration: 600, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(skullScale, { toValue: 1.05, duration: 200, useNativeDriver: true }),
      Animated.timing(skullScale, { toValue: 1.0, duration: 300, useNativeDriver: true }),
    ]).start();
    Animated.timing(eyeGlow, { toValue: 0.8, duration: 400, useNativeDriver: true }).start();
  };

  const spin = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const ringColor = state === "listening" ? "#FF4400"
    : state === "thinking" ? "#FF6600"
    : state === "executing" ? "#FF2200"
    : state === "speaking" ? "#FF3300"
    : "#CC0000";

  const ledColor = (state === "idle" || state === "completed") ? "#00FF44" : state === "listening" ? "#FF4400" : "#FFAA00";

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer glow ring */}
      <Animated.View style={[
        styles.outerGlow,
        {
          width: size + 20,
          height: size + 20,
          borderRadius: (size + 20) / 2,
          transform: [{ scale: outerRing }],
          opacity: innerGlow,
          shadowColor: ringColor,
          shadowRadius: 30,
          shadowOpacity: 0.8,
          elevation: 20,
        }
      ]} />

      {/* Spinning energy ring */}
      <Animated.View style={[
        styles.energyRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ rotate: spin }, { scale: ringPulse }],
          borderColor: ringColor,
        }
      ]} />

      {/* Secondary ring */}
      <View style={[styles.secondaryRing, {
        width: size - 16,
        height: size - 16,
        borderRadius: (size - 16) / 2,
        borderColor: "#440000",
      }]} />

      {/* Skull core */}
      <Animated.View style={[styles.skullCore, {
        width: size - 40,
        height: size - 40,
        borderRadius: (size - 40) / 2,
        transform: [{ scale: skullScale }],
      }]}>
        {/* Skull face */}
        <View style={styles.skullFace}>
          {/* Forehead */}
          <View style={styles.skullForehead} />

          {/* Eye sockets */}
          <View style={styles.eyeRow}>
            <Animated.View style={[styles.eyeSocket, { opacity: eyeGlow }]}>
              <View style={[styles.eyeInner, { shadowColor: "#FFFFFF", shadowRadius: 8 }]} />
            </Animated.View>
            <Animated.View style={[styles.eyeSocket, { opacity: eyeGlow }]}>
              <View style={[styles.eyeInner, { shadowColor: "#FFFFFF", shadowRadius: 8 }]} />
            </Animated.View>
          </View>

          {/* Nose cavity */}
          <View style={styles.noseCavity} />

          {/* Mouth / teeth */}
          <View style={styles.mouthRow}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={styles.tooth} />
            ))}
          </View>
        </View>

        {/* Inner white glow */}
        <Animated.View style={[styles.innerGlow, { opacity: innerGlow }]} />
      </Animated.View>

      {/* Status LEDs */}
      <View style={[styles.ledLeft, { backgroundColor: ledColor, shadowColor: ledColor }]} />
      <View style={[styles.ledRight, { backgroundColor: ledColor, shadowColor: ledColor }]} />
      <View style={[styles.ledBottom, { backgroundColor: ledColor, shadowColor: ledColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  outerGlow: {
    position: "absolute",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(204,0,0,0.3)",
  },
  energyRing: {
    position: "absolute",
    borderWidth: 4,
    borderStyle: "dashed",
    backgroundColor: "transparent",
  },
  secondaryRing: {
    position: "absolute",
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  skullCore: {
    backgroundColor: "#1A0000",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2A0000",
    overflow: "hidden",
    position: "relative",
  },
  skullFace: {
    alignItems: "center",
    width: "70%",
  },
  skullForehead: {
    width: "80%",
    height: 18,
    backgroundColor: "#2A2A2A",
    borderRadius: 10,
    marginBottom: 4,
  },
  eyeRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 6,
  },
  eyeSocket: {
    width: 28,
    height: 22,
    backgroundColor: "#000000",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  eyeInner: {
    width: 14,
    height: 11,
    backgroundColor: "#FFFFFF",
    borderRadius: 7,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  noseCavity: {
    width: 10,
    height: 8,
    backgroundColor: "#000000",
    borderRadius: 5,
    marginBottom: 5,
  },
  mouthRow: {
    flexDirection: "row",
    gap: 3,
  },
  tooth: {
    width: 8,
    height: 10,
    backgroundColor: "#DDDDDD",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 100,
  },
  ledLeft: {
    position: "absolute",
    left: 12,
    top: "40%",
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    elevation: 8,
  },
  ledRight: {
    position: "absolute",
    right: 12,
    top: "40%",
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    elevation: 8,
  },
  ledBottom: {
    position: "absolute",
    bottom: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    elevation: 8,
  },
});
