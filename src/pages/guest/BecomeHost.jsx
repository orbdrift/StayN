import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, TextField, Typography } from "@mui/material";
import PageHeading from "../../components/PageHeading";
import DocumentPicker from "../../components/DocumentPicker";
import StatusBadge from "../../components/StatusBadge";
import { useData } from "../../context/DataContext";
import { useAuth } from "../../context/AuthContext";

const ID_TYPES = ["National ID (PhilSys)", "Driver's license", "Passport", "UMID", "Postal ID", "Other government ID"];

export default function BecomeHost() {
  const { user, application } = useAuth();
  const { submitApplication } = useData();
  const [f, setF] = useState({ fullName: user.name, phone: user.phone, address: "", bio: "" });
  const [idType, setIdType] = useState("");
  const [idDoc, setIdDoc] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!f.fullName.trim() || !f.address.trim() || !f.bio.trim()) return setError("Fill in your name, address and a short bio.");
    if (!/^09\d{9}$/.test(f.phone)) return setError("Enter an 11-digit phone number that starts with 09.");
    if (!idType) return setError("Choose the type of ID you will upload.");
    if (!idDoc) return setError("Upload a clear photo of your valid ID.");
    if (!agreed) return setError("Please confirm that your details are true and agree to the host rules.");
    submitApplication(user.id, { ...f, idType, idDocument: idDoc, agreed: true });
  };

  if (application) {
    const text = {
      pending: "Your application is with the StayN team. We will notify you when it is reviewed.",
      approved: "You are an approved host. You can add and manage properties.",
      rejected: "Your application was not approved this time.",
      deactivated: "Your host account is deactivated. Contact the StayN team.",
    }[application.status];
    return (
      <div className="container" style={{ maxWidth: 640 }}>
        <PageHeading title="Become a Host" />
        <div className="panel">
          <Typography sx={{ fontWeight: 500, mb: 1 }}>Application status <StatusBadge status={application.status} /></Typography>
          <Typography color="text.secondary">{text}</Typography>
          {application.status === "approved" && <Button component={Link} to="/host" variant="contained" sx={{ mt: 2 }}>Go to dashboard</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <PageHeading title="Become a Host" subtitle="Tell us a little about you. The StayN team reviews every application." />
      <form onSubmit={submit} className="panel" noValidate>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField fullWidth label="Full name" value={f.fullName} onChange={set("fullName")} sx={{ mb: 2 }} />
        <TextField fullWidth label="Phone" value={f.phone} onChange={set("phone")} sx={{ mb: 2 }} />
        <TextField fullWidth label="Home address" value={f.address} onChange={set("address")} sx={{ mb: 2 }} />
        <TextField fullWidth multiline minRows={3} label="Short bio" value={f.bio} onChange={set("bio")} sx={{ mb: 2 }} />
        <TextField select fullWidth label="Type of valid ID" value={idType} onChange={(e) => setIdType(e.target.value)} sx={{ mb: 2 }}>
          {ID_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <div style={{ marginBottom: 8 }}>
          <DocumentPicker label="Photo of your ID" hint="A clear photo of the front, with your name and photo visible. Only the StayN team can see it." value={idDoc} onChange={setIdDoc} />
        </div>
        <FormControlLabel
          sx={{ mb: 2, alignItems: "flex-start" }}
          control={<Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />}
          label="I confirm that my details are true and I agree to follow the StayN host rules."
        />
        <Button type="submit" variant="contained">Send application</Button>
      </form>
    </div>
  );
}
