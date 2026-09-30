import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import { readDraft } from "@/lib/server/configuration";
import { Builder } from "@/components/admin/builder";
export const dynamic = "force-dynamic";
export default async function Admin() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.permissions.includes("sidebar:read")) redirect("/app/home");
  return (
    <Builder
      initial={await readDraft()}
      user={{
        id: user.id,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        groups: user.groups,
      }}
    />
  );
}
