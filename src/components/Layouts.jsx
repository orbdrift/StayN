import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import Sidebar from "./Sidebar";
import VerifyBanner from "./VerifyBanner";
import { useAuth } from "../context/AuthContext";

export function PublicLayout() {
  return (
    <div className="app-shell">
      <Header />
      <VerifyBanner />
      <main className="app-main"><Outlet /></main>
      <Footer />
    </div>
  );
}

export function DashboardLayout() {
  const { user } = useAuth();
  return (
    <div className="app-shell">
      <Header />
      <VerifyBanner />
      <div className="dash-body">
        <Sidebar role={user.role} />
        <main className="dash-main"><Outlet /></main>
      </div>
    </div>
  );
}
