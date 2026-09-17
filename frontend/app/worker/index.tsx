import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { workerAuth } from "@/src/services/workerAuth";
import { sessionStorage } from "@/src/services/api";
import { WorkerHome } from "./screens/WorkerHome";

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
}));

export default function WorkerPortal() {
  const s = useStyles();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await sessionStorage.read();
      if (!token) {
        router.replace("/login" as any);
        return;
      }

      const me = await workerAuth.me() as any;
      if (me?.role === "CUSTOMER") {
        router.replace("/customer" as any);
        return;
      }

      setAuthenticated(true);
    } catch (err) {
      await sessionStorage.clear();
      router.replace("/login" as any);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnline = async (online: boolean) => {
    setIsOnline(online);
    try {
      const { workerService } = await import("@/src/services/workerService");
      await workerService.updateStatus(online ? "ONLINE" : "OFFLINE");
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleNavigate = (screen: string, jobId?: string) => {
    if (screen === "notifications") {
      // Notifications screen not implemented yet, redirect to jobs
      router.push("/worker/jobs" as any);
    } else if (screen === "profile") {
      // Profile screen not implemented yet, redirect to jobs
      router.push("/worker/jobs" as any);
    } else if (screen === "jobs") {
      router.push("/worker/jobs" as any);
    } else if (screen === "job" && jobId) {
      router.push(`/worker/jobs/${jobId}` as any);
    } else if (screen === "accepted" && jobId) {
      router.push(`/worker/jobs/${jobId}` as any);
    } else if (screen === "navigation" && jobId) {
      router.push(`/worker/jobs/${jobId}` as any);
    } else if (screen === "arrived" && jobId) {
      router.push(`/worker/jobs/${jobId}` as any);
    } else if (screen === "start" && jobId) {
      router.push(`/worker/jobs/${jobId}` as any);
    } else if (screen === "work" && jobId) {
      router.push(`/worker/jobs/${jobId}` as any);
    } else if (screen === "materials" && jobId) {
      router.push(`/worker/jobs/${jobId}` as any);
    } else if (screen === "progress" && jobId) {
      router.push(`/worker/jobs/${jobId}` as any);
    } else if (screen === "photos" && jobId) {
      router.push(`/worker/jobs/${jobId}` as any);
    } else if (screen === "confirmation" && jobId) {
      router.push(`/worker/jobs/${jobId}` as any);
    } else if (screen === "completed" && jobId) {
      router.push(`/worker/jobs/${jobId}` as any);
    } else if (screen === "complete" && jobId) {
      router.push(`/worker/complete?jobId=${jobId}` as any);
    } else if (screen === "history") {
      router.push("/worker/jobs" as any);
    } else if (screen === "earnings") {
      router.push("/worker/jobs" as any);
    } else if (screen === "settings") {
      router.push("/worker/jobs" as any);
    } else if (screen === "support") {
      router.push("/worker/jobs" as any);
    } else if (screen === "chat" && jobId) {
      router.push(`/worker/jobs/${jobId}` as any);
    }
  };

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.loading}>
          <ActivityIndicator color="#0B63CE" size="large" />
          <Text style={{ marginTop: 12, color: "#8AA0B5" }}>Loading worker portal...</Text>
        </View>
      </View>
    );
  }

  if (!authenticated) {
    return (
      <View style={s.root}>
        <View style={s.error}>
          <Text style={{ color: "#C94A4A" }}>Authentication required</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <WorkerHome
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        onNavigate={handleNavigate}
      />
    </View>
  );
}
