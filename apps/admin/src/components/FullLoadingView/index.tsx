import { Loader2 } from "lucide-react";

const FullLoadingView = () => {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
};

export default FullLoadingView;
