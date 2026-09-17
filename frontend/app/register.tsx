import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

export default function Register() {
  const s = useStyles();
  const router = useRouter();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    if (!name || !mobile || !email || !password || !confirm) {
      setError("All fields are required.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!terms) {
      setError("You must agree to the Terms & Conditions.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // Normalize phone before sending
      const normalizedPhone = mobile.replace(/\D/g, "");
      await customerAuth.register({ full_name: name, phone: normalizedPhone, email: email.trim() || undefined, password });
      router.replace("/customer" as any);
    } catch (e: any) {
      setError(e?.message || "Registration failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [name, mobile, email, password, confirm, terms, router]);

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
            <Text style={s.heroTitle}>Create your account</Text>
            <Text style={s.heroText}>Join ShedX to manage your PEB services efficiently.</Text>
          </View>
          <View style={s.illustration}>
            <Icon name="person-add" size={52} color="#A9D6FF" />
            <Icon name="shield-checkmark" size={28} color="#FFFFFF" />
          </View>
        </LinearGradient>

        <View style={{ gap: 16, marginTop: 24 }}>
          <View style={s.field}>
            <Text style={s.inputLabel}>Full Name</Text>
            <TextInput
              testID="register-name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#8AA0B5"
              style={s.input}
            />
          </View>
          <View style={s.field}>
            <Text style={s.inputLabel}>Mobile Number</Text>
            <TextInput
              testID="register-mobile"
              value={mobile}
              onChangeText={setMobile}
              placeholder="+91 98765 43210"
              placeholderTextColor="#8AA0B5"
              style={s.input}
            />
          </View>
          <View style={s.field}>
            <Text style={s.inputLabel}>Email</Text>
            <TextInput
              testID="register-email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#8AA0B5"
              style={s.input}
            />
          </View>
          <View style={s.field}>
            <Text style={s.inputLabel}>Create Password</Text>
            <TextInput
              testID="register-password"
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#8AA0B5"
              secureTextEntry
              style={s.input}
            />
          </View>
          <View style={s.field}>
            <Text style={s.inputLabel}>Confirm Password</Text>
            <TextInput
              testID="register-confirm"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat password"
              placeholderTextColor="#8AA0B5"
              secureTextEntry
              style={s.input}
            />
          </View>
          <Pressable onPress={() => setTerms(!terms)} style={{ flexDirection: "row", gap: 10, minHeight: 44, alignItems: "center" }}>
            <Icon name={terms ? "checkbox" : "square-outline"} color={terms ? "#0B63CE" : undefined} />
            <Text style={s.muted}>I agree to ShedX <Text style={s.textButtonText}>Terms & Conditions</Text></Text>
          </Pressable>
          {error ? <Text testID="register-error" style={{ color: "#C94A4A", fontSize: 13 }}>{error}</Text> : null}
          <Pressable
            testID="register-submit"
            onPress={submit}
            disabled={busy}
            style={({ pressed }) => [s.button, pressed && { opacity: 0.78 }, busy && { opacity: 0.45 }]}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <><Icon name="checkmark" color="#FFFFFF" size={17} /><Text style={s.buttonText}>Register</Text></>}
          </Pressable>
          <Pressable onPress={() => router.replace("/login" as any)} style={{ alignItems: "center", minHeight: 44, justifyContent: "center" }}>
            <Text style={s.muted}>Already registered? <Text style={s.textButtonText}>Sign in</Text></Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
