import { useEffect, useState } from "react";

export default function useGrace(ms = 2500) {
  const [waiting, setWaiting] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setWaiting(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return waiting;
}
