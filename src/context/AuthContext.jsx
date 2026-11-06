import { createContext, useContext, useEffect, useRef, useState } from "react";
import { CircularProgress } from "@mui/material";
import {
  EmailAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, reauthenticateWithCredential,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updatePassword,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { todayISO } from "../utils/dates";

const AuthContext = createContext(null);

const friendly = (e) => ({
  "auth/email-already-in-use": "That email already has an account.",
  "auth/invalid-credential": "Wrong email or password.",
  "auth/wrong-password": "Wrong email or password.",
  "auth/user-not-found": "Wrong email or password.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/weak-password": "Use a password with at least 6 characters.",
  "auth/too-many-requests": "Too many tries. Wait a moment and try again.",
  "auth/network-request-failed": "No internet connection. Try again.",
  "auth/operation-not-allowed": "Email and password sign-in is not turned on in Firebase yet.",
}[e.code] || "Something went wrong. Please try again.");

export function AuthProvider({ children }) {
  const [fbUser, setFbUser] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [application, setApplication] = useState(null);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setFbUser(u);
    if (!u) { setProfile(null); setApplication(null); }
  }), []);

  useEffect(() => {
    if (!fbUser) return undefined;
    setProfile((p) => (p && p.id === fbUser.uid ? p : undefined));
    const stopProfile = onSnapshot(
      doc(db, "users", fbUser.uid),
      (s) => setProfile((prev) => (s.exists() ? { ...s.data(), id: s.id } : prev && prev.id === fbUser.uid ? prev : null)),
      () => setProfile(null),
    );
    const stopApplication = onSnapshot(
      doc(db, "hostApplications", fbUser.uid),
      (s) => setApplication(s.exists() ? { ...s.data(), id: s.id } : null),
      () => setApplication(null),
    );
    return () => { stopProfile(); stopApplication(); };
  }, [fbUser?.uid]);

  useEffect(() => {
    if (fbUser?.emailVerified && profile && profile.emailVerified === false)
      updateDoc(doc(db, "users", fbUser.uid), { emailVerified: true }).catch(() => {});
  }, [fbUser, profile]);

  const loggingIn = useRef(false);
  useEffect(() => { if (profile?.status === "suspended" && !loggingIn.current) signOut(auth); }, [profile?.status]);

  const loading = fbUser === undefined || (fbUser && profile === undefined);
  const user = fbUser && profile ? { ...profile, id: fbUser.uid, emailVerified: Boolean(profile.emailVerified || fbUser.emailVerified) } : null;

  const login = async (email, password) => {
    loggingIn.current = true;
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (!snap.exists()) { await signOut(auth); return { ok: false, error: "No account data was found for this email." }; }
      const data = { ...snap.data(), id: snap.id };
      if (data.status === "suspended") { await signOut(auth); return { ok: false, error: "Your account is suspended. Contact the StayN team." }; }
      return { ok: true, user: data };
    } catch (e) {
      return { ok: false, error: friendly(e) };
    } finally {
      loggingIn.current = false;
    }
  };

  const register = async ({ name, email, phone, password }) => {
    let created = null;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      created = cred.user;
      const data = { name, email: email.trim(), phone, photoURL: "", role: "guest", status: "active", emailVerified: false, createdAt: todayISO() };
      await setDoc(doc(db, "users", created.uid), data);
      setProfile({ ...data, id: created.uid });
      sendEmailVerification(created).catch(() => {});
      return { ok: true, user: { ...data, id: created.uid } };
    } catch (e) {
      if (created) await created.delete().catch(() => {});
      return { ok: false, error: friendly(e) };
    }
  };

  const logout = () => signOut(auth);

  const changePassword = async (current, next) => {
    if (!fbUser) return { ok: false, error: "Log in again to change your password." };
    try {
      await reauthenticateWithCredential(fbUser, EmailAuthProvider.credential(fbUser.email, current));
      await updatePassword(fbUser, next);
      return { ok: true };
    } catch (e) {
      const wrong = e.code === "auth/invalid-credential" || e.code === "auth/wrong-password";
      return { ok: false, error: wrong ? "Your current password is not correct." : friendly(e) };
    }
  };

  const resetPassword = async (email) => {
    try { await sendPasswordResetEmail(auth, email.trim()); return { ok: true }; }
    catch (e) { return e.code === "auth/user-not-found" ? { ok: true } : { ok: false, error: friendly(e) }; }
  };

  const resendVerification = async () => {
    if (!auth.currentUser) return { ok: false };
    try { await sendEmailVerification(auth.currentUser); return { ok: true }; }
    catch (e) { return { ok: false, error: friendly(e) }; }
  };

  const refreshVerification = async () => {
    const u = auth.currentUser;
    if (!u) return false;
    await u.reload();
    if (!u.emailVerified) return false;
    await u.getIdToken(true);
    await updateDoc(doc(db, "users", u.uid), { emailVerified: true }).catch(() => {});
    return true;
  };

  const homePath = !user ? "/" : user.role === "admin" ? "/admin" : user.role === "host" ? "/host" : "/reservations";

  if (loading) {
    return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}><CircularProgress aria-label="Loading" /></div>;
  }

  return (
    <AuthContext.Provider value={{ user, application, login, register, logout, changePassword, resetPassword, resendVerification, refreshVerification, homePath }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
