import { redirect } from "next/navigation";

/**
 * 应用的根页面 (/)。
 * 该组件在服务端将用户重定向到管理后台首页。
 */
const Home = () => redirect("/admin/dashboard");

export default Home;
