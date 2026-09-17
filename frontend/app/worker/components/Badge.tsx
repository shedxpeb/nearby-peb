import { Text, View } from "react-native";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: c.brandTertiary, alignSelf: "flex-start" },
  badgeText: { color: c.onBrandTertiary, fontSize: 11, fontWeight: "800" },
  urgent: { backgroundColor: "#FFF0EF" },
  urgentText: { color: c.error },
  success: { backgroundColor: "#E7F7F0" },
  successText: { color: c.success },
  warning: { backgroundColor: "#FFF6E3" },
  warningText: { color: c.warning },
}));

interface BadgeProps {
  text: string;
  tone?: "default" | "urgent" | "success" | "warning";
}

export default function Badge({ text, tone = "default" }: BadgeProps) {
  const s = useStyles();
  return (
    <View style={[s.badge, tone === "urgent" && s.urgent, tone === "success" && s.success, tone === "warning" && s.warning]}>
      <Text style={[s.badgeText, tone === "urgent" && s.urgentText, tone === "success" && s.successText, tone === "warning" && s.warningText]}>{text}</Text>
    </View>
  );
}
