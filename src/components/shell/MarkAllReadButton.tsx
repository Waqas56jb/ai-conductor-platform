"use client";

import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { markAllNotificationsRead } from "@/app/app/actions";
import { Button } from "@/components/ui";

export function MarkAllReadButton({ label }: { label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      onClick={() => startTransition(() => markAllNotificationsRead())}
    >
      <CheckCheck aria-hidden="true" />
      {label}
    </Button>
  );
}
