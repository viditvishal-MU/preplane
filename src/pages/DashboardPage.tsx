import { useRole } from "@/lib/roles";
import { AdminLmpDashboard } from "@/components/lmp-views/AdminLmpDashboard";
import { AllocatorLmpDashboard } from "@/components/lmp-views/AllocatorLmpDashboard";
import { PocLmpDashboard } from "@/components/lmp-views/PocLmpDashboard";

export default function DashboardPage() {
  const { viewAsRole } = useRole();
  if (viewAsRole === "admin") return <AdminLmpDashboard />;
  if (viewAsRole === "allocator") return <AllocatorLmpDashboard />;
  return <PocLmpDashboard />;
}
