"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Lock,
  Activity,
  AlertCircle,
} from "lucide-react";

function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Check if we have a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Get the session from the URL hash (Supabase recovery link)
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          setError("Invalid or expired reset link");
          setIsCheckingSession(false);
          return;
        }

        if (session) {
          setIsValidSession(true);
        } else {
          // Check for error in URL
          const errorDescription = searchParams.get("error_description");
          if (errorDescription) {
            setError(decodeURIComponent(errorDescription));
          } else {
            setError("Invalid or expired reset link. Please request a new one.");
          }
        }
      } catch (err) {
        console.error("Check session error:", err);
        setError("Failed to verify reset link");
      } finally {
        setIsCheckingSession(false);
      }
    };

    // Supabase will automatically handle the hash tokens
    checkSession();
  }, [supabase, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validate passwords
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      setIsReset(true);

      // Sign out and redirect to login after 3 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push("/login");
      }, 3000);
    } catch (err) {
      console.error("Password update error:", err);
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50 p-4 overflow-hidden">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-800 mb-4" />
            <p className="text-neutral-500">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession && !isReset) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50 p-4 overflow-hidden">
        <Card className="w-full max-w-md border-0 shadow-xl animate-fade-in">
          <CardHeader className="space-y-1 text-center">
            {/* Logo */}
            <div className="mb-4 flex justify-center">
              <Link href="/" className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-800 to-primary-700 flex items-center justify-center shadow-md">
                  <Activity className="h-5 w-5 text-white" />
                </div>
              </Link>
            </div>
            {/* Error Icon */}
            <div className="mx-auto w-16 h-16 bg-destructive-100 rounded-2xl flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-neutral-800">
              Link expired
            </CardTitle>
            <CardDescription className="text-neutral-500">
              {error || "This password reset link is no longer valid."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full h-12">Request a new link</Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button variant="ghost" className="w-full h-11">
                Back to login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isReset) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50 p-4 overflow-hidden">
        <Card className="w-full max-w-md border-0 shadow-xl animate-fade-in">
          <CardHeader className="space-y-1 text-center">
            {/* Logo */}
            <div className="mb-4 flex justify-center">
              <Link href="/" className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-800 to-primary-700 flex items-center justify-center shadow-md">
                  <Activity className="h-5 w-5 text-white" />
                </div>
              </Link>
            </div>
            {/* Success Icon */}
            <div className="mx-auto w-16 h-16 bg-success-100 rounded-2xl flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-success-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-neutral-800">
              Password reset successful
            </CardTitle>
            <CardDescription className="text-neutral-500">
              Your password has been updated. Redirecting to login...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary-800" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-neutral-50 p-4 overflow-hidden">
      <Card className="w-full max-w-md border-0 shadow-xl animate-fade-in">
        <CardHeader className="space-y-1 text-center">
          {/* Logo */}
          <div className="mb-3 flex justify-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-800 to-primary-700 flex items-center justify-center shadow-md">
                <Activity className="h-5 w-5 text-white" />
              </div>
            </Link>
          </div>
          {/* Icon */}
          <div className="mx-auto w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mb-3">
            <Lock className="h-7 w-7 text-primary-800" />
          </div>
          <CardTitle className="text-xl font-bold text-neutral-800">
            Set new password
          </CardTitle>
          <CardDescription className="text-neutral-500 text-sm">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive-50 border border-destructive-200">
                <AlertCircle className="h-5 w-5 text-destructive-600 shrink-0" />
                <p className="text-sm text-destructive-700">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-neutral-700"
              >
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-neutral-700"
              >
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
                className="h-12"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Updating...
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-neutral-50 overflow-hidden">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
