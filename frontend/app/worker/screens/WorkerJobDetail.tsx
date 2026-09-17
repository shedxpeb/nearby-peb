import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View, Alert } from "react-native";
import { makeStyles } from "@/src/theme";
import { type Job } from "@/src/types/worker";
import { jobService } from "@/src/services/jobService";
import { formatDateTime, formatPreferredDate } from "@/src/utils/workerDateUtils";
import LocationCard from "../components/MapCard";
import Button from "../components/Button";
import Badge from "../components/Badge";

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 110, maxWidth: 1180, width: "100%", alignSelf: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap" },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
  h2: { color: c.onSurface, fontSize: 21, lineHeight: 27, fontWeight: "800" },
  h3: { color: c.onSurface, fontSize: 16, fontWeight: "800" },
  body: { color: c.onSurfaceSecondary, fontSize: 14, lineHeight: 21 },
  muted: { color: c.muted, fontSize: 13, lineHeight: 19 },
  divider: { height: 1, backgroundColor: c.divider },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  loading: { alignItems: "center", justifyContent: "center", padding: 40 },
  error: { alignItems: "center", justifyContent: "center", padding: 40 },
  errorText: { color: c.error, fontSize: 14, textAlign: "center", marginTop: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: c.brandPrimary, fontSize: 17, fontWeight: "800" },
}));

interface WorkerJobDetailProps {
  jobId: string;
  onNavigate: (screen: string, jobId?: string) => void;
}

export const WorkerJobDetail = ({ jobId, onNavigate }: WorkerJobDetailProps) => {
  const s = useStyles();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [job, setJob] = useState<Job | null>(null);

  const loadJob = useCallback(async () => {
    try {
      setLoading(true);
      const jobData = await jobService.view(jobId);
      const normalized = {
        id: String((jobData as any).id),
        service: (jobData as any).service_type || (jobData as any).title || "Service",
        company: (jobData as any).customer_name || "Customer",
        location: (jobData as any).city || (jobData as any).address_line || "Location",
        address: (jobData as any).address_line || (jobData as any).city || "Location",
        distance: (jobData as any).distance_km ? `${(jobData as any).distance_km} km` : "Unknown",
        duration: (jobData as any).estimated_duration_minutes ? `${Math.ceil((jobData as any).estimated_duration_minutes / 60)} hours` : "Unknown",
        payout: Number((jobData as any).estimated_payout || 0),
        urgency: ((jobData as any).priority === "URGENT" || (jobData as any).priority === "HIGH" ? "Urgent" : "Standard") as "Urgent" | "Standard",
        scheduled: formatPreferredDate((jobData as any).scheduled_at),
        description: (jobData as any).description || (jobData as any).problem_description || "",
        materials: (jobData as any).materials || [],
        status: (jobData as any).status || "requested",
      };
      setJob(normalized);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to load job details");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    const t = setTimeout(() => loadJob(), 0);
    // Poll every 15 seconds for live updates
    const interval = setInterval(loadJob, 15000);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [loadJob]);

  const handleAccept = async () => {
    try {
      await jobService.accept(jobId);
      Alert.alert("Job Accepted", "You have accepted this job. Navigate to the site to begin work.");
      onNavigate("accepted", jobId);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to accept job");
    }
  };

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.loading}>
          <Text style={{ color: "#8AA0B5" }}>Loading job details...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.root}>
        <View style={s.error}>
          <Text style={{ color: "#C94A4A" }}>{error}</Text>
          <Pressable onPress={loadJob} style={{ marginTop: 16 }}>
            <Text style={{ color: "#0B63CE", fontWeight: "800" }}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={s.root}>
        <View style={s.error}>
          <Text style={{ color: "#C94A4A" }}>Job not found</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.gap16}>
        <View style={s.between}>
          <View>
            <Text style={s.h2}>{job.company}</Text>
            <Text style={s.muted}>{job.location}</Text>
          </View>
          <Badge text={job.urgency} tone={job.urgency === "Urgent" ? "urgent" : "default"} />
        </View>

        <LocationCard destination={job.location} address={job.address} />

        <View style={s.row}>
          <Ionicons name="location-outline" color="#0B63CE" />
          <Text style={s.body}>{job.distance} · {job.scheduled}</Text>
        </View>

        <View style={s.row}>
          <Ionicons name="time-outline" />
          <Text style={s.body}>{job.duration} · {job.service}</Text>
        </View>

        <Text style={s.h3}>Job description</Text>
        <Text style={s.body}>{job.description}</Text>

        <Text style={s.h3}>Expected materials</Text>
        <View style={s.rowWrap}>
          {job.materials.map((x) => (
            <Badge key={x} text={x} />
          ))}
        </View>

        <Text style={s.h3}>Customer details</Text>
        <View style={s.row}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>C</Text>
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={s.h3}>Customer</Text>
            <Text style={s.muted}>Site Manager</Text>
          </View>
        </View>

        <View style={s.divider} />
        <Text style={[s.h2, { color: "#0B63CE" }]}>₹{job.payout.toLocaleString("en-IN")}</Text>

        <View style={[s.row, s.gap8, { marginTop: 20 }]}>
          <Button title="Accept Job" onPress={handleAccept} />
          <Button title="Pass" secondary onPress={() => onNavigate("jobs")} />
        </View>
      </View>
    </ScrollView>
  );
};

export default WorkerJobDetail;
