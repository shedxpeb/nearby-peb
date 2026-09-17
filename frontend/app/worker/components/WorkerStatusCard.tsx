import { Ionicons } from "@expo/vector-icons";
import { Switch, Text, View } from "react-native";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", gap: 10 },
  online: { backgroundColor: "#E7F7F0", borderColor: "#BDE7D4" },
  offline: { backgroundColor: "#FFF6E3", borderColor: "#F1D898" },
  row: { flexDirection: "row", alignItems: "center" },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  h3: { color: c.onSurface, fontSize: 16, fontWeight: "800" },
  muted: { color: c.muted, fontSize: 13, lineHeight: 19 },
}));

interface WorkerStatusCardProps {
  isOnline: boolean;
  onToggle: (online: boolean) => void;
}

export default function WorkerStatusCard({ isOnline, onToggle }: WorkerStatusCardProps) {
  const s = useStyles();
  return (
    <View style={[s.card, isOnline ? s.online : s.offline]}>
      <View style={s.between}>
        <View style={s.row}>
          <Ionicons name={isOnline ? "radio" : "radio-outline"} color={isOnline ? "#15966D" : "#C8871A"} />
          <Text style={[s.h3, { marginLeft: 8 }]}>{isOnline ? "You are Online" : "You are Offline"}</Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={onToggle}
          trackColor={{ false: "#D9C486", true: "#7BC69C" }}
          thumbColor={isOnline ? "#15966D" : "#FFFFFF"}
        />
      </View>
      <Text style={s.muted}>{isOnline ? "Available for service requests nearby." : "Go online to receive new service requests."}</Text>
    </View>
  );
}
