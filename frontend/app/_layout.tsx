import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LogBox } from "react-native";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);

// Suppress React Native Web development warnings in browser console
if (typeof window !== "undefined") {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.warn = (...args) => {
    const message = args[0];
    if (
      typeof message === "string" &&
      (message.includes("Cannot record touch end without a touch start") ||
       message.includes("aria-hidden") ||
       message.includes("touch responder"))
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };

  console.error = (...args) => {
    const message = args[0];
    if (
      typeof message === "string" &&
      (message.includes("Cannot record touch end without a touch start") ||
       message.includes("aria-hidden") ||
       message.includes("touch responder") ||
       message.includes("startTime") ||
       message.includes("reportAllChanges"))
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export default function RootLayout() {
  // One app level ErrorBoundary; a render crash shows a reload screen
  // instead of a blank app.
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
