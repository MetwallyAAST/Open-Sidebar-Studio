import { redirect } from "next/navigation";
import { currentUser, HttpError } from "@/lib/server/auth";
import { publishedConfig } from "@/lib/server/configuration";
import { Application } from "@/components/sidebar/application";
export const dynamic = "force-dynamic";
export default async function AppPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const result = await publishedConfig(user).catch((e) => {
    if (e instanceof HttpError) return e;
    throw e;
  });
  if (result instanceof HttpError)
    return (
      <main className="loading">
        <h1>Navigation unavailable</h1>
        <p>{result.message}</p>
      </main>
    );
  const { slug } = await params;
  return (
    <Application
      config={result}
      path={"/app/" + (slug?.join("/") || "home")}
      name={user.name}
      canEdit={user.permissions.includes("sidebar:read")}
    />
  );
}
