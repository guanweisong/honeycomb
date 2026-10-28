import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Table as TanStackTable } from "@tanstack/react-table";

type StickySurface = "header" | "body";
type PinnedSide = "left" | "right";

const selectionCellKey = "special:selection";
const actionCellKey = "special:actions";
const columnCellKey = (columnId: string) => `column:${columnId}`;

export type PinnedShadowEdge = "left" | "right";

export interface PinnedColumnShadowOverlay {
  edge: PinnedShadowEdge;
  style: CSSProperties;
}

interface PinnedPosition {
  side: PinnedSide;
  offset: number;
  shadowOnLeft?: boolean;
  shadowOnRight?: boolean;
}

export interface PinnedColumnOffsets {
  enabled: boolean;
  shadowOverlays: PinnedColumnShadowOverlay[];
  registerColumnHeader: (
    columnId: string,
    element: HTMLTableCellElement | null,
  ) => void;
  registerSelectionHeader: (element: HTMLTableCellElement | null) => void;
  registerActionHeader: (element: HTMLTableCellElement | null) => void;
  getColumnStyle: (
    columnId: string,
    surface: StickySurface,
  ) => CSSProperties | undefined;
  getSelectionStyle: (surface: StickySurface) => CSSProperties | undefined;
  getActionStyle: (surface: StickySurface) => CSSProperties | undefined;
}

interface UsePinnedColumnOffsetsOptions<TData> {
  table: TanStackTable<TData>;
  selectableRows: boolean;
  hasRowActions: boolean;
}

export function usePinnedColumnOffsets<TData>(
  options: UsePinnedColumnOffsetsOptions<TData>,
): PinnedColumnOffsets {
  const { table, selectableRows, hasRowActions } = options;
  const measuredElements = useRef(new Map<string, HTMLTableCellElement>());
  const observerRef = useRef<ResizeObserver | null>(null);
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(
    null,
  );
  const [measuredWidths, setMeasuredWidths] = useState<Record<string, number>>(
    {},
  );
  const [shadowOverlays, setShadowOverlays] = useState<
    PinnedColumnShadowOverlay[]
  >([]);

  const visibleColumns = table.getVisibleLeafColumns();
  const layoutKey = [
    selectableRows,
    hasRowActions,
    ...visibleColumns.map(
      (column) =>
        `${column.id}:${column.columnDef.meta?.pin ?? ""}:${column.getSize()}`,
    ),
  ].join("|");
  const hasPinnedColumns = visibleColumns.some(
    (column) => column.columnDef.meta?.pin,
  );
  const enabled = hasPinnedColumns || hasRowActions || selectableRows;

  const measureWidths = useCallback(() => {
    const nextWidths: Record<string, number> = {};

    for (const [key, element] of measuredElements.current) {
      const width = element.getBoundingClientRect().width;
      if (width > 0) nextWidths[key] = width;
    }

    setMeasuredWidths((currentWidths) => {
      const currentKeys = Object.keys(currentWidths);
      const nextKeys = Object.keys(nextWidths);
      const hasSameWidths =
        currentKeys.length === nextKeys.length &&
        nextKeys.every(
          (key) =>
            Math.abs(
              (currentWidths[key] ?? 0) - (nextWidths[key] ?? 0),
            ) < 0.5,
        );

      return hasSameWidths ? currentWidths : nextWidths;
    });
  }, []);

  const registerMeasuredElement = useCallback(
    (key: string, element: HTMLTableCellElement | null) => {
      if (element) {
        const container = element.closest<HTMLElement>(
          '[data-slot="table-container"]',
        );
        if (container) {
          setScrollContainer((current) =>
            current === container ? current : container,
          );
        }
      }

      const previousElement = measuredElements.current.get(key);
      if (previousElement === element) return;

      if (previousElement) observerRef.current?.unobserve(previousElement);
      if (element) {
        measuredElements.current.set(key, element);
        observerRef.current?.observe(element);
      } else {
        measuredElements.current.delete(key);
      }
    },
    [],
  );

  const registerColumnHeader = useCallback(
    (columnId: string, element: HTMLTableCellElement | null) =>
      registerMeasuredElement(columnCellKey(columnId), element),
    [registerMeasuredElement],
  );
  const registerSelectionHeader = useCallback(
    (element: HTMLTableCellElement | null) =>
      registerMeasuredElement(selectionCellKey, element),
    [registerMeasuredElement],
  );
  const registerActionHeader = useCallback(
    (element: HTMLTableCellElement | null) =>
      registerMeasuredElement(actionCellKey, element),
    [registerMeasuredElement],
  );

  const positions = useMemo(() => {
    const nextPositions = new Map<string, PinnedPosition>();
    if (!enabled) return nextPositions;

    const leftPinnedColumnIds = visibleColumns
      .filter((column) => column.columnDef.meta?.pin === "left")
      .map((column) => column.id);
    const leftBoundaryColumnId = leftPinnedColumnIds.at(-1);

    if (selectableRows) {
      nextPositions.set(selectionCellKey, {
        side: "left",
        offset: 0,
        shadowOnRight: leftBoundaryColumnId === undefined,
      });
    }

    let leftOffset = selectableRows
      ? (measuredWidths[selectionCellKey] ?? 0)
      : 0;

    for (const column of visibleColumns) {
      if (column.columnDef.meta?.pin !== "left") continue;

      const key = columnCellKey(column.id);
      nextPositions.set(key, {
        side: "left",
        offset: leftOffset,
        shadowOnRight: column.id === leftBoundaryColumnId,
      });
      leftOffset += measuredWidths[key] ?? column.getSize();
    }

    const rightPinnedColumnIds = visibleColumns
      .filter((column) => column.columnDef.meta?.pin === "right")
      .map((column) => column.id);
    const rightBoundaryColumnId = rightPinnedColumnIds[0];

    if (hasRowActions) {
      nextPositions.set(actionCellKey, {
        side: "right",
        offset: 0,
        shadowOnLeft: rightBoundaryColumnId === undefined,
      });
    }

    let rightOffset = hasRowActions ? (measuredWidths[actionCellKey] ?? 0) : 0;

    for (const column of [...visibleColumns].reverse()) {
      if (column.columnDef.meta?.pin !== "right") continue;

      const key = columnCellKey(column.id);
      nextPositions.set(key, {
        side: "right",
        offset: rightOffset,
        shadowOnLeft: column.id === rightBoundaryColumnId,
      });
      rightOffset += measuredWidths[key] ?? column.getSize();
    }

    return nextPositions;
  }, [
    enabled,
    hasRowActions,
    measuredWidths,
    selectableRows,
    visibleColumns,
  ]);

  const measureShadowOverlays = useCallback(() => {
    const nextOverlays: PinnedColumnShadowOverlay[] = [];
    const tableWrapper = scrollContainer?.parentElement;

    if (enabled && scrollContainer && tableWrapper) {
      const maxScrollLeft = Math.max(
        0,
        scrollContainer.scrollWidth - scrollContainer.clientWidth,
      );
      const scrollLeft = Math.max(
        0,
        Math.min(scrollContainer.scrollLeft, maxScrollLeft),
      );
      const scrollContainerRect = scrollContainer.getBoundingClientRect();
      const tableWrapperRect = tableWrapper.getBoundingClientRect();
      const top =
        scrollContainerRect.top -
        tableWrapperRect.top -
        tableWrapper.clientTop;
      const height = scrollContainer.clientHeight;
      const shadowWidth = 12;

      const addOverlay = (key: string, edge: PinnedShadowEdge) => {
        const element = measuredElements.current.get(key);
        if (!element) return;

        const rect = element.getBoundingClientRect();
        nextOverlays.push({
          edge,
          style: {
            left:
              (edge === "right" ? rect.right : rect.left - shadowWidth) -
              tableWrapperRect.left -
              tableWrapper.clientLeft,
            top,
            bottom: "auto",
            height,
            zIndex: 20,
          },
        });
      };

      const leftBoundary = [...positions.entries()].find(
        ([, position]) => position.shadowOnRight,
      );
      if (leftBoundary && scrollLeft > 0.5) {
        addOverlay(leftBoundary[0], "right");
      }

      const rightBoundary = [...positions.entries()].find(
        ([, position]) => position.shadowOnLeft,
      );
      if (rightBoundary && scrollLeft < maxScrollLeft - 0.5) {
        addOverlay(rightBoundary[0], "left");
      }
    }

    setShadowOverlays((current) => {
      const hasSameOverlays =
        current.length === nextOverlays.length &&
        nextOverlays.every((next, index) => {
          const currentStyle = current[index]?.style;
          return (
            current[index]?.edge === next.edge &&
            Math.abs(Number(currentStyle?.left) - Number(next.style.left)) <
              0.5 &&
            Math.abs(Number(currentStyle?.top) - Number(next.style.top)) <
              0.5 &&
            Math.abs(Number(currentStyle?.height) - Number(next.style.height)) <
              0.5
          );
        });

      return hasSameOverlays ? current : nextOverlays;
    });
  }, [enabled, positions, scrollContainer]);

  const measurePinnedLayout = useCallback(() => {
    measureWidths();
    measureShadowOverlays();
  }, [measureShadowOverlays, measureWidths]);

  useEffect(() => {
    if (!enabled) return;

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measurePinnedLayout);
    observerRef.current = resizeObserver;
    const tableWrapper = scrollContainer?.parentElement;
    const tableElement = scrollContainer?.querySelector("table");

    if (scrollContainer) resizeObserver?.observe(scrollContainer);
    if (tableWrapper) resizeObserver?.observe(tableWrapper);
    if (tableElement) resizeObserver?.observe(tableElement);
    for (const element of measuredElements.current.values()) {
      resizeObserver?.observe(element);
    }

    if (!resizeObserver && typeof window !== "undefined") {
      window.addEventListener("resize", measurePinnedLayout);
    }

    let active = true;
    queueMicrotask(() => {
      if (active) measureWidths();
    });
    const initialMeasurement =
      typeof window === "undefined"
        ? null
        : window.requestAnimationFrame(measureShadowOverlays);

    scrollContainer?.addEventListener("scroll", measureShadowOverlays, {
      passive: true,
    });

    return () => {
      active = false;
      resizeObserver?.disconnect();
      if (observerRef.current === resizeObserver) observerRef.current = null;
      if (initialMeasurement !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(initialMeasurement);
      }
      if (!resizeObserver && typeof window !== "undefined") {
        window.removeEventListener("resize", measurePinnedLayout);
      }
      scrollContainer?.removeEventListener("scroll", measureShadowOverlays);
    };
  }, [
    enabled,
    layoutKey,
    measurePinnedLayout,
    measureShadowOverlays,
    measureWidths,
    scrollContainer,
  ]);

  const getStickyStyle = useCallback(
    (key: string, surface: StickySurface): CSSProperties | undefined => {
      const position = positions.get(key);
      if (!position) return undefined;

      return {
        position: "sticky",
        [position.side]: position.offset,
        zIndex: surface === "header" ? 2 : 1,
      };
    },
    [positions],
  );

  const getColumnStyle = useCallback(
    (columnId: string, surface: StickySurface) =>
      getStickyStyle(columnCellKey(columnId), surface),
    [getStickyStyle],
  );
  const getSelectionStyle = useCallback(
    (surface: StickySurface) => getStickyStyle(selectionCellKey, surface),
    [getStickyStyle],
  );
  const getActionStyle = useCallback(
    (surface: StickySurface) => {
      if (!hasRowActions) return undefined;

      return (
        getStickyStyle(actionCellKey, surface) ?? {
          position: "sticky",
          right: 0,
          zIndex: surface === "header" ? 2 : 1,
        }
      );
    },
    [getStickyStyle, hasRowActions],
  );
  return {
    enabled,
    shadowOverlays,
    registerColumnHeader,
    registerSelectionHeader,
    registerActionHeader,
    getColumnStyle,
    getSelectionStyle,
    getActionStyle,
  };
}
