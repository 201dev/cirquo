import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export class QueryErrorBoundary extends Component<
  {
    children: ReactNode;
    title?: string;
  },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-card px-5 py-8 text-center"
        >
          <p className="font-semibold">
            {this.props.title ?? "Data tidak dapat dimuat"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Periksa koneksi internet, lalu coba lagi.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => this.setState({ hasError: false })}
          >
            Coba lagi
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
