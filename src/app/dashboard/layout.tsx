import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-neutral-50/50">
        <Sidebar />
        <div className="pl-64">
          <Header />
          <main className="p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
