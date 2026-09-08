import Link from "next/link";
import { PageState } from "@/packages/ui/extended/PageState";

export default function NotFound() {
  return (
    <PageState
      title="页面未找到"
      description="404：请求的页面不存在或已被移除。"
      actions={
        <Link className="link-light" href="/en/list/category">
          返回首页
        </Link>
      }
    />
  );
}
