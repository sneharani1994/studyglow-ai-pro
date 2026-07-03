import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { profileService, authService, type UserProfile } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const user = useUser();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    profileService.get().then((p) => {
      setProfile(p);
      setFullName(p.full_name ?? "");
      setUsername(p.username ?? "");
    }).catch(() => setProfile(null));
  }, []);

  const save = async () => {
    if (!fullName.trim() && !username.trim()) {
      toast.error("Enter a full name or username");
      return;
    }
    setSaving(true);
    try {
      const updated = await profileService.update({ fullName, username });
      setProfile(updated);
      toast.success("Profile saved");
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      toast.error("Include at least one letter and one number");
      return;
    }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setPwSaving(true);
    try {
      await profileService.updatePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (e: any) { toast.error(e?.message || "Could not update password"); }
    finally { setPwSaving(false); }
  };

  const deleteAccount = async () => {
    if (!window.confirm("Permanently delete your account? This cannot be undone.")) return;
    try {
      await profileService.deleteAccount();
      await authService.logout().catch(() => {});
      toast.success("Account deleted");
      navigate({ to: "/login" });
    } catch (e: any) { toast.error(e?.message || "Delete failed"); }
  };

  const initials = (fullName || user?.name || "ME").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div>
      <PageHeader title="Profile & Settings" description="Make StudyGPT feel like your own." />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1 text-center">
          <Avatar className="h-24 w-24 mx-auto">
            <AvatarFallback className="gradient-primary-bg text-white text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <h3 className="font-semibold mt-4">{fullName || user?.name || "Your name"}</h3>
          <p className="text-sm text-muted-foreground">{user?.email ?? ""}</p>
          <Badge className="mt-3 gradient-primary-bg text-white border-0">Level {profile?.level ?? 1}</Badge>
          <div className="text-xs text-muted-foreground mt-2">
            {profile?.xp ?? 0} XP · {profile?.study_streak ?? 0} day streak
          </div>
        </Card>
        <Card className="p-6 lg:col-span-2 space-y-5">
          <h3 className="font-semibold">Profile</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm">Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
          </div>
          <Button onClick={save} disabled={saving} className="gradient-primary-bg text-white border-0">
            {saving ? "Saving…" : "Save changes"}
          </Button>

          <div className="pt-4 border-t space-y-3">
            <h4 className="font-semibold text-sm">Change password</h4>
            <p className="text-xs text-muted-foreground">Minimum 8 characters with at least one letter and one number.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowConfirm((s) => !s)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={changePassword} disabled={pwSaving}>
              {pwSaving ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Updating…</> : "Update password"}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold text-sm mb-3">Danger zone</h4>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={deleteAccount}>
              Delete account
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}