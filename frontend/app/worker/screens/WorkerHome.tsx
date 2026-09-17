import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { makeStyles } from "@/src/theme";
import { type Job } from "@/src/types/worker";
import { jobService } from "@/src/services/jobService";
import { workerService } from "@/src/services/workerService";
import { notificationService } from "@/src/services/notificationService";
import { formatPreferredDate } from "@/src/utils/workerDateUtils";
import WorkerJobCard from "../components/WorkerJobCard";
import WorkerStatCard from "../components/WorkerStatCard";
import WorkerStatusCard from "../components/WorkerStatusCard";

const useStyles = makeStyles((c: any) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 110, maxWidth: 1180, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, marginBottom: 14 },
  iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: c.brandPrimary, fontSize: 17, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center" },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
  loading: { alignItems: "center", justifyContent: "center", padding: 40 },
  error: { alignItems: "center", justifyContent: "center", padding: 40 },
  errorText: { color: c.error, fontSize: 14, textAlign: "center", marginTop: 12 },
}));

interface WorkerProfile {
  name: string;
  trade: string;
  rating: number;
  jobs: number;
}

interface WorkerHomeProps {
  isOnline: boolean;
  onToggleOnline: (online: boolean) => void;
  onNavigate: (screen: string, jobId?: string) => void;
}

export const WorkerHome = ({ isOnline, onToggleOnline, onNavigate }: WorkerHomeProps) => {
  const s = useStyles();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [worker, setWorker] = useState<WorkerProfile>({ name: "", trade: "", rating: 0, jobs: 0 });
  const [unreadCount, setUnreadCount] = useState(0);

  const loadWorkerData = async () => {
    try {
      setLoading(true);
      const [profileData, jobsData, notificationsData] = await Promise.all([
        workerService.profile(),
        jobService.requests(),
        notificationService.list(),
      ]);

      const profile = profileData as any;
      setWorker({
        name: profile.full_name || "Worker",
        trade: profile.primary_trade || "Professional",
        rating: Number(profile.rating_avg || 0),
        jobs: Number(profile.completed_jobs_count || 0),
      });

      const normalizedJobs = (jobsData as any[]).map((job: any) => ({
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
      setJobs(normalizedJobs);

      const unread = (notificationsData as any[]).filter((n: any) => !n.is_read).length;
      setUnreadCount(unread);

      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to load worker data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWorkerData();
    // Poll every 15 seconds for live updates
    const interval = setInterval(loadWorkerData, 15000);
    return () => clearInterval(interval);
  }, []);

  const featured = jobs[0];

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.loading}>
          <Text style={{ color: "#8AA0B5" }}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.root}>
        <View style={s.error}>
          <Text style={{ color: "#C94A4A" }}>{error}</Text>
          <Pressable onPress={loadWorkerData} style={{ marginTop: 16 }}>
            <Text style={{ color: "#0B63CE", fontWeight: "800" }}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.header}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#0B1F3A" }}>Shed</Text>
          <Text style={{ fontSize: 25, fontWeight: "900", color: "#0B63CE" }}>X</Text>
        </View>
        <View style={s.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={s.iconButton}
            onPress={() => onNavigate("notifications")}
          >
            <Ionicons name="notifications-outline" size={20} color="#58708C" />
            {unreadCount > 0 && (
              <View style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: "#C94A4A" }} />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            style={s.avatar}
            onPress={() => onNavigate("profile")}
          >
            <Text style={s.avatarText}>{worker.name.charAt(0).toUpperCase()}</Text>
          </Pressable>
        </View>
      </View>

      <WorkerStatusCard
        isOnline={isOnline}
        onToggle={onToggleOnline}
      />

      <View style={[s.row, { gap: 8, marginTop: 12 }]}>
        <WorkerStatCard
          label="New requests"
          value={isOnline ? String(jobs.length) : "0"}
          icon="briefcase-outline"
          accent="#0B63CE"
        />
        <WorkerStatCard
          label="Status"
          value={isOnline ? "Active" : "Off"}
          icon="flash-outline"
          accent="#C8871A"
        />
        <WorkerStatCard
          label="Completed"
          value={String(worker.jobs)}
          icon="checkmark-done-outline"
          accent="#15966D"
        />
      </View>

      {isOnline ? (
        featured ? (
          <WorkerJobCard
            job={featured}
            onView={() => onNavigate("job", featured.id)}
            onAccept={() => onNavigate("accepted", featured.id)}
          />
        ) : (
          <View style={{ alignItems: "center", padding: 40, gap: 12 }}>
            <Ionicons name="briefcase-outline" size={48} color="#8AA0B5" />
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#0B1F3A" }}>No new service requests</Text>
            <Text style={{ fontSize: 14, color: "#8AA0B5", textAlign: "center" }}>
              Go online to receive new job notifications from customers in your area.
            </Text>
          </View>
        )
      ) : (
        <View style={{ alignItems: "center", padding: 40, gap: 12 }}>
          <Ionicons name="radio-button-off" size={48} color="#8AA0B5" />
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#0B1F3A" }}>You are offline</Text>
          <Text style={{ fontSize: 14, color: "#8AA0B5", textAlign: "center" }}>
            Go online to start receiving service requests.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default WorkerHome;
