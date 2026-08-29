import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";

export class QueryErrorBoundary extends Component<
  {
    children: ReactNode;
    title?: string;
  },
  { error: unknown }
> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-card px-5 py-8 text-center"
        >
          <p className="font-semibold">
            {this.props.title ?? "Data tidak dapat dimuat"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {getErrorMessage(this.state.error, "Periksa koneksi internet, lalu coba lagi.")}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => this.setState({ error: null })}
          >
            Coba lagi
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
