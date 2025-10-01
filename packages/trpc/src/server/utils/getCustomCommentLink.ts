import process from "process";

export const getCustomCommentLink = (customId?: string | null) => {
  if (customId === process.env.LINK_OBJECT_ID) {
    return {
      id: customId,
      title: {
        zh: "比邻",
        en: "Links",
      },
    };
  }
};
