import { Button } from "../../components/button";
import type { DataTablePaginationState } from "./types";

interface DataTablePaginationProps {
  total: number;
  isFetching?: boolean;
  paginationState: DataTablePaginationState;
  onPaginationChange: (value: DataTablePaginationState) => void;
}

export function DataTablePagination(props: DataTablePaginationProps) {
  const { total, isFetching, paginationState, onPaginationChange } = props;

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        第 {total === 0 ? 0 : paginationState.page} /{" "}
        {Math.max(1, Math.ceil(total / paginationState.limit))} 页， 共 {total}{" "}
        条
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onPaginationChange({
              ...paginationState,
              page: paginationState.page - 1,
            })
          }
          disabled={paginationState.page === 1 || isFetching}
        >
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onPaginationChange({
              ...paginationState,
              page: paginationState.page + 1,
            })
          }
          disabled={
            paginationState.page * paginationState.limit >= total || isFetching
          }
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
