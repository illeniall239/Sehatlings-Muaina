"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Activity, AlertCircle, Shield, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      // Redirect to dashboard after successful login
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-primary-800 via-primary-800 to-primary-900 p-8 xl:p-12 flex-col justify-between relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-white/[0.07] to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-primary-600/20 to-transparent rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:bg-white/15 transition-colors">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Muaina</span>
          </Link>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-6">
          <div>
            <p className="text-primary-300 text-sm font-medium uppercase tracking-wider mb-3">Welcome back</p>
            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-[1.15] tracking-tight">
              Your diagnostic portal awaits
            </h2>
          </div>
          <p className="text-primary-200/80 text-lg leading-relaxed max-w-md">
            Access your reports, review AI analysis, and manage your workflow with confidence.
          </p>
        </div>

        {/* Trust indicator */}
        <div className="relative z-10 flex items-center gap-3 text-primary-300/80 text-sm">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 backdrop-blur-sm">
            <Shield className="h-4 w-4" />
          </div>
          <span>Trusted by 500+ healthcare professionals</span>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex justify-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary-800 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-800/20">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-neutral-900 tracking-tight">
                Muaina
              </span>
            </Link>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-8">
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">
              Sign in to your account
            </h1>
            <p className="text-neutral-500">
              Enter your credentials to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive-50 border border-destructive-100 animate-fade-in">
                <AlertCircle className="h-5 w-5 text-destructive-600 shrink-0 mt-0.5" />
                <p className="text-sm text-destructive-700">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-neutral-700">
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
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-neutral-700">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary-800 hover:text-primary-700 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-neutral-500 mt-8">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-primary-800 hover:text-primary-700 font-semibold transition-colors"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
