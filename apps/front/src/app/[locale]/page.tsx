import { redirect } from "next/navigation";

/**
 * 首页组件。
 * 默认重定向到分类列表页面。
 */
export default function Home() {
  redirect("/list/category");
}
