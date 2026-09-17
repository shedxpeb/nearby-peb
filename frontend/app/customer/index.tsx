import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, AppState, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView,
  Switch, Text, TextInput, useWindowDimensions, View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, useTheme } from "@/src/theme";
import { customerAuth } from "@/src/services/customerAuth";
import { sessionStorage } from "@/src/services/api";
import { customerService } from "@/src/services/customerService";
import { notificationService } from "@/src/services/notificationService";
import { storageService } from "@/src/services/storageService";
import { supportService } from "@/src/services/supportService";
import { chatService, ChatMessage, ChatConversation } from "@/src/services/chatService";
import { skillsService } from "@/src/services/skillsService";
import { formatDateTime, formatPreferredDate } from "@/src/utils/dateUtils";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type Screen = "welcome" | "login" | "register" | "setup" | "home" | "sites" | "create" | "searching" | "request" | "confirm" | "requests" | "history" | "notifications" | "support" | "profile" | "settings" | "chat";

// Internal screen state - no router navigation needed for customer portal
// The /customer route is a single-page app with internal screen management

const STATUS_META: Record<string, { label: string; tone: "default" | "success" | "warning" | "urgent" }> = {
  REQUESTED: { label: "Requested", tone: "default" }, OFFERED: { label: "Matching", tone: "default" },
  ASSIGNED: { label: "Worker assigned", tone: "success" }, ACCEPTED: { label: "Worker assigned", tone: "success" }, EN_ROUTE: { label: "Worker assigned", tone: "success" },
  ARRIVED: { label: "Worker assigned", tone: "success" }, IN_PROGRESS: { label: "In progress", tone: "default" },
  PAUSED: { label: "In progress", tone: "default" }, WAITING_CUSTOMER: { label: "Confirmation required", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" }, CANCELLED: { label: "Cancelled", tone: "urgent" }, DISPUTED: { label: "Disputed", tone: "urgent" },
};
const TIMELINE = ["REQUESTED", "ASSIGNED", "COMPLETED"];
const ACTIVE_STATUSES = ["REQUESTED", "OFFERED", "ASSIGNED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "PAUSED", "WAITING_CUSTOMER"];

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
  card: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
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

function DatePickerField({ label, value, onChange, placeholder, testID }: { label: string; value: Date | undefined; onChange: (date: Date | undefined) => void; placeholder?: string; testID?: string }) {
  const s = useStyles();
  const [showPicker, setShowPicker] = useState(false);
  const [focused, setFocused] = useState(false);
  
  const formatDateDisplay = (d: Date) => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-IN', options);
  };

  const formatDateValue = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const formattedValue = value ? formatDateDisplay(value) : placeholder || "Select preferred date";

  if (Platform.OS === 'web') {
    return (
      <View style={s.field}>
        <Text style={s.inputLabel}>{label}</Text>
        <View style={[s.input, focused && { borderColor: "#0B63CE" }, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <input
            type="date"
            value={value ? formatDateValue(value) : ""}
            onChange={(e: any) => {
              if (e.target.value) {
                const selectedDate = new Date(e.target.value + 'T00:00:00');
                onChange(selectedDate);
              } else {
                onChange(undefined);
              }
            }}
            min={new Date().toISOString().split('T')[0]}
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: value ? '#0B1F3A' : '#8AA0B5', outline: 'none' }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <Icon name="calendar-outline" color="#8AA0B5" size={20} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.field}>
      <Text style={s.inputLabel}>{label}</Text>
      <Pressable 
        testID={testID} 
        accessibilityRole="button" 
        accessibilityLabel={label}
        onPress={() => setShowPicker(true)} 
        style={[s.input, focused && { borderColor: "#0B63CE" }, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <Text style={{ color: value ? "#0B1F3A" : "#8AA0B5", fontSize: 14, flex: 1 }}>
          {formattedValue}
        </Text>
        <Icon name="calendar-outline" color="#8AA0B5" size={20} />
      </Pressable>
      {showPicker && (
        <DateTimePicker
          testID="datetimepicker"
          value={value || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'compact' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
}

function Header({ title, subtitle, onBack, onBell, unread = 0 }: { title: string; subtitle?: string; onBack?: () => void; onBell?: () => void; unread?: number }) {
  const s = useStyles();
  return <View style={s.header}><View style={s.headerLeft}>{onBack ? <Pressable testID="header-back" accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={s.iconButton}><Icon name="arrow-back" /></Pressable> : null}<View><Text style={s.h2}>{title}</Text>{subtitle ? <Text style={s.tiny}>{subtitle}</Text> : null}</View></View>{onBell ? <Pressable testID="header-notifications" accessibilityRole="button" accessibilityLabel="Notifications" onPress={onBell} style={s.iconButton}><Icon name="notifications-outline" />{unread > 0 ? <View style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: "#C94A4A" }} /> : null}</Pressable> : null}</View>;
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) { const s = useStyles(); return <View style={[s.between, { marginTop: 20, marginBottom: 10 }]}><Text style={s.h3}>{title}</Text>{action ? <Pressable onPress={onAction} style={{ minHeight: 44, justifyContent: "center" }}><Text style={s.textButtonText}>{action}</Text></Pressable> : null}</View>; }

function Card({ children, style }: { children: React.ReactNode; style?: any }) { const s = useStyles(); return <View style={[s.card, style]}>{children}</View>; }



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

function Welcome({ go }: { go: (s: Screen) => void }) {
  const s = useStyles(); const router = useRouter();
  return <ScrollView contentContainerStyle={[s.content, { flexGrow: 1, justifyContent: "center" }]}>
    <View style={{ alignItems: "center", marginBottom: 25 }}><Logo /><Text style={[s.muted, { marginTop: 4 }]}>CUSTOMER PORTAL</Text></View>
    <LinearGradient colors={["#0B1F3A", "#0E4D85"]} style={s.hero}><View style={{ gap: 12, zIndex: 1 }}><Text style={s.eyebrow}>SHEDX AFTER-SALES SERVICE</Text><Text style={s.heroTitle}>Expert care for every structure.</Text><Text style={s.heroText}>Book trusted PEB service professionals for repairs, inspections and maintenance at your sites.</Text></View><View style={s.illustration}><Icon name="business" size={52} color="#A9D6FF" /><Icon name="shield-checkmark" size={28} color="#FFFFFF" /></View></LinearGradient>
    <View style={{ gap: 10, marginTop: 24 }}><Button testID="welcome-get-started" title="Get Started" icon="arrow-forward" onPress={() => go("register")} /><Button testID="welcome-sign-in" title="Sign In" secondary onPress={() => go("login")} /></View>
    <Pressable testID="welcome-worker-link" accessibilityRole="button" onPress={() => router.push("/worker" as any)} style={{ alignItems: "center", marginTop: 24, minHeight: 44, justifyContent: "center" }}><Text style={s.muted}>Are you a service professional? <Text style={s.textButtonText}>Open Worker Portal</Text></Text></Pressable>
  </ScrollView>;
}

function Login({ go, onSignedIn }: { go: (s: Screen) => void; onSignedIn: () => Promise<void> }) {
  const s = useStyles(); const router = useRouter();
  const [mobile, setMobile] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [showRecovery, setShowRecovery] = useState(false);
  const submit = async () => {
    setError("");
    if (mobile.replace(/\D/g, "").length < 10 || !password) { setError("Enter your registered mobile number and password."); return; }
    setBusy(true);
    try {
      const result = await customerAuth.login(mobile.replace(/\D/g, ""), password) as any;
      if (result?.user?.role === "WORKER") { router.replace("/worker" as any); return; }
      if (result?.user?.role !== "CUSTOMER") { setError("Invalid account type. Please use the Customer portal."); return; }
      await onSignedIn();
    } catch (e: any) { 
      const errorMessage = e?.message || "Sign in failed. Please try again.";
      setError(errorMessage);
    } finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : "height"}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Header title="Welcome back" subtitle="Sign in to your customer account" onBack={() => router.replace("/customer" as any)} />
    <View style={[s.card, { marginTop: 25, gap: 18 }]}><Logo /><Text style={s.h1}>Your sites, serviced right.</Text><Text style={s.body}>Book service, track your professional and confirm completed work.</Text>
      <Field testID="login-mobile" label="Mobile Number" value={mobile} onChangeText={setMobile} placeholder="Enter mobile number" />
      <Field testID="login-password" label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Enter password" />
      <Pressable testID="login-forgot" onPress={() => setShowRecovery(true)} style={{ minHeight: 32, justifyContent: "center" }}><Text style={s.textButtonText}>Forgot password?</Text></Pressable>
      {error ? <Text testID="login-error" style={{ color: "#C94A4A", fontSize: 13 }}>{error}</Text> : null}
      <Button testID="login-submit" title="Login" onPress={submit} loading={busy} />
      <Text style={[s.muted, { textAlign: "center" }]}>New to ShedX? <Text testID="login-create-account" onPress={() => go("register")} style={s.textButtonText}>Create account</Text></Text>
    </View></ScrollView>
    <ModalSheet visible={showRecovery} title="Recover your account" onClose={() => setShowRecovery(false)}><View style={s.gap16}><Text style={s.body}>Enter your registered mobile number. We&apos;ll send a secure recovery link.</Text><Field label="Mobile Number" value={mobile} onChangeText={setMobile} /><Button testID="recovery-send" title="Send recovery link" onPress={() => { customerAuth.forgotPassword(mobile.replace(/\D/g, "")).catch(() => {}); setShowRecovery(false); }} /></View></ModalSheet>
  </KeyboardAvoidingView>;
}

function Register({ go, onRegistered }: { go: (s: Screen) => void; onRegistered: () => Promise<void> }) {
  const s = useStyles();
  const [name, setName] = useState(""); const [mobile, setMobile] = useState(""); const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [terms, setTerms] = useState(false);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = useCallback(async () => {
    setError("");
    if (name.trim().length < 2 || mobile.replace(/\D/g, "").length < 10 || password.length < 6) { setError("Please complete every field (password min 6 characters)."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (!terms) { setError("Please accept the Terms & Conditions."); return; }
    setBusy(true);
    try {
      // Normalize phone before sending
      const normalizedPhone = mobile.replace(/\D/g, "");
      await customerAuth.register({ full_name: name.trim(), phone: normalizedPhone, email: email.trim() || undefined, password });
      await onRegistered();
    } catch (e: any) {
      const errorMessage = e?.message || "Registration failed. Please try again.";
      setError(errorMessage);
    } finally { setBusy(false); }
  }, [name, mobile, email, password, confirm, terms, onRegistered]);
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

function Home({ go, profile, unread, onSelectJob, refreshTrigger }: { go: (s: Screen, service?: string) => void; profile: any; unread: number; onSelectJob: (id: string) => void; refreshTrigger?: number }) {
  const s = useStyles();
  const [jobs, setJobs] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const load = useCallback(() => { setLoading(true); setError(""); Promise.all([customerService.jobs("ACTIVE", "", 5, 0), skillsService.list()]).then(([jobsData, skillsData]) => { setJobs(jobsData.items); setServices((skillsData as any).map((s: any) => s.name)); }).catch((e) => setError(e?.message ?? "Could not load requests.")).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Poll every 15 seconds for live updates
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);
  useEffect(() => { if (refreshTrigger && refreshTrigger > 0) load(); }, [refreshTrigger, load]);
  const active = jobs;
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
    <View style={s.rowWrap}>{services.slice(0, 6).map((service, i) => <Pressable key={service} testID={`home-service-${i}`} onPress={() => go("create", service)} style={[s.card, { width: "47%", marginBottom: 10, gap: 8 }]}><Icon name={["home-outline", "grid-outline", "business-outline", "water-outline", "construct-outline", "layers-outline"][i] as IconName} color="#0B63CE" /><Text style={s.h3}>{service}</Text><Text style={s.tiny}>Book a professional</Text></Pressable>)}</View>
  </ScrollView>;
}

type SiteForm = { site_name: string; address_line: string; city: string; state: string; postal_code: string; contact_name: string; contact_phone: string; notes: string; latitude?: number; longitude?: number };
const emptySite: SiteForm = { site_name: "", address_line: "", city: "", state: "", postal_code: "", contact_name: "", contact_phone: "", notes: "" };

function SiteEditor({ initial, onClose, onSaved }: { initial: (SiteForm & { id?: string }) | null; onClose: () => void; onSaved: () => void }) {
  const s = useStyles();
  const [form, setForm] = useState<SiteForm>(initial ?? emptySite);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const set = (key: keyof SiteForm) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
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
    <Field testID="site-address" label="Address" value={form.address_line} onChangeText={set("address_line")} placeholder="Enter address" />
    <View style={[s.row, s.gap8]}><View style={{ flex: 1 }}><Field testID="site-city" label="City" value={form.city} onChangeText={set("city")} /></View><View style={{ flex: 1 }}><Field testID="site-state" label="State" value={form.state} onChangeText={set("state")} /></View></View>
    <Field testID="site-postal" label="Postal code" value={form.postal_code} onChangeText={set("postal_code")} placeholder="382110" />
    <View style={[s.row, s.gap8]}><View style={{ flex: 1 }}><Field testID="site-contact-name" label="Contact name" value={form.contact_name} onChangeText={set("contact_name")} /></View><View style={{ flex: 1 }}><Field testID="site-contact-phone" label="Contact phone" value={form.contact_phone} onChangeText={set("contact_phone")} /></View></View>
    <Field testID="site-notes" label="Access notes (optional)" value={form.notes} onChangeText={set("notes")} multiline placeholder="Gate, parking or safety instructions" />
    {error ? <Text testID="site-error" style={{ color: "#C94A4A", fontSize: 13 }}>{error}</Text> : null}
    <Button testID="site-save" title="Save site" onPress={save} loading={busy} />
  </View></ModalSheet>;
}

function Sites({ go, goBack, refreshSites }: { go: (s: Screen) => void; goBack: () => void; refreshSites: () => void }) {
  const s = useStyles();
  const [sites, setSites] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [editor, setEditor] = useState<(SiteForm & { id?: string }) | null | "new">(null);
  const load = useCallback(() => { setLoading(true); setError(""); customerService.sites().then(setSites).catch((e) => setError(e?.message ?? "Could not load sites.")).finally(() => setLoading(false)); }, []);
  useEffect(load, [load]);
  const remove = (site: any) => Alert.alert("Remove site?", `${site.site_name} will no longer be available for new requests.`, [{ text: "Cancel" }, { text: "Remove", style: "destructive", onPress: async () => { try { await customerService.deleteSite(site.id); load(); refreshSites(); } catch { Alert.alert("Could not remove", "Please try again."); } } }]);
  return <ScrollView contentContainerStyle={s.content}>
    <Header title="Service sites" subtitle="Locations professionals can visit" onBack={goBack} />
    <View style={{ marginBottom: 14 }}><Button testID="sites-add" title="Add site" icon="add" onPress={() => setEditor("new")} /></View>
    {loading ? <Card style={{ alignItems: "center", paddingVertical: 24 }}><ActivityIndicator color="#0B63CE" /></Card>
      : error ? <ErrorState message={error} onRetry={load} />
      : sites.length === 0 ? <Empty testID="sites-empty" icon="business-outline" title="No service sites yet" text="Add a service site to request maintenance." action="Add site" onAction={() => setEditor("new")} />
      : <View style={s.gap12}>{sites.map((site) => <Card key={site.id} style={s.cardGap}><View style={s.between}><View style={{ flex: 1, paddingRight: 8 }}><Text style={s.h3}>{site.site_name}</Text><Text style={s.muted}>{[site.address_line, site.city, site.state, site.postal_code].filter(Boolean).join(", ")}</Text>{site.contact_name ? <Text style={s.tiny}>{site.contact_name}{site.contact_phone ? ` · ${site.contact_phone}` : ""}</Text> : null}</View></View><View style={[s.row, s.gap8]}><Button testID={`site-edit-${site.id}`} title="Edit" secondary icon="create-outline" onPress={() => setEditor({ id: site.id, site_name: site.site_name, address_line: site.address_line ?? "", city: site.city ?? "", state: site.state ?? "", postal_code: site.postal_code ?? "", contact_name: site.contact_name ?? "", contact_phone: site.contact_phone ?? "", notes: site.notes ?? "", latitude: site.latitude != null ? Number(site.latitude) : undefined, longitude: site.longitude != null ? Number(site.longitude) : undefined })} /><Button testID={`site-delete-${site.id}`} title="Remove" secondary danger icon="trash-outline" onPress={() => remove(site)} /></View></Card>)}</View>}
    {editor ? <SiteEditor initial={editor === "new" ? null : editor} onClose={() => setEditor(null)} onSaved={() => { load(); refreshSites(); }} /> : null}
  </ScrollView>;
}

const WIZARD_STEPS = ["Service", "Site", "Details", "Schedule", "Review"];

function CreateRequest({ go, sites, preselect, onCreated, wizardState, setWizardState }: { go: (s: Screen) => void; sites: any[]; preselect?: string; onCreated: (jobId: string) => void; wizardState: { step: number; service: string; siteId: string; title: string; description: string; notes: string; priority: string; date: Date | undefined } | null; setWizardState: (state: any) => void }) {
  const s = useStyles();
  const [step, setStep] = useState(wizardState?.step ?? 0);
  const [service, setService] = useState(wizardState?.service ?? preselect ?? "");
  const [siteId, setSiteId] = useState(wizardState?.siteId ?? "");
  const [title, setTitle] = useState(wizardState?.title ?? ""); const [description, setDescription] = useState(wizardState?.description ?? ""); const [notes, setNotes] = useState(wizardState?.notes ?? "");
  const [priority, setPriority] = useState(wizardState?.priority ?? "NORMAL");
  const [date, setDate] = useState<Date | undefined>(wizardState?.date);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const site = sites.find((x) => x.id === siteId);
  const canNext = step === 0 ? !!service : step === 1 ? !!siteId : step === 2 ? title.trim().length >= 3 : true;

  // Save wizard state on every change
  useEffect(() => {
    setWizardState({ step, service, siteId, title, description, notes, priority, date });
  }, [step, service, siteId, title, description, notes, priority, date, setWizardState]);

  useEffect(() => {
    skillsService.list().then((data) => setServices((data as any).map((s: any) => s.name))).catch(() => {});
  }, []);
  const submit = async () => {
    setBusy(true); setError("");
    let scheduledAt: string | undefined;
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      scheduledAt = `${year}-${month}-${day}T09:00:00.000Z`;
    }
    try {
      const result = await customerService.createJob({ service_type: service, site_id: siteId, title: title.trim(), problem_description: description || undefined, notes: notes || undefined, priority, scheduled_at: scheduledAt, photo_urls: [] });
      onCreated(result.job.id);
      setWizardState(null); // Clear wizard state after successful submission
    } catch (e: any) { setError(e?.message ?? "Could not submit request."); setBusy(false); }
  };
  const formatDateDisplay = (d: Date) => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-IN', options);
  };
  return <View style={s.page}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Header title="New service request" subtitle={`Step ${step + 1} of 5 · ${WIZARD_STEPS[step]}`} onBack={() => (step === 0 ? go("home") : setStep(step - 1))} />
    <View style={[s.row, { gap: 5, marginBottom: 18 }]}>{WIZARD_STEPS.map((_, i) => <View key={i} style={[s.stepDot, i <= step && s.stepDotActive]} />)}</View>
    {step === 0 ? <View style={s.gap12}><Text style={s.h2}>What do you need help with?</Text><View style={s.rowWrap}>{services.map((x) => <Pressable key={x} testID={`wizard-service-${x.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`} onPress={() => setService(x)} style={[s.chip, service === x && s.chipSelected]}><Text style={[s.chipText, service === x && s.chipSelectedText]}>{x}</Text></Pressable>)}</View></View> : null}
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
    {step === 3 ? <View style={s.gap16}><Text style={s.h2}>Preferred date</Text>
      <DatePickerField
        testID="wizard-date"
        label="Preferred date"
        value={date}
        onChange={setDate}
        placeholder="Select preferred date"
      />
      <Text style={s.muted}>Optional — leave empty for the earliest available slot.</Text>
    </View> : null}
    {step === 4 ? <View style={s.gap12}><Text style={s.h2}>Review your request</Text>
      <Card style={s.cardGap}>
        <View style={s.between}><Text style={s.muted}>Service</Text><Text style={s.h3}>{service}</Text></View><View style={s.divider} />
        <View style={s.between}><Text style={s.muted}>Site</Text><Text style={[s.h3, { flexShrink: 1, textAlign: "right" }]}>{site?.site_name}</Text></View><View style={s.divider} />
        <View style={s.between}><Text style={s.muted}>Priority</Text><Badge text={priority} tone={priority === "URGENT" ? "urgent" : priority === "HIGH" ? "warning" : "default"} /></View><View style={s.divider} />
        <Text style={s.muted}>Title</Text><Text style={s.h3}>{title}</Text>
        {description ? <><Text style={s.muted}>Problem</Text><Text style={s.body}>{description}</Text></> : null}
        {date ? <><View style={s.divider} /><View style={s.between}><Text style={s.muted}>Preferred</Text><Text style={s.body}>{formatDateDisplay(date)}</Text></View></> : null}
      </Card>
      {site ? <Card style={{ padding: 12, gap: 4 }}><Text style={s.h3}>{site.site_name}</Text><Text style={s.muted}>{[site.address_line, site.city, site.state, site.postal_code].filter(Boolean).join(", ")}</Text>{site.latitude && site.longitude ? <Text style={s.tiny}>Coordinates: {Number(site.latitude).toFixed(6)}, {Number(site.longitude).toFixed(6)}</Text> : null}</Card> : null}
      {error ? <Text testID="wizard-error" style={{ color: "#C94A4A", fontSize: 13 }}>{error}</Text> : null}
    </View> : null}
  </ScrollView>
    <View style={{ padding: 20, paddingBottom: 28, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5EDF5" }}><View style={[s.row, s.gap8]}>
      {step > 0 ? <Button testID="wizard-back" title="Back" secondary onPress={() => setStep(step - 1)} /> : null}
      <View style={{ flex: 1 }}>{step < 4 ? <Button testID="wizard-next" title="Continue" icon="arrow-forward" disabled={!canNext} onPress={() => setStep(step + 1)} /> : <Button testID="wizard-submit" title="Submit Request" icon="checkmark" onPress={submit} loading={busy} />}</View>
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
    poll();
    const timer = setInterval(poll, 15000);
    customerService.job(jobId).then(setJob).catch(() => {});
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        poll();
      }
    });
    return () => { live = false; clearInterval(timer); subscription.remove(); };
  }, [jobId, go]);
  const cancel = () => Alert.alert("Cancel request?", "You can create a new request anytime.", [{ text: "Keep" }, { text: "Cancel request", style: "destructive", onPress: async () => { try { await customerService.cancelJob(jobId); go("requests"); } catch (e: any) { Alert.alert("Could not cancel", e?.message ?? "Please try again."); } } }]);
  return <ScrollView contentContainerStyle={[s.content, { flexGrow: 1, justifyContent: "center" }]}>
    <View style={{ alignItems: "center", gap: 14 }}>
      <View style={[s.avatar, { width: 84, height: 84, borderRadius: 42, backgroundColor: "#EAF4FF" }]}><ActivityIndicator color="#0B63CE" size="large" /></View>
      <Text style={[s.h1, { textAlign: "center" }]}>Finding a service professional</Text>
      <Text style={[s.body, { textAlign: "center", maxWidth: 320 }]}>We&apos;re matching your request with online professionals near your site. This usually takes a few minutes.</Text>
    </View>
    {job ? <Card style={{ marginTop: 26, gap: 10 }}><View style={s.between}><Text style={s.h3}>{job.title}</Text><StatusBadge status={status} /></View><Text style={s.muted}>{job.service_type} · {job.site_name_ref ?? job.site_name}</Text><Text style={s.muted}>{formatPreferredDate(job.scheduled_at)}</Text></Card> : null}
    {error ? <View style={{ marginTop: 14 }}><ErrorState message={error} onRetry={() => setError("")} /></View> : null}
    <View style={{ gap: 10, marginTop: 24 }}><Button testID="searching-view" title="View request" secondary onPress={() => go("request")} /><Button testID="searching-cancel" title="Cancel request" secondary danger onPress={cancel} /></View>
  </ScrollView>;
}

function Timeline({ status }: { status: string }) {
  const s = useStyles();
  if (status === "CANCELLED") {
    return <View style={{ gap: 6 }}>
      <View style={s.row}><View style={{ alignItems: "center", width: 22 }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#C94A4A", borderWidth: 0 }} /></View><Text style={[s.muted, { color: "#0B1F3A", fontWeight: "700" }]}>Requested</Text></View>
      <View style={s.row}><View style={{ alignItems: "center", width: 22 }}><View style={{ width: 2, height: 16, backgroundColor: "#DCE5EF" }} /></View></View>
      <View style={s.row}><View style={{ alignItems: "center", width: 22 }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#C94A4A", borderWidth: 0 }} /></View><Text style={[s.muted, { color: "#0B1F3A", fontWeight: "700" }]}>Cancelled</Text></View>
    </View>;
  }
  const activeIndex = TIMELINE.indexOf(status === "OFFERED" ? "REQUESTED" : status);
  const labels = ["Requested", "Assigned", "Completed"];
  const displayTimeline = status === "CANCELLED" ? ["REQUESTED", "CANCELLED"] : TIMELINE.slice(0, 3);
  const displayLabels = status === "CANCELLED" ? ["Requested", "Cancelled"] : labels;
  return <View style={{ gap: 6 }}>{displayTimeline.map((step, i) => { 
    const done = activeIndex >= 0 && i <= activeIndex;
    const color = step === "CANCELLED" ? "#C94A4A" : (done ? "#0B63CE" : "#DCE5EF");
    const lineColor = step === "CANCELLED" ? "#DCE5EF" : (done && i < activeIndex ? "#0B63CE" : "#DCE5EF");
    return <View key={step} style={s.row}><View style={{ alignItems: "center", width: 22 }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, borderWidth: done ? 0 : 2, borderColor: "#AFC6DC" }} />{i < displayTimeline.length - 1 ? <View style={{ width: 2, height: 16, backgroundColor: lineColor }} /> : null}</View><Text style={[s.muted, done && { color: "#0B1F3A", fontWeight: "700" }]}>{displayLabels[i]}</Text></View>; 
  })}</View>;
}

function RequestDetail({ go, jobId, onConfirm, refreshTrigger, onRefresh, onCancel }: { go: (s: Screen) => void; jobId: string; onConfirm: () => void; refreshTrigger?: number; onRefresh?: () => void; onCancel?: () => void }) {
  const s = useStyles();
  const [job, setJob] = useState<any>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [viewer, setViewer] = useState<string | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
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
  // Immediate refetch when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        load(true);
      }
    });
    return () => subscription.remove();
  }, [load]);
  // Refresh when refreshTrigger changes
  useEffect(() => { if (refreshTrigger && refreshTrigger > 0) load(true); }, [refreshTrigger]);
  if (loading) return <View style={[s.page, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color="#0B63CE" size="large" /></View>;
  if (error || !job) return <ScrollView contentContainerStyle={s.content}><Header title="Request" onBack={() => go("requests")} /><ErrorState message={error || "Request not found."} onRetry={() => load()} /></ScrollView>;
  const photos = [...(job.attachments ?? []).map((p: any) => ({ ...p, group: "Problem" })), ...(job.photos ?? [])];
  const progress = job.progress?.progress_percent ?? 0;
  return <ScrollView contentContainerStyle={s.content}>
    <Header title={job.job_number} subtitle="Request details" onBack={() => go("requests")} />
    <Card style={[s.cardGap, job.status === "WAITING_CUSTOMER" && { borderColor: "#C8871A", borderWidth: 2 }]}>
      <View style={s.between}><View style={{ flex: 1, paddingRight: 8 }}><Text style={s.h2}>{job.title}</Text><Text style={s.muted}>{job.service_type}</Text></View><StatusBadge status={job.status} /></View>
      <Text style={s.muted}>{job.site_name_ref ?? job.site_name} · {[job.city, job.state].filter(Boolean).join(", ")}</Text>
      {job.scheduled_at ? <Text style={s.muted}>Preferred: {formatPreferredDate(job.scheduled_at)}</Text> : null}
      {job.status === "WAITING_CUSTOMER" ? <Button testID="request-confirm-cta" title="Review & Confirm Completion" icon="checkmark-circle" onPress={onConfirm} /> : null}
      {["REQUESTED", "OFFERED"].includes(job.status) ? <Button testID="request-cancel" title="Cancel request" secondary danger onPress={() => setCancelModalVisible(true)} /> : null}
    </Card>
    <SectionTitle title="Progress" />
    <Card style={s.cardGap}><Timeline status={job.status} />{job.status === "IN_PROGRESS" || progress > 0 ? <><View style={s.divider} /><View style={s.between}><Text style={s.h3}>Work completion</Text><Text style={s.h3}>{progress}%</Text></View><Progress value={progress} />{job.progress?.current_task ? <Text style={s.muted}>Current task · {job.progress.current_task}</Text> : null}{job.progress?.notes ? <Text style={s.tiny}>Note: {job.progress.notes}</Text> : null}</> : null}</Card>
    {job.worker ? <><SectionTitle title="Your professional" /><Card style={s.cardGap}><View style={s.row}><View style={s.avatar}>{job.worker.profile_photo_url ? <Photo path={job.worker.profile_photo_url} style={{ width: 46, height: 46, borderRadius: 23 }} /> : <Text style={s.avatarText}>{initials(job.worker.full_name)}</Text>}</View><View style={{ marginLeft: 12, flex: 1 }}><Text style={s.h3}>{job.worker.full_name}</Text><Text style={s.muted}>{job.worker.primary_trade ?? "Service professional"}{job.worker.years_experience ? ` · ${job.worker.years_experience} yrs` : ""}</Text><View style={s.row}><Icon name="star" size={13} color="#E5A523" /><Text style={s.tiny}> {Number(job.worker.rating_avg ?? 0).toFixed(1)} ({job.worker.rating_count ?? 0} jobs)</Text></View></View></View><View style={[s.row, s.gap8]}><Button testID="request-call-worker" title="Call" secondary icon="call-outline" onPress={() => job.worker.phone ? Linking.openURL(`tel:${job.worker.phone}`) : Alert.alert("Unavailable", "Phone number not available.")} /><Button testID="request-chat-worker" title="Chat" secondary icon="chatbubble-outline" onPress={() => go("chat")} /></View></Card></> : null}
    <SectionTitle title="Location" />
    <Card style={s.cardGap}><Text style={s.h3}>{job.site_name_ref ?? job.site_name ?? "Site"}</Text><Text style={s.muted}>{[job.address_line, job.city, job.state, job.postal_code].filter(Boolean).join(", ")}</Text>{job.site_contact_name ? <Text style={s.tiny}>Contact: {job.site_contact_name}{job.site_contact_phone ? ` · ${job.site_contact_phone}` : ""}</Text> : null}{job.latitude && job.longitude ? <Text style={s.tiny}>Coordinates: {Number(job.latitude).toFixed(6)}, {Number(job.longitude).toFixed(6)}</Text> : null}</Card>
    {job.problem_description ? <><SectionTitle title="Problem" /><Card><Text style={s.body}>{job.problem_description}</Text>{job.description ? <Text style={[s.muted, { marginTop: 6 }]}>{job.description}</Text> : null}</Card></> : null}
    {photos.length ? <><SectionTitle title="Photos" /><Card><View style={s.rowWrap}>{photos.map((p: any, i: number) => <Photo key={p.id ?? i} path={p.file_url} style={[s.photo, { marginRight: 8, marginBottom: 8 }]} onPress={() => setViewer(p.file_url)} />)}</View>{["BEFORE", "DURING", "AFTER"].map((group) => { const items = (job.photos ?? []).filter((p: any) => p.photo_type === group); return items.length ? <Text key={group} style={[s.tiny, { marginTop: 4 }]}>{group}: {items.length} photo(s)</Text> : null; })}</Card></> : null}
    {(job.materials ?? []).length ? <><SectionTitle title="Materials used" /><Card>{job.materials.map((m: any) => <View key={m.id} style={[s.between, s.listRow]}><View><Text style={s.h3}>{m.name}</Text><Text style={s.muted}>{Number(m.quantity)} {m.unit}</Text></View><Text style={s.h3}>₹{Number(m.total_amount).toLocaleString("en-IN")}</Text></View>)}</Card></> : null}
    {(job.timeline ?? []).length ? <><SectionTitle title="Status history" /><Card>{job.timeline.map((t: any, i: number) => {
      const mappedStatus = t.new_status === "EN_ROUTE" || t.new_status === "ARRIVED" || t.new_status === "ACCEPTED" ? "ASSIGNED" : t.new_status;
      return <View key={i} style={[s.between, { minHeight: 34 }]}><Text style={s.body}>{(STATUS_META[mappedStatus] ?? { label: mappedStatus }).label}</Text><Text style={s.tiny}>{formatDateTime(t.created_at)}</Text></View>;
    })}</Card></> : null}
    {job.confirmation ? <><SectionTitle title="Confirmation" /><Card style={s.cardGap}><View style={s.row}><Icon name="checkmark-circle" color="#15966D" /><Text style={s.h3}>  Confirmed by {job.confirmation.customer_name}</Text></View><Stars value={job.confirmation.rating ?? 0} size={20} />{job.confirmation.comments ? <Text style={s.body}>“{job.confirmation.comments}”</Text> : null}</Card></> : null}
    <View style={{ marginTop: 18 }}><Button testID="request-support" title="Need help with this job?" secondary icon="help-circle-outline" onPress={() => go("support")} /></View>
    <Modal visible={!!viewer} transparent onRequestClose={() => setViewer(null)}><Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,.92)", alignItems: "center", justifyContent: "center" }} onPress={() => setViewer(null)}>{viewer ? <Photo path={viewer} style={{ width: "92%", height: "70%", borderRadius: 12, overflow: "hidden" }} /> : null}</Pressable></Modal>
    <Modal visible={cancelModalVisible} transparent animationType="slide">
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={() => setCancelModalVisible(false)}>
        <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#0B1F3A", marginBottom: 8 }}>Cancel request?</Text>
          <Text style={{ fontSize: 14, color: "#6B7A8F", marginBottom: 20 }}>Please tell us why you're cancelling this request.</Text>
          <View style={{ gap: 12 }}>
            {["Issue resolved", "Found alternative provider", "Timing doesn't work", "Cost concern", "Other"].map((reason) => (
              <Pressable key={reason} testID={`cancel-reason-${reason.toLowerCase().replace(/ /g, "-")}`} onPress={() => { setSelectedReason(reason); setOtherReason(""); }} style={[{ padding: 16, borderRadius: 12, borderWidth: 2, borderColor: selectedReason === reason ? "#0B63CE" : "#E5EDF5", backgroundColor: selectedReason === reason ? "#EAF4FF" : "#FFFFFF" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 15, color: "#0B1F3A", fontWeight: "600" }}>{reason}</Text>
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: selectedReason === reason ? "#0B63CE" : "#DCE5EF", backgroundColor: selectedReason === reason ? "#0B63CE" : "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                    {selectedReason === reason && <Icon name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
          {selectedReason === "Other" && (
            <TextInput
              testID="cancel-other-reason"
              style={{ marginTop: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#E5EDF5", backgroundColor: "#F5F8FC", fontSize: 15, color: "#0B1F3A" }}
              placeholder="Please specify the reason"
              placeholderTextColor="#8AA0B5"
              value={otherReason}
              onChangeText={setOtherReason}
              multiline
              numberOfLines={3}
            />
          )}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
            <View style={{ flex: 1 }}>
              <Button testID="cancel-keep" title="Keep request" secondary onPress={() => setCancelModalVisible(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button testID="cancel-confirm" title="Cancel request" danger loading={cancelling} onPress={async () => {
              if (!selectedReason) { Alert.alert("Please select a reason"); return; }
              if (selectedReason === "Other" && !otherReason.trim()) { Alert.alert("Please specify the reason"); return; }
              setCancelling(true);
              try {
                const finalReason = selectedReason === "Other" ? otherReason.trim() : selectedReason;
                await customerService.cancelJob(job.id, { reason: finalReason });
                setCancelModalVisible(false);
                setSelectedReason("");
                setOtherReason("");
                onRefresh?.();
                onCancel?.();
              } catch (e: any) {
                Alert.alert("Could not cancel", e?.message ?? "Please try again.");
              } finally {
                setCancelling(false);
              }
            }} />
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  </ScrollView>;
}

function Confirm({ go, jobId, profile, onDone, onRefresh }: { go: (s: Screen) => void; jobId: string; profile: any; onDone: () => void; onRefresh: () => void }) {
  const s = useStyles();
  const [job, setJob] = useState<any>(null); const [rating, setRating] = useState(5); const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { customerService.job(jobId).then(setJob).catch(() => {}); }, [jobId]);
  const submit = async () => {
    setBusy(true); setError("");
    try { await customerService.confirm(jobId, { customer_name: profile?.contact_person || profile?.full_name || "Customer", rating, comments: comments || undefined }); onDone(); onRefresh(); }
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

function JobsList({ go, mode, onSelect, refreshTrigger }: { go: (s: Screen) => void; mode: "requests" | "history"; onSelect: (id: string) => void; refreshTrigger?: number }) {
  const s = useStyles();
  const tabs = mode === "requests" ? ["ACTIVE"] : ["COMPLETED", "CANCELLED", "DISPUTED"];
  const [tab, setTab] = useState(tabs[0]); const [query, setQuery] = useState("");
  const [items, setItems] = useState<any[]>([]); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true); const [more, setMore] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async (offset = 0) => {
    if (offset === 0) { setLoading(true); } else { setMore(true); } setError("");
    try { const r = await customerService.jobs(tab as "ACTIVE" | "COMPLETED" | "CANCELLED" | "DISPUTED", query, 10, offset); setItems((p) => (offset === 0 ? r.items : [...p, ...r.items])); setTotal(r.total); }
    catch (e: any) { setError(e?.message ?? "Could not load requests."); } finally { setLoading(false); setMore(false); }
  }, [tab, query]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const t = setTimeout(() => load(0), 300);
    // Poll every 15 seconds for live updates
    const interval = setInterval(() => load(0), 15000);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [load]);
  useEffect(() => { if (refreshTrigger && refreshTrigger > 0) load(0); }, [refreshTrigger, load]);
  return <ScrollView contentContainerStyle={s.content}>
    <Header title={mode === "requests" ? "My requests" : "Request history"} subtitle={mode === "requests" ? "Active and upcoming service" : "Completed, cancelled and disputed"} />
    {tabs.length > 1 ? <View style={s.rowWrap}>{tabs.map((x) => <Pressable key={x} testID={`history-tab-${x.toLowerCase()}`} onPress={() => setTab(x)} style={[s.chip, tab === x && s.chipSelected]}><Text style={[s.chipText, tab === x && s.chipSelectedText]}>{x.charAt(0) + x.slice(1).toLowerCase()}</Text></Pressable>)}</View> : null}
    <View style={[s.input, s.row, { marginBottom: 14 }]}><Icon name="search" size={17} /><TextInput testID="jobs-search" accessibilityLabel="Search requests" value={query} onChangeText={setQuery} placeholder="Search service or site" placeholderTextColor="#8AA0B5" style={{ flex: 1, color: "#0B1F3A", marginLeft: 8 }} /></View>
    {loading ? <Card style={{ alignItems: "center", paddingVertical: 24 }}><ActivityIndicator color="#0B63CE" /></Card>
      : error ? <ErrorState message={error} onRetry={() => load(0)} />
      : items.length === 0 ? <Empty testID="jobs-empty" icon="document-text-outline" title={mode === "requests" ? "No active service requests" : `No ${tab.toLowerCase()} requests`} text={mode === "requests" ? "Create a request and we'll match a professional near your site." : "Your past requests will appear here."} action={mode === "requests" ? "Create request" : undefined} onAction={() => go("create")} />
      : <View style={s.gap12}>{items.map((job) => <Pressable key={job.id} testID={`job-row-${job.job_number}`} onPress={() => onSelect(job.id)}><Card style={s.cardGap}><View style={s.between}><View style={{ flex: 1, paddingRight: 8 }}><Text style={s.h3}>{job.title}</Text><Text style={s.muted}>{job.service_type} · {job.site_name_ref ?? job.site_name}</Text><Text style={s.tiny}>{formatDateTime(job.created_at)}</Text></View><StatusBadge status={job.status} /></View>{job.worker_name ? <View style={s.row}><Icon name="person-circle-outline" size={15} color="#0B63CE" /><Text style={s.muted}>  {job.worker_name}</Text></View> : null}</Card></Pressable>)}
        {items.length < total ? <Button testID="jobs-load-more" title={more ? "Loading…" : `Load more (${total - items.length})`} secondary onPress={() => load(items.length)} disabled={more} /> : null}</View>}
  </ScrollView>;
}

function Notifications({ go, onOpenJob, onRead }: { go: (s: Screen) => void; onOpenJob: (id: string) => void; onRead: (all: boolean) => void }) {
  const s = useStyles();
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(() => { setLoading(true); setError(""); notificationService.list().then(setItems as any).catch((e) => setError(e?.message ?? "Could not load notifications.")).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Poll every 15 seconds for live updates
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);
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
      : <View style={s.gap8}>{items.map((n) => <Pressable key={n.id} testID={`notification-${n.id}`} onPress={() => open(n)}><Card style={[s.row, { gap: 12, borderColor: n.is_read ? "#DCE5EF" : "#9EC7EE" }]}><View style={[s.avatar, { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EAF4FF" }]}><Icon name={iconFor(n.type)} color="#0B63CE" size={18} /></View><View style={{ flex: 1, gap: 3 }}><View style={s.between}><Text style={s.h3}>{n.title}</Text>{!n.is_read ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#0B63CE" }} /> : null}</View><Text style={s.body}>{n.message}</Text><Text style={s.tiny}>{formatDateTime(n.created_at)}</Text></View></Card></Pressable>)}
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
    <Card style={{ backgroundColor: "#0B1F3A", borderColor: "#0B1F3A", gap: 8 }}><Text style={{ color: "#A9D6FF", fontSize: 11, fontWeight: "800" }}>SUPPORT HOURS · 9 AM – 9 PM</Text><Text style={{ color: "#FFFFFF", fontSize: 21, fontWeight: "800" }}>Need help with a service?</Text><Button testID="support-call" title="Call Support" secondary icon="call-outline" onPress={() => Linking.openURL(`tel:${process.env.EXPO_PUBLIC_SUPPORT_PHONE || "+919876543210"}`)} /></Card>
    <SectionTitle title="Your tickets" action="New ticket" onAction={() => setModal(true)} />
    {loading ? <Card style={{ alignItems: "center", paddingVertical: 24 }}><ActivityIndicator color="#0B63CE" /></Card>
      : error ? <ErrorState message={error} onRetry={load} />
      : tickets.length === 0 ? <Empty testID="tickets-empty" icon="help-buoy-outline" title="No support tickets" text="Raise an issue and our team will get back to you." action="Raise an issue" onAction={() => setModal(true)} />
      : <View style={s.gap8}>{tickets.map((t) => <Pressable key={t.id} testID={`ticket-${t.ticket_number}`} onPress={() => openTicket(String(t.id))}><Card><View style={s.between}><View style={{ flex: 1, paddingRight: 8 }}><Text style={s.h3}>{t.ticket_number}</Text><Text style={s.muted}>{t.subject}</Text><Text style={s.tiny}>{formatDateTime(t.created_at)}</Text></View><Badge text={t.status} tone={t.status === "RESOLVED" || t.status === "CLOSED" ? "success" : "warning"} /></View></Card></Pressable>)}</View>}
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
      {(detail.messages ?? []).map((m: any) => <View key={m.id} style={[s.card, { backgroundColor: m.sender_type === "CUSTOMER" ? "#EAF4FF" : "#F5F8FC" }]}><Text style={s.body}>{m.message}</Text><Text style={s.tiny}>{m.sender_type === "CUSTOMER" ? "You" : "Support"} · {formatDateTime(m.created_at)}</Text></View>)}
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

function Chat({ go, jobId }: { go: (s: Screen) => void; jobId: string }) {
  const s = useStyles();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<any>(null);

  const loadConversation = useCallback(async () => {
    try {
      const conv = await chatService.getConversation(jobId);
      setConversation(conv.data);
    } catch (e: any) {
      setError(e?.message ?? "Could not load conversation.");
    }
  }, [jobId]);

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await chatService.getMessages(jobId);
      setMessages(msgs.data.messages);
    } catch (e: any) {
      setError(e?.message ?? "Could not load messages.");
    }
  }, [jobId]);

  useEffect(() => {
    setLoading(true);
    loadConversation();
    loadMessages().finally(() => setLoading(false));
  }, [loadConversation, loadMessages]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages();
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [loadMessages]);

  const sendMessage = async () => {
    if (!messageText.trim() || sending) return;
    setSending(true);
    try {
      const result = await chatService.sendMessage(jobId, messageText.trim());
      setMessages((prev) => [...prev, result.data]);
      setMessageText("");
      // Scroll to bottom
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      setError(e?.message ?? "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <View style={[s.page, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color="#0B63CE" size="large" /></View>;
  if (error) return <ScrollView contentContainerStyle={s.content}><Header title="Chat" onBack={() => go("request")} /><ErrorState message={error} onRetry={() => { setError(""); loadConversation(); loadMessages(); }} /></ScrollView>;

  const isCustomer = (msg: ChatMessage) => msg.sender_role === "CUSTOMER";

  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}>
    <View style={s.page}>
      <Header title="Chat" subtitle={conversation?.worker?.full_name ?? "Service Professional"} onBack={() => go("request")} />
      <ScrollView ref={scrollViewRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 80 }}>
        {messages.length === 0 ? <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}><Icon name="chatbubble-outline" size={48} color="#8AA0B5" /><Text style={[s.muted, { marginTop: 12 }]}>No messages yet. Start the conversation!</Text></View> : messages.map((msg) => (
          <View key={msg.id} style={[{ marginVertical: 4 }, isCustomer(msg) ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}>
            <View style={[s.card, { maxWidth: "80%", padding: 12, borderRadius: 16 }, isCustomer(msg) ? { backgroundColor: "#0B63CE" } : { backgroundColor: "#F5F8FC" }]}>
              <Text style={[s.body, isCustomer(msg) ? { color: "#FFFFFF" } : { color: "#0B1F3A" }]}>{msg.message_text}</Text>
              <Text style={[s.tiny, isCustomer(msg) ? { color: "#A9D6FF" } : { color: "#8AA0B5" }, { marginTop: 4 }]}>{formatDateTime(msg.created_at)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5EDF5" }}>
        <View style={[s.row, s.gap8]}>
          <TextInput
            testID="chat-input"
            accessibilityLabel="Message"
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor="#8AA0B5"
            style={[s.input, { flex: 1 }]}
            multiline
            maxLength={2000}
          />
          <Button testID="chat-send" title="Send" onPress={sendMessage} loading={sending} disabled={!messageText.trim()} />
        </View>
      </View>
    </View>
  </KeyboardAvoidingView>;
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [navigationHistory, setNavigationHistory] = useState<Screen[]>(["welcome"]);
  const [wizardState, setWizardState] = useState<{ step: number; service: string; siteId: string; title: string; description: string; notes: string; priority: string; date: Date | undefined } | null>(null);
  const hasBootstrapped = useRef(false);

  const say = (message: string) => { setToast(message); setTimeout(() => setToast(""), 2200); };

  const bootstrap = useCallback(async () => {
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    try {
      const [profileData, siteData, unreadData, activeData] = await Promise.all([
        customerService.profile(), customerService.sites(), customerService.unreadCount(), customerService.jobs("ACTIVE", "", 1, 0),
      ]);
      setProfile(profileData); setSites(siteData); setUnread(unreadData.unread); setActiveJobId(activeData.items[0]?.id ?? "");
      setAuthed(true);
    } catch (e) {
      console.error("Customer bootstrap fetch error:", e);
      throw e;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await sessionStorage.read();
      if (!token) { setLoading(false); return; }
      try {
        const me = await customerAuth.me() as any;
        if (me?.role === "WORKER") { router.replace("/worker" as any); return; }
        await bootstrap(); setScreen("home");
      } catch (e) {
        console.error("Customer bootstrap error:", e);
        await sessionStorage.clear();
      }
      setLoading(false);
    })();
  }, []);

  const refreshSites = useCallback(() => { customerService.sites().then(setSites).catch(() => {}); setRefreshTrigger((prev) => prev + 1); }, []);

  const go = (next: Screen, service?: string, replace: boolean = false) => {
    if (next === "create") setPreselect(service);
    if (next === "home") customerService.unreadCount().then((r) => setUnread(r.unread)).catch(() => {});
    if (next === "request" && !selectedJobId && activeJobId) setSelectedJobId(activeJobId);
    
    if (replace) {
      setNavigationHistory(prev => [...prev.slice(0, -1), next]);
    } else {
      setNavigationHistory(prev => [...prev, next]);
    }
    setScreen(next);
  };

  const goBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = navigationHistory.slice(0, -1);
      setNavigationHistory(newHistory);
      setScreen(newHistory[newHistory.length - 1]);
    } else {
      // At root, go to home as fallback
      setScreen("home");
    }
  };

  const selectJob = (id: string) => { setSelectedJobId(id); setScreen("request"); };
  const signOut = async () => { await customerAuth.logout(); setAuthed(false); setProfile(null); router.replace("/login" as any); };

  if (loading) return <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color="#0B63CE" size="large" /><Text style={[s.muted, { marginTop: 12 }]}>Preparing your customer portal…</Text></View>;

  let content: React.ReactNode = null;
  if (screen === "welcome") content = <Welcome go={go} />;
  if (screen === "login") content = <Login go={go} onSignedIn={async () => { await bootstrap(); setScreen("home"); }} />;
  if (screen === "register") content = <Register go={go} onRegistered={async () => { await bootstrap(); setScreen("setup"); say("Account created"); router.replace("/customer" as any); }} />;
  if (screen === "setup") content = <Setup go={go} profile={profile} onSaved={setProfile} />;
  if (screen === "home") content = <Home go={go} profile={profile} unread={unread} onSelectJob={selectJob} refreshTrigger={refreshTrigger} />;
  if (screen === "sites") content = <Sites go={go} goBack={goBack} refreshSites={refreshSites} />;
  if (screen === "create") content = <CreateRequest go={go} sites={sites} preselect={preselect} onCreated={(id) => { setSelectedJobId(id); setActiveJobId(id); setPreselect(undefined); refreshSites(); setRefreshTrigger((prev: number) => prev + 1); setScreen("home"); say("Request created"); }} wizardState={wizardState} setWizardState={setWizardState} />;
  if (screen === "searching") content = <Searching go={go} jobId={selectedJobId} />;
  if (screen === "request") content = selectedJobId ? <RequestDetail go={go} jobId={selectedJobId} onConfirm={() => setScreen("confirm")} refreshTrigger={refreshTrigger} onRefresh={() => setRefreshTrigger((prev: number) => prev + 1)} onCancel={() => { setRefreshTrigger((prev: number) => prev + 1); setScreen("history"); }} /> : <ScrollView contentContainerStyle={s.content}><Header title="Active request" /><Empty testID="active-empty" icon="pulse-outline" title="No active service requests" text="When you create a request, you can track it live here." action="Create request" onAction={() => go("create")} /></ScrollView>;
  if (screen === "confirm") content = <Confirm go={go} jobId={selectedJobId} profile={profile} onDone={() => { setScreen("request"); say("Thank you! Work confirmed."); }} onRefresh={() => setRefreshTrigger((prev: number) => prev + 1)} />;
  if (screen === "requests") content = <JobsList key="jobs-requests" go={go} mode="requests" onSelect={selectJob} refreshTrigger={refreshTrigger} />;
  if (screen === "history") content = <JobsList key="jobs-history" go={go} mode="history" onSelect={selectJob} refreshTrigger={refreshTrigger} />;
  if (screen === "notifications") content = <Notifications go={go} onOpenJob={selectJob} onRead={(all) => setUnread((u) => (all ? 0 : Math.max(0, u - 1)))} />;
  if (screen === "support") content = <Support go={go} jobId={selectedJobId || undefined} />;
  if (screen === "profile") content = <Profile go={go} profile={profile} onEdit={() => setScreen("setup")} />;
  if (screen === "settings") content = <Settings go={go} signOut={signOut} />;
  if (screen === "chat") content = selectedJobId ? <Chat go={go} jobId={selectedJobId} /> : <ScrollView contentContainerStyle={s.content}><Header title="Chat" /><Empty testID="chat-empty" icon="chatbubble-outline" title="No active job" text="Open a job request to start chatting with your service professional." action="View requests" onAction={() => go("requests")} /></ScrollView>;

  return <AppShell screen={screen} go={go}>{content}{toast ? <View style={s.toast}><Text style={s.toastText}>{toast}</Text></View> : null}</AppShell>;
}

