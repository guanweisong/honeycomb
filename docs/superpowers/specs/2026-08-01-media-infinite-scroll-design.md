# Media Infinite Scroll Design

## Goal

Prevent the admin media page from loading and rendering the entire media table at once by loading media in pages as the user scrolls.

## Scope

- Keep the existing `media.index` backend query and response shape.
- Change the media page client query from `limit: 99999` to fixed-size pagination.
- Append later pages to the existing media list.
- Use an `IntersectionObserver` sentinel to request the next page automatically.
- Reset pagination after upload or deletion.
- Preserve the current media selection, copy, delete, and upload behavior.

## Behavior

- Each request loads 50 records.
- The first request uses `page: 1` and `limit: 50`.
- When the sentinel enters the viewport, the next page is requested if no request is active and `loadedCount < total`.
- Results are appended in page order.
- A loading indicator is shown while fetching another page.
- Once all records are loaded, no additional request is made.
- An empty result keeps the existing empty-state skeleton behavior.
- Upload and delete success reset the list to page 1 and refetch the first page.

## Components

- `mediaQuery.ts` owns page state, accumulated results, request coordination, and reset behavior.
- `MediaPageShell.tsx` owns the sentinel element and observes it with `IntersectionObserver`.
- `MediaGrid.tsx` remains responsible for rendering media items and receives the accumulated list.
- Existing router pagination remains unchanged.

## Error Handling

- Query errors continue to be surfaced by the existing tRPC query state.
- A failed next-page request must not advance the page or discard already loaded items.
- A later intersection event may retry the failed page.
- Resetting after a mutation clears accumulated records before requesting page 1.

## Testing

- Update media query tests to assert the initial `{ page: 1, limit: 50 }` input and page advancement/reset behavior.
- Add coverage for preventing concurrent next-page requests and stopping at `total`.
- Keep the existing media grid tests passing.
- Run the focused media tests and type checking.
