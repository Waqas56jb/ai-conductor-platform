import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { env } from "@/lib/env";

// The marketing site is served separately (legacy/client); the app starts at /app.
export default async function Home() {
  const profile = await getProfile();
  redirect(profile || !env.NEXT_PUBLIC_SITE_URL ? "/app" : env.NEXT_PUBLIC_SITE_URL);
}
