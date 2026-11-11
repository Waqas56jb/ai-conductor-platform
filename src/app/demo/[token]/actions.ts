"use server";

import { revalidatePath } from "next/cache";
import { cancelDemo, confirmDemo } from "@/lib/demo/booking";

// The token in the link is the permission: only the team inbox receives it.
// Actions are POSTed from the page, so mail scanners that open links never act.

export async function confirmDemoAction(token: string) {
  await confirmDemo(token);
  revalidatePath(`/demo/${token}`);
}

export async function cancelDemoAction(token: string) {
  await cancelDemo(token);
  revalidatePath(`/demo/${token}`);
}
