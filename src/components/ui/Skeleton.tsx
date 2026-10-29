import styles from "./Skeleton.module.css";

type Props = { width?: string; height?: string; radius?: string };

export function Skeleton({ width = "100%", height = "1rem", radius = "8px" }: Props) {
  return (
    <span
      className={styles.skeleton}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}
