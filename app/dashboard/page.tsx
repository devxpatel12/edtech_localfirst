import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listAccessibleDocuments } from "@/lib/documents/access";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const documents = await listAccessibleDocuments(session.user.id);

  return <DashboardShell initialDocuments={documents} />;
}
