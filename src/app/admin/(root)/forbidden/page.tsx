import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/packages/ui/components/button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <ShieldX
          className="text-muted-foreground"
          aria-hidden
          size={56}
          strokeWidth={1.5}
        />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">无权访问</h1>
          <p className="text-muted-foreground">
            当前账号没有访问此页面的权限，请联系管理员或返回后台首页。
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/dashboard">返回后台首页</Link>
        </Button>
      </div>
    </main>
  );
}
