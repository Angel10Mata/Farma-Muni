import { requireAdminPageAccess } from "@/lib/user-role";

export const dynamic = "force-dynamic";

// Solo administradores

export default async function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPageAccess();
  return children;
}
