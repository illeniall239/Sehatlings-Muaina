import { InsuranceSidebar } from "@/components/layout/insurance-sidebar";
import { Header } from "@/components/layout/header";
import { InsuranceAuthGuard } from "@/components/auth/insurance-auth-guard";

export default function InsuranceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InsuranceAuthGuard>
      <div className="min-h-screen bg-neutral-50/50">
        <InsuranceSidebar />
        <div className="pl-64">
          <Header />
          <main className="p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </InsuranceAuthGuard>
  );
}
