import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDocumentAccess } from "@/lib/documents/access";
import { DocumentWorkspace } from "@/components/document-workspace";

type PageProps = {
  params: Promise<{ docId: string }>;
};

export default async function DocumentPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { docId } = await params;
  const access = await getDocumentAccess(docId, session.user.id);
  if (!access) notFound();

  return (
    <DocumentWorkspace
      userId={session.user.id}
      document={{
        id: access.document.id,
        title: access.document.title,
        content: access.document.content,
        clock: access.document.clock as Record<string, number>,
        role: access.role,
        updatedAt: access.document.updatedAt.toISOString(),
      }}
    />
  );
}
