export default function AdminRouteFallback() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-32 items-center justify-center text-muted-foreground"
    >
      正在加载
    </div>
  );
}
