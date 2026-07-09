import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/page-header";
import { profileService, authService, type UserProfile } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { toast } from "sonner";
import {
  User,
  Laptop,
  Bell,
  Globe,
  Shield,
  Share2,
  Lock,
  Sparkles,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Download,
  Info,
  Check,
  Link2,
  LockKeyhole,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

const avatarPresets = [
  "bg-gradient-to-tr from-violet-500 to-indigo-500",
  "bg-gradient-to-tr from-rose-500 to-orange-500",
  "bg-gradient-to-tr from-emerald-500 to-teal-500",
  "bg-gradient-to-tr from-amber-400 to-orange-500",
  "bg-gradient-to-tr from-blue-600 to-cyan-500",
  "bg-gradient-to-tr from-pink-500 to-purple-600",
];

const languageOptions = [
  { value: "en", label: "English (US)" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "zh", label: "Mandarin" },
];

const timezoneOptions = [
  { value: "UTC", label: "Coordinated Universal Time (UTC)" },
  { value: "EST", label: "Eastern Standard Time (EST)" },
  { value: "GMT", label: "Greenwich Mean Time (GMT)" },
  { value: "CET", label: "Central European Time (CET)" },
  { value: "IST", label: "Indian Standard Time (IST)" },
];

const aiEngineOptions = [
  { value: "gemini-pro", label: "Gemini 1.5 Pro (Recommended)" },
  { value: "gemini-flash", label: "Gemini 1.5 Flash (Faster)" },
];

const summaryLengthOptions = [
  { value: "short", label: "Short (Bullet points)" },
  { value: "medium", label: "Medium (Structured summary)" },
  { value: "long", label: "Long (Deep dive essay style)" },
];

function SettingsPage() {
  const user = useUser();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "profile" | "appearance" | "notifications" | "localization" | "security" | "connections" | "privacy" | "ai"
  >("profile");

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState(() => localStorage.getItem("studygpt.settings.bio") || "");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Theme states
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("studygpt.settings.theme") || "system");
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem("studygpt.settings.accent") || "indigo");

  // Notification states
  const [emailReminders, setEmailReminders] = useState(() => localStorage.getItem("studygpt.settings.emailReminders") !== "false");
  const [soundAlerts, setSoundAlerts] = useState(() => localStorage.getItem("studygpt.settings.soundAlerts") !== "false");
  const [weeklyDigest, setWeeklyDigest] = useState(() => localStorage.getItem("studygpt.settings.weeklyDigest") !== "false");
  const [pushAlerts, setPushAlerts] = useState(() => localStorage.getItem("studygpt.settings.pushAlerts") === "true");

  // Language & Timezone states
  const [appLanguage, setAppLanguage] = useState(() => localStorage.getItem("studygpt.settings.language") || "en");
  const [timezone, setTimezone] = useState(() => localStorage.getItem("studygpt.settings.timezone") || "UTC");

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Mock security & connected accounts states
  const [mfaEnabled, setMfaEnabled] = useState(() => localStorage.getItem("studygpt.settings.mfa") === "true");
  const [connectedGoogle, setConnectedGoogle] = useState(true);
  const [connectedGithub, setConnectedGithub] = useState(false);

  // Privacy states
  const [publicStreak, setPublicStreak] = useState(() => localStorage.getItem("studygpt.settings.publicStreak") !== "false");
  const [telemetry, setTelemetry] = useState(() => localStorage.getItem("studygpt.settings.telemetry") !== "false");

  // AI preference states
  const [aiEngine, setAiEngine] = useState(() => localStorage.getItem("studygpt.settings.aiEngine") || "gemini-pro");
  const [defSummaryLen, setDefSummaryLen] = useState(() => localStorage.getItem("studygpt.settings.summaryLength") || "medium");

  useEffect(() => {
    profileService.get().then((p) => {
      setProfile(p);
      setFullName(p.full_name ?? "");
      setUsername(p.username ?? "");
      setSelectedAvatar(p.avatar_url ?? "");
    }).catch(() => setProfile(null));
  }, []);

  const saveProfile = async () => {
    if (!fullName.trim() && !username.trim()) {
      toast.error("Enter a full name or username");
      return;
    }
    setProfileSaving(true);
    try {
      const updated = await profileService.update({
        fullName,
        username,
        avatarUrl: selectedAvatar,
      });
      setProfile(updated);
      localStorage.setItem("studygpt.settings.bio", bio);
      toast.success("Profile updated successfully");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      toast.error("Include at least one letter and one number");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setPwSaving(true);
    try {
      await profileService.updatePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully");
    } catch (e: any) {
      toast.error(e?.message || "Could not update password");
    } finally {
      setPwSaving(false);
    }
  };

  const saveThemeSettings = () => {
    localStorage.setItem("studygpt.settings.theme", themeMode);
    localStorage.setItem("studygpt.settings.accent", accentColor);
    
    // Apply Dark mode theme instantly
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else if (themeMode === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", systemDark);
    }

    toast.success("Appearance settings updated");
  };

  const saveNotificationSettings = () => {
    localStorage.setItem("studygpt.settings.emailReminders", String(emailReminders));
    localStorage.setItem("studygpt.settings.soundAlerts", String(soundAlerts));
    localStorage.setItem("studygpt.settings.weeklyDigest", String(weeklyDigest));
    localStorage.setItem("studygpt.settings.pushAlerts", String(pushAlerts));
    toast.success("Notification preferences saved");
  };

  const saveLocalizationSettings = () => {
    localStorage.setItem("studygpt.settings.language", appLanguage);
    localStorage.setItem("studygpt.settings.timezone", timezone);
    toast.success("Language & Region saved");
  };

  const savePrivacySettings = () => {
    localStorage.setItem("studygpt.settings.publicStreak", String(publicStreak));
    localStorage.setItem("studygpt.settings.telemetry", String(telemetry));
    toast.success("Privacy configuration saved");
  };

  const saveAISettings = () => {
    localStorage.setItem("studygpt.settings.aiEngine", aiEngine);
    localStorage.setItem("studygpt.settings.summaryLength", defSummaryLen);
    toast.success("AI preferences updated");
  };

  const toggleMFA = () => {
    const next = !mfaEnabled;
    setMfaEnabled(next);
    localStorage.setItem("studygpt.settings.mfa", String(next));
    toast.success(next ? "Two-factor authentication enabled" : "MFA disabled");
  };

  const handleExportData = () => {
    const backupData = {
      profile: profile,
      email: user?.email,
      settings: {
        bio,
        themeMode,
        accentColor,
        emailReminders,
        soundAlerts,
        weeklyDigest,
        pushAlerts,
        appLanguage,
        timezone,
        mfaEnabled,
        publicStreak,
        telemetry,
        aiEngine,
        defSummaryLen,
      },
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `studygpt-data-export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Personal data backup download started");
  };

  const deleteAccount = async () => {
    if (!window.confirm("Permanently delete your account? This action is absolute and cannot be undone.")) return;
    try {
      await profileService.deleteAccount();
      await authService.logout().catch(() => {});
      toast.success("Account permanently deleted");
      navigate({ to: "/login" });
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  const initials = (fullName || user?.name || "ME")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebarTabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "appearance", label: "Appearance", icon: Laptop },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "localization", label: "Language & Region", icon: Globe },
    { id: "security", label: "Security & Password", icon: Shield },
    { id: "connections", label: "Integrations", icon: Share2 },
    { id: "privacy", label: "Privacy & Data", icon: Lock },
    { id: "ai", label: "AI Preferences", icon: Sparkles },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure your study space, sync credentials, and adjust AI models."
      />

      <div className="grid md:grid-cols-[240px_1fr] gap-8 items-start">
        {/* ═══════════ SIDEBAR NAVIGATION ═══════════ */}
        <div className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-border/40 pr-0 md:pr-4 timeline-scroll">
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                  isSelected
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══════════ SETTINGS CONFIGURATION PANES ═══════════ */}
        <div className="space-y-6">
          
          {/* ──── TAB: PROFILE & AVATAR ──── */}
          {activeTab === "profile" && (
            <Card className="glass border-border/40 p-6 space-y-6 animate-card-enter">
              <div className="flex flex-col sm:flex-row gap-6 items-center border-b border-border/20 pb-6">
                {/* Avatar Preview */}
                <div className="relative group">
                  <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-md">
                    {selectedAvatar && selectedAvatar.startsWith("bg-gradient") ? (
                      <AvatarFallback className={cn("text-white text-xl font-bold", selectedAvatar)}>
                        {initials}
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="gradient-primary-bg text-white text-xl font-bold">
                        {initials}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary/25 border border-primary/40 flex items-center justify-center text-primary backdrop-blur">
                    <User className="h-3 w-3" />
                  </div>
                </div>

                {/* Avatar Presets Selection */}
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <Label className="text-xs font-semibold">Choose Avatar Palette</Label>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {avatarPresets.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setSelectedAvatar(preset)}
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-all relative",
                          preset,
                          selectedAvatar === preset ? "border-primary scale-110 shadow-glow" : "border-transparent hover:scale-105"
                        )}
                      >
                        {selectedAvatar === preset && (
                          <span className="absolute inset-0 m-auto h-4 w-4 rounded-full bg-white/30 flex items-center justify-center text-white">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Username</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. johndoe"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Study Bio</Label>
                  <Input
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Write a brief line about your goals (e.g. preparing for GRE exam)"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border/20">
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  Email is managed by auth system: {user?.email}
                </div>
                <Button onClick={saveProfile} disabled={profileSaving} className="gradient-primary-bg text-white border-0 text-xs">
                  {profileSaving ? (
                    <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* ──── TAB: APPEARANCE ──── */}
          {activeTab === "appearance" && (
            <Card className="glass border-border/40 p-6 space-y-6 animate-card-enter">
              <h3 className="text-sm font-bold border-b border-border/20 pb-2">Theme & Customization</h3>

              {/* Dark mode setting */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold">Interface Mode</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "light", label: "Light Mode" },
                    { id: "dark", label: "Dark Mode" },
                    { id: "system", label: "System Sync" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setThemeMode(mode.id)}
                      className={cn(
                        "p-4 rounded-xl border text-center transition-all text-xs font-medium",
                        themeMode === mode.id
                          ? "border-primary/50 bg-primary/5 text-primary shadow-sm font-bold"
                          : "border-border/30 hover:border-border/60 hover:bg-muted/40"
                      )}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color accent setting */}
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-semibold">Accent Highlighter Color</Label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: "indigo", label: "Indigo", color: "bg-indigo-500" },
                    { id: "violet", label: "Violet", color: "bg-violet-500" },
                    { id: "emerald", label: "Emerald", color: "bg-emerald-500" },
                    { id: "rose", label: "Rose", color: "bg-rose-500" },
                    { id: "amber", label: "Amber", color: "bg-amber-500" },
                  ].map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => setAccentColor(acc.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all",
                        accentColor === acc.id
                          ? "border-primary bg-primary/10 font-bold"
                          : "border-border/30 hover:bg-muted/40"
                      )}
                    >
                      <span className={cn("h-3 w-3 rounded-full", acc.color)} />
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/20">
                <Button onClick={saveThemeSettings} className="gradient-primary-bg text-white border-0 text-xs">
                  Apply Theme Settings
                </Button>
              </div>
            </Card>
          )}

          {/* ──── TAB: NOTIFICATIONS ──── */}
          {activeTab === "notifications" && (
            <Card className="glass border-border/40 p-6 space-y-6 animate-card-enter">
              <h3 className="text-sm font-bold border-b border-border/20 pb-2">Notification Preferences</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-xs font-bold">Email Study Reminders</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Receive daily updates or reminders to stay on top of pending planner tasks.
                    </p>
                  </div>
                  <Switch checked={emailReminders} onCheckedChange={setEmailReminders} />
                </div>

                <div className="flex items-center justify-between border-t border-border/20 pt-4">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-xs font-bold">Timer Alerts & Audio Signals</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Play audio bells when planner tasks or revision countdown milestones finish.
                    </p>
                  </div>
                  <Switch checked={soundAlerts} onCheckedChange={setSoundAlerts} />
                </div>

                <div className="flex items-center justify-between border-t border-border/20 pt-4">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-xs font-bold">Weekly Performance Digest</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Get a detailed progress summary dashboard summary via email every Sunday.
                    </p>
                  </div>
                  <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
                </div>

                <div className="flex items-center justify-between border-t border-border/20 pt-4">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-xs font-bold">Push Notifications</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Instant browser notifications for daily streak reminders.
                    </p>
                  </div>
                  <Switch checked={pushAlerts} onCheckedChange={setPushAlerts} />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/20">
                <Button onClick={saveNotificationSettings} className="gradient-primary-bg text-white border-0 text-xs">
                  Save Notifications
                </Button>
              </div>
            </Card>
          )}

          {/* ──── TAB: LOCALIZATION ──── */}
          {activeTab === "localization" && (
            <Card className="glass border-border/40 p-6 space-y-6 animate-card-enter">
              <h3 className="text-sm font-bold border-b border-border/20 pb-2">Language & Region</h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Primary Language</Label>
                  <select
                    value={appLanguage}
                    onChange={(e) => setAppLanguage(e.target.value)}
                    className="w-full h-10 text-xs bg-background border border-border/40 rounded-lg px-3 focus:outline-none"
                  >
                    {languageOptions.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Timezone</Label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full h-10 text-xs bg-background border border-border/40 rounded-lg px-3 focus:outline-none"
                  >
                    {timezoneOptions.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/20">
                <Button onClick={saveLocalizationSettings} className="gradient-primary-bg text-white border-0 text-xs">
                  Save Region
                </Button>
              </div>
            </Card>
          )}

          {/* ──── TAB: SECURITY & PASSWORD ──── */}
          {activeTab === "security" && (
            <Card className="glass border-border/40 p-6 space-y-6 animate-card-enter">
              {/* Password update section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold border-b border-border/20 pb-2">Change Password</h3>
                <p className="text-[11px] text-muted-foreground">
                  Update your authentication credentials. Min 8 characters with at least one letter and number.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="relative space-y-1">
                    <Label className="text-xs font-semibold">New Password</Label>
                    <div className="relative">
                      <Input
                        type={showPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="relative space-y-1">
                    <Label className="text-xs font-semibold">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={changePassword} disabled={pwSaving} className="gradient-primary-bg text-white border-0 text-xs">
                    {pwSaving ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Updating...</>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </div>
              </div>

              {/* MFA section */}
              <div className="border-t border-border/20 pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <LockKeyhole className="h-4 w-4 text-primary" /> Two-Factor Authentication (2FA)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Secure your account by requiring an auth token in addition to your password.
                    </p>
                  </div>
                  <Switch checked={mfaEnabled} onCheckedChange={toggleMFA} />
                </div>
              </div>

              {/* Active Sessions list */}
              <div className="border-t border-border/20 pt-6 space-y-3">
                <h4 className="text-xs font-bold">Active Device Sessions</h4>
                <div className="border border-border/30 rounded-xl overflow-hidden divide-y divide-border/20 text-xs">
                  <div className="p-3 bg-muted/10 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground/90">Chrome / Windows 11 (Current)</p>
                      <p className="text-[10px] text-muted-foreground">Delhi, India &bull; IP: 103.44.12.18</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] border-emerald-500/20 text-emerald-500 bg-emerald-500/5">
                      Active Now
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ──── TAB: CONNECTIONS ──── */}
          {activeTab === "connections" && (
            <Card className="glass border-border/40 p-6 space-y-6 animate-card-enter">
              <h3 className="text-sm font-bold border-b border-border/20 pb-2">Connected Accounts</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-border/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Link2 className="h-4.5 w-4.5 text-red-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">Google Cloud Credential</h4>
                      <p className="text-[10px] text-muted-foreground">Connected as {user?.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={connectedGoogle ? "destructive" : "outline"}
                    onClick={() => {
                      setConnectedGoogle(!connectedGoogle);
                      toast.success(connectedGoogle ? "Google disconnected" : "Google credentials integrated");
                    }}
                    className="text-xs h-8"
                  >
                    {connectedGoogle ? "Disconnect" : "Connect"}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border border-border/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-zinc-800/10 flex items-center justify-center dark:bg-zinc-100/10">
                      <Share2 className="h-4.5 w-4.5 text-zinc-700 dark:text-zinc-300" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">GitHub Sync</h4>
                      <p className="text-[10px] text-muted-foreground">Link repository code insights.</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={connectedGithub ? "destructive" : "outline"}
                    onClick={() => {
                      setConnectedGithub(!connectedGithub);
                      toast.success(connectedGithub ? "GitHub disconnected" : "GitHub repository integrated");
                    }}
                    className="text-xs h-8"
                  >
                    {connectedGithub ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* ──── TAB: PRIVACY & DATA EXPORT ──── */}
          {activeTab === "privacy" && (
            <Card className="glass border-border/40 p-6 space-y-6 animate-card-enter">
              <h3 className="text-sm font-bold border-b border-border/20 pb-2">Privacy & Local Storage</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-xs font-bold">Show streak on public leaderboards</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Let other student profiles see your ranking status and streaks.
                    </p>
                  </div>
                  <Switch checked={publicStreak} onCheckedChange={setPublicStreak} />
                </div>

                <div className="flex items-center justify-between border-t border-border/20 pt-4">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-xs font-bold">Telemetry analytics</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Share anonymous usage parameters to help optimize AI recommendations.
                    </p>
                  </div>
                  <Switch checked={telemetry} onCheckedChange={setTelemetry} />
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={savePrivacySettings} className="gradient-primary-bg text-white border-0 text-xs">
                    Save Privacy
                  </Button>
                </div>
              </div>

              {/* Data Export section */}
              <div className="border-t border-border/20 pt-6 space-y-3">
                <h4 className="text-xs font-bold">Data Portability Backup</h4>
                <p className="text-[11px] text-muted-foreground">
                  Export all personal StudyGPT configurations, bio settings, and preferences as a portable backup.
                </p>
                <Button size="sm" variant="outline" onClick={handleExportData} className="text-xs gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Download Data Export (.json)
                </Button>
              </div>

              {/* Danger Zone Account deletion */}
              <div className="border-t border-border-rose-500/20 pt-6 space-y-3">
                <h4 className="text-xs font-bold text-rose-500">Danger Zone</h4>
                <p className="text-[11px] text-muted-foreground">
                  Permanently erase your study planner profile, history artifacts, and credentials.
                </p>
                <Button variant="destructive" size="sm" onClick={deleteAccount} className="text-xs gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> Delete Account
                </Button>
              </div>
            </Card>
          )}

          {/* ──── TAB: AI PREFERENCES ──── */}
          {activeTab === "ai" && (
            <Card className="glass border-border/40 p-6 space-y-6 animate-card-enter">
              <h3 className="text-sm font-bold border-b border-border/20 pb-2">AI Configuration</h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Default Generation Engine</Label>
                  <select
                    value={aiEngine}
                    onChange={(e) => setAiEngine(e.target.value)}
                    className="w-full h-10 text-xs bg-background border border-border/40 rounded-lg px-3 focus:outline-none"
                  >
                    {aiEngineOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Summarization Verbosity</Label>
                  <select
                    value={defSummaryLen}
                    onChange={(e) => setDefSummaryLen(e.target.value)}
                    className="w-full h-10 text-xs bg-background border border-border/40 rounded-lg px-3 focus:outline-none"
                  >
                    {summaryLengthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/20">
                <Button onClick={saveAISettings} className="gradient-primary-bg text-white border-0 text-xs">
                  Apply AI Settings
                </Button>
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}