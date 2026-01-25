import type { SetVideoOptions } from "@/packages/ui/extended/Tiptap/components/VideoNode";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: SetVideoOptions) => ReturnType;
    };
  }
}
