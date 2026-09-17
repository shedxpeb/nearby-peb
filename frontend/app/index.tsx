import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { sessionStorage } from "@/src/services/api";
import { customerAuth } from "@/src/services/customerAuth";
import { workerAuth } from "@/src/services/workerAuth";

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
  secondaryButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderStrong, flexDirection: "row", gap: 8, marginTop: 10 },
  secondaryText: { color: c.brandPrimary, fontSize: 14, fontWeight: "800" },
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

export default function Index() {
  const s = useStyles();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const token = await sessionStorage.read();
      if (!token) {
        // No token - show landing page
        return;
      }

      try {
        // Try customer auth first
        const customerMe = await customerAuth.me() as any;
        if (customerMe?.role === "CUSTOMER") {
          router.replace("/customer" as any);
          return;
        }
      } catch (e) {
        // Not a customer, try worker
      }

      try {
        const workerMe = await workerAuth.me() as any;
        if (workerMe?.role === "WORKER") {
          router.replace("/worker" as any);
          return;
        }
      } catch (e) {
        // Not a worker either, clear token
        await sessionStorage.clear();
      }
    })();
  }, []);

  return (
    <ScrollView contentContainerStyle={[s.content, { flexGrow: 1, justifyContent: "center" }]}>
      <View style={{ alignItems: "center", marginBottom: 25 }}>
        <Logo />
        <Text style={[s.muted, { marginTop: 4 }]}>SHEDX CUSTOMER PORTAL</Text>
      </View>

      <LinearGradient colors={["#0B1F3A", "#0E4D85"]} style={s.hero}>
        <View style={{ gap: 12, zIndex: 1 }}>
          <Text style={s.eyebrow}>SHEDX AFTER-SALES SERVICE</Text>
          <Text style={s.heroTitle}>Expert care for every structure.</Text>
          <Text style={s.heroText}>Book trusted PEB service professionals for repairs, inspections and maintenance at your sites.</Text>
        </View>
        <View style={s.illustration}>
          <Icon name="business" size={52} color="#A9D6FF" />
          <Icon name="shield-checkmark" size={28} color="#FFFFFF" />
        </View>
      </LinearGradient>

      <View style={{ gap: 10, marginTop: 24 }}>
        <Pressable
          testID="landing-login"
          onPress={() => router.push("/login" as any)}
          style={({ pressed }) => [s.button, pressed && { opacity: 0.78 }]}
        >
          <Icon name="log-in-outline" color="#FFFFFF" size={17} />
          <Text style={s.buttonText}>Sign In</Text>
        </Pressable>

        <Pressable
          testID="landing-register"
          onPress={() => router.push("/register" as any)}
          style={({ pressed }) => [s.secondaryButton, pressed && { opacity: 0.78 }]}
        >
          <Icon name="person-add-outline" color="#0B63CE" size={17} />
          <Text style={s.secondaryText}>Create Account</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
