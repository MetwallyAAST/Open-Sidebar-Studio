import { requireUser, apiError } from "@/lib/server/auth";
import { publishedConfig } from "@/lib/server/configuration";
export async function GET() {
  try {
    return Response.json(await publishedConfig(await requireUser()), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
