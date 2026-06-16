import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — StudyGPT" }] }),
  component: SignupPage,
});

function SignupPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free forever. No credit card required."
      footer={<>Already a member? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link></>}
    >
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Aisha Khan" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@university.edu" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="At least 8 characters" />
          <p className="text-xs text-muted-foreground">Use 8+ characters with a mix of letters & numbers.</p>
        </div>
        <Button asChild className="w-full gradient-primary-bg text-white border-0 hover:opacity-90">
          <Link to="/app">Create account</Link>
        </Button>
        <div className="flex items-center gap-3 my-2">
          <Separator className="flex-1" /><span className="text-xs text-muted-foreground">OR</span><Separator className="flex-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" type="button">Google</Button>
          <Button variant="outline" type="button">GitHub</Button>
        </div>
      </form>
    </AuthLayout>
  );
}