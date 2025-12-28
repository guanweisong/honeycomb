import { redirect } from "next/navigation";

/**
 * 根页面组件。
 * 默认重定向到应用的根路径。
 */
export default function Home() {
  redirect("/zh/list/category");
}
