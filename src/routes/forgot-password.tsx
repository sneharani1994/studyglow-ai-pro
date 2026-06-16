import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — StudyGPT" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="We'll email you a secure reset link."
      footer={<>Remembered it? <Link to="/login" className="text-primary font-medium hover:underline">Back to login</Link></>}
    >
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@university.edu" />
        </div>
        <Button className="w-full gradient-primary-bg text-white border-0 hover:opacity-90">
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}