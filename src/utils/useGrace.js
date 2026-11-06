import { useEffect, useState } from "react";

// True for the first `ms` milliseconds on a page, so a page can wait for fresh data (for example a booking that was
// just saved) before it decides the data does not exist and redirects.
export default function useGrace(ms = 2500) {
  const [waiting, setWaiting] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setWaiting(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return waiting;
}
