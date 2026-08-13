import { getAuthProviders } from "@/app/admin/lib/auth-providers";

export function GET() {
  return Response.json(getAuthProviders());
}
