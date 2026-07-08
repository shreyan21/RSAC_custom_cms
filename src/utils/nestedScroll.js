/**
 * Wheel handler for scrollable cards living inside the page.
 *
 * While the cursor sits on a scrollable card the wheel belongs to the card —
 * including at its top/bottom boundary. Chaining the boundary event to the
 * page would scroll the card away from under the cursor and un-flip it the
 * moment its content ends; the card must only flip back when the cursor
 * actually leaves it. stopPropagation also keeps the window "is scrolling"
 * marker (SmoothScroll) from firing, which would otherwise reset the flip.
 * Page scrolling with the cursor incidentally over cards stays safe: while
 * html.rsac-is-scrolling is set the card backs are pointer-events: none, so
 * this handler never sees those events.
 */
export function handleNestedWheel(event) {
  const el = event.currentTarget;

  if (el.scrollHeight <= el.clientHeight) {
    return;
  }

  event.stopPropagation();
}
