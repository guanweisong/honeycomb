import LoadingState from "@/packages/ui/extended/LoadingState";

/**
 * Dashboard 页面切换时的内容区加载状态。
 * Next.js 会将该组件放在 dashboard layout 的 children 边界内，保留侧边栏和页头。
 */
export default function DashboardLoading() {
  return <LoadingState />;
}
