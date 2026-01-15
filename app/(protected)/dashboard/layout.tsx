import { FloatingPlayer } from "@/components/ui/floating-player";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <FloatingPlayer />
    </>
  );
}
