import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  stat: { flex: 1, minWidth: 95, gap: 5 },
  statValue: { color: c.onSurface, fontSize: 21, fontWeight: "800" },
  statLabel: { color: c.muted, fontSize: 11, fontWeight: "700" },
}));

interface WorkerStatCardProps {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  accent?: string;
}

export default function WorkerStatCard({ label, value, icon, accent }: WorkerStatCardProps) {
  const s = useStyles();
  return (
    <View style={[s.card, s.stat]}>
      <Ionicons name={icon} color={accent} size={18} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}
