import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { type Job } from "@/src/types/worker";
import Button from "./Button";
import Badge from "./Badge";

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  gap: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center" },
  gap8: { gap: 8 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  body: { color: c.onSurfaceSecondary, fontSize: 14, lineHeight: 21 },
  muted: { color: c.muted, fontSize: 13, lineHeight: 19 },
  h3: { color: c.onSurface, fontSize: 16, fontWeight: "800" },
}));

interface WorkerJobCardProps {
  job: Job;
  onView: () => void;
  onAccept: () => void;
}

export default function WorkerJobCard({ job, onView, onAccept }: WorkerJobCardProps) {
  const s = useStyles();

  return (
    <View style={s.card}>
      <View style={s.gap}>
        <View style={s.between}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={s.h3}>{job.service}</Text>
            <Text style={s.body}>{job.company}</Text>
          </View>
          <Badge text={job.urgency} tone={job.urgency === "Urgent" ? "urgent" : "default"} />
        </View>
        <View style={s.gap8}>
          <View style={s.row}>
            <Ionicons name="location-outline" color="#0B63CE" size={16} />
            <Text style={s.muted}>{job.location} · {job.distance}</Text>
          </View>
          <View style={s.row}>
            <Ionicons name="time-outline" size={16} />
            <Text style={s.muted}>{job.duration} · {job.scheduled}</Text>
          </View>
        </View>
        <View style={s.between}>
          <Text style={[s.h3, { color: "#0B63CE" }]}>₹{job.payout.toLocaleString("en-IN")}</Text>
          <View style={[s.row, s.gap8]}>
            <Button title="View" secondary onPress={onView} />
            <Button title="Accept" onPress={onAccept} />
          </View>
        </View>
      </View>
    </View>
  );
}
