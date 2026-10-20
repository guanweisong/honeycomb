import { notFound } from "next/navigation";
import { PageStatus } from "@/features/page/page-status";

type PageDetailLike =
  | {
      status?: PageStatus | string | null;
    }
  | null
  | undefined;

export function assertPublishedPage<T extends NonNullable<PageDetailLike>>(
  pageDetail: T | null | undefined,
): T {
  if (!pageDetail || pageDetail.status !== PageStatus.PUBLISHED) {
    notFound();
  }

  return pageDetail;
}
