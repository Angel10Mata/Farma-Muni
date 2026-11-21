import { requireSuperPageAccess } from "@/lib/user-role";

export default async function DispositivosAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperPageAccess();
  return children;
}
