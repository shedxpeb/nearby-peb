import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from "@expo/vector-icons";
import { Alert, Modal, ScrollView, Pressable, Text, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { jobService } from "@/src/services/jobService";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 110 },
  card: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, marginBottom: 16 },
  iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  button: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.brandPrimary },
  buttonText: { color: c.onBrandPrimary, fontSize: 14, fontWeight: "800" },
  disabledButton: { backgroundColor: "#D9C486" },
  success: { backgroundColor: "#E7F7F0" },
  successText: { color: "#15966D" },
  brandTertiary: { backgroundColor: c.brandTertiary },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "800" },
  h2: { fontSize: 21, fontWeight: "800", color: c.onSurface },
  h3: { fontSize: 16, fontWeight: "800", color: c.onSurface },
  body: { fontSize: 14, lineHeight: 21, color: c.onSurfaceSecondary },
  muted: { color: c.muted },
  tiny: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: c.info },
}));

export default function CompleteJob() {
  const router = useRouter();
  const s = useStyles();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState<string>("");

  useEffect(() => {
    const params = (router as any).params;
    const extractedJobId = params?.jobId || "";
    setJobId(extractedJobId);

    if (!extractedJobId) {
      setLoading(false);
      setError("No job ID provided");
      return;
    }

    jobService.detail(extractedJobId)
      .then((data: any) => {
        setJob(data);
        setLoading(false);
      })
      .catch((e: any) => {
        const msg = e?.message ?? "Could not load job details";
        setError(msg);
        setLoading(false);
      });
  }, []);

  const handleComplete = useCallback(async () => {
    if (!jobId) return;
    setCompleting(true);
    setError("");
    try {
      await jobService.complete(jobId);
      setShowConfirm(false);
      Alert.alert("Success", "Job completed successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e: any) {
      const msg = e?.message ?? "Could not complete job";
      setError(msg);
      Alert.alert("Error", msg);
    } finally {
      setCompleting(false);
    }
  }, [jobId, router]);

  if (loading) {
    return (
      <View style={s.root}>
        <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
          <ActivityIndicator color="#0B63CE" size="large" />
          <Text style={[s.muted, { marginTop: 12 }]}>Loading job details…</Text>
        </View>
      </View>
    );
  }

  if (error && !job) {
    return (
      <View style={[s.root, s.content]}>
        <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
          <Ionicons name="alert-circle" size={48} color="#8AA0B5" />
          <Text style={[s.h3, { marginTop: 16 }]}>Could not load job</Text>
          <Text style={[s.muted, { textAlign: "center", marginTop: 8 }]}>{error}</Text>
          <Pressable
            style={[s.button, { marginTop: 24 }]}
            onPress={() => router.back()}
          >
            <Text style={s.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[s.root, s.content]}>
        <View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
          <Ionicons name="briefcase-outline" size={48} color="#8AA0B5" />
          <Text style={[s.h3, { marginTop: 16 }]}>No active job</Text>
          <Text style={[s.muted, { textAlign: "center", marginTop: 8 }]}>You have no assigned job to complete.</Text>
          <Pressable
            style={[s.button, { marginTop: 24 }]}
            onPress={() => router.replace("/worker")}
          >
            <Text style={s.buttonText}>View Jobs</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <Pressable onPress={() => router.back()} style={s.iconButton}>
            <Ionicons name="arrow-back" size={20} color="#8AA0B5" />
          </Pressable>
          <View style={{ marginLeft: 12 }}>
            <Text style={s.h2}>Complete Task</Text>
            <Text style={s.tiny}>Service assignment</Text>
          </View>
        </View>

        {error && <Text style={{ color: "#C94A4A", fontSize: 13, marginBottom: 12 }}>{error}</Text>}

        <View style={s.card}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#0B1F3A" }}>{job.job_number || "Service Request"}</Text>
            <View style={[s.badge, job.status === "COMPLETED" ? s.success : s.brandTertiary]}>
              <Text style={[s.badgeText, job.status === "COMPLETED" ? s.successText : { color: "#0B63CE" }]}>{job.status || "ASSIGNED"}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 21, fontWeight: "800", color: "#0B1F3A", marginBottom: 8 }}>{job.title || job.service_type || "Field Service"}</Text>
          <Text style={{ fontSize: 14, lineHeight: 21, color: "#58708C" }}>{job.description || job.problem_description || "Service assignment from ShedX."}</Text>
        </View>

        <View style={s.card}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#0B1F3A", marginBottom: 12 }}>Customer</Text>
          <Text style={{ fontSize: 14, color: "#0B1F3A" }}>{job.customer_name || "Customer"}</Text>
          {job.customer_phone && <Text style={{ fontSize: 13, color: "#8AA0B5", marginTop: 4 }}>{job.customer_phone}</Text>}
        </View>

        <View style={s.card}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#0B1F3A", marginBottom: 12 }}>Site</Text>
          <Text style={{ fontSize: 14, color: "#0B1F3A" }}>{job.site_name || "Service Site"}</Text>
          <Text style={{ fontSize: 13, color: "#8AA0B5", marginTop: 4 }}>{[job.city, job.state].filter(Boolean).join(", ") || job.address_line || "Location"}</Text>
        </View>

        <View style={s.card}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#0B1F3A", marginBottom: 12 }}>Service</Text>
          <Text style={{ fontSize: 14, color: "#0B1F3A" }}>{job.service_type || job.title || "Field Service"}</Text>
          {job.estimated_payout && <Text style={{ fontSize: 21, fontWeight: "800", color: "#0B63CE", marginTop: 8 }}>₹{Number(job.estimated_payout).toLocaleString("en-IN")}</Text>}
        </View>

        <Pressable
          style={[s.button, (completing || job.status === "COMPLETED") && s.disabledButton]}
          disabled={completing || job.status === "COMPLETED"}
          onPress={() => setShowConfirm(true)}
        >
          {completing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={s.buttonText}>Complete Task</Text>
          )}
        </Pressable>
      </ScrollView>

      <Modal visible={showConfirm} animationType="slide" transparent onRequestClose={() => setShowConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(11,31,58,0.48)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: "88%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <Text style={{ fontSize: 21, fontWeight: "800", color: "#0B1F3A" }}>Complete Task</Text>
              <Pressable onPress={() => setShowConfirm(false)} style={s.iconButton}>
                <Ionicons name="close" size={20} color="#8AA0B5" />
              </Pressable>
            </View>
            <Text style={{ fontSize: 14, lineHeight: 21, color: "#0B1F3A" }}>Mark this service request as completed?</Text>
            <Text style={{ fontSize: 13, lineHeight: 19, color: "#8AA0B5", marginTop: 8 }}>This will update the job status to COMPLETED and notify the customer.</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
              <Pressable
                style={{ flex: 1, minHeight: 48, paddingHorizontal: 18, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FBFD", borderWidth: 1, borderColor: "#AFC6DC" }}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={{ color: "#0B63CE", fontSize: 14, fontWeight: "800" }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={{ flex: 1, minHeight: 48, paddingHorizontal: 18, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#0B63CE" }}
                onPress={handleComplete}
                disabled={completing}
              >
                {completing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800" }}>Complete Task</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}