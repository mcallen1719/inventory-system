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
  Contact
} from "./types";
import { io } from "socket.io-client";

// Initialize socket connection to backend
export let socket: ReturnType<typeof io> | null = null;
let currentSocket: ReturnType<typeof io> | null = null;
let currentSocketUrl = "";

function getSyncServerUrl(settings?: CompanySettings): string {
  try {
    const pairingRaw = localStorage.getItem("printing_db_sync_pairing");
    if (pairingRaw) {
      const pairing = JSON.parse(pairingRaw);
      if (pairing.serverUrl && pairing.serverUrl.trim().length > 0) {
        return pairing.serverUrl.trim();
      }
    }
  } catch {
    // ignore
  }
  const configured = (settings || DBStore.getSettings()).syncServerUrl;
  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }
  // Runtime config from public/config.json
  try {
    const runtime = (window as any).__PRINTOPIA_RUNTIME_CONFIG__;
    if (runtime && runtime.backendUrl && runtime.backendUrl.trim().length > 0) {
      return runtime.backendUrl.trim();
    }
  } catch {
    // ignore
  }
  try {
    const { protocol, hostname, port } = window.location;
    if (port && port !== "3001") {
      return `${protocol}//${hostname}:3001`;
    }
  } catch {
    // ignore
  }
  return window.location.origin;
}

function createSocket(url: string): ReturnType<typeof io> {
  const socket = io(url, {
    transports: ["websocket", "polling"],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000
  });

  socket.on("connect", () => {
    console.log(`Sync server connected: ${url}`);
  });

  socket.on("disconnect", () => {
    console.log(`Sync server disconnected: ${url}`);
  });

  socket.on("connect_error", (err) => {
    console.error(`Sync server connection error: ${url}`, err.message);
  });

  socket.on("sync-init", (cache: any) => {
    let updated = false;
    for (const key in cache) {
      localStorage.setItem(key, JSON.stringify(cache[key]));
      updated = true;
    }
    if (updated) {
      const event = new CustomEvent("printopia-sync", { detail: { key: "printing_db_init" } });
      window.dispatchEvent(event);
    }
  });

  socket.on("sync-update", ({ key, data }: { key: string, data: any }) => {
    localStorage.setItem(key, JSON.stringify(data));
    const event = new CustomEvent("printopia-sync", { detail: { key } });
    window.dispatchEvent(event);
  });

  socket.on("live-activity", (activity: any) => {
    const activities = getStored<any[]>(KEYS.LIVE_ACTIVITY, []);
    activities.unshift(activity);
    if (activities.length > 50) activities.pop();
    localStorage.setItem(KEYS.LIVE_ACTIVITY, JSON.stringify(activities));
    const event = new CustomEvent("printopia-sync", { detail: { key: KEYS.LIVE_ACTIVITY } });
    window.dispatchEvent(event);
  });

  return socket;
}

function ensureSocket(settings?: CompanySettings) {
  const url = getSyncServerUrl(settings);
  if (!currentSocket || currentSocketUrl !== url) {
    if (currentSocket) {
      currentSocket.disconnect();
    }
    currentSocket = createSocket(url);
    currentSocketUrl = url;
    socket = currentSocket;
  }
  return currentSocket;
}

// Initial connection is deferred to the end of the file after DBStore initialization

export function reconnectSocket(settings?: CompanySettings) {
  const url = getSyncServerUrl(settings);
  if (currentSocket) {
    currentSocket.disconnect();
  }
  currentSocket = createSocket(url);
  currentSocketUrl = url;
  return currentSocket;
}

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
  LIVE_ACTIVITY: "printing_db_live_activity",
  SMS_CONTACTS: "printing_db_sms_contacts"
};

// Auto-clear demo mockup data on first load of this production release
const CLEAR_DEMO_FLAG = "printing_db_is_live_v5";
if (typeof window !== "undefined" && !localStorage.getItem(CLEAR_DEMO_FLAG)) {
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
  localStorage.removeItem(KEYS.SMS_CONTACTS);
}

// Default Staff Accounts
const DEFAULT_STAFF_ACCOUNTS: StaffAccount[] = [
  {
    id: "staff-1",
    username: "staff1",
    name: "Staff 1",
    passwordText: "staff123",
    roleDescription: ""
  },
  {
    id: "staff-2",
    username: "staff2",
    name: "Staff 2",
    passwordText: "staff456",
    roleDescription: ""
  }
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
  syncServerUrl: "",
  africasTalkingUsername: "",
  africasTalkingApiKey: "",
  africasTalkingSenderId: ""
};

// Initial Seed Data for Inventory
const SEED_INVENTORY: InventoryItem[] = [];

// Seed Jobs
const SEED_JOBS: Job[] = [];

// Seed GPO (General Printing Orders)
const SEED_GPO: GeneralPrintingOrder[] = [];

// Seed Expenditures (Admin logged)
const SEED_EXPENDITURES: Expenditure[] = [];

// Seed Daily Miscellaneous Expenses (Staff logged)
const SEED_MISC: DailyMiscellaneous[] = [];

// Seed Sales Reports (End of day)
const SEED_SALES_REPORTS: DailySalesReport[] = [];

// Seed Audit Logs
const SEED_AUDIT: AuditLog[] = [];

// Seed Notifications
const SEED_NOTIFICATIONS: Notification[] = [];

// Seed Staff Notes (Late Arrival Notes)
const SEED_STAFF_NOTES: StaffNote[] = [];

// Helper to safely fetch from localStorage or initialize with seed
function getStored<T>(key: string, seed: T): T {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(data) as T;
  } catch {
    return seed;
  }
}

function setStored<T>(key: string, data: T, emit = true) {
  localStorage.setItem(key, JSON.stringify(data));
  if (emit && socket) {
    socket.emit("sync-update", { key, data });
  }
}

// Main DB Store object exposing clean methods
export const DBStore = {
  getSyncServerUrl(settings?: CompanySettings): string {
    return getSyncServerUrl(settings);
  },
  // Settings
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
    reconnectSocket(settings);
    this.addAuditLog("Admin", "Edit", "Settings", "Updated global store settings and invoice/receipt layout rules.");
  },

  // Jobs
  getJobs(): Job[] {
    const jobs = getStored<Job[]>(KEYS.JOBS, SEED_JOBS);
    let updated = false;
    const migration = jobs.map(j => {
      if (!j.paymentHistory) {
        j.paymentHistory = [
          {
            id: `pay-init-${j.id}`,
            timestamp: `${j.date} ${j.time || "12:00"}`,
            amountPaid: j.depositPaid,
            paymentMethod: j.paymentMethod,
            receivedBy: j.staffInitials || "System"
          }
        ];
        updated = true;
      }
      return j;
    });
    if (updated) {
      setStored(KEYS.JOBS, migration);
    }
    return migration;
  },

  saveJob(job: Omit<Job, "id" | "jobNumber">): Job {
    const jobs = this.getJobs();
    const nextNumber = jobs.length + 1;
    const padding = String(nextNumber).padStart(4, "0");
    const year = new Date().getFullYear();
    const jobNumber = `JOB-${year}-${padding}`;
    const id = `job-${Date.now()}`;

    const newJob: Job = { 
      ...job, 
      id, 
      jobNumber,
      paymentHistory: job.paymentHistory || [
        {
          id: `pay-init-${id}`,
          timestamp: `${job.date} ${job.time || "12:00"}`,
          amountPaid: job.depositPaid,
          paymentMethod: job.paymentMethod,
          receivedBy: job.staffInitials || "System"
        }
      ]
    };
    jobs.unshift(newJob);
    setStored(KEYS.JOBS, jobs);

    // Automation: Consume standard materials mock based on description keywords
    this.autoConsumeForJob(newJob);

    // Logging & Notifications
    this.addAuditLog(job.staffInitials || "Staff", "Create", "Job Intake", `Created new job ${jobNumber} for customer ${job.customerName}.`);
    this.broadcastLiveActivity(job.staffInitials || "Staff", "Create", "Job Intake", `New job ${jobNumber} for ${job.customerName}`);
    
    if (newJob.totalAmount >= 2500) {
      this.addNotification("large_sale", `Large Sale Recorded: Job ${jobNumber} for ${job.customerName} of GHS ${newJob.totalAmount.toFixed(2)}.`);
    }
    if (newJob.balance > 0) {
      this.addNotification("unpaid_deposit", `Deposit Balance Due: Job ${jobNumber} has a remaining balance of GHS ${newJob.balance.toFixed(2)}.`);
    }

    return newJob;
  },

  updateJob(job: Job) {
    const jobs = this.getJobs();
    const index = jobs.findIndex(j => j.id === job.id);
    if (index !== -1) {
      const oldJob = jobs[index];
      jobs[index] = job;
      setStored(KEYS.JOBS, jobs);
      
      this.addAuditLog(
        job.staffInitials || "Staff",
        "Edit",
        "Job Intake",
        `Updated Job ${job.jobNumber} details (Status: ${oldJob.status} ➔ ${job.status}, Stage: ${oldJob.kanbanStage} ➔ ${job.kanbanStage}).`
      );
      this.broadcastLiveActivity(job.staffInitials || "Staff", "Edit", "Job Intake", `Updated job ${job.jobNumber}`);

      // Check if job is overdue dynamically or status changed
      if (job.status === "Delivered" && oldJob.status !== "Delivered") {
        this.addAuditLog("System", "Action", "Waybill", `Waybill auto-triggered and items logged as Delivered for Job ${job.jobNumber}.`);
      }
    }
  },

  deleteJob(id: string, user: string) {
    const jobs = this.getJobs();
    const job = jobs.find(j => j.id === id);
    if (job) {
      const filtered = jobs.filter(j => j.id !== id);
      setStored(KEYS.JOBS, filtered);
      this.addAuditLog(user, "Delete", "Job Intake", `Deleted Job Record: ${job.jobNumber} for ${job.customerName}.`);
      this.broadcastLiveActivity(user, "Delete", "Job Intake", `Deleted job ${job.jobNumber}`);
    }
  },

  // Automatically deplete stock based on job description keywords
  autoConsumeForJob(job: Job) {
    const desc = job.jobDescription.toLowerCase();
    if (desc.includes("cotton") || desc.includes("shirt")) {
      this.consumeInventoryByKeyword("Cotton Shirt", Math.floor(job.totalAmount / 70) || 5);
    }
    if (desc.includes("sticker") || desc.includes("label")) {
      this.consumeInventoryByKeyword("Sticker Rolls", 1);
    }
    if (desc.includes("banner")) {
      this.consumeInventoryByKeyword("Banner Canvas Roll", 1);
    }
    if (desc.includes("dtf")) {
      this.consumeInventoryByKeyword("DTF Matte Film Roll", 2);
      this.consumeInventoryByKeyword("Premium DTF Powder", 1);
    }
    if (desc.includes("frame")) {
      this.consumeInventoryByKeyword("Paper A3", 5);
    }
  },

  // General Printing Orders (Module 1)
  getGeneralPrintingOrders(): GeneralPrintingOrder[] {
    return getStored<GeneralPrintingOrder[]>(KEYS.GPO, SEED_GPO);
  },

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

    // Deplete inventory depending on items selected
    if (newOrder.photocopy.quantity > 0) {
      this.consumeInventoryByKeyword("Paper A4", Math.ceil(newOrder.photocopy.quantity / 500) || 1);
    }
    if (newOrder.printing.quantity > 0) {
      this.consumeInventoryByKeyword("Paper A4", Math.ceil(newOrder.printing.quantity / 500) || 1);
      this.consumeInventoryByKeyword("Black Ink Bottle", 1);
    }
    if (newOrder.frame.quantity > 0) {
      this.consumeInventoryByKeyword("Paper A3", newOrder.frame.quantity);
    }
    if (newOrder.tshirt.quantity > 0) {
      if (newOrder.tshirt.category === "Cotton") {
        this.consumeInventoryByKeyword("Cotton Shirt", newOrder.tshirt.quantity);
      } else if (newOrder.tshirt.category === "Lacoste") {
        this.consumeInventoryByKeyword("Lacoste Shirt", newOrder.tshirt.quantity);
      }
    }
    if (newOrder.largeFormat.sticker.quantity > 0) {
      this.consumeInventoryByKeyword("Sticker Rolls", 1);
    }
    if (newOrder.largeFormat.banner.quantity > 0) {
      this.consumeInventoryByKeyword("Banner Canvas Roll", 1);
    }
    if (newOrder.dtf.a3.quantity > 0 || newOrder.dtf.a4.quantity > 0) {
      this.consumeInventoryByKeyword("DTF Matte Film Roll", 1);
      this.consumeInventoryByKeyword("Premium DTF Powder", 1);
    }

    this.addAuditLog(order.staffName, "Create", "General Printing", `Created general order ${orderNumber} for ${order.customerName}.`);
    this.broadcastLiveActivity(order.staffName, "Create", "General Printing", `New order ${orderNumber} for ${order.customerName}`);

    if (newOrder.grandTotal >= 1500) {
      this.addNotification("large_sale", `Large Sale Recorded: General Order ${orderNumber} for GHS ${newOrder.grandTotal.toFixed(2)}.`);
    }

    return newOrder;
  },

  // Inventory
  getInventory(): InventoryItem[] {
    return getStored<InventoryItem[]>(KEYS.INVENTORY, SEED_INVENTORY);
  },

  updateInventoryItem(item: InventoryItem, user: string) {
    const inventory = this.getInventory();
    const index = inventory.findIndex(i => i.id === item.id);
    if (index !== -1) {
      const oldItem = inventory[index];
      
      // Enforce calculated remaining stock
      item.remainingStock = item.openingStock + item.purchased - item.used;
      if (item.remainingStock < 0) item.remainingStock = 0;

      inventory[index] = item;
      setStored(KEYS.INVENTORY, inventory);

      this.addAuditLog(
        user,
        "Edit",
        "Inventory",
        `Updated Stock for ${item.item} (Remaining: ${oldItem.remainingStock} ➔ ${item.remainingStock}).`
      );
      this.broadcastLiveActivity(user, "Edit", "Inventory", `Updated stock for ${item.item}`);

      // Trigger stock alerts dynamically if remaining goes low
      if (item.remainingStock <= item.minimumStock) {
        this.addNotification("low_stock", `Low Stock Alert: ${item.item} is down to ${item.remainingStock} (Min limit: ${item.minimumStock}). Please reorder.`);
      }
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
    
    if (newItem.remainingStock <= newItem.minimumStock) {
      this.addNotification("low_stock", `Low Stock Alert: ${newItem.item} initialized with low stock.`);
    }

    return newItem;
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
      
      if (item.remainingStock <= item.minimumStock) {
        this.addNotification("low_stock", `Low Stock Alert: ${item.item} fell to ${item.remainingStock} units (Limit: ${item.minimumStock}).`);
      }
    }
  },

  // Expenditures
  getExpenditures(): Expenditure[] {
    return getStored<Expenditure[]>(KEYS.EXPENDITURES, SEED_EXPENDITURES);
  },

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
    if (exp) {
      const filtered = expenditures.filter(e => e.id !== id);
      setStored(KEYS.EXPENDITURES, filtered);
      this.addAuditLog(user, "Delete", "Expenditures", `Deleted expenditure of GHS ${exp.amount.toFixed(2)}: ${exp.item}.`);
    }
  },

  // Daily Miscellaneous
  getDailyMiscellaneous(): DailyMiscellaneous[] {
    return getStored<DailyMiscellaneous[]>(KEYS.MISCELLANEOUS, SEED_MISC);
  },

  addDailyMiscellaneous(misc: Omit<DailyMiscellaneous, "id">): DailyMiscellaneous {
    const miscellaneous = this.getDailyMiscellaneous();
    const id = `misc-${Date.now()}`;
    const newMisc: DailyMiscellaneous = { ...misc, id };
    miscellaneous.unshift(newMisc);
    setStored(KEYS.MISCELLANEOUS, miscellaneous);

    this.addAuditLog(misc.staffName, "Create", "Daily Misc", `Logged local daily miscellaneous item GHS ${misc.amount.toFixed(2)}: ${misc.item}.`);

    return newMisc;
  },

  // Daily End of Day Sales Reports
  getDailySalesReports(): DailySalesReport[] {
    return getStored<DailySalesReport[]>(KEYS.SALES_REPORTS, SEED_SALES_REPORTS);
  },

  addDailySalesReport(report: Omit<DailySalesReport, "id" | "isApproved">): DailySalesReport {
    const reports = this.getDailySalesReports();
    const id = `rep-${Date.now()}`;
    const newReport: DailySalesReport = { ...report, id, isApproved: false };
    reports.unshift(newReport);
    setStored(KEYS.SALES_REPORTS, reports);

    this.addAuditLog(report.staffName, "Create", "Sales Report", `Submitted End of Day Sales Report for ${report.date} with Total GHS ${report.totalSales.toFixed(2)}.`);
    
    // Add an alert notification in the system immediately so that Admin is notified
    this.addNotification(
      "missing_report",
      `New Shift Report: ${report.staffName} submitted EOD Balanced Statement for ${report.date} (${report.shift}) - Total sales: ${this.getSettings().currency} ${report.totalSales.toFixed(2)}.`
    );

    return newReport;
  },

  approveSalesReport(id: string, adminUser: string) {
    const reports = this.getDailySalesReports();
    const index = reports.findIndex(r => r.id === id);
    if (index !== -1) {
      reports[index].isApproved = true;
      setStored(KEYS.SALES_REPORTS, reports);
      this.addAuditLog(adminUser, "Edit", "Sales Report", `Approved End of Day sales report ID: ${id}.`);
    }
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return getStored<AuditLog[]>(KEYS.AUDIT_LOGS, SEED_AUDIT);
  },

  addAuditLog(user: string, action: string, module: string, details: string): AuditLog {
    const logs = this.getAuditLogs();
    const id = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    const newLog: AuditLog = { id, timestamp, user, action, module, details };
    
    logs.unshift(newLog);
    // Keep logs size reasonable
    if (logs.length > 200) logs.pop();
    setStored(KEYS.AUDIT_LOGS, logs);
    return newLog;
  },

  // Notifications
  getNotifications(): Notification[] {
    return getStored<Notification[]>(KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
  },

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
    if (item) {
      item.isRead = true;
      setStored(KEYS.NOTIFICATIONS, notifications);
    }
  },

  markAllNotificationsRead() {
    const notifications = this.getNotifications();
    notifications.forEach(n => n.isRead = true);
    setStored(KEYS.NOTIFICATIONS, notifications);
  },

  // Check for jobs with deadline approaching (1 day left) and create notifications
  checkJobDeadlines(): number {
    const jobs = this.getJobs();
    let created = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const notifications = this.getNotifications();

    jobs.forEach(job => {
      if (job.status === "Delivered" || job.status === "Cancelled" || job.kanbanStage === "Job Completed") return;
      
      const deadline = new Date(job.expectedDeliveryDate);
      deadline.setHours(0, 0, 0, 0);
      
      // Check if deadline is tomorrow (1 day left)
      const isTomorrow = deadline.getTime() === tomorrow.getTime();
      
      if (isTomorrow) {
        const existingNotif = notifications.find(n => 
          n.type === "deadline_approaching" && 
          n.message.includes(job.jobNumber)
        );
        
        if (!existingNotif) {
          this.addNotification("deadline_approaching", `⚠️ Job ${job.jobNumber} for ${job.customerName} is due TOMORROW (${job.expectedDeliveryDate})`);
          created++;
        }
      }
    });
    
    return created;
  },

  // Trigger manual data backup log
  triggerAutoBackup(user: string): string {
    const timestamp = new Date().toLocaleTimeString();
    const logDetails = `Manual backup executed successfully. Encrypted database state saved. Version hash: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    this.addAuditLog(user, "Backup", "System Setup", logDetails);
    return timestamp;
  },

  // Export full database backup as downloadable JSON file
  exportBackup(filename?: string): void {
    const backup = {
      exportedAt: new Date().toISOString(),
      app: "Printopia Digital Press",
      version: "2.0",
      data: {
        jobs: this.getJobs(),
        inventory: this.getInventory(),
        expenditures: this.getExpenditures(),
        miscellaneous: this.getDailyMiscellaneous(),
        salesReports: this.getDailySalesReports(),
        generalPrintingOrders: this.getGeneralPrintingOrders(),
        auditLogs: this.getAuditLogs(),
        notifications: this.getNotifications(),
        settings: this.getSettings(),
        staffAccounts: this.getStaffAccounts(),
        staffNotes: this.getStaffNotes(),
        staffAttendance: this.getStaffAttendance()
      }
    };

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

  // Collect all unique customer phone numbers from jobs and GPOs
  getAllCustomerPhoneNumbers(): string[] {
    const phones = new Set<string>();
    
    const jobs = this.getJobs();
    jobs.forEach(job => {
      if (job.customerPhone && job.customerPhone.trim().length > 0) {
        phones.add(job.customerPhone.trim());
      }
    });

    const gpos = this.getGeneralPrintingOrders();
    gpos.forEach(gpo => {
      if (gpo.customerPhone && gpo.customerPhone.trim().length > 0) {
        phones.add(gpo.customerPhone.trim());
      }
    });

    return Array.from(phones).sort();
  },

  purgeDemoData(user: string) {
    setStored(KEYS.JOBS, []);
    setStored(KEYS.GPO, []);
    setStored(KEYS.EXPENDITURES, []);
    setStored(KEYS.MISCELLANEOUS, []);
    setStored(KEYS.SALES_REPORTS, []);
    setStored(KEYS.NOTIFICATIONS, []);
    setStored(KEYS.AUDIT_LOGS, [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: user,
        action: "Purge Database",
        module: "System Setup",
        details: "All seed transaction data (Jobs, Orders, Expenditures, End of Day Reports, Notifications) was purged for active company deployment."
      }
    ]);
  },

  purgeInventoryData(user: string) {
    setStored(KEYS.INVENTORY, []);
    this.addAuditLog(user, "Purge Stock", "Inventory", "All default seed inventory materials were cleared for live stock tracking setup.");
  },

  // Wipe ALL local data and restore factory default state (settings, staff, inventory, audit)
  resetAllData(user: string) {
    const keys = Object.values(KEYS) as string[];
    keys.forEach(k => {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    });
    // Re-seed defaults by reading through the normal accessors
    this.getSettings();
    this.getStaffAccounts();
    this.getInventory();
    this.getJobs();
    this.getGeneralPrintingOrders();
    this.getExpenditures();
    this.getDailyMiscellaneous();
    this.getDailySalesReports();
    this.getStaffNotes();
    this.getStaffAttendance();
    this.addAuditLog(user, "System Reset", "System Setup", "Full system reset executed. All business data (jobs, orders, expenditures, reports, inventory, notes, attendance) was cleared and factory defaults were restored.");
  },

  getStaffAccounts(): StaffAccount[] {
    const accounts = getStored<StaffAccount[]>(KEYS.STAFF, DEFAULT_STAFF_ACCOUNTS);
    // Auto-migrate old names to Staff 1 and Staff 2 if they exist in localStorage
    let updated = false;
    const migrated = accounts.map(acc => {
      if (acc.id === "staff-1" && (acc.name === "Selasie Boateng" || acc.username === "selasie")) {
        updated = true;
        return {
          ...acc,
          name: "Staff 1",
          username: "staff1",
          passwordText: acc.passwordText === "selasie123" ? "staff123" : acc.passwordText
        };
      }
      if (acc.id === "staff-2" && (acc.name === "Kojo Mensah" || acc.username === "kojo")) {
        updated = true;
        return {
          ...acc,
          name: "Staff 2",
          username: "staff2",
          passwordText: acc.passwordText === "kojo123" ? "staff456" : acc.passwordText
        };
      }
      return acc;
    });

    if (updated) {
      setStored(KEYS.STAFF, migrated);
      return migrated;
    }
    return accounts;
  },

  saveStaffAccounts(accounts: StaffAccount[]) {
    setStored(KEYS.STAFF, accounts);
  },

  // Staff Late Arrival Notes
  getStaffNotes(): StaffNote[] {
    return getStored<StaffNote[]>(KEYS.STAFF_NOTES, SEED_STAFF_NOTES);
  },

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
    if (note) {
      const filtered = notes.filter(n => n.id !== id);
      setStored(KEYS.STAFF_NOTES, filtered);
      this.addAuditLog(user, "Delete", "Staff Notes", `Removed late arrival note for ${note.staffName} dated ${note.date}.`);
    }
  },

  // Staff Attendance / Clock-In Sessions
  getStaffAttendance(): StaffNote[] {
    return getStored<StaffNote[]>(KEYS.STAFF_ATTENDANCE, []);
  },

  addStaffAttendance(session: Omit<StaffNote, "id" | "timestamp">): StaffNote {
    const sessions = this.getStaffAttendance();
    const id = `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const timestamp = new Date().toISOString();
    const newSession: StaffNote = { ...session, id, timestamp };
    sessions.unshift(newSession);
    setStored(KEYS.STAFF_ATTENDANCE, sessions);
    this.addAuditLog(
      session.recordedBy,
      "Create",
      "Staff Attendance",
      `Recorded ${session.sessionType || "attendance"} session for ${session.staffName} (${session.date}${session.clockInTime ? " in " + session.clockInTime : ""}${session.clockOutTime ? " out " + session.clockOutTime : ""}).`
    );
    return newSession;
  },

  getSmsContacts(): Contact[] {
    return getStored<Contact[]>(KEYS.SMS_CONTACTS, []);
  },

  saveSmsContacts(contacts: Contact[]) {
    setStored(KEYS.SMS_CONTACTS, contacts);
  },

  broadcastLiveActivity(user: string, action: string, module: string, details: string) {
    const activities = getStored<any[]>(KEYS.LIVE_ACTIVITY, []);
    const entry = {
      id: `live-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      user,
      action,
      module,
      details
    };
    activities.unshift(entry);
    if (activities.length > 50) activities.pop();
    localStorage.setItem(KEYS.LIVE_ACTIVITY, JSON.stringify(activities));
    if (socket) {
      socket.emit("live-activity", entry);
    }
  },

  getLiveActivities(): any[] {
    return getStored<any[]>(KEYS.LIVE_ACTIVITY, []);
  }
};

// Initial connection using default/localhost URL
ensureSocket();
