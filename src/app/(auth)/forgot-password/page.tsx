"use client";

import { useState } from "react";
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
  ArrowLeft,
  CheckCircle,
  Mail,
  Activity,
  AlertCircle,
  KeyRound,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        setError(resetError.message);
        setIsLoading(false);
        return;
      }

      setIsEmailSent(true);
    } catch (err) {
      console.error("Password reset error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
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
              Check your email
            </CardTitle>
            <CardDescription className="text-neutral-500">
              We&apos;ve sent password reset instructions to{" "}
              <span className="font-medium text-neutral-800">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-neutral-500 space-y-2 text-center bg-neutral-50 rounded-xl p-4">
              <p>Click the link in the email to reset your password.</p>
              <p>If you don&apos;t see the email, check your spam folder.</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => setIsEmailSent(false)}
            >
              <Mail className="h-4 w-4" />
              Try a different email
            </Button>
            <Link href="/login" className="w-full">
              <Button variant="ghost" className="w-full h-11">
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Button>
            </Link>
          </CardFooter>
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
            <KeyRound className="h-7 w-7 text-primary-800" />
          </div>
          <CardTitle className="text-xl font-bold text-neutral-800">
            Reset your password
          </CardTitle>
          <CardDescription className="text-neutral-500 text-sm">
            Enter your email and we&apos;ll send you a reset link
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
                htmlFor="email"
                className="text-sm font-medium text-neutral-700"
              >
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-12"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
            <Link href="/login" className="w-full">
              <Button variant="ghost" className="w-full h-11">
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
