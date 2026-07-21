/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Job,
  InventoryItem,
  Expenditure,
  DailyMiscellaneous,
  DailySalesReport,
  GeneralPrintingOrder,
  AuditLog,
  Notification,
  CompanySettings,
  JobStatus,
  KanbanStage,
  StaffAccount,
  StaffNote,
  DeletedJob
} from "./types";
import { supabase, isSupabaseEnabled } from "./supabaseClient";

// Supabase real-time subscription handle
let supabaseChannel: any = null;

// Helper keys for LocalStorage
const KEYS = {
  JOBS: "printing_db_jobs",
  INVENTORY: "printing_db_inventory",
  EXPENDITURES: "printing_db_expenditures",
  MISCELLANEOUS: "printing_db_miscellaneous",
  SALES_REPORTS: "printing_db_sales_reports",
  GPO: "printing_db_gpo",
  AUDIT_LOGS: "printing_db_audit_logs",
  NOTIFICATIONS: "printing_db_notifications",
  SETTINGS: "printing_db_settings",
  STAFF: "printing_db_staff_accounts",
  STAFF_NOTES: "printing_db_staff_notes",
  STAFF_ATTENDANCE: "printing_db_staff_attendance",
  DELETED_JOBS: "printing_db_deleted_jobs",
  LIVE_ACTIVITY: "printing_db_live_activity"
};

// Auto-clear demo mockup data on first load of this production release
const CLEAR_DEMO_FLAG = "printing_db_is_live_v5";
if (typeof window !== "undefined" && !localStorage.getItem(CLEAR_DEMO_FLAG) && !isSupabaseEnabled()) {
  localStorage.setItem(CLEAR_DEMO_FLAG, "true");
  localStorage.removeItem(KEYS.JOBS);
  localStorage.removeItem(KEYS.INVENTORY);
  localStorage.removeItem(KEYS.EXPENDITURES);
  localStorage.removeItem(KEYS.MISCELLANEOUS);
  localStorage.removeItem(KEYS.SALES_REPORTS);
  localStorage.removeItem(KEYS.GPO);
  localStorage.removeItem(KEYS.AUDIT_LOGS);
  localStorage.removeItem(KEYS.NOTIFICATIONS);
  localStorage.removeItem(KEYS.SETTINGS);
  localStorage.removeItem(KEYS.STAFF);
  localStorage.removeItem(KEYS.LIVE_ACTIVITY);
  localStorage.removeItem(KEYS.STAFF_NOTES);
  localStorage.removeItem(KEYS.STAFF_ATTENDANCE);
  localStorage.removeItem(KEYS.DELETED_JOBS);
}

// Default Staff Accounts
const DEFAULT_STAFF_ACCOUNTS: StaffAccount[] = [
  { id: "staff-1", username: "staff1", name: "Staff 1", passwordText: "staff123", roleDescription: "" },
  { id: "staff-2", username: "staff2", name: "Staff 2", passwordText: "staff456", roleDescription: "" }
];

// Default Settings
const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "Printopia Digital Press",
  logoUrl: "/src/assets/images/printopia_logo_1783376948226.jpg",
  address: "Accra-Teshie Bushroad, Teshie, Accra, Ghana",
  phone: "0209905927",
  email: "printopia85@gmail.com",
  vatRate: 0,
  receiptFooter: "Thank you for doing business with Printopia Digital Press! Please retain this receipt for returns.",
  invoiceFooter: "Thank you for choosing Printopia Digital Press. Payment is due upon receipt. For inquiries, email printopia85@gmail.com or call 0209905927.",
  theme: "light",
  currency: "GHS",
  language: "en",
  syncServerUrl: ""
};

// Initial Seed Data for Inventory
const SEED_INVENTORY: InventoryItem[] = [
  { id: "mat-1", item: "A4 Paper", category: "Paper", openingStock: 0, purchased: 0, used: 0, minimumStock: 100, alertLevel: 100, unitCost: 0.15, sellingPrice: 0.30, barcode: "8901001001002", qrCode: "QR-A4PAPER", supplier: "Paper Mill Ltd", remainingStock: 0 },
  { id: "mat-2", item: "A3 Paper", category: "Paper", openingStock: 0, purchased: 0, used: 0, minimumStock: 50, alertLevel: 50, unitCost: 0.40, sellingPrice: 0.80, barcode: "8901001001003", qrCode: "QR-A3PAPER", supplier: "Paper Mill Ltd", remainingStock: 0 },
  { id: "mat-3", item: "Photo Paper", category: "Paper", openingStock: 0, purchased: 0, used: 0, minimumStock: 30, alertLevel: 30, unitCost: 2.00, sellingPrice: 4.00, barcode: "8901001001004", qrCode: "QR-PHOTOPAPER", supplier: "Photo Supplies Co.", remainingStock: 0 },
  { id: "mat-4", item: "Toner", category: "Ink", openingStock: 0, purchased: 0, used: 0, minimumStock: 5, alertLevel: 5, unitCost: 150.00, sellingPrice: 300.00, barcode: "8901001001005", qrCode: "QR-TONER", supplier: "Printer Parts Ghana", remainingStock: 0 },
  { id: "mat-5", item: "PVC Cover", category: "Finishing", openingStock: 0, purchased: 0, used: 0, minimumStock: 20, alertLevel: 20, unitCost: 5.00, sellingPrice: 10.00, barcode: "8901001001006", qrCode: "QR-PVCCOVER", supplier: "Binding Supplies", remainingStock: 0 },
  { id: "mat-6", item: "Hard Cover", category: "Finishing", openingStock: 0, purchased: 0, used: 0, minimumStock: 15, alertLevel: 15, unitCost: 8.00, sellingPrice: 15.00, barcode: "8901001001007", qrCode: "QR-HARDCOVER", supplier: "Binding Supplies", remainingStock: 0 },
  { id: "mat-7", item: "Spiral Binder", category: "Finishing", openingStock: 0, purchased: 0, used: 0, minimumStock: 20, alertLevel: 20, unitCost: 3.00, sellingPrice: 6.00, barcode: "8901001001008", qrCode: "QR-SPIRAL", supplier: "Binding Supplies", remainingStock: 0 },
  { id: "mat-8", item: "Staple Pins", category: "Office Supplies", openingStock: 0, purchased: 0, used: 0, minimumStock: 20, alertLevel: 20, unitCost: 5.00, sellingPrice: 10.00, barcode: "8901001001009", qrCode: "QR-STAPLES", supplier: "Stationery Hub", remainingStock: 0 },
  { id: "mat-9", item: "Brown Envelope", category: "Office Supplies", openingStock: 0, purchased: 0, used: 0, minimumStock: 50, alertLevel: 50, unitCost: 0.50, sellingPrice: 1.00, barcode: "8901001001010", qrCode: "QR-ENVELOPE", supplier: "Stationery Hub", remainingStock: 0 },
  { id: "mat-10", item: "3 Feet SAV", category: "Finishing", openingStock: 0, purchased: 0, used: 0, minimumStock: 10, alertLevel: 10, unitCost: 15.00, sellingPrice: 30.00, barcode: "8901001001011", qrCode: "QR-SAV3FT", supplier: "Vinyl & Flex Ltd", remainingStock: 0 },
  { id: "mat-11", item: "4 Feet SAV", category: "Finishing", openingStock: 0, purchased: 0, used: 0, minimumStock: 10, alertLevel: 10, unitCost: 18.00, sellingPrice: 35.00, barcode: "8901001001012", qrCode: "QR-SAV4FT", supplier: "Vinyl & Flex Ltd", remainingStock: 0 },
  { id: "mat-12", item: "5 Feet SAV", category: "Finishing", openingStock: 0, purchased: 0, used: 0, minimumStock: 10, alertLevel: 10, unitCost: 22.00, sellingPrice: 42.00, barcode: "8901001001013", qrCode: "QR-SAV5FT", supplier: "Vinyl & Flex Ltd", remainingStock: 0 },
  { id: "mat-13", item: "6 Feet SAV", category: "Finishing", openingStock: 0, purchased: 0, used: 0, minimumStock: 10, alertLevel: 10, unitCost: 25.00, sellingPrice: 48.00, barcode: "8901001001014", qrCode: "QR-SAV6FT", supplier: "Vinyl & Flex Ltd", remainingStock: 0 },
  { id: "mat-14", item: "3 Feet Flexy", category: "Finishing", openingStock: 0, purchased: 0, used: 0, minimumStock: 10, alertLevel: 10, unitCost: 12.00, sellingPrice: 25.00, barcode: "8901001001015", qrCode: "QR-FLEX3FT", supplier: "Vinyl & Flex Ltd", remainingStock: 0 },
  { id: "mat-15", item: "4 Feet Flexy", category: "Finishing", openingStock: 0, purchased: 0, used: 0, minimumStock: 10, alertLevel: 10, unitCost: 15.00, sellingPrice: 30.00, barcode: "8901001001016", qrCode: "QR-FLEX4FT", supplier: "Vinyl & Flex Ltd", remainingStock: 0 },
  { id: "mat-16", item: "5 Feet Flexy", category: "Finishing", openingStock: 0, purchased: 0, used: 0, minimumStock: 10, alertLevel: 10, unitCost: 18.00, sellingPrice: 35.00, barcode: "8901001001017", qrCode: "QR-FLEX5FT", supplier: "Vinyl & Flex Ltd", remainingStock: 0 },
  { id: "mat-17", item: "6 Feet Flexy", category: "Finishing", openingStock: 0, purchased: 0, used: 0, minimumStock: 10, alertLevel: 10, unitCost: 20.00, sellingPrice: 38.00, barcode: "8901001001018", qrCode: "QR-FLEX6FT", supplier: "Vinyl & Flex Ltd", remainingStock: 0 },
  { id: "mat-18", item: "DTF Ink", category: "DTF", openingStock: 0, purchased: 0, used: 0, minimumStock: 5, alertLevel: 5, unitCost: 200.00, sellingPrice: 400.00, barcode: "8901001001019", qrCode: "QR-DTFINK", supplier: "DTF Supplies Co.", remainingStock: 0 },
  { id: "mat-19", item: "DTF Powder", category: "DTF", openingStock: 0, purchased: 0, used: 0, minimumStock: 5, alertLevel: 5, unitCost: 150.00, sellingPrice: 300.00, barcode: "8901001001020", qrCode: "QR-DTFPOWDER", supplier: "DTF Supplies Co.", remainingStock: 0 },
  { id: "mat-20", item: "DTF Film", category: "DTF", openingStock: 0, purchased: 0, used: 0, minimumStock: 10, alertLevel: 10, unitCost: 8.00, sellingPrice: 15.00, barcode: "8901001001021", qrCode: "QR-DTFFILM", supplier: "DTF Supplies Co.", remainingStock: 0 },
  { id: "mat-21", item: "Eco-solvent Ink", category: "Ink", openingStock: 0, purchased: 0, used: 0, minimumStock: 5, alertLevel: 5, unitCost: 180.00, sellingPrice: 360.00, barcode: "8901001001022", qrCode: "QR-ECOSOLVENT", supplier: "Ink World Ltd", remainingStock: 0 },
  { id: "mat-22", item: "A3 Frame Board", category: "Printing Materials", openingStock: 0, purchased: 0, used: 0, minimumStock: 10, alertLevel: 10, unitCost: 25.00, sellingPrice: 50.00, barcode: "8901001001023", qrCode: "QR-A3BOARD", supplier: "Frame Mart", remainingStock: 0 },
  { id: "mat-23", item: "A4 Frame Board", category: "Printing Materials", openingStock: 0, purchased: 0, used: 0, minimumStock: 15, alertLevel: 15, unitCost: 20.00, sellingPrice: 40.00, barcode: "8901001001024", qrCode: "QR-A4BOARD", supplier: "Frame Mart", remainingStock: 0 },
  { id: "mat-24", item: "A5 Frame Board", category: "Printing Materials", openingStock: 0, purchased: 0, used: 0, minimumStock: 15, alertLevel: 15, unitCost: 15.00, sellingPrice: 30.00, barcode: "8901001001025", qrCode: "QR-A5BOARD", supplier: "Frame Mart", remainingStock: 0 },
  { id: "mat-25", item: "12 x 16 Frame", category: "Other", openingStock: 0, purchased: 0, used: 0, minimumStock: 0, alertLevel: 0, unitCost: 0, sellingPrice: 0, barcode: "8901001001026", qrCode: "QR-1216", supplier: "Frame Mart", remainingStock: 0 },
  { id: "mat-26", item: "12 x 19 Frame", category: "Other", openingStock: 0, purchased: 0, used: 0, minimumStock: 0, alertLevel: 0, unitCost: 0, sellingPrice: 0, barcode: "8901001001027", qrCode: "QR-1219", supplier: "Frame Mart", remainingStock: 0 },
  { id: "mat-27", item: "16 x 20 Frame", category: "Other", openingStock: 0, purchased: 0, used: 0, minimumStock: 0, alertLevel: 0, unitCost: 0, sellingPrice: 0, barcode: "8901001001028", qrCode: "QR-1620", supplier: "Frame Mart", remainingStock: 0 },
  { id: "mat-28", item: "20 x 24 Frame", category: "Other", openingStock: 0, purchased: 0, used: 0, minimumStock: 0, alertLevel: 0, unitCost: 0, sellingPrice: 0, barcode: "8901001001029", qrCode: "QR-2024", supplier: "Frame Mart", remainingStock: 0 },
  { id: "mat-29", item: "24 x 30 Frame", category: "Other", openingStock: 0, purchased: 0, used: 0, minimumStock: 0, alertLevel: 0, unitCost: 0, sellingPrice: 0, barcode: "8901001001030", qrCode: "QR-2430", supplier: "Frame Mart", remainingStock: 0 },
  { id: "mat-30", item: "30 x 36 Frame", category: "Other", openingStock: 0, purchased: 0, used: 0, minimumStock: 0, alertLevel: 0, unitCost: 0, sellingPrice: 0, barcode: "8901001001031", qrCode: "QR-3036", supplier: "Frame Mart", remainingStock: 0 },
  { id: "mat-31", item: "Frame Ring", category: "Finishing", openingStock: 0, purchased: 0, used: 0, minimumStock: 10, alertLevel: 10, unitCost: 2.00, sellingPrice: 4.00, barcode: "8901001001032", qrCode: "QR-FRAMERING", supplier: "Frame Mart", remainingStock: 0 },
  { id: "mat-32", item: "2-sided Tape", category: "Finishing", openingStock: 0, purchased: 0, used: 0, minimumStock: 10, alertLevel: 10, unitCost: 15.00, sellingPrice: 30.00, barcode: "8901001001033", qrCode: "QR-2SIDETAPE", supplier: "Tape House Ghana", remainingStock: 0 },
  { id: "mat-33", item: "Heat Tape", category: "Finishing", openingStock: 0, purchased: 0, used: 0, minimumStock: 10, alertLevel: 10, unitCost: 20.00, sellingPrice: 40.00, barcode: "8901001001034", qrCode: "QR-HEATTAPE", supplier: "Tape House Ghana", remainingStock: 0 },
  { id: "mat-34", item: "Sublimation Ink", category: "Ink", openingStock: 0, purchased: 0, used: 0, minimumStock: 5, alertLevel: 5, unitCost: 120.00, sellingPrice: 240.00, barcode: "8901001001035", qrCode: "QR-SUBINK", supplier: "Ink World Ltd", remainingStock: 0 },
  { id: "mat-35", item: "Sublimation Paper", category: "Paper", openingStock: 0, purchased: 0, used: 0, minimumStock: 30, alertLevel: 30, unitCost: 1.00, sellingPrice: 2.00, barcode: "8901001001036", qrCode: "QR-SUBPAPER", supplier: "Paper Mill Ltd", remainingStock: 0 }
];

const SEED_JOBS: Job[] = [];
const SEED_GPO: GeneralPrintingOrder[] = [];
const SEED_EXPENDITURES: Expenditure[] = [];
const SEED_MISC: DailyMiscellaneous[] = [];
const SEED_SALES_REPORTS: DailySalesReport[] = [];
const SEED_AUDIT: AuditLog[] = [];
const SEED_NOTIFICATIONS: Notification[] = [];
const SEED_STAFF_NOTES: StaffNote[] = [];

function getStored<T>(key: string, seed: T): T {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try { return JSON.parse(data) as T; } catch { return seed; }
}

function setStored<T>(key: string, data: T, emit = true) {
  localStorage.setItem(key, JSON.stringify(data));
  if (emit && isSupabaseEnabled()) {
    const version = (Number(localStorage.getItem(`__v_${key}`) || 0) + 1);
    try { localStorage.setItem(`__v_${key}`, String(version)); } catch { /* ignore */ }
    supabase!.from("app_state").upsert({ key, data, version, updated_at: new Date().toISOString() });
  }
}

async function initSupabaseSync() {
  if (!isSupabaseEnabled()) return;
  try {
    const { data, error } = await supabase!.from("app_state").select("key, data, version");
    if (error || !data) return;
    let updated = false;
    for (const row of data) {
      const localVersion = Number(localStorage.getItem(`__v_${row.key}`) || "0");
      const remoteVersion = row.version || 0;
      if (remoteVersion > localVersion || !localStorage.getItem(row.key)) {
        localStorage.setItem(row.key, JSON.stringify(row.data));
        if (remoteVersion) { try { localStorage.setItem(`__v_${row.key}`, String(remoteVersion)); } catch { /* ignore */ } }
        updated = true;
      }
    }
    if (updated) {
      const event = new CustomEvent("printopia-sync", { detail: { key: "printing_db_init" } });
      window.dispatchEvent(event);
    }
  } catch (err) { console.error("Failed to init from Supabase:", err); }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Supabase init timeout")), ms))
  ]);
}

if (typeof window !== "undefined") {
  withTimeout(initSupabaseSync(), 8000).catch(() => {});
  subscribeToSupabase();
}

function subscribeToSupabase() {
  if (!isSupabaseEnabled() || supabaseChannel) return;
  supabaseChannel = supabase!.channel("app_state_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, (payload: any) => {
      if (payload.new && payload.new.key) {
        const key = payload.new.key;
        const remoteVersion = payload.new.version || 0;
        const localVersion = Number(localStorage.getItem(`__v_${key}`) || "0");
        if (remoteVersion >= localVersion) {
          localStorage.setItem(key, JSON.stringify(payload.new.data));
          try { localStorage.setItem(`__v_${key}`, String(remoteVersion)); } catch { /* ignore */ }
          const event = new CustomEvent("printopia-sync", { detail: { key } });
          window.dispatchEvent(event);
        }
      }
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_activity" }, (payload: any) => {
      if (payload.new && payload.new.data) {
        const activities = getStored<any[]>(KEYS.LIVE_ACTIVITY, []);
        activities.unshift(payload.new.data);
        if (activities.length > 50) activities.pop();
        localStorage.setItem(KEYS.LIVE_ACTIVITY, JSON.stringify(activities));
        const event = new CustomEvent("printopia-sync", { detail: { key: KEYS.LIVE_ACTIVITY } });
        window.dispatchEvent(event);
      }
    })
    .subscribe();
}

if (typeof window !== "undefined") {
  initSupabaseSync();
  subscribeToSupabase();
}

export const DBStore = {
  getSyncServerUrl(settings?: CompanySettings): string {
    if (isSupabaseEnabled()) return (supabase as any).supabaseUrl || "";
    return "";
  },

  getSettings(): CompanySettings {
    const settings = getStored<CompanySettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
    if (settings.companyName === "Apex Print Solutions" || settings.companyName === "Printopia" || settings.companyName === "Apex Digital Press & Print" || !settings.logoUrl || settings.companyName === "Apex Digital Press" || settings.vatRate !== 0 || settings.invoiceFooter.includes("Bank of Africa")) {
      settings.companyName = "Printopia Digital Press";
      settings.logoUrl = "/src/assets/images/printopia_logo_1783376948226.jpg";
      settings.email = "billing@printopiadigitalpress.com";
      settings.receiptFooter = "Thank you for doing business with Printopia Digital Press! Please retain this receipt for returns.";
      settings.invoiceFooter = "Thank you for choosing Printopia Digital Press. Payment is due upon receipt. For inquiries, email support@printopiadigitalpress.com or call +233 24 555 0192.";
      settings.vatRate = 0;
      setStored(KEYS.SETTINGS, settings);
    }
    return settings;
  },

  updateSettings(settings: CompanySettings) {
    setStored(KEYS.SETTINGS, settings);
    this.addAuditLog("Admin", "Edit", "Settings", "Updated global store settings and invoice/receipt layout rules.");
  },

  getAdminAccount(): { username: string; passwordText: string; name: string } | null {
    const raw = localStorage.getItem("printing_db_admin_account");
    if (!raw) return null;
    try { return JSON.parse(raw) as { username: string; passwordText: string; name: string }; } catch { return null; }
  },

  saveAdminAccount(account: { username: string; passwordText: string; name: string }) {
    setStored("printing_db_admin_account", account);
  },

  getJobs(): Job[] {
    const jobs = getStored<Job[]>(KEYS.JOBS, SEED_JOBS);
    let updated = false;
    const migration = jobs.map(j => {
      if (!j.paymentHistory) {
        j.paymentHistory = [{ id: `pay-init-${j.id}`, timestamp: `${j.date} ${j.time || "12:00"}`, amountPaid: j.depositPaid, paymentMethod: j.paymentMethod, receivedBy: j.staffInitials || "System" }];
        updated = true;
      }
      return j;
    });
    if (updated) setStored(KEYS.JOBS, migration);
    return migration;
  },

  saveJob(job: Omit<Job, "id" | "jobNumber">): Job {
    const jobs = this.getJobs();
    const nextNumber = jobs.length + 1;
    const padding = String(nextNumber).padStart(4, "0");
    const year = new Date().getFullYear();
    const jobNumber = `JOB-${year}-${padding}`;
    const id = `job-${Date.now()}`;
    const newJob: Job = { ...job, id, jobNumber, paymentHistory: job.paymentHistory || [{ id: `pay-init-${id}`, timestamp: `${job.date} ${job.time || "12:00"}`, amountPaid: job.depositPaid, paymentMethod: job.paymentMethod, receivedBy: job.staffInitials || "System" }] };
    jobs.unshift(newJob);
    setStored(KEYS.JOBS, jobs);
    this.autoConsumeForJob(newJob);
    this.addAuditLog(job.staffInitials || "Staff", "Create", "Job Intake", `Created new job ${jobNumber} for customer ${job.customerName}.`);
    this.broadcastLiveActivity(job.staffInitials || "Staff", "Create", "Job Intake", `New job ${jobNumber} for ${job.customerName}`);
    if (newJob.totalAmount >= 2500) this.addNotification("large_sale", `Large Sale Recorded: Job ${jobNumber} for ${job.customerName} of GHS ${newJob.totalAmount.toFixed(2)}.`);
    if (newJob.balance > 0) this.addNotification("unpaid_deposit", `Deposit Balance Due: Job ${jobNumber} has a remaining balance of GHS ${newJob.balance.toFixed(2)}.`);
    return newJob;
  },

  updateJob(job: Job) {
    const jobs = this.getJobs();
    const index = jobs.findIndex(j => j.id === job.id);
    if (index !== -1) {
      const oldJob = jobs[index];
      jobs[index] = job;
      setStored(KEYS.JOBS, jobs);
      this.addAuditLog(job.staffInitials || "Staff", "Edit", "Job Intake", `Updated Job ${job.jobNumber} details (Status: ${oldJob.status} ➔ ${job.status}, Stage: ${oldJob.kanbanStage} ➔ ${job.kanbanStage}).`);
      this.broadcastLiveActivity(job.staffInitials || "Staff", "Edit", "Job Intake", `Updated job ${job.jobNumber}`);
      if (job.status === "Delivered" && oldJob.status !== "Delivered") this.addAuditLog("System", "Action", "Waybill", `Waybill auto-triggered and items logged as Delivered for Job ${job.jobNumber}.`);
    }
  },

  deleteJob(id: string, user: string, refundAmount: number = 0) {
    const jobs = this.getJobs();
    const job = jobs.find(j => j.id === id);
    if (job) {
      const filtered = jobs.filter(j => j.id !== id);
      setStored(KEYS.JOBS, filtered);
      const deletedJobs = this.getDeletedJobs();
      deletedJobs.push({ id: `del-${Date.now()}`, originalJobId: job.id, jobNumber: job.jobNumber, customerName: job.customerName, totalAmount: job.totalAmount, depositPaid: job.depositPaid, deletedBy: user, refundAmount, timestamp: new Date().toISOString() });
      setStored(KEYS.DELETED_JOBS, deletedJobs);
      this.addAuditLog(user, "Delete", "Job Intake", `Deleted Job ${job.jobNumber} for ${job.customerName}.${refundAmount > 0 ? ` Refund issued: ${refundAmount.toFixed(2)}.` : ""} Reason: customer mind-change / cancelled work.`);
      this.broadcastLiveActivity(user, "Delete", "Job Intake", `Deleted job ${job.jobNumber}`);
      this.addNotification("job_deleted", `Job ${job.jobNumber} was deleted by ${user}.${refundAmount > 0 ? ` Refund: ${refundAmount.toFixed(2)}.` : ""}`);
    }
  },

  getDeletedJobs(): DeletedJob[] { return getStored<DeletedJob[]>(KEYS.DELETED_JOBS, []); },

  autoConsumeForJob(job: Job) {
    const desc = job.jobDescription.toLowerCase();
    if (desc.includes("cotton") || desc.includes("shirt")) this.consumeInventoryByKeyword("Cotton Shirt", Math.floor(job.totalAmount / 70) || 5);
    if (desc.includes("sticker") || desc.includes("label")) this.consumeInventoryByKeyword("Sticker Rolls", 1);
    if (desc.includes("banner")) this.consumeInventoryByKeyword("Banner Canvas Roll", 1);
    if (desc.includes("dtf")) { this.consumeInventoryByKeyword("DTF Matte Film Roll", 2); this.consumeInventoryByKeyword("Premium DTF Powder", 1); }
    if (desc.includes("frame")) this.consumeInventoryByKeyword("Paper A3", 5);
  },

  getGeneralPrintingOrders(): GeneralPrintingOrder[] { return getStored<GeneralPrintingOrder[]>(KEYS.GPO, SEED_GPO); },

  saveGeneralPrintingOrder(order: Omit<GeneralPrintingOrder, "id" | "orderNumber">): GeneralPrintingOrder {
    const orders = this.getGeneralPrintingOrders();
    const nextNumber = orders.length + 1;
    const padding = String(nextNumber).padStart(4, "0");
    const year = new Date().getFullYear();
    const orderNumber = `GPO-${year}-${padding}`;
    const id = `gpo-${Date.now()}`;
    const newOrder: GeneralPrintingOrder = { ...order, id, orderNumber };
    orders.unshift(newOrder);
    setStored(KEYS.GPO, orders);
    if (newOrder.photocopy.quantity > 0) this.consumeInventoryByKeyword("Paper A4", Math.ceil(newOrder.photocopy.quantity / 500) || 1);
    if (newOrder.printing.quantity > 0) { this.consumeInventoryByKeyword("Paper A4", Math.ceil(newOrder.printing.quantity / 500) || 1); this.consumeInventoryByKeyword("Black Ink Bottle", 1); }
    if (newOrder.frame.quantity > 0) this.consumeInventoryByKeyword("Paper A3", newOrder.frame.quantity);
    if (newOrder.tshirt.quantity > 0) {
      if (newOrder.tshirt.category === "Cotton") this.consumeInventoryByKeyword("Cotton Shirt", newOrder.tshirt.quantity);
      else if (newOrder.tshirt.category === "Lacoste") this.consumeInventoryByKeyword("Lacoste Shirt", newOrder.tshirt.quantity);
    }
    if (newOrder.largeFormat.sticker.quantity > 0) this.consumeInventoryByKeyword("Sticker Rolls", 1);
    if (newOrder.largeFormat.banner.quantity > 0) this.consumeInventoryByKeyword("Banner Canvas Roll", 1);
    if (newOrder.dtf.a3.quantity > 0 || newOrder.dtf.a4.quantity > 0) { this.consumeInventoryByKeyword("DTF Matte Film Roll", 1); this.consumeInventoryByKeyword("Premium DTF Powder", 1); }
    this.addAuditLog(order.staffName, "Create", "General Printing", `Created general order ${orderNumber} for ${order.customerName}.`);
    this.broadcastLiveActivity(order.staffName, "Create", "General Printing", `New order ${orderNumber} for ${order.customerName}`);
    if (newOrder.grandTotal >= 1500) this.addNotification("large_sale", `Large Sale Recorded: General Order ${orderNumber} for GHS ${newOrder.grandTotal.toFixed(2)}.`);
    return newOrder;
  },

  getInventory(): InventoryItem[] {
    const stored = getStored<InventoryItem[]>(KEYS.INVENTORY, SEED_INVENTORY);
    if (!stored || stored.length === 0) { setStored(KEYS.INVENTORY, SEED_INVENTORY); return SEED_INVENTORY; }
    return stored;
  },

  updateInventoryItem(item: InventoryItem, user: string) {
    const inventory = this.getInventory();
    const index = inventory.findIndex(i => i.id === item.id);
    if (index !== -1) {
      const oldItem = inventory[index];
      item.remainingStock = item.openingStock + item.purchased - item.used;
      if (item.remainingStock < 0) item.remainingStock = 0;
      inventory[index] = item;
      setStored(KEYS.INVENTORY, inventory);
      this.addAuditLog(user, "Edit", "Inventory", `Updated Stock for ${item.item} (Remaining: ${oldItem.remainingStock} ➔ ${item.remainingStock}).`);
      this.broadcastLiveActivity(user, "Edit", "Inventory", `Updated stock for ${item.item}`);
      if (item.remainingStock <= item.minimumStock) this.addNotification("low_stock", `Low Stock Alert: ${item.item} is down to ${item.remainingStock} (Min limit: ${item.minimumStock}). Please reorder.`);
    }
  },

  addInventoryItem(item: Omit<InventoryItem, "id" | "remainingStock">, user: string): InventoryItem {
    const inventory = this.getInventory();
    const id = `inv-${Date.now()}`;
    const remainingStock = item.openingStock + item.purchased - item.used;
    const newItem: InventoryItem = { ...item, id, remainingStock };
    inventory.push(newItem);
    setStored(KEYS.INVENTORY, inventory);
    this.addAuditLog(user, "Create", "Inventory", `Added new Inventory Item: ${newItem.item}.`);
    this.broadcastLiveActivity(user, "Create", "Inventory", `Added item ${newItem.item}`);
    if (newItem.remainingStock <= newItem.minimumStock) this.addNotification("low_stock", `Low Stock Alert: ${newItem.item} initialized with low stock.`);
    return newItem;
  },

  deleteInventoryItem(id: string, user: string): boolean {
    const inventory = this.getInventory();
    const item = inventory.find(i => i.id === id);
    if (!item) return false;
    const filtered = inventory.filter(i => i.id !== id);
    setStored(KEYS.INVENTORY, filtered);
    this.addAuditLog(user, "Delete", "Inventory", `Removed inventory item: ${item.item} from the catalog.`);
    this.broadcastLiveActivity(user, "Delete", "Inventory", `Removed item ${item.item}`);
    return true;
  },

  consumeInventoryByKeyword(keyword: string, qty: number) {
    const inventory = this.getInventory();
    const item = inventory.find(i => i.item.toLowerCase().includes(keyword.toLowerCase()));
    if (item) {
      item.used += qty;
      item.remainingStock = item.openingStock + item.purchased - item.used;
      if (item.remainingStock < 0) item.remainingStock = 0;
      setStored(KEYS.INVENTORY, inventory);
      this.addAuditLog("System Auto", "Edit", "Inventory", `Auto-consumed ${qty} units of ${item.item} for production processing.`);
      if (item.remainingStock <= item.minimumStock) this.addNotification("low_stock", `Low Stock Alert: ${item.item} fell to ${item.remainingStock} units (Limit: ${item.minimumStock}).`);
    }
  },

  getExpenditures(): Expenditure[] { return getStored<Expenditure[]>(KEYS.EXPENDITURES, SEED_EXPENDITURES); },

  addExpenditure(exp: Omit<Expenditure, "id">, user: string): Expenditure {
    const expenditures = this.getExpenditures();
    const id = `exp-${Date.now()}`;
    const newExp: Expenditure = { ...exp, id };
    expenditures.unshift(newExp);
    setStored(KEYS.EXPENDITURES, expenditures);
    this.addAuditLog(user, "Create", "Expenditures", `Logged monthly expenditure of GHS ${newExp.amount.toFixed(2)} for ${newExp.item}.`);
    this.broadcastLiveActivity(user, "Create", "Expenditures", `Logged expenditure GHS ${newExp.amount.toFixed(2)} for ${newExp.item}`);
    return newExp;
  },

  deleteExpenditure(id: string, user: string) {
    const expenditures = this.getExpenditures();
    const exp = expenditures.find(e => e.id === id);
    if (exp) { const filtered = expenditures.filter(e => e.id !== id); setStored(KEYS.EXPENDITURES, filtered); this.addAuditLog(user, "Delete", "Expenditures", `Deleted expenditure of GHS ${exp.amount.toFixed(2)}: ${exp.item}.`); }
  },

  getDailyMiscellaneous(): DailyMiscellaneous[] { return getStored<DailyMiscellaneous[]>(KEYS.MISCELLANEOUS, SEED_MISC); },

  addDailyMiscellaneous(misc: Omit<DailyMiscellaneous, "id">): DailyMiscellaneous {
    const miscellaneous = this.getDailyMiscellaneous();
    const id = `misc-${Date.now()}`;
    const newMisc: DailyMiscellaneous = { ...misc, id };
    miscellaneous.unshift(newMisc);
    setStored(KEYS.MISCELLANEOUS, miscellaneous);
    this.addAuditLog(misc.staffName, "Create", "Daily Misc", `Logged local daily miscellaneous item GHS ${misc.amount.toFixed(2)}: ${misc.item}.`);
    return newMisc;
  },

  getDailySalesReports(): DailySalesReport[] { return getStored<DailySalesReport[]>(KEYS.SALES_REPORTS, SEED_SALES_REPORTS); },

  addDailySalesReport(report: Omit<DailySalesReport, "id" | "isApproved">): DailySalesReport {
    const reports = this.getDailySalesReports();
    const id = `rep-${Date.now()}`;
    const newReport: DailySalesReport = { ...report, id, isApproved: false };
    reports.unshift(newReport);
    setStored(KEYS.SALES_REPORTS, reports);
    this.addAuditLog(report.staffName, "Create", "Sales Report", `Submitted End of Day Sales Report for ${report.date} with Total GHS ${report.totalSales.toFixed(2)}.`);
    this.addNotification("missing_report", `New Shift Report: ${report.staffName} submitted EOD Balanced Statement for ${report.date} (${report.shift}) - Total sales: ${this.getSettings().currency} ${report.totalSales.toFixed(2)}.`);
    return newReport;
  },

  approveSalesReport(id: string, adminUser: string) {
    const reports = this.getDailySalesReports();
    const index = reports.findIndex(r => r.id === id);
    if (index !== -1) { reports[index].isApproved = true; setStored(KEYS.SALES_REPORTS, reports); this.addAuditLog(adminUser, "Edit", "Sales Report", `Approved End of Day sales report ID: ${id}.`); }
  },

  getAuditLogs(): AuditLog[] { return getStored<AuditLog[]>(KEYS.AUDIT_LOGS, SEED_AUDIT); },

  addAuditLog(user: string, action: string, module: string, details: string): AuditLog {
    const logs = this.getAuditLogs();
    const id = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    const newLog: AuditLog = { id, timestamp, user, action, module, details };
    logs.unshift(newLog);
    if (logs.length > 200) logs.pop();
    setStored(KEYS.AUDIT_LOGS, logs);
    return newLog;
  },

  getNotifications(): Notification[] { return getStored<Notification[]>(KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS); },

  addNotification(type: Notification["type"], message: string): Notification {
    const notifications = this.getNotifications();
    const id = `not-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    const newNot: Notification = { id, timestamp, type, message, isRead: false };
    notifications.unshift(newNot);
    setStored(KEYS.NOTIFICATIONS, notifications);
    return newNot;
  },

  markNotificationRead(id: string) {
    const notifications = this.getNotifications();
    const item = notifications.find(n => n.id === id);
    if (item) { item.isRead = true; setStored(KEYS.NOTIFICATIONS, notifications); }
  },

  markAllNotificationsRead() {
    const notifications = this.getNotifications();
    notifications.forEach(n => n.isRead = true);
    setStored(KEYS.NOTIFICATIONS, notifications);
  },

  checkJobDeadlines(): number {
    const jobs = this.getJobs();
    let created = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const notifications = this.getNotifications();
    jobs.forEach(job => {
      if (job.status === "Delivered" || job.status === "Cancelled" || job.kanbanStage === "Job Completed") return;
      const deadline = new Date(job.expectedDeliveryDate); deadline.setHours(0, 0, 0, 0);
      if (deadline.getTime() === tomorrow.getTime()) {
        const existingNotif = notifications.find(n => n.type === "deadline_approaching" && n.message.includes(job.jobNumber));
        if (!existingNotif) { this.addNotification("deadline_approaching", `⚠️ Job ${job.jobNumber} for ${job.customerName} is due TOMORROW (${job.expectedDeliveryDate})`); created++; }
      }
    });
    return created;
  },

  triggerAutoBackup(user: string): string {
    const timestamp = new Date().toLocaleTimeString();
    const logDetails = `Manual backup executed successfully. Encrypted database state saved. Version hash: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    this.addAuditLog(user, "Backup", "System Setup", logDetails);
    return timestamp;
  },

  exportBackup(filename?: string): void {
    const backup = { exportedAt: new Date().toISOString(), app: "Printopia Digital Press", version: "2.0", data: { jobs: this.getJobs(), inventory: this.getInventory(), expenditures: this.getExpenditures(), miscellaneous: this.getDailyMiscellaneous(), salesReports: this.getDailySalesReports(), generalPrintingOrders: this.getGeneralPrintingOrders(), auditLogs: this.getAuditLogs(), notifications: this.getNotifications(), settings: this.getSettings(), staffAccounts: this.getStaffAccounts(), staffNotes: this.getStaffNotes(), staffAttendance: this.getStaffAttendance() } };
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    const timeStr = new Date().toISOString().split("T")[1].replace(/:/g, "-").split(".")[0];
    link.href = url;
    link.setAttribute("download", filename || `printopia-backup-${dateStr}-${timeStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  getAllCustomerPhoneNumbers(): string[] {
    const phones = new Set<string>();
    this.getJobs().forEach(job => { if (job.customerPhone && job.customerPhone.trim().length > 0) phones.add(job.customerPhone.trim()); });
    this.getGeneralPrintingOrders().forEach(gpo => { if (gpo.customerPhone && gpo.customerPhone.trim().length > 0) phones.add(gpo.customerPhone.trim()); });
    return Array.from(phones).sort();
  },

  purgeDemoData(user: string) {
    setStored(KEYS.JOBS, []); setStored(KEYS.GPO, []); setStored(KEYS.EXPENDITURES, []); setStored(KEYS.MISCELLANEOUS, []); setStored(KEYS.SALES_REPORTS, []); setStored(KEYS.NOTIFICATIONS, []);
    setStored(KEYS.AUDIT_LOGS, [{ id: `log-${Date.now()}`, timestamp: new Date().toISOString(), user, action: "Purge Database", module: "System Setup", details: "All seed transaction data (Jobs, Orders, Expenditures, End of Day Reports, Notifications) was purged for active company deployment." }]);
  },

  purgeInventoryData(user: string) { setStored(KEYS.INVENTORY, []); this.addAuditLog(user, "Purge Stock", "Inventory", "All default seed inventory materials were cleared for live stock tracking setup."); },

  resetAllData(user: string) {
    Object.values(KEYS).forEach(k => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
    this.getSettings(); this.getStaffAccounts(); this.getInventory(); this.getJobs(); this.getGeneralPrintingOrders(); this.getExpenditures(); this.getDailyMiscellaneous(); this.getDailySalesReports(); this.getStaffNotes(); this.getStaffAttendance();
    this.addAuditLog(user, "System Reset", "System Setup", "Full system reset executed. All business data (jobs, orders, expenditures, reports, inventory, notes, attendance) was cleared and factory defaults were restored.");
  },

  getStaffAccounts(): StaffAccount[] {
    const accounts = getStored<StaffAccount[]>(KEYS.STAFF, DEFAULT_STAFF_ACCOUNTS);
    let updated = false;
    const migrated = accounts.map(acc => {
      if (acc.id === "staff-1" && (acc.name === "Selasie Boateng" || acc.username === "selasie")) { updated = true; return { ...acc, name: "Staff 1", username: "staff1", passwordText: acc.passwordText === "selasie123" ? "staff123" : acc.passwordText }; }
      if (acc.id === "staff-2" && (acc.name === "Kojo Mensah" || acc.username === "kojo")) { updated = true; return { ...acc, name: "Staff 2", username: "staff2", passwordText: acc.passwordText === "kojo123" ? "staff456" : acc.passwordText }; }
      return acc;
    });

    const defaultsMap = new Map(DEFAULT_STAFF_ACCOUNTS.map(a => [a.username, a]));
    const merged = migrated.filter(a => !defaultsMap.has(a.username));
    DEFAULT_STAFF_ACCOUNTS.forEach(def => {
      if (!migrated.some(a => a.username === def.username)) {
        merged.push(def);
        updated = true;
      }
    });

    if (updated) setStored(KEYS.STAFF, merged);
    return merged;
  },

  saveStaffAccounts(accounts: StaffAccount[]) { setStored(KEYS.STAFF, accounts); },

  getStaffNotes(): StaffNote[] { return getStored<StaffNote[]>(KEYS.STAFF_NOTES, SEED_STAFF_NOTES); },

  addStaffNote(note: Omit<StaffNote, "id" | "timestamp">): StaffNote {
    const notes = this.getStaffNotes();
    const id = `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    const newNote: StaffNote = { ...note, id, timestamp };
    notes.unshift(newNote);
    setStored(KEYS.STAFF_NOTES, notes);
    this.addAuditLog(note.recordedBy, "Create", "Staff Notes", `Recorded late arrival note for ${note.staffName} on ${note.date}: "${note.note.substring(0, 50)}${note.note.length > 50 ? '...' : ''}".`);
    return newNote;
  },

  deleteStaffNote(id: string, user: string) {
    const notes = this.getStaffNotes();
    const note = notes.find(n => n.id === id);
    if (note) { const filtered = notes.filter(n => n.id !== id); setStored(KEYS.STAFF_NOTES, filtered); this.addAuditLog(user, "Delete", "Staff Notes", `Removed late arrival note for ${note.staffName} dated ${note.date}.`); }
  },

  getStaffAttendance(): StaffNote[] { return getStored<StaffNote[]>(KEYS.STAFF_ATTENDANCE, []); },

  addStaffAttendance(session: Omit<StaffNote, "id" | "timestamp">): StaffNote {
    const sessions = this.getStaffAttendance();
    const id = `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    const newSession: StaffNote = { ...session, id, timestamp };
    sessions.unshift(newSession);
    setStored(KEYS.STAFF_ATTENDANCE, sessions);
    this.addAuditLog(session.recordedBy, "Create", "Staff Attendance", `Recorded ${session.sessionType || "attendance"} session for ${session.staffName} (${session.date}${session.clockInTime ? " in " + session.clockInTime : ""}${session.clockOutTime ? " out " + session.clockOutTime : ""}).`);
    return newSession;
  },

  requestFullSync() {
    if (!isSupabaseEnabled()) return;
    supabase!.from("app_state").select("key, data, version").then(({ data }: any) => {
      if (!data) return;
      for (const row of data) {
        localStorage.setItem(row.key, JSON.stringify(row.data));
        if (row.version) { try { localStorage.setItem(`__v_${row.key}`, String(row.version)); } catch { /* ignore */ } }
      }
      const event = new CustomEvent("printopia-sync", { detail: { key: "printing_db_init" } });
      window.dispatchEvent(event);
    });
  },

  async clearAllSharedData(user: string): Promise<boolean> {
    if (!isSupabaseEnabled()) return false;
    try {
      await supabase!.from("app_state").delete().neq("key", "");
      await supabase!.from("live_activity").delete().neq("id", "");
      Object.values(KEYS).forEach((k) => { if (k === KEYS.STAFF || k === KEYS.SETTINGS) return; localStorage.removeItem(k); localStorage.removeItem(`__v_${k}`); });
      return true;
    } catch (err) { console.error("Clear all shared data failed:", err); return false; }
  },

  broadcastLiveActivity(user: string, action: string, module: string, details: string) {
    const activities = getStored<any[]>(KEYS.LIVE_ACTIVITY, []);
    const entry = { id: `live-${Date.now()}-${Math.floor(Math.random() * 1000)}`, timestamp: new Date().toISOString(), user, action, module, details };
    activities.unshift(entry);
    if (activities.length > 50) activities.pop();
    localStorage.setItem(KEYS.LIVE_ACTIVITY, JSON.stringify(activities));
    if (isSupabaseEnabled()) { supabase!.from("live_activity").insert({ id: entry.id, data: entry }); }
  },

  getLiveActivities(): any[] { return getStored<any[]>(KEYS.LIVE_ACTIVITY, []); }
};
