import { useState } from "react";
import MailOutlinedIcon from "@mui/icons-material/MailOutlined";
import { useAuth } from "../context/AuthContext";

export default function VerifyBanner() {
  const { user, resendVerification, refreshVerification } = useAuth();
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState("");
  if (!user || user.emailVerified) return null;
  const resend = async () => { const r = await resendVerification(); setSent(r.ok); setNote(r.ok ? "" : r.error || "Could not send the email."); };
  const check = async () => { setNote((await refreshVerification()) ? "" : "Not verified yet. Open the link in the email first."); };
  return (
    <div className="verify-banner">
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <MailOutlinedIcon fontSize="small" />
        <span>Verify your email to send booking requests. We sent a link to <strong>{user.email}</strong>.</span>
      </span>
      <span style={{ display: "inline-flex", gap: 16, alignItems: "center" }}>
        {note && <span>{note}</span>}
        <button type="button" className="link-button" onClick={resend}>{sent ? "Email sent" : "Resend email"}</button>
        <button type="button" className="link-button" onClick={check}>I verified it</button>
      </span>
    </div>
  );
}
