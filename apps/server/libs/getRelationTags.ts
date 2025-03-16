import prisma from "@/libs/prisma";
import { MultiLang } from ".prisma/client";

export interface RelationTag {
  id: string;
  name: MultiLang;
}

export const getRelationTags = (ids: string[] = []): Promise<RelationTag[]> => {
  if (ids.length === 0) {
    return Promise.resolve([]);
  }
  return prisma.tag.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
    },
  });
};
