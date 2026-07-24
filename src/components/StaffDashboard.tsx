/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  Briefcase,
  CheckCircle,
  Clock,
  CircleDollarSign,
  PlusCircle,
  FileCheck2,
  Receipt,
  FileText,
  Trash2,
  ChevronRight,
  ClipboardList,
  AlertTriangle,
  UploadCloud,
  ChevronLeft,
  Boxes,
  Layers,
  Search,
  History,
  Check,
  Download,
  Plus,
  Minus,
  X,
  MapPin,
  Trophy,
  Cloud,
  Trees,
  GraduationCap,
  BookOpen,
  Printer,
  ClipboardPlus,
  Factory,
  Wallet,
  PackageSearch,
  ListChecks,
  RefreshCw,
  Bell,
  Pencil,
  ShieldCheck
} from "lucide-react";
import { DBStore } from "../dbStore";
import { Job, GeneralPrintingOrder, DailyMiscellaneous, CompanySettings, KanbanStage, JobStatus, InventoryItem, StaffNote, DeletedJob } from "../types";

interface StaffDashboardProps {
  settings: CompanySettings;
  onOpenDocument: (type: "invoice" | "receipt" | "waybill" | "delivery_receipt", data: any) => void;
  onRefreshGlobalState: () => void;
  activeUserName?: string;
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
  refreshTrigger?: number;
}

// Small panel showing jobs deleted today (for the End-of-Day report).
function DeletedJobsPanel({ userName, currency, now }: { userName?: string; currency: string; now: Date }) {
  const todayStr = now.toISOString().split("T")[0];
  const [list, setList] = useState<DeletedJob[]>(() => DBStore.getDeletedJobs());
  const [justDeleted, setJustDeleted] = useState(false);

  useEffect(() => {
    const handler = () => { setList(DBStore.getDeletedJobs()); setJustDeleted(true); setTimeout(() => setJustDeleted(false), 500); };
    window.addEventListener("printopia-sync", handler);
    return () => window.removeEventListener("printopia-sync", handler);
  }, []);

  const todays = list.filter(d => d.timestamp.split("T")[0] === todayStr);
  const totalRefund = todays.reduce((s, d) => s + (d.refundAmount || 0), 0);

  return (
    <div className="rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-gray-600 dark:text-zinc-300 uppercase tracking-wider">
          {todays.length} job(s) deleted today
        </span>
        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
          Total Refunded: {currency} {totalRefund.toFixed(2)}
        </span>
      </div>
      {todays.length === 0 ? (
        <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">No jobs were deleted today.</p>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {todays.map(d => (
            <div key={d.id} className={`flex justify-between items-center text-[11px] bg-white/40 dark:bg-zinc-900/30 border border-white/5 rounded-lg px-3 py-1.5 ${justDeleted ? "ring-1 ring-rose-400/40" : ""}`}>
              <span className="font-bold text-gray-800 dark:text-zinc-200">
                {d.jobNumber} · {d.customerName} <span className="text-gray-400 font-normal">— deleted by {d.deletedBy}</span>
              </span>
              <span className="font-black text-rose-600 dark:text-rose-400">
                Refund {currency} {(d.refundAmount || 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[9px] text-gray-400 dark:text-zinc-500 font-medium">
        These deletions are logged and will appear in the Admin's End-of-Day & Monthly reports.
      </p>
    </div>
  );
}

export default function StaffDashboard({
  settings,
  onOpenDocument,
  onRefreshGlobalState,
  activeUserName = "Staff 1",
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  refreshTrigger = 0
}: StaffDashboardProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<"overview" | "gen-print" | "job-intake" | "kanban" | "misc" | "shift-report" | "inventory" | "learning">("overview");

  const activeTab = (propActiveTab as any) || internalActiveTab;
  const setActiveTab = propSetActiveTab || setInternalActiveTab;

  // New state for Ledger Back and Forth Reconciliations
  const [ledgerPeriod, setLedgerPeriod] = useState<"day" | "week" | "month">("week");
  const [ledgerOffset, setLedgerOffset] = useState<number>(0);

  // Staff Attendance / Clock In-Out State
  const staffAttendanceRecords = useMemo(() => DBStore.getStaffAttendance(), [refreshTrigger]);
  const currentClockIn = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const sessions = staffAttendanceRecords.filter(
      s => s.staffName === activeUserName && s.date === today
    );
    const clockIn = sessions.find(s => s.sessionType === "Clock In");
    const clockOut = sessions.find(s => s.sessionType === "Clock Out");
    if (clockOut) return null;
    return clockIn?.clockInTime || null;
  }, [staffAttendanceRecords, activeUserName, refreshTrigger]);

  const handleClockIn = () => {
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    DBStore.addStaffAttendance({
      date: new Date().toISOString().split("T")[0],
      staffId: activeUserName,
      staffName: activeUserName,
      note: "Clocked in by staff",
      recordedBy: activeUserName,
      sessionType: "Clock In",
      clockInTime: time
    });
    DBStore.addNotification(
      "clock_in",
      `🕐 Clock In: ${activeUserName} clocked in at ${time}.`
    );
    onRefreshGlobalState();
  };

  const handleClockOut = () => {
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    DBStore.addStaffAttendance({
      date: new Date().toISOString().split("T")[0],
      staffId: activeUserName,
      staffName: activeUserName,
      note: "Clocked out by staff",
      recordedBy: activeUserName,
      sessionType: "Clock Out",
      clockOutTime: time
    });
    DBStore.addNotification(
      "clock_out",
      `🕕 Clock Out: ${activeUserName} clocked out at ${time}.`
    );
    onRefreshGlobalState();
  };

  // Keyboard and draft input tracking
  React.useEffect(() => {
    const inputSessions = new Map<HTMLInputElement | HTMLTextAreaElement, {
      id: string;
      label: string;
      initialValue: string;
      maxTypedValue: string;
      currentValue: string;
      timer: any;
    }>();

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target || (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA")) return;
      if (target.type === "password" || target.type === "checkbox" || target.type === "radio") return;

      let label = target.placeholder || target.name || target.id || "";
      if (!label) {
        const parent = target.parentElement;
        if (parent) {
          const labelEl = parent.querySelector("label");
          if (labelEl) {
            label = labelEl.textContent || "";
          } else {
            const prevEl = target.previousElementSibling;
            if (prevEl && prevEl.tagName === "LABEL") {
              label = prevEl.textContent || "";
            }
          }
        }
      }
      label = label.replace(/[:*]/g, "").trim() || "unlabeled input";

      inputSessions.set(target, {
        id: Math.random().toString(36).substr(2, 5),
        label,
        initialValue: target.value,
        maxTypedValue: target.value,
        currentValue: target.value,
        timer: null
      });
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target) return;
      const session = inputSessions.get(target);
      if (!session) return;

      const val = target.value;
      session.currentValue = val;
      if (val.length > session.maxTypedValue.length) {
        session.maxTypedValue = val;
      }

      if (session.timer) clearTimeout(session.timer);
      session.timer = setTimeout(() => {
        if (val === "" && session.maxTypedValue !== "" && session.initialValue !== "") {
          DBStore.addAuditLog(
            activeUserName,
            "Typing Activity",
            "Staff Activity",
            `Staff cleared field "${session.label}" (had typed "${session.maxTypedValue}" starting from "${session.initialValue}")`
          );
          session.initialValue = "";
          session.maxTypedValue = "";
          onRefreshGlobalState();
        } else if (val === "" && session.maxTypedValue !== "" && session.initialValue === "") {
          DBStore.addAuditLog(
            activeUserName,
            "Typing Activity",
            "Staff Activity",
            `Staff typed "${session.maxTypedValue}" in field "${session.label}" and then deleted it.`
          );
          session.maxTypedValue = "";
          onRefreshGlobalState();
        } else if (val !== session.initialValue && val.length > 3) {
          DBStore.addAuditLog(
            activeUserName,
            "Typing Activity",
            "Staff Activity",
            `Staff drafting field "${session.label}" value: "${val}"`
          );
          session.initialValue = val;
          onRefreshGlobalState();
        }
      }, 4000);
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target) return;
      const session = inputSessions.get(target);
      if (!session) return;

      if (session.timer) clearTimeout(session.timer);

      const finalVal = target.value;
      if (finalVal !== session.initialValue) {
        if (finalVal === "") {
          DBStore.addAuditLog(
            activeUserName,
            "Clear Input",
            "Staff Activity",
            `Staff cleared field "${session.label}" (had value "${session.initialValue || session.maxTypedValue}")`
          );
        } else {
          DBStore.addAuditLog(
            activeUserName,
            "Modify Input",
            "Staff Activity",
            `Staff input field "${session.label}" changed from "${session.initialValue}" to "${finalVal}"`
          );
        }
        onRefreshGlobalState();
      }
      inputSessions.delete(target);
    };

    document.addEventListener("focus", handleFocus, true);
    document.addEventListener("input", handleInput, true);
    document.addEventListener("blur", handleBlur, true);

    return () => {
      document.removeEventListener("focus", handleFocus, true);
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("blur", handleBlur, true);
      for (const s of inputSessions.values()) {
        if (s.timer) clearTimeout(s.timer);
      }
    };
  }, [activeUserName]);

  // Fetch updated records from LocalStore reactively
  const jobs = useMemo(() => DBStore.getJobs(), [refreshTrigger]);
  const orders = useMemo(() => DBStore.getGeneralPrintingOrders(), [refreshTrigger]);
  const miscs = useMemo(() => DBStore.getDailyMiscellaneous(), [refreshTrigger]);
  const reports = useMemo(() => DBStore.getDailySalesReports(), [refreshTrigger]);
  const inventoryList = useMemo(() => DBStore.getInventory(), [refreshTrigger]);

  // Combine and format GPOs, Job payments, and Expenditures
  const unifiedTransactions = useMemo(() => {
    const txs: any[] = [];

    orders.forEach(o => {
      txs.push({
        id: o.id,
        date: o.date,
        timestamp: `${o.date} ${o.time || "12:00"}`,
        ref: o.orderNumber,
        customer: o.customerName,
        amount: o.grandTotal,
        paymentMethod: o.paymentMethod,
        staff: o.staffName || "Staff",
        type: "General Order",
        isExpense: false
      });
    });

    jobs.forEach(j => {
      if (j.paymentHistory) {
        j.paymentHistory.forEach(p => {
          const payDate = p.timestamp ? p.timestamp.split(" ")[0] : j.date;
          txs.push({
            id: p.id,
            date: payDate,
            timestamp: p.timestamp || `${j.date} 12:00`,
            ref: `${j.jobNumber} (Payment)`,
            customer: j.customerName,
            amount: p.amountPaid,
            paymentMethod: p.paymentMethod,
            staff: p.receivedBy || j.staffInitials || "Staff",
            type: "Job Payment",
            isExpense: false
          });
        });
      }
    });

    miscs.forEach(m => {
      txs.push({
        id: m.id,
        date: m.date,
        timestamp: `${m.date} 12:00`,
        ref: `Misc Expense: ${m.item}`,
        customer: `Purpose: ${m.purpose}`,
        amount: m.amount,
        paymentMethod: "Cash Outflow",
        staff: m.staffName,
        type: "Staff Expense",
        isExpense: true
      });
    });

    return txs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [orders, jobs, miscs]);

  // Range and filter calculation for Ledger Navigation
  const ledgerRange = useMemo(() => {
    const d = new Date();
    
    if (ledgerPeriod === "day") {
      d.setDate(d.getDate() + ledgerOffset);
      const dayStr = d.toISOString().split("T")[0];
      
      const label = d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      
      const txs = unifiedTransactions.filter(t => t.date === dayStr);
      return { label, txs };
    } 
    else if (ledgerPeriod === "week") {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      monday.setDate(monday.getDate() + (ledgerOffset * 7));
      monday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      
      const monStr = monday.toISOString().split("T")[0];
      const sunStr = sunday.toISOString().split("T")[0];
      
      const label = `Week of ${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      
      const txs = unifiedTransactions.filter(t => t.date >= monStr && t.date <= sunStr);
      return { label, txs };
    } 
    else {
      // Monthly view
      const monthIndex = d.getMonth() + ledgerOffset;
      const targetMonthDate = new Date(d.getFullYear(), monthIndex, 1);
      const y = targetMonthDate.getFullYear();
      const m = targetMonthDate.getMonth();
      
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      
      const firstStr = firstDay.toISOString().split("T")[0];
      const lastStr = lastDay.toISOString().split("T")[0];
      
      const label = targetMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      
      const txs = unifiedTransactions.filter(t => t.date >= firstStr && t.date <= lastStr);
      return { label, txs };
    }
  }, [unifiedTransactions, ledgerPeriod, ledgerOffset]);

  // Aggregate stats of selected range
  const ledgerStats = useMemo(() => {
    let revenue = 0;
    let expenses = 0;
    let cash = 0;
    let momo = 0;
    let bank = 0;
    let pos = 0;

    ledgerRange.txs.forEach(t => {
      if (t.isExpense) {
        expenses += t.amount;
      } else {
        revenue += t.amount;
        const method = t.paymentMethod.toLowerCase();
        if (method.includes("cash")) cash += t.amount;
        else if (method.includes("momo") || method.includes("mobile")) momo += t.amount;
        else if (method.includes("bank") || method.includes("transfer")) bank += t.amount;
        else if (method.includes("pos") || method.includes("card")) pos += t.amount;
      }
    });

    return { revenue, expenses, cash, momo, bank, pos };
  }, [ledgerRange]);

  // Currency
  const currency = settings.currency || "GHS";

  // Standalone Styled Excel Export Helpers
  const handleExportJobs = () => {
    const today = new Date().toISOString().split("T")[0];
    const currentJobs = DBStore.getJobs();
    DBStore.addAuditLog(activeUserName, "Export", "Jobs Download", `Exported active jobs ledger spreadsheet.`);

    let excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #6366F1; color: white; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; border: 1px solid #94A3B8; padding: 8px; text-align: left; }
          td { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; border: 1px solid #CBD5E1; padding: 6px; text-align: left; }
          .company-name { font-size: 16pt; font-weight: bold; color: #1E1B4B; padding: 10px 0; }
          .bold { font-weight: bold; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="13" class="company-name"><b>PRINTOPIA DIGITAL PRESS</b></td></tr>
          <tr><td colspan="13" style="font-size: 12pt; color: #3730A3;"><b>CUSTOM CONTRACT JOBS LEDGER</b></td></tr>
          <tr><td colspan="13" style="font-size: 9pt; color: #64748b;">Generated On: ${new Date().toLocaleString()} | Currency: ${currency}</td></tr>
          <tr><td></td></tr>
        </table>
        <table>
          <thead>
            <tr>
              <th>Job Number</th>
              <th>Date Created</th>
              <th>Customer Name</th>
              <th>Customer Phone</th>
              <th>Job Description</th>
              <th class="right">Total Amount (${currency})</th>
              <th class="right">Deposit Paid (${currency})</th>
              <th class="right">Balance Owed (${currency})</th>
              <th>Expected Delivery</th>
              <th>Status</th>
              <th>Kanban Stage</th>
              <th>Priority</th>
              <th>Assigned Staff</th>
            </tr>
          </thead>
          <tbody>
    `;

    currentJobs.forEach(j => {
      excelHtml += `
        <tr>
          <td class="bold">${j.jobNumber}</td>
          <td>${j.date}</td>
          <td class="bold">${j.customerName}</td>
          <td>${j.customerPhone || "N/A"}</td>
          <td>${j.jobDescription}</td>
          <td class="right bold">${j.totalAmount.toFixed(2)}</td>
          <td class="right">${j.depositPaid.toFixed(2)}</td>
          <td class="right bold" style="color: ${j.balance > 0 ? '#B90E0E' : 'black'};">${j.balance.toFixed(2)}</td>
          <td>${j.expectedDeliveryDate || "Immediate"}</td>
          <td class="bold">${j.status}</td>
          <td>${j.kanbanStage}</td>
          <td>${j.priority}</td>
          <td>${j.assignedStaff || "Unassigned"}</td>
        </tr>
      `;
    });

    excelHtml += `</tbody></table></body></html>`;

    const blob = new Blob(["\uFEFF" + excelHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Printopia_Staff_Jobs_${today}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportInventory = () => {
    const today = new Date().toISOString().split("T")[0];
    const currentInventory = DBStore.getInventory();
    DBStore.addAuditLog(activeUserName, "Export", "Inventory Download", `Exported warehouse stock ledger spreadsheet.`);

    let excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #6366F1; color: white; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; border: 1px solid #94A3B8; padding: 8px; text-align: left; }
          td { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; border: 1px solid #CBD5E1; padding: 6px; text-align: left; }
          .company-name { font-size: 16pt; font-weight: bold; color: #1E1B4B; padding: 10px 0; }
          .bold { font-weight: bold; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="13" class="company-name"><b>PRINTOPIA DIGITAL PRESS</b></td></tr>
          <tr><td colspan="13" style="font-size: 12pt; color: #3730A3;"><b>ACTIVE SKU WAREHOUSE CATALOG</b></td></tr>
          <tr><td colspan="13" style="font-size: 9pt; color: #64748b;">Generated On: ${new Date().toLocaleString()} | Currency: ${currency}</td></tr>
          <tr><td></td></tr>
        </table>
        <table>
          <thead>
            <tr>
              <th>Barcode</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Supplier</th>
              <th class="right">Opening Stock</th>
              <th class="right">Purchased</th>
              <th class="right">Used</th>
              <th class="right">Remaining Stock</th>
              <th class="right">Min Level</th>
              <th class="right">Unit Cost (${currency})</th>
              <th class="right">Selling Price (${currency})</th>
              <th class="right">Asset Value (Cost)</th>
              <th class="right">Retail Value</th>
            </tr>
          </thead>
          <tbody>
    `;

    currentInventory.forEach(i => {
      const totalCostValue = i.remainingStock * i.unitCost;
      const totalRetailValue = i.remainingStock * i.sellingPrice;
      excelHtml += `
        <tr>
          <td>'${i.barcode}</td>
          <td class="bold">${i.item}</td>
          <td>${i.category}</td>
          <td>${i.supplier}</td>
          <td class="right">${i.openingStock}</td>
          <td class="right">${i.purchased}</td>
          <td class="right">${i.used}</td>
          <td class="right" style="background-color: ${i.remainingStock <= i.minimumStock ? '#FFE4E4' : 'transparent'}; color: ${i.remainingStock <= i.minimumStock ? '#B90E0E' : 'black'}; font-weight: ${i.remainingStock <= i.minimumStock ? 'bold' : 'normal'};">${i.remainingStock}</td>
          <td class="right">${i.minimumStock}</td>
          <td class="right">${i.unitCost.toFixed(2)}</td>
          <td class="right">${i.sellingPrice.toFixed(2)}</td>
          <td class="right bold">${totalCostValue.toFixed(2)}</td>
          <td class="right bold">${totalRetailValue.toFixed(2)}</td>
        </tr>
      `;
    });

    excelHtml += `</tbody></table></body></html>`;

    const blob = new Blob(["\uFEFF" + excelHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Printopia_Staff_Inventory_${today}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ----------------------------------------------------
  // STATE FOR MODULE 6: WAREHOUSE & SKU INVENTORY
  // ----------------------------------------------------
  const [invSearch, setInvSearch] = useState("");
  const [invSelId, setInvSelId] = useState("");
  const [invAction, setInvAction] = useState<"restock" | "consume" | "adjust">("restock");
  const [invQty, setInvQty] = useState(0);
  const [invCostPrice, setInvCostPrice] = useState(0);
  const [invSalePrice, setInvSalePrice] = useState(0);
  const [invSupplierName, setInvSupplierName] = useState("");
  const [invRemark, setInvRemark] = useState("");

  // Edit inventory item state
  const [editInvId, setEditInvId] = useState<string | null>(null);
  const [editInvItem, setEditInvItem] = useState<InventoryItem | null>(null);

  // Catalog Sku fields
  const [newSkuName, setNewSkuName] = useState("");
  const [newSkuCat, setNewSkuCat] = useState<InventoryItem["category"]>("Printing Materials");
  const [newSkuOpenStock, setNewSkuOpenStock] = useState(0);
  const [newSkuMinStock, setNewSkuMinStock] = useState(0);
  const [newSkuCost, setNewSkuCost] = useState(0);
  const [newSkuSell, setNewSkuSell] = useState(0);
  const [newSkuSupplier, setNewSkuSupplier] = useState("");

  // ----------------------------------------------------
  // DASHBOARD METRIC CALCULATIONS
  // ----------------------------------------------------
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    // Today's General Orders
    const todayOrders = orders.filter(o => o.date === todayStr);
    const todayOrdersTotal = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);

    // Today's Job Deposits
    const todayJobs = jobs.filter(j => j.date === todayStr);
    const todayJobDeposits = todayJobs.reduce((sum, j) => sum + j.depositPaid, 0);

    const todaySales = todayOrdersTotal + todayJobDeposits;

    const jobsInProgress = jobs.filter(j => j.status !== "Delivered" && j.status !== "Cancelled").length;
    const completedJobs = jobs.filter(j => j.status === "Ready" || j.status === "Delivered").length;
    
    // Pending Collections are jobs ready but not yet delivered
    const pendingCollections = jobs.filter(j => j.status === "Ready").length;

    // Outstanding balances
    const outstandingBalances = jobs.reduce((sum, j) => sum + j.balance, 0);

    // Today's Miscellaneous
    const todayMisc = miscs.filter(m => m.date === todayStr).reduce((sum, m) => sum + m.amount, 0);

    return {
      todaySales,
      jobsInProgress,
      completedJobs,
      pendingCollections,
      outstandingBalances,
      todayMisc
    };
  }, [jobs, orders, miscs]);


  // ----------------------------------------------------
  // STATE FOR MODULE 1: GENERAL PRINTING FORM
  // ----------------------------------------------------
  const [gpCustomer, setGpCustomer] = useState("");
  const [gpPhone, setGpPhone] = useState("");
  const [gpPaymentMethod, setGpPaymentMethod] = useState<"Mobile Money" | "Cash" | "Bank Transfer" | "POS">("Cash");
  const [gpDiscount, setGpDiscount] = useState(0);

  // Photocopy — supports multiple line items in one category (e.g. 3 B&W + 2 Colored)
  const [gpPhotoLines, setGpPhotoLines] = useState<Array<{ id: string; type: "Colored" | "Black & White" | "Custom"; quantity: number; unitPrice: number }>>([
    { id: `ph-${Date.now()}-bw`, type: "Black & White", quantity: 0, unitPrice: 0.50 },
    { id: `ph-${Date.now()}-c`, type: "Colored", quantity: 0, unitPrice: 2.00 }
  ]);

  // Printing — supports multiple line items in one category
  const [gpPrintLines, setGpPrintLines] = useState<Array<{ id: string; type: "Colored" | "Black & White" | "Custom"; quantity: number; unitPrice: number }>>([
    { id: `pr-${Date.now()}-bw`, type: "Black & White", quantity: 0, unitPrice: 1.00 },
    { id: `pr-${Date.now()}-c`, type: "Colored", quantity: 0, unitPrice: 3.00 }
  ]);

  // Frames
  const [gpFrameSize, setGpFrameSize] = useState("A4");
  const [gpFrameCustomSize, setGpFrameCustomSize] = useState("");
  const [gpFrameQty, setGpFrameQty] = useState(0);
  const [gpFramePrice, setGpFramePrice] = useState(45.00);

  // T-Shirts
  const [gpShirtCat, setGpShirtCat] = useState<"Cotton" | "Lacoste" | "Eyelet" | "">("");
  const [gpShirtQty, setGpShirtQty] = useState(0);
  const [gpShirtPrice, setGpShirtPrice] = useState(55.00);

  // Large Format
  const [gpStickSize, setGpStickSize] = useState("");
  const [gpStickQty, setGpStickQty] = useState(0);
  const [gpStickPrice, setGpStickPrice] = useState(15.00);
  const [gpStickAmount, setGpStickAmount] = useState(0);
  const [gpBannerSize, setGpBannerSize] = useState("");
  const [gpBannerQty, setGpBannerQty] = useState(0);
  const [gpBannerPrice, setGpBannerPrice] = useState(25.00);
  const [gpBannerAmount, setGpBannerAmount] = useState(0);

  // DTF
  const [gpDtfA3Qty, setGpDtfA3Qty] = useState(0);
  const [gpDtfA3Price, setGpDtfA3Price] = useState(35.00);
  const [gpDtfA4Qty, setGpDtfA4Qty] = useState(0);
  const [gpDtfA4Price, setGpDtfA4Price] = useState(20.00);

  // Special Services
  const [gpSpecialDesc, setGpSpecialDesc] = useState("");
  const [gpSpecialQty, setGpSpecialQty] = useState(0);
  const [gpSpecialAmount, setGpSpecialAmount] = useState(0);
  const [gpSpecialList, setGpSpecialList] = useState<Array<{ description: string; quantity: number; amount: number }>>([]);

  const addGpSpecialService = () => {
    if (!gpSpecialDesc || gpSpecialAmount <= 0) return;
    const newService = {
      description: gpSpecialDesc,
      quantity: gpSpecialQty || 1,
      amount: gpSpecialAmount
    };
    setGpSpecialList([...gpSpecialList, newService]);
    setGpSpecialDesc("");
    setGpSpecialQty(0);
    setGpSpecialAmount(0);
    DBStore.addNotification("service_added", `Service Added: "${newService.description}" (Qty: ${newService.quantity}) - ${currency} ${newService.amount.toFixed(2)}`);
    DBStore.broadcastLiveActivity(activeUserName, "Add", "Special Service", `Added service: ${newService.description}`);
    onRefreshGlobalState();
  };

  const removeGpSpecialService = (idx: number) => {
    setGpSpecialList(gpSpecialList.filter((_, i) => i !== idx));
  };

  // General Printing Calculations
  const gpCalculations = useMemo(() => {
    const photoAmt = gpPhotoLines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
    const printAmt = gpPrintLines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
    const frameAmt = gpFrameQty * gpFramePrice;
    const shirtAmt = gpShirtCat ? gpShirtQty * gpShirtPrice : 0;
    const stickAmt = gpStickAmount > 0 ? gpStickAmount : gpStickQty * gpStickPrice;
    const bannerAmt = gpBannerAmount > 0 ? gpBannerAmount : gpBannerQty * gpBannerPrice;
    const dtfA3Amt = gpDtfA3Qty * gpDtfA3Price;
    const dtfA4Amt = gpDtfA4Qty * gpDtfA4Price;
    const specialAmt = gpSpecialList.reduce((sum, item) => sum + item.amount, 0);

    const subtotal = photoAmt + printAmt + frameAmt + shirtAmt + stickAmt + bannerAmt + dtfA3Amt + dtfA4Amt + specialAmt;
    const taxAmt = subtotal * (settings.vatRate / 100);
    const grandTotal = Math.max(0, subtotal - gpDiscount + taxAmt);

    return {
      photoAmt,
      printAmt,
      frameAmt,
      shirtAmt,
      stickAmt,
      bannerAmt,
      dtfA3Amt,
      dtfA4Amt,
      specialAmt,
      subtotal,
      taxAmt,
      grandTotal
    };
  }, [
    gpPhotoLines, gpPrintLines,
    gpFrameQty, gpFramePrice, gpShirtCat, gpShirtQty, gpShirtPrice,
    gpStickQty, gpStickPrice, gpStickAmount, gpBannerQty, gpBannerPrice, gpBannerAmount,
    gpDtfA3Qty, gpDtfA3Price, gpDtfA4Qty, gpDtfA4Price,
    gpSpecialList, gpDiscount, settings.vatRate
  ]);

  // Receipt prompt after saving general order
  const [showGpReceiptPrompt, setShowGpReceiptPrompt] = useState(false);
  const [gpReceiptType, setGpReceiptType] = useState<"invoice" | "receipt" | "waybill" | "delivery_receipt">("receipt");
  const [pendingGpOrderData, setPendingGpOrderData] = useState<any>(null);

  const handleSaveGeneralOrder = (actionType: "invoice" | "receipt" | "prompt") => {
    if (!gpCustomer.trim()) {
      alert("Please enter customer name.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const timeStr = new Date().toTimeString().split(" ")[0].substring(0, 5);

    const orderData = {
      date: todayStr,
      time: timeStr,
      customerName: gpCustomer,
      customerPhone: gpPhone || "Walk-In",
      photocopy: {
        colored: gpPhotoLines.some(l => l.type === "Colored" && l.quantity > 0),
        blackAndWhite: gpPhotoLines.some(l => l.type === "Black & White" && l.quantity > 0),
        custom: gpPhotoLines.some(l => l.type === "Custom" && l.quantity > 0),
        quantity: gpPhotoLines.reduce((s, l) => s + l.quantity, 0),
        unitPrice: gpPhotoLines.length ? gpPhotoLines[0].unitPrice : 0.50,
        amount: gpCalculations.photoAmt,
        lines: gpPhotoLines.filter(l => l.quantity > 0).map(l => ({ id: l.id, type: l.type, quantity: l.quantity, unitPrice: l.unitPrice }))
      },
      printing: {
        colored: gpPrintLines.some(l => l.type === "Colored" && l.quantity > 0),
        blackAndWhite: gpPrintLines.some(l => l.type === "Black & White" && l.quantity > 0),
        custom: gpPrintLines.some(l => l.type === "Custom" && l.quantity > 0),
        quantity: gpPrintLines.reduce((s, l) => s + l.quantity, 0),
        unitPrice: gpPrintLines.length ? gpPrintLines[0].unitPrice : 1.00,
        amount: gpCalculations.printAmt,
        lines: gpPrintLines.filter(l => l.quantity > 0).map(l => ({ id: l.id, type: l.type, quantity: l.quantity, unitPrice: l.unitPrice }))
      },
      frame: {
        size: gpFrameSize === "Custom / Other" ? gpFrameCustomSize || "Custom Size" : gpFrameSize,
        quantity: gpFrameQty,
        unitPrice: gpFramePrice,
        amount: gpCalculations.frameAmt
      },
      tshirt: {
        category: gpShirtCat,
        quantity: gpShirtQty,
        unitPrice: gpShirtPrice,
        amount: gpCalculations.shirtAmt
      },
      largeFormat: {
        sticker: {
          size: gpStickSize,
          quantity: gpStickQty,
          unitPrice: gpStickPrice,
          amount: gpCalculations.stickAmt
        },
        banner: {
          size: gpBannerSize,
          quantity: gpBannerQty,
          unitPrice: gpBannerPrice,
          amount: gpCalculations.bannerAmt
        }
      },
      dtf: {
        a3: {
          quantity: gpDtfA3Qty,
          unitPrice: gpDtfA3Price,
          amount: gpCalculations.dtfA3Amt
        },
        a4: {
          quantity: gpDtfA4Qty,
          unitPrice: gpDtfA4Price,
          amount: gpCalculations.dtfA4Amt
        }
      },
      specialServices: gpSpecialList,
      subtotal: gpCalculations.subtotal,
      discount: gpDiscount,
      tax: gpCalculations.taxAmt,
      grandTotal: gpCalculations.grandTotal,
      staffName: activeUserName,
      paymentMethod: gpPaymentMethod
    };

    const savedOrder = DBStore.saveGeneralPrintingOrder(orderData);

    DBStore.addAuditLog(
      activeUserName,
      "Create",
      "General Print",
      `Recorded general print order ${savedOrder.orderNumber} for customer ${savedOrder.customerName}. Grand Total: ${settings.currency} ${savedOrder.grandTotal.toFixed(2)} (${savedOrder.paymentMethod}).`
    );

    DBStore.addNotification(
      "service_added",
      `🧾 New Service Order: ${savedOrder.orderNumber} for ${savedOrder.customerName} | ${settings.currency} ${savedOrder.grandTotal.toFixed(2)} | Staff: ${activeUserName}`
    );

    setGpCustomer("");
    setGpPhone("");
    setGpPaymentMethod("Cash");
    setGpDiscount(0);

    setGpPhotoLines([
      { id: `ph-${Date.now()}-bw`, type: "Black & White", quantity: 0, unitPrice: 0.50 },
      { id: `ph-${Date.now()}-c`, type: "Colored", quantity: 0, unitPrice: 2.00 }
    ]);

    setGpPrintLines([
      { id: `pr-${Date.now()}-bw`, type: "Black & White", quantity: 0, unitPrice: 1.00 },
      { id: `pr-${Date.now()}-c`, type: "Colored", quantity: 0, unitPrice: 3.00 }
    ]);

    setGpFrameSize("A4");
    setGpFrameCustomSize("");
    setGpFrameQty(0);

    setGpShirtCat("");
    setGpShirtQty(0);
    setGpShirtPrice(45);

    setGpStickSize("");
    setGpStickQty(0);
    setGpStickAmount(0);

    setGpBannerSize("");
    setGpBannerQty(0);
    setGpBannerAmount(0);

    setGpDtfA3Qty(0);
    setGpDtfA4Qty(0);

    setGpSpecialList([]);

    onRefreshGlobalState();

    if (actionType === "prompt") {
      setPendingGpOrderData(savedOrder);
      setGpReceiptType("receipt");
      setShowGpReceiptPrompt(true);
    } else {
      onOpenDocument(actionType, savedOrder);
    }
  };

  const handleGpReceiptConfirm = () => {
    if (!pendingGpOrderData) return;
    onOpenDocument(gpReceiptType, pendingGpOrderData);
    setShowGpReceiptPrompt(false);
    setPendingGpOrderData(null);
  };

  const handleGpReceiptCancel = () => {
    setShowGpReceiptPrompt(false);
    setPendingGpOrderData(null);
  };


  // ----------------------------------------------------
  // STATE FOR MODULE 2: JOB INTAKE FORM
  // ----------------------------------------------------
  const [jobCustomer, setJobCustomer] = useState("");
  const [jobPhone, setJobPhone] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobTotal, setJobTotal] = useState(0);
  const [jobDeposit, setJobDeposit] = useState(0);
  const [jobDelivery, setJobDelivery] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [jobInitials, setJobInitials] = useState(activeUserName);
  const [jobPayMethod, setJobPayMethod] = useState<"Mobile Money" | "Cash" | "Bank Transfer" | "POS">("Cash");
  const [jobSpecialInstructions, setJobSpecialInstructions] = useState("");
  const [jobCollection, setJobCollection] = useState<"Pick Up" | "Shop Delivery" | "Courier" | "Dispatch Rider" | "Other">("Pick Up");
  const [jobPriority, setJobPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [jobAssigned, setJobAssigned] = useState(() => {
    const staff = DBStore.getStaffAccounts();
    return staff[0]?.name || "Staff 1";
  });

  const jobBalance = Math.max(0, jobTotal - jobDeposit);

  React.useEffect(() => {
    if (activeUserName) {
      setJobInitials(activeUserName);
    }
  }, [activeUserName]);

  // Check for approaching job deadlines on refresh
  React.useEffect(() => {
    DBStore.checkJobDeadlines();
  }, [refreshTrigger]);

  const handleSaveJob = () => {
    if (!jobCustomer.trim() || !jobDesc.trim() || jobTotal <= 0) {
      alert("Please ensure Customer Name, Job Description, and Total Amount are filled correctly.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const timeStr = new Date().toTimeString().split(" ")[0].substring(0, 5);

    const newJob = {
      date: todayStr,
      time: timeStr,
      customerName: jobCustomer,
      customerPhone: jobPhone,
      jobDescription: jobDesc,
      totalAmount: jobTotal,
      depositPaid: jobDeposit,
      balance: jobBalance,
      expectedDeliveryDate: jobDelivery,
      staffInitials: jobInitials,
      paymentMethod: jobPayMethod,
      specialInstructions: jobSpecialInstructions,
      collectionMethod: jobCollection,
      status: "Pending" as JobStatus,
      kanbanStage: "Design" as KanbanStage,
      priority: jobPriority,
      assignedStaff: jobAssigned
    };

    const savedJob = DBStore.saveJob(newJob);

    // Save audit log for tracking responsibility
    DBStore.addAuditLog(
      activeUserName,
      "Create",
      "Job Intake",
      `Booked new print contract job ${savedJob.jobNumber} for customer ${savedJob.customerName}. Total: ${settings.currency} ${savedJob.totalAmount.toFixed(2)}, Deposit Paid: ${settings.currency} ${savedJob.depositPaid.toFixed(2)}.`
    );

    // Notify staff and admin that a new job was added
    DBStore.addNotification(
      "job_created",
      `📋 New Job Added: ${savedJob.jobNumber} for ${savedJob.customerName} | ${settings.currency} ${savedJob.totalAmount.toFixed(2)} | Staff: ${activeUserName}`
    );

    // Reset Form
    setJobCustomer("");
    setJobPhone("");
    setJobDesc("");
    setJobTotal(0);
    setJobDeposit(0);
    setJobSpecialInstructions("");

    onRefreshGlobalState();

    // Trigger popup (Job Intake Receipt)
    onOpenDocument("receipt", savedJob);
  };


  // ----------------------------------------------------
  // STATE FOR MODULE 3: JOB PRODUCTION TRACKER (KANBAN)
  // ----------------------------------------------------
  const [lastMovedJobId, setLastMovedJobId] = useState<string | null>(null);
  const [moveDirection, setMoveDirection] = useState<"prev" | "next" | null>(null);
  const [selectedTrackingJobId, setSelectedTrackingJobId] = useState<string | null>(null);

  const kanbanStages: KanbanStage[] = [
    "Design",
    "Printing / Production",
    "Finishing",
    "Quality Check",
    "Ready for Delivery",
    "Delivered",
    "Job Completed"
  ];

  // Auto-track the active job
  const activeTrackingJob = useMemo(() => {
    if (selectedTrackingJobId) {
      const found = jobs.find(j => j.id === selectedTrackingJobId);
      if (found) return found;
    }
    if (lastMovedJobId) {
      const found = jobs.find(j => j.id === lastMovedJobId);
      if (found) return found;
    }
    // Fallback to first available active job
    return jobs.find(j => j.kanbanStage !== "Job Completed") || jobs[0];
  }, [jobs, selectedTrackingJobId, lastMovedJobId]);

  const handleMoveStage = (jobId: string, currentStage: KanbanStage, direction: "prev" | "next") => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const currentIndex = kanbanStages.indexOf(currentStage);
    let nextIndex = currentIndex + (direction === "next" ? 1 : -1);

    if (nextIndex >= 0 && nextIndex < kanbanStages.length) {
      const nextStage = kanbanStages[nextIndex];
      const updatedJob = { ...job, kanbanStage: nextStage };

      // Sync the main Status value for simple tracking
      if (nextStage === "Design") updatedJob.status = "Design";
      else if (nextStage === "Printing / Production") updatedJob.status = "Printing";
      else if (nextStage === "Ready for Delivery") updatedJob.status = "Ready";
      else if (nextStage === "Delivered" || nextStage === "Job Completed") updatedJob.status = "Delivered";

      setLastMovedJobId(jobId);
      setSelectedTrackingJobId(jobId); // Auto-focus visualizer on the moved job!
      setMoveDirection(direction);
      setTimeout(() => {
        setLastMovedJobId(prev => prev === jobId ? null : prev);
      }, 1500);

      DBStore.updateJob(updatedJob);

      // If job is delivered/completed, trigger delivery receipt
      if (nextStage === "Delivered" || nextStage === "Job Completed") {
        setTimeout(() => {
          onOpenDocument("delivery_receipt", updatedJob);
        }, 300);
      }

      // Save audit log for tracking accountability on job progress
      DBStore.addAuditLog(
        activeUserName,
        "Edit",
        "Job Production",
        `Moved contract job ${job.jobNumber} (${job.customerName}) from [${currentStage}] to [${nextStage}].`
      );

      onRefreshGlobalState();
    }
  };

  const renderStageTracker = () => {
    if (!activeTrackingJob) {
      return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 rounded-2xl p-6 text-center shadow-xs">
          <p className="text-sm text-gray-400 font-medium">No active print jobs to track. Add a new job from the Intake form!</p>
        </div>
      );
    }

    const currentStage = activeTrackingJob.kanbanStage;
    const stageIndex = kanbanStages.indexOf(currentStage);

    // Dynamic color maps for stages
    const stageColorMap: Record<KanbanStage, { bg: string; text: string; border: string; accent: string }> = {
      "Design": { bg: "bg-cyan-50 dark:bg-cyan-950/20", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-150 dark:border-cyan-900/30", accent: "#06b6d4" },
      "Printing / Production": { bg: "bg-pink-50 dark:bg-pink-950/20", text: "text-pink-600 dark:text-pink-400", border: "border-pink-150 dark:border-pink-900/30", accent: "#ec4899" },
      "Finishing": { bg: "bg-purple-50 dark:bg-purple-950/20", text: "text-purple-600 dark:text-purple-400", border: "border-purple-150 dark:border-purple-900/30", accent: "#a855f7" },
      "Quality Check": { bg: "bg-yellow-50 dark:bg-yellow-950/20", text: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-150 dark:border-yellow-900/30", accent: "#eab308" },
      "Ready for Delivery": { bg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-150 dark:border-orange-900/30", accent: "#f97316" },
      "Delivered": { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-600 dark:text-blue-400", border: "border-blue-150 dark:border-blue-900/30", accent: "#3b82f6" },
      "Job Completed": { bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-150 dark:border-emerald-900/30", accent: "#10b981" }
    };

    const currentColors = stageColorMap[currentStage] || { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-150", accent: "#6366f1" };

    return (
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-2xl p-5 md:p-6 shadow-xs space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-zinc-800/60">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-md">
                Live Production Pipeline Visualizer
              </span>
              <span className={`text-[10px] uppercase font-black tracking-widest ${currentColors.bg} ${currentColors.text} px-2.5 py-0.5 rounded-md`}>
                {currentStage}
              </span>
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
              <span className="text-gray-400">Tracking:</span>
              <span>{activeTrackingJob.jobNumber}</span>
              <span className="text-gray-300 dark:text-zinc-700">|</span>
              <span className="text-indigo-600 dark:text-indigo-400">{activeTrackingJob.customerName}</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {activeTrackingJob.jobDescription} — <span className="font-semibold text-gray-700 dark:text-zinc-300">Assigned: {activeTrackingJob.assignedStaff}</span>
            </p>
          </div>

          {/* Quick select dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Switch Job:</label>
            <select
              value={activeTrackingJob.id}
              onChange={(e) => setSelectedTrackingJobId(e.target.value)}
              className="text-xs font-bold rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-gray-800 dark:text-white outline-hidden focus:border-indigo-500 transition"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jobNumber} - {j.customerName.slice(0, 15)} ({j.kanbanStage})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Horizontal Timeline Steps */}
        <div className="relative pt-4 overflow-x-auto scrollbar-none pb-2 select-none">
          <div className="min-w-[800px] flex justify-between items-center relative">
            
            {/* Background line */}
            <div className="absolute top-4 left-0 right-0 h-1 bg-gray-100 dark:bg-zinc-800 rounded-full -z-10" />
            
            {/* Animated progress fill line */}
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${(stageIndex / (kanbanStages.length - 1)) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute top-4 left-0 h-1 bg-indigo-600 dark:bg-indigo-500 rounded-full -z-10 shadow-sm"
            />

            {kanbanStages.map((stage, idx) => {
              const isPast = idx < stageIndex;
              const isActive = idx === stageIndex;
              const isFuture = idx > stageIndex;

              return (
                <button
                  key={stage}
                  onClick={() => setSelectedTrackingJobId(activeTrackingJob.id)}
                  className="flex flex-col items-center text-center space-y-2 group focus:outline-hidden relative px-1 cursor-pointer"
                  style={{ width: `${100 / kanbanStages.length}%` }}
                >
                  {/* Step node bubble */}
                  <div className="relative flex items-center justify-center">
                    {isActive && (
                      <motion.div
                        layoutId="activeBubbleRing"
                        className="absolute -inset-2 rounded-full border-2 border-indigo-500/30 bg-indigo-500/10"
                        animate={{ scale: [0.95, 1.15, 0.95] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                    
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border-2 font-bold text-xs transition duration-300 shadow-xs ${
                        isActive
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : isPast
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-white dark:bg-zinc-950 border-gray-250 dark:border-zinc-800 text-gray-400 dark:text-zinc-500"
                      }`}
                    >
                      {isPast ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                  </div>

                  {/* Label */}
                  <div className="space-y-0.5">
                    <span
                      className={`block text-[11px] font-extrabold tracking-tight transition ${
                        isActive
                          ? "text-indigo-600 dark:text-indigo-400 font-black"
                          : isPast
                          ? "text-gray-700 dark:text-zinc-300 font-bold"
                          : "text-gray-400 dark:text-zinc-600"
                      }`}
                    >
                      {stage}
                    </span>
                    {isActive && (
                      <span className="block text-[8px] uppercase tracking-widest text-indigo-500 font-extrabold animate-pulse">
                        Active Stage
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Central Animation Arena Card */}
        <div className="relative bg-gray-50/50 dark:bg-zinc-950/30 rounded-2xl border border-gray-100 dark:border-zinc-800/50 overflow-hidden p-6 md:p-8 flex flex-col items-center justify-center min-h-[220px]">
          
          {/* Subtle Grid overlay for design touch */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="w-full flex flex-col items-center text-center space-y-6 max-w-lg z-10"
            >
              
              {/* STAGE ANIMATIONS */}
              
              {/* 1. DESIGN STAGE ANIMATION */}
              {currentStage === "Design" && (
                <div className="relative w-48 h-28 flex items-center justify-center">
                  {/* Drawing Tablet Workspace */}
                  <div className="w-40 h-24 bg-zinc-800 dark:bg-zinc-900 border-4 border-zinc-700 dark:border-zinc-850 rounded-xl shadow-lg relative overflow-hidden flex items-center justify-center">
                    {/* Drafting Canvas Grid */}
                    <div className="absolute inset-1 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:10px_10px]" />
                      
                      {/* Drawing Vector Path (glowing cyan bezier curves) */}
                      <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 60">
                        <motion.path
                          d="M15,30 C35,5 65,55 85,30"
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: [0, 1, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        />
                        {/* Node handle lines */}
                        <line x1="15" y1="30" x2="35" y2="5" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" />
                        <line x1="85" y1="30" x2="65" y2="55" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" />
                        {/* Control anchor points */}
                        <circle cx="35" cy="5" r="2" fill="#22d3ee" />
                        <circle cx="65" cy="55" r="2" fill="#22d3ee" />
                        <circle cx="15" cy="30" r="3" fill="#0891b2" />
                        <circle cx="85" cy="30" r="3" fill="#0891b2" />
                      </svg>

                      {/* Pen stylus drawing */}
                      <motion.div
                        className="absolute h-10 w-1 bg-amber-400 rounded-full origin-bottom"
                        style={{ top: "10px", left: "45%" }}
                        animate={{ 
                          rotate: [15, -15, 15],
                          x: [-20, 20, -20],
                          y: [-5, 5, -5]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      >
                        {/* Pen nib glow */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-cyan-400 blur-[2px]" />
                      </motion.div>
                    </div>
                  </div>

                  {/* CMYK floating palette circles orbit */}
                  <div className="absolute inset-0 pointer-events-none">
                    {["bg-cyan-400", "bg-pink-500", "bg-yellow-400", "bg-zinc-900"].map((color, i) => (
                      <motion.div
                        key={color}
                        className={`absolute h-4 w-4 rounded-full border-2 border-white dark:border-zinc-800 ${color} shadow-sm`}
                        animate={{
                          x: [
                            70 * Math.cos((i * Math.PI) / 2),
                            70 * Math.cos((i * Math.PI) / 2 + Math.PI),
                            70 * Math.cos((i * Math.PI) / 2 + 2 * Math.PI)
                          ],
                          y: [
                            35 * Math.sin((i * Math.PI) / 2),
                            35 * Math.sin((i * Math.PI) / 2 + Math.PI),
                            35 * Math.sin((i * Math.PI) / 2 + 2 * Math.PI)
                          ],
                          scale: [1, 1.2, 0.8, 1]
                        }}
                        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                        style={{ left: "46%", top: "42%" }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 2. PRINTING / PRODUCTION STAGE ANIMATION */}
              {currentStage === "Printing / Production" && (
                <div className="relative w-56 h-28 flex flex-col items-center justify-center space-y-3">
                  
                  {/* Heavy Duty Industrial Printing Unit */}
                  <div className="w-48 h-16 bg-zinc-800 dark:bg-zinc-900 rounded-xl border-3 border-zinc-700 dark:border-zinc-800 shadow-md relative flex items-center justify-between px-3 overflow-hidden">
                    
                    {/* Spinning roller drums inside */}
                    <div className="flex gap-16 absolute inset-x-8 top-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="h-10 w-10 rounded-full border-4 border-dashed border-zinc-600 flex items-center justify-center"
                      >
                        <div className="h-4 w-4 bg-zinc-500 rounded-full" />
                      </motion.div>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="h-10 w-10 rounded-full border-4 border-dashed border-zinc-600 flex items-center justify-center"
                      >
                        <div className="h-4 w-4 bg-zinc-500 rounded-full" />
                      </motion.div>
                    </div>

                    {/* Infinite Paper Feed banner moving left-to-right through machine */}
                    <motion.div
                      className="absolute left-0 right-0 h-1.5 bg-cyan-100 dark:bg-cyan-950/40 z-10"
                      style={{ top: "35px" }}
                    >
                      {/* Printed spots */}
                      <div className="h-full w-full flex justify-around items-center">
                        {["bg-cyan-400", "bg-pink-400", "bg-yellow-400", "bg-indigo-400"].map((col, k) => (
                          <motion.div
                            key={k}
                            className={`h-1.5 w-4 rounded-sm ${col}`}
                            animate={{ x: [-50, 200] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: k * 0.3 }}
                          />
                        ))}
                      </div>
                    </motion.div>

                    {/* Ink Nozzles spraying CMYK ink droplets downward */}
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-4">
                      {["#22d3ee", "#ec4899", "#eab308", "#27272a"].map((color, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                          {/* Micro nozzle tip */}
                          <div className="h-2 w-1.5 bg-gray-400 rounded-b" />
                          {/* Dropping ink droplets */}
                          <motion.div
                            animate={{
                              y: [0, 24],
                              opacity: [1, 0],
                              scale: [1, 0.4]
                            }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              ease: "easeIn",
                              delay: idx * 0.18
                            }}
                            className="h-2 w-2 rounded-full mt-1 shadow-xs"
                            style={{ backgroundColor: color }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic laser scan line bouncing vertically */}
                  <motion.div
                    animate={{ y: [-40, 20, -40] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-x-8 h-0.5 bg-indigo-500/80 shadow-md shadow-indigo-500 blur-[2px] pointer-events-none"
                  />
                </div>
              )}

              {/* 3. FINISHING STAGE ANIMATION */}
              {currentStage === "Finishing" && (
                <div className="relative w-48 h-28 flex items-center justify-center">
                  
                  {/* Cutter base and cutting blade */}
                  <div className="w-40 h-20 bg-slate-100 dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-800 rounded-xl relative overflow-hidden flex flex-col justify-end p-2">
                    
                    {/* Grid layout printed on paper */}
                    <div className="absolute inset-2 border border-dashed border-gray-300 dark:border-zinc-800 rounded flex items-center justify-center">
                      <div className="w-1/2 h-full border-r border-dashed border-gray-300 dark:border-zinc-800" />
                    </div>

                    {/* Guillotine metal cutting blade pressing down and releasing */}
                    <motion.div
                      className="absolute inset-x-2 bg-gradient-to-b from-gray-400 to-gray-600 h-2 border-b border-white"
                      style={{ top: "5px" }}
                      animate={{
                        y: [0, 45, 0]
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      {/* Blade handle */}
                      <div className="h-6 w-1 bg-red-500 absolute right-4 bottom-2 rounded" />
                      
                      {/* Spark splash on impact */}
                      <motion.div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-5 w-5 bg-yellow-400 rounded-full blur-[2px] pointer-events-none"
                        animate={{
                          scale: [0, 1.8, 0],
                          opacity: [0, 1, 0]
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeOut"
                        }}
                      />
                    </motion.div>

                    {/* Paper shavings falling down */}
                    <div className="flex justify-between px-6">
                      {[1, 2, 3].map((s) => (
                        <motion.div
                          key={s}
                          className="h-1.5 w-3 bg-white border border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 rounded-xs"
                          animate={{
                            y: [0, 20],
                            rotate: [0, 180],
                            opacity: [1, 0]
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeIn",
                            delay: s * 0.2
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. QUALITY CHECK STAGE ANIMATION */}
              {currentStage === "Quality Check" && (
                <div className="relative w-48 h-28 flex items-center justify-center">
                  
                  {/* Verified certificate stamp or sheet */}
                  <div className="w-32 h-20 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-850 rounded-lg p-2 shadow-md relative flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="h-2 w-16 bg-gray-200 dark:bg-zinc-800 rounded" />
                      <div className="h-1.5 w-24 bg-gray-100 dark:bg-zinc-850 rounded" />
                      <div className="h-1.5 w-20 bg-gray-100 dark:bg-zinc-850 rounded" />
                    </div>
                    
                    {/* Golden Quality Badge */}
                    <div className="absolute right-2 bottom-2 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center text-[8px] font-black text-white shadow-xs">
                      QA
                    </div>
                  </div>

                  {/* Animated Magnifying Glass scanning in a figure-8 loop */}
                  <motion.div
                    className="absolute h-12 w-12 rounded-full border-3 border-indigo-500 bg-indigo-200/25 dark:bg-indigo-950/20 shadow-lg flex items-center justify-center z-20 cursor-pointer"
                    animate={{
                      x: [-40, 40, -40],
                      y: [-15, 15, -15],
                      rotate: [0, 15, -15, 0]
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {/* Magnifying glass handle */}
                    <div className="w-8 h-2 bg-indigo-600 rounded-md absolute -bottom-4 -right-4 origin-top-left rotate-45" />
                    {/* Inner magnifying lens shine */}
                    <div className="w-8 h-8 rounded-full border border-white/40 absolute top-0.5 left-0.5" />
                  </motion.div>

                  {/* Floating green checkmarks of validation */}
                  {[1, 2].map((ch) => (
                    <motion.div
                      key={ch}
                      className="absolute text-emerald-500 font-bold text-xs"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: [0, 1.4, 1],
                        opacity: [0, 1, 0],
                        y: [-20, -50]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: ch * 0.9
                      }}
                      style={{
                        left: ch === 1 ? "20%" : "70%",
                        top: "40%"
                      }}
                    >
                      ✓ Check Pass
                    </motion.div>
                  ))}
                </div>
              )}

              {/* 5. READY FOR DELIVERY STAGE ANIMATION */}
              {currentStage === "Ready for Delivery" && (
                <div className="relative w-64 h-28 flex items-center justify-between px-2">
                  
                  {/* Left Station: Stack of package boxes ready */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="text-[9px] uppercase font-bold text-gray-400">Cargo Bay</div>
                    <div className="grid grid-cols-2 gap-1 bg-gray-100/50 dark:bg-zinc-900/50 p-1.5 rounded-lg border border-dashed border-gray-300 dark:border-zinc-800">
                      {[1, 2, 3].map((b) => (
                        <div key={b} className="h-5 w-5 bg-amber-700/80 rounded border border-amber-800 flex items-center justify-center text-amber-100 font-bold">
                          <Boxes className="h-3 w-3" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Packing Animation path: Package dropping inside the Truck */}
                  <div className="absolute left-[85px] top-6 w-12 h-16 z-20">
                    <motion.div
                      animate={{
                        y: [-30, 28, 28],
                        opacity: [0, 1, 1, 0],
                        scale: [0.6, 1, 1, 0.8],
                        x: [0, 30, 32, 32]
                      }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="h-6 w-6 bg-amber-600/90 rounded border border-amber-800 shadow-sm flex items-center justify-center"
                    >
                      <Boxes className="h-3.5 w-3.5 text-amber-100" />
                    </motion.div>
                  </div>

                  {/* Right Station: Parked Delivery Car/Truck with open back trunk */}
                  <div className="relative flex flex-col items-end shrink-0">
                    {/* Small Loading indicator badge */}
                    <span className="text-[8px] bg-amber-500 text-white font-extrabold px-1.5 py-0.5 rounded-full absolute -top-4 right-2 animate-bounce uppercase">
                      Lashing
                    </span>

                    {/* Polished Vector Van Chassis */}
                    <div className="relative w-28 h-16 bg-indigo-600 dark:bg-indigo-700 rounded-xl rounded-r-2xl border border-indigo-700 shadow-lg flex items-center justify-between p-2">
                      {/* Driver Cabin window */}
                      <div className="absolute right-1 top-2.5 w-7 h-5 bg-cyan-200 dark:bg-cyan-900/60 rounded-tr-lg rounded-bl-sm border border-indigo-500" />
                      
                      {/* Open back trunk door */}
                      <motion.div
                        className="absolute -left-5 top-2 w-5 h-12 bg-indigo-700/90 rounded-l border-y border-l border-indigo-800 flex items-center justify-center origin-right"
                        animate={{
                          rotateY: [0, -75, 0]
                        }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <div className="w-1 h-3 bg-zinc-400 rounded-sm" />
                      </motion.div>

                      {/* Wheels */}
                      <div className="absolute -bottom-2.5 left-4 h-6 w-6 rounded-full bg-zinc-800 border-3 border-zinc-400 flex items-center justify-center">
                        <div className="h-1.5 w-1.5 bg-zinc-200 rounded-full" />
                      </div>
                      <div className="absolute -bottom-2.5 right-4 h-6 w-6 rounded-full bg-zinc-800 border-3 border-zinc-400 flex items-center justify-center">
                        <div className="h-1.5 w-1.5 bg-zinc-200 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. DELIVERED STAGE ANIMATION */}
              {currentStage === "Delivered" && (
                <div className="relative w-full max-w-sm h-28 flex flex-col justify-end overflow-hidden border border-dashed border-gray-200 dark:border-zinc-850 rounded-xl p-2 bg-sky-50/20 dark:bg-sky-950/10">
                  
                  {/* Sky backdrop with drifting clouds */}
                  <div className="absolute inset-x-0 top-2 flex justify-between px-6 opacity-30 pointer-events-none">
                    <motion.div
                      animate={{ x: [-20, 120, -20] }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    >
                      <Cloud className="h-5 w-5 text-sky-400 fill-sky-400/10" />
                    </motion.div>
                    <motion.div
                      animate={{ x: [20, -100, 20] }}
                      transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                    >
                      <Cloud className="h-4 w-4 text-sky-400 fill-sky-400/10" />
                    </motion.div>
                  </div>

                  {/* Parallax Landscape elements scrolling right-to-left */}
                  <div className="absolute inset-x-0 bottom-6 h-10 pointer-events-none overflow-hidden opacity-25 flex">
                    {[1, 2, 3, 4].map((t) => (
                      <motion.div
                        key={t}
                        className="shrink-0 px-8"
                        animate={{ x: [150, -280] }}
                        transition={{
                          duration: 5,
                          repeat: Infinity,
                          ease: "linear",
                          delay: t * 1.2
                        }}
                      >
                        <Trees className="h-5 w-5 text-indigo-500" />
                      </motion.div>
                    ))}
                  </div>

                  {/* Delivery truck driving dynamically */}
                  <div className="relative flex items-center justify-center h-16 w-full z-10">
                    <motion.div
                      className="relative w-28 h-12 bg-indigo-600 dark:bg-indigo-700 rounded-lg rounded-r-xl border border-indigo-700 shadow-md flex items-center justify-between p-1.5"
                      animate={{
                        y: [-1, 2, -1],
                        rotate: [-0.5, 0.5, -0.5]
                      }}
                      transition={{ duration: 0.35, repeat: Infinity, ease: "easeInOut" }}
                    >
                      {/* Driver Window */}
                      <div className="absolute right-1 top-2 w-6 h-4 bg-cyan-200 dark:bg-cyan-900/60 rounded-tr-md rounded-bl-sm border border-indigo-500" />
                      
                      {/* Brand Logo design on Truck side */}
                      <div className="text-[7px] font-black tracking-tight text-white/90 leading-tight select-none uppercase truncate pl-1">
                        {settings.companyName.split(" ")[0]}
                      </div>

                      {/* Wheels spinning */}
                      <div className="absolute -bottom-2 left-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                          className="h-5 w-5 rounded-full bg-zinc-800 border-2 border-zinc-400 flex items-center justify-center"
                        >
                          {/* Spoke line */}
                          <div className="h-full w-0.5 bg-zinc-400" />
                        </motion.div>
                      </div>
                      <div className="absolute -bottom-2 right-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                          className="h-5 w-5 rounded-full bg-zinc-800 border-2 border-zinc-400 flex items-center justify-center"
                        >
                          <div className="h-full w-0.5 bg-zinc-400" />
                        </motion.div>
                      </div>

                      {/* Exhaust smoke pipe with puffing exhaust clouds */}
                      <div className="absolute left-[-8px] bottom-1 flex items-end">
                        <motion.div
                          className="h-2 w-2 rounded-full bg-gray-400"
                          animate={{
                            x: [-5, -25],
                            y: [-2, -8],
                            scale: [0.3, 1.4],
                            opacity: [1, 0]
                          }}
                          transition={{ duration: 0.7, repeat: Infinity, ease: "easeOut" }}
                        />
                      </div>
                    </motion.div>

                    {/* Destination Banner Pin on the right side */}
                    <div className="absolute right-4 top-2">
                      <motion.div
                        animate={{ y: [-4, 4, -4] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="flex flex-col items-center"
                      >
                        <MapPin className="h-5 w-5 text-rose-500 fill-rose-500/20" />
                        <div className="h-1 w-4 bg-black/20 dark:bg-white/15 rounded-full blur-[2px]" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Road lane base */}
                  <div className="h-1 bg-gray-400 dark:bg-zinc-700 w-full relative">
                    {/* Animated dashed lines */}
                    <div className="absolute inset-0 flex justify-between overflow-hidden">
                      {[1, 2, 3, 4, 5, 6].map((l) => (
                        <motion.div
                          key={l}
                          className="h-full w-4 bg-white/70"
                          animate={{ x: [100, -200] }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear", delay: l * 0.16 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 7. JOB COMPLETED STAGE ANIMATION */}
              {currentStage === "Job Completed" && (
                <div className="relative w-48 h-32 flex items-center justify-center">
                  
                  {/* Bouncy Golden Trophy of completion */}
                  <motion.div
                    animate={{
                      scale: [0.9, 1.05, 0.9],
                      rotate: [-2, 2, -2]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="relative z-10 filter drop-shadow-md select-none"
                  >
                    <Trophy className="h-14 w-14 text-amber-500 stroke-[1.5] drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                  </motion.div>

                  {/* Floating celebratory particles/checkmarks surrounding trophy */}
                  {[1, 2, 3, 4, 5].map((item) => {
                    const angle = (item * 2 * Math.PI) / 5;
                    const symbols = ["•", "○", "✓", "•", "○"];
                    return (
                      <motion.div
                        key={item}
                        className="absolute text-sm select-none"
                        animate={{
                          x: [
                            40 * Math.cos(angle),
                            55 * Math.cos(angle + 0.3),
                            40 * Math.cos(angle)
                          ],
                          y: [
                            40 * Math.sin(angle),
                            55 * Math.sin(angle + 0.3),
                            40 * Math.sin(angle)
                          ],
                          scale: [1, 1.3, 0.9, 1],
                          opacity: [0.8, 1, 0.8]
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: item * 0.2
                        }}
                        style={{ left: "44%", top: "40%" }}
                      >
                        {symbols[item - 1]}
                      </motion.div>
                    );
                  })}

                  {/* Confetti wave drops shooting down */}
                  <div className="absolute inset-0 pointer-events-none">
                    {[1, 2, 3].map((conf) => (
                      <motion.div
                        key={conf}
                        className={`absolute w-1.5 h-1.5 rounded-full ${
                          conf === 1 ? "bg-emerald-400" : conf === 2 ? "bg-yellow-400" : "bg-pink-400"
                        }`}
                        animate={{
                          y: [-10, 110],
                          x: conf === 1 ? [-20, -10, -15] : conf === 2 ? [10, 20, 15] : [-40, -35, -45],
                          opacity: [1, 1, 0]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                          delay: conf * 0.5
                        }}
                        style={{ left: conf === 1 ? "40%" : conf === 2 ? "60%" : "25%" }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Accompanying text info and stats for stage */}
              <div className="space-y-1 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 px-4 py-2.5 rounded-xl shadow-xs">
                <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Production Status Report</span>
                <p className="text-xs font-black text-gray-800 dark:text-zinc-100 uppercase tracking-wide">
                  {currentStage === "Design" && "Creative Artwork Layout phase"}
                  {currentStage === "Printing / Production" && "Active Digital Press run"}
                  {currentStage === "Finishing" && "Post-press Guillotine Trimming"}
                  {currentStage === "Quality Check" && "Microscopic DPI compliance check"}
                  {currentStage === "Ready for Delivery" && "Packed and Secured for Dispatch"}
                  {currentStage === "Delivered" && "Courier in active transit route"}
                  {currentStage === "Job Completed" && "Succeeded. Final Hand-off Logged"}
                </p>
                <p className="text-[10.5px] text-gray-500 dark:text-zinc-400">
                  {currentStage === "Design" && "The design staff is finalizing color alignments and mockups for customer review before ink application."}
                  {currentStage === "Printing / Production" && "CMYK industrial print channels are running actively. Media stock is feeding through the digital rollers."}
                  {currentStage === "Finishing" && "Trimming border bleeds, aligning folding layouts, laminating protective coating, and binding final output."}
                  {currentStage === "Quality Check" && "Inspecting ink consistency, structural density, edge sharpness, and quantity validation checks."}
                  {currentStage === "Ready for Delivery" && "Product units are carefully packaged inside cardboard boxes and transferred directly into the dispatch cargo truck."}
                  {currentStage === "Delivered" && "The package has left the factory bay. A dispatch rider is currently routing to the delivery destination coordinates."}
                  {currentStage === "Job Completed" && "This job has successfully finalized. All payments have been balanced and the print contract archives have been updated!"}
                </p>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  };


  // ----------------------------------------------------
  // STATE FOR RECORDING INCREMENTAL PAYMENTS & HISTORY
  // ----------------------------------------------------
  const [selectedPaymentJob, setSelectedPaymentJob] = useState<Job | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"Mobile Money" | "Cash" | "Bank Transfer" | "POS">("Cash");
  const [paymentStaff, setPaymentStaff] = useState<string>("");
  const [paymentError, setPaymentError] = useState<string>("");
  const [paymentSuccess, setPaymentSuccess] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentTime, setPaymentTime] = useState<string>("");

  // Set default receiving staff when payment modal opens
  React.useEffect(() => {
    if (selectedPaymentJob) {
      setPaymentStaff(activeUserName || selectedPaymentJob.assignedStaff || "Staff");
      setPaymentAmount("");
      setPaymentError("");
      setPaymentSuccess("");
      
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, "0");
      const dy = String(now.getDate()).padStart(2, "0");
      const hr = String(now.getHours()).padStart(2, "0");
      const mn = String(now.getMinutes()).padStart(2, "0");
      setPaymentDate(`${yr}-${mo}-${dy}`);
      setPaymentTime(`${hr}:${mn}`);
    }
  }, [selectedPaymentJob, activeUserName]);

  const handleRecordPayment = () => {
    if (!selectedPaymentJob) return;
    setPaymentError("");
    setPaymentSuccess("");

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError("Please enter a valid positive payment amount.");
      return;
    }
    if (amt > selectedPaymentJob.balance) {
      setPaymentError(`Amount cannot exceed the remaining balance of ${settings.currency} ${selectedPaymentJob.balance.toFixed(2)}.`);
      return;
    }
    if (!paymentStaff.trim()) {
      setPaymentError("Please enter or select the staff receiving the payment.");
      return;
    }

    const dateStr = paymentDate || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
    const timeStr = paymentTime || `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
    const formattedTimestamp = `${dateStr} ${timeStr}`;

    const newRecord = {
      id: `pay-${Date.now()}`,
      timestamp: formattedTimestamp,
      amountPaid: amt,
      paymentMethod: paymentMethod,
      receivedBy: paymentStaff.trim()
    };

    const updatedHistory = [...(selectedPaymentJob.paymentHistory || []), newRecord];
    const newDepositPaid = selectedPaymentJob.depositPaid + amt;
    const newBalance = Math.max(0, selectedPaymentJob.totalAmount - newDepositPaid);

    const updatedJob: Job = {
      ...selectedPaymentJob,
      depositPaid: newDepositPaid,
      balance: newBalance,
      paymentHistory: updatedHistory
    };

    // Update in store
    DBStore.updateJob(updatedJob);

    // Save audit log
    DBStore.addAuditLog(
      paymentStaff.trim(),
      "Edit",
      "Job Intake",
      `Recorded incremental payment of ${settings.currency} ${amt.toFixed(2)} (${paymentMethod}) for Job ${selectedPaymentJob.jobNumber}. Remaining Balance: ${settings.currency} ${newBalance.toFixed(2)}.`
    );

    // Refresh global state so parent updates
    onRefreshGlobalState();

    // Show success
    setPaymentSuccess(`Payment of ${settings.currency} ${amt.toFixed(2)} successfully recorded!`);
    setPaymentAmount("");

    // Update our currently viewed job state so history updates live in the modal
    setSelectedPaymentJob(updatedJob);

    // Clear success message after 2.5 seconds
    setTimeout(() => {
      setPaymentSuccess("");
    }, 2500);
  };


  // ----------------------------------------------------
  // STATE FOR MODULE 4: END OF DAY SALES REPORT
  // ----------------------------------------------------
  const [shShift, setShShift] = useState("Day Shift");
  const [shPhoto, setShPhoto] = useState(0);
  const [shPrint, setShPrint] = useState(0);
  const [shFrame, setShFrame] = useState(0);
  const [shShirt, setShShirt] = useState(0);
  const [shLarge, setShLarge] = useState(0);
  const [shDtf, setShDtf] = useState(0);
  const [shSpecial, setShSpecial] = useState(0);
  const [shMisc, setShMisc] = useState(0);

  const [shCash, setShCash] = useState(0);
  const [shMomo, setShMomo] = useState(0);
  const [shBank, setShBank] = useState(0);
  const [shPos, setShPos] = useState(0);

  const [shRemarks, setShRemarks] = useState("");

  const shCalculations = useMemo(() => {
    const totalSales = shPhoto + shPrint + shFrame + shShirt + shLarge + shDtf + shSpecial;
    const totalReceived = shCash + shMomo + shBank + shPos;
    const discrepancy = totalReceived - totalSales;

    return {
      totalSales,
      totalReceived,
      discrepancy
    };
  }, [shPhoto, shPrint, shFrame, shShirt, shLarge, shDtf, shSpecial, shCash, shMomo, shBank, shPos]);

  // Auto-calculate today's sales from actual GPO orders and Jobs
  const recalculateShiftTotals = useCallback(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter(o => o.date === todayStr);
    const todayJobs = jobs.filter(j => j.date === todayStr);

    let photo = 0, printing = 0, frame = 0, shirt = 0, large = 0, dtf = 0, special = 0;
    let cash = 0, momo = 0, bank = 0, pos = 0;

    todayOrders.forEach(o => {
      photo += o.photocopy?.amount || 0;
      printing += o.printing?.amount || 0;
      frame += o.frame?.amount || 0;
      shirt += o.tshirt?.amount || 0;
      large += (o.largeFormat?.sticker?.amount || 0) + (o.largeFormat?.banner?.amount || 0);
      dtf += (o.dtf?.a3?.amount || 0) + (o.dtf?.a4?.amount || 0);
      special += (o.specialServices || []).reduce((sum: number, s: any) => sum + (s.amount || 0), 0);

      if (o.paymentMethod === "Cash") cash += o.grandTotal;
      else if (o.paymentMethod === "Mobile Money") momo += o.grandTotal;
      else if (o.paymentMethod === "Bank Transfer") bank += o.grandTotal;
      else if (o.paymentMethod === "POS") pos += o.grandTotal;
    });

    todayJobs.forEach(j => {
      if (j.paymentMethod === "Cash") cash += j.depositPaid;
      else if (j.paymentMethod === "Mobile Money") momo += j.depositPaid;
      else if (j.paymentMethod === "Bank Transfer") bank += j.depositPaid;
      else if (j.paymentMethod === "POS") pos += j.depositPaid;
    });

    setShPhoto(photo);
    setShPrint(printing);
    setShFrame(frame);
    setShShirt(shirt);
    setShLarge(large);
    setShDtf(dtf);
    setShSpecial(special);
    setShCash(cash);
    setShMomo(momo);
    setShBank(bank);
    setShPos(pos);
  }, [orders, jobs]);

  // Auto-calculate when shift-report tab opens
  useEffect(() => {
    if (activeTab === "shift-report") {
      recalculateShiftTotals();
    }
  }, [activeTab, recalculateShiftTotals]);

  const handleSubmitSalesReport = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const closingStr = new Date().toTimeString().split(" ")[0].substring(0, 5);

    const reportData = {
      date: todayStr,
      closingTime: closingStr,
      staffName: activeUserName,
      shift: shShift,
      photocopyTotal: shPhoto,
      printingTotal: shPrint,
      framesTotal: shFrame,
      tshirtsTotal: shShirt,
      largeFormatTotal: shLarge,
      dtfTotal: shDtf,
      specialServicesTotal: shSpecial,
      dailyMiscellaneous: shMisc,
      cashReceived: shCash,
      mobileMoneyReceived: shMomo,
      bankTransferReceived: shBank,
      posReceived: shPos,
      totalSales: shCalculations.totalSales,
      remarks: shRemarks
    };

    DBStore.addDailySalesReport(reportData);

    // Notify admin of new shift report submission
    DBStore.addNotification(
      "shift_submitted",
      `📋 Shift Report Submitted: ${activeUserName} submitted their ${reportData.shift} report for ${todayStr}. Total Sales: ${settings.currency} ${reportData.totalSales.toFixed(2)} | Received: ${settings.currency} ${shCalculations.totalReceived.toFixed(2)} | Discrepancy: ${settings.currency} ${shCalculations.discrepancy.toFixed(2)}`
    );

    // Save audit log for EOD sales report tracking
    DBStore.addAuditLog(
      activeUserName,
      "Submit Report",
      "Shift Report",
      `Submitted EOD sales report for ${reportData.shift}. Total sales: ${settings.currency} ${reportData.totalSales.toFixed(2)}, total received: ${settings.currency} ${shCalculations.totalReceived.toFixed(2)}, discrepancy: ${settings.currency} ${shCalculations.discrepancy.toFixed(2)}.`
    );
    
    // Clear fields
    setShPhoto(0);
    setShPrint(0);
    setShFrame(0);
    setShShirt(0);
    setShLarge(0);
    setShDtf(0);
    setShSpecial(0);
    setShMisc(0);
    setShCash(0);
    setShMomo(0);
    setShBank(0);
    setShPos(0);
    setShRemarks("");

    onRefreshGlobalState();
    alert("End of Day Sales report has been uploaded to Admin validation pipeline successfully!");
    setActiveTab("overview");
  };


  // ----------------------------------------------------
  // STATE FOR MODULE 5: DAILY MISCELLANEOUS
  // ----------------------------------------------------
  const [miscItem, setMiscItem] = useState("");
  const [miscDesc, setMiscDesc] = useState("");
  const [miscPurpose, setMiscPurpose] = useState("Office Supplies");
  const [miscAmount, setMiscAmount] = useState(0);

  const handleSaveMisc = () => {
    if (!miscItem.trim() || miscAmount <= 0) {
      alert("Please enter a valid item name and amount.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    DBStore.addDailyMiscellaneous({
      date: todayStr,
      item: miscItem,
      description: miscDesc,
      purpose: miscPurpose,
      amount: miscAmount,
      staffName: activeUserName
    });

    // Save audit log for minor expenditures tracking
    DBStore.addAuditLog(
      activeUserName,
      "Create",
      "Expenses",
      `Logged minor expenditure of ${settings.currency} ${miscAmount.toFixed(2)} for: "${miscItem}" (${miscPurpose}).`
    );

    setMiscItem("");
    setMiscDesc("");
    setMiscAmount(0);

    onRefreshGlobalState();
    alert("Miscellaneous local expense logged successfully!");
    setActiveTab("overview");
  };

  // ----------------------------------------------------
  // HANDLERS FOR MODULE 6: WAREHOUSE & SKU INVENTORY
  // ----------------------------------------------------
  const handleProcessInventoryAction = () => {
    if (!invSelId) {
      alert("Please select a target material item to update.");
      return;
    }
    if (invQty <= 0) {
      alert("Please specify a positive quantity amount.");
      return;
    }
    if (!invRemark.trim()) {
      alert("Please provide a process comment or justification for audit compliance.");
      return;
    }

    const item = inventoryList.find(i => i.id === invSelId);
    if (!item) return;

    const oldRemaining = item.remainingStock;
    const oldPurchased = item.purchased;
    const oldUsed = item.used;

    let updatedItem: InventoryItem = { ...item };
    let actionLabel = "";
    let detailMsg = "";

    if (invAction === "restock") {
      updatedItem.purchased = oldPurchased + invQty;
      if (invCostPrice > 0) updatedItem.unitCost = invCostPrice;
      if (invSalePrice > 0) updatedItem.sellingPrice = invSalePrice;
      if (invSupplierName.trim()) updatedItem.supplier = invSupplierName;
      actionLabel = "Restock Supply";
      detailMsg = `Restocked +${invQty} units of ${item.item}. Supplier: ${updatedItem.supplier || item.supplier}. Old Total Purchased: ${oldPurchased} ➔ ${updatedItem.purchased}. Process Reason: ${invRemark}`;
    } else if (invAction === "consume") {
      updatedItem.used = oldUsed + invQty;
      actionLabel = "Material Usage";
      detailMsg = `Logged raw material consumption/spillage of -${invQty} units of ${item.item}. Old Total Used: ${oldUsed} ➔ ${updatedItem.used}. Process Reason: ${invRemark}`;
    } else {
      // adjust
      updatedItem.openingStock = invQty;
      actionLabel = "Physical Stock Correction";
      detailMsg = `Adjusted baseline stock for ${item.item} directly to ${invQty}. Process Reason/Justification: ${invRemark}`;
    }

    // Recalculate remaining
    updatedItem.remainingStock = updatedItem.openingStock + updatedItem.purchased - updatedItem.used;
    if (updatedItem.remainingStock < 0) updatedItem.remainingStock = 0;

    DBStore.updateInventoryItem(updatedItem, activeUserName);
    
    // Explicit, clear audit log entry
    DBStore.addAuditLog(
      activeUserName,
      actionLabel,
      "Inventory",
      `[STOCK PROCESS] ${detailMsg} (Stock Level: ${oldRemaining} ➔ ${updatedItem.remainingStock} units).`
    );

    // Reset state fields
    setInvQty(0);
    setInvCostPrice(0);
    setInvSalePrice(0);
    setInvSupplierName("");
    setInvRemark("");
    setInvSelId("");

    onRefreshGlobalState();
    alert("Stock adjustment transaction successfully authorized and logged!");
  };

  const handleStaffCreateSku = () => {
    if (!newSkuName.trim()) {
      alert("Please key in the new SKU name.");
      return;
    }

    const barcode = `890${Math.floor(100000000 + Math.random() * 900000000)}`;
    const qrCode = `QR-${newSkuName.substring(0, 5).toUpperCase().replace(/\s/g, "")}`;

    const newItem: Omit<InventoryItem, "id" | "remainingStock"> = {
      item: newSkuName.trim(),
      category: newSkuCat,
      openingStock: newSkuOpenStock,
      purchased: 0,
      used: 0,
      minimumStock: newSkuMinStock,
      alertLevel: newSkuMinStock,
      unitCost: newSkuCost,
      sellingPrice: newSkuSell,
      barcode,
      qrCode,
      supplier: newSkuSupplier || "Unassigned"
    };

    DBStore.addInventoryItem(newItem, activeUserName);

    // Audit log
    DBStore.addAuditLog(
      activeUserName,
      "Create SKU",
      "Inventory",
      `[STOCK PROCESS] Cataloged new inventory SKU material: ${newSkuName.trim()} with opening stock of ${newSkuOpenStock} units. (Barcode: ${barcode}).`
    );

    // Reset Catalog fields
    setNewSkuName("");
    setNewSkuCat("Printing Materials");
    setNewSkuOpenStock(0);
    setNewSkuMinStock(0);
    setNewSkuCost(0);
    setNewSkuSell(0);
    setNewSkuSupplier("");

    onRefreshGlobalState();
    alert("New SKU successfully cataloged and audited!");
  };

  const handleStartEdit = (item: InventoryItem) => {
    setEditInvId(item.id);
    setEditInvItem({ ...item });
  };

  const handleEditInventoryItem = () => {
    if (!editInvItem) return;
    DBStore.updateInventoryItem(editInvItem, activeUserName);
    setEditInvId(null);
    setEditInvItem(null);
    onRefreshGlobalState();
    alert("Inventory item updated successfully!");
  };

  const handleDeleteInventoryItem = (item: InventoryItem) => {
    if (!window.confirm(`Delete "${item.item}" from the catalog?\n\nThis cannot be undone. Only delete materials that are no longer used.`)) return;
    DBStore.deleteInventoryItem(item.id, activeUserName);
    if (editInvId === item.id) {
      setEditInvId(null);
      setEditInvItem(null);
    }
    onRefreshGlobalState();
    alert(`"${item.item}" has been removed from the catalog.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Navigation Rail (Mobile Only, Styled beautifully with badges) */}
      <div className="flex md:hidden overflow-x-auto gap-2 border-b border-white/10 pb-3.5 scrollbar-none">
        {[
          { id: "overview", label: "Dashboard", icon: ClipboardList },
          { id: "gen-print", label: "General Printing (M1)", icon: Receipt },
          { id: "job-intake", label: "Job Intake (M2)", icon: PlusCircle },
          { id: "kanban", label: "Production (M3)", icon: Briefcase },
          { id: "inventory", label: "Inventory (M6)", icon: Boxes },
          { id: "misc", label: "Daily Expenses (M5)", icon: CircleDollarSign },
          { id: "shift-report", label: "End of Shift (M4)", icon: FileCheck2 },
          { id: "learning", label: "Training (M*)", icon: GraduationCap }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer whitespace-nowrap active:scale-95 ${
                active
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "bg-white/10 dark:bg-zinc-900/40 text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-200 border border-white/5"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ----------------------------------------------------
          TAB 1: STAFF OVERVIEW TERMINAL
          ---------------------------------------------------- */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* 1. Today's Sales (Sales -> Royal Blue) */}
            <div className="relative rounded-2xl border-l-4 border-l-blue-600 border border-white/10 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-500/10 backdrop-blur-md p-5 shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden">
              <div className="absolute top-3 right-3 opacity-15 text-blue-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <TrendingUp className="h-10 w-10" />
              </div>
              <div className="flex justify-between items-start text-blue-600 dark:text-blue-400">
                <span className="text-[9px] font-black bg-blue-500/15 px-2 py-0.5 rounded-full uppercase tracking-widest text-blue-700 dark:text-blue-300 border border-blue-500/20">LIVE</span>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-black uppercase tracking-widest mt-4">Today's Sales</p>
              <h3 className="text-lg font-black text-gray-950 dark:text-white mt-1 leading-none tracking-tight">
                {currency} {metrics.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {/* 2. Jobs In Progress (Orders/Jobs -> Orange) */}
            <div className="relative rounded-2xl border-l-4 border-l-orange-500 border border-white/10 bg-gradient-to-br from-orange-500/5 via-transparent to-orange-500/10 backdrop-blur-md p-5 shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden">
              <div className="absolute top-3 right-3 opacity-15 text-orange-500 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                <Briefcase className="h-10 w-10" />
              </div>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-black uppercase tracking-widest mt-8">Jobs In Progress</p>
              <h3 className="text-xl font-black text-gray-950 dark:text-white mt-1 leading-none tracking-tight">
                {metrics.jobsInProgress}
              </h3>
            </div>

            {/* 3. Completed Jobs (Completed -> Emerald) */}
            <div className="relative rounded-2xl border-l-4 border-l-emerald-500 border border-white/10 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/10 backdrop-blur-md p-5 shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden">
              <div className="absolute top-3 right-3 opacity-15 text-emerald-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <CheckCircle className="h-10 w-10" />
              </div>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-black uppercase tracking-widest mt-8">Completed Jobs</p>
              <h3 className="text-xl font-black text-gray-950 dark:text-white mt-1 leading-none tracking-tight">
                {metrics.completedJobs}
              </h3>
            </div>

            {/* 4. Pending Collections (Collections -> Purple) */}
            <div className="relative rounded-2xl border-l-4 border-l-indigo-500 border border-white/10 bg-gradient-to-br from-indigo-500/5 via-transparent to-indigo-500/10 backdrop-blur-md p-5 shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden">
              <div className="absolute top-3 right-3 opacity-15 text-indigo-500 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                <Clock className="h-10 w-10" />
              </div>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-black uppercase tracking-widest mt-8">Pending Collections</p>
              <h3 className="text-xl font-black text-gray-950 dark:text-white mt-1 leading-none tracking-tight">
                {metrics.pendingCollections}
              </h3>
            </div>

            {/* 5. Unpaid Balances (Outstanding -> Red) */}
            <div className="relative rounded-2xl border-l-4 border-l-rose-500 border border-white/10 bg-gradient-to-br from-rose-500/5 via-transparent to-rose-500/10 backdrop-blur-md p-5 shadow-xl hover:shadow-rose-500/10 hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden">
              <div className="absolute top-3 right-3 opacity-15 text-rose-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <CircleDollarSign className="h-10 w-10" />
              </div>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-black uppercase tracking-widest mt-8">Unpaid Balances</p>
              <h3 className="text-lg font-black text-gray-950 dark:text-white mt-1 leading-none tracking-tight">
                {currency} {metrics.outstandingBalances.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>

            {/* 6. Daily Expenses (Expenses -> Cyan) */}
            <div className="relative rounded-2xl border-l-4 border-l-cyan-500 border border-white/10 bg-gradient-to-br from-cyan-500/5 via-transparent to-cyan-500/10 backdrop-blur-md p-5 shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden">
              <div className="absolute top-3 right-3 opacity-15 text-cyan-500 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                <TrendingUp className="h-10 w-10" />
              </div>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-black uppercase tracking-widest mt-8">Daily Expenses</p>
              <h3 className="text-lg font-black text-gray-950 dark:text-white mt-1 leading-none tracking-tight">
                {currency} {metrics.todayMisc.toFixed(2)}
              </h3>
            </div>
          </div>

          {/* ==================================================== */}
          {/* RECENT ACTIVITIES - REPORT ERROR */}
          {/* ==================================================== */}
          {(() => {
            const recentActivities = DBStore.getStaffRecentActivities(activeUserName, 24);
            const [reportingId, setReportingId] = React.useState<string | null>(null);
            const [reportReason, setReportReason] = React.useState("");
            const handleReport = (id: string, ref: string, type: string) => {
              if (!reportReason.trim()) {
                alert("Please enter a reason for reporting this entry.");
                return;
              }
              DBStore.reportActivity(type.toLowerCase().replace(" sales report", "sales_report").replace("gpo", "gpo").replace("job", "job").replace("misc", "misc") as any, id, ref, activeUserName, reportReason.trim());
              setReportingId(null);
              setReportReason("");
              onRefreshGlobalState();
              alert("Entry reported to Admin for review.");
            };
            return (
              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden paper-texture shadow-xl space-y-4">
                <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-tight">
                        Recent Activities (24hr Window)
                      </h3>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-500 font-bold">
                        Report any wrong entry to Admin within 24 hours. After 24 hours, entries are locked.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="px-3 py-2 font-black text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Type</th>
                        <th className="px-3 py-2 font-black text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Ref</th>
                        <th className="px-3 py-2 font-black text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Customer</th>
                        <th className="px-3 py-2 font-black text-gray-500 dark:text-zinc-400 uppercase tracking-wider text-right">Amount</th>
                        <th className="px-3 py-2 font-black text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Time</th>
                        <th className="px-3 py-2 font-black text-gray-500 dark:text-zinc-400 uppercase tracking-wider text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {recentActivities.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-gray-400 dark:text-zinc-500">
                            No activities recorded in the last 24 hours.
                          </td>
                        </tr>
                      ) : recentActivities.map(a => (
                        <tr key={a.id} className="hover:bg-white/5 transition">
                          <td className="px-3 py-2 font-bold text-gray-700 dark:text-zinc-300">{a.type}</td>
                          <td className="px-3 py-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">{a.ref}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">{a.customer}</td>
                          <td className="px-3 py-2 text-right font-black text-gray-900 dark:text-white">{currency} {a.amount.toFixed(2)}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-zinc-500">{new Date(a.timestamp).toLocaleString()}</td>
                          <td className="px-3 py-2 text-center">
                            {reportingId === a.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={reportReason}
                                  onChange={(e) => setReportReason(e.target.value)}
                                  placeholder="Reason..."
                                  className="w-24 px-2 py-1 rounded-md border border-white/20 bg-white/10 text-gray-900 dark:text-white text-[10px] font-bold outline-hidden focus:border-indigo-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleReport(a.id, a.ref, a.type)}
                                  className="px-2 py-1 rounded-md bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-rose-600 transition"
                                >
                                  Send
                                </button>
                                <button
                                  onClick={() => { setReportingId(null); setReportReason(""); }}
                                  className="px-2 py-1 rounded-md bg-gray-500 text-white text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition"
                                >
                                  X
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setReportingId(a.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                              >
                                <AlertTriangle className="h-3 w-3" />
                                Report
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* ==================================================== */}
          {/* STAFF CLOCK IN / CLOCK OUT PANEL */}
          {/* ==================================================== */}
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden paper-texture shadow-xl space-y-4">
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-md ${
                  currentClockIn
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                }`}>
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-tight">
                    Attendance — {activeUserName}
                  </h3>
                  <p className={`text-[11px] font-bold mt-0.5 ${
                    currentClockIn
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-500 dark:text-rose-400"
                  }`}>
                    {currentClockIn ? `Clocked In at ${currentClockIn}` : "Not Clocked In"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleClockIn}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 px-5 py-3 text-xs font-black text-white shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer transition-all duration-300 uppercase tracking-widest"
                >
                  Clock In
                </button>
                <button
                  onClick={handleClockOut}
                  className="rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 px-5 py-3 text-xs font-black text-white shadow-lg shadow-rose-500/25 active:scale-95 cursor-pointer transition-all duration-300 uppercase tracking-widest"
                >
                  Clock Out
                </button>
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* ACCOUNT RECONCILIATION & HISTORICAL SALES LEDGER */}
          {/* ==================================================== */}
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden paper-texture shadow-xl space-y-6">
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
            
            {/* Header with Period Selectors */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Historical Sales Inspector & Account Reconciliation
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                  Verify payments, match cash tills, and navigate previous days, weeks, and months
                </p>
              </div>

              {/* Day / Week / Month Tab selectors */}
              <div className="flex p-0.5 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-white/5">
                {[
                  { id: "day", label: "Daily" },
                  { id: "week", label: "Weekly" },
                  { id: "month", label: "Monthly", isAdminOnly: true }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setLedgerPeriod(p.id as any);
                      setLedgerOffset(0); // Reset offset on shift
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                      ledgerPeriod === p.id
                        ? "bg-white dark:bg-zinc-800 text-gray-950 dark:text-white shadow-sm"
                        : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
                    }`}
                  >
                    {p.isAdminOnly && <span className="text-[8px] text-amber-500">🔒</span>}
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Back & Forth Navigation Controls */}
            <div className="flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/40 p-4 rounded-xl border border-white/5">
              <button
                onClick={() => setLedgerOffset(prev => prev - 1)}
                className="p-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-white/10 text-gray-700 dark:text-zinc-300 transition-all cursor-pointer shadow-xs active:scale-90"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="text-center">
                <span className="text-[9px] font-mono tracking-widest text-red-600 dark:text-red-400 font-black uppercase block">Active Period</span>
                <span className="text-xs font-black text-gray-950 dark:text-white tracking-tight mt-0.5 block">{ledgerRange.label}</span>
              </div>

              <div className="flex gap-2">
                {ledgerOffset !== 0 && (
                  <button
                    onClick={() => setLedgerOffset(0)}
                    className="px-2.5 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border border-red-500/10"
                  >
                    Current
                  </button>
                )}
                <button
                  onClick={() => setLedgerOffset(prev => prev + 1)}
                  className="p-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-white/10 text-gray-700 dark:text-zinc-300 transition-all cursor-pointer shadow-xs active:scale-90"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* MONTHLY RESTRICTION MESSAGE FOR STAFF */}
            {ledgerPeriod === "month" ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-tight">Monthly Sales Ledger Restricted</h4>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium max-w-md mx-auto leading-relaxed">
                  Monthly business performance metrics and consolidated accounts are restricted to Admin authorization. Staff are authorized to review daily registers and weekly reconciliations only.
                </p>
                <button
                  onClick={() => {
                    setLedgerPeriod("week");
                    setLedgerOffset(0);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Return to Weekly Sales
                </button>
              </div>
            ) : (
              <>
                {/* Aggregated Revenue Summary cards for Selected Period */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  {/* Total Period Sales */}
                  <div className="col-span-2 lg:col-span-2 bg-gradient-to-br from-red-500/5 to-red-500/15 border border-red-500/15 rounded-xl p-4">
                    <span className="text-[9px] text-red-500 dark:text-red-400 font-mono tracking-wider uppercase font-black">Consolidated Sales</span>
                    <h4 className="text-base font-black text-gray-950 dark:text-white mt-1">
                      {currency} {ledgerStats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h4>
                    <p className="text-[9px] text-gray-400 font-medium mt-0.5">Total cash and digital inflows</p>
                  </div>

                  {/* Cash Till Inflows */}
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                    <span className="text-[8px] text-gray-400 font-mono tracking-wider uppercase font-black">💵 Cash Till</span>
                    <h5 className="text-sm font-black text-gray-900 dark:text-white mt-1">
                      {currency} {ledgerStats.cash.toFixed(2)}
                    </h5>
                  </div>

                  {/* Mobile Money Inflows */}
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                    <span className="text-[8px] text-gray-400 font-mono tracking-wider uppercase font-black">📱 Mobile Money</span>
                    <h5 className="text-sm font-black text-gray-900 dark:text-white mt-1">
                      {currency} {ledgerStats.momo.toFixed(2)}
                    </h5>
                  </div>

                  {/* Bank Transfer Inflows */}
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                    <span className="text-[8px] text-gray-400 font-mono tracking-wider uppercase font-black">🏦 Bank Trans</span>
                    <h5 className="text-sm font-black text-gray-900 dark:text-white mt-1">
                      {currency} {ledgerStats.bank.toFixed(2)}
                    </h5>
                  </div>

                  {/* POS Card Inflows */}
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5">
                    <span className="text-[8px] text-gray-400 font-mono tracking-wider uppercase font-black">💳 POS Card</span>
                    <h5 className="text-sm font-black text-gray-900 dark:text-white mt-1">
                      {currency} {ledgerStats.pos.toFixed(2)}
                    </h5>
                  </div>
                </div>

                {/* Detailed Transaction Ledger Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                    PERIOD TRANSACTION LOG ({ledgerRange.txs.length} entries)
                  </h4>

                  {ledgerRange.txs.length === 0 ? (
                    <div className="border border-white/5 bg-white/5 rounded-xl p-6 text-center text-[11px] text-gray-400 font-medium">
                      No sales transactions or cash flows logged during this active period.
                    </div>
                  ) : (
                    <div className="border border-white/5 bg-white/5 rounded-xl overflow-hidden overflow-x-auto max-h-72">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/10 text-gray-400 font-black uppercase tracking-widest text-[9px] bg-white/5">
                            <th className="p-3">Timestamp</th>
                            <th className="p-3">Reference</th>
                            <th className="p-3">Customer / Purpose</th>
                            <th className="p-3">Staff Initials</th>
                            <th className="p-3">Payment Method</th>
                            <th className="p-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-gray-800 dark:text-zinc-300 font-semibold">
                          {ledgerRange.txs.map((tx) => (
                            <tr key={tx.id} className="hover:bg-white/5 transition-colors duration-150">
                              <td className="p-3 font-mono text-[9px]">{tx.timestamp}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                  tx.isExpense 
                                    ? "bg-rose-500/10 text-rose-500" 
                                    : tx.type === "General Order" 
                                      ? "bg-blue-500/10 text-blue-500" 
                                      : "bg-emerald-500/10 text-emerald-500"
                                }`}>
                                  {tx.ref}
                                </span>
                              </td>
                              <td className="p-3 font-black text-gray-950 dark:text-white">{tx.customer}</td>
                              <td className="p-3 font-mono text-[10px] uppercase text-gray-500">{tx.staff}</td>
                              <td className="p-3 font-medium text-gray-500">{tx.paymentMethod}</td>
                              <td className={`p-3 text-right font-black ${tx.isExpense ? "text-rose-500" : "text-emerald-500"}`}>
                                {tx.isExpense ? "–" : "+"}{currency} {tx.amount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Quick Action Hub */}
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden paper-texture shadow-xl">
            {/* Top CMYK Accent Bar */}
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />

            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-4">Quick Actions Launchpad</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <button
                onClick={() => setActiveTab("gen-print")}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-white/5 hover:border-indigo-500 bg-white/10 dark:bg-zinc-900/15 hover:bg-white/15 dark:hover:bg-zinc-900/25 transition-all duration-300 cursor-pointer text-left active:scale-95 shadow-md"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black shadow-inner">
                  01
                </div>
                <div>
                  <h5 className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-tight">General Print</h5>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium mt-0.5">Photocopy & Banner M1</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("job-intake")}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-white/5 hover:border-orange-500 bg-white/10 dark:bg-zinc-900/15 hover:bg-white/15 dark:hover:bg-zinc-900/25 transition-all duration-300 cursor-pointer text-left active:scale-95 shadow-md"
              >
                <div className="h-10 w-10 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black shadow-inner">
                  02
                </div>
                <div>
                  <h5 className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-tight">Job Intake</h5>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium mt-0.5">Log Corporate M2</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("kanban")}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-white/5 hover:border-indigo-500 bg-white/10 dark:bg-zinc-900/15 hover:bg-white/15 dark:hover:bg-zinc-900/25 transition-all duration-300 cursor-pointer text-left active:scale-95 shadow-md"
              >
                <div className="h-10 w-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shadow-inner">
                  03
                </div>
                <div>
                  <h5 className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-tight">Production</h5>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium mt-0.5">Manage Kanban M3</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("inventory")}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-white/5 hover:border-cyan-500 bg-white/10 dark:bg-zinc-900/15 hover:bg-white/15 dark:hover:bg-zinc-900/25 transition-all duration-300 cursor-pointer text-left active:scale-95 shadow-md"
              >
                <div className="h-10 w-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black shadow-inner">
                  04
                </div>
                <div>
                  <h5 className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-tight">SKU Inventory</h5>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium mt-0.5">Adjust Stock Levels M6</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab("shift-report")}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-white/5 hover:border-emerald-500 bg-white/10 dark:bg-zinc-900/15 hover:bg-white/15 dark:hover:bg-zinc-900/25 transition-all duration-300 cursor-pointer text-left active:scale-95 shadow-md"
              >
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black shadow-inner">
                  05
                </div>
                <div>
                  <h5 className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-tight">EOD Report</h5>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium mt-0.5">Submit shift numbers M4</p>
                </div>
              </button>
            </div>
          </div>

          {/* Outstanding Installments (jobs not fully paid) */}
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden paper-texture shadow-xl">
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-amber-500" />
                Outstanding Installments ({jobs.filter(j => (j.balance || 0) > 0).length})
              </h4>
              <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                Total Unpaid: {currency} {jobs.filter(j => (j.balance || 0) > 0).reduce((s, j) => s + (j.balance || 0), 0).toFixed(2)}
              </span>
            </div>
            <div className="overflow-x-auto">
              {jobs.filter(j => (j.balance || 0) > 0).length === 0 ? (
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium py-3">All jobs are fully paid. No outstanding installments.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 font-bold uppercase tracking-widest text-[9px]">
                      <th className="py-2.5">Job No.</th>
                      <th className="py-2.5">Customer</th>
                      <th className="py-2.5 text-right">Total</th>
                      <th className="py-2.5 text-right">Paid</th>
                      <th className="py-2.5 text-right">Balance</th>
                      <th className="py-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs
                      .filter(j => (j.balance || 0) > 0)
                      .sort((a, b) => (b.balance || 0) - (a.balance || 0))
                      .map(job => (
                        <tr key={job.id} className="border-b border-white/5 hover:bg-white/5 transition-colors duration-150">
                          <td className="py-2.5 font-mono text-[10px] font-black text-gray-800 dark:text-zinc-200">{job.jobNumber}</td>
                          <td className="py-2.5 font-bold text-gray-800 dark:text-zinc-200">{job.customerName}</td>
                          <td className="py-2.5 text-right font-semibold">{currency} {job.totalAmount.toFixed(2)}</td>
                          <td className="py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">{currency} {job.depositPaid.toFixed(2)}</td>
                          <td className="py-2.5 text-right font-black text-rose-500">{currency} {job.balance.toFixed(2)}</td>
                          <td className="py-2.5 text-center">
                            <button
                              onClick={() => setSelectedPaymentJob(job)}
                              className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black px-3 py-1.5 rounded-lg text-[10px] shadow-md shadow-emerald-500/20 cursor-pointer transition-all uppercase tracking-wider active:scale-95"
                            >
                              <CircleDollarSign className="h-3 w-3" /> Record Pay
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Quick Active Jobs Table */}
          <div className="glass-panel rounded-2xl p-6 overflow-x-auto shadow-xl relative overflow-hidden paper-texture">
            {/* Top CMYK Accent Bar */}
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />

            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Production Pipeline ({jobs.filter(j => j.status !== "Delivered").length})</h4>
              <button onClick={() => setActiveTab("kanban")} className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer uppercase tracking-wider">
                View Kanban Board <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-bold uppercase tracking-widest text-[9px]">
                  <th className="py-3">Job Number</th>
                  <th className="py-3">Customer</th>
                  <th className="py-3">Deadline</th>
                  <th className="py-3">Assigned</th>
                  <th className="py-3">Stage</th>
                  <th className="py-3 text-right">Balance Due</th>
                  <th className="py-3 text-right w-24">Documents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-700 dark:text-zinc-300 font-medium">
                {jobs.slice(0, 5).map((job) => (
                  <tr key={job.id} className="hover:bg-white/5 transition-colors duration-250">
                    <td className="py-3.5 font-mono font-black text-gray-950 dark:text-white">{job.jobNumber}</td>
                    <td className="py-3.5 font-bold text-gray-900 dark:text-zinc-150">{job.customerName}</td>
                    <td className="py-3.5 font-bold text-orange-600 dark:text-orange-400">{job.expectedDeliveryDate}</td>
                    <td className="py-3.5 font-semibold">{job.assignedStaff}</td>
                    <td className="py-3.5">
                      <span className="inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {job.kanbanStage}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`font-black text-xs ${job.balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md"}`}>
                          {currency} {job.balance.toFixed(2)}
                        </span>
                        {job.balance > 0 && (
                          <button
                            onClick={() => setSelectedPaymentJob(job)}
                            className="text-[9px] text-blue-600 dark:text-blue-400 hover:underline font-black mt-0.5 cursor-pointer uppercase tracking-wider"
                          >
                            + Record Pay
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedPaymentJob(job)}
                          title="View Payments History & Record Installment"
                          className="p-1.5 rounded-lg hover:bg-white/10 text-orange-500 cursor-pointer transition-colors duration-200"
                        >
                          <CircleDollarSign className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onOpenDocument("invoice", job)}
                          title="Print Invoice"
                          className="p-1.5 rounded-lg hover:bg-white/10 text-blue-500 cursor-pointer transition-colors duration-200"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onOpenDocument("receipt", job)}
                          title="Print Receipt"
                          className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-500 cursor-pointer transition-colors duration-200"
                        >
                          <Receipt className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onOpenDocument("waybill", job)}
                          title="Print Waybill"
                          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 cursor-pointer transition-colors duration-200"
                        >
                          <PlusCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 2: GENERAL PRINTING ORDER FORM (MODULE 1)
          ---------------------------------------------------- */}
      {activeTab === "gen-print" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Form (Span 2) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Customer Header Info */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight border-b border-white/10 pb-2 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                1. Customer & Payment Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={gpCustomer}
                    onChange={(e) => setGpCustomer(e.target.value)}
                    placeholder="e.g. Client Name"
                    className="glass-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={gpPhone}
                    onChange={(e) => setGpPhone(e.target.value)}
                    placeholder="e.g. 0244123456"
                    className="glass-input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                  Payment Method
                </label>
                <div className="flex flex-wrap gap-4">
                  {["Cash", "Mobile Money", "Bank Transfer", "POS"].map((method) => (
                    <label key={method} className="flex items-center gap-2 text-xs font-black text-gray-800 dark:text-zinc-300 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="gpPayment"
                        value={method}
                        checked={gpPaymentMethod === method}
                        onChange={() => setGpPaymentMethod(method as any)}
                        className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 bg-white/5 border-white/10"
                      />
                      {method}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* General Services Sections */}
            <div className="glass-panel rounded-2xl p-6 space-y-6 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight border-b border-white/10 pb-2 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
                2. Print Service Specifications
              </h3>

              {/* SECTION A: PHOTOCOPY */}
              <div className="p-5 rounded-2xl bg-white/5 dark:bg-zinc-900/15 border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h4 className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-wider">A. Photocopy Service</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGpPhotoLines([...gpPhotoLines, { id: `ph-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, type: "Custom", quantity: 0, unitPrice: 1.50 }])}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 hover:bg-white/20 text-[10px] font-black text-indigo-700 dark:text-indigo-300 px-2.5 py-1.5 cursor-pointer transition uppercase tracking-wider"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Add Line
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {gpPhotoLines.map((line, idx) => (
                    <div key={line.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <label className="block text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Type</label>
                        <select
                          value={line.type}
                          onChange={(e) => setGpPhotoLines(gpPhotoLines.map((l, i) => i === idx ? { ...l, type: e.target.value as any } : l))}
                          className="glass-input w-full bg-transparent text-xs"
                        >
                          <option value="Black & White">Black & White</option>
                          <option value="Colored">Colored</option>
                          <option value="Custom">Custom</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Qty</label>
                        <input type="number" min="0" value={line.quantity || ""} onChange={(e) => setGpPhotoLines(gpPhotoLines.map((l, i) => i === idx ? { ...l, quantity: Math.max(0, parseInt(e.target.value) || 0) } : l))} className="glass-input w-full text-xs" />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Unit ({currency})</label>
                        <input type="number" step="0.01" min="0" value={line.unitPrice || ""} onChange={(e) => setGpPhotoLines(gpPhotoLines.map((l, i) => i === idx ? { ...l, unitPrice: Math.max(0, parseFloat(e.target.value) || 0) } : l))} className="glass-input w-full text-xs" />
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <div className="w-full bg-white/5 dark:bg-zinc-950/40 border border-white/10 rounded-xl px-2 py-2 text-[11px] font-black text-gray-800 dark:text-zinc-200">
                          {(line.quantity * line.unitPrice).toFixed(2)}
                        </div>
                        {gpPhotoLines.length > 1 && (
                          <button type="button" onClick={() => setGpPhotoLines(gpPhotoLines.filter((_, i) => i !== idx))} className="p-1 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 cursor-pointer shrink-0" title="Remove line"><X className="h-3.5 w-3.5" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-1 border-t border-white/5">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Photocopy Total</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white">{currency} {gpCalculations.photoAmt.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* SECTION B: PRINTING */}
              <div className="p-5 rounded-2xl bg-white/5 dark:bg-zinc-900/15 border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <h4 className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-wider">B. Digital Printing Run</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGpPrintLines([...gpPrintLines, { id: `pr-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, type: "Custom", quantity: 0, unitPrice: 2.50 }])}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 hover:bg-white/20 text-[10px] font-black text-orange-700 dark:text-orange-300 px-2.5 py-1.5 cursor-pointer transition uppercase tracking-wider"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Add Line
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {gpPrintLines.map((line, idx) => (
                    <div key={line.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <label className="block text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Type</label>
                        <select
                          value={line.type}
                          onChange={(e) => setGpPrintLines(gpPrintLines.map((l, i) => i === idx ? { ...l, type: e.target.value as any } : l))}
                          className="glass-input w-full bg-transparent text-xs"
                        >
                          <option value="Black & White">Black & White</option>
                          <option value="Colored">Colored</option>
                          <option value="Custom">Custom</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Qty</label>
                        <input type="number" min="0" value={line.quantity || ""} onChange={(e) => setGpPrintLines(gpPrintLines.map((l, i) => i === idx ? { ...l, quantity: Math.max(0, parseInt(e.target.value) || 0) } : l))} className="glass-input w-full text-xs" />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Unit ({currency})</label>
                        <input type="number" step="0.01" min="0" value={line.unitPrice || ""} onChange={(e) => setGpPrintLines(gpPrintLines.map((l, i) => i === idx ? { ...l, unitPrice: Math.max(0, parseFloat(e.target.value) || 0) } : l))} className="glass-input w-full text-xs" />
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <div className="w-full bg-white/5 dark:bg-zinc-950/40 border border-white/10 rounded-xl px-2 py-2 text-[11px] font-black text-gray-800 dark:text-zinc-200">
                          {(line.quantity * line.unitPrice).toFixed(2)}
                        </div>
                        {gpPrintLines.length > 1 && (
                          <button type="button" onClick={() => setGpPrintLines(gpPrintLines.filter((_, i) => i !== idx))} className="p-1 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 cursor-pointer shrink-0" title="Remove line"><X className="h-3.5 w-3.5" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-1 border-t border-white/5">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Printing Total</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white">{currency} {gpCalculations.printAmt.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* SECTION C: FRAMES */}
              <div className="p-5 rounded-2xl bg-white/5 dark:bg-zinc-900/15 border border-white/10 space-y-4">
                <h4 className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-wider">C. Wood & Glass Frames</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Frame Size</label>
                    <select value={gpFrameSize} onChange={(e) => setGpFrameSize(e.target.value)} className="glass-input w-full bg-transparent">
                      <option value="A5">A5</option>
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                      <option value="12x19">12x19</option>
                      <option value="16x20">16x20</option>
                      <option value="16x24">16x24</option>
                      <option value="20x24">20x24</option>
                      <option value="24x30">24x30</option>
                      <option value="30x36">30x36</option>
                      <option value="Custom / Other">Custom / Other</option>
                    </select>
                    {gpFrameSize === "Custom / Other" && (
                      <input 
                        type="text" 
                        placeholder="Enter custom size..." 
                        value={gpFrameCustomSize} 
                        onChange={(e) => setGpFrameCustomSize(e.target.value)} 
                        className="glass-input w-full mt-2" 
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Quantity</label>
                    <input type="number" min="0" value={gpFrameQty || ""} onChange={(e) => setGpFrameQty(Math.max(0, parseInt(e.target.value) || 0))} className="glass-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Unit Price ({currency})</label>
                    <input type="number" min="0" value={gpFramePrice || ""} onChange={(e) => setGpFramePrice(Math.max(0, parseFloat(e.target.value) || 0))} className="glass-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Total Amount</label>
                    <div className="w-full bg-white/5 dark:bg-zinc-950/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-black text-gray-800 dark:text-zinc-200">
                      {currency} {gpCalculations.frameAmt.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION D: T-SHIRTS */}
              <div className="p-5 rounded-2xl bg-white/5 dark:bg-zinc-900/15 border border-white/10 space-y-4">
                <h4 className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-wider">D. Apparel & T-Shirts</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Category</label>
                    <select value={gpShirtCat} onChange={(e) => { setGpShirtCat(e.target.value as any); setGpShirtPrice(e.target.value === "Cotton" ? 55 : e.target.value === "Lacoste" ? 85 : 40); }} className="glass-input w-full bg-transparent">
                      <option value="">-- None --</option>
                      <option value="Cotton">Premium Cotton</option>
                      <option value="Lacoste">Lacoste Polo</option>
                      <option value="Eyelet">Sport Eyelet Dry-Fit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Quantity</label>
                    <input type="number" min="0" disabled={!gpShirtCat} value={gpShirtQty || ""} onChange={(e) => setGpShirtQty(Math.max(0, parseInt(e.target.value) || 0))} className="glass-input w-full disabled:opacity-40" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Unit Price</label>
                    <input type="number" min="0" disabled={!gpShirtCat} value={gpShirtPrice || ""} onChange={(e) => setGpShirtPrice(Math.max(0, parseFloat(e.target.value) || 0))} className="glass-input w-full disabled:opacity-40" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Total Amount</label>
                    <div className="w-full bg-white/5 dark:bg-zinc-950/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-black text-gray-800 dark:text-zinc-200">
                      {currency} {gpCalculations.shirtAmt.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION E: LARGE FORMAT (Sticker & Banner) */}
              <div className="p-5 rounded-2xl bg-white/5 dark:bg-zinc-900/15 border border-white/10 space-y-4">
                <h4 className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-wider">E. Large Format Signage</h4>
                
                <div className="space-y-4">
                  {/* Stickers */}
                  <div className="grid grid-cols-12 gap-2 items-end border-b border-white/5 pb-4">
                    <div className="col-span-3 flex items-center text-xs font-black text-gray-800 dark:text-zinc-300 uppercase tracking-wider">Vinyl Stickers</div>
                    <div className="col-span-3">
                      <input type="text" placeholder="Size (e.g. 2x2ft)" value={gpStickSize} onChange={(e) => setGpStickSize(e.target.value)} className="glass-input w-full" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" placeholder="Qty" value={gpStickQty || ""} onChange={(e) => setGpStickQty(Math.max(0, parseInt(e.target.value) || 0))} className="glass-input w-full" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" step="0.01" placeholder="Amount" value={gpStickAmount || ""} onChange={(e) => setGpStickAmount(Math.max(0, parseFloat(e.target.value) || 0))} className="glass-input w-full" />
                    </div>
                  </div>

                  {/* Banners */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3 flex items-center text-xs font-black text-gray-800 dark:text-zinc-300 uppercase tracking-wider">Heavy Flex Banner</div>
                    <div className="col-span-3">
                      <input type="text" placeholder="Size (e.g. 10x4ft)" value={gpBannerSize} onChange={(e) => setGpBannerSize(e.target.value)} className="glass-input w-full" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" placeholder="Qty" value={gpBannerQty || ""} onChange={(e) => setGpBannerQty(Math.max(0, parseInt(e.target.value) || 0))} className="glass-input w-full" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" step="0.01" placeholder="Amount" value={gpBannerAmount || ""} onChange={(e) => setGpBannerAmount(Math.max(0, parseFloat(e.target.value) || 0))} className="glass-input w-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION F: DTF PRINTING */}
              <div className="p-5 rounded-2xl bg-white/5 dark:bg-zinc-900/15 border border-white/10 space-y-4">
                <h4 className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-wider">F. DTF Textile Transfer Film</h4>
                <div className="space-y-4">
                  {/* A3 */}
                  <div className="grid grid-cols-12 gap-2 items-end border-b border-white/5 pb-4">
                    <div className="col-span-3 flex items-center text-xs font-black text-gray-800 dark:text-zinc-300 uppercase tracking-wider">A3 Size Film</div>
                    <div className="col-span-3">
                      <input type="number" placeholder="Quantity" value={gpDtfA3Qty || ""} onChange={(e) => setGpDtfA3Qty(Math.max(0, parseInt(e.target.value) || 0))} className="glass-input w-full" />
                    </div>
                    <div className="col-span-3">
                      <input type="number" step="0.01" value={gpDtfA3Price} onChange={(e) => setGpDtfA3Price(Math.max(0, parseFloat(e.target.value) || 0))} className="glass-input w-full" />
                    </div>
                  </div>

                  {/* A4 */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3 flex items-center text-xs font-black text-gray-800 dark:text-zinc-300 uppercase tracking-wider">A4 Size Film</div>
                    <div className="col-span-3">
                      <input type="number" placeholder="Quantity" value={gpDtfA4Qty || ""} onChange={(e) => setGpDtfA4Qty(Math.max(0, parseInt(e.target.value) || 0))} className="glass-input w-full" />
                    </div>
                    <div className="col-span-3">
                      <input type="number" step="0.01" value={gpDtfA4Price} onChange={(e) => setGpDtfA4Price(Math.max(0, parseFloat(e.target.value) || 0))} className="glass-input w-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION G: SPECIAL SERVICES */}
              <div className="p-5 rounded-2xl bg-white/5 dark:bg-zinc-900/15 border border-white/10 space-y-4">
                <h4 className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-wider">G. Custom Special Services</h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end mb-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Service Description</label>
                    <input type="text" placeholder="e.g. Logo vector restoration" value={gpSpecialDesc} onChange={(e) => setGpSpecialDesc(e.target.value)} className="glass-input w-full" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Flat Price ({currency})</label>
                    <input type="number" value={gpSpecialAmount || ""} onChange={(e) => setGpSpecialAmount(Math.max(0, parseFloat(e.target.value) || 0))} className="glass-input w-full" />
                  </div>
                  <button type="button" onClick={addGpSpecialService} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black py-2.5 rounded-xl cursor-pointer shadow-lg shadow-blue-500/15 active:scale-95 transition-all duration-200">
                    Add Service
                  </button>
                </div>

                {gpSpecialList.length > 0 && (
                  <div className="border border-white/10 rounded-2xl bg-white/5 divide-y divide-white/5 overflow-hidden">
                    {gpSpecialList.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 text-xs">
                        <span className="font-bold text-gray-900 dark:text-zinc-200">{item.description}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-blue-600 dark:text-blue-400">{currency} {item.amount.toFixed(2)}</span>
                          <button onClick={() => removeGpSpecialService(idx)} className="text-rose-500 hover:text-rose-700 cursor-pointer p-1 rounded hover:bg-white/5">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Checkout Panel (Span 1) */}
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 shadow-xl sticky top-6 relative overflow-hidden paper-texture">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-950 dark:text-white border-b border-white/10 pb-2 mb-4 uppercase tracking-tight">
                BILLING SUMMARY
              </h3>

              <div className="space-y-4 text-xs font-semibold">
                
                <div className="flex justify-between text-gray-500 dark:text-zinc-400">
                  <span>Gross Subtotal:</span>
                  <span className="font-bold text-gray-950 dark:text-white">{currency} {gpCalculations.subtotal.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-gray-500 dark:text-zinc-400">
                    <span>Loyalty Discount ({currency}):</span>
                    <span className="text-rose-500 font-bold">- {gpDiscount.toFixed(2)}</span>
                  </div>
                  <input
                    type="number"
                    value={gpDiscount || ""}
                    onChange={(e) => setGpDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="Enter manual discount amount"
                    className="glass-input w-full text-[11px]"
                  />
                </div>

                <div className="flex justify-between text-gray-500 dark:text-zinc-400">
                  <span>Government Tax ({settings.vatRate}%):</span>
                  <span className="font-bold text-gray-950 dark:text-white">{currency} {gpCalculations.taxAmt.toFixed(2)}</span>
                </div>

                <hr className="border-white/10" />

                <div className="flex justify-between items-center text-sm font-black text-gray-950 dark:text-white pt-2">
                  <span>Grand Total:</span>
                  <span className="text-blue-600 dark:text-blue-400 text-lg font-black">
                    {currency} {gpCalculations.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={() => handleSaveGeneralOrder("prompt")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-3 text-xs font-black text-white shadow-lg shadow-blue-500/25 cursor-pointer active:scale-95 transition-all duration-200"
                >
                  <CheckCircle className="h-4 w-4" />
                  Save General Order
                </button>
              </div>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] text-blue-700 dark:text-blue-400 leading-relaxed font-black uppercase tracking-wider">
                Notice: Material Depletion Active. Real-time decrement enabled.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 3: CUSTOM JOB INTAKE FORM (MODULE 2)
          ---------------------------------------------------- */}
      {activeTab === "job-intake" && (
        <div className="max-w-3xl mx-auto glass-panel rounded-2xl p-8 space-y-6 relative overflow-hidden paper-texture shadow-xl">
          <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-base font-black text-gray-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-500" />
              Custom Contract Job Intake Form
            </h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-1">Log complex commercial contracts and custom printing commissions below.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Customer Name *</label>
              <input type="text" required value={jobCustomer} onChange={(e) => setJobCustomer(e.target.value)} placeholder="e.g. Ama Serwaa" className="glass-input w-full" />
            </div>
            <div>
              <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Phone Number *</label>
              <input type="text" value={jobPhone} onChange={(e) => setJobPhone(e.target.value)} placeholder="e.g. 0559876543" className="glass-input w-full" />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Detailed Job Description *</label>
              <textarea rows={3} value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} placeholder="Provide custom counts, paper sizes, and specific printing tech requested" className="glass-input w-full" />
            </div>

            <div>
              <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Total Agreement Price ({currency}) *</label>
              <input type="number" min="0" value={jobTotal || ""} onChange={(e) => setJobTotal(Math.max(0, parseFloat(e.target.value) || 0))} className="glass-input w-full" />
            </div>
            <div>
              <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Initial Deposit Paid ({currency})</label>
              <input type="number" min="0" value={jobDeposit || ""} onChange={(e) => setJobDeposit(Math.max(0, parseFloat(e.target.value) || 0))} className="glass-input w-full" />
            </div>

            <div>
              <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Calculated Balance Due ({currency})</label>
              <div className="w-full bg-white/5 dark:bg-zinc-950/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-black text-rose-500">
                {currency} {jobBalance.toFixed(2)}
              </div>
            </div>
            <div>
              <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Expected Delivery Date *</label>
              <input type="date" value={jobDelivery} onChange={(e) => setJobDelivery(e.target.value)} className="glass-input w-full" />
            </div>

            <div>
              <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Staff Intake Officer</label>
              <input
                disabled
                type="text"
                value={jobInitials}
                className="glass-input w-full disabled:opacity-40"
              />
              {activeUserName && (
                <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mt-1.5 block">
                  Locked to your active session: {activeUserName} — Credentials managed by Admin only
                </span>
              )}
            </div>
            <div>
              <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Payment Method</label>
              <div className="flex flex-wrap gap-3 pt-1">
                {["Cash", "Mobile Money", "Bank Transfer", "POS"].map((m) => (
                  <label key={m} className="flex items-center gap-1.5 text-xs text-gray-800 dark:text-zinc-300 font-bold cursor-pointer select-none">
                    <input type="radio" name="jobPay" checked={jobPayMethod === m} onChange={() => setJobPayMethod(m as any)} className="text-blue-600 h-4 w-4 bg-white/5 border-white/10 focus:ring-blue-500" /> {m}
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Special Instructions</label>
              <input type="text" value={jobSpecialInstructions} onChange={(e) => setJobSpecialInstructions(e.target.value)} placeholder="e.g. Must deliver with Gold Foil logo finish on sleeves." className="glass-input w-full" />
            </div>

            <div>
              <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Collection Method</label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {["Pick Up", "Shop Delivery", "Courier", "Dispatch Rider"].map((col) => (
                  <label key={col} className="flex items-center gap-1.5 text-xs text-gray-800 dark:text-zinc-300 font-bold cursor-pointer select-none">
                    <input type="radio" name="jobCol" checked={jobCollection === col} onChange={() => setJobCollection(col as any)} className="text-blue-600 h-4 w-4 bg-white/5 border-white/10 focus:ring-blue-500" /> {col}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Priority Level</label>
              <select value={jobPriority} onChange={(e) => setJobPriority(e.target.value as any)} className="glass-input w-full bg-transparent">
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
            </div>

            <div>
              <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Assigned Production Staff</label>
              <select value={jobAssigned} onChange={(e) => setJobAssigned(e.target.value)} className="glass-input w-full bg-transparent">
                {DBStore.getStaffAccounts().map((st) => (
                  <option key={st.id} value={st.name}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-white/10">
            <button
              onClick={handleSaveJob}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-black text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              Save Job & Print Invoice Card
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 4: JOB PRODUCTION KANBAN TRACKER (MODULE 3)
          ---------------------------------------------------- */}
      {activeTab === "kanban" && (
        <div className="space-y-6">
          
          {/* Real-time Animated Stage Tracker center piece */}
          {renderStageTracker()}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 glass-panel rounded-2xl p-6 relative overflow-hidden paper-texture shadow-xl">
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
            <div>
              <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse" />
                Active Kanban Production Lanes
              </h3>
              <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-1">Click on any card to focus the live animated tracker above. Shift stages below.</p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button 
                onClick={handleExportJobs}
                className="inline-flex items-center gap-1.5 bg-zinc-850 hover:bg-zinc-800 text-gray-150 border border-white/10 font-bold py-2 px-3.5 rounded-xl text-xs transition-all duration-200 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-blue-500" /> Export Jobs Spreadsheet
              </button>
              <span className="text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-xl uppercase tracking-wider">
                TOTAL CONTRACTS: {jobs.length}
              </span>
            </div>
          </div>

          {/* Kanban Columns (Horizontal Scrolling) */}
          <div className="flex overflow-x-auto gap-4 pb-6 select-none scrollbar-thin">
            {kanbanStages.map((stage) => {
              const stageJobs = jobs.filter(j => j.kanbanStage === stage);
              return (
                <div key={stage} className="min-w-[280px] w-[280px] shrink-0 glass-panel rounded-2xl p-4 flex flex-col max-h-[70vh] shadow-xl border border-white/10 bg-white/5 backdrop-blur-md">
                  
                  {/* Column Header */}
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                    <span className="text-xs font-black text-gray-900 dark:text-zinc-300 uppercase tracking-widest">{stage}</span>
                    <span className="h-5 w-5 bg-white/10 dark:bg-zinc-800 text-[10px] text-gray-800 dark:text-zinc-300 font-black rounded-full flex items-center justify-center border border-white/10">
                      {stageJobs.length}
                    </span>
                  </div>

                  {/* Cards container */}
                  <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {stageJobs.length === 0 ? (
                      <div className="h-24 border border-dashed border-white/10 rounded-2xl flex items-center justify-center text-[10px] text-gray-400 font-black uppercase tracking-widest bg-white/5">
                        Empty Lane
                      </div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {stageJobs.map((job) => {
                          const isHigh = job.priority === "High";
                          const isMed = job.priority === "Medium";
                          const isMoved = lastMovedJobId === job.id;
                          const isCurrentlyTracked = activeTrackingJob?.id === job.id;
                          
                          // Check if deadline is tomorrow or past due
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const deadline = new Date(job.expectedDeliveryDate);
                          deadline.setHours(0, 0, 0, 0);
                          const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          const isUrgent = diffDays <= 1 && diffDays >= 0;
                          const isOverdue = diffDays < 0;
                          
                          const isCompleted = job.status === "Delivered" || job.kanbanStage === "Job Completed" || job.status === "Cancelled";
                          return (
                            <motion.div
                              layout
                              initial={{ opacity: 0, scale: 0.92, y: 12 }}
                              animate={{ 
                                opacity: 1, 
                                scale: 1, 
                                y: 0,
                                zIndex: isMoved ? 10 : 1,
                              }}
                              exit={{ opacity: 0, scale: 0.92, y: -12 }}
                              transition={{ 
                                type: "spring", 
                                stiffness: 300, 
                                damping: 25,
                                layout: { type: "spring", stiffness: 260, damping: 28 }
                              }}
                              key={job.id}
                              onClick={() => setSelectedTrackingJobId(job.id)}
                              className={`relative bg-white/5 dark:bg-zinc-900/20 backdrop-blur-md rounded-2xl border p-4 shadow-lg space-y-3 hover:shadow-xl transition-all duration-200 overflow-visible cursor-pointer ${
                                isUrgent || isOverdue
                                  ? "border-rose-500 ring-2 ring-rose-500/25 shadow-lg shadow-rose-500/10 bg-rose-500/5 dark:bg-rose-950/10"
                                  : isCurrentlyTracked 
                                  ? "border-blue-500 ring-2 ring-blue-500/25 shadow-lg shadow-blue-500/5" 
                                  : isMoved
                                  ? "border-orange-500 ring-2 ring-orange-500/20 shadow-lg shadow-orange-500/5" 
                                  : "border-white/10 hover:border-white/20"
                              }`}
                            >
                              {isCurrentlyTracked && (
                                <div className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-blue-600 rounded-full border border-white dark:border-zinc-900 flex items-center justify-center shadow-md">
                                  <span className="text-[8px] text-white font-black">✓</span>
                                </div>
                              )}
                              {isMoved && (
                                <div className="absolute inset-0 pointer-events-none overflow-visible z-50">
                                  {/* CMYK Ink droplets burst */}
                                  <motion.span
                                    initial={{ x: 0, y: 0, scale: 0.5, opacity: 1 }}
                                    animate={{ x: -40, y: -60, scale: 1.3, opacity: 0 }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                    className="absolute left-1/4 top-1/2 h-3.5 w-3.5 rounded-full bg-cyan-400 blur-xs shadow-md shadow-cyan-400/50"
                                  />
                                  <motion.span
                                    initial={{ x: 0, y: 0, scale: 0.5, opacity: 1 }}
                                    animate={{ x: 45, y: -50, scale: 1.2, opacity: 0 }}
                                    transition={{ duration: 1, ease: "easeOut", delay: 0.05 }}
                                    className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full bg-pink-500 blur-xs shadow-md shadow-pink-500/50"
                                  />
                                  <motion.span
                                    initial={{ x: 0, y: 0, scale: 0.5, opacity: 1 }}
                                    animate={{ x: -20, y: -75, scale: 1.1, opacity: 0 }}
                                    transition={{ duration: 1.3, ease: "easeOut", delay: 0.1 }}
                                    className="absolute left-1/3 top-1/2 h-3.5 w-3.5 rounded-full bg-yellow-400 blur-xs shadow-md shadow-yellow-400/50"
                                  />
                                  <motion.span
                                    initial={{ x: 0, y: 0, scale: 0.5, opacity: 1 }}
                                    animate={{ x: 25, y: -80, scale: 1, opacity: 0 }}
                                    transition={{ duration: 1.4, ease: "easeOut", delay: 0.08 }}
                                    className="absolute left-2/3 top-1/2 h-2.5 w-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100 blur-xs shadow-md shadow-zinc-900/50"
                                  />
                                  <motion.span
                                    initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
                                    animate={{ x: -50, y: -30, scale: 1.1, opacity: 0 }}
                                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.12 }}
                                    className="absolute left-1/2 top-1/3 h-2 w-2 rounded-full bg-emerald-400 blur-xs shadow-md shadow-emerald-400/50"
                                  />

                                  {/* Floating geometric accents */}
                                  <motion.div
                                    initial={{ scale: 0, rotate: 0, opacity: 1 }}
                                    animate={{ scale: [0, 1.4, 0], rotate: 180, opacity: [0, 1, 0] }}
                                    transition={{ duration: 1.4, ease: "easeInOut" }}
                                    className="absolute right-4 top-4 text-amber-500 font-bold"
                                  >
                                    +
                                  </motion.div>
                                  <motion.div
                                    initial={{ scale: 0, rotate: 0, opacity: 1 }}
                                    animate={{ scale: [0, 1.3, 0], rotate: -180, opacity: [0, 1, 0] }}
                                    transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }}
                                    className="absolute left-4 bottom-4 text-blue-500 text-lg"
                                  >
                                    •
                                  </motion.div>
                                  
                                  {/* Confetti wave overlay */}
                                  <motion.div
                                    initial={{ opacity: 0.3, scale: 0.95 }}
                                    animate={{ opacity: 0, scale: 1.08 }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                    className="absolute inset-0 rounded-xl border border-blue-500 ring-4 ring-blue-500/20"
                                  />
                                </div>
                              )}

                              <div className="flex justify-between items-start gap-2">
                                <span className="font-mono text-[10px] font-black text-gray-900 dark:text-zinc-200">
                                  {job.jobNumber}
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  {isUrgent && (
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                                      URGENT
                                    </span>
                                  )}
                                  {isOverdue && (
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-red-600/20 text-red-700 dark:text-red-400 border border-red-500/30 animate-pulse">
                                      OVERDUE
                                    </span>
                                  )}
                                  <span
                                    className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                      isHigh
                                        ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                        : isMed
                                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                        : "bg-gray-500/10 text-gray-400 border border-gray-500/10"
                                    }`}
                                  >
                                    {job.priority}
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs font-black text-gray-950 dark:text-white truncate" title={job.customerName}>
                                {job.customerName}
                              </p>
                              <p className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed font-semibold">
                                {job.jobDescription}
                              </p>

                              <div className="text-[10px] text-gray-400 space-y-0.5 font-bold uppercase tracking-wide">
                                <div><span className="text-gray-500">Deadline:</span> <span className={`font-black ${isOverdue ? 'text-red-600 dark:text-red-400' : isUrgent ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>{job.expectedDeliveryDate}</span></div>
                                <div><span className="text-gray-500">Staff:</span> <span className="text-gray-900 dark:text-zinc-300 font-black">{job.assignedStaff}</span></div>
                                <div className="pt-2 flex flex-col gap-1.5 border-t border-white/5">
                                  <div className="flex justify-between text-[9px] text-gray-500">
                                    <span>Total: <strong className="text-gray-900 dark:text-zinc-200 font-black">{settings.currency} {job.totalAmount.toFixed(2)}</strong></span>
                                    <span>Paid: <strong className="text-emerald-500 font-black">{settings.currency} {job.depositPaid.toFixed(2)}</strong></span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] mt-0.5">
                                    <span>Balance Due:</span>
                                    <span className={`font-black px-2 py-0.5 rounded-lg border ${job.balance > 0 ? "text-rose-500 border-rose-500/10 bg-rose-500/10" : "text-emerald-500 border-emerald-500/10 bg-emerald-500/10"}`}>
                                      {settings.currency} {job.balance.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
                                <div className="flex gap-1">
                                  {(job.status === "Delivered" || job.kanbanStage === "Job Completed") ? (
                                    <>
                                      <button
                                        onClick={() => onOpenDocument("delivery_receipt", job)}
                                        title="Print Delivery Receipt"
                                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-600 cursor-pointer transition-colors duration-200"
                                      >
                                        <Receipt className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => onOpenDocument("waybill", job)}
                                        title="Dispatch Waybill"
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 cursor-pointer transition-colors duration-200"
                                      >
                                        <PlusCircle className="h-4 w-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => onOpenDocument("receipt", job)}
                                        title="Print Job Intake Receipt"
                                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-500 cursor-pointer transition-colors duration-200"
                                      >
                                        <Receipt className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => onOpenDocument("invoice", job)}
                                        title="Print Invoice"
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-blue-500 cursor-pointer transition-colors duration-200"
                                      >
                                        <FileText className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => {
                                      const jobTotal = job.totalAmount || 0;
                                      const paid = job.depositPaid || 0;
                                      if (!window.confirm(`Delete job ${job.jobNumber} for ${job.customerName}?\n\nThis cannot be undone. The admin will be notified in the End-of-Day report.`)) return;
                                      const refundInput = window.prompt(`Refund amount for ${job.jobNumber} (max ${settings.currency} ${paid.toFixed(2)} already paid):`, paid > 0 ? paid.toFixed(2) : "0");
                                      if (refundInput === null) return;
                                      const refund = Math.max(0, Math.min(paid, parseFloat(refundInput) || 0));
                                      DBStore.deleteJob(job.id, activeUserName, refund);
                                      onRefreshGlobalState();
                                      alert(`Job ${job.jobNumber} deleted by ${activeUserName}.${refund > 0 ? ` Refund of ${settings.currency} ${refund.toFixed(2)} recorded.` : ""} The admin has been notified for the End-of-Day report.`);
                                    }}
                                    title="Delete job / issue refund"
                                    className="px-2 py-1 rounded-xl hover:bg-rose-500/10 text-rose-500 cursor-pointer flex items-center gap-1 text-[9px] font-black border border-rose-500/20 bg-rose-500/5 transition-all duration-200"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Delete / Refund</span>
                                  </button>
                                </div>

                                {/* Stage shifter buttons */}
                                <div className="flex gap-1.5">
                                  <button
                                    disabled={kanbanStages.indexOf(stage) === 0}
                                    onClick={() => handleMoveStage(job.id, stage, "prev")}
                                    className="p-1 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                                  >
                                    <ChevronLeft className="h-3.5 w-3.5 text-gray-800 dark:text-zinc-300" />
                                  </button>
                                  <button
                                    disabled={kanbanStages.indexOf(stage) === kanbanStages.length - 1}
                                    onClick={() => handleMoveStage(job.id, stage, "next")}
                                    className="p-1 rounded-lg border border-white/10 hover:bg-white/15 disabled:opacity-30 cursor-pointer bg-white/5"
                                  >
                                    <ChevronRight className="h-3.5 w-3.5 text-gray-800 dark:text-zinc-300" />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 5: DAILY MISCELLANEOUS LEDGER (MODULE 5)
          ---------------------------------------------------- */}
      {activeTab === "misc" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-1 glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden paper-texture shadow-xl">
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
            <div className="border-b border-white/10 pb-2">
              <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                Log Minor Local Expense
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-1">Record minor office supply or logistics spends from minor desk till.</p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Expense Item Title *</label>
                <input type="text" value={miscItem} onChange={(e) => setMiscItem(e.target.value)} placeholder="Purified Drinking Water" className="glass-input w-full" />
              </div>

              <div>
                <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Amount Spent ({currency}) *</label>
                <input type="number" value={miscAmount || ""} onChange={(e) => setMiscAmount(Math.max(0, parseFloat(e.target.value) || 0))} className="glass-input w-full" />
              </div>

              <div>
                <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Expense Category Purpose</label>
                <select value={miscPurpose} onChange={(e) => setMiscPurpose(e.target.value)} className="glass-input w-full bg-transparent">
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Fuel">Fuel (Minor)</option>
                  <option value="Maintenance">Maintenance Supplies</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other Minor Expenses</option>
                </select>
              </div>

              <div>
                <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Brief Description</label>
                <input type="text" value={miscDesc} onChange={(e) => setMiscDesc(e.target.value)} placeholder="Provide quick description" className="glass-input w-full" />
              </div>

              {/* Mock File Upload */}
              <div>
                <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Receipt Upload (Optional)</label>
                <div className="border border-dashed border-white/10 rounded-2xl bg-white/5 p-4 text-center cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                  <UploadCloud className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                  <span className="text-[10px] text-gray-700 dark:text-zinc-300 font-black uppercase tracking-widest block">Click or Drag invoice image</span>
                  <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest block mt-0.5">JPG, PNG, PDF (Max 2MB)</span>
                </div>
              </div>

              <button onClick={handleSaveMisc} className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-rose-500/15 cursor-pointer active:scale-95 transition-all duration-200">
                Log Desk Expense
              </button>
            </div>
          </div>

          {/* Historical Logs List */}
          <div className="md:col-span-2 glass-panel rounded-2xl p-6 overflow-x-auto relative overflow-hidden paper-texture shadow-xl border border-white/10">
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
            <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              Minor Expenditures History (Today & Recent)
            </h3>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-black uppercase tracking-widest text-[9px]">
                  <th className="py-3">Date</th>
                  <th className="py-3">Item</th>
                  <th className="py-3">Purpose</th>
                  <th className="py-3">Staff</th>
                  <th className="py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-800 dark:text-zinc-300 font-semibold">
                {miscs.map((misc) => (
                  <tr key={misc.id} className="hover:bg-white/5 transition-colors duration-150">
                    <td className="py-3.5 font-mono text-[10px]">{misc.date}</td>
                    <td className="py-3.5 font-black text-gray-950 dark:text-white">{misc.item}</td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[9px] bg-amber-500/10 text-amber-500 font-black uppercase tracking-wider border border-amber-500/15">
                        {misc.purpose}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold">{misc.staffName}</td>
                    <td className="py-3.5 text-right font-black text-rose-500">
                      {currency} {misc.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 6: END OF DAY SALES REPORT SUBMISSION (MODULE 4)
          ---------------------------------------------------- */}
      {activeTab === "shift-report" && (
        <div className="max-w-3xl mx-auto glass-panel rounded-2xl p-8 space-y-6 relative overflow-hidden paper-texture shadow-xl">
          <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-base font-black text-gray-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-500" />
              Day-End Shift Balanced Statement (M4)
            </h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-1">Verify closing till registers, classify service groupings, and log discrepancy calculations before shift close.</p>

            {/* Auto-Calculate Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={recalculateShiftTotals}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black px-4 py-2.5 rounded-xl text-[10px] shadow-lg shadow-emerald-500/20 cursor-pointer transition-all uppercase tracking-widest active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Auto-Calculate from Today's Records
              </button>
              <span className="text-[9px] text-gray-400 font-semibold italic">
                Pulls totals from all GPO orders and Jobs created today
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
            
            {/* Left: Sales breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2">Group Categorized Sales</h4>
              
              <div className="space-y-3 font-semibold">
                {[
                  { label: "Photocopy Sales", value: shPhoto, setter: setShPhoto },
                  { label: "Printing Sales", value: shPrint, setter: setShPrint },
                  { label: "Frames Sales", value: shFrame, setter: setShFrame },
                  { label: "T-Shirts Sales", value: shShirt, setter: setShShirt },
                  { label: "Large Format Sales", value: shLarge, setter: setShLarge },
                  { label: "DTF Sales", value: shDtf, setter: setShDtf },
                  { label: "Special Services", value: shSpecial, setter: setShSpecial }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center gap-3">
                    <span className="text-gray-700 dark:text-zinc-300">{item.label}</span>
                    <input type="number" value={item.value || ""} onChange={(e) => item.setter(Math.max(0, parseFloat(e.target.value) || 0))} className="glass-input w-28 text-right font-bold" />
                  </div>
                ))}
                
                <div className="flex justify-between items-center gap-3 pt-3 border-t border-dashed border-white/10">
                  <span className="font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total System Sales:</span>
                  <span className="font-black text-gray-950 dark:text-white text-base">{currency} {shCalculations.totalSales.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Right: Payment received */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-white/10 pb-2">Actual Till Receivables</h4>
              
              <div className="space-y-3 font-semibold">
                {[
                  { label: "Cash Till Cash", value: shCash, setter: setShCash },
                  { label: "Mobile Money Wallet", value: shMomo, setter: setShMomo },
                  { label: "Bank Transfer Audits", value: shBank, setter: setShBank },
                  { label: "POS Terminal Settlement", value: shPos, setter: setShPos }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center gap-3">
                    <span className="text-gray-700 dark:text-zinc-300">{item.label}</span>
                    <input type="number" value={item.value || ""} onChange={(e) => item.setter(Math.max(0, parseFloat(e.target.value) || 0))} className="glass-input w-28 text-right font-bold" />
                  </div>
                ))}

                <div className="pt-3 border-t border-dashed border-white/10 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider text-[10px]">Total Till Receivables:</span>
                    <span className="font-black text-gray-950 dark:text-white text-sm">{currency} {shCalculations.totalReceived.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider text-[10px]">Shift Discrepancy:</span>
                    <span className={`font-black px-2.5 py-1 rounded-xl text-[10px] uppercase tracking-wider border ${
                      shCalculations.discrepancy === 0
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        : shCalculations.discrepancy > 0
                        ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                    }`}>
                      {shCalculations.discrepancy === 0 
                        ? "Balanced" 
                        : `${shCalculations.discrepancy > 0 ? "Surplus" : "Shortage"} (${currency} ${Math.abs(shCalculations.discrepancy).toFixed(2)})`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Deleted Jobs / Refunds (EOD visibility) */}
            <div className="sm:col-span-2 space-y-3 pt-4 border-t border-white/10">
              <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Jobs Deleted Today (Refunds)
              </h4>
              <DeletedJobsPanel userName={activeUserName} currency={currency} now={new Date()} />
            </div>

            {/* Footer comments and shift selection */}
            <div className="sm:col-span-2 space-y-4 pt-4 border-t border-white/10">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Shift Identifier</label>
                  <select value={shShift} onChange={(e) => setShShift(e.target.value)} className="glass-input w-full bg-transparent">
                    <option value="Day Shift">Day Shift (08:00 - 18:00)</option>
                    <option value="Night Shift">Night Shift (18:00 - 02:00)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Local Miscellaneous Spends ({currency})</label>
                  <input type="number" value={shMisc || ""} onChange={(e) => setShMisc(Math.max(0, parseFloat(e.target.value) || 0))} placeholder="Sum minor till spends" className="glass-input w-full" />
                </div>
              </div>

              <div>
                <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Shift Closing Remarks</label>
                <textarea rows={2} value={shRemarks} onChange={(e) => setShRemarks(e.target.value)} placeholder="e.g. Completed all wide format lamination. Balanced petty cash." className="glass-input w-full" />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSubmitSalesReport}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/25 cursor-pointer active:scale-95 transition-all duration-200"
                >
                  Confirm & Submit Balanced Shift Report
                </button>
              </div>
            </div>

            {/* Shift Report Submission History for Staff */}
            <div className="sm:col-span-2 pt-6 border-t border-white/10 space-y-4">
              <h3 className="text-sm font-black text-gray-955 dark:text-white uppercase tracking-tight">Shift Reports Submission History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/5 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3 rounded-l-lg">Date</th>
                      <th className="py-2.5 px-3">Shift</th>
                      <th className="py-2.5 px-3 text-right">Total Sales</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 rounded-r-lg">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reports.filter(r => r.staffName === activeUserName).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-400">No shift reports submitted yet.</td>
                      </tr>
                    ) : (
                      reports.filter(r => r.staffName === activeUserName).map((rep) => (
                        <tr key={rep.id} className="hover:bg-white/5 transition-all">
                          <td className="py-2.5 px-3 font-bold">{rep.date}</td>
                          <td className="py-2.5 px-3 font-semibold text-gray-600 dark:text-zinc-400">{rep.shift}</td>
                          <td className="py-2.5 px-3 text-right font-black">{currency} {rep.totalSales.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              rep.isApproved 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                                : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                            }`}>
                              {rep.isApproved ? "Approved" : "Pending"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-450 italic truncate max-w-[200px]" title={rep.remarks}>{rep.remarks || "No remarks"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 7: WAREHOUSE & SKU INVENTORY (MODULE 6)
          ---------------------------------------------------- */}
      {activeTab === "inventory" && (
        <div className="space-y-6">

          {editInvItem && (
            <div className="glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden paper-texture shadow-xl border border-blue-500/30">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-tight">Edit Material — {editInvItem.item}</h3>
                <button onClick={() => { setEditInvId(null); setEditInvItem(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Item Name</label>
                  <input type="text" value={editInvItem.item} onChange={(e) => setEditInvItem({ ...editInvItem, item: e.target.value })} className="w-full glass-input rounded-lg px-2 py-1.5 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Category</label>
                  <select value={editInvItem.category} onChange={(e) => setEditInvItem({ ...editInvItem, category: e.target.value as InventoryItem["category"] })} className="w-full glass-input rounded-lg px-2 py-1.5 text-gray-900 dark:text-white">
                    <option value="Printing Materials">Printing Materials</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Paper">Paper</option>
                    <option value="Ink">Ink</option>
                    <option value="DTF">DTF Material</option>
                    <option value="Apparel">Apparel Blanks</option>
                    <option value="Finishing">Finishing / Vinyl</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Opening Stock</label>
                  <input type="number" value={editInvItem.openingStock} onChange={(e) => setEditInvItem({ ...editInvItem, openingStock: Math.max(0, parseInt(e.target.value) || 0) })} className="w-full glass-input rounded-lg px-2 py-1.5 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Purchased</label>
                  <input type="number" value={editInvItem.purchased} onChange={(e) => setEditInvItem({ ...editInvItem, purchased: Math.max(0, parseInt(e.target.value) || 0) })} className="w-full glass-input rounded-lg px-2 py-1.5 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Used</label>
                  <input type="number" value={editInvItem.used} onChange={(e) => setEditInvItem({ ...editInvItem, used: Math.max(0, parseInt(e.target.value) || 0) })} className="w-full glass-input rounded-lg px-2 py-1.5 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Min Alert</label>
                  <input type="number" value={editInvItem.minimumStock} onChange={(e) => setEditInvItem({ ...editInvItem, minimumStock: Math.max(0, parseInt(e.target.value) || 0) })} className="w-full glass-input rounded-lg px-2 py-1.5 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Cost ({currency})</label>
                  <input type="number" value={editInvItem.unitCost} onChange={(e) => setEditInvItem({ ...editInvItem, unitCost: Math.max(0, parseFloat(e.target.value) || 0) })} className="w-full glass-input rounded-lg px-2 py-1.5 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Sell ({currency})</label>
                  <input type="number" value={editInvItem.sellingPrice} onChange={(e) => setEditInvItem({ ...editInvItem, sellingPrice: Math.max(0, parseFloat(e.target.value) || 0) })} className="w-full glass-input rounded-lg px-2 py-1.5 text-gray-900 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Supplier</label>
                <input type="text" value={editInvItem.supplier} onChange={(e) => setEditInvItem({ ...editInvItem, supplier: e.target.value })} className="w-full glass-input rounded-lg px-2 py-1.5 text-gray-900 dark:text-white" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleEditInventoryItem} className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black px-4 py-2 rounded-lg cursor-pointer shadow-md shadow-blue-600/10 active:scale-95 transition"><Check className="h-3 w-3" /> Save Changes</button>
                <button onClick={() => { setEditInvId(null); setEditInvItem(null); }} className="inline-flex items-center gap-1 bg-gray-500 hover:bg-gray-400 text-white text-[10px] font-black px-4 py-2 rounded-lg cursor-pointer active:scale-95 transition"><X className="h-3 w-3" /> Cancel</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Log Material Process Action (Span 1) */}
            <div className="lg:col-span-1 space-y-6">
              
              <div className="glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden paper-texture shadow-xl">
                <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
                <div className="border-b border-white/10 pb-2 flex items-center gap-2">
                  <Layers className="h-4.5 w-4.5 text-blue-500" />
                  <div>
                    <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-tight">Stock Adjustment Ledger</h3>
                    <p className="text-[11px] text-gray-450 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Log restocks, material usage, or physical counts.</p>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Select SKU Material *</label>
                    <select
                      value={invSelId}
                      onChange={(e) => {
                        const sId = e.target.value;
                        setInvSelId(sId);
                        const matched = inventoryList.find(i => i.id === sId);
                        if (matched) {
                          setInvCostPrice(matched.unitCost);
                          setInvSalePrice(matched.sellingPrice);
                          setInvSupplierName(matched.supplier);
                        }
                      }}
                      className="glass-input w-full bg-transparent"
                    >
                      <option value="">-- Choose Material Item --</option>
                      {inventoryList.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.item} ({item.remainingStock} units left)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Transaction Type *</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "restock", label: "Restock" },
                        { id: "consume", label: "Use/Waste" },
                        { id: "adjust", label: "Baseline Adjust" }
                      ].map((act) => (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => setInvAction(act.id as any)}
                          className={`py-2 px-1 text-[10px] font-black uppercase tracking-wider rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                            invAction === act.id
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-500"
                              : "border-white/10 hover:bg-white/5 text-gray-600 dark:text-zinc-400"
                          }`}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Quantity (Units) *</label>
                      <input
                        type="number"
                        value={invQty || ""}
                        onChange={(e) => setInvQty(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder="e.g. 10"
                        className="glass-input w-full font-bold"
                      />
                    </div>

                    {invAction === "restock" && (
                      <div>
                        <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Supplier Merchant</label>
                        <input
                          type="text"
                          value={invSupplierName}
                          onChange={(e) => setInvSupplierName(e.target.value)}
                          placeholder="e.g. Universal Paper"
                          className="glass-input w-full"
                        />
                      </div>
                    )}
                  </div>

                  {invAction === "restock" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Unit Cost ({currency})</label>
                        <input
                          type="number"
                          value={invCostPrice || ""}
                          onChange={(e) => setInvCostPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="glass-input w-full"
                        />
                      </div>
                      <div>
                        <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Unit Sell ({currency})</label>
                        <input
                          type="number"
                          value={invSalePrice || ""}
                          onChange={(e) => setInvSalePrice(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="glass-input w-full"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Process Remark / Reason *</label>
                    <textarea
                      rows={2}
                      value={invRemark}
                      onChange={(e) => setInvRemark(e.target.value)}
                      placeholder="Specify exact details..."
                      className="glass-input w-full"
                    />
                  </div>

                  <button
                    onClick={handleProcessInventoryAction}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 font-black text-xs shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95 transition-all duration-200 uppercase tracking-widest"
                  >
                    <Check className="h-4 w-4" /> Log Stock Action
                  </button>
                </div>
              </div>

              {/* Staff Catalog New SKU Panel */}
              <div className="glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden paper-texture shadow-xl">
                <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
                <div className="border-b border-white/10 pb-2">
                  <h3 className="text-sm font-black text-gray-950 dark:text-white uppercase tracking-tight">Catalog New Material SKU</h3>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Add a completely new raw material line to the active catalog.</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">SKU Item Name *</label>
                    <input
                      type="text"
                      value={newSkuName}
                      onChange={(e) => setNewSkuName(e.target.value)}
                      placeholder="e.g. Glossy Sticker Roll 100m"
                      className="glass-input w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Category</label>
                      <select
                        value={newSkuCat}
                        onChange={(e) => setNewSkuCat(e.target.value as any)}
                        className="glass-input w-full bg-transparent"
                      >
                        <option value="Printing Materials">Printing Materials</option>
                        <option value="Office Supplies">Office Supplies</option>
                        <option value="Paper">Paper</option>
                        <option value="Ink">Ink</option>
                        <option value="DTF">DTF Material</option>
                        <option value="Apparel">Apparel Blanks</option>
                        <option value="Finishing">Finishing / Vinyl</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Opening Stock</label>
                      <input
                        type="number"
                        value={newSkuOpenStock || ""}
                        onChange={(e) => setNewSkuOpenStock(Math.max(0, parseInt(e.target.value) || 0))}
                        className="glass-input w-full font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Cost ({currency})</label>
                      <input
                        type="number"
                        value={newSkuCost || ""}
                        onChange={(e) => setNewSkuCost(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="glass-input w-full font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Sell ({currency})</label>
                      <input
                        type="number"
                        value={newSkuSell || ""}
                        onChange={(e) => setNewSkuSell(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="glass-input w-full font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Min Alert</label>
                      <input
                        type="number"
                        value={newSkuMinStock || ""}
                        onChange={(e) => setNewSkuMinStock(Math.max(0, parseInt(e.target.value) || 0))}
                        className="glass-input w-full font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Supplier Merchant</label>
                    <input
                      type="text"
                      value={newSkuSupplier}
                      onChange={(e) => setNewSkuSupplier(e.target.value)}
                      placeholder="e.g. Shanghai DTF Tech"
                      className="glass-input w-full"
                    />
                  </div>

                  <button
                    onClick={handleStaffCreateSku}
                    className="w-full rounded-xl bg-gradient-to-r from-gray-800 to-zinc-800 hover:from-gray-700 hover:to-zinc-700 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all duration-200 cursor-pointer"
                  >
                    Catalog SKU Material
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: Material Status Board (Span 2) */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden paper-texture border border-white/10 space-y-4">
                <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-2 border-b border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full md:w-auto gap-4">
                    <div>
                      <h3 className="text-sm font-black text-gray-950 dark:text-white flex items-center gap-1.5 uppercase tracking-tight">
                        <Boxes className="h-4.5 w-4.5 text-blue-500" />
                        Active Warehouse Stock Catalog
                      </h3>
                      <p className="text-[11px] text-gray-450 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Real-time depletion index based on job triggers and manual edits.</p>
                    </div>
                    <button 
                      onClick={handleExportInventory}
                      className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-white/10 font-bold py-1.5 px-3 rounded-xl text-xs transition-all duration-200 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-emerald-500" /> Export CSV
                    </button>
                  </div>
                  
                  {/* Local Search inside Inventory */}
                  <div className="relative w-full md:w-64">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <Search className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Filter materials list..."
                      value={invSearch}
                      onChange={(e) => setInvSearch(e.target.value)}
                      className="glass-input w-full pl-9 pr-3 py-2 font-bold"
                    />
                  </div>
                </div>

                {/* Stock Warning Banners */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {inventoryList.filter(item => item.remainingStock <= item.minimumStock).length > 0 ? (
                    <div className="sm:col-span-2 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-[11px] text-rose-500 flex items-start gap-2.5 leading-relaxed font-bold uppercase tracking-wide">
                      <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span>Low Stock Alert:</span> There are materials currently running below safety thresholds. Restock immediately to prevent production blocks in your absence.
                      </div>
                    </div>
                  ) : (
                    <div className="sm:col-span-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-[11px] text-emerald-500 flex items-start gap-2.5 leading-relaxed font-bold uppercase tracking-wide">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span>Warehouse Stock Balanced:</span> All critical printing papers, films, and blank garments satisfy local safety minimums.
                      </div>
                    </div>
                  )}
                </div>

                {/* Materials List */}
                <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
                  {inventoryList
                    .filter(i => i.item.toLowerCase().includes(invSearch.toLowerCase()) || i.category.toLowerCase().includes(invSearch.toLowerCase()))
                    .map((item) => {
                      const isLow = item.remainingStock <= item.minimumStock;
                      const maxCapacity = item.openingStock + item.purchased;
                      const stockPercentage = maxCapacity > 0 ? Math.round((item.remainingStock / maxCapacity) * 100) : 0;
                      
                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-xl border transition-all duration-200 ${
                            isLow
                              ? "bg-rose-500/5 border-rose-500/20"
                              : "bg-white/5 border-white/5 hover:border-white/10"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between gap-2 text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-gray-950 dark:text-white text-sm">{item.item}</span>
                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-blue-500/10 text-blue-500 border border-blue-500/15 uppercase tracking-widest">
                                  {item.category}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest font-mono">
                                Barcode: {item.barcode} | Merchant: <span className="font-black text-gray-900 dark:text-zinc-300">{item.supplier}</span>
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                                isLow
                                  ? "bg-rose-500/15 text-rose-500 border-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/15"
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isLow ? "bg-rose-500 animate-ping" : "bg-emerald-500"}`}></span>
                                {item.remainingStock} units left
                              </span>
                              <span className="block text-[9px] text-gray-450 dark:text-zinc-500 font-bold uppercase tracking-widest mt-1 font-mono">
                                Min Alert: {item.minimumStock} units
                              </span>
                            </div>
                          </div>

                          {/* Progress bar representing remaining percentage */}
                          <div className="mt-4 space-y-1">
                            <div className="flex justify-between text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                              <span>Stock Health Indicator</span>
                              <span>{stockPercentage}%</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  isLow ? "bg-rose-500" : stockPercentage < 40 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, stockPercentage)}%` }}
                              ></div>
                            </div>
                          </div>

                           {/* Quick details sub-stats */}
                           <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] pt-3 mt-3 border-t border-white/5 text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest font-mono">
                            <div>
                              <span className="block text-[8px] text-gray-400 font-sans font-black tracking-widest">Opening Stock</span>
                              <span className="text-gray-950 dark:text-zinc-200 font-black">{item.openingStock}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-gray-400 font-sans font-black tracking-widest">Purchased (+)</span>
                              <span className="text-emerald-500 font-black">+{item.purchased}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-gray-400 font-sans font-black tracking-widest">Used (-)</span>
                              <span className="text-rose-500 font-black">-{item.used}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-gray-400 font-sans font-black tracking-widest">Prices (Cost/Sell)</span>
                              <span className="text-gray-950 dark:text-zinc-200 font-black">
                                {currency} {item.unitCost} / {currency} {item.sellingPrice}
                              </span>
                            </div>
                          </div>

                          {/* Value of materials left */}
                          <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 mt-2 border-t border-white/5 font-bold uppercase tracking-widest font-mono">
                            <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-2">
                              <span className="block text-[8px] text-amber-600 dark:text-amber-400 font-sans font-black tracking-widest">Value Left (Cost)</span>
                              <span className="text-amber-600 dark:text-amber-400 font-black">{currency} {(item.remainingStock * item.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-2">
                              <span className="block text-[8px] text-blue-600 dark:text-blue-400 font-sans font-black tracking-widest">Value Left (Sell)</span>
                              <span className="text-blue-600 dark:text-blue-400 font-black">{currency} {(item.remainingStock * item.sellingPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-3 mt-3 border-t border-white/5">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="inline-flex items-center gap-1 border border-white/10 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-white/10 dark:hover:bg-zinc-800 text-[10px] font-black px-3 py-1.5 rounded-lg backdrop-blur-md cursor-pointer transition"
                            >
                              <Pencil className="h-3 w-3 text-blue-500" />
                              Edit Material
                            </button>
                            <button
                              onClick={() => handleDeleteInventoryItem(item)}
                              className="inline-flex items-center gap-1 border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-950/30 text-[10px] font-black px-3 py-1.5 rounded-lg backdrop-blur-md cursor-pointer transition"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </button>
                          </div>

                        </div>
                      );
                    })}
                    {inventoryList.filter(i => i.item.toLowerCase().includes(invSearch.toLowerCase()) || i.category.toLowerCase().includes(invSearch.toLowerCase())).length === 0 && (
                      <div className="text-center py-10 px-4 rounded-xl border border-dashed border-white/15 bg-white/5">
                        <PackageSearch className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm font-black text-gray-600 dark:text-zinc-300">No materials in the catalog yet</p>
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1 max-w-xs mx-auto">Use the <span className="font-bold">Catalog New Material SKU</span> panel on the left to add your first material. It will appear here with its stock count and value.</p>
                      </div>
                    )}
                 </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ----------------------------------------------------
          TAB 8: STAFF TRAINING & FEATURE GUIDE
          ---------------------------------------------------- */}
      {activeTab === "learning" && (
        <div className="space-y-6">
          {/* Hero Header */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 p-8 md:p-10 shadow-xl">
            <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute bottom-[-20px] left-[-10px] h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-5">
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg backdrop-blur-sm">
                <GraduationCap className="h-9 w-9 text-white" />
              </div>
              <div className="space-y-2">
                <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                  Learning Hub
                </span>
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                  Staff Training & Feature Guide
                </h2>
                <p className="text-xs md:text-sm text-indigo-100 font-medium max-w-2xl leading-relaxed">
                  Simple, plain-English guide for every module on your terminal. Read this to understand what each button does and how to use it correctly. No technical jargon.
                </p>
              </div>
            </div>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* M1 - General Printing */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">M1 · General Printing</h3>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider mt-0.5">For walk-in customers who pay and leave</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                <strong>What it is:</strong> This is for customers who come to the counter and want a quick print, photocopy, frame, t-shirt, banner, or DTF print. They pay and take the order the same day.
                <br/><br/>
                <strong>What to do:</strong> Enter the customer name and phone number. Choose how they paid (Cash, Mobile Money, Bank Transfer, or POS). Tick the services they need and type the quantity and price. The system will calculate the total automatically. Click <strong>Generate Thermal Receipt</strong> or <strong>Generate Corporate Invoice</strong> to save the sale and print the receipt.
              </p>
              <div className="space-y-2">
                <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Step by step</p>
                <ol className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-300 list-decimal list-inside marker:font-black marker:text-indigo-500">
                  <li>Open <span className="font-bold">General Printing (M1)</span> from the left menu.</li>
                  <li>Type the customer name and phone number in the boxes provided.</li>
                  <li>Choose the payment method from the dropdown.</li>
                  <li>Tick the services needed: Photocopy, Printing, Frames, T-Shirts, Stickers/Banners, DTF, or Special Services.</li>
                  <li>Enter the quantity and price for each service.</li>
                  <li>Check the total at the bottom. Add a discount if needed.</li>
                  <li>Click <span className="font-bold">Generate Thermal Receipt</span> to save and print a receipt.</li>
                </ol>
              </div>
            </div>

            {/* M2 - Job Intake */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <ClipboardPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">M2 · Job Intake</h3>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider mt-0.5">For big custom jobs that take time</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                <strong>What it is:</strong> Use this for larger custom printing jobs that cannot be done immediately. Examples: business cards, wedding invitations, banners, stickers, t-shirts with custom designs. The customer pays a deposit now and the balance later when the job is done.
                <br/><br/>
                <strong>What to do:</strong> Enter the customer details, job description, total price, deposit paid, delivery date, and which staff member is handling it. The job will appear on the Production board so the team can track its progress.
              </p>
              <div className="space-y-2">
                <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Step by step</p>
                <ol className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-300 list-decimal list-inside marker:font-black marker:text-indigo-500">
                  <li>Open <span className="font-bold">Job Intake (M2)</span> from the left menu.</li>
                  <li>Type the customer name, phone number, and describe the job clearly.</li>
                  <li>Enter the total amount the customer will pay.</li>
                  <li>Enter the deposit amount the customer is paying right now.</li>
                  <li>Pick the expected delivery date (when the job will be ready).</li>
                  <li>Choose the payment method and collection method (Pick Up, Shop Delivery, Courier, etc.).</li>
                  <li>Select the priority (Low, Medium, High) and assign it to a staff member.</li>
                  <li>Click <span className="font-bold">Save Job & Print Invoice Card</span>. A receipt is created and the job goes to the Production board.</li>
                </ol>
              </div>
            </div>

            {/* M3 - Production / Kanban */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20">
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">M3 · Production / Kanban</h3>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Track jobs from start to finish</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                <strong>What it is:</strong> A visual board that shows every custom job and where it is in the production process. The stages are: Design → Printing → Finishing → Quality Check → Ready for Delivery → Delivered.
                <br/><br/>
                <strong>What to do:</strong> Select the job you are working on from the dropdown. When you finish one stage, click the <strong>next</strong> arrow to move it forward. If a job needs to go back, click <strong>prev</strong>. When the job reaches Delivered, a delivery receipt is printed automatically.
              </p>
              <div className="space-y-2">
                <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Step by step</p>
                <ol className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-300 list-decimal list-inside marker:font-black marker:text-indigo-500">
                  <li>Open <span className="font-bold">Production (M3)</span> from the left menu.</li>
                  <li>Select the job from the <span className="font-bold">Switch Job</span> dropdown at the top.</li>
                  <li>Look at the Kanban board. Your job is in one of the columns (Design, Printing, etc.).</li>
                  <li>When you finish your part, click the <strong>next</strong> arrow to move the job to the next stage.</li>
                  <li>If the job needs more work in the current stage, click <strong>prev</strong> to send it back.</li>
                  <li>When the job reaches Delivered/Completed, the system prints a delivery receipt automatically.</li>
                </ol>
              </div>
            </div>

            {/* M4 - End of Shift */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-500/20">
                  <ListChecks className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">M4 · End of Shift</h3>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Close the day and hand over to the next shift</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                <strong>What it is:</strong> At the end of your shift, you must submit a report showing everything you sold and all the money you collected. This helps the manager know how the day went and if any money is missing.
                <br/><br/>
                <strong>What to do:</strong> Check that all the sales numbers are correct. Confirm the cash, Mobile Money, bank, and POS amounts you received. Add any notes about the day. Submit the report before you clock out.
              </p>
              <div className="space-y-2">
                <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Step by step</p>
                <ol className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-300 list-decimal list-inside marker:font-black marker:text-indigo-500">
                  <li>Open <span className="font-bold">End of Shift (M4)</span> from the left menu when you are about to finish work.</li>
                  <li>The system shows the total sales for each service (photocopy, printing, frames, etc.). Check that these numbers are correct.</li>
                  <li>Enter the actual cash you collected in the Cash box.</li>
                  <li>Enter the Mobile Money, bank transfer, and POS amounts you received.</li>
                  <li>Add any remarks — for example, if a customer complained or if equipment broke.</li>
                  <li>Click <span className="font-bold">Submit Shift Report</span>. Your manager will review it.</li>
                </ol>
              </div>
            </div>

            {/* M5 - Daily Expenses */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">M5 · Daily Expenses</h3>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Record money you spend for the business</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                <strong>What it is:</strong> If you spend business money during the day — for example, buying lunch for a client, paying for transport, buying emergency supplies — record it here. This ensures the business does not lose track of small expenses.
                <br/><br/>
                <strong>What to do:</strong> Write what you bought, why you bought it, how much it cost, and how you paid. The expense will be deducted from the day's total sales.
              </p>
              <div className="space-y-2">
                <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Step by step</p>
                <ol className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-300 list-decimal list-inside marker:font-black marker:text-indigo-500">
                  <li>Open <span className="font-bold">Daily Expenses (M5)</span> from the left menu.</li>
                  <li>Enter the item name (e.g., Transport, Lunch, Fuel).</li>
                  <li>Write a short description of why you bought it.</li>
                  <li>Enter the amount spent.</li>
                  <li>Choose the payment method (Cash, Mobile Money, etc.).</li>
                  <li>Click <span className="font-bold">Record Expense</span>. The expense is saved and will appear in the daily report.</li>
                </ol>
              </div>
            </div>

            {/* M6 - Inventory */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                  <PackageSearch className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">M6 · Inventory</h3>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Stock control and material tracking</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                <strong>What it is:</strong> This keeps track of all materials in the shop — paper, ink, DTF film, covers, tapes, and office supplies. You can see what is in stock, what is running low, and record when new stock arrives.
                <br/><br/>
                <strong>What to do:</strong> When you use materials for a job, record it here. When new stock is delivered, add it here. The system will warn you when items are running low.
              </p>
              <div className="space-y-2">
                <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Step by step</p>
                <ol className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-300 list-decimal list-inside marker:font-black marker:text-indigo-500">
                  <li>Open <span className="font-bold">Inventory (M6)</span> from the left menu.</li>
                  <li>Use <span className="font-bold">Stock Adjustment Ledger</span> to update stock. Choose Restock (new delivery), Use/Waste (materials used for jobs), or Baseline Adjust (correcting stock errors).</li>
                  <li>When restocking, enter the quantity, supplier name, and cost.</li>
                  <li>When using materials, enter how much you used and for which job.</li>
                  <li>To add a completely new material, use <span className="font-bold">Catalog New Material</span> and fill in the details.</li>
                  <li>Watch for low-stock alerts — they tell you when to reorder.</li>
                </ol>
              </div>
            </div>

            {/* Clock In / Clock Out */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Attendance · Clock In / Clock Out</h3>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Record your start and end time</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                <strong>What it is:</strong> At the start of your shift, click <strong>Clock In</strong>. At the end of your shift, click <strong>Clock Out</strong>. This records the exact time you arrived and left. The manager can see this report to track attendance and punctuality.
                <br/><br/>
                <strong>Important:</strong> Always clock in when you arrive and clock out before you leave. If you forget, the system will not know you were at work.
              </p>
              <div className="space-y-2">
                <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Step by step</p>
                <ol className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-300 list-decimal list-inside marker:font-black marker:text-indigo-500">
                  <li>Go to the <span className="font-bold">Overview</span> tab on your dashboard.</li>
                  <li>Scroll down to the <span className="font-bold">Attendance</span> panel.</li>
                  <li>When you arrive at work, click the green <span className="font-bold">Clock In</span> button.</li>
                  <li>The system will show your clock-in time.</li>
                  <li>When you are leaving, click the red <span className="font-bold">Clock Out</span> button.</li>
                  <li>The system records both times and sends a notification to the manager.</li>
                </ol>
              </div>
            </div>

          </div>

          {/* Footer Tip */}
          <div className="flex items-center gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
            <BookOpen className="h-5 w-5 text-indigo-500 shrink-0" />
            <p className="text-xs text-gray-600 dark:text-zinc-300 font-medium leading-relaxed">
              Remember: Every action you take is recorded. If you are unsure about anything, ask your manager before processing a customer transaction. It is better to ask than to make a mistake.
            </p>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          GLOBAL MODAL: RECORD INCREMENTAL PAYMENT & HISTORY
          ---------------------------------------------------- */}
      <AnimatePresence>
        {selectedPaymentJob && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setSelectedPaymentJob(null)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 overflow-hidden z-10 font-sans"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedPaymentJob(null)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer transition"
              >
                <X className="h-4 w-4" />
              </button>

              {/* LEFT SECTION: Summary & Historical Ledger */}
              <div className="flex-1 space-y-5">
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded">
                    Job Details & Payment Ledger
                  </span>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mt-2">
                    {selectedPaymentJob.jobNumber} — {selectedPaymentJob.customerName}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                    {selectedPaymentJob.jobDescription}
                  </p>
                </div>

                {/* Financial Health Indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50/50 dark:bg-zinc-950/40 border border-gray-100 dark:border-zinc-800/80 p-3 rounded-xl text-center">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total Price</span>
                    <span className="text-sm font-black text-gray-800 dark:text-zinc-100 mt-1 block">
                      {settings.currency} {selectedPaymentJob.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-emerald-50/25 dark:bg-emerald-950/10 border border-emerald-100/40 dark:border-emerald-900/10 p-3 rounded-xl text-center">
                    <span className="block text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Total Paid</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                      {settings.currency} {selectedPaymentJob.depositPaid.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-rose-50/25 dark:bg-rose-950/10 border border-rose-100/40 dark:border-rose-900/10 p-3 rounded-xl text-center">
                    <span className="block text-[9px] font-bold text-rose-500 uppercase tracking-wider">Balance Due</span>
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400 mt-1 block">
                      {settings.currency} {selectedPaymentJob.balance.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Job Details Specifications Card */}
                <div className="bg-gray-50/40 dark:bg-zinc-950/30 border border-gray-100/70 dark:border-zinc-800/50 p-4 rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800/50 pb-1.5">
                    <span className="font-extrabold text-gray-400 dark:text-zinc-500 uppercase text-[9px] tracking-wider">Job Specifications</span>
                    <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${
                      selectedPaymentJob.priority === "High" 
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100/30" 
                        : selectedPaymentJob.priority === "Medium" 
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100/30" 
                        : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {selectedPaymentJob.priority} Priority
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-gray-400 dark:text-zinc-500 block text-[9px] uppercase font-bold">Assigned Staff</span>
                      <span className="font-bold text-gray-800 dark:text-zinc-200">{selectedPaymentJob.assignedStaff || "Unassigned"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-zinc-500 block text-[9px] uppercase font-bold">Expected Hand-off</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{selectedPaymentJob.expectedDeliveryDate}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-zinc-500 block text-[9px] uppercase font-bold">Logistics Collection</span>
                      <span className="font-bold text-gray-800 dark:text-zinc-200">{selectedPaymentJob.collectionMethod || "Pick Up"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-zinc-500 block text-[9px] uppercase font-bold">Customer Phone</span>
                      <a href={`tel:${selectedPaymentJob.customerPhone}`} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">{selectedPaymentJob.customerPhone || "N/A"}</a>
                    </div>
                  </div>
                  {selectedPaymentJob.specialInstructions && (
                    <div className="pt-2 border-t border-gray-100 dark:border-zinc-800/40">
                      <span className="text-gray-400 dark:text-zinc-500 block text-[9px] uppercase font-bold">Special Instructions / Brief</span>
                      <p className="text-[10px] text-gray-600 dark:text-zinc-300 italic mt-0.5 leading-relaxed">
                        "{selectedPaymentJob.specialInstructions}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Historical Ledger Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <History className="h-3.5 w-3.5 text-indigo-500" />
                    Payment History Logs ({selectedPaymentJob.paymentHistory?.length || 0})
                  </h4>

                  <div className="border border-gray-100 dark:border-zinc-800/60 rounded-xl overflow-hidden max-h-[180px] overflow-y-auto divide-y divide-gray-50 dark:divide-zinc-800/50 bg-gray-50/20 dark:bg-zinc-950/20">
                    {!selectedPaymentJob.paymentHistory || selectedPaymentJob.paymentHistory.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400 font-medium italic">
                        No payments logged. Check initial intake deposit details.
                      </div>
                    ) : (
                      selectedPaymentJob.paymentHistory.map((record, idx) => (
                        <div key={record.id || idx} className="p-3 text-xs flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-900/60 transition">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                + {settings.currency} {record.amountPaid.toFixed(2)}
                              </span>
                              <span className="text-[10px] bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded font-medium text-gray-500 dark:text-zinc-400">
                                {record.paymentMethod}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400">
                              <Clock className="h-3 w-3 inline text-gray-300 dark:text-zinc-600" />
                              <span>{record.timestamp}</span>
                            </div>
                          </div>
                          <div className="text-right text-[10px] text-gray-500">
                            <span className="font-semibold block text-gray-700 dark:text-zinc-300">Received By</span>
                            <span>{record.receivedBy}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT SECTION: Record New Payment Form */}
              <div className="w-full md:w-[320px] shrink-0 border-t md:border-t-0 md:border-l border-gray-100 dark:border-zinc-800 pt-6 md:pt-0 md:pl-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-850 dark:text-white uppercase tracking-wider">
                      Record New Installment
                    </h4>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500">Add client payment to reduce the total balance.</p>
                  </div>

                  {/* Payment Input */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1">
                      Payment Amount ({settings.currency})
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold text-xs pointer-events-none">
                        {settings.currency}
                      </span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        disabled={selectedPaymentJob.balance <= 0}
                        placeholder={selectedPaymentJob.balance <= 0 ? "Fully Paid" : "e.g. 500"}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full text-xs font-bold pl-12 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 dark:text-white outline-hidden focus:border-indigo-500 disabled:opacity-50"
                      />
                    </div>
                    {/* Dynamic Balance Calculator Display */}
                    {selectedPaymentJob.balance > 0 && (
                      <div className="mt-1.5 flex justify-between items-center bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/20 dark:border-indigo-900/20 px-2.5 py-1.5 rounded-lg text-[10px]">
                        <span className="font-semibold text-gray-400 dark:text-zinc-500">Dynamic Balance:</span>
                        <span className={`font-black ${
                          Math.max(0, selectedPaymentJob.balance - (parseFloat(paymentAmount) || 0)) === 0 
                            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1 rounded" 
                            : "text-indigo-600 dark:text-indigo-400"
                        }`}>
                          {settings.currency} {Math.max(0, selectedPaymentJob.balance - (parseFloat(paymentAmount) || 0)).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quick Payment Fillers */}
                  {selectedPaymentJob.balance > 0 && (
                    <div className="space-y-1">
                      <span className="block text-[8px] font-bold text-gray-400 uppercase">Quick Fillers:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[50, 100, 200, 500].map((quickVal) => (
                          <button
                            key={quickVal}
                            type="button"
                            disabled={quickVal > selectedPaymentJob.balance}
                            onClick={() => setPaymentAmount(String(Math.min(quickVal, selectedPaymentJob.balance)))}
                            className="text-[10px] font-extrabold px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 border border-gray-150 dark:border-zinc-700/50 dark:text-white disabled:opacity-30 cursor-pointer transition"
                          >
                            +{quickVal}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(selectedPaymentJob.balance.toFixed(2))}
                          className="text-[10px] font-extrabold px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-100/40 dark:border-indigo-900/30 cursor-pointer transition"
                        >
                          Pay All
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Custom Date & Time Entry */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full text-xs font-bold px-2 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 dark:text-white outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1">
                        Time
                      </label>
                      <input
                        type="time"
                        value={paymentTime}
                        onChange={(e) => setPaymentTime(e.target.value)}
                        className="w-full text-xs font-bold px-2 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 dark:text-white outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1.5">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {["Cash", "Mobile Money", "Bank Transfer", "POS"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m as any)}
                          className={`text-[10px] font-bold py-1.5 px-2 rounded-lg border transition text-center cursor-pointer ${
                            paymentMethod === m
                              ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-extrabold"
                              : "border-gray-100 dark:border-zinc-800/80 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Receiving Staff dropdown */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-1">
                      Received By (Staff Account)
                    </label>
                    <select
                      disabled={!!activeUserName}
                      value={paymentStaff}
                      onChange={(e) => setPaymentStaff(e.target.value)}
                      className="w-full text-xs font-bold rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-gray-500 dark:text-zinc-400 px-3 py-2 outline-hidden focus:border-indigo-500 disabled:opacity-90 disabled:cursor-not-allowed"
                    >
                      {DBStore.getStaffAccounts().map((st) => (
                        <option key={st.id} value={st.name}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                    {activeUserName && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 block">
                        Locked to your logged-in active session: {activeUserName} — Credentials managed by Admin only
                      </span>
                    )}
                  </div>

                  {/* Status Banner Messages */}
                  {paymentError && (
                    <div className="p-2 text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                      {paymentError}
                    </div>
                  )}

                  {paymentSuccess && (
                    <div className="p-2 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                      {paymentSuccess}
                    </div>
                  )}
                </div>

                {/* Form Action */}
                <div className="pt-4 mt-4 border-t border-gray-50 dark:border-zinc-800/60">
                  {selectedPaymentJob.balance <= 0 ? (
                    <div className="w-full text-center py-2 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                      Fully Settled Ledger
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRecordPayment}
                      className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-black text-white shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 cursor-pointer transition text-center uppercase tracking-wider"
                    >
                      Record payment & Save
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* General Order Receipt Prompt Modal */}
      {showGpReceiptPrompt && pendingGpOrderData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">General Order Saved</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                {pendingGpOrderData.orderNumber} — {currency} {pendingGpOrderData.grandTotal.toFixed(2)}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-800 dark:text-white text-center">
                Would you like to generate a receipt?
              </p>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Select Document Type</label>
                <select
                  value={gpReceiptType}
                  onChange={(e) => setGpReceiptType(e.target.value as any)}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-white font-semibold"
                >
                  <option value="receipt">Receipt</option>
                  <option value="invoice">Invoice</option>
                  <option value="waybill">Waybill</option>
                  <option value="delivery_receipt">Delivery Receipt</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleGpReceiptConfirm}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3 text-xs shadow-lg active:scale-95 cursor-pointer transition-all uppercase tracking-widest"
                >
                  Yes, Print
                </button>
                <button
                  onClick={handleGpReceiptCancel}
                  className="rounded-xl border border-white/10 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 hover:bg-white/60 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-black py-3 text-xs active:scale-95 cursor-pointer transition-all uppercase tracking-widest"
                >
                  No, Thanks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
