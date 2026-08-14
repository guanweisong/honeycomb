import DashboardPageClient from "./components/DashboardPageClient";

/**
 * 后台管理主看板页面。
 * 该页面用于以可视化的方式展示网站的核心统计数据。
 *
 * 功能：
 * 1. 使用 tRPC 的 `useQuery` hook 从 `statistic.index` 端点获取统计数据。
 * 2. 对获取到的数据进行转换，将英文枚举值（如 `ARTICLE`）映射为中文名称（如 `文章`）。
 * 3. 将处理后的数据分别传递给多个 `CustomPie` 组件，以饼图的形式渲染出来，
 *    展示内容包括：文章类型分布、评论状态分布、用户等级分布和用户贡献分布。
 */
export default function Dashboard() {
  return <DashboardPageClient />;
}
