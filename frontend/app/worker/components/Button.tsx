import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  button: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.brandPrimary, flexDirection: "row", gap: 8 },
  buttonText: { color: c.onBrandPrimary, fontSize: 14, fontWeight: "800" },
  secondaryButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderStrong, flexDirection: "row", gap: 8 },
  secondaryText: { color: c.brandPrimary, fontSize: 14, fontWeight: "800" },
}));

interface ButtonProps {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  disabled?: boolean;
  loading?: boolean;
}

export default function Button({ title, onPress, secondary = false, icon, disabled = false, loading = false }: ButtonProps) {
  const s = useStyles();
  const { colors } = useTheme();

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        secondary ? s.secondaryButton : s.button,
        pressed && { opacity: 0.78, transform: [{ scale: 0.98 }] },
        (disabled || loading) && { opacity: 0.45 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? "#0B63CE" : "#FFFFFF"} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} color={secondary ? undefined : "#FFFFFF"} size={17} /> : null}
          <Text style={secondary ? s.secondaryText : s.buttonText}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
