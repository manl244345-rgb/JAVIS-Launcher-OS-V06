import {
  Orbitron_400Regular,
  Orbitron_700Bold,
  useFonts as useOrbitron,
} from "@expo-google-fonts/orbitron";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MemoryProvider } from "@/contexts/MemoryContext";
import { AIProvider } from "@/contexts/AIContext";
import { VoiceProvider } from "@/contexts/VoiceContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#000000" },
      }}
    >
      <Stack.Screen name="index" options={{ animation: "none" }} />
      <Stack.Screen name="settings" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="image-studio" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="video-studio" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [orbitronLoaded, orbitronError] = useOrbitron({
    Orbitron_400Regular,
    Orbitron_700Bold,
  });

  const ready = (fontsLoaded || !!fontError) && (orbitronLoaded || !!orbitronError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <MemoryProvider>
                <AIProvider>
                  <VoiceProvider>
                    <RootLayoutNav />
                  </VoiceProvider>
                </AIProvider>
              </MemoryProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
