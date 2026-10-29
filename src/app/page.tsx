import { redirect } from "next/navigation";

// The marketing site is served separately (legacy/client); the app starts at /app.
export default function Home() {
  redirect("/app");
}
