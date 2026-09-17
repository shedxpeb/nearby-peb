import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 110, maxWidth: 1180, width: "100%", alignSelf: "center" },
  logo: { flexDirection: "row", alignItems: "center", gap: 5 },
  logoText: { color: c.onSurface, fontSize: 24, fontWeight: "800", letterSpacing: -1.2 },
  logoX: { color: c.brandPrimary, fontSize: 25, fontWeight: "900" },
  eyebrow: { color: c.info, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" },
  h1: { color: c.onSurface, fontSize: 31, lineHeight: 37, fontWeight: "800", letterSpacing: -0.8 },
  body: { color: c.onSurfaceSecondary, fontSize: 14, lineHeight: 21 },
  muted: { color: c.muted, fontSize: 13, lineHeight: 19 },
  button: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.brandPrimary, flexDirection: "row", gap: 8, marginTop: 10 },
  buttonText: { color: c.onBrandPrimary, fontSize: 14, fontWeight: "800" },
  hero: { borderRadius: 22, overflow: "hidden", padding: 22, minHeight: 250, justifyContent: "space-between" },
  heroTitle: { color: "#FFFFFF", fontSize: 31, lineHeight: 36, fontWeight: "800", maxWidth: 290 },
  heroText: { color: "#D4E6FB", fontSize: 14, lineHeight: 21, maxWidth: 290 },
  illustration: { position: "absolute", right: 8, bottom: 14, width: 125, height: 150, borderRadius: 70, backgroundColor: "#174D85", opacity: 0.9, alignItems: "center", justifyContent: "center" },
}));

function Icon({ name, color, size = 20 }: { name: React.ComponentProps<typeof Ionicons>["name"]; color?: string; size?: number }) {
  const { colors } = useTheme();
  return <Ionicons name={name} color={color ?? colors.onSurfaceSecondary} size={size} />;
}

function Logo() {
  const s = useStyles();
  return <View style={s.logo}><Text style={s.logoText}>Shed</Text><Text style={s.logoX}>X</Text></View>;
}

export default function NotFound() {
  const s = useStyles();
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={[s.content, { flexGrow: 1, justifyContent: "center" }]}>
      <View style={{ alignItems: "center", marginBottom: 25 }}>
        <Logo />
        <Text style={[s.muted, { marginTop: 4 }]}>SHEDX</Text>
      </View>

      <LinearGradient colors={["#0B1F3A", "#0E4D85"]} style={s.hero}>
        <View style={{ gap: 12, zIndex: 1 }}>
          <Text style={s.eyebrow}>PAGE NOT FOUND</Text>
          <Text style={s.heroTitle}>The page you're looking for doesn't exist.</Text>
          <Text style={s.heroText}>The URL may be incorrect or the page has been moved.</Text>
        </View>
        <View style={s.illustration}>
          <Icon name="alert-circle" size={52} color="#A9D6FF" />
        </View>
      </LinearGradient>

      <View style={{ gap: 10, marginTop: 24 }}>
        <Pressable
          onPress={() => router.replace("/" as any)}
          style={({ pressed }) => [s.button, pressed && { opacity: 0.78 }]}
        >
          <Icon name="home-outline" color="#FFFFFF" size={17} />
          <Text style={s.buttonText}>Go Home</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}