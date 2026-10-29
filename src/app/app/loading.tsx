import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="stack" aria-busy="true">
      <Skeleton width="40%" height="2.2rem" />
      <div className="grid-kpi">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height="140px" radius="20px" />
        ))}
      </div>
      <Skeleton height="220px" radius="20px" />
    </div>
  );
}
