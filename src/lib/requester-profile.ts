"use client";
import { useMemo, useSyncExternalStore } from "react";
import type { RequesterProfile } from "./types";
const key = "nolyp-requester-profile";
let memory: string | null = null;
function subscribe(callback: () => void) {
  window.addEventListener("nolyp-requester-profile", callback); window.addEventListener("storage", callback);
  return () => { window.removeEventListener("nolyp-requester-profile", callback); window.removeEventListener("storage", callback); };
}
function snapshot() { try { return localStorage.getItem(key); } catch { return memory; } }
export function validRequesterProfile(value: unknown): value is RequesterProfile {
  if (!value || typeof value !== "object") return false;
  const item = value as RequesterProfile;
  return typeof item.name === "string" && !!item.name.trim() && item.name.length <= 100 && typeof item.email === "string" && item.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email.trim()) && typeof item.account === "string" && !!item.account.trim() && item.account.length <= 150;
}
export function setRequesterProfile(value: RequesterProfile | null) {
  if (value && !validRequesterProfile(value)) throw new Error("Revise nome, e-mail e prefeitura/conta.");
  memory = value ? JSON.stringify({ name: value.name.trim(), email: value.email.trim().toLowerCase(), account: value.account.trim() }) : null;
  try { if (memory) localStorage.setItem(key, memory); else localStorage.removeItem(key); } catch { /* Perfil em memória quando o navegador impede persistência. */ }
  window.dispatchEvent(new Event("nolyp-requester-profile"));
}
export function useRequesterProfile() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  return useMemo(() => { try { const value = JSON.parse(raw ?? "null"); return validRequesterProfile(value) ? value : null; } catch { return null; } }, [raw]);
}
