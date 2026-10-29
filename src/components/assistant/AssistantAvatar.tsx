import Image from "next/image";
import type { AvatarType } from "@/lib/db/types";
import styles from "./AssistantPanel.module.css";

/**
 * The assistant as the user chose to see her: the official portrait, a
 * gradient orb, or just her initial. Decorative: the name is always nearby.
 */
export function AssistantAvatar({
  type,
  name,
  size,
  className = "",
}: {
  type: AvatarType;
  name: string;
  size: number;
  className?: string;
}) {
  const box = { width: size, height: size };
  if (type === "human") {
    return (
      <Image
        src={size > 64 ? "/brand/avatar-head.png" : "/brand/avatar-head-64.png"}
        alt=""
        width={size}
        height={size}
        className={`${styles.avatar} ${className}`}
      />
    );
  }
  if (type === "abstract") {
    return (
      <span
        className={`${styles.avatar} ${styles.orb} ${className}`}
        style={box}
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className={`${styles.avatar} ${styles.initial} ${className}`}
      style={{ ...box, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
