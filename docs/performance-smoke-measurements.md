# Browser performance smoke measurements

The `@performance` test emits `interaction-resource-smoke` JSON in the Playwright
job log and attaches the same object locally. CI deletes its exclusive test
directory, so the log is the retained evidence. It contains only fixed metric,
browser, build-mode, and machine fields.

## Measurement version 2

The previous whole-workflow ratio was not a stable baseline. Navigation can
replace the document and reset CDP `TaskDuration`; removing a fixed delay also
changed its wall-time denominator. Neither a negative delta nor an inflated
active utilization ratio should be treated as a valid comparison to that sample.

- `activeMetric: same-document-main-thread-task-seconds` reports scroll, detail,
  and back segments. Each sample contains CDP `NavigationStart`, `Timestamp`, and
  `TaskDuration`. Only samples from the same document are subtracted. A document
  change produces `kind: navigation-boundary` with raw samples and null work and
  percentage values, even if the later counter is greater. These segments are
  **not** a total of all navigation work. Missing/nonfinite metrics, invalid sample
  clocks, and counter resets within one document fail instead of becoming zero.
- `steadyStateMetric: post-interaction-main-thread-task-percent` is a separate
  one-second observation after the return page is visible. Its denominator is the
  difference between CDP monotonic `Timestamp` samples, not the whole workflow.
  The observation interval is not added to active segments and does not dilute
  their values. A document change during this sample fails.
- `E2E_PERF_MAX_CPU_PERCENT` retains its default of 70, now explicitly gating the
  separate steady-state sample. This is a **definition change**, not a comparable
  historical active-ratio baseline or a measured new SLO. CDP task duration is a
  main-thread busy-time proxy, not operating-system total CPU utilization.
- Existing heap-used, heap-delta, and DOM-count ceilings are unchanged. Active task
  seconds are recorded without inventing a new blocking threshold; establishing
  one requires repeated comparable CI samples from the same build mode and
  machine class.

Version 2 must not be presented as evidence of a performance improvement. Unit
regressions exercise counter boundaries and demonstrate that 90% sustained work
still exceeds the retained 70% gate; a real browser run is needed to establish
runtime results.
