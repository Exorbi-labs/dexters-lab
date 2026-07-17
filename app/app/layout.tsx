import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { CommandPalette } from "@/components/command-palette";
import { serverMode, currentMember } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Phase 1 live → the workspace is behind real sign-in
  if (serverMode() && !(await currentMember())) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col bg-paper/40 md:flex-row">
      <Sidebar />
      <MobileNav />
      <CommandPalette />
      <div className="flex-1 min-w-0">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10">{children}</div>
      </div>
    </div>
  );
}
