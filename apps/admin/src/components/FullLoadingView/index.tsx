import { Loader2 } from "lucide-react";

/**
 * 全屏加载视图组件。
 * 在数据加载或页面初始化时显示一个居中的加载动画。
 * @returns {JSX.Element} 全屏加载视图。
 */
const FullLoadingView = () => {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
};

export default FullLoadingView;
