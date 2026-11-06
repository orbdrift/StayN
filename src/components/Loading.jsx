import { CircularProgress } from "@mui/material";

export default function Loading() {
  return (
    <div className="container" style={{ minHeight: "40vh", display: "grid", placeItems: "center" }}>
      <CircularProgress aria-label="Loading" />
    </div>
  );
}
