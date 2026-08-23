import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCardProps {
  label: string;
  value: string;
  description?: string;
  icon?: ReactNode;
  tone?: "default" | "green" | "blue" | "amber";
}

const toneStyles = {
  default: "bg-card",
  green: "bg-secondary",
  blue: "bg-in-progress/10",
  amber: "bg-residual/12",
};

export function SummaryCard({
  label,
  value,
  description,
  icon,
  tone = "default",
}: SummaryCardProps) {
  return (
    <Card className={`border-0 shadow-none ${toneStyles[tone]}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-5 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {icon ? (
          <span className="grid size-9 place-items-center rounded-lg bg-background/70 text-primary [&_svg]:size-[18px]">
            {icon}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <p className="text-2xl font-semibold tracking-[-0.03em]">{value}</p>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
