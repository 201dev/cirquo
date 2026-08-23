import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoNotice({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground",
        className,
      )}
    >
      <FlaskConical className="size-4" aria-hidden="true" />
      {compact ? "Mode demo" : "Data demo — belum terhubung ke backend"}
    </div>
  );
}
