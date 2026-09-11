import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Platform } from "react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { customerAuth } from "@/src/services/customerAuth";

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 110, maxWidth: 1180, width: "100%", alignSelf: "center" },
  logo: { flexDirection: "row", alignItems: "center", gap: 5 },
  logoText: { color: c.onSurface, fontSize: 24, fontWeight: "800", letterSpacing: -1.2 },
  logoX: { color: c.brandPrimary, fontSize: 25, fontWeight: "900" },
  eyebrow: { color: c.info, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" },
  hero: { borderRadius: 22, overflow: "hidden", padding: 22, minHeight: 250, justifyContent: "space-between" },
  heroTitle: { color: "#FFFFFF", fontSize: 31, lineHeight: 36, fontWeight: "800", maxWidth: 290 },
  heroText: { color: "#D4E6FB", fontSize: 14, lineHeight: 21, maxWidth: 290 },
  illustration: { position: "absolute", right: 8, bottom: 14, width: 125, height: 150, borderRadius: 70, backgroundColor: "#174D85", opacity: 0.9, alignItems: "center", justifyContent: "center" },
  inputLabel: { color: c.onSurfaceSecondary, fontSize: 12, fontWeight: "800", marginBottom: 7 },
  input: { minHeight: 48, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 11, paddingHorizontal: 14, color: c.onSurface, fontSize: 14 },
  field: { gap: 6 },
  button: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.brandPrimary, flexDirection: "row", gap: 8, marginTop: 10 },
  buttonText: { color: c.onBrandPrimary, fontSize: 14, fontWeight: "800" },
  secondaryButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderStrong, flexDirection: "row", gap: 8, marginTop: 10 },
  secondaryText: { color: c.brandPrimary, fontSize: 14, fontWeight: "800" },
  muted: { color: c.muted, fontSize: 13, lineHeight: 19 },
  textButtonText: { color: c.info, fontSize: 13, fontWeight: "800" },
}));

function Icon({ name, color, size = 20 }: { name: React.ComponentProps<typeof Ionicons>["name"]; color?: string; size?: number }) {
  const { colors } = useTheme();
  return <Ionicons name={name} color={color ?? colors.onSurfaceSecondary} size={size} />;
}

function Logo() { 
  const s = useStyles(); 
  return <View style={s.logo}><Text style={s.logoText}>Shed</Text><Text style={s.logoX}>X</Text></View>; 
}

export default function Login() {
  const s = useStyles();
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!mobile || !password) {
      setError("Enter your registered mobile number and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await customerAuth.login(mobile, password);
      router.replace("/customer" as any);
    } catch (e: any) {
      setError(e?.message || "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginBottom: 25 }}>
          <Logo />
          <Text style={[s.muted, { marginTop: 4 }]}>CUSTOMER PORTAL</Text>
        </View>

        <LinearGradient colors={["#0B1F3A", "#0E4D85"]} style={s.hero}>
          <View style={{ gap: 12, zIndex: 1 }}>
            <Text style={s.eyebrow}>SHEDX CUSTOMER PORTAL</Text>
            <Text style={s.heroTitle}>Manage your PEB services</Text>
            <Text style={s.heroText}>Request services, track jobs, and get support for your structures.</Text>
          </View>
          <View style={s.illustration}>
            <Icon name="home" size={52} color="#A9D6FF" />
            <Icon name="shield-checkmark" size={28} color="#FFFFFF" />
          </View>
        </LinearGradient>

        <View style={{ gap: 16, marginTop: 24 }}>
          <View style={s.field}>
            <Text style={s.inputLabel}>Mobile Number</Text>
            <TextInput
              testID="login-mobile"
              value={mobile}
              onChangeText={setMobile}
              placeholder="+91 98765 43210"
              placeholderTextColor="#8AA0B5"
              style={s.input}
            />
          </View>
          <View style={s.field}>
            <Text style={s.inputLabel}>Password</Text>
            <TextInput
              testID="login-password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#8AA0B5"
              secureTextEntry
              style={s.input}
            />
          </View>
          {error ? <Text testID="login-error" style={{ color: "#C94A4A", fontSize: 13 }}>{error}</Text> : null}
          <Pressable
            testID="login-submit"
            onPress={submit}
            disabled={busy}
            style={({ pressed }) => [s.button, pressed && { opacity: 0.78 }, busy && { opacity: 0.45 }]}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <><Icon name="log-in-outline" color="#FFFFFF" size={17} /><Text style={s.buttonText}>Sign In</Text></>}
          </Pressable>
          <Pressable onPress={() => router.push("/register" as any)} style={{ alignItems: "center", minHeight: 44, justifyContent: "center" }}>
            <Text style={s.muted}>New to ShedX? <Text style={s.textButtonText}>Create account</Text></Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
