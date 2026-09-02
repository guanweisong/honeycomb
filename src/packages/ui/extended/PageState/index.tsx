import type { ReactNode } from "react";
import { cn } from "@/packages/ui/lib/utils";

export interface PageStateProps {
  /** 页面状态标题；省略时只渲染描述。 */
  title?: ReactNode;
  /** 页面状态说明。 */
  description?: ReactNode;
  /** 标题上方的状态图标或插画。 */
  icon?: ReactNode;
  /** 页面状态操作按钮或链接。 */
  actions?: ReactNode;
  /** 是否使用紧凑布局，适用于后台局部错误边界。 */
  compact?: boolean;
  className?: string;
}

/**
 * 统一的页面级反馈状态布局。
 * 页面边界只负责提供语义和操作，具体布局由此组件统一维护。
 */
export function PageState({
  title,
  description,
  icon,
  actions,
  compact = false,
  className,
}: PageStateProps) {
  return (
    <main
      role="alert"
      className={cn(
        compact ? undefined : "flex min-h-screen items-center justify-center p-6",
        className,
      )}
    >
      <div
        className={cn(
          compact ? undefined : "flex max-w-md flex-col items-center gap-4 text-center",
        )}
      >
        {icon}
        {title || description ? (
          <div className={cn(compact ? undefined : "space-y-2")}>
            {title ? <h1 className="text-2xl font-semibold">{title}</h1> : null}
            {description ? (
              <p className="text-muted-foreground">{description}</p>
            ) : null}
          </div>
        ) : null}
        {actions ? <div>{actions}</div> : null}
      </div>
    </main>
  );
}
