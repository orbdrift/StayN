import { useState } from "react";
import { Alert, Button, Snackbar, Typography } from "@mui/material";
import PasswordField from "./PasswordField";
import ConfirmDialog from "./ConfirmDialog";
import { useAuth } from "../context/AuthContext";

const empty = { current: "", next: "", confirm: "" };

// Used on the guest Profile page and the Host Profile page.
// The form is checked first, then a dialog asks to confirm, then the password is changed and a message says so.
export default function ChangePassword() {
  const { changePassword } = useAuth();
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    if (!f.current) return setMsg({ type: "error", text: "Enter your current password." });
    if (f.next.length < 6) return setMsg({ type: "error", text: "Use a new password with at least 6 characters." });
    if (f.next === f.current) return setMsg({ type: "error", text: "The new password must be different from the current one." });
    if (f.next !== f.confirm) return setMsg({ type: "error", text: "The new passwords do not match." });
    setAsking(true);
  };

  const apply = async () => {
    setAsking(false);
    setBusy(true);
    const result = await changePassword(f.current, f.next);
    setBusy(false);
    if (!result.ok) return setMsg({ type: "error", text: result.error });
    setF(empty);
    setMsg({ type: "success", text: "Password changed. Use your new password the next time you log in." });
    setDone(true);
  };

  return (
    <form onSubmit={submit} className="panel" style={{ marginTop: 24 }} noValidate>
      <Typography variant="h3" component="h2" sx={{ mb: 2 }}>Change password</Typography>
      {msg.text && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}
      <PasswordField fullWidth label="Current password" autoComplete="current-password" value={f.current} onChange={set("current")} sx={{ mb: 2 }} />
      <PasswordField fullWidth label="New password" autoComplete="new-password" value={f.next} onChange={set("next")} sx={{ mb: 2 }} />
      <PasswordField fullWidth label="Confirm new password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} sx={{ mb: 3 }} />
      <Button type="submit" variant="contained" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>

      <ConfirmDialog
        open={asking}
        title="Change your password?"
        message="Your password changes right away. You will use the new password the next time you log in."
        confirmLabel="Change password"
        onClose={() => setAsking(false)}
        onConfirm={apply}
      />
      <Snackbar open={done} autoHideDuration={6000} onClose={() => setDone(false)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" onClose={() => setDone(false)} sx={{ width: "100%" }}>Password changed.</Alert>
      </Snackbar>
    </form>
  );
}
