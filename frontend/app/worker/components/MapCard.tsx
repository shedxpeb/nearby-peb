import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  location: { padding: 12, borderRadius: 14, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
}));

interface LocationCardProps {
  destination: string;
  address?: string;
}

export default function LocationCard({ destination = "Location", address }: LocationCardProps) {
  const s = useStyles();

  return (
    <View style={s.location}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="location-outline" color="#0B63CE" size={20} />
        <Text style={{ fontSize: 15, fontWeight: "800", color: "#0B1F3A" }}>{destination}</Text>
      </View>
      {address && <Text style={{ fontSize: 13, color: "#8AA0B5", marginTop: 4 }}>{address}</Text>}
    </View>
  );
}
