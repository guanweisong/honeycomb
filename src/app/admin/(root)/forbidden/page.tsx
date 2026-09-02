import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/packages/ui/components/button";
import { PageState } from "@/packages/ui/extended/PageState";

export default function ForbiddenPage() {
  return (
    <PageState
      title="无权访问"
      description="当前账号没有访问此页面的权限，请联系管理员或返回后台首页。"
      icon={
        <ShieldX
          className="text-muted-foreground"
          aria-hidden
          size={56}
          strokeWidth={1.5}
        />
      }
      actions={
        <Button asChild>
          <Link href="/admin/dashboard">返回后台首页</Link>
        </Button>
      }
    />
  );
}
