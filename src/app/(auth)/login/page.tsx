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
  const [userType, setUserType] = useState<'pathologist' | 'insurance'>('pathologist');
  const router = useRouter();
  const { signIn } = useAuth();

  const isInsurance = userType === 'insurance';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const { error, data } = await signIn(email, password);

      if (error) {
        setError((error as { message?: string }).message || "Login failed");
        setIsLoading(false);
        return;
      }

      // Get user role from the response
      const userRole = data?.profile?.role;

      // Validate role matches selected user type
      if (isInsurance) {
        if (userRole !== 'insurance') {
          setError("Access denied. This login is for insurance users only.");
          setIsLoading(false);
          return;
        }
        router.push("/insurance");
      } else {
        if (userRole === 'insurance') {
          setError("Please use the Insurance login toggle.");
          setIsLoading(false);
          return;
        }
        router.push("/dashboard");
      }

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
      <div className={`hidden lg:flex lg:w-[45%] p-8 xl:p-12 flex-col justify-between relative overflow-hidden transition-all duration-500 ease-in-out ${isInsurance ? 'bg-white' : 'bg-gradient-to-br from-primary-800 via-primary-800 to-primary-900'}`}>
        {/* Background effects */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${isInsurance ? 'opacity-0' : 'opacity-100'}`}>
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
            <div className={`h-11 w-11 rounded-xl backdrop-blur-sm flex items-center justify-center border transition-all duration-500 ${isInsurance ? 'bg-primary-800/10 border-primary-800/10 group-hover:bg-primary-800/15' : 'bg-white/10 border-white/10 group-hover:bg-white/15'}`}>
              <Activity className={`h-5 w-5 transition-colors duration-500 ${isInsurance ? 'text-primary-800' : 'text-white'}`} />
            </div>
            <span className={`text-xl font-bold tracking-tight transition-colors duration-500 ${isInsurance ? 'text-neutral-900' : 'text-white'}`}>Muaina</span>
          </Link>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-6">
          <div>
            <p className={`text-sm font-medium uppercase tracking-wider mb-3 transition-colors duration-500 ${isInsurance ? 'text-primary-800' : 'text-primary-300'}`}>Welcome back</p>
            <h2 className={`text-3xl xl:text-4xl font-bold leading-[1.15] tracking-tight transition-colors duration-500 ${isInsurance ? 'text-neutral-900' : 'text-white'}`}>
              {isInsurance ? 'Your insurance dashboard awaits' : 'Your diagnostic portal awaits'}
            </h2>
          </div>
          <p className={`text-lg leading-relaxed max-w-md transition-colors duration-500 ${isInsurance ? 'text-neutral-600' : 'text-primary-200/80'}`}>
            {isInsurance
              ? 'Access patient health records, review risk assessments, and manage underwriting decisions.'
              : 'Access your reports, review AI analysis, and manage your workflow with confidence.'}
          </p>
        </div>

        {/* Trust indicator */}
        <div className={`relative z-10 flex items-center gap-3 text-sm transition-colors duration-500 ${isInsurance ? 'text-neutral-500' : 'text-primary-300/80'}`}>
          <div className={`flex items-center justify-center h-8 w-8 rounded-lg backdrop-blur-sm transition-colors duration-500 ${isInsurance ? 'bg-primary-800/10' : 'bg-white/10'}`}>
            <Shield className={`h-4 w-4 transition-colors duration-500 ${isInsurance ? 'text-primary-800' : 'text-primary-300'}`} />
          </div>
          <span>{isInsurance ? 'Secure health data access for insurers' : 'Trusted by 500+ healthcare professionals'}</span>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className={`flex-1 flex items-center justify-center p-6 lg:p-12 transition-all duration-500 ease-in-out ${isInsurance ? 'bg-gradient-to-br from-primary-800 via-primary-800 to-primary-900' : 'bg-white'}`}>
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex justify-center">
            <Link href="/" className="flex items-center gap-3">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shadow-lg transition-all duration-500 ${isInsurance ? 'bg-white shadow-white/20' : 'bg-gradient-to-br from-primary-800 to-primary-700 shadow-primary-800/20'}`}>
                <Activity className={`h-5 w-5 transition-colors duration-500 ${isInsurance ? 'text-primary-800' : 'text-white'}`} />
              </div>
              <span className={`text-xl font-bold tracking-tight transition-colors duration-500 ${isInsurance ? 'text-white' : 'text-neutral-900'}`}>
                Muaina
              </span>
            </Link>
          </div>

          {/* Toggle */}
          <div className={`flex rounded-xl p-1 mb-8 transition-colors duration-500 ${isInsurance ? 'bg-white/10' : 'bg-neutral-100'}`}>
            <button
              type="button"
              onClick={() => setUserType('pathologist')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${!isInsurance ? 'bg-primary-800 text-white shadow-md' : isInsurance ? 'text-white/70 hover:text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Pathologist
            </button>
            <button
              type="button"
              onClick={() => setUserType('insurance')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${isInsurance ? 'bg-white text-primary-800 shadow-md' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Insurance
            </button>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-8">
            <h1 className={`text-2xl font-bold tracking-tight mb-2 transition-colors duration-500 ${isInsurance ? 'text-white' : 'text-neutral-900'}`}>
              Sign in to your account
            </h1>
            <p className={`transition-colors duration-500 ${isInsurance ? 'text-primary-200' : 'text-neutral-500'}`}>
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
              <Label htmlFor="email" className={`text-sm font-medium transition-colors duration-500 ${isInsurance ? 'text-primary-100' : 'text-neutral-700'}`}>
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
                className={isInsurance ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40' : ''}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className={`text-sm font-medium transition-colors duration-500 ${isInsurance ? 'text-primary-100' : 'text-neutral-700'}`}>
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className={`text-sm font-medium transition-colors ${isInsurance ? 'text-white hover:text-white/80' : 'text-primary-800 hover:text-primary-700'}`}
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
                className={isInsurance ? 'bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40' : ''}
              />
            </div>

            <Button
              type="submit"
              className={`w-full transition-all duration-500 ${isInsurance ? 'bg-white text-primary-800 hover:bg-white/90' : ''}`}
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
          <p className={`text-center text-sm mt-8 transition-colors duration-500 ${isInsurance ? 'text-primary-200' : 'text-neutral-500'}`}>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className={`font-semibold transition-colors ${isInsurance ? 'text-white hover:text-white/80' : 'text-primary-800 hover:text-primary-700'}`}
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
