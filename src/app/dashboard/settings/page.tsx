"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  User,
  Building2,
  Mail,
  Shield,
  Loader2,
  CheckCircle,
} from "lucide-react";

export default function SettingsPage() {
  const { profile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const userName = profile?.profile?.first_name
    ? `${profile.profile.first_name} ${profile.profile.last_name || ""}`.trim()
    : "User";

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save - implement actual save logic here
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Settings
        </h1>
        <p className="text-neutral-500 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-100">
              <User className="h-5 w-5 text-primary-700" />
            </div>
            <div>
              <CardTitle className="text-lg">Profile Information</CardTitle>
              <CardDescription>
                Your personal details and contact information
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                defaultValue={profile?.profile?.first_name || ""}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                defaultValue={profile?.profile?.last_name || ""}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              defaultValue={profile?.email || ""}
              disabled
              className="bg-neutral-50"
            />
            <p className="text-xs text-neutral-500">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title / Position</Label>
              <Input
                id="title"
                defaultValue={profile?.profile?.title || ""}
                placeholder="e.g., Senior Pathologist"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                defaultValue={profile?.profile?.specialization || ""}
                placeholder="e.g., Clinical Pathology"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Saved!
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organization Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-100">
              <Building2 className="h-5 w-5 text-primary-700" />
            </div>
            <div>
              <CardTitle className="text-lg">Organization</CardTitle>
              <CardDescription>
                Your organization and role information
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-neutral-50 border border-neutral-200">
                <Building2 className="h-4 w-4 text-neutral-400" />
                <span className="text-sm text-neutral-700">
                  {profile?.organization?.name || "Not assigned"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-neutral-50 border border-neutral-200">
                <Shield className="h-4 w-4 text-neutral-400" />
                <span className="text-sm text-neutral-700 capitalize">
                  {profile?.role || "pathologist"}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            Organization and role can only be changed by an administrator.
          </p>
        </CardContent>
      </Card>

      {/* Account Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-100">
              <Mail className="h-5 w-5 text-primary-700" />
            </div>
            <div>
              <CardTitle className="text-lg">Account</CardTitle>
              <CardDescription>
                Manage your account security and preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
            <div>
              <p className="text-sm font-medium text-neutral-800">Password</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Last changed: Unknown
              </p>
            </div>
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-destructive-200 bg-destructive-50/50">
            <div>
              <p className="text-sm font-medium text-destructive-800">
                Delete Account
              </p>
              <p className="text-xs text-destructive-600 mt-0.5">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
