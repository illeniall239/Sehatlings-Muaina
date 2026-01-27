/**
 * Auth Layout
 * This layout is used for authentication pages (login, signup, etc.)
 * It does NOT include the navbar for a cleaner auth experience.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
