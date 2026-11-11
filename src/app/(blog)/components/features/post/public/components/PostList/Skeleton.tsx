import { Skeleton } from "@/components/ui/skeleton";

export function PostListSkeleton({
  label,
  count = 4,
  className,
}: {
  label: string;
  count?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={className}
    >
      <div aria-hidden="true" className="flex flex-col gap-4">
        {Array.from({ length: count }, (_, index) => (
          <PostListItemSkeleton key={index} hasCover={index % 3 !== 2} />
        ))}
      </div>
    </div>
  );
}

function PostListItemSkeleton({ hasCover }: { hasCover: boolean }) {
  return (
    <div className="bg-auto-back-gray/60">
      {hasCover && (
        <div className="relative aspect-video">
          <Skeleton className="absolute inset-0 h-full w-full rounded-none bg-auto-front-gray/10" />
          <Skeleton className="absolute left-2 top-2 h-5 w-14 rounded-sm bg-auto-front-gray/20" />
        </div>
      )}
      <div className="p-2 lg:px-4">
        <Skeleton className="h-5 w-4/5 rounded-sm bg-auto-front-gray/10" />
        <div className="mt-2 space-y-1">
          <Skeleton className="h-4 w-full rounded-sm bg-auto-front-gray/10" />
          <Skeleton className="h-4 w-3/5 rounded-sm bg-auto-front-gray/10" />
        </div>
      </div>
    </div>
  );
}
