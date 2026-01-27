"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import {
  Loader2,
  Activity,
  AlertCircle,
  CheckCircle,
  Shield,
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [branch, setBranch] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Fetch organizations on mount via API
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setOrgsLoading(true);
        setOrgsError("");
        
        const res = await fetch("/api/organizations");
        const data = await res.json();
        
        if (!res.ok) {
          setOrgsError(data.error || "Failed to load organizations");
          return;
        }
        
        if (data.organizations && data.organizations.length > 0) {
          setOrganizations(data.organizations);
          // Auto-select first org if available
          setOrganizationId(data.organizations[0].id);
        } else {
          setOrgsError("No organizations available");
        }
      } catch (err) {
        console.error("Failed to fetch organizations:", err);
        setOrgsError("Failed to load organizations");
      } finally {
        setOrgsLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    if (!organizationId) {
      setError("Please select an organization");
      setIsLoading(false);
      return;
    }

    try {
      // Call signup API (server handles auth user + profile creation atomically)
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          organizationId,
          branch: branch || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        let errorMsg = data.error || "Failed to create account";
        if (data.details) {
          errorMsg += ` (${data.details})`;
        }
        if (data.hint) {
          errorMsg += ` Hint: ${data.hint}`;
        }
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // Account created - redirect to login
      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      console.error("Signup error:", err);
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-primary-800 to-primary-900 p-8 flex-col justify-between relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-primary-700/20 via-transparent to-transparent" />

        {/* Logo */}
        <div className="relative">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Muaina</span>
          </Link>
        </div>

        {/* Main content */}
        <div className="relative">
          <h2 className="text-2xl xl:text-3xl font-bold text-white mb-3 leading-tight">
            Join the future of diagnostic reporting
          </h2>
          <p className="text-primary-200 text-base leading-relaxed">
            Create your account and experience AI-powered analysis that
            transforms your workflow.
          </p>

          {/* Features list */}
          <div className="mt-5 space-y-2">
            {[
              "AI-powered report analysis",
              "Secure HIPAA-compliant storage",
              "Real-time collaboration tools",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 text-primary-200 text-sm"
              >
                <CheckCircle className="h-4 w-4 text-primary-300" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust indicator */}
        <div className="relative flex items-center gap-2 text-primary-300 text-sm">
          <Shield className="h-4 w-4" />
          Trusted by 500+ healthcare professionals
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-6 bg-neutral-50">
        <Card className="w-full max-w-md border-0 shadow-xl animate-fade-in">
          <CardHeader className="space-y-1 text-center pb-2 pt-4">
            {/* Mobile logo */}
            <div className="lg:hidden mb-4 flex justify-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-800 to-primary-700 flex items-center justify-center shadow-md">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-neutral-800">
                  Muaina
                </span>
              </Link>
            </div>
            <CardTitle className="text-xl font-bold text-neutral-800">
              Create your account
            </CardTitle>
            <CardDescription className="text-neutral-500 text-sm">
              Enter your information to get started
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-3 pt-2 px-5">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive-50 border border-destructive-200">
                  <AlertCircle className="h-4 w-4 text-destructive-600 shrink-0" />
                  <p className="text-xs text-destructive-700">{error}</p>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 border border-success-200">
                  <CheckCircle className="h-4 w-4 text-success-600 shrink-0" />
                  <p className="text-xs text-success-700">{success}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label
                    htmlFor="firstName"
                    className="text-xs font-medium text-neutral-700"
                  >
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="lastName"
                    className="text-xs font-medium text-neutral-700"
                  >
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label
                    htmlFor="email"
                    className="text-xs font-medium text-neutral-700"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="organization"
                    className="text-xs font-medium text-neutral-700"
                  >
                    Organization
                  </Label>
                  <select
                    id="organization"
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                    className={`flex h-9 w-full rounded-lg border bg-white px-3 py-1.5 text-sm transition-all duration-200 focus:border-primary-800 focus:ring-2 focus:ring-primary-100 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50 ${
                      orgsError ? "border-destructive-300 text-destructive-700" : "border-neutral-300 text-neutral-800"
                    }`}
                    required
                    disabled={isLoading || orgsLoading || organizations.length === 0}
                  >
                    {orgsLoading ? (
                      <option value="">Loading...</option>
                    ) : orgsError ? (
                      <option value="">{orgsError}</option>
                    ) : organizations.length === 0 ? (
                      <option value="">No organizations</option>
                    ) : (
                      organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="branch"
                  className="text-xs font-medium text-neutral-700"
                >
                  Branch Location <span className="text-neutral-400">(Optional)</span>
                </Label>
                <Input
                  id="branch"
                  placeholder="e.g., DHA Phase 5, Gulshan-e-Iqbal"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  disabled={isLoading}
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label
                    htmlFor="password"
                    className="text-xs font-medium text-neutral-700"
                  >
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-xs font-medium text-neutral-700"
                  >
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2 pb-4 px-5">
              <Button
                type="submit"
                className="w-full h-10"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Sign Up"
                )}
              </Button>
              <p className="text-center text-xs text-neutral-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-primary-800 hover:text-primary-700 font-semibold transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
