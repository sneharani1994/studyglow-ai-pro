import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <div>
      <PageHeader title="Profile & Settings" description="Make StudyGPT feel like your own." />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1 text-center">
          <Avatar className="h-24 w-24 mx-auto">
            <AvatarFallback className="gradient-primary-bg text-white text-2xl">AK</AvatarFallback>
          </Avatar>
          <h3 className="font-semibold mt-4">Aisha Khan</h3>
          <p className="text-sm text-muted-foreground">aisha@iitd.ac.in</p>
          <Badge className="mt-3 gradient-primary-bg text-white border-0">Pro plan</Badge>
          <Button variant="outline" className="w-full mt-4">Edit profile</Button>
        </Card>
        <Card className="p-6 lg:col-span-2 space-y-5">
          <h3 className="font-semibold">Preferences</h3>
          {[
            { label: "Dark mode", desc: "Easier on the eyes after sunset" },
            { label: "Email notifications", desc: "Weekly progress + reminders" },
            { label: "Daily study reminder", desc: "We'll nudge you at your set time" },
            { label: "Share progress publicly", desc: "Show on leaderboard" },
          ].map((p) => (
            <div key={p.label} className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
              </div>
              <Switch defaultChecked />
            </div>
          ))}
          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label className="text-sm">Language</Label>
              <Select defaultValue="en">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="gu">Gujarati</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Timezone</Label>
              <Input defaultValue="Asia/Kolkata (UTC+5:30)" />
            </div>
          </div>
          <div className="pt-4 border-t">
            <h4 className="font-semibold text-sm mb-3">Privacy & security</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Change password</Button>
              <Button variant="outline" size="sm">Enable 2FA</Button>
              <Button variant="ghost" size="sm" className="text-destructive">Delete account</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}