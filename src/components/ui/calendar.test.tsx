import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  CalendarDay,
  type ChevronProps,
  type DayButtonProps,
  type RootProps,
  type WeekNumberProps,
} from "@daypicker/react";
import { enUS, fr } from "@daypicker/react/locale";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";

const month = new Date(2026, 5, 1);
const selectedDay = new Date(2026, 5, 12);

function CustomRoot({ rootRef, ...props }: RootProps) {
  return <div ref={rootRef} data-custom-root="true" {...props} />;
}

function CustomChevron({ orientation }: ChevronProps) {
  return <span data-custom-chevron={orientation} />;
}

function CustomDayButton(props: DayButtonProps) {
  return <CalendarDayButton {...props} locale={fr} data-custom-day="true" />;
}

function CustomWeekNumber({ week, ...props }: WeekNumberProps) {
  return <td {...props} data-custom-week={week.weekNumber} />;
}

describe("Calendar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(props: React.ComponentProps<typeof Calendar>) {
    act(() => root.render(<Calendar month={month} today={month} {...props} />));
  }

  function dayButton(isoDate: string) {
    const button = container.querySelector<HTMLButtonElement>(
      `td[data-day="${isoDate}"] button`,
    );
    if (!button) throw new Error(`Missing day button for ${isoDate}`);
    return button;
  }

  it.each([
    ["default root", undefined],
    ["custom root", CustomRoot],
  ] as const)(
    "preserves slot DOM and focus on rerender with %s",
    (_, RootSlot) => {
      const props = {
        mode: "single",
        selected: selectedDay,
        showWeekNumber: true,
        components: RootSlot ? { Root: RootSlot } : undefined,
      } as const;
      render(props);

      const calendar = container.firstElementChild;
      const day = dayButton("2026-06-12");
      const chevron = container.querySelector(".rdp-button_previous svg");
      const weekNumber = container.querySelector(".rdp-week_number");
      expect(chevron).not.toBeNull();
      expect(weekNumber).not.toBeNull();
      act(() => day.focus());
      expect(document.activeElement).toBe(day);

      render({ ...props, className: "updated-calendar" });

      expect.soft(container.firstElementChild).toBe(calendar);
      expect.soft(dayButton("2026-06-12")).toBe(day);
      expect
        .soft(container.querySelector(".rdp-button_previous svg"))
        .toBe(chevron);
      expect.soft(container.querySelector(".rdp-week_number")).toBe(weekNumber);
      expect.soft(document.activeElement).toBe(day);
      expect(
        container.firstElementChild?.classList.contains("updated-calendar"),
      ).toBe(true);
    },
  );

  it("updates locale and month formatting without remounting day buttons", () => {
    const formatMonthDropdown = vi.fn(() => "Custom month");
    const props = {
      mode: "single",
      selected: selectedDay,
      captionLayout: "dropdown",
      formatters: { formatMonthDropdown },
      classNames: { day_button: "custom-day-class" },
    } as const;
    render({ ...props, locale: enUS });
    const day = dayButton("2026-06-12");
    expect(day.dataset.day).toBe("6/12/2026");

    render({ ...props, locale: fr });

    expect(dayButton("2026-06-12")).toBe(day);
    expect(day.dataset.day).toBe("12/06/2026");
    expect(day.getAttribute("aria-label")).toContain("juin");
    expect(day.classList.contains("custom-day-class")).toBe(true);
    expect(
      container.querySelector(".rdp-months_dropdown option")?.textContent,
    ).toBe("Custom month");
    expect(container.firstElementChild?.getAttribute("lang")).toBe("fr");
  });

  it("honors custom component overrides and their explicit locale", () => {
    render({
      mode: "single",
      selected: selectedDay,
      showWeekNumber: true,
      locale: enUS,
      components: {
        Root: CustomRoot,
        Chevron: CustomChevron,
        DayButton: CustomDayButton,
        WeekNumber: CustomWeekNumber,
      },
    });

    expect(container.querySelector("[data-custom-root]")).not.toBeNull();
    expect(
      container.querySelector('[data-custom-chevron="left"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-custom-chevron="right"]'),
    ).not.toBeNull();
    expect(container.querySelector("[data-custom-week]")).not.toBeNull();
    expect(dayButton("2026-06-12").dataset.customDay).toBe("true");
    expect(dayButton("2026-06-12").dataset.day).toBe("12/06/2026");
  });

  it("keeps single selection, labels, disabled days, and keyboard navigation", () => {
    const onSelect = vi.fn();
    render({
      mode: "single",
      selected: selectedDay,
      onSelect,
      disabled: new Date(2026, 5, 14),
      locale: enUS,
    });
    const day = dayButton("2026-06-12");
    expect(day.dataset.selectedSingle).toBe("true");
    expect(day.closest("td")?.getAttribute("aria-selected")).toBe("true");
    expect(day.getAttribute("aria-label")).toContain("June 12th, 2026");
    expect(dayButton("2026-06-14").disabled).toBe(true);
    act(() => dayButton("2026-06-14").click());
    expect(onSelect).not.toHaveBeenCalled();

    act(() => day.focus());
    act(() =>
      day.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      ),
    );
    expect(document.activeElement).toBe(dayButton("2026-06-13"));
    act(() => dayButton("2026-06-13").click());
    expect(onSelect.mock.calls[0]?.[0]).toEqual(new Date(2026, 5, 13));
  });

  it("keeps range modifiers and range selection behavior", () => {
    const onSelect = vi.fn();
    const from = new Date(2026, 5, 10);
    const to = new Date(2026, 5, 12);
    render({ mode: "range", selected: { from, to }, onSelect });

    expect(dayButton("2026-06-10").dataset.rangeStart).toBe("true");
    expect(dayButton("2026-06-11").dataset.rangeMiddle).toBe("true");
    expect(dayButton("2026-06-12").dataset.rangeEnd).toBe("true");
    expect(dayButton("2026-06-11").dataset.selectedSingle).toBe("false");

    render({ mode: "range", selected: { from, to: undefined }, onSelect });
    act(() => dayButton("2026-06-12").click());
    expect(onSelect.mock.calls[0]?.[0]).toEqual({ from, to });
  });

  it("supports the exported day button outside DayPicker context", () => {
    act(() =>
      root.render(
        <CalendarDayButton
          day={new CalendarDay(selectedDay, month)}
          modifiers={{ selected: true }}
          locale={fr}
          aria-label="Standalone day"
        >
          12
        </CalendarDayButton>,
      ),
    );

    const day = container.querySelector("button");
    expect(day?.dataset.day).toBe("12/06/2026");
    expect(day?.getAttribute("aria-label")).toBe("Standalone day");
  });
});
