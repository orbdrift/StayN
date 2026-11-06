import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Chip, TextField, Typography } from "@mui/material";
import PasswordField from "../../components/PasswordField";
import { useAuth } from "../../context/AuthContext";

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="panel" style={{ padding: 36 }}>
        <Typography variant="h2" component="h1" sx={{ fontSize: 28 }}>{title}</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>{subtitle}</Typography>
        {children}
      </div>
    </div>
  );
}

const demoAccounts = [
  { label: "Guest (Ana)", email: "ana@stayn.test" },
  { label: "Guest, unverified (Carla)", email: "carla@stayn.test" },
  { label: "Host (Maria)", email: "maria.host@stayn.test" },
  { label: "Admin", email: "admin@stayn.test" },
];
const DEMO_PASSWORD = "Demo#1234";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const enter = async (address, pass) => {
    setError("");
    setBusy(true);
    const result = await login(address, pass);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    const u = result.user;
    const home = u.role === "admin" ? "/admin" : u.role === "host" ? "/host" : "/reservations";
    navigate(location.state?.from || home, { replace: true });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Enter your email and password.");
    enter(email, password);
  };

  return (
    <AuthCard title="Log in" subtitle="Welcome back.">
      <form onSubmit={submit} noValidate>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField fullWidth label="Email" placeholder="name@email.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} />
        <PasswordField fullWidth label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div style={{ textAlign: "right", margin: "8px 0 16px" }}>
          <Link to="/forgot-password" style={{ color: "var(--primary)", textDecoration: "none" }}>Forgot password?</Link>
        </div>
        <Button fullWidth type="submit" variant="contained" disabled={busy}>Log in</Button>
      </form>
      <Typography align="center" color="text.secondary" sx={{ mt: 2 }}>
        New to StayN? <Link to="/register" style={{ color: "var(--primary)", textDecoration: "none" }}>Sign up</Link>
      </Typography>

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px dashed var(--border)" }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Demo accounts: tap one to sign in as a sample user.</Typography>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {demoAccounts.map((a) => <Chip key={a.email} label={a.label} variant="outlined" disabled={busy} onClick={() => enter(a.email, DEMO_PASSWORD)} />)}
        </div>
      </div>
    </AuthCard>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!f.name.trim() || !f.email.trim() || !f.phone.trim()) return setError("Fill in your name, email and phone.");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setError("Enter a valid email address.");
    if (!/^09\d{9}$/.test(f.phone)) return setError("Enter an 11-digit phone number that starts with 09.");
    if (f.password.length < 6) return setError("Use a password with at least 6 characters.");
    if (f.password !== f.confirm) return setError("The passwords do not match.");
    setBusy(true);
    const result = await register({ name: f.name.trim(), email: f.email, phone: f.phone, password: f.password });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    navigate("/reservations", { replace: true });
  };

  return (
    <AuthCard title="Create your account" subtitle="It takes a minute.">
      <form onSubmit={submit} noValidate>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField fullWidth label="Full name" placeholder="Maria Reyes" value={f.name} onChange={set("name")} sx={{ mb: 2 }} />
        <TextField fullWidth label="Email" placeholder="name@email.com" type="email" value={f.email} onChange={set("email")} sx={{ mb: 2 }} />
        <TextField fullWidth label="Phone" placeholder="09171234567" value={f.phone} onChange={set("phone")} sx={{ mb: 2 }} />
        <PasswordField fullWidth label="Password" value={f.password} onChange={set("password")} sx={{ mb: 2 }} />
        <PasswordField fullWidth label="Confirm password" value={f.confirm} onChange={set("confirm")} sx={{ mb: 3 }} />
        <Button fullWidth type="submit" variant="contained" disabled={busy}>Sign up</Button>
      </form>
      <Typography align="center" color="text.secondary" variant="body2" sx={{ mt: 2 }}>We'll send a verification email.</Typography>
      <Typography align="center" color="text.secondary" sx={{ mt: 1 }}>
        Have an account? <Link to="/login" style={{ color: "var(--primary)", textDecoration: "none" }}>Log in</Link>
      </Typography>
    </AuthCard>
  );
}

export function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    setError("");
    const result = await resetPassword(email);
    if (!result.ok) return setError(result.error);
    setSent(true);
  };

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email. We'll send a reset link.">
      <form onSubmit={submit} noValidate>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {sent && <Alert severity="success" sx={{ mb: 2 }}>If an account exists for {email}, a reset link is on its way.</Alert>}
        <TextField fullWidth label="Email" placeholder="name@email.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 3 }} />
        <Button fullWidth type="submit" variant="contained">Send reset link</Button>
      </form>
      <Typography align="center" sx={{ mt: 2 }}>
        <Link to="/login" style={{ color: "var(--primary)", textDecoration: "none" }}>Back to log in</Link>
      </Typography>
    </AuthCard>
  );
}
