import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, runTransaction, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import { overlaps, todayISO } from "../utils/dates";

// Live data from Cloud Firestore (see StayN-Data-Model). Each user only reads what they may see:
// everyone gets approved properties, reviews, settings and the busy dates; a guest also gets their own bookings;
// a host gets their own properties and bookings; an admin gets everything. Security rules enforce the same limits.
// The functions below are what the pages call. They write to Firestore, and the listeners update the screens.
const DataContext = createContext(null);

const defaultSettings = {
  propertyTypes: ["House", "Condo", "Apartment", "Beach house", "Cabin", "Resort stay"],
  amenities: ["Wi-Fi", "Air conditioning", "Kitchen", "Parking", "Pool", "Beach access", "Hot shower", "TV"],
  serviceFeePercent: 10,
  listingFee: 500,
};

const ref = () => `GC-${Math.floor(10000000 + Math.random() * 89999999)}`;
const merge = (...lists) => [...new Map(lists.flat().map((x) => [x.id, x])).values()];

// Listens to one query. `makeQuery` returns a Firestore query, or a falsy value when this user may not read it.
// `setLoaded` records when the first answer arrived, so pages can wait for data before they redirect.
function useLive(name, makeQuery, deps, setLoaded) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const q = makeQuery();
    const done = () => setLoaded((l) => (l[name] ? l : { ...l, [name]: true }));
    if (!q) { setRows([]); done(); return undefined; }
    setLoaded((l) => (l[name] === false ? l : { ...l, [name]: false }));
    return onSnapshot(
      q,
      (s) => { setRows(s.docs.map((d) => ({ ...d.data(), id: d.id }))); done(); },
      (e) => { console.error("Firestore read failed:", e.message); done(); },
    );
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return rows;
}
const LIVE_COUNT = 18;

export function DataProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.id || "";
  const role = user?.role || "";
  const isAdmin = role === "admin";
  const isHost = role === "host";
  const [settings, setSettings] = useState(defaultSettings);
  const [error, setError] = useState("");

  const fail = (e) => {
    console.error(e);
    setError(e.code === "permission-denied" ? "You are not allowed to do that." : e.message || "Something went wrong.");
  };
  const guard = (p) => Promise.resolve(p).catch(fail);

  useEffect(() => onSnapshot(doc(db, "settings", "platform"), (s) => s.exists() && setSettings({ ...defaultSettings, ...s.data() }), () => {}), []);

  const c = (name) => collection(db, name);
  const [loaded, setLoaded] = useState({});
  const live = (name, make, deps) => useLive(name, make, deps, setLoaded); // eslint-disable-line react-hooks/rules-of-hooks
  // Everyone
  const approved = live("approved", () => query(c("properties"), where("status", "==", "approved")), []);
  const reviews = live("reviews", () => c("reviews"), []);
  const availability = live("availability", () => c("availability"), []);
  // Any signed-in user
  const myNotes = live("myNotes", () => uid && query(c("notifications"), where("userId", "==", uid)), [uid]);
  const guestBookings = live("guestBookings", () => uid && query(c("bookings"), where("guestId", "==", uid)), [uid]);
  const guestPayments = live("guestPayments", () => uid && query(c("payments"), where("guestId", "==", uid)), [uid]);
  // Hosts
  const hostProps = live("hostProps", () => isHost && query(c("properties"), where("hostId", "==", uid)), [isHost, uid]);
  const hostBookings = live("hostBookings", () => isHost && query(c("bookings"), where("hostId", "==", uid)), [isHost, uid]);
  const hostPayments = live("hostPayments", () => isHost && query(c("payments"), where("hostId", "==", uid)), [isHost, uid]);
  const hostFees = live("hostFees", () => isHost && query(c("listingFees"), where("hostId", "==", uid)), [isHost, uid]);
  const hostDocs = live("hostDocs", () => isHost && query(c("propertyDocs"), where("hostId", "==", uid)), [isHost, uid]);
  // Admin
  const adminUsers = live("adminUsers", () => isAdmin && c("users"), [isAdmin]);
  const adminApps = live("adminApps", () => isAdmin && c("hostApplications"), [isAdmin]);
  const adminProps = live("adminProps", () => isAdmin && c("properties"), [isAdmin]);
  const adminBookings = live("adminBookings", () => isAdmin && c("bookings"), [isAdmin]);
  const adminPayments = live("adminPayments", () => isAdmin && c("payments"), [isAdmin]);
  const adminFees = live("adminFees", () => isAdmin && c("listingFees"), [isAdmin]);
  const adminDocs = live("adminDocs", () => isAdmin && c("propertyDocs"), [isAdmin]);
  const adminNotes = live("adminNotes", () => isAdmin && query(c("notifications"), where("userId", "==", "admin")), [isAdmin]);
  // True once every list has had its first answer (pages wait for this before they redirect).
  const ready = Object.keys(loaded).length >= LIVE_COUNT && Object.values(loaded).every(Boolean);

  const docsById = useMemo(
    () => Object.fromEntries(merge(hostDocs, adminDocs).map((d) => [d.id, d.titleDocument])),
    [hostDocs, adminDocs],
  );
  const properties = useMemo(
    () => merge(approved, hostProps, adminProps).map((p) => ({ blockedRanges: [], images: [], maxPets: 0, ...p, titleDocument: docsById[p.id] || null })),
    [approved, hostProps, adminProps, docsById],
  );
  const bookings = useMemo(() => merge(guestBookings, hostBookings, adminBookings), [guestBookings, hostBookings, adminBookings]);
  const payments = useMemo(() => merge(guestPayments, hostPayments, adminPayments), [guestPayments, hostPayments, adminPayments]);
  const listingFees = useMemo(() => merge(hostFees, adminFees), [hostFees, adminFees]);
  // Admin notifications are stored for the whole admin team (userId "admin"); each admin sees them as their own.
  const notifications = useMemo(
    () => merge(myNotes, adminNotes.map((n) => ({ ...n, userId: uid })))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0) || (b.createdAt || "").localeCompare(a.createdAt || "")),
    [myNotes, adminNotes, uid],
  );
  // One row per active stay, so anyone can check availability without reading other people's bookings.
  const busy = useMemo(
    () => availability.flatMap((a) => (a.ranges || []).map((r) => ({ propertyId: a.id, checkIn: r.start, checkOut: r.end, status: r.status }))),
    [availability],
  );

  const value = useMemo(() => {
    const notify = (userId, title, message, link = "") =>
      addDoc(c("notifications"), { userId, title, message, link, read: false, createdAt: todayISO(), ts: Date.now() }).catch((e) => console.error(e));
    const notifyAdmins = (title, message, link) => notify("admin", title, message, link);

    const ratingOf = (propertyId) => {
      const list = reviews.filter((r) => r.propertyId === propertyId && r.visible);
      if (!list.length) return { avg: 0, count: 0 };
      return { avg: list.reduce((s, r) => s + r.rating, 0) / list.length, count: list.length };
    };

    return {
      ready, users: adminUsers, applications: adminApps, properties, bookings, busy, payments, listingFees, reviews, notifications, settings, ratingOf, notify,
      coverOf: (propertyId) => properties.find((x) => x.id === propertyId)?.images?.[0] || "",

      updateUser: (id, changes) => guard(updateDoc(doc(db, "users", id), changes)),

      submitApplication: (userId, form) => guard(
        setDoc(doc(db, "hostApplications", userId), { userId, status: "pending", ...form, createdAt: todayISO() })
          .then(() => notifyAdmins("Host application", `${form.fullName} applied to become a host.`, "/admin/hosts")),
      ),
      setApplication: (id, status) => guard(
        Promise.all([
          updateDoc(doc(db, "hostApplications", id), { status, reviewedAt: todayISO() }),
          status === "approved" && updateDoc(doc(db, "users", id), { role: "host" }),
        ]).then(() => {
          if (status === "approved" || status === "rejected")
            notify(id, status === "approved" ? "You are a host" : "Application not approved",
              status === "approved" ? "Your host application was approved. You can now add properties." : "Your host application was not approved.", "/become-host");
        }),
      ),
      updateApplication: (id, changes) => guard(setDoc(doc(db, "hostApplications", id), changes, { merge: true })),

      // Editing patches the property. A new property also takes a listing fee payment ({ gcashNumber, accountName }).
      saveProperty: (p, listingPayment) => {
        const { titleDocument, ...fields } = p;
        if (p.id) {
          const { id, ...rest } = fields;
          const hostId = properties.find((x) => x.id === id)?.hostId;
          guard(Promise.all([
            updateDoc(doc(db, "properties", id), rest),
            titleDocument !== undefined && setDoc(doc(db, "propertyDocs", id), { hostId, titleDocument }, { merge: true }),
          ]));
          return id;
        }
        const id = doc(c("properties")).id;
        const batch = writeBatch(db);
        batch.set(doc(db, "properties", id), { status: "pending", blockedRanges: [], imageCount: 0, images: [], maxPets: 0, rejectReason: "", tone: Math.floor(Math.random() * 8), createdAt: todayISO(), ...fields });
        batch.set(doc(db, "propertyDocs", id), { hostId: p.hostId, titleDocument: titleDocument || null });
        if (listingPayment) {
          batch.set(doc(db, "listingFees", id), {
            propertyId: id, propertyTitle: p.title, hostId: p.hostId, hostName: p.hostName, amount: settings.listingFee,
            method: "GCash", gcashNumber: listingPayment.gcashNumber, accountName: listingPayment.accountName,
            referenceNumber: ref(), paidAt: todayISO(), status: "paid",
          });
        }
        guard(batch.commit().then(() => {
          if (listingPayment) notify(p.hostId, "Listing fee paid", `Your listing fee for ${p.title} was received. The StayN team will review it.`, "/host/properties");
          notifyAdmins("Property waiting", `${p.title} needs approval.`, "/admin/properties");
        }));
        return id;
      },
      setPropertyStatus: (id, status, rejectReason = "") => {
        const prop = properties.find((x) => x.id === id);
        return guard(Promise.all([
          updateDoc(doc(db, "properties", id), { status, rejectReason }),
          // A rejected property gets its listing fee back (label only, no money moves).
          status === "rejected" && updateDoc(doc(db, "listingFees", id), { status: "refunded" }).catch(() => {}),
        ]).then(() => {
          if (prop && (status === "approved" || status === "rejected"))
            notify(prop.hostId, status === "approved" ? "Property approved" : "Property rejected",
              status === "approved" ? `${prop.title} is now live.` : `${prop.title} was rejected: ${rejectReason}`, "/host/properties");
        }));
      },
      deleteProperty: (id) => {
        const batch = writeBatch(db);
        ["properties", "propertyDocs", "availability"].forEach((name) => batch.delete(doc(db, name, id)));
        return guard(batch.commit());
      },

      // The availability document holds every active stay of a property, so the overlap check and the new booking
      // are saved in one transaction. Two guests cannot take the same dates.
      createBooking: async ({ property, checkIn, checkOut, adults, kids, pets, user: guest, price }) => {
        const id = doc(c("bookings")).id;
        const availRef = doc(db, "availability", property.id);
        await runTransaction(db, async (tx) => {
          const avail = await tx.get(availRef);
          const prop = await tx.get(doc(db, "properties", property.id));
          const ranges = avail.exists() ? avail.data().ranges || [] : [];
          const blocked = prop.exists() ? prop.data().blockedRanges || [] : [];
          if (ranges.some((r) => overlaps(checkIn, checkOut, r.start, r.end)) || blocked.some((r) => overlaps(checkIn, checkOut, r.start, r.end)))
            throw new Error("Those dates are not available. Try different dates.");
          tx.set(doc(db, "bookings", id), {
            propertyId: property.id, propertyTitle: property.title, tone: property.tone ?? 0, destination: property.destination,
            guestId: guest.id, guestName: guest.name, guestEmail: guest.email, guestPhone: guest.phone, hostId: property.hostId,
            checkIn, checkOut, adults, kids, pets, guests: adults + kids, ...price, status: "pending", cancelledBy: "", reviewed: false, createdAt: todayISO(),
          });
          tx.set(availRef, { ranges: [...ranges, { bookingId: id, start: checkIn, end: checkOut, status: "pending" }] });
        });
        notify(property.hostId, "New booking request", `${guest.name} asked to book ${property.title}.`, "/host/bookings");
        notify(guest.id, "Request sent", `Your request for ${property.title} was sent to the host.`, `/reservations/${id}`);
        return id;
      },
      setBookingStatus: (id, status, extra = {}) => {
        const b = bookings.find((x) => x.id === id);
        if (!b) return Promise.resolve();
        const availRef = doc(db, "availability", b.propertyId);
        return guard(runTransaction(db, async (tx) => {
          const avail = await tx.get(availRef);
          let ranges = avail.exists() ? avail.data().ranges || [] : [];
          // A rejected or cancelled stay frees its dates; any other change keeps them with the new status.
          ranges = ["rejected", "cancelled"].includes(status) ? ranges.filter((r) => r.bookingId !== id) : ranges.map((r) => (r.bookingId === id ? { ...r, status } : r));
          tx.update(doc(db, "bookings", id), { status, ...extra, updatedAt: todayISO() });
          if (avail.exists()) tx.set(availRef, { ranges });
        }).then(() => {
          if (status === "awaiting_payment") notify(b.guestId, "Request accepted", `Your request for ${b.propertyTitle} was accepted. Please pay to confirm.`, `/reservations/${id}`);
          if (status === "rejected") notify(b.guestId, "Request declined", `The host could not accept your request for ${b.propertyTitle}.`, `/reservations/${id}`);
          if (status === "cancelled") {
            notify(b.guestId, "Booking cancelled", `Your booking for ${b.propertyTitle} was cancelled.`, `/reservations/${id}`);
            if (extra.cancelledBy !== "host") notify(b.hostId, "Booking cancelled", `A booking for ${b.propertyTitle} was cancelled.`, "/host/bookings");
          }
        }));
      },
      payBooking: (id, { gcashNumber, accountName }) => {
        const b = bookings.find((x) => x.id === id);
        const availRef = doc(db, "availability", b.propertyId);
        return guard(runTransaction(db, async (tx) => {
          const [booking, avail] = [await tx.get(doc(db, "bookings", id)), await tx.get(availRef)];
          if (!booking.exists() || booking.data().status !== "awaiting_payment") throw new Error("This booking is not waiting for payment.");
          const ranges = avail.exists() ? (avail.data().ranges || []).map((r) => (r.bookingId === id ? { ...r, status: "confirmed" } : r)) : [];
          tx.set(doc(db, "payments", id), { bookingId: id, guestId: b.guestId, hostId: b.hostId, amount: b.total, method: "GCash", gcashNumber, accountName, referenceNumber: ref(), paidAt: todayISO(), status: "paid" });
          tx.update(doc(db, "bookings", id), { status: "confirmed", updatedAt: todayISO() });
          if (avail.exists()) tx.set(availRef, { ranges });
        }).then(() => {
          notify(b.hostId, "Payment received", `${b.guestName} paid for ${b.propertyTitle}.`, "/host/bookings");
          notify(b.guestId, "Booking confirmed", `Your payment for ${b.propertyTitle} was received.`, `/reservations/${id}`);
        }));
      },
      refundPayment: (id) => guard(updateDoc(doc(db, "payments", id), { status: "refunded" })),

      addReview: (r) => {
        const batch = writeBatch(db);
        batch.set(doc(db, "reviews", r.bookingId), { visible: true, createdAt: todayISO(), ...r });
        batch.update(doc(db, "bookings", r.bookingId), { reviewed: true });
        return guard(batch.commit().then(() => notify(r.hostId, "New review", `${r.guestName} left a ${r.rating}-star review.`, "/host/reviews")));
      },
      updateReview: (id, changes) => guard(updateDoc(doc(db, "reviews", id), changes)),
      // A guest deleting their own review can write a new one afterwards.
      deleteMyReview: (reviewId, bookingId) => {
        const batch = writeBatch(db);
        batch.delete(doc(db, "reviews", reviewId));
        batch.update(doc(db, "bookings", bookingId), { reviewed: false });
        return guard(batch.commit());
      },
      deleteReview: (id) => guard(deleteDoc(doc(db, "reviews", id))),

      markRead: (id) => guard(updateDoc(doc(db, "notifications", id), { read: true })),
      markAllRead: (userId) => {
        const batch = writeBatch(db);
        notifications.filter((n) => n.userId === userId && !n.read).forEach((n) => batch.update(doc(db, "notifications", n.id), { read: true }));
        return guard(batch.commit());
      },

      updateSettings: (changes) => guard(setDoc(doc(db, "settings", "platform"), changes, { merge: true })),
    };
  }, [ready, adminUsers, adminApps, properties, bookings, busy, payments, listingFees, reviews, notifications, settings]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DataContext.Provider value={value}>
      {children}
      <Snackbar open={Boolean(error)} autoHideDuration={6000} onClose={() => setError("")} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="error" onClose={() => setError("")} sx={{ width: "100%" }}>{error}</Alert>
      </Snackbar>
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
