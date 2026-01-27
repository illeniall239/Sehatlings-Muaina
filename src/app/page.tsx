import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function Home() {
  const user = await getCurrentUser();

  // If user is already logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Otherwise, redirect to login page
  redirect("/login");
}
