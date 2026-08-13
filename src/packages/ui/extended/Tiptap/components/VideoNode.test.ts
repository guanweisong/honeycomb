import { describe, expect, it, vi } from "vitest";
import Video from "./VideoNode";

describe("Video node", () => {
  it("defines video HTML attributes and serializes its source", () => {
    const node = Video as unknown as {
      config: {
        addAttributes: () => { src: { default: null } };
        renderHTML: (input: { HTMLAttributes: Record<string, string> }) => unknown[];
      };
    };

    expect(node.config.addAttributes()).toEqual({ src: { default: null } });
    expect(node.config.renderHTML({ HTMLAttributes: { src: "/movie.mp4" } })).toEqual([
      "video",
      { src: "/movie.mp4" },
    ]);
  });

  it("inserts a video through the custom command", () => {
    const insertContent = vi.fn(() => true);
    const node = Video as unknown as {
      config: {
        addCommands: () => {
          setVideo: (options: { src: string }) => (input: {
            commands: { insertContent: typeof insertContent };
          }) => boolean;
        };
      };
    };

    const command = node.config.addCommands().setVideo({ src: "/movie.mp4" });
    expect(command({ commands: { insertContent } })).toBe(true);
    expect(insertContent).toHaveBeenCalledWith({
      type: "video",
      attrs: { src: "/movie.mp4" },
    });
  });
});
