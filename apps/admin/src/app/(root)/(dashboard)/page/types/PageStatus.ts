import { PAGE_STATUS, PageStatus as PageStatusType } from "@honeycomb/db";

export const PageStatus = Object.freeze({
  PUBLISHED: PAGE_STATUS[0],
  DRAFT: PAGE_STATUS[1],
  TO_AUDIT: PAGE_STATUS[2],
} as const);
export type PageStatus = PageStatusType;

export const PageStatusName = Object.freeze({
  PUBLISHED: "已发布",
  DRAFT: "草稿",
  TO_AUDIT: "待审核",
} as const);

export const pageStatusOptions = [
  {
    label: PageStatusName.PUBLISHED,
    value: PageStatus.PUBLISHED,
  },
  {
    label: PageStatusName.DRAFT,
    value: PageStatus.DRAFT,
  },
  {
    label: PageStatusName.TO_AUDIT,
    value: PageStatus.TO_AUDIT,
  },
];
