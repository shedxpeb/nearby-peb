import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { makeStyles } from "@/src/theme";
import { type Job } from "@/src/types/worker";
import { jobService } from "@/src/services/jobService";
import { formatPreferredDate } from "@/src/utils/workerDateUtils";
import WorkerJobCard from "../components/WorkerJobCard";

const useStyles = makeStyles((c: any) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 110, maxWidth: 1180, width: "100%", alignSelf: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap" },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  input: { minHeight: 48, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 11, paddingHorizontal: 14, color: c.onSurface, fontSize: 14 },
  chip: { borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border, marginRight: 7, marginBottom: 7 },
  chipSelected: { backgroundColor: c.brandTertiary, borderColor: c.brandPrimary },
  chipText: { color: c.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  chipSelectedText: { color: c.brandPrimary },
  loading: { alignItems: "center", justifyContent: "center", padding: 40 },
  error: { alignItems: "center", justifyContent: "center", padding: 40 },
  errorText: { color: c.error, fontSize: 14, textAlign: "center", marginTop: 12 },
  empty: { alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyText: { color: "#8AA0B5", fontSize: 14, textAlign: "center" },
}));

interface WorkerJobsProps {
  onNavigate: (screen: string, jobId?: string) => void;
}

export const WorkerJobs = ({ onNavigate }: WorkerJobsProps) => {
  const s = useStyles();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");

  const loadJobs = async () => {
    try {
      setLoading(true);
      const jobsData = await jobService.requests();
      const normalized = (jobsData as any[]).map((job: any) => ({
        id: String(job.id),
        service: job.service_type || job.title || "Service",
        company: job.customer_name || "Customer",
        location: job.city || job.address_line || "Location",
        address: job.address_line || job.city || "Location",
        distance: job.distance_km ? `${job.distance_km} km` : "Unknown",
        duration: job.estimated_duration_minutes ? `${Math.ceil(job.estimated_duration_minutes / 60)} hours` : "Unknown",
        payout: Number(job.estimated_payout || 0),
        urgency: (job.priority === "URGENT" || job.priority === "HIGH" ? "Urgent" : "Standard") as "Urgent" | "Standard",
        scheduled: formatPreferredDate(job.scheduled_at),
        description: job.description || job.problem_description || "",
        materials: job.materials || [],
        status: job.status || "requested",
      }));
      setJobs(normalized);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadJobs();
    // Poll every 15 seconds for live updates
    const interval = setInterval(loadJobs, 15000);
    return () => clearInterval(interval);
  }, []);

  const visible = jobs.filter((job) => {
    const matchesTab = tab === "Urgent" ? job.urgency === "Urgent" : true;
    const matchesQuery = `${job.service} ${job.company}`.toLowerCase().includes(query.toLowerCase());
    return matchesTab && matchesQuery;
  });

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.loading}>
          <Text style={{ color: "#8AA0B5" }}>Loading jobs...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.root}>
        <View style={s.error}>
          <Text style={{ color: "#C94A4A" }}>{error}</Text>
          <Pressable onPress={loadJobs} style={{ marginTop: 16 }}>
            <Text style={{ color: "#0B63CE", fontWeight: "800" }}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.rowWrap}>
        {["All", "Nearby", "Urgent"].map((x) => (
          <Pressable
            key={x}
            onPress={() => setTab(x)}
            style={[s.chip, tab === x && s.chipSelected]}
          >
            <Text style={[s.chipText, tab === x && s.chipSelectedText]}>
              {x} {x === "All" ? `(${jobs.length})` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[s.input, s.row, { marginBottom: 14 }]}>
        <Ionicons name="search" size={17} color="#8AA0B5" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search service or company"
          placeholderTextColor="#8AA0B5"
          style={{ flex: 1, color: "#0B1F3A", marginLeft: 8 }}
        />
        <Ionicons name="options-outline" size={17} color="#8AA0B5" />
      </View>

      <View style={s.gap12}>
        {visible.length ? (
          visible.map((job) => (
            <WorkerJobCard
              key={job.id}
              job={job}
              onView={() => {
                onNavigate("job", job.id);
              }}
              onAccept={() => {
                onNavigate("accepted", job.id);
              }}
            />
          ))
        ) : (
          <View style={s.empty}>
            <Ionicons name="briefcase-outline" size={48} color="#8AA0B5" />
            <Text style={s.emptyText}>No new service requests nearby</Text>
            <Text style={s.emptyText}>Try another search, or check back soon — new requests arrive through the day.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default WorkerJobs;
