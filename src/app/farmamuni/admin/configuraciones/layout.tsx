import { requireSuperPageAccess } from "@/lib/user-role";

export default async function ConfiguracionesAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperPageAccess();
  return children;
}
