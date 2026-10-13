import { useCallback, useRef, useState } from "react";

// Each upload or action owns one pending slot. Finishing one must not unlock
// publishing while another upload still has a result to add to the draft.
export default function usePendingOperations() {
  const pending = useRef(0);
  const [count, setCount] = useState(0);
  const setBusy = useCallback((active) => {
    pending.current = Math.max(0, pending.current + (active ? 1 : -1));
    setCount(pending.current);
  }, []);
  const isBusy = useCallback(() => pending.current > 0, []);
  return [count > 0, setBusy, isBusy];
}
