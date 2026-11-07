import { useState } from "react";
import { Button, Tab, Tabs, TextField } from "@mui/material";
import ConfirmDialog from "../../components/ConfirmDialog";
import DocViewer from "../../components/DocViewer";
import PageHeading from "../../components/PageHeading";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/EmptyState";
import { useData } from "../../context/DataContext";

export default function AdminHosts() {
  const { applications, properties, setApplication, setPropertyStatus, updateApplication, updateUser } = useData();
  const [tab, setTab] = useState("applications");
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const pending = applications.filter((a) => a.status === "pending");
  const hosts = applications.filter((a) => ["approved", "deactivated"].includes(a.status));

  const deactivate = (a) => {
    updateApplication(a.id, { status: "deactivated" });
    updateUser(a.id, { role: "guest" });
    properties.filter((p) => p.hostId === a.id && p.status === "approved").forEach((p) => setPropertyStatus(p.id, "inactive"));
  };
  const reactivate = (a) => { updateApplication(a.id, { status: "approved" }); updateUser(a.id, { role: "host" }); };

  return (
    <>
      <PageHeading title="Hosts" />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: "1px solid var(--border)", mb: 3 }}>
        <Tab value="applications" label={`Applications (${pending.length})`} sx={{ textTransform: "none" }} />
        <Tab value="hosts" label="Hosts" sx={{ textTransform: "none" }} />
      </Tabs>

      {tab === "applications" ? (
        pending.length === 0 ? <EmptyState title="No applications" message="New host applications will show up here." /> : (
          <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
            <table className="table align-middle mb-0" style={{ minWidth: 900 }}>
              <thead><tr><th style={{ paddingLeft: 20 }}>Applicant</th><th>Phone</th><th>Address</th><th>Bio</th><th>ID</th><th style={{ paddingRight: 20 }}>Actions</th></tr></thead>
              <tbody>
                {pending.map((a) => (
                  <tr key={a.id}>
                    <td style={{ paddingLeft: 20 }}>{a.fullName}</td><td>{a.phone}</td><td>{a.address}</td><td>{a.bio}</td>
                    <td>{a.idDocument ? <>{a.idType && <div style={{ fontSize: 13 }}>{a.idType}</div>}<DocViewer doc={a.idDocument} label="View ID" /></> : "—"}</td>
                    <td style={{ paddingRight: 20, whiteSpace: "nowrap" }}>
                      <Button size="small" variant="contained" disabled={!a.idDocument} title={a.idDocument ? "" : "No ID on file"} onClick={() => setApplication(a.id, "approved")}>Approve</Button>{" "}
                      <Button size="small" variant="outlined" color="inherit" sx={{ borderColor: "var(--border)" }} onClick={() => { setRejecting(a); setReason(""); }}>Reject</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="panel" style={{ padding: 0, overflowX: "auto" }}>
          <table className="table align-middle mb-0" style={{ minWidth: 640 }}>
            <thead><tr><th style={{ paddingLeft: 20 }}>Host</th><th>Properties</th><th>Status</th><th style={{ paddingRight: 20 }}>Actions</th></tr></thead>
            <tbody>
              {hosts.map((a) => (
                <tr key={a.id}>
                  <td style={{ paddingLeft: 20 }}>{a.fullName}</td>
                  <td>{properties.filter((p) => p.hostId === a.id).length}</td>
                  <td><StatusBadge status={a.status === "approved" ? "active" : "deactivated"} /></td>
                  <td style={{ paddingRight: 20 }}>
                    {a.status === "approved"
                      ? <Button size="small" color="error" onClick={() => deactivate(a)}>Deactivate</Button>
                      : <Button size="small" onClick={() => reactivate(a)}>Reactivate</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(rejecting)}
        title={`Reject ${rejecting?.fullName}'s application?`}
        confirmLabel="Reject application"
        danger
        confirmDisabled={!reason.trim()}
        onClose={() => setRejecting(null)}
        onConfirm={() => { setApplication(rejecting.id, "rejected", reason.trim()); setRejecting(null); }}
      >
        <TextField fullWidth multiline minRows={3} label="Reason (the applicant will see this)" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ mt: 1 }} />
      </ConfirmDialog>
    </>
  );
}
