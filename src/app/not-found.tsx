import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl font-semibold">页面未找到</h1>
      <p role="alert">404：请求的页面不存在或已被移除。</p>
      <Link className="link-light" href="/en/list/category">
        返回首页
      </Link>
    </main>
  );
}
