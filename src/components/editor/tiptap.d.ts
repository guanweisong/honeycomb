import type { SetVideoOptions } from "@/components/editor/components/VideoNode";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: SetVideoOptions) => ReturnType;
    };
  }
}
