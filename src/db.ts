import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, getDoc, deleteDoc,
  collection, getDocs, getDocsFromServer, onSnapshot
} from 'firebase/firestore';
import { Salon, Service, Professional, Appointment, Plan, AccessLink, ClientRegistration } from './types';
import { INITIAL_PLANS, INITIAL_SALONS, INITIAL_SERVICES, INITIAL_PROFESSIONALS, INITIAL_APPOINTMENTS, INITIAL_LINKS, INITIAL_CLIENTS } from './data';
import firebaseConfig from '../firebase-applet-config.json';

// ─── Firebase Config ────────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);


// ─── In-Memory Cache ─────────────────────────────────────────────────────────
const memCache: Record<string, string> = {};

export function safeSetItem(key: string, value: string): void {
  memCache[key] = value;
  try { localStorage.setItem(key, value); } catch (e) { /* quota */ }
  window.dispatchEvent(new CustomEvent('db_changed', { detail: { key, value } }));
}

export function safeGetItem(key: string): string | null {
  if (memCache[key] !== undefined) return memCache[key];
  try { const v = localStorage.getItem(key); if (v) { memCache[key] = v; return v; } } catch (e) {}
  return null;
}

// ─── Sync throttle for 50+ salons on free plan ──────────────────────────────
const SALON_SYNC_INTERVAL_MS = 10 * 60 * 1000;
let lastSalonSyncTime = 0;
function shouldSkipSalonSync(): boolean {
  return (Date.now() - lastSalonSyncTime) < SALON_SYNC_INTERVAL_MS;
}
function markSalonSyncDone(): void { lastSalonSyncTime = Date.now(); }

// ─── Pending sync tracking ───────────────────────────────────────────────────
const pendingSyncMap: Record<string, boolean> = {};
export function setPendingSync(table: string, v: boolean) { pendingSyncMap[table] = v; }
export function isPendingSync(table: string) { return !!pendingSyncMap[table]; }

// ─── Global sync status ──────────────────────────────────────────────────────
let globalSyncStatus: 'synced' | 'syncing' | 'error' = 'synced';
let globalSyncError: string | null = null;
let firestoreQuotaExceeded = false;
let activeSyncsCount = 0;
let lastWriteTime = 0;

function emitSyncStatus(status: 'synced' | 'syncing' | 'error', error?: string) {
  globalSyncStatus = status;
  globalSyncError = error || null;
  window.dispatchEvent(new CustomEvent('saas_sync_status_changed', { detail: { status, error } }));
}

// ─── Firestore save (one doc per item, no base64 in Firestore) ───────────────
async function saveToFirestoreCollection(collectionName: string, items: any[]): Promise<void> {
  activeSyncsCount++;
  lastWriteTime = Date.now();
  emitSyncStatus('syncing');
  try {
    for (const item of items) {
      if (!item.id) continue;
      const cleanItem = JSON.parse(JSON.stringify(item));
      // Strip base64 logos/banners — store only in localStorage
      if (collectionName === 'salons') {
        if (cleanItem.store_logo?.startsWith('data:')) cleanItem.store_logo = '__local_base64__';
        if (Array.isArray(cleanItem.store_banners)) {
          cleanItem.store_banners = cleanItem.store_banners.map((b: string) =>
            b?.startsWith('data:') ? '__local_base64__' : b
          );
        }
      }
      await setDoc(doc(firestore, collectionName, item.id), cleanItem);
    }
    setPendingSync(collectionName, false);
    emitSyncStatus('synced');
  } catch (err: any) {
    if (err?.code === 'resource-exhausted') firestoreQuotaExceeded = true;
    emitSyncStatus('error', err?.message);
    throw err;
  } finally {
    activeSyncsCount--;
  }
}

// ─── Merge helpers ───────────────────────────────────────────────────────────
function mergeSalonsWithLocal(serverSalons: Salon[]): Salon[] {
  const localSalons: Salon[] = JSON.parse(safeGetItem('ca_salons') || '[]');
  const serverIds = new Set(serverSalons.map(s => s.id));

  // FIX: Só inclui salões locais se pendingSync estiver ativo (recém criados)
  // Evita que salões antigos do localStorage apareçam como duplicatas
  const localOnly = isPendingSync('salons')
    ? localSalons.filter(s => !serverIds.has(s.id))
    : [];

  const merged = serverSalons.map(ss => {
    const ls = localSalons.find(l => l.id === ss.id);
    if (!ls) return ss;
    let store_logo = ss.store_logo;
    if (ls.store_logo?.startsWith('data:')) store_logo = ls.store_logo;
    else if (store_logo === '__local_base64__') store_logo = ls.store_logo || '';
    const localBanners = ls.store_banners || [];
    const remoteBanners = ss.store_banners || [];
    const hasRealLocal = localBanners.some((b: string) => b && b !== '__local_base64__');
    const store_banners = hasRealLocal
      ? localBanners.filter((b: string) => b && b !== '__local_base64__')
      : remoteBanners.map((u: string, i: number) =>
          u === '__local_base64__' ? (localBanners[i] || '') : u
        ).filter(Boolean);
    return { ...ss, store_logo, store_banners };
  });

  // Dedup final por id — garante que nunca haja duplicatas
  const all = [...localOnly, ...merged];
  const seen = new Set<string>();
  return all.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
}

function isClientSession(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('salonId') || params.has('token');
}

// ─── Sync from server ────────────────────────────────────────────────────────
export async function syncFromServer(): Promise<boolean> {
  let changed = false;
  try {
    const collections = ['plans', 'salons', 'services', 'professionals', 'appointments', 'links', 'clients'];
    for (const col of collections) {
      if (col === 'salons' && shouldSkipSalonSync()) continue;
      const snap = await getDocs(collection(firestore, col));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const key = `ca_${col}`;
      const merged = col === 'salons' ? mergeSalonsWithLocal(docs as Salon[]) : docs;
      if (col === 'salons') markSalonSyncDone();
      const newVal = JSON.stringify(merged);
      if ((safeGetItem(key) || '') !== newVal) { safeSetItem(key, newVal); changed = true; }
    }
  } catch (e: any) {
    if (e?.code === 'resource-exhausted') firestoreQuotaExceeded = true;
  }
  return changed;
}

export async function forceSyncFromServer(force?: boolean): Promise<boolean> {
  return syncFromServer();
}

export async function prewarmCache(): Promise<void> {
  const keys = ['ca_plans','ca_salons','ca_services','ca_professionals','ca_appointments','ca_links','ca_clients'];
  for (const key of keys) {
    const v = safeGetItem(key);
    if (!v) {
      // Seed with initial data
      if (key === 'ca_plans') safeSetItem(key, JSON.stringify(INITIAL_PLANS));
      if (key === 'ca_salons') safeSetItem(key, JSON.stringify([])); // vazio — Firebase preenche
      if (key === 'ca_services') safeSetItem(key, JSON.stringify(INITIAL_SERVICES));
      if (key === 'ca_professionals') safeSetItem(key, JSON.stringify(INITIAL_PROFESSIONALS));
      if (key === 'ca_appointments') safeSetItem(key, JSON.stringify(INITIAL_APPOINTMENTS));
      if (key === 'ca_links') safeSetItem(key, JSON.stringify(INITIAL_LINKS));
      if (key === 'ca_clients') safeSetItem(key, JSON.stringify(INITIAL_CLIENTS));
    }
  }
}

// ─── Realtime sync ───────────────────────────────────────────────────────────
let realtimeUnsubs: (() => void)[] = [];
export function initRealtimeSync(): void {
  realtimeUnsubs.forEach(u => u());
  realtimeUnsubs = [];
  const cols = ['plans','salons','services','professionals','appointments','links','clients'];
  for (const col of cols) {
    const unsub = onSnapshot(collection(firestore, col), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const key = `ca_${col}`;
      const merged = col === 'salons' ? mergeSalonsWithLocal(docs as Salon[]) : docs;
      const newVal = JSON.stringify(merged);
      const oldVal = safeGetItem(key) || '';
      if (oldVal !== newVal) {
        safeSetItem(key, newVal);
      } else if (isClientSession() && (col === 'services' || col === 'appointments' || col === 'salons')) {
        window.dispatchEvent(new CustomEvent('db_changed', { detail: { key, value: newVal } }));
      }
    }, () => {});
    realtimeUnsubs.push(unsub);
  }
}

// ─── Delete removed items helper ──────────────────────────────────────────────
function deleteRemovedItems(collectionName: string, oldItems: any[], newItems: any[]): void {
  const newIds = new Set(newItems.map(item => item.id));
  const deleted = oldItems.filter(item => item.id && !newIds.has(item.id));
  deleted.forEach(item => {
    deleteDoc(doc(firestore, collectionName, item.id)).catch(() => {});
  });
}

// ─── DB object ───────────────────────────────────────────────────────────────
export const db = {
  // Salons
  getSalons(): Salon[] { return JSON.parse(safeGetItem('ca_salons') || '[]'); },
  saveSalons(salons: Salon[]): void {
    // FIX: Dedup por id antes de salvar — previne salões fantasmas
    const seen = new Set<string>();
    const deduped = salons.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
    deleteRemovedItems('salons', this.getSalons(), deduped);
    safeSetItem('ca_salons', JSON.stringify(deduped));
    setPendingSync('salons', true);
    saveToFirestoreCollection('salons', deduped)
      .then(() => setPendingSync('salons', false))
      .catch(() => {});
  },

  // Services
  getServices(): Service[] { return JSON.parse(safeGetItem('ca_services') || '[]'); },
  saveServices(services: Service[]): void {
    deleteRemovedItems('services', this.getServices(), services);
    safeSetItem('ca_services', JSON.stringify(services));
    setPendingSync('services', true);
    saveToFirestoreCollection('services', services).catch(() => {});
  },

  // Professionals
  getProfessionals(): Professional[] { return JSON.parse(safeGetItem('ca_professionals') || '[]'); },
  saveProfessionals(professionals: Professional[]): void {
    deleteRemovedItems('professionals', this.getProfessionals(), professionals);
    safeSetItem('ca_professionals', JSON.stringify(professionals));
    saveToFirestoreCollection('professionals', professionals).catch(() => {});
  },

  // Appointments
  getAppointments(): Appointment[] { return JSON.parse(safeGetItem('ca_appointments') || '[]'); },
  saveAppointments(appointments: Appointment[]): void {
    deleteRemovedItems('appointments', this.getAppointments(), appointments);
    safeSetItem('ca_appointments', JSON.stringify(appointments));
    saveToFirestoreCollection('appointments', appointments).catch(() => {});
  },

  // Plans
  getPlans(): Plan[] {
    const stored = safeGetItem('ca_plans');
    return stored ? JSON.parse(stored) : INITIAL_PLANS;
  },
  savePlans(plans: Plan[]): void {
    deleteRemovedItems('plans', this.getPlans(), plans);
    safeSetItem('ca_plans', JSON.stringify(plans));
    saveToFirestoreCollection('plans', plans).catch(() => {});
  },

  // Links
  getLinks(): AccessLink[] { return JSON.parse(safeGetItem('ca_links') || '[]'); },
  saveLinks(links: AccessLink[]): void {
    deleteRemovedItems('links', this.getLinks(), links);
    safeSetItem('ca_links', JSON.stringify(links));
    saveToFirestoreCollection('links', links).catch(() => {});
  },

  // Clients
  getClients(): ClientRegistration[] { return JSON.parse(safeGetItem('ca_clients') || '[]'); },
  saveClients(clients: ClientRegistration[]): void {
    deleteRemovedItems('clients', this.getClients(), clients);
    safeSetItem('ca_clients', JSON.stringify(clients));
    saveToFirestoreCollection('clients', clients).catch(() => {});
  },

  // Status helpers
  getGlobalSyncStatus() { return globalSyncStatus; },
  getGlobalSyncError() { return globalSyncError; },
  isFirestoreQuotaExceeded() { return firestoreQuotaExceeded; },
  clearFirestoreQuotaExceeded() { firestoreQuotaExceeded = false; },
};
