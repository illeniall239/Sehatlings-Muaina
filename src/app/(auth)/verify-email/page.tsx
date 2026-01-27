"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Mail,
  CheckCircle,
  AlertCircle,
  Activity,
} from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Check if user is already verified
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        router.push("/dashboard");
      }
    };
    checkAuth();
  }, [supabase, router]);

  const handleResend = async () => {
    if (!email) {
      setError("Email address is required");
      return;
    }

    setIsResending(true);
    setError("");
    setResendSuccess(false);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (resendError) {
        setError(resendError.message);
      } else {
        setResendSuccess(true);
      }
    } catch (err) {
      console.error("Resend error:", err);
      setError("Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

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
            <Mail className="h-7 w-7 text-primary-800" />
          </div>
          <CardTitle className="text-xl font-bold text-neutral-800">
            Check your email
          </CardTitle>
          <CardDescription className="text-neutral-500">
            We&apos;ve sent a verification link to{" "}
            <span className="font-medium text-neutral-800">
              {email || "your email"}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive-50 border border-destructive-200">
              <AlertCircle className="h-5 w-5 text-destructive-600 shrink-0" />
              <p className="text-sm text-destructive-700">{error}</p>
            </div>
          )}
          {resendSuccess && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-success-50 border border-success-200">
              <CheckCircle className="h-5 w-5 text-success-600 shrink-0" />
              <p className="text-sm text-success-700">
                Verification email sent! Please check your inbox.
              </p>
            </div>
          )}

          <div className="text-sm text-neutral-500 space-y-2 text-center bg-neutral-50 rounded-xl p-4">
            <p>
              Click the link in the email to verify your account and complete
              signup.
            </p>
            <p>If you don&apos;t see the email, check your spam folder.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={handleResend}
            disabled={isResending || !email}
          >
            {isResending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Resend verification email
              </>
            )}
          </Button>
          <div className="flex flex-col gap-2 text-center text-sm">
            <p className="text-neutral-500">
              Wrong email?{" "}
              <Link
                href="/signup"
                className="text-primary-800 hover:text-primary-700 font-semibold transition-colors"
              >
                Sign up again
              </Link>
            </p>
            <p className="text-neutral-500">
              Already verified?{" "}
              <Link
                href="/login"
                className="text-primary-800 hover:text-primary-700 font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-neutral-50 overflow-hidden">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
