import { Node, mergeAttributes, CommandProps, RawCommands } from "@tiptap/core";

export type SetVideoOptions = { src: string };

const Video = Node.create({
  name: "video",
  group: "block",
  inline: false,
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "video" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes(HTMLAttributes)];
  },

  addCommands(): Partial<RawCommands> {
    return {
      setVideo: (options: SetVideoOptions) => {
        return ({ commands }: CommandProps): boolean => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        };
      },
    };
  },
});

export default Video;
