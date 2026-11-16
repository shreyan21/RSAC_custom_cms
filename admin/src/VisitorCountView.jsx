import { useEffect, useState } from "react";
import { api } from "./api";
import { isValidVisitorCount, maxVisitorCount } from "../../shared/visitorCount.js";

const formatCount = (count) => count.toLocaleString("en-IN");

export default function VisitorCountView() {
  const [current, setCurrent] = useState(null);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const request = new AbortController();
    api("/api/admin/visitor-count", { signal: request.signal }).then(({ count }) => {
      if (!Number.isSafeInteger(count) || count < 0) throw new Error("The server did not return a visitor count.");
      if (!request.signal.aborted) setCurrent(count);
    }).catch((failure) => {
      if (!request.signal.aborted) setError(failure.status === 404
        ? "Visitor count management is not available on the running API yet. Contact the technical administrator."
        : failure.message);
    });
    return () => request.abort();
  }, [refresh]);

  const retry = () => {
    setCurrent(null);
    setError("");
    setNotice("");
    setRefresh((revision) => revision + 1);
  };

  const review = (count) => {
    setNotice("");
    if (!isValidVisitorCount(count)) {
      setError(`Enter a whole number from 0 to ${formatCount(maxVisitorCount)}.`);
      return;
    }
    setError("");
    setPending(count);
  };

  const save = async () => {
    if (pending === null || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/admin/visitor-count", { method: "PUT", body: JSON.stringify({ count: pending }) });
      if (result.count !== pending) throw new Error("The server did not confirm the new total. Refresh the count before trying again.");
      setCurrent(result.count);
      setValue("");
      setPending(null);
      setNotice(`Visitor count set to ${formatCount(result.count)}. New visits will add to this total.`);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };

  return (
    <section className="password-panel" aria-label="Visitor count settings">
      <div>
        <h2>Public footer total</h2>
        <p aria-live="polite"><strong>Current count: {current === null ? (error ? "Unavailable" : "Loading…") : formatCount(current)}</strong></p>
        <p>This changes the total visitors see. Recorded daily visits are kept, and new visits continue adding to the new total.</p>
      </div>
      {error && <p className="alert error" role="alert">{error}</p>}
      {notice && <p className="alert success" role="status">{notice}</p>}
      {pending === null ? (
        <form className="visitor-count-form" onSubmit={(event) => { event.preventDefault(); review(/^\d+$/.test(value.trim()) ? Number(value) : NaN); }}>
          <label><span>New visitor count</span><input inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} disabled={current === null} /></label>
          <div className="editor-actions">
            <button className="secondary" type="button" onClick={retry}>Refresh count</button>
            <button className="secondary" type="button" onClick={() => review(0)} disabled={current === null}>Reset to 0</button>
            <button className="primary" type="submit" disabled={current === null}>Set count</button>
          </div>
        </form>
      ) : (
        <div className="alert info">
          <p>Change the public visitor count from {formatCount(current)} to <strong>{formatCount(pending)}</strong>?</p>
          <div className="editor-actions">
            <button className="secondary" type="button" onClick={() => { setPending(null); setError(""); }} disabled={busy}>Cancel</button>
            <button className="primary" type="button" onClick={save} disabled={busy}>{busy ? "Saving…" : pending === 0 ? "Confirm reset" : "Confirm change"}</button>
          </div>
        </div>
      )}
    </section>
  );
}
