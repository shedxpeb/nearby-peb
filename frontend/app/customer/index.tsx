import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView,
  Switch, Text, TextInput, useWindowDimensions, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme } from "@/src/theme";
import { authService } from "@/src/services/authService";
import { sessionStorage } from "@/src/services/api";
import { customerService } from "@/src/services/customerService";
import { mapService } from "@/src/services/mapService";
import { notificationService } from "@/src/services/notificationService";
import { storageService } from "@/src/services/storageService";
import { supportService } from "@/src/services/supportService";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type Screen = "welcome" | "login" | "register" | "setup" | "home" | "sites" | "create" | "searching" | "request" | "confirm" | "requests" | "history" | "notifications" | "support" | "profile" | "settings";

const SERVICES = [
  "Roof Panel Repair", "Wall Cladding Repair", "Structure Repair", "Gutter & Downpipe Repair",
  "Crane Support", "Mezzanine Work", "Leak Inspection", "Fastener Replacement",
  "Painting / Protective Coating", "General Maintenance",
];

const STATUS_META: Record<string, { label: string; tone: "default" | "success" | "warning" | "urgent" }> = {
  REQUESTED: { label: "Requested", tone: "default" }, OFFERED: { label: "Matching", tone: "default" },
  ACCEPTED: { label: "Worker assigned", tone: "success" }, EN_ROUTE: { label: "En route", tone: "default" },
  ARRIVED: { label: "Arrived", tone: "default" }, IN_PROGRESS: { label: "In progress", tone: "default" },
  PAUSED: { label: "Paused", tone: "warning" }, WAITING_CUSTOMER: { label: "Confirmation required", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" }, CANCELLED: { label: "Cancelled", tone: "urgent" }, DISPUTED: { label: "Disputed", tone: "urgent" },
};
const TIMELINE = ["REQUESTED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "WAITING_CUSTOMER", "COMPLETED"];
const ACTIVE_STATUSES = ["REQUESTED", "OFFERED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "PAUSED", "WAITING_CUSTOMER"];

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");
const initials = (name?: string) => (name ?? "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  page: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 110, maxWidth: 1180, width: "100%", alignSelf: "center" },
  logo: { flexDirection: "row", alignItems: "center", gap: 5 },
  logoText: { color: c.onSurface, fontSize: 24, fontWeight: "800", letterSpacing: -1.2 },
  logoX: { color: c.brandPrimary, fontSize: 25, fontWeight: "900" },
  eyebrow: { color: c.info, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase" },
  h1: { color: c.onSurface, fontSize: 29, lineHeight: 35, fontWeight: "800", letterSpacing: -0.8 },
  h2: { color: c.onSurface, fontSize: 20, lineHeight: 26, fontWeight: "800" },
  h3: { color: c.onSurface, fontSize: 15, fontWeight: "800" },
  body: { color: c.onSurfaceSecondary, fontSize: 14, lineHeight: 21 },
  muted: { color: c.muted, fontSize: 13, lineHeight: 19 },
  tiny: { color: c.muted, fontSize: 11, lineHeight: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, marginBottom: 14 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  card: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, shadowColor: c.brand, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  cardGap: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center" }, rowWrap: { flexDirection: "row", flexWrap: "wrap" },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  gap8: { gap: 8 }, gap12: { gap: 12 }, gap16: { gap: 16 },
  button: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.brandPrimary, flexDirection: "row", gap: 8 },
  buttonText: { color: c.onBrandPrimary, fontSize: 14, fontWeight: "800" },
  secondaryButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderStrong, flexDirection: "row", gap: 8 },
  secondaryText: { color: c.brandPrimary, fontSize: 14, fontWeight: "800" },
  dangerText: { color: c.error, fontSize: 14, fontWeight: "800" },
  textButtonText: { color: c.info, fontSize: 13, fontWeight: "800" },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: c.brandTertiary, alignSelf: "flex-start" },
  badgeText: { color: c.onBrandTertiary, fontSize: 11, fontWeight: "800" },
  urgent: { backgroundColor: "#FFF0EF" }, urgentText: { color: c.error },
  success: { backgroundColor: "#E7F7F0" }, successText: { color: c.success },
  warning: { backgroundColor: "#FFF6E3" }, warningText: { color: c.warning },
  inputLabel: { color: c.onSurfaceSecondary, fontSize: 12, fontWeight: "800", marginBottom: 7 },
  input: { minHeight: 48, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 11, paddingHorizontal: 14, color: c.onSurface, fontSize: 14 },
  field: { gap: 6 },
  divider: { height: 1, backgroundColor: c.divider },
  stat: { flex: 1, minWidth: 95, gap: 5 },
  statValue: { color: c.onSurface, fontSize: 21, fontWeight: "800" },
  statLabel: { color: c.muted, fontSize: 11, fontWeight: "700" },
  chip: { borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border, marginRight: 7, marginBottom: 7, flexShrink: 0 },
  chipSelected: { backgroundColor: c.brandTertiary, borderColor: c.brandPrimary },
  chipText: { color: c.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  chipSelectedText: { color: c.brandPrimary },
  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: c.surfaceSecondary, borderTopWidth: 1, borderColor: c.border, flexDirection: "row", justifyContent: "space-around", paddingTop: 9 },
  navItem: { minWidth: 56, minHeight: 54, alignItems: "center", gap: 3 }, navText: { color: c.muted, fontSize: 10, fontWeight: "700" }, navActive: { color: c.brandPrimary },
  sidebar: { width: 238, backgroundColor: c.surfaceSecondary, borderRightWidth: 1, borderColor: c.border, padding: 22, gap: 16 },
  sideItem: { minHeight: 46, borderRadius: 11, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 12 }, sideItemActive: { backgroundColor: c.brandTertiary }, sideText: { color: c.onSurfaceSecondary, fontSize: 13, fontWeight: "700" }, sideTextActive: { color: c.brandPrimary },
  hero: { borderRadius: 22, overflow: "hidden", padding: 22, minHeight: 240, justifyContent: "space-between" }, heroTitle: { color: "#FFFFFF", fontSize: 30, lineHeight: 36, fontWeight: "800", maxWidth: 300 }, heroText: { color: "#D4E6FB", fontSize: 14, lineHeight: 21, maxWidth: 300 },
  illustration: { position: "absolute", right: 8, bottom: 14, width: 125, height: 150, borderRadius: 70, backgroundColor: "#174D85", opacity: 0.9, alignItems: "center", justifyContent: "center" },
  map: { height: 160, borderRadius: 14, overflow: "hidden", backgroundColor: "#DDEBF2", borderWidth: 1, borderColor: c.border, justifyContent: "center", alignItems: "center" },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: c.brandPrimary, fontSize: 17, fontWeight: "800" },
  progressTrack: { height: 8, borderRadius: 5, backgroundColor: c.surfaceTertiary, overflow: "hidden" }, progressFill: { height: "100%", borderRadius: 5, backgroundColor: c.brandPrimary },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(11,31,58,0.48)", justifyContent: "flex-end" }, modalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: "88%" },
  toast: { position: "absolute", left: 20, right: 20, bottom: 86, backgroundColor: c.surfaceInverse, borderRadius: 12, padding: 14 }, toastText: { color: c.onSurfaceInverse, textAlign: "center", fontSize: 13, fontWeight: "700" },
  stepDot: { height: 6, borderRadius: 3, backgroundColor: c.border, flex: 1 },
  stepDotActive: { backgroundColor: c.brandPrimary },
  photo: { width: 76, height: 64, borderRadius: 10, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  listRow: { paddingVertical: 13, gap: 10 },
}));

function Icon({ name, color, size = 20 }: { name: IconName; color?: string; size?: number }) {
  const { colors } = useTheme();
  return <Ionicons name={name} color={color ?? colors.onSurfaceSecondary} size={size} />;
}

function Logo() { const s = useStyles(); return <View style={s.logo}><Text style={s.logoText}>Shed</Text><Text style={s.logoX}>X</Text></View>; }

function Button({ title, onPress, secondary = false, danger = false, icon, disabled = false, loading = false, testID }: { title: string; onPress: () => void; secondary?: boolean; danger?: boolean; icon?: IconName; disabled?: boolean; loading?: boolean; testID?: string }) {
  const s = useStyles();
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={title} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [secondary ? s.secondaryButton : s.button, pressed && { opacity: 0.78, transform: [{ scale: 0.98 }] }, (disabled || loading) && { opacity: 0.45 }]}>
    {loading ? <ActivityIndicator color={secondary ? "#0B63CE" : "#FFFFFF"} size="small" /> : <>{icon ? <Icon name={icon} color={secondary ? (danger ? "#C94A4A" : undefined) : "#FFFFFF"} size={17} /> : null}<Text style={secondary ? (danger ? s.dangerText : s.secondaryText) : s.buttonText}>{title}</Text></>}
  </Pressable>;
}

function Badge({ text, tone = "default" }: { text: string; tone?: "default" | "urgent" | "success" | "warning" }) { const s = useStyles(); return <View style={[s.badge, tone === "urgent" && s.urgent, tone === "success" && s.success, tone === "warning" && s.warning]}><Text style={[s.badgeText, tone === "urgent" && s.urgentText, tone === "success" && s.successText, tone === "warning" && s.warningText]}>{text}</Text></View>; }
function StatusBadge({ status }: { status: string }) { const meta = STATUS_META[status] ?? { label: status, tone: "default" as const }; return <Badge text={meta.label} tone={meta.tone} />; }

function Field({ label, value, onChangeText, placeholder, secureTextEntry = false, multiline = false, testID }: { label: string; value: string; onChangeText?: (v: string) => void; placeholder?: string; secureTextEntry?: boolean; multiline?: boolean; testID?: string }) {
  const s = useStyles(); const [focused, setFocused] = useState(false);
  return <View style={s.field}><Text style={s.inputLabel}>{label}</Text><TextInput testID={testID} accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8AA0B5" secureTextEntry={secureTextEntry} multiline={multiline} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[s.input, focused && { borderColor: "#0B63CE" }, multiline && { minHeight: 92, paddingTop: 12, textAlignVertical: "top" }]} /></View>;
}

function Header({ title, subtitle, onBack, onBell, unread = 0 }: { title: string; subtitle?: string; onBack?: () => void; onBell?: () => void; unread?: number }) {
  const s = useStyles();
  return <View style={s.header}><View style={s.headerLeft}>{onBack ? <Pressable testID="header-back" accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={s.iconButton}><Icon name="arrow-back" /></Pressable> : null}<View><Text style={s.h2}>{title}</Text>{subtitle ? <Text style={s.tiny}>{subtitle}</Text> : null}</View></View>{onBell ? <Pressable testID="header-notifications" accessibilityRole="button" accessibilityLabel="Notifications" onPress={onBell} style={s.iconButton}><Icon name="notifications-outline" />{unread > 0 ? <View style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: "#C94A4A" }} /> : null}</Pressable> : null}</View>;
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) { const s = useStyles(); return <View style={[s.between, { marginTop: 20, marginBottom: 10 }]}><Text style={s.h3}>{title}</Text>{action ? <Pressable onPress={onAction} style={{ minHeight: 44, justifyContent: "center" }}><Text style={s.textButtonText}>{action}</Text></Pressable> : null}</View>; }

function Card({ children, style }: { children: React.ReactNode; style?: any }) { const s = useStyles(); return <View style={[s.card, style]}>{children}</View>; }

function MapCard({ label, latitude, longitude }: { label: string; latitude?: number | null; longitude?: number | null }) {
  const s = useStyles();
  const source = latitude != null && longitude != null ? mapService.staticMap(Number(latitude), Number(longitude)) : "";
  return <View style={s.map}>{source ? <Image source={{ uri: source }} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" /> : null}
    {source ? <><View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#0B63CE", borderWidth: 4, borderColor: "#FFFFFF" }} /><View style={{ position: "absolute", bottom: 10, left: 12, right: 12, backgroundColor: "rgba(255,255,255,.92)", padding: 9, borderRadius: 9 }}><Text style={s.tiny} numberOfLines={1}>{label}</Text></View><Text style={{ position: "absolute", right: 8, top: 8, color: "#17344F", backgroundColor: "rgba(255,255,255,.9)", fontSize: 9, padding: 4 }}>© MapTiler © OpenStreetMap</Text></> : <View style={{ alignItems: "center", gap: 7, padding: 12 }}><Icon name="map-outline" color="#58708C" size={26} /><Text style={s.h3}>{latitude == null ? "No coordinates for this site" : "Map unavailable"}</Text><Text style={[s.tiny, { textAlign: "center" }]}>{latitude == null ? "Add a location with the address search." : "Add EXPO_PUBLIC_MAPTILER_API_KEY to enable maps."}</Text></View>}
  </View>;
}

function Progress({ value }: { value: number }) { const s = useStyles(); return <View style={s.progressTrack}><View style={[s.progressFill, { width: `${Math.min(100, Math.max(0, value))}%` }]} /></View>; }

function Stars({ value, onChange, size = 28 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return <View style={{ flexDirection: "row" }}>{[1, 2, 3, 4, 5].map((x) => <Pressable key={x} testID={`star-${x}`} disabled={!onChange} onPress={() => onChange?.(x)} style={{ padding: 4, minWidth: 36, minHeight: 36 }}><Icon name={x <= value ? "star" : "star-outline"} size={size} color="#E5A523" /></Pressable>)}</View>;
}

function Empty({ icon, title, text, action, onAction, testID }: { icon: IconName; title: string; text: string; action?: string; onAction?: () => void; testID?: string }) {
  const s = useStyles();
  return <Card style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}><View testID={testID} style={{ alignItems: "center", gap: 10 }}><Icon name={icon} size={30} color="#8AA0B5" /><Text style={s.h3}>{title}</Text><Text style={[s.muted, { textAlign: "center" }]}>{text}</Text>{action ? <Button title={action} onPress={onAction ?? (() => {})} /> : null}</View></Card>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const s = useStyles();
  return <Card style={{ alignItems: "center", gap: 10, paddingVertical: 24 }}><Icon name="cloud-offline-outline" size={28} color="#C8871A" /><Text style={s.h3}>Could not load</Text><Text style={[s.muted, { textAlign: "center" }]}>{message}</Text><Button title="Retry" secondary onPress={onRetry} /></Card>;
}

function ModalSheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) { const s = useStyles(); return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}><View style={s.modalBackdrop}><View style={s.modalSheet}><View style={[s.between, { marginBottom: 18 }]}><Text style={s.h2}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={s.iconButton}><Icon name="close" /></Pressable></View><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView></View></View></Modal>; }

const urlCache = new Map<string, string>();
function useFileUrl(path?: string | null): string {
  const [url, setUrl] = useState(path && (path.startsWith("http") || path.startsWith("blob") || path.startsWith("file")) ? path : "");
  useEffect(() => {
    let live = true;
    if (path && !url) {
      const cached = urlCache.get(path);
      if (cached) { setUrl(cached); return; }
      storageService.fileUrl(path).then((u) => { urlCache.set(path, u); if (live) setUrl(u); }).catch(() => {});
    }
    return () => { live = false; };
  }, [path]);
  return url;
}

function Photo({ path, style, onPress }: { path?: string | null; style?: any; onPress?: () => void }) {
  const url = useFileUrl(path);
  const inner = url ? <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Icon name="image-outline" color="#8AA0B5" /></View>;
  return <Pressable testID="photo-thumb" disabled={!onPress} onPress={onPress} style={style}>{inner}</Pressable>;
}

async function pickImage(source: "camera" | "gallery"): Promise<ImagePicker.ImagePickerAsset | null> {
  const current = source === "camera" ? await ImagePicker.getCameraPermissionsAsync() : await ImagePicker.getMediaLibraryPermissionsAsync();
  let granted = current.granted; let canAsk = current.canAskAgain;
  if (!granted && canAsk) {
    const result = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    granted = result.granted; canAsk = result.canAskAgain;
  }
  if (!granted) {
    Alert.alert("Permission needed", "ShedX uses photos to document the issue for your service professional.", canAsk ? [{ text: "OK" }] : [{ text: "Cancel" }, { text: "Open Settings", onPress: () => Linking.openSettings() }]);
    return null;
  }
  const result = source === "camera"
    ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
  return result.canceled ? null : result.assets[0];
}

function Welcome({ go }: { go: (s: Screen) => void }) {
  const s = useStyles(); const router = useRouter();
  return <ScrollView contentContainerStyle={[s.content, { flexGrow: 1, justifyContent: "center" }]}>
    <View style={{ alignItems: "center", marginBottom: 25 }}><Logo /><Text style={[s.muted, { marginTop: 4 }]}>CUSTOMER PORTAL</Text></View>
    <LinearGradient colors={["#0B1F3A", "#0E4D85"]} style={s.hero}><View style={{ gap: 12, zIndex: 1 }}><Text style={s.eyebrow}>SHEDX AFTER-SALES SERVICE</Text><Text style={s.heroTitle}>Expert care for every structure.</Text><Text style={s.heroText}>Book trusted PEB service professionals for repairs, inspections and maintenance at your sites.</Text></View><View style={s.illustration}><Icon name="business" size={52} color="#A9D6FF" /><Icon name="shield-checkmark" size={28} color="#FFFFFF" /></View></LinearGradient>
    <View style={{ gap: 10, marginTop: 24 }}><Button testID="welcome-get-started" title="Get Started" icon="arrow-forward" onPress={() => go("register")} /><Button testID="welcome-sign-in" title="Sign In" secondary onPress={() => go("login")} /></View>
    <Pressable testID="welcome-worker-link" accessibilityRole="button" onPress={() => router.push("/")} style={{ alignItems: "center", marginTop: 24, minHeight: 44, justifyContent: "center" }}><Text style={s.muted}>Are you a service professional? <Text style={s.textButtonText}>Open Worker Portal</Text></Text></Pressable>
  </ScrollView>;
}

function Login({ go, onSignedIn }: { go: (s: Screen) => void; onSignedIn: () => Promise<void> }) {
  const s = useStyles(); const router = useRouter();
  const [mobile, setMobile] = useState("9825044321"); const [password, setPassword] = useState("demo123");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [showRecovery, setShowRecovery] = useState(false);
  const submit = async () => {
    setError("");
    if (mobile.replace(/\D/g, "").length < 10 || !password) { setError("Enter your registered mobile number and password."); return; }
    setBusy(true);
    try {
      const result = await authService.login(mobile.replace(/\D/g, ""), password) as any;
      if (result?.user?.role === "WORKER") { router.replace("/"); return; }
      await onSignedIn();
    } catch (e: any) { setError(e?.message ?? "Sign in failed. Please try again."); } finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : "height"}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Header title="Welcome back" subtitle="Sign in to your customer account" onBack={() => go("welcome")} />
    <View style={[s.card, { marginTop: 25, gap: 18 }]}><Logo /><Text style={s.h1}>Your sites, serviced right.</Text><Text style={s.body}>Book service, track your professional and confirm completed work.</Text>
      <Field testID="login-mobile" label="Mobile Number" value={mobile} onChangeText={setMobile} placeholder="Enter mobile number" />
      <Field testID="login-password" label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Enter password" />
      <Pressable testID="login-forgot" onPress={() => setShowRecovery(true)} style={{ minHeight: 32, justifyContent: "center" }}><Text style={s.textButtonText}>Forgot password?</Text></Pressable>
      {error ? <Text testID="login-error" style={{ color: "#C94A4A", fontSize: 13 }}>{error}</Text> : null}
      <Button testID="login-submit" title="Login" onPress={submit} loading={busy} />
      <Text style={[s.muted, { textAlign: "center" }]}>New to ShedX? <Text testID="login-create-account" onPress={() => go("register")} style={s.textButtonText}>Create account</Text></Text>
    </View></ScrollView>
    <ModalSheet visible={showRecovery} title="Recover your account" onClose={() => setShowRecovery(false)}><View style={s.gap16}><Text style={s.body}>Enter your registered mobile number. We&apos;ll send a secure recovery link.</Text><Field label="Mobile Number" value={mobile} onChangeText={setMobile} /><Button testID="recovery-send" title="Send recovery link" onPress={() => { authService.forgotPassword(mobile.replace(/\D/g, "")).catch(() => {}); setShowRecovery(false); }} /></View></ModalSheet>
  </KeyboardAvoidingView>;
}

function Register({ go, onRegistered }: { go: (s: Screen) => void; onRegistered: () => Promise<void> }) {
  const s = useStyles();
  const [name, setName] = useState(""); const [mobile, setMobile] = useState(""); const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [terms, setTerms] = useState(false);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setError("");
    if (name.trim().length < 2 || mobile.replace(/\D/g, "").length < 10 || password.length < 6) { setError("Please complete every field (password min 6 characters)."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (!terms) { setError("Please accept the Terms & Conditions."); return; }
    setBusy(true);
    try {
      await authService.register({ full_name: name.trim(), phone: mobile.replace(/\D/g, ""), email: email.trim() || undefined, password, role: "CUSTOMER" });
      await onRegistered();
    } catch (e: any) { setError(e?.message ?? "Registration failed. Please try again."); } finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : "height"}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Header title="Create your account" subtitle="Book PEB service for your sites" onBack={() => go("welcome")} />
    <View style={s.gap16}>
      <Field testID="register-name" label="Full Name" value={name} onChangeText={setName} placeholder="Enter your full name" />
      <Field testID="register-mobile" label="Mobile Number" value={mobile} onChangeText={setMobile} placeholder="+91 98765 43210" />
      <Field testID="register-email" label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
      <Field testID="register-password" label="Create Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Minimum 6 characters" />
      <Field testID="register-confirm" label="Confirm Password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat password" />
      <Pressable testID="register-terms" onPress={() => setTerms(!terms)} style={[s.row, { gap: 10, minHeight: 44 }]}><Icon name={terms ? "checkbox" : "square-outline"} color={terms ? "#0B63CE" : undefined} /><Text style={s.muted}>I agree to ShedX <Text style={s.textButtonText}>Terms & Conditions</Text></Text></Pressable>
      {error ? <Text testID="register-error" style={{ color: "#C94A4A", fontSize: 13 }}>{error}</Text> : null}
      <Button testID="register-submit" title="Register" onPress={submit} loading={busy} />
      <Pressable onPress={() => go("login")} style={{ alignItems: "center", minHeight: 44, justifyContent: "center" }}><Text style={s.muted}>Already registered? <Text style={s.textButtonText}>Sign in</Text></Text></Pressable>
    </View></ScrollView></KeyboardAvoidingView>;
}

function Setup({ go, profile, onSaved }: { go: (s: Screen) => void; profile: any; onSaved: (p: any) => void }) {
  const s = useStyles();
  const [company, setCompany] = useState(profile?.company_name ?? ""); const [contact, setContact] = useState(profile?.contact_person ?? profile?.full_name ?? "");
  const [comm, setComm] = useState(profile?.preferred_communication ?? "CALL"); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const save = async () => {
    setBusy(true); setError("");
    try { const saved = await customerService.updateProfile({ company_name: company || undefined, contact_person: contact || undefined, preferred_communication: comm }); onSaved(saved); go("home"); }
    catch (e: any) { setError(e?.message ?? "Could not save profile."); } finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : "height"}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Header title="Your profile" subtitle="Tell us where to send professionals" />
    <Card style={s.cardGap}>
      <View style={[s.row, { gap: 14 }]}><View style={s.avatar}><Text style={s.avatarText}>{initials(profile?.full_name)}</Text></View><View style={{ flex: 1 }}><Text style={s.h3}>{profile?.full_name}</Text><Text style={s.muted}>{profile?.phone}{profile?.email ? ` · ${profile.email}` : ""}</Text></View></View>
      <View style={s.divider} />
      <Field testID="setup-company" label="Company name (optional)" value={company} onChangeText={setCompany} placeholder="e.g. ABC Manufacturing" />
      <Field testID="setup-contact" label="Contact person" value={contact} onChangeText={setContact} placeholder="Who should professionals ask for?" />
      <Text style={s.inputLabel}>Preferred communication</Text>
      <View style={s.rowWrap}>{[["CALL", "Call"], ["WHATSAPP", "WhatsApp"], ["EMAIL", "Email"]].map(([v, label]) => <Pressable key={v} testID={`setup-comm-${v.toLowerCase()}`} onPress={() => setComm(v)} style={[s.chip, comm === v && s.chipSelected]}><Text style={[s.chipText, comm === v && s.chipSelectedText]}>{label}</Text></Pressable>)}</View>
      {error ? <Text style={{ color: "#C94A4A", fontSize: 13 }}>{error}</Text> : null}
      <Button testID="setup-save" title="Save & Continue" icon="arrow-forward" onPress={save} loading={busy} />
    </Card></ScrollView></KeyboardAvoidingView>;
}

function Home({ go, profile, unread, onSelectJob }: { go: (s: Screen, service?: string) => void; profile: any; unread: number; onSelectJob: (id: string) => void }) {
  const s = useStyles();
  const [jobs, setJobs] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(() => { setLoading(true); setError(""); customerService.jobs("ACTIVE", "", 5, 0).then((r) => setJobs(r.items)).catch((e) => setError(e?.message ?? "Could not load requests.")).finally(() => setLoading(false)); }, []);
  useEffect(load, [load]);
  const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  return <ScrollView contentContainerStyle={s.content}>
    <View style={s.header}><View><Logo /><Text style={s.tiny}>CUSTOMER PORTAL</Text></View><View style={[s.row, s.gap8]}><Pressable testID="home-notifications" accessibilityRole="button" accessibilityLabel="Notifications" style={s.iconButton} onPress={() => go("notifications")}><Icon name="notifications-outline" />{unread > 0 ? <View style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: "#C94A4A" }} /> : null}</Pressable><Pressable testID="home-profile" accessibilityRole="button" accessibilityLabel="Profile" style={s.avatar} onPress={() => go("profile")}><Text style={s.avatarText}>{initials(profile?.full_name)}</Text></Pressable></View></View>
    <Text style={s.h1}>Hello, {(profile?.full_name ?? "there").split(" ")[0]}</Text>
    <Text style={[s.body, { marginTop: 4 }]}>{profile?.company_name ? `${profile.company_name} · ` : ""}Keep your structures in top shape.</Text>
    <Card style={{ marginTop: 18, backgroundColor: "#0B1F3A", borderColor: "#0B1F3A", gap: 10 }}>
      <Text style={{ color: "#A9D6FF", fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>NEED A REPAIR?</Text>
      <Text style={{ color: "#FFFFFF", fontSize: 21, fontWeight: "800" }}>Book a PEB service professional</Text>
      <Text style={{ color: "#C5D7EA", fontSize: 13 }}>Describe the issue, pick your site, and track the work live.</Text>
      <Button testID="home-create-request" title="Create Service Request" icon="add" onPress={() => go("create")} />
    </Card>
    <SectionTitle title="Active requests" action="View all" onAction={() => go("requests")} />
    {loading ? <Card style={{ alignItems: "center", paddingVertical: 24 }}><ActivityIndicator color="#0B63CE" /></Card>
      : error ? <ErrorState message={error} onRetry={load} />
      : active.length === 0 ? <Empty testID="home-no-active" icon="briefcase-outline" title="No active service requests" text="Create a request and we'll match a professional near your site." action="Create request" onAction={() => go("create")} />
      : <View style={s.gap12}>{active.slice(0, 3).map((job) => <Pressable key={job.id} testID={`home-job-${job.job_number}`} onPress={() => onSelectJob(job.id)}><Card style={s.cardGap}><View style={s.between}><View style={{ flex: 1, paddingRight: 8 }}><Text style={s.h3}>{job.title}</Text><Text style={s.muted}>{job.service_type} · {job.site_name_ref ?? job.site_name}</Text></View><StatusBadge status={job.status} /></View>{job.worker_name ? <View style={s.row}><Icon name="person-circle-outline" size={16} color="#0B63CE" /><Text style={s.muted}>  {job.worker_name}</Text></View> : null}</Card></Pressable>)}</View>}
    <SectionTitle title="Book by service" />
    <View style={s.rowWrap}>{SERVICES.slice(0, 6).map((service, i) => <Pressable key={service} testID={`home-service-${i}`} onPress={() => go("create", service)} style={[s.card, { width: "47%", marginBottom: 10, gap: 8 }]}><Icon name={["home-outline", "grid-outline", "business-outline", "water-outline", "construct-outline", "layers-outline"][i] as IconName} color="#0B63CE" /><Text style={s.h3}>{service}</Text><Text style={s.tiny}>Book a professional</Text></Pressable>)}</View>
  </ScrollView>;
}

type SiteForm = { site_name: string; address_line: string; city: string; state: string; postal_code: string; contact_name: string; contact_phone: string; notes: string; latitude?: number; longitude?: number };
const emptySite: SiteForm = { site_name: "", address_line: "", city: "", state: "", postal_code: "", contact_name: "", contact_phone: "", notes: "" };

function SiteEditor({ initial, onClose, onSaved }: { initial: (SiteForm & { id?: string }) | null; onClose: () => void; onSaved: () => void }) {
  const s = useStyles();
  const [form, setForm] = useState<SiteForm>(initial ?? emptySite);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [searching, setSearching] = useState(false); const [results, setResults] = useState<any[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const set = (key: keyof SiteForm) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const searchAddress = (q: string) => {
    setForm((f) => ({ ...f, address_line: q }));
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!mapService.configured || q.trim().length < 3) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try { const res = await mapService.geocode(q.trim()) as any; setResults((res?.features ?? []).slice(0, 4)); } catch { setResults([]); } finally { setSearching(false); }
    }, 500);
  };
  const pickResult = (feature: any) => {
    const [lng, lat] = feature.center ?? [];
    const parts = String(feature.place_name ?? "").split(",").map((x: string) => x.trim());
    setForm((f) => ({ ...f, address_line: feature.place_name ?? f.address_line, city: f.city || parts[parts.length - 3] || f.city, state: f.state || parts[parts.length - 2] || f.state, latitude: lat, longitude: lng }));
    setResults([]);
  };
  const save = async () => {
    setError("");
    if (form.site_name.trim().length < 2) { setError("Site name is required."); return; }
    setBusy(true);
    try {
      const payload = { ...form, site_name: form.site_name.trim(), address_line: form.address_line || undefined, city: form.city || undefined, state: form.state || undefined, postal_code: form.postal_code || undefined, contact_name: form.contact_name || undefined, contact_phone: form.contact_phone || undefined, notes: form.notes || undefined };
      if (initial?.id) await customerService.updateSite(initial.id, payload); else await customerService.createSite(payload);
      onSaved(); onClose();
    } catch (e: any) { setError(e?.message ?? "Could not save site."); } finally { setBusy(false); }
  };
  return <ModalSheet visible title={initial?.id ? "Edit site" : "Add service site"} onClose={onClose}><View style={s.gap16}>
    <Field testID="site-name" label="Site name" value={form.site_name} onChangeText={set("site_name")} placeholder="e.g. ABC Manufacturing Plant" />
    <Field testID="site-address" label="Address" value={form.address_line} onChangeText={searchAddress} placeholder="Search address or area" />
    {searching ? <Text style={s.tiny}>Searching addresses…</Text> : null}
    {results.map((r, i) => <Pressable key={r.id ?? i} testID={`site-address-result-${i}`} onPress={() => pickResult(r)} style={[s.row, { minHeight: 44, gap: 8 }]}><Icon name="location-outline" size={16} color="#0B63CE" /><Text style={[s.muted, { flex: 1 }]} numberOfLines={2}>{r.place_name}</Text></Pressable>)}
    {form.latitude != null && form.longitude != null ? <MapCard label={form.address_line || form.site_name} latitude={form.latitude} longitude={form.longitude} /> : null}
    <View style={[s.row, s.gap8]}><View style={{ flex: 1 }}><Field testID="site-city" label="City" value={form.city} onChangeText={set("city")} /></View><View style={{ flex: 1 }}><Field testID="site-state" label="State" value={form.state} onChangeText={set("state")} /></View></View>
    <Field testID="site-postal" label="Postal code" value={form.postal_code} onChangeText={set("postal_code")} placeholder="382110" />
    <View style={[s.row, s.gap8]}><View style={{ flex: 1 }}><Field testID="site-contact-name" label="Contact name" value={form.contact_name} onChangeText={set("contact_name")} /></View><View style={{ flex: 1 }}><Field testID="site-contact-phone" label="Contact phone" value={form.contact_phone} onChangeText={set("contact_phone")} /></View></View>
    <Field testID="site-notes" label="Access notes (optional)" value={form.notes} onChangeText={set("notes")} multiline placeholder="Gate, parking or safety instructions" />
    {error ? <Text testID="site-error" style={{ color: "#C94A4A", fontSize: 13 }}>{error}</Text> : null}
    <Button testID="site-save" title="Save site" onPress={save} loading={busy} />
  </View></ModalSheet>;
}

function Sites({ go }: { go: (s: Screen) => void }) {
  const s = useStyles();
  const [sites, setSites] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [editor, setEditor] = useState<(SiteForm & { id?: string }) | null | "new">(null);
  const load = useCallback(() => { setLoading(true); setError(""); customerService.sites().then(setSites).catch((e) => setError(e?.message ?? "Could not load sites.")).finally(() => setLoading(false)); }, []);
  useEffect(load, [load]);
  const remove = (site: any) => Alert.alert("Remove site?", `${site.site_name} will no longer be available for new requests.`, [{ text: "Cancel" }, { text: "Remove", style: "destructive", onPress: async () => { try { await customerService.deleteSite(site.id); load(); } catch { Alert.alert("Could not remove", "Please try again."); } } }]);
  return <ScrollView contentContainerStyle={s.content}>
    <Header title="Service sites" subtitle="Locations professionals can visit" onBack={() => go("profile")} />
    <View style={{ marginBottom: 14 }}><Button testID="sites-add" title="Add site" icon="add" onPress={() => setEditor("new")} /></View>
    {loading ? <Card style={{ alignItems: "center", paddingVertical: 24 }}><ActivityIndicator color="#0B63CE" /></Card>
      : error ? <ErrorState message={error} onRetry={load} />
      : sites.length === 0 ? <Empty testID="sites-empty" icon="business-outline" title="No service sites yet" text="Add a service site to request maintenance." action="Add site" onAction={() => setEditor("new")} />
      : <View style={s.gap12}>{sites.map((site) => <Card key={site.id} style={s.cardGap}><View style={s.between}><View style={{ flex: 1, paddingRight: 8 }}><Text style={s.h3}>{site.site_name}</Text><Text style={s.muted}>{[site.address_line, site.city, site.state, site.postal_code].filter(Boolean).join(", ")}</Text>{site.contact_name ? <Text style={s.tiny}>{site.contact_name}{site.contact_phone ? ` · ${site.contact_phone}` : ""}</Text> : null}</View></View><View style={[s.row, s.gap8]}><Button testID={`site-edit-${site.id}`} title="Edit" secondary icon="create-outline" onPress={() => setEditor({ id: site.id, site_name: site.site_name, address_line: site.address_line ?? "", city: site.city ?? "", state: site.state ?? "", postal_code: site.postal_code ?? "", contact_name: site.contact_name ?? "", contact_phone: site.contact_phone ?? "", notes: site.notes ?? "", latitude: site.latitude != null ? Number(site.latitude) : undefined, longitude: site.longitude != null ? Number(site.longitude) : undefined })} /><Button testID={`site-delete-${site.id}`} title="Remove" secondary danger icon="trash-outline" onPress={() => remove(site)} /></View></Card>)}</View>}
    {editor ? <SiteEditor initial={editor === "new" ? null : editor} onClose={() => setEditor(null)} onSaved={load} /> : null}
  </ScrollView>;
}

type WizardPhoto = { uri: string; path?: string; url?: string; uploading: boolean; error?: boolean };
const WIZARD_STEPS = ["Service", "Site", "Details", "Photos", "Schedule", "Review"];

function CreateRequest({ go, sites, preselect, onCreated }: { go: (s: Screen) => void; sites: any[]; preselect?: string; onCreated: (jobId: string) => void }) {
  const s = useStyles();
  const [step, setStep] = useState(0);
  const [service, setService] = useState(preselect ?? "");
  const [siteId, setSiteId] = useState("");
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [photos, setPhotos] = useState<WizardPhoto[]>([]);
  const [date, setDate] = useState(""); const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const site = sites.find((x) => x.id === siteId);
  const canNext = step === 0 ? !!service : step === 1 ? !!siteId : step === 2 ? title.trim().length >= 3 : step === 3 ? photos.every((p) => !p.uploading) : true;
  const addPhoto = async (source: "camera" | "gallery") => {
    const asset = await pickImage(source);
    if (!asset) return;
    const entry: WizardPhoto = { uri: asset.uri, uploading: true };
    setPhotos((p) => [...p, entry]);
    try {
      const uploaded = await storageService.upload(asset.uri, asset.fileName ?? "photo.jpg", asset.mimeType ?? "image/jpeg");
      setPhotos((p) => p.map((x) => (x.uri === asset.uri ? { ...x, path: uploaded.path, url: uploaded.url, uploading: false } : x)));
    } catch { setPhotos((p) => p.map((x) => (x.uri === asset.uri ? { ...x, uploading: false, error: true } : x))); }
  };
  const submit = async () => {
    setBusy(true); setError("");
    let scheduledAt: string | undefined;
    if (date.trim()) { const parsed = new Date(`${date.trim()}T${slot ? slot.split("–")[0].trim() : "09:00"}:00`); if (!isNaN(parsed.getTime())) scheduledAt = parsed.toISOString(); }
    try {
      const result = await customerService.createJob({ service_type: service, site_id: siteId, title: title.trim(), problem_description: description || undefined, notes: notes || undefined, priority, scheduled_at: scheduledAt, photo_urls: photos.filter((p) => p.path).map((p) => p.path) });
      onCreated(result.job.id);
    } catch (e: any) { setError(e?.message ?? "Could not submit request."); setBusy(false); }
  };
  return <View style={s.page}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Header title="New service request" subtitle={`Step ${step + 1} of 6 · ${WIZARD_STEPS[step]}`} onBack={() => (step === 0 ? go("home") : setStep(step - 1))} />
    <View style={[s.row, { gap: 5, marginBottom: 18 }]}>{WIZARD_STEPS.map((_, i) => <View key={i} style={[s.stepDot, i <= step && s.stepDotActive]} />)}</View>
    {step === 0 ? <View style={s.gap12}><Text style={s.h2}>What do you need help with?</Text><View style={s.rowWrap}>{SERVICES.map((x) => <Pressable key={x} testID={`wizard-service-${x.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`} onPress={() => setService(x)} style={[s.chip, service === x && s.chipSelected]}><Text style={[s.chipText, service === x && s.chipSelectedText]}>{x}</Text></Pressable>)}</View></View> : null}
    {step === 1 ? <View style={s.gap12}><Text style={s.h2}>Which site needs service?</Text>
      {sites.length === 0 ? <Empty testID="wizard-no-sites" icon="business-outline" title="No service sites yet" text="Add a service site to request maintenance." action="Add site" onAction={() => go("sites")} />
        : sites.map((x) => <Pressable key={x.id} testID={`wizard-site-${x.id}`} onPress={() => setSiteId(x.id)}><Card style={[s.cardGap, siteId === x.id && { borderColor: "#0B63CE", borderWidth: 2 }]}><View style={s.between}><View style={{ flex: 1 }}><Text style={s.h3}>{x.site_name}</Text><Text style={s.muted}>{[x.address_line, x.city].filter(Boolean).join(", ")}</Text></View><Icon name={siteId === x.id ? "radio-button-on" : "radio-button-off"} color={siteId === x.id ? "#0B63CE" : undefined} /></View></Card></Pressable>)}
      <Button testID="wizard-manage-sites" title="Manage sites" secondary icon="settings-outline" onPress={() => go("sites")} />
    </View> : null}
    {step === 2 ? <View style={s.gap16}><Text style={s.h2}>Describe the problem</Text>
      <Field testID="wizard-title" label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Roof leak above bay 3" />
      <Field testID="wizard-description" label="Problem description" value={description} onChangeText={setDescription} multiline placeholder="What happened? Since when? Any safety concerns?" />
      <Field testID="wizard-notes" label="Notes for the professional (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Access instructions, preferred approach…" />
      <Text style={s.inputLabel}>Priority</Text>
      <View style={s.rowWrap}>{[["NORMAL", "Normal"], ["HIGH", "High"], ["URGENT", "Urgent"]].map(([v, label]) => <Pressable key={v} testID={`wizard-priority-${v.toLowerCase()}`} onPress={() => setPriority(v)} style={[s.chip, priority === v && s.chipSelected]}><Text style={[s.chipText, priority === v && s.chipSelectedText]}>{label}</Text></Pressable>)}</View>
    </View> : null}
    {step === 3 ? <View style={s.gap12}><Text style={s.h2}>Add photos</Text><Text style={s.body}>Photos help the professional arrive prepared. Optional but recommended.</Text>
      <View style={s.rowWrap}>
        {photos.map((p, i) => <View key={p.uri} style={[s.photo, { marginRight: 8, marginBottom: 8 }]}><Image source={{ uri: p.url ?? p.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />{p.uploading ? <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(11,31,58,.45)", alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#FFFFFF" size="small" /></View> : null}{p.error ? <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(201,74,74,.55)", alignItems: "center", justifyContent: "center" }}><Icon name="alert" color="#FFFFFF" size={18} /></View> : null}<Pressable testID={`wizard-photo-delete-${i}`} accessibilityLabel="Delete photo" onPress={() => setPhotos((x) => x.filter((y) => y.uri !== p.uri))} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(11,31,58,.8)", alignItems: "center", justifyContent: "center" }}><Icon name="close" color="#FFFFFF" size={13} /></Pressable></View>)}
        <Pressable testID="wizard-add-photo" onPress={() => Alert.alert("Add photo", "Choose a source", [{ text: "Camera", onPress: () => addPhoto("camera") }, { text: "Gallery", onPress: () => addPhoto("gallery") }, { text: "Cancel" }])} style={{ width: 76, height: 64, borderRadius: 10, borderWidth: 1, borderColor: "#AFC6DC", borderStyle: "dashed", alignItems: "center", justifyContent: "center" }}><Icon name="add" color="#0B63CE" /><Text style={s.tiny}>Add photo</Text></Pressable>
      </View>
    </View> : null}
    {step === 4 ? <View style={s.gap16}><Text style={s.h2}>Preferred date & time</Text>
      <Field testID="wizard-date" label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-09-12" />
      <Text style={s.inputLabel}>Time slot</Text>
      <View style={s.rowWrap}>{["09:00 – 12:00", "12:00 – 15:00", "15:00 – 18:00"].map((x) => <Pressable key={x} testID={`wizard-slot-${x.slice(0, 2)}`} onPress={() => setSlot(slot === x ? "" : x)} style={[s.chip, slot === x && s.chipSelected]}><Text style={[s.chipText, slot === x && s.chipSelectedText]}>{x}</Text></Pressable>)}</View>
      <Text style={s.muted}>Optional — leave empty for the earliest available slot.</Text>
    </View> : null}
    {step === 5 ? <View style={s.gap12}><Text style={s.h2}>Review your request</Text>
      <Card style={s.cardGap}>
        <View style={s.between}><Text style={s.muted}>Service</Text><Text style={s.h3}>{service}</Text></View><View style={s.divider} />
        <View style={s.between}><Text style={s.muted}>Site</Text><Text style={[s.h3, { flexShrink: 1, textAlign: "right" }]}>{site?.site_name}</Text></View><View style={s.divider} />
        <View style={s.between}><Text style={s.muted}>Priority</Text><Badge text={priority} tone={priority === "URGENT" ? "urgent" : priority === "HIGH" ? "warning" : "default"} /></View><View style={s.divider} />
        <Text style={s.muted}>Title</Text><Text style={s.h3}>{title}</Text>
        {description ? <><Text style={s.muted}>Problem</Text><Text style={s.body}>{description}</Text></> : null}
        {date ? <><View style={s.divider} /><View style={s.between}><Text style={s.muted}>Preferred</Text><Text style={s.body}>{date}{slot ? ` · ${slot}` : ""}</Text></View></> : null}
        {photos.filter((p) => p.path).length ? <><View style={s.divider} /><Text style={s.muted}>{photos.filter((p) => p.path).length} photo(s) attached</Text></> : null}
      </Card>
      {site ? <MapCard label={site.site_name} latitude={site.latitude} longitude={site.longitude} /> : null}
      {error ? <Text testID="wizard-error" style={{ color: "#C94A4A", fontSize: 13 }}>{error}</Text> : null}
    </View> : null}
  </ScrollView>
    <View style={{ padding: 20, paddingBottom: 28, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5EDF5" }}><View style={[s.row, s.gap8]}>
      {step > 0 ? <Button testID="wizard-back" title="Back" secondary onPress={() => setStep(step - 1)} /> : null}
      <View style={{ flex: 1 }}>{step < 5 ? <Button testID="wizard-next" title="Continue" icon="arrow-forward" disabled={!canNext} onPress={() => setStep(step + 1)} /> : <Button testID="wizard-submit" title="Submit Request" icon="checkmark" onPress={submit} loading={busy} />}</View>
    </View></View>
  </View>;
}

function Searching({ go, jobId }: { go: (s: Screen) => void; jobId: string }) {
  const s = useStyles();
  const [status, setStatus] = useState("REQUESTED"); const [job, setJob] = useState<any>(null); const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    const poll = async () => {
      try {
        const data = await customerService.jobStatus(jobId);
        if (!live) return;
        setStatus(data.status);
        if (data.status !== "REQUESTED" && data.status !== "OFFERED") go("request");
      } catch (e: any) { if (live) setError(e?.message ?? "Could not check status."); }
    };
    poll(); const timer = setInterval(poll, 15000);
    customerService.job(jobId).then(setJob).catch(() => {});
    return () => { live = false; clearInterval(timer); };
  }, [jobId]);
  const cancel = () => Alert.alert("Cancel request?", "You can create a new request anytime.", [{ text: "Keep" }, { text: "Cancel request", style: "destructive", onPress: async () => { try { await customerService.cancelJob(jobId); go("requests"); } catch (e: any) { Alert.alert("Could not cancel", e?.message ?? "Please try again."); } } }]);
  return <ScrollView contentContainerStyle={[s.content, { flexGrow: 1, justifyContent: "center" }]}>
    <View style={{ alignItems: "center", gap: 14 }}>
      <View style={[s.avatar, { width: 84, height: 84, borderRadius: 42, backgroundColor: "#EAF4FF" }]}><ActivityIndicator color="#0B63CE" size="large" /></View>
      <Text style={[s.h1, { textAlign: "center" }]}>Finding a service professional</Text>
      <Text style={[s.body, { textAlign: "center", maxWidth: 320 }]}>We&apos;re matching your request with online professionals near your site. This usually takes a few minutes.</Text>
    </View>
    {job ? <Card style={{ marginTop: 26, gap: 10 }}><View style={s.between}><Text style={s.h3}>{job.title}</Text><StatusBadge status={status} /></View><Text style={s.muted}>{job.service_type} · {job.site_name_ref ?? job.site_name}</Text><Text style={s.muted}>{fmt(job.scheduled_at) !== "—" ? `Preferred: ${fmt(job.scheduled_at)}` : "Earliest available slot"}</Text></Card> : null}
    {error ? <View style={{ marginTop: 14 }}><ErrorState message={error} onRetry={() => setError("")} /></View> : null}
    <View style={{ gap: 10, marginTop: 24 }}><Button testID="searching-view" title="View request" secondary onPress={() => go("request")} /><Button testID="searching-cancel" title="Cancel request" secondary danger onPress={cancel} /></View>
  </ScrollView>;
}

function Timeline({ status }: { status: string }) {
  const s = useStyles();
  const activeIndex = TIMELINE.indexOf(status === "OFFERED" ? "REQUESTED" : status);
  const labels = ["Requested", "Assigned", "En route", "Arrived", "In progress", "Confirm", "Completed"];
  return <View style={{ gap: 6 }}>{TIMELINE.map((step, i) => { const done = activeIndex >= 0 && i <= activeIndex; return <View key={step} style={s.row}><View style={{ alignItems: "center", width: 22 }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: done ? "#0B63CE" : "#DCE5EF", borderWidth: done ? 0 : 2, borderColor: "#AFC6DC" }} />{i < TIMELINE.length - 1 ? <View style={{ width: 2, height: 16, backgroundColor: done && i < activeIndex ? "#0B63CE" : "#DCE5EF" }} /> : null}</View><Text style={[s.muted, done && { color: "#0B1F3A", fontWeight: "700" }]}>{labels[i]}</Text></View>; })}</View>;
}

function RequestDetail({ go, jobId, onConfirm }: { go: (s: Screen) => void; jobId: string; onConfirm: () => void }) {
  const s = useStyles();
  const [job, setJob] = useState<any>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [viewer, setViewer] = useState<string | null>(null);
  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(""); }
    try { setJob(await customerService.job(jobId)); } catch (e: any) { if (!silent) setError(e?.message ?? "Could not load request."); } finally { setLoading(false); }
  }, [jobId]);
  useEffect(() => {
    load();
    const timer = setInterval(async () => {
      try { const status = await customerService.jobStatus(jobId); setJob((current: any) => { if (current && (status.status !== current.status || status.progress?.progress_percent !== current.progress?.progress_percent)) { load(true); } return current; }); } catch { /* keep last known state */ }
    }, 20000);
    return () => clearInterval(timer);
  }, [load, jobId]);
  if (loading) return <View style={[s.page, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color="#0B63CE" size="large" /></View>;
  if (error || !job) return <ScrollView contentContainerStyle={s.content}><Header title="Request" onBack={() => go("requests")} /><ErrorState message={error || "Request not found."} onRetry={() => load()} /></ScrollView>;
  const photos = [...(job.attachments ?? []).map((p: any) => ({ ...p, group: "Problem" })), ...(job.photos ?? [])];
  const progress = job.progress?.progress_percent ?? 0;
  return <ScrollView contentContainerStyle={s.content}>
    <Header title={job.job_number} subtitle="Request details" onBack={() => go("requests")} />
    <Card style={[s.cardGap, job.status === "WAITING_CUSTOMER" && { borderColor: "#C8871A", borderWidth: 2 }]}>
      <View style={s.between}><View style={{ flex: 1, paddingRight: 8 }}><Text style={s.h2}>{job.title}</Text><Text style={s.muted}>{job.service_type}</Text></View><StatusBadge status={job.status} /></View>
      <Text style={s.muted}>{job.site_name_ref ?? job.site_name} · {[job.city, job.state].filter(Boolean).join(", ")}</Text>
      {job.scheduled_at ? <Text style={s.muted}>Preferred: {fmt(job.scheduled_at)}</Text> : null}
      {job.status === "WAITING_CUSTOMER" ? <Button testID="request-confirm-cta" title="Review & Confirm Completion" icon="checkmark-circle" onPress={onConfirm} /> : null}
      {["REQUESTED", "OFFERED"].includes(job.status) ? <Button testID="request-cancel" title="Cancel request" secondary danger onPress={() => Alert.alert("Cancel request?", "You can create a new request anytime.", [{ text: "Keep" }, { text: "Cancel request", style: "destructive", onPress: async () => { try { await customerService.cancelJob(job.id); go("requests"); } catch (e: any) { Alert.alert("Could not cancel", e?.message ?? "Please try again."); } } }])} /> : null}
    </Card>
    <SectionTitle title="Progress" />
    <Card style={s.cardGap}><Timeline status={job.status} />{job.status === "IN_PROGRESS" || progress > 0 ? <><View style={s.divider} /><View style={s.between}><Text style={s.h3}>Work completion</Text><Text style={s.h3}>{progress}%</Text></View><Progress value={progress} />{job.progress?.current_task ? <Text style={s.muted}>Current task · {job.progress.current_task}</Text> : null}{job.progress?.notes ? <Text style={s.tiny}>Note: {job.progress.notes}</Text> : null}</> : null}</Card>
    {job.worker ? <><SectionTitle title="Your professional" /><Card style={s.cardGap}><View style={s.row}><View style={s.avatar}>{job.worker.profile_photo_url ? <Photo path={job.worker.profile_photo_url} style={{ width: 46, height: 46, borderRadius: 23 }} /> : <Text style={s.avatarText}>{initials(job.worker.full_name)}</Text>}</View><View style={{ marginLeft: 12, flex: 1 }}><Text style={s.h3}>{job.worker.full_name}</Text><Text style={s.muted}>{job.worker.primary_trade ?? "Service professional"}{job.worker.years_experience ? ` · ${job.worker.years_experience} yrs` : ""}</Text><View style={s.row}><Icon name="star" size={13} color="#E5A523" /><Text style={s.tiny}> {Number(job.worker.rating_avg ?? 0).toFixed(1)} ({job.worker.rating_count ?? 0} jobs)</Text></View></View></View><View style={[s.row, s.gap8]}><Button testID="request-call-worker" title="Call" secondary icon="call-outline" onPress={() => job.worker.phone ? Linking.openURL(`tel:${job.worker.phone}`) : Alert.alert("Unavailable", "Phone number not available.")} /><Button testID="request-chat-worker" title="Chat" secondary icon="chatbubble-outline" onPress={() => Alert.alert("Chat", "In-app chat is coming soon. Please call for urgent needs.")} /></View></Card></> : null}
    <SectionTitle title="Location" />
    <Card style={{ padding: 0, overflow: "hidden" }}><MapCard label={job.site_name_ref ?? job.site_name ?? "Site"} latitude={job.latitude} longitude={job.longitude} /><View style={{ padding: 14, gap: 4 }}><Text style={s.h3}>{job.site_name_ref ?? job.site_name}</Text><Text style={s.muted}>{[job.address_line, job.city, job.state, job.postal_code].filter(Boolean).join(", ")}</Text>{job.site_contact_name ? <Text style={s.tiny}>Contact: {job.site_contact_name}{job.site_contact_phone ? ` · ${job.site_contact_phone}` : ""}</Text> : null}</View></Card>
    {job.problem_description ? <><SectionTitle title="Problem" /><Card><Text style={s.body}>{job.problem_description}</Text>{job.description ? <Text style={[s.muted, { marginTop: 6 }]}>{job.description}</Text> : null}</Card></> : null}
    {photos.length ? <><SectionTitle title="Photos" /><Card><View style={s.rowWrap}>{photos.map((p: any, i: number) => <Photo key={p.id ?? i} path={p.file_url} style={[s.photo, { marginRight: 8, marginBottom: 8 }]} onPress={() => setViewer(p.file_url)} />)}</View>{["BEFORE", "DURING", "AFTER"].map((group) => { const items = (job.photos ?? []).filter((p: any) => p.photo_type === group); return items.length ? <Text key={group} style={[s.tiny, { marginTop: 4 }]}>{group}: {items.length} photo(s)</Text> : null; })}</Card></> : null}
    {(job.materials ?? []).length ? <><SectionTitle title="Materials used" /><Card>{job.materials.map((m: any) => <View key={m.id} style={[s.between, s.listRow]}><View><Text style={s.h3}>{m.name}</Text><Text style={s.muted}>{Number(m.quantity)} {m.unit}</Text></View><Text style={s.h3}>₹{Number(m.total_amount).toLocaleString("en-IN")}</Text></View>)}</Card></> : null}
    {(job.timeline ?? []).length ? <><SectionTitle title="Status history" /><Card>{job.timeline.map((t: any, i: number) => <View key={i} style={[s.between, { minHeight: 34 }]}><Text style={s.body}>{(STATUS_META[t.new_status] ?? { label: t.new_status }).label}</Text><Text style={s.tiny}>{fmt(t.created_at)}</Text></View>)}</Card></> : null}
    {job.confirmation ? <><SectionTitle title="Confirmation" /><Card style={s.cardGap}><View style={s.row}><Icon name="checkmark-circle" color="#15966D" /><Text style={s.h3}>  Confirmed by {job.confirmation.customer_name}</Text></View><Stars value={job.confirmation.rating ?? 0} size={20} />{job.confirmation.comments ? <Text style={s.body}>“{job.confirmation.comments}”</Text> : null}</Card></> : null}
    <View style={{ marginTop: 18 }}><Button testID="request-support" title="Need help with this job?" secondary icon="help-circle-outline" onPress={() => go("support")} /></View>
    <Modal visible={!!viewer} transparent onRequestClose={() => setViewer(null)}><Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,.92)", alignItems: "center", justifyContent: "center" }} onPress={() => setViewer(null)}>{viewer ? <Photo path={viewer} style={{ width: "92%", height: "70%", borderRadius: 12, overflow: "hidden" }} /> : null}</Pressable></Modal>
  </ScrollView>;
}

function Confirm({ go, jobId, profile, onDone }: { go: (s: Screen) => void; jobId: string; profile: any; onDone: () => void }) {
  const s = useStyles();
  const [job, setJob] = useState<any>(null); const [rating, setRating] = useState(5); const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { customerService.job(jobId).then(setJob).catch(() => {}); }, [jobId]);
  const submit = async () => {
    setBusy(true); setError("");
    try { await customerService.confirm(jobId, { customer_name: profile?.contact_person || profile?.full_name || "Customer", rating, comments: comments || undefined }); onDone(); }
    catch (e: any) { setError(e?.message ?? "Could not submit confirmation."); setBusy(false); }
  };
  return <ScrollView contentContainerStyle={s.content}>
    <Header title="Confirm completion" subtitle="Review the finished work" onBack={() => go("request")} />
    {job ? <Card style={s.cardGap}>
      <View style={{ alignItems: "center", gap: 8 }}><View style={[s.avatar, { width: 70, height: 70, borderRadius: 35, backgroundColor: "#E7F7F0" }]}><Icon name="checkmark-done" size={34} color="#15966D" /></View><Text style={s.h2}>Work completed</Text><Text style={[s.body, { textAlign: "center" }]}>{job.title} · {job.worker?.full_name ?? "Your professional"}</Text></View>
      <View style={s.divider} />
      {job.progress ? <Text style={s.muted}>Final progress: {job.progress.progress_percent}% · {job.progress.current_task ?? "All tasks done"}</Text> : null}
      {(job.materials ?? []).length ? <Text style={s.muted}>Materials: {job.materials.map((m: any) => `${m.name} ×${Number(m.quantity)}`).join(", ")}</Text> : null}
      {(job.photos ?? []).length ? <View style={s.rowWrap}>{job.photos.slice(0, 6).map((p: any) => <Photo key={p.id} path={p.file_url} style={[s.photo, { marginRight: 8, marginBottom: 8 }]} />)}</View> : null}
      <View style={s.divider} />
      <Text style={s.inputLabel}>Rate your professional</Text>
      <Stars value={rating} onChange={setRating} />
      <Field testID="confirm-comments" label="Comments (optional)" value={comments} onChangeText={setComments} multiline placeholder="How was the service?" />
      {error ? <Text testID="confirm-error" style={{ color: "#C94A4A", fontSize: 13 }}>{error}</Text> : null}
      <Button testID="confirm-submit" title="Confirm Completion" icon="checkmark-circle" onPress={submit} loading={busy} />
      <Button testID="confirm-issue" title="Raise an issue" secondary danger onPress={() => go("support")} />
    </Card> : <Card style={{ alignItems: "center", paddingVertical: 24 }}><ActivityIndicator color="#0B63CE" /></Card>}
  </ScrollView>;
}

function JobsList({ go, mode, onSelect }: { go: (s: Screen) => void; mode: "requests" | "history"; onSelect: (id: string) => void }) {
  const s = useStyles();
  const tabs = mode === "requests" ? ["ACTIVE"] : ["COMPLETED", "CANCELLED", "DISPUTED"];
  const [tab, setTab] = useState(tabs[0]); const [query, setQuery] = useState("");
  const [items, setItems] = useState<any[]>([]); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true); const [more, setMore] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async (offset = 0) => {
    if (offset === 0) { setLoading(true); } else { setMore(true); } setError("");
    try { const r = await customerService.jobs(tab as any, query, 10, offset); setItems((p) => (offset === 0 ? r.items : [...p, ...r.items])); setTotal(r.total); }
    catch (e: any) { setError(e?.message ?? "Could not load requests."); } finally { setLoading(false); setMore(false); }
  }, [tab, query]);
  useEffect(() => { const t = setTimeout(() => load(0), 300); return () => clearTimeout(t); }, [load]);
  return <ScrollView contentContainerStyle={s.content}>
    <Header title={mode === "requests" ? "My requests" : "Request history"} subtitle={mode === "requests" ? "Active and upcoming service" : "Completed, cancelled and disputed"} />
    {tabs.length > 1 ? <View style={s.rowWrap}>{tabs.map((x) => <Pressable key={x} testID={`history-tab-${x.toLowerCase()}`} onPress={() => setTab(x)} style={[s.chip, tab === x && s.chipSelected]}><Text style={[s.chipText, tab === x && s.chipSelectedText]}>{x.charAt(0) + x.slice(1).toLowerCase()}</Text></Pressable>)}</View> : null}
    <View style={[s.input, s.row, { marginBottom: 14 }]}><Icon name="search" size={17} /><TextInput testID="jobs-search" accessibilityLabel="Search requests" value={query} onChangeText={setQuery} placeholder="Search service or site" placeholderTextColor="#8AA0B5" style={{ flex: 1, color: "#0B1F3A", marginLeft: 8 }} /></View>
    {loading ? <Card style={{ alignItems: "center", paddingVertical: 24 }}><ActivityIndicator color="#0B63CE" /></Card>
      : error ? <ErrorState message={error} onRetry={() => load(0)} />
      : items.length === 0 ? <Empty testID="jobs-empty" icon="document-text-outline" title={mode === "requests" ? "No active service requests" : `No ${tab.toLowerCase()} requests`} text={mode === "requests" ? "Create a request and we'll match a professional near your site." : "Your past requests will appear here."} action={mode === "requests" ? "Create request" : undefined} onAction={() => go("create")} />
      : <View style={s.gap12}>{items.map((job) => <Pressable key={job.id} testID={`job-row-${job.job_number}`} onPress={() => onSelect(job.id)}><Card style={s.cardGap}><View style={s.between}><View style={{ flex: 1, paddingRight: 8 }}><Text style={s.h3}>{job.title}</Text><Text style={s.muted}>{job.service_type} · {job.site_name_ref ?? job.site_name}</Text><Text style={s.tiny}>{fmt(job.created_at)}</Text></View><StatusBadge status={job.status} /></View>{job.worker_name ? <View style={s.row}><Icon name="person-circle-outline" size={15} color="#0B63CE" /><Text style={s.muted}>  {job.worker_name}</Text></View> : null}</Card></Pressable>)}
        {items.length < total ? <Button testID="jobs-load-more" title={more ? "Loading…" : `Load more (${total - items.length})`} secondary onPress={() => load(items.length)} disabled={more} /> : null}</View>}
  </ScrollView>;
}

function Notifications({ go, onOpenJob, onRead }: { go: (s: Screen) => void; onOpenJob: (id: string) => void; onRead: (all: boolean) => void }) {
  const s = useStyles();
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(() => { setLoading(true); setError(""); notificationService.list().then(setItems as any).catch((e) => setError(e?.message ?? "Could not load notifications.")).finally(() => setLoading(false)); }, []);
  useEffect(load, [load]);
  const open = async (n: any) => {
    if (!n.is_read) { notificationService.markRead(String(n.id)).catch(() => {}); setItems((p) => p.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))); onRead(false); }
    if (n.entity_type === "JOB" && n.entity_id) onOpenJob(String(n.entity_id));
  };
  const markAll = async () => { try { await notificationService.markAllRead(); setItems((p) => p.map((x) => ({ ...x, is_read: true }))); onRead(true); } catch { /* ignore */ } };
  const iconFor = (type: string): IconName => type?.includes("WORKER") ? "person" : type === "WORK_COMPLETED" || type === "CONFIRMATION_REQUIRED" ? "checkmark-circle" : type === "REQUEST_CREATED" ? "document-text" : "briefcase";
  return <ScrollView contentContainerStyle={s.content}>
    <Header title="Notifications" subtitle="Updates on your requests" />
    {loading ? <Card style={{ alignItems: "center", paddingVertical: 24 }}><ActivityIndicator color="#0B63CE" /></Card>
      : error ? <ErrorState message={error} onRetry={load} />
      : items.length === 0 ? <Empty testID="notifications-empty" icon="notifications-outline" title="No notifications yet" text="We&apos;ll notify you when professionals respond to your requests." />
      : <View style={s.gap8}>{items.map((n) => <Pressable key={n.id} testID={`notification-${n.id}`} onPress={() => open(n)}><Card style={[s.row, { gap: 12, borderColor: n.is_read ? "#DCE5EF" : "#9EC7EE" }]}><View style={[s.avatar, { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EAF4FF" }]}><Icon name={iconFor(n.type)} color="#0B63CE" size={18} /></View><View style={{ flex: 1, gap: 3 }}><View style={s.between}><Text style={s.h3}>{n.title}</Text>{!n.is_read ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#0B63CE" }} /> : null}</View><Text style={s.body}>{n.message}</Text><Text style={s.tiny}>{fmt(n.created_at)}</Text></View></Card></Pressable>)}
        <Button testID="notifications-mark-all" title="Mark all as read" secondary onPress={markAll} /></View>}
  </ScrollView>;
}

function Support({ go, jobId }: { go: (s: Screen) => void; jobId?: string }) {
  const s = useStyles();
  const [tickets, setTickets] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [modal, setModal] = useState(false); const [detail, setDetail] = useState<any>(null);
  const [category, setCategory] = useState("SITE_ACCESS"); const [priority, setPriority] = useState("MEDIUM");
  const [subject, setSubject] = useState(""); const [description, setDescription] = useState(""); const [busy, setBusy] = useState(false); const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(() => { setLoading(true); setError(""); supportService.listTickets().then(setTickets as any).catch((e) => setError(e?.message ?? "Could not load tickets.")).finally(() => setLoading(false)); }, []);
  useEffect(load, [load]);
  const submit = async () => {
    setFormError("");
    if (subject.trim().length < 2 || description.trim().length < 2) { setFormError("Please add a subject and description."); return; }
    setBusy(true);
    try { await supportService.createTicket({ job_id: jobId, category, priority, subject: subject.trim(), description: description.trim() }); setModal(false); setSubject(""); setDescription(""); load(); }
    catch (e: any) { setFormError(e?.message ?? "Could not create ticket."); } finally { setBusy(false); }
  };
  const openTicket = async (id: string) => { try { setDetail(await supportService.ticket(id)); } catch { /* ignore */ } };
  const send = async () => { if (!message.trim() || !detail) return; try { await supportService.sendMessage(String(detail.id), message.trim()); setMessage(""); openTicket(String(detail.id)); } catch { /* ignore */ } };
  return <ScrollView contentContainerStyle={s.content}>
    <Header title="Help & support" subtitle="We are here to help" onBack={() => go("profile")} />
    <Card style={{ backgroundColor: "#0B1F3A", borderColor: "#0B1F3A", gap: 8 }}><Text style={{ color: "#A9D6FF", fontSize: 11, fontWeight: "800" }}>SUPPORT HOURS · 9 AM – 9 PM</Text><Text style={{ color: "#FFFFFF", fontSize: 21, fontWeight: "800" }}>Need help with a service?</Text><Button testID="support-call" title="Call Support" secondary icon="call-outline" onPress={() => Linking.openURL("tel:+919876543210")} /></Card>
    <SectionTitle title="Your tickets" action="New ticket" onAction={() => setModal(true)} />
    {loading ? <Card style={{ alignItems: "center", paddingVertical: 24 }}><ActivityIndicator color="#0B63CE" /></Card>
      : error ? <ErrorState message={error} onRetry={load} />
      : tickets.length === 0 ? <Empty testID="tickets-empty" icon="help-buoy-outline" title="No support tickets" text="Raise an issue and our team will get back to you." action="Raise an issue" onAction={() => setModal(true)} />
      : <View style={s.gap8}>{tickets.map((t) => <Pressable key={t.id} testID={`ticket-${t.ticket_number}`} onPress={() => openTicket(String(t.id))}><Card><View style={s.between}><View style={{ flex: 1, paddingRight: 8 }}><Text style={s.h3}>{t.ticket_number}</Text><Text style={s.muted}>{t.subject}</Text><Text style={s.tiny}>{fmt(t.created_at)}</Text></View><Badge text={t.status} tone={t.status === "RESOLVED" || t.status === "CLOSED" ? "success" : "warning"} /></View></Card></Pressable>)}</View>}
    <ModalSheet visible={modal} title="Raise an issue" onClose={() => setModal(false)}><View style={s.gap16}>
      <Text style={s.inputLabel}>Category</Text><View style={s.rowWrap}>{[["SITE_ACCESS", "Site access"], ["WORK_QUALITY", "Work quality"], ["SCHEDULE", "Schedule"], ["OTHER", "Other"]].map(([v, label]) => <Pressable key={v} testID={`ticket-category-${v.toLowerCase()}`} onPress={() => setCategory(v)} style={[s.chip, category === v && s.chipSelected]}><Text style={[s.chipText, category === v && s.chipSelectedText]}>{label}</Text></Pressable>)}</View>
      <Text style={s.inputLabel}>Priority</Text><View style={s.rowWrap}>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((v) => <Pressable key={v} testID={`ticket-priority-${v.toLowerCase()}`} onPress={() => setPriority(v)} style={[s.chip, priority === v && s.chipSelected]}><Text style={[s.chipText, priority === v && s.chipSelectedText]}>{v}</Text></Pressable>)}</View>
      <Field testID="ticket-subject" label="Subject" value={subject} onChangeText={setSubject} placeholder="Short summary" />
      <Field testID="ticket-description" label="Description" value={description} onChangeText={setDescription} multiline placeholder="Tell us what happened" />
      {formError ? <Text style={{ color: "#C94A4A", fontSize: 13 }}>{formError}</Text> : null}
      <Button testID="ticket-submit" title="Submit ticket" onPress={submit} loading={busy} />
    </View></ModalSheet>
    <ModalSheet visible={!!detail} title={detail?.ticket_number ?? "Ticket"} onClose={() => setDetail(null)}>{detail ? <View style={s.gap12}>
      <View style={s.between}><Text style={s.h3}>{detail.subject}</Text><Badge text={detail.status} tone={detail.status === "RESOLVED" || detail.status === "CLOSED" ? "success" : "warning"} /></View>
      <Text style={s.body}>{detail.description}</Text><View style={s.divider} />
      {(detail.messages ?? []).map((m: any) => <View key={m.id} style={[s.card, { backgroundColor: m.sender_type === "CUSTOMER" ? "#EAF4FF" : "#F5F8FC" }]}><Text style={s.body}>{m.message}</Text><Text style={s.tiny}>{m.sender_type === "CUSTOMER" ? "You" : "Support"} · {fmt(m.created_at)}</Text></View>)}
      <View style={[s.row, s.gap8]}><TextInput testID="ticket-message" accessibilityLabel="Message" value={message} onChangeText={setMessage} placeholder="Write a message" placeholderTextColor="#8AA0B5" style={[s.input, { flex: 1 }]} /><Button testID="ticket-send" title="Send" onPress={send} /></View>
    </View> : null}</ModalSheet>
  </ScrollView>;
}

function Profile({ go, profile, onEdit }: { go: (s: Screen) => void; profile: any; onEdit: () => void }) {
  const s = useStyles();
  const items: [string, string, IconName, Screen][] = [["Personal Information", "Name, contact and preferences", "person-outline", "setup"], ["Service Sites", "Manage your service locations", "business-outline", "sites"], ["Notifications", "Request and status updates", "notifications-outline", "notifications"], ["Help & Support", "Tickets and contact", "help-circle-outline", "support"]];
  return <ScrollView contentContainerStyle={s.content}>
    <Header title="Profile" subtitle="Your customer account" />
    <Card style={{ alignItems: "center", gap: 8 }}><View style={[s.avatar, { width: 78, height: 78, borderRadius: 39 }]}><Text style={{ color: "#0B63CE", fontSize: 26, fontWeight: "800" }}>{initials(profile?.full_name)}</Text></View><Text style={s.h2}>{profile?.full_name}</Text><Text style={s.muted}>{profile?.company_name || "Individual customer"}</Text><Text style={s.tiny}>{profile?.phone}{profile?.email ? ` · ${profile.email}` : ""}</Text><Button testID="profile-edit" title="Edit Profile" secondary onPress={onEdit} /></Card>
    <Card style={{ marginTop: 18, paddingVertical: 5 }}>{items.map(([label, sub, icon, screen]) => <Pressable key={label} testID={`profile-${label.replace(/[^a-z]/gi, "-").toLowerCase()}`} onPress={() => go(screen)} style={[s.between, { minHeight: 54, borderBottomWidth: 1, borderBottomColor: "#E5EDF5" }]}><View style={s.row}><Icon name={icon} color="#58708C" /><View style={{ marginLeft: 12 }}><Text style={s.body}>{label}</Text><Text style={s.tiny}>{sub}</Text></View></View><Icon name="chevron-forward" color="#8AA0B5" size={17} /></Pressable>)}</Card>
    <View style={{ marginTop: 16 }}><Button testID="profile-settings" title="Settings" secondary icon="settings-outline" onPress={() => go("settings")} /></View>
  </ScrollView>;
}

function Settings({ go, signOut }: { go: (s: Screen) => void; signOut: () => void }) {
  const s = useStyles();
  const [push, setPush] = useState(true); const [emailUpdates, setEmailUpdates] = useState(true); const [confirmOut, setConfirmOut] = useState(false);
  return <ScrollView contentContainerStyle={s.content}>
    <Header title="Settings" onBack={() => go("profile")} />
    <Card style={{ paddingVertical: 5 }}>
      {[["Notifications", "Status updates for your requests", push, setPush, "notifications-outline"], ["Email updates", "Confirmation receipts by email", emailUpdates, setEmailUpdates, "mail-outline"]].map(([title, sub, value, setter, icon]) => <View key={title as string} style={[s.between, { minHeight: 68, borderBottomWidth: 1, borderBottomColor: "#E5EDF5" }]}><View style={s.row}><Icon name={icon as IconName} /><View style={{ marginLeft: 12 }}><Text style={s.h3}>{title as string}</Text><Text style={s.tiny}>{sub as string}</Text></View></View><Switch testID={`settings-${(title as string).toLowerCase().replace(" ", "-")}`} value={value as boolean} onValueChange={setter as any} trackColor={{ false: "#C9D5E0", true: "#7FB4E9" }} thumbColor={value ? "#0B63CE" : "#FFFFFF"} /></View>)}
      {[["Language", "English", "language-outline"], ["Privacy & Security", "Control your account security", "lock-closed-outline"], ["Help & Support", "FAQs, chat and tickets", "help-circle-outline"], ["Terms & Conditions", "Customer platform terms", "document-text-outline"]].map(([title, sub, icon]) => <Pressable key={title} onPress={() => title === "Help & Support" && go("support")} style={[s.between, { minHeight: 60, borderBottomWidth: 1, borderBottomColor: "#E5EDF5" }]}><View style={s.row}><Icon name={icon as IconName} /><View style={{ marginLeft: 12 }}><Text style={s.h3}>{title}</Text><Text style={s.tiny}>{sub}</Text></View></View><Icon name="chevron-forward" color="#8AA0B5" size={17} /></Pressable>)}
    </Card>
    <View style={{ marginTop: 20 }}><Button testID="settings-logout" title="Log out" secondary danger icon="log-out-outline" onPress={() => setConfirmOut(true)} /></View>
    <ModalSheet visible={confirmOut} title="Log out?" onClose={() => setConfirmOut(false)}><View style={s.gap16}><Text style={s.body}>You can sign in again anytime.</Text><Button testID="logout-confirm" title="Log out" onPress={() => { setConfirmOut(false); signOut(); }} /><Button testID="logout-cancel" title="Cancel" secondary onPress={() => setConfirmOut(false)} /></View></ModalSheet>
    <Text style={[s.tiny, { textAlign: "center", marginTop: 28 }]}>ShedX Customer Portal · v1.0.0</Text>
  </ScrollView>;
}

function AppShell({ screen, go, children }: { screen: Screen; go: (s: Screen) => void; children: React.ReactNode }) {
  const s = useStyles(); const { width } = useWindowDimensions(); const insets = useSafeAreaInsets();
  const noChrome: Screen[] = ["welcome", "login", "register", "setup", "create", "searching", "confirm"];
  const items: [string, IconName, Screen][] = [["Home", "home-outline", "home"], ["Requests", "document-text-outline", "requests"], ["Active", "pulse-outline", "request"], ["History", "time-outline", "history"], ["Profile", "person-outline", "profile"]];
  if (noChrome.includes(screen)) return <View style={[s.root, { paddingTop: insets.top }]}>{children}</View>;
  const desktop = width >= 760;
  return <View style={s.root}>{desktop ? <View style={{ flex: 1, flexDirection: "row" }}><View style={s.sidebar}><Logo /><Text style={s.tiny}>CUSTOMER PORTAL</Text><View style={{ height: 8 }} />{items.map(([label, icon, target]) => <Pressable key={label} testID={`nav-${label.toLowerCase()}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => go(target)} style={[s.sideItem, screen === target && s.sideItemActive]}><Icon name={icon} color={screen === target ? "#0B63CE" : undefined} /><Text style={[s.sideText, screen === target && s.sideTextActive]}>{label}</Text></Pressable>)}<View style={{ flex: 1 }} /><Pressable testID="nav-notifications" onPress={() => go("notifications")} style={s.sideItem}><Icon name="notifications-outline" /><Text style={s.sideText}>Notifications</Text></Pressable><Pressable testID="nav-settings" onPress={() => go("settings")} style={s.sideItem}><Icon name="settings-outline" /><Text style={s.sideText}>Settings</Text></Pressable></View><View style={s.page}>{children}</View></View> : <View style={s.page}>{children}<View style={[s.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>{items.map(([label, icon, target]) => <Pressable key={label} testID={`nav-${label.toLowerCase()}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => go(target)} style={s.navItem}><Icon name={icon} color={screen === target ? "#0B63CE" : undefined} /><Text style={[s.navText, screen === target && s.navActive]}>{label}</Text></Pressable>)}</View></View>}</View>;
}

export default function CustomerPortal() {
  const s = useStyles(); const router = useRouter();
  const [screen, setScreen] = useState<Screen>("welcome");
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [activeJobId, setActiveJobId] = useState("");
  const [unread, setUnread] = useState(0);
  const [preselect, setPreselect] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const say = (message: string) => { setToast(message); setTimeout(() => setToast(""), 2200); };

  const bootstrap = useCallback(async () => {
    const [profileData, siteData, unreadData, activeData] = await Promise.all([
      customerService.profile(), customerService.sites(), customerService.unreadCount(), customerService.jobs("ACTIVE", "", 1, 0),
    ]);
    setProfile(profileData); setSites(siteData); setUnread(unreadData.unread); setActiveJobId(activeData.items[0]?.id ?? "");
    setAuthed(true);
  }, []);

  useEffect(() => {
    (async () => {
      const token = await sessionStorage.read();
      if (!token) { setLoading(false); return; }
      try {
        const me = await authService.me() as any;
        if (me?.role === "WORKER") { router.replace("/"); return; }
        await bootstrap(); setScreen("home");
      } catch { await sessionStorage.clear(); }
      setLoading(false);
    })();
  }, []);

  const refreshSites = useCallback(() => { customerService.sites().then(setSites).catch(() => {}); }, []);

  const go = (next: Screen, service?: string) => {
    if (next === "create") setPreselect(service);
    if (next === "home") customerService.unreadCount().then((r) => setUnread(r.unread)).catch(() => {});
    if (next === "request" && !selectedJobId && activeJobId) setSelectedJobId(activeJobId);
    if (next === "sites") refreshSites();
    setScreen(next);
  };
  const selectJob = (id: string) => { setSelectedJobId(id); setScreen("request"); };
  const signOut = async () => { await authService.logout(); setAuthed(false); setProfile(null); setScreen("login"); };

  if (loading) return <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color="#0B63CE" size="large" /><Text style={[s.muted, { marginTop: 12 }]}>Preparing your customer portal…</Text></View>;

  let content: React.ReactNode = null;
  if (screen === "welcome") content = <Welcome go={go} />;
  if (screen === "login") content = <Login go={go} onSignedIn={async () => { await bootstrap(); setScreen("home"); }} />;
  if (screen === "register") content = <Register go={go} onRegistered={async () => { await bootstrap(); setScreen("setup"); say("Account created"); }} />;
  if (screen === "setup") content = <Setup go={go} profile={profile} onSaved={setProfile} />;
  if (screen === "home") content = <Home go={go} profile={profile} unread={unread} onSelectJob={selectJob} />;
  if (screen === "sites") content = <Sites go={go} />;
  if (screen === "create") content = <CreateRequest go={go} sites={sites} preselect={preselect} onCreated={(id) => { setSelectedJobId(id); setActiveJobId(id); setPreselect(undefined); setScreen("searching"); say("Request created"); }} />;
  if (screen === "searching") content = <Searching go={go} jobId={selectedJobId} />;
  if (screen === "request") content = selectedJobId ? <RequestDetail go={go} jobId={selectedJobId} onConfirm={() => setScreen("confirm")} /> : <ScrollView contentContainerStyle={s.content}><Header title="Active request" /><Empty testID="active-empty" icon="pulse-outline" title="No active service requests" text="When you create a request, you can track it live here." action="Create request" onAction={() => go("create")} /></ScrollView>;
  if (screen === "confirm") content = <Confirm go={go} jobId={selectedJobId} profile={profile} onDone={() => { setScreen("request"); say("Thank you! Work confirmed."); }} />;
  if (screen === "requests") content = <JobsList go={go} mode="requests" onSelect={selectJob} />;
  if (screen === "history") content = <JobsList go={go} mode="history" onSelect={selectJob} />;
  if (screen === "notifications") content = <Notifications go={go} onOpenJob={selectJob} onRead={(all) => setUnread((u) => (all ? 0 : Math.max(0, u - 1)))} />;
  if (screen === "support") content = <Support go={go} jobId={selectedJobId || undefined} />;
  if (screen === "profile") content = <Profile go={go} profile={profile} onEdit={() => setScreen("setup")} />;
  if (screen === "settings") content = <Settings go={go} signOut={signOut} />;

  return <AppShell screen={screen} go={go}>{content}{toast ? <View style={s.toast}><Text style={s.toastText}>{toast}</Text></View> : null}</AppShell>;
}

