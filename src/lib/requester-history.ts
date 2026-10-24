import type { Ticket } from "./types";
import { normalize } from "./domain";

export function requesterHistory(ticket: Ticket, tickets: Ticket[]): Ticket[] {
  const email = ticket.email.trim().toLowerCase();
  if (!email || !ticket.account.trim()) return [];
  return tickets.filter(item => item.email.trim().toLowerCase() === email && normalize(item.account) === normalize(ticket.account))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}
export function citizenHistory(tickets: Ticket[], profile: { email: string; account: string } | null): Ticket[] {
  if (!profile?.email.trim() || !profile.account.trim()) return [];
  return tickets.filter(item => item.origin === "requerente" && item.email.trim().toLowerCase() === profile.email.trim().toLowerCase() && normalize(item.account) === normalize(profile.account))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}
