/**
 * A tiny signal between the hero's RSVP button and the top bar: "dock the monogram now".
 * The bar (Nav.tsx) normally docks the monogram when the hero scrolls away; tapping RSVP on the
 * hero asks for the same move first, then navigates, so the monogram is seen gliding into the
 * corner where the RSVP page keeps it.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function requestDock() {
  listeners.forEach((listener) => listener());
}

/** Returns an unsubscribe function. */
export function onDockRequest(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
