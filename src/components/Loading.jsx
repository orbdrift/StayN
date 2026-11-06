import { CircularProgress } from "@mui/material";

// Shown while a page waits for its data (the same pattern on every page).
export default function Loading() {
  return (
    <div className="container" style={{ minHeight: "40vh", display: "grid", placeItems: "center" }}>
      <CircularProgress aria-label="Loading" />
    </div>
  );
}
