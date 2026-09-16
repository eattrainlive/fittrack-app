import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, ChevronLeft, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const MIN_PASSWORD = 8;

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    // A recovery link establishes a session; check for it on mount.
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      toast({
        title: "Password updated",
        description: "You can now log in with your new password.",
      });
      // Sign out the recovery session so they log in fresh.
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (hasSession === null) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasSession) {
    // No recovery session — link expired or opened directly.
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="w-full max-w-md px-6 space-y-6 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-heading uppercase tracking-wide">
              Reset link expired
            </h1>
            <p className="text-muted-foreground text-sm">
              This reset link has expired or is no longer valid. Please request
              a new one.
            </p>
          </div>
          <Button className="gap-2" onClick={() => navigate("/auth")}>
            <ChevronLeft className="w-4 h-4" /> Back to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="w-full max-w-md px-6 space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center pt-8 pb-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-heading tracking-wider uppercase">
            Set new password
          </h1>
          <p className="text-muted-foreground text-sm">
            Choose a new password for your account.
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
                disabled={loading}
                placeholder={`At least ${MIN_PASSWORD} characters`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full text-primary-foreground font-bold h-12 rounded-xl"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
