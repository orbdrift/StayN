import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";

export default function DocViewer({ doc, label = "View", size = "small" }) {
  const [open, setOpen] = useState(false);
  if (!doc) return null;
  if (!doc.url) return <span title={doc.name}>on file</span>;
  const isPdf = doc.type === "application/pdf" || doc.url.startsWith("data:application/pdf");

  return (
    <>
      <Button size={size} onClick={() => setOpen(true)} sx={{ p: 0, minWidth: 0, textTransform: "none", textDecoration: "underline" }}>{label}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" slotProps={{ paper: { sx: { borderRadius: "12px" } } }}>
        <DialogTitle sx={{ fontFamily: "Poppins, sans-serif", fontWeight: 600 }}>{doc.name}</DialogTitle>
        <DialogContent>
          {isPdf
            ? <iframe title={doc.name} src={doc.url} style={{ width: "100%", height: "70vh", border: 0 }} />
            : <img src={doc.url} alt={doc.name} style={{ maxWidth: "100%", maxHeight: "70vh", display: "block", margin: "0 auto" }} />}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="outlined" color="inherit" onClick={() => setOpen(false)} sx={{ borderColor: "var(--border)" }}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
