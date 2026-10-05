import { requireAdminPageAccess } from "@/lib/user-role";

// Solo administradores

export default async function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPageAccess();
  return children;
}
