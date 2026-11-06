import { todayISO } from "./dates";

export const canReview = (b) => ["confirmed", "completed"].includes(b.status) && b.checkOut <= todayISO();
