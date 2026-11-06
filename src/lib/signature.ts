/** What the visitor signs on the card comes back at the bottom of the page. */
type Listener = (url: string | null) => void;
let current: string | null = null;
const listeners = new Set<Listener>();

export const signature = {
  get: () => current,
  set(url: string | null) {
    current = url;
    listeners.forEach((l) => l(url));
  },
  listen(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
