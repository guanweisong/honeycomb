import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-screen w-full items-center justify-center bg-background text-muted-foreground"
    >
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>正在加载</span>
      </div>
    </main>
  );
}
