/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  TrendingUp,
  CircleDollarSign,
  Briefcase,
  AlertTriangle,
  History,
  Settings,
  ShieldCheck,
  PlusCircle,
  Download,
  Boxes,
  FileCheck2,
  Trash2,
  FileText,
  RefreshCw,
  QrCode,
  DollarSign,
  UserCheck,
  Clock,
  Key,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  CheckCircle,
  BookOpen,
  X
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { DBStore } from "../dbStore";
import { CompanySettings, Expenditure, InventoryItem, UserRole, StaffAccount, StaffNote, Contact } from "../types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AdminDashboardProps {
  settings: CompanySettings;
  onUpdateSettings: (settings: CompanySettings) => void;
  onRefreshGlobalState: () => void;
  onOpenDocument: (type: "invoice" | "receipt" | "waybill" | "delivery_receipt", data: any) => void;
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
  refreshTrigger?: number;
}

export default function AdminDashboard({
  settings,
  onUpdateSettings,
  onRefreshGlobalState,
  onOpenDocument,
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  refreshTrigger = 0
}: AdminDashboardProps) {
  const [internalAdminTab, setInternalAdminTab] = useState<"overview" | "expenditures" | "sales-reports" | "statistics" | "inventory" | "eod" | "audit" | "security" | "late-notes" | "broadcast" | "settings">("overview");

  const adminTab = (propActiveTab as any) || internalAdminTab;
  const setAdminTab = propSetActiveTab || setInternalAdminTab;

  // Load live DB stores reactively
  const jobs = useMemo(() => DBStore.getJobs(), [refreshTrigger]);
  const orders = useMemo(() => DBStore.getGeneralPrintingOrders(), [refreshTrigger]);
  const expenditures = useMemo(() => DBStore.getExpenditures(), [refreshTrigger]);
  const miscs = useMemo(() => DBStore.getDailyMiscellaneous(), [refreshTrigger]);
  const reports = useMemo(() => DBStore.getDailySalesReports(), [refreshTrigger]);
  const inventory = useMemo(() => DBStore.getInventory(), [refreshTrigger]);
  const logs = useMemo(() => DBStore.getAuditLogs(), [refreshTrigger]);

  // New state for Ledger Back and Forth Reconciliations
  const [ledgerPeriod, setLedgerPeriod] = useState<"day" | "week" | "month">("month"); // default monthly for admin
  const [ledgerOffset, setLedgerOffset] = useState<number>(0);

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

    expenditures.forEach(e => {
      txs.push({
        id: e.id,
        date: e.date,
        timestamp: `${e.date} 12:00`,
        ref: `Expense: ${e.item}`,
        customer: `Supplier: ${e.supplier} (${e.category})`,
        amount: e.amount,
        paymentMethod: "Cash Outflow",
        staff: "Admin",
        type: "Admin Expenditure",
        isExpense: true
      });
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
  }, [orders, jobs, expenditures, miscs]);

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

  const [auditSearch, setAuditSearch] = useState("");
  const [auditModuleFilter, setAuditModuleFilter] = useState("All");

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.details.toLowerCase().includes(auditSearch.toLowerCase());
      
      let matchesModule = false;
      const mLower = log.module.toLowerCase();
      if (auditModuleFilter === "All") {
        matchesModule = true;
      } else if (auditModuleFilter === "Inventory") {
        matchesModule = mLower.includes("inventory") || mLower.includes("stock");
      } else if (auditModuleFilter === "Jobs") {
        matchesModule = mLower.includes("job");
      } else if (auditModuleFilter === "Sales") {
        matchesModule = 
          mLower.includes("sales") || 
          mLower.includes("shift") || 
          mLower.includes("general") ||
          mLower.includes("printing") ||
          mLower.includes("misc");
      } else if (auditModuleFilter === "Auth") {
        matchesModule = mLower.includes("security") || mLower.includes("auth");
      } else if (auditModuleFilter === "Settings") {
        matchesModule = mLower.includes("settings") || mLower.includes("setup");
      } else {
        matchesModule = mLower === auditModuleFilter.toLowerCase();
      }
      
      return matchesSearch && matchesModule;
    });
  }, [logs, auditSearch, auditModuleFilter]);

  const currency = settings.currency || "GHS";

  // ----------------------------------------------------
  // ADMIN KPI METRICS
  // ----------------------------------------------------
  const kpi = useMemo(() => {
    // Total Revenue = General Orders Grand Total + Job Deposits + Job Balances paid
    const ordersRev = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const jobsRev = jobs.reduce((sum, j) => sum + j.depositPaid, 0);
    // Supposing outstanding balances are not fully paid yet
    const grossRevenue = ordersRev + jobsRev;

    // Expenditures overhead
    const totalExpenses = expenditures.reduce((sum, e) => sum + e.amount, 0) + miscs.reduce((sum, m) => sum + m.amount, 0);
    const netProfit = grossRevenue - totalExpenses;

    const outstandingBalances = jobs.reduce((sum, j) => sum + j.balance, 0);
    const pendingJobs = jobs.filter(j => j.status !== "Delivered" && j.status !== "Cancelled").length;
    const completedJobs = jobs.filter(j => j.status === "Ready" || j.status === "Delivered").length;

    // Monthly expenditure total
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const monthlyExpenses = expenditures
      .filter(e => e.date.startsWith(currentMonth))
      .reduce((sum, e) => sum + e.amount, 0) + 
      miscs.filter(m => m.date.startsWith(currentMonth))
      .reduce((sum, m) => sum + m.amount, 0);

    return {
      grossRevenue,
      totalExpenses,
      netProfit,
      outstandingBalances,
      pendingJobs,
      completedJobs,
      monthlyExpenses
    };
  }, [jobs, orders, expenditures, miscs]);


  // ----------------------------------------------------
  // ANALYTICS GRAPH DATA PREPARATION
  // ----------------------------------------------------
  const chartSalesData = useMemo(() => {
    const today = new Date();
    const days: { name: string; date: string; Sales: number; Expenses: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });

      const daySales = orders
        .filter(o => o.date === dateStr)
        .reduce((sum, o) => sum + o.grandTotal, 0) +
        jobs
        .filter(j => j.date === dateStr)
        .reduce((sum, j) => sum + j.depositPaid, 0);

      const dayExpenses = expenditures
        .filter(e => e.date === dateStr)
        .reduce((sum, e) => sum + e.amount, 0) +
        miscs
        .filter(m => m.date === dateStr)
        .reduce((sum, m) => sum + m.amount, 0);

      days.push({ name: dayName, date: dateStr, Sales: daySales, Expenses: dayExpenses });
    }

    return days.map(d => ({ name: d.name, Sales: d.Sales, Expenses: d.Expenses }));
  }, [orders, expenditures, miscs, jobs]);

  const serviceBreakdown = useMemo(() => {
    const jobs = DBStore.getJobs();
    const gpos = DBStore.getGeneralPrintingOrders();
    const categoryTotals: Record<string, number> = {};

    // Aggregate from Jobs (based on jobDescription keywords)
    jobs.forEach(job => {
      const desc = job.jobDescription.toLowerCase();
      let category = "Other Services";
      if (desc.includes("t-shirt") || desc.includes("tshirt") || desc.includes("apparel") || desc.includes("garment")) {
        category = "T-Shirts Apparel";
      } else if (desc.includes("banner") || desc.includes("large format") || desc.includes("poster") || desc.includes("signage")) {
        category = "Large Format Banners";
      } else if (desc.includes("dtf") || desc.includes("film") || desc.includes("transfer")) {
        category = "DTF Custom Films";
      } else if (desc.includes("frame") || desc.includes("framing") || desc.includes("wooden")) {
        category = "Wooden Frames";
      } else if (desc.includes("photocopy") || desc.includes("printing") || desc.includes("document") || desc.includes("copy")) {
        category = "Photocopy & Printing";
      } else if (desc.includes("card") || desc.includes("business card") || desc.includes("flyer") || desc.includes("brochure")) {
        category = "Photocopy & Printing";
      }
      categoryTotals[category] = (categoryTotals[category] || 0) + job.totalAmount;
    });

    // Aggregate from GPOs (using detailed breakdowns)
    gpos.forEach(gpo => {
      if (gpo.tshirt?.amount > 0) categoryTotals["T-Shirts Apparel"] = (categoryTotals["T-Shirts Apparel"] || 0) + gpo.tshirt.amount;
      if (gpo.largeFormat?.sticker?.amount > 0) categoryTotals["Large Format Banners"] = (categoryTotals["Large Format Banners"] || 0) + gpo.largeFormat.sticker.amount;
      if (gpo.largeFormat?.banner?.amount > 0) categoryTotals["Large Format Banners"] = (categoryTotals["Large Format Banners"] || 0) + gpo.largeFormat.banner.amount;
      if (gpo.dtf?.a3?.amount > 0) categoryTotals["DTF Custom Films"] = (categoryTotals["DTF Custom Films"] || 0) + gpo.dtf.a3.amount;
      if (gpo.dtf?.a4?.amount > 0) categoryTotals["DTF Custom Films"] = (categoryTotals["DTF Custom Films"] || 0) + gpo.dtf.a4.amount;
      if (gpo.frame?.amount > 0) categoryTotals["Wooden Frames"] = (categoryTotals["Wooden Frames"] || 0) + gpo.frame.amount;
      if (gpo.photocopy?.amount > 0) categoryTotals["Photocopy & Printing"] = (categoryTotals["Photocopy & Printing"] || 0) + gpo.photocopy.amount;
      if (gpo.printing?.amount > 0) categoryTotals["Photocopy & Printing"] = (categoryTotals["Photocopy & Printing"] || 0) + gpo.printing.amount;
      gpo.specialServices?.forEach(s => {
        categoryTotals["Special Services"] = (categoryTotals["Special Services"] || 0) + s.amount;
      });
    });

    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    const colors = [
      "bg-indigo-600", "bg-emerald-500", "bg-amber-500", 
      "bg-indigo-400", "bg-rose-500", "bg-purple-500", "bg-cyan-500"
    ];

    return Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, value], idx) => ({
        name,
        value: Math.round((value / total) * 100),
        color: colors[idx % colors.length]
      }));
  }, [refreshTrigger]);

  const paymentBreakdown = useMemo(() => {
    const jobs = DBStore.getJobs();
    const gpos = DBStore.getGeneralPrintingOrders();
    const paymentTotals: Record<string, number> = {};

    [...jobs, ...gpos].forEach(item => {
      const method = item.paymentMethod;
      const amount = 'grandTotal' in item ? item.grandTotal : item.totalAmount;
      paymentTotals[method] = (paymentTotals[method] || 0) + amount;
    });

    const total = Object.values(paymentTotals).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    const colorMap: Record<string, string> = {
      "Mobile Money": "bg-indigo-600",
      "Cash": "bg-emerald-500",
      "POS": "bg-rose-500",
      "Bank Transfer": "bg-amber-500"
    };

    return Object.entries(paymentTotals)
      .sort(([,a], [,b]) => b - a)
      .map(([name, value]) => ({
        name,
        value: Math.round((value / total) * 100),
        color: colorMap[name] || "bg-gray-500"
      }));
  }, [refreshTrigger]);

  // ----------------------------------------------------
  // COMPREHENSIVE MONTHLY ANALYTICS (for Reports + Statistics)
  // ----------------------------------------------------
  const monthAnalytics = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthJobs = jobs.filter(j => j.date.startsWith(currentMonth));
    const monthOrders = orders.filter(o => o.date.startsWith(currentMonth));
    const monthExps = expenditures.filter(e => e.date.startsWith(currentMonth));
    const monthMiscs = miscs.filter(m => m.date.startsWith(currentMonth));

    // Revenue = order totals + job deposits
    const revenue = monthOrders.reduce((s, o) => s + o.grandTotal, 0) + monthJobs.reduce((s, j) => s + j.depositPaid, 0);
    const expenses = monthExps.reduce((s, e) => s + e.amount, 0) + monthMiscs.reduce((s, m) => s + m.amount, 0);
    const profit = revenue - expenses;
    const outstanding = monthJobs.reduce((s, j) => s + j.balance, 0);

    // Staff attendance / late
    const staffAttendanceList = DBStore.getStaffAttendance();
    const staffNotesList = DBStore.getStaffNotes();
    const monthAttendance = staffAttendanceList.filter(a => a.date.startsWith(currentMonth));
    const monthLateNotes = staffNotesList.filter(n => n.date.startsWith(currentMonth) && n.sessionType === "Late Arrival");
    const totalLate = monthLateNotes.length;
    const totalSessions = monthAttendance.length;

    // Daily revenue trend (across the month)
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const daily: { day: string; Revenue: number; Expenses: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${currentMonth}-${String(d).padStart(2, "0")}`;
      const r = monthOrders.filter(o => o.date === ds).reduce((s, o) => s + o.grandTotal, 0)
        + monthJobs.filter(j => j.date === ds).reduce((s, j) => s + j.depositPaid, 0);
      const e = monthExps.filter(x => x.date === ds).reduce((s, x) => s + x.amount, 0)
        + monthMiscs.filter(m => m.date === ds).reduce((s, m) => s + m.amount, 0);
      if (r > 0 || e > 0) daily.push({ day: String(d), Revenue: r, Expenses: e });
    }

    // Jobs per day (line)
    const jobsPerDay: { day: string; Jobs: number }[] = daily.map(d => ({
      day: d.day,
      Jobs: monthJobs.filter(j => j.date === `${currentMonth}-${d.day.padStart(2, "0")}`).length
    }));

    // Service channel breakdown with percentages
    const photocopy = monthOrders.reduce((s, o) => s + (o.photocopy?.amount || 0), 0);
    const printing = monthOrders.reduce((s, o) => s + (o.printing?.amount || 0), 0);
    const frames = monthOrders.reduce((s, o) => s + (o.frame?.amount || 0), 0);
    const tshirts = monthOrders.reduce((s, o) => s + (o.tshirt?.amount || 0), 0);
    const largeFormat = monthOrders.reduce((s, o) => s + (o.largeFormat?.sticker?.amount || 0) + (o.largeFormat?.banner?.amount || 0), 0);
    const dtf = monthOrders.reduce((s, o) => s + (o.dtf?.a3?.amount || 0) + (o.dtf?.a4?.amount || 0), 0);
    const special = monthOrders.reduce((s, o) => s + (o.specialServices || []).reduce((a: number, b: any) => a + (b.amount || 0), 0), 0);
    const channelsRaw = [
      { name: "Photocopy", value: photocopy },
      { name: "Color Printing", value: printing },
      { name: "Framing", value: frames },
      { name: "T-Shirts", value: tshirts },
      { name: "Large Format", value: largeFormat },
      { name: "DTF Films", value: dtf },
      { name: "Special", value: special }
    ].filter(c => c.value > 0);
    const channelsTotal = channelsRaw.reduce((s, c) => s + c.value, 0) || 1;
    const channelColors = ["#6366F1", "#10B981", "#F59E0B", "#EC4899", "#0EA5E9", "#8B5CF6", "#F97316"];
    const serviceChannels = channelsRaw.map((c, i) => ({
      name: c.name,
      value: c.value,
      pct: (c.value / channelsTotal) * 100,
      color: channelColors[i % channelColors.length]
    }));

    // Job performance metrics
    const completedJobs = monthJobs.filter(j => j.status === "Ready" || j.status === "Delivered").length;
    const completionRate = monthJobs.length ? (completedJobs / monthJobs.length) * 100 : 0;
    const avgJobValue = monthJobs.length ? monthJobs.reduce((s, j) => s + j.totalAmount, 0) / monthJobs.length : 0;

    const jobsByStaff: { staff: string; count: number; value: number }[] = [];
    monthJobs.forEach(j => {
      const key = j.assignedStaff || "Unassigned";
      let entry = jobsByStaff.find(x => x.staff === key);
      if (!entry) { entry = { staff: key, count: 0, value: 0 }; jobsByStaff.push(entry); }
      entry.count += 1;
      entry.value += j.totalAmount;
    });

    const jobsByPriority = ["High", "Medium", "Low"].map(p => ({
      priority: p,
      count: monthJobs.filter(j => j.priority === p).length
    }));

    // Expenditure analysis
    const categoryBreakdown: { category: string; amount: number }[] = [];
    [...monthExps, ...monthMiscs.map(m => ({ category: "Miscellaneous", amount: m.amount } as any))].forEach((e: any) => {
      const cat = e.category || "Other";
      let entry = categoryBreakdown.find(x => x.category === cat);
      if (!entry) { entry = { category: cat, amount: 0 }; categoryBreakdown.push(entry); }
      entry.amount += e.amount;
    });
    categoryBreakdown.sort((a, b) => b.amount - a.amount);

    const supplierTotals: Record<string, number> = {};
    monthExps.forEach(e => {
      const sup = e.supplier || "Unspecified";
      supplierTotals[sup] = (supplierTotals[sup] || 0) + e.amount;
    });
    const topSuppliers = Object.entries(supplierTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    // Staff performance
    const staffPerformance: { staff: string; late: number; sessions: number; jobs: number; reports: number }[] = [];
    const staffAccountsList = DBStore.getStaffAccounts();
    const allStaffNames = staffAccountsList.map(s => s.name);
    const uniqueStaff = Array.from(new Set([...allStaffNames, ...monthJobs.map(j => j.assignedStaff), ...monthLateNotes.map(n => n.staffName), ...monthAttendance.map(a => a.staffName)]));
    uniqueStaff.forEach(name => {
      if (!name) return;
      staffPerformance.push({
        staff: name,
        late: monthLateNotes.filter(n => n.staffName === name).length,
        sessions: monthAttendance.filter(a => a.staffName === name).length,
        jobs: monthJobs.filter(j => j.assignedStaff === name).length,
        reports: reports.filter(r => r.staffName === name && r.date.startsWith(currentMonth)).length
      });
    });

    // Inventory status
    const lowStock = inventory.filter(i => i.remainingStock <= i.minimumStock);
    const materialsUsed = inventory.reduce((s, i) => s + i.used, 0);

    return {
      currentMonth,
      monthJobs,
      monthOrders,
      revenue,
      expenses,
      profit,
      outstanding,
      totalLate,
      totalSessions,
      daily,
      jobsPerDay,
      serviceChannels,
      channelsTotal,
      completedJobs,
      completionRate,
      avgJobValue,
      jobsByStaff,
      jobsByPriority,
      categoryBreakdown,
      topSuppliers,
      staffPerformance,
      lowStock,
      materialsUsed
    };
  }, [jobs, orders, expenditures, miscs, reports, inventory, refreshTrigger]);


  // ----------------------------------------------------
  // STATE FOR EXPENDITURES MODULE (ADMIN)
  // ----------------------------------------------------
  const [expItem, setExpItem] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expSupplier, setExpSupplier] = useState("");
  const [expQty, setExpQty] = useState(1);
  const [expPrice, setExpPrice] = useState(0);
  const [expCat, setExpCat] = useState<Expenditure["category"]>("Printing Materials");

  const expAmount = expQty * expPrice;

  const handleSaveExpenditure = () => {
    if (!expItem.trim() || expAmount <= 0) {
      alert("Please ensure the item name is filled and amount is greater than zero.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    DBStore.addExpenditure({
      date: todayStr,
      item: expItem,
      description: expDesc,
      supplier: expSupplier || "Generic Supplier",
      quantity: expQty,
      unitPrice: expPrice,
      amount: expAmount,
      category: expCat
    }, "Admin");

    // Clear Form
    setExpItem("");
    setExpDesc("");
    setExpSupplier("");
    setExpQty(1);
    setExpPrice(0);

    onRefreshGlobalState();
    alert("Expenditure recorded successfully!");
  };

  const handleDeleteExpenditure = (id: string) => {
    if (confirm("Are you sure you want to permanently delete this expenditure?")) {
      DBStore.deleteExpenditure(id, "Admin");
      onRefreshGlobalState();
    }
  };


  // ----------------------------------------------------
  // MONTHLY SALES REPORT COMPILATION
  // ----------------------------------------------------
  const salesReportData = useMemo(() => {
    // Collate category sums
    let photocopy = 0;
    let printing = 0;
    let frames = 0;
    let tshirts = 0;
    let largeFormat = 0;
    let dtf = 0;
    let special = 0;

    orders.forEach(o => {
      photocopy += o.photocopy?.amount || 0;
      printing += o.printing?.amount || 0;
      frames += o.frame?.amount || 0;
      tshirts += o.tshirt?.amount || 0;
      largeFormat += (o.largeFormat?.sticker?.amount || 0) + (o.largeFormat?.banner?.amount || 0);
      dtf += (o.dtf?.a3?.amount || 0) + (o.dtf?.a4?.amount || 0);
      if (o.specialServices) {
        o.specialServices.forEach(s => special += s.amount || 0);
      }
    });

    // Estimate jobs division based on keywords
    jobs.forEach(j => {
      const desc = j.jobDescription.toLowerCase();
      if (desc.includes("shirt") || desc.includes("cotton")) tshirts += j.depositPaid;
      else if (desc.includes("banner") || desc.includes("sticker")) largeFormat += j.depositPaid;
      else if (desc.includes("dtf")) dtf += j.depositPaid;
      else if (desc.includes("frame")) frames += j.depositPaid;
      else photocopy += j.depositPaid;
    });

    const totalSales = photocopy + printing + frames + tshirts + largeFormat + dtf + special;

    return {
      photocopy,
      printing,
      frames,
      tshirts,
      largeFormat,
      dtf,
      special,
      totalSales
    };
  }, [jobs, orders]);

  const handleExport = (format: "pdf" | "excel" | "csv" | "inventory" | "jobs") => {
    const today = new Date().toISOString().split("T")[0];
    const currentJobs = DBStore.getJobs();
    const currentInventory = DBStore.getInventory();
    const currentOrders = DBStore.getGeneralPrintingOrders();
    const currentExpenditures = DBStore.getExpenditures();

    if (format === "excel" || format === "csv" || format === "inventory" || format === "jobs") {
      DBStore.addAuditLog("Admin", "Export", "Data Download", `Exported data spreadsheet.`);

      // HTML template to generate a styled Excel worksheet
      let excelHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #6366F1; color: white; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; border: 1px solid #94A3B8; padding: 8px; text-align: left; }
            td { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; border: 1px solid #CBD5E1; padding: 6px; text-align: left; }
            .company-name { font-size: 16pt; font-weight: bold; color: #1E1B4B; padding: 10px 0; }
            .section-hdr { font-size: 12pt; font-weight: bold; color: #4338CA; background-color: #EEF2FF; border: 1px solid #94A3B8; padding: 8px; }
            .bold { font-weight: bold; }
            .right { text-align: right; }
            .bg-summary { background-color: #F8FAFC; }
          </style>
        </head>
        <body>
      `;

      if (format === "inventory") {
        excelHtml += `
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
        excelHtml += `</tbody></table>`;

      } else if (format === "jobs") {
        excelHtml += `
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
              <td class="right font-semibold">${j.totalAmount.toFixed(2)}</td>
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
        excelHtml += `</tbody></table>`;

      } else {
        // Combined Full Ledger Report
        excelHtml += `
          <table>
            <tr><td colspan="10" class="company-name"><b>PRINTOPIA DIGITAL PRESS</b></td></tr>
            <tr><td colspan="10" style="font-size: 12pt; color: #3730A3;"><b>ENTERPRISE BUSINESS PERFORMANCE REPORT</b></td></tr>
            <tr><td colspan="10" style="font-size: 9pt; color: #64748b;">Generated On: ${new Date().toLocaleString()} | Currency: ${currency}</td></tr>
            <tr><td></td></tr>
          </table>
          
          <table>
            <thead>
              <tr><th colspan="2" class="section-hdr">Financial Summary KPIs</th></tr>
            </thead>
            <tbody>
              <tr><td class="bg-summary bold">Total Revenue</td><td class="bold" style="color: #4F46E5;">${currency} ${kpi.grossRevenue.toFixed(2)}</td></tr>
              <tr><td class="bg-summary">Total Orders Recorded</td><td>${currentOrders.length} orders</td></tr>
              <tr><td class="bg-summary">Total Job Agreements</td><td>${currentJobs.length} jobs</td></tr>
              <tr><td class="bg-summary bold">Total Expenditures</td><td class="bold text-rose-600" style="color: #B90E0E;">${currency} ${kpi.totalExpenses.toFixed(2)}</td></tr>
              <tr><td class="bg-summary bold">Net Income</td><td class="bold" style="color: #059669; font-size: 11pt;">${currency} ${kpi.netProfit.toFixed(2)}</td></tr>
            </tbody>
          </table>

          <table>
            <thead>
              <tr><th colspan="3" class="section-hdr">Revenue Channel Breakdown</th></tr>
              <tr>
                <th>Channel</th>
                <th class="right">Sales Volume (${currency})</th>
                <th class="right">Percentage of Total</th>
              </tr>
            </thead>
            <tbody>
        `;
        const totalS = salesReportData.totalSales || 1;
        const channels = [
          { name: "Photocopy Service", value: salesReportData.photocopy },
          { name: "Digital Color Printing", value: salesReportData.printing },
          { name: "Custom Framing & Glass", value: salesReportData.frames },
          { name: "T-Shirt & Apparel Prints", value: salesReportData.tshirts },
          { name: "Wide Format Flex/Banners", value: salesReportData.largeFormat },
          { name: "Direct-to-Film (DTF) Sheets", value: salesReportData.dtf },
          { name: "Specialized Services", value: salesReportData.special }
        ];
        channels.forEach(ch => {
          const pct = ((ch.value / totalS) * 100).toFixed(1) + "%";
          excelHtml += `
            <tr>
              <td>${ch.name}</td>
              <td class="right font-semibold">${ch.value.toFixed(2)}</td>
              <td class="right">${pct}</td>
            </tr>
          `;
        });
        excelHtml += `
            <tr class="bold bg-summary">
              <td>Total Sales</td>
              <td class="right">${salesReportData.totalSales.toFixed(2)}</td>
              <td class="right">100.0%</td>
            </tr>
          </tbody>
        </table>

        <table>
          <thead>
            <tr><th colspan="10" class="section-hdr">General Printing Orders Log (M1)</th></tr>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Customer Name</th>
              <th>Customer Phone</th>
              <th class="right">Subtotal</th>
              <th class="right">Discount</th>
              <th class="right">Tax</th>
              <th class="right">Grand Total</th>
              <th>Cashier</th>
              <th>Payment Method</th>
            </tr>
          </thead>
          <tbody>
        `;
        currentOrders.forEach(o => {
          excelHtml += `
            <tr>
              <td class="bold">${o.orderNumber}</td>
              <td>${o.date}</td>
              <td class="bold">${o.customerName}</td>
              <td>${o.customerPhone || "Walk-in"}</td>
              <td class="right">${o.subtotal.toFixed(2)}</td>
              <td class="right text-rose-500">${o.discount.toFixed(2)}</td>
              <td class="right">${o.tax.toFixed(2)}</td>
              <td class="right bold">${o.grandTotal.toFixed(2)}</td>
              <td>${o.staffName || "Staff"}</td>
              <td>${o.paymentMethod}</td>
            </tr>
          `;
        });
        excelHtml += `</tbody></table>`;
      }

      excelHtml += `</body></html>`;

      const blob = new Blob(["\uFEFF" + excelHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Printopia_${format === "inventory" ? "Inventory" : format === "jobs" ? "Jobs" : "Enterprise_Report"}_${today}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } else if (format === "pdf") {
      DBStore.addAuditLog("Admin", "Export", "Sales Report", `Exported Business Performance report as PDF.`);
      
      const win = window.open("", "_blank");
      if (win) {
        // Construct printable report HTML
        const totalS = salesReportData.totalSales || 1;
        const channelsHTML = [
          { name: "Photocopy Service", value: salesReportData.photocopy },
          { name: "Digital Color Printing", value: salesReportData.printing },
          { name: "Custom Framing & Glass", value: salesReportData.frames },
          { name: "T-Shirt & Apparel Prints", value: salesReportData.tshirts },
          { name: "Wide Format Flex/Banners", value: salesReportData.largeFormat },
          { name: "Direct-to-Film (DTF) Sheets", value: salesReportData.dtf },
          { name: "Specialized Services", value: salesReportData.special }
        ].map(ch => {
          const pct = ((ch.value / totalS) * 100).toFixed(1) + "%";
          return `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 500;">${ch.name}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${currency} ${ch.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #555;">${pct}</td>
            </tr>
          `;
        }).join("");

        const ordersHTML = orders.slice(0, 15).map(o => `
          <tr>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: monospace;">${o.orderNumber}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${o.date}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-weight: 500;">${o.customerName}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${currency} ${o.grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${o.paymentMethod}</td>
          </tr>
        `).join("");

        const jobsHTML = jobs.slice(0, 15).map(j => `
          <tr>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-family: monospace;">${j.jobNumber}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-weight: 500;">${j.customerName}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${j.jobDescription}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${currency} ${j.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right;">${currency} ${j.depositPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center;"><span style="padding: 2px 6px; border-radius: 4px; background: #f0fdf4; color: #166534; font-size: 9px; font-weight: bold; border: 1px solid #bbf7d0;">${j.status}</span></td>
          </tr>
        `).join("");

        const expendituresHTML = expenditures.slice(0, 15).map(e => `
          <tr>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${e.date}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-weight: 500;">${e.item}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px;">${e.category}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${e.supplier}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600; color: #c2410c;">${currency} ${e.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          </tr>
        `).join("");

        win.document.write(`
          <html>
            <head>
              <title>Printopia_Digital_Press_Business_Performance_Report_${today}</title>
              <style>
                body {
                  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  color: #1e293b;
                  background-color: #ffffff;
                  margin: 0;
                  padding: 40px;
                  line-height: 1.5;
                }
                .no-print-banner {
                  background: #f1f5f9;
                  border: 1px solid #e2e8f0;
                  border-radius: 8px;
                  padding: 12px;
                  text-align: center;
                  font-size: 12px;
                  margin-bottom: 30px;
                  color: #475569;
                }
                .header-table {
                  width: 100%;
                  margin-bottom: 30px;
                }
                .company-name {
                  font-size: 24px;
                  font-weight: 800;
                  color: #1e3a8a;
                  letter-spacing: -0.025em;
                  margin: 0;
                }
                .tagline {
                  font-size: 10px;
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 0.1em;
                  color: #2563eb;
                  margin-top: 2px;
                }
                .title-block {
                  border-bottom: 2px solid #e2e8f0;
                  padding-bottom: 15px;
                  margin-bottom: 25px;
                }
                .title-block h1 {
                  font-size: 20px;
                  font-weight: 700;
                  margin: 0;
                  color: #0f172a;
                }
                .grid-kpi {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 15px;
                  margin-bottom: 30px;
                }
                .kpi-card {
                  border: 1px solid #e2e8f0;
                  border-radius: 10px;
                  padding: 15px;
                  background-color: #f8fafc;
                }
                .kpi-label {
                  font-size: 10px;
                  text-transform: uppercase;
                  font-weight: 700;
                  color: #64748b;
                  margin-bottom: 5px;
                }
                .kpi-val {
                  font-size: 18px;
                  font-weight: 800;
                  color: #0f172a;
                }
                .section-title {
                  font-size: 13px;
                  font-weight: 800;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                  color: #475569;
                  border-bottom: 2px solid #cbd5e1;
                  padding-bottom: 6px;
                  margin-top: 30px;
                  margin-bottom: 12px;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 11px;
                }
                th {
                  background-color: #f1f5f9;
                  text-align: left;
                  padding: 8px;
                  font-weight: 700;
                  color: #334155;
                  border-bottom: 1px solid #cbd5e1;
                }
                @media print {
                  .no-print-banner {
                    display: none !important;
                  }
                  body {
                    padding: 0;
                  }
                }
              </style>
            </head>
            <body>
              <div class="no-print-banner">
                <strong>PDF Export Guide:</strong> Please select <strong>"Save as PDF"</strong> under destination settings to download this business performance report to your machine.
              </div>

              <!-- Logo & Brand Letterhead -->
              <table class="header-table">
                <tr>
                  <td>
                    <h2 class="company-name">Printopia Digital Press</h2>
                    <div class="tagline">Smart Inventory & Print Management</div>
                  </td>
                  <td style="text-align: right; font-size: 11px; color: #64748b; font-family: monospace; line-height: 1.4;">
                    <strong>Printopia Digital Press Ltd.</strong><br/>
                    102 Industrial Avenue, Suite 4B<br/>
                    Accra, Ghana | +233 24 555 0192
                  </td>
                </tr>
              </table>

              <div class="title-block">
                <h1>Monthly Performance & Financial Ledger</h1>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                  Report Window: Month-to-Date | Generated on: ${new Date().toLocaleString()} | Operator: Administrator Terminal
                </div>
              </div>

              <!-- KPI Metrics -->
              <div class="grid-kpi">
                <div class="kpi-card">
                  <div class="kpi-label">Total Revenue</div>
                  <div class="kpi-val">${currency} ${kpi.grossRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">Expenditures</div>
                  <div class="kpi-val" style="color: #c2410c;">${currency} ${kpi.totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>
                <div class="kpi-card" style="border-color: #bbf7d0; background-color: #f0fdf4;">
                  <div class="kpi-label" style="color: #166534;">Net Profit</div>
                  <div class="kpi-val" style="color: #15803d;">${currency} ${kpi.netProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-label">Active Orders</div>
                  <div class="kpi-val">${orders.length + jobs.length} Items</div>
                </div>
              </div>

              <!-- Revenue Breakdown -->
              <div class="section-title">Revenue Stream Performance</div>
              <table>
                <thead>
                  <tr>
                    <th style="padding: 8px;">Business Channel Category</th>
                    <th style="padding: 8px; text-align: right;">Total Sales Volume</th>
                    <th style="padding: 8px; text-align: right;">Revenue Share (%)</th>
                  </tr>
                </thead>
                <tbody>
                  ${channelsHTML}
                  <tr style="background: #f8fafc; font-weight: 700; font-size: 12px; border-top: 2px solid #cbd5e1;">
                    <td style="padding: 10px 8px;">Consolidated Total sales</td>
                    <td style="padding: 10px 8px; text-align: right; color: #1e3a8a;">${currency} ${salesReportData.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td style="padding: 10px 8px; text-align: right;">100.0%</td>
                  </tr>
                </tbody>
              </table>

              <!-- Recent General Orders -->
              <div class="section-title">General Printing Orders Audit (M1 Plotter & Direct Over-counter)</div>
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Customer Name</th>
                    <th style="text-align: right;">Grand Total</th>
                    <th>Payment Route</th>
                  </tr>
                </thead>
                <tbody>
                  ${ordersHTML || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">No general print orders found.</td></tr>'}
                </tbody>
              </table>

              <!-- Custom Jobs -->
              <div class="section-title">Contract Jobs Audit (Large Format, Apparel, Banners)</div>
              <table>
                <thead>
                  <tr>
                    <th>Job #</th>
                    <th>Customer Name</th>
                    <th>Description</th>
                    <th style="text-align: right;">Job Total</th>
                    <th style="text-align: right;">Deposit Paid</th>
                    <th style="text-align: center;">Delivery Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${jobsHTML || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">No contract jobs found.</td></tr>'}
                </tbody>
              </table>

              <!-- Expenditures -->
              <div class="section-title">Recent Expenditure Journal</div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item/Supply Name</th>
                    <th>Classification Category</th>
                    <th>Supplier Venue</th>
                    <th style="text-align: right;">Amount Charged</th>
                  </tr>
                </thead>
                <tbody>
                  ${expendituresHTML || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">No expenditures recorded in this reporting bracket.</td></tr>'}
                </tbody>
              </table>

              <!-- Footer Section -->
              <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b;">
                <div>
                  © 2026 Printopia Digital Press. All rights reserved. System Ledger Integrity Secured.
                </div>
                <div style="font-family: monospace;">
                    window.close();
                  }, 350);
                }
              </script>
            </body>
          </html>
        `);
        win.document.close();
      } else {
        alert("Pop-up blocker is active. Please whitelist popups to allow direct export rendering.");
      }
    }
  };

  const handleDownloadMonthlyReport = () => {
    DBStore.addAuditLog("Admin", "Export", "Monthly Report", `Downloaded comprehensive monthly business report as PDF.`);
    
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let yPos = 20;

    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthJobs = jobs.filter(j => j.date.startsWith(currentMonth));
    const monthOrders = orders.filter(o => o.date.startsWith(currentMonth));
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.grandTotal, 0) + monthJobs.reduce((sum, j) => sum + j.depositPaid, 0);
    const monthExpenses = expenditures.filter(e => e.date.startsWith(currentMonth)).reduce((sum, e) => sum + e.amount, 0) + miscs.filter(m => m.date.startsWith(currentMonth)).reduce((sum, m) => sum + m.amount, 0);
    const monthProfit = monthRevenue - monthExpenses;
    const monthOutstanding = monthJobs.reduce((sum, j) => sum + j.balance, 0);
    
    const staffNotesList = DBStore.getStaffNotes();
    const monthLateNotes = staffNotesList.filter(n => n.date.startsWith(currentMonth) && n.sessionType === "Late Arrival");
    const staffAttendanceList = DBStore.getStaffAttendance();
    const monthAttendance = staffAttendanceList.filter(a => a.date.startsWith(currentMonth));

    // Helper to add section header
    const addSectionHeader = (title: string, color: [number, number, number]) => {
      doc.setFillColor(...color);
      doc.rect(margin, yPos, contentWidth, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(title.toUpperCase(), margin + 4, yPos + 6.5);
      doc.setTextColor(0, 0, 0);
      yPos += 12;
    };

    const addNote = (text: string) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text(text, margin, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    };

    const addSubHeader = (text: string) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 150);
      doc.text(text, margin, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    };

    // Header
    doc.setFillColor(30, 30, 100);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(settings.companyName || "PRINTOPIA DIGITAL PRESS", margin, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Monthly Business Performance Report", margin, 22);
    doc.setFontSize(8);
    doc.text(`Report Period: ${currentMonth} | Generated: ${new Date().toLocaleString()}`, margin, 29);
    doc.setTextColor(0, 0, 0);
    yPos = 42;

    // Financial Summary Section
    addSectionHeader("Financial Summary", [30, 58, 138]);
    addNote("This section shows the overall financial health of the business for the selected month. Revenue includes all general order totals and job deposits. Expenses include both admin expenditures and staff miscellaneous expenses.");
    
    const kpiData = [
      ["Total Revenue", `${currency} ${monthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Sum of all general printing orders + job deposits"],
      ["Total Expenditures", `${currency} ${monthExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Admin expenditures + staff miscellaneous expenses"],
      ["Net Profit", `${currency} ${monthProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Revenue minus all expenses. Positive = profitable month"],
      ["Outstanding Balances", `${currency} ${monthOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Money owed by clients for jobs not yet fully paid"],
      ["Jobs Created", `${monthJobs.length}`, "Total custom contract jobs opened this month"],
      ["General Orders", `${monthOrders.length}`, "Total over-the-counter general printing orders"],
      ["Late Arrivals", `${monthLateNotes.length}`, "Documented staff tardiness incidents this month"],
      ["Attendance Sessions", `${monthAttendance.length}`, "Clock-in / clock-out records captured this month"],
      ["Job Completion Rate", `${((monthJobs.filter(j => j.status === "Ready" || j.status === "Delivered").length / (monthJobs.length || 1)) * 100).toFixed(1)}%`, "Share of jobs reaching Ready/Delivered status"],
    ];

    (autoTable as any)(doc, {
      startY: yPos,
      head: [["Metric", "Value", "Explanation"]],
      body: kpiData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: "bold" },
        1: { cellWidth: 50, halign: "right", fontStyle: "bold", textColor: [20, 30, 80] },
        2: { cellWidth: 90 }
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Revenue Breakdown Section
    addSectionHeader("Revenue Channel Breakdown", [16, 120, 80]);
    addNote("This table breaks down exactly which services generated the most income. Use this to identify your top-performing products and which services may need more marketing.");

    const photocopy = orders.reduce((s, o) => s + (o.photocopy?.amount || 0), 0);
    const printing = orders.reduce((s, o) => s + (o.printing?.amount || 0), 0);
    const frames = orders.reduce((s, o) => s + (o.frame?.amount || 0), 0);
    const tshirts = orders.reduce((s, o) => s + (o.tshirt?.amount || 0), 0);
    const largeFormat = orders.reduce((s, o) => s + (o.largeFormat?.sticker?.amount || 0) + (o.largeFormat?.banner?.amount || 0), 0);
    const dtf = orders.reduce((s, o) => s + (o.dtf?.a3?.amount || 0) + (o.dtf?.a4?.amount || 0), 0);
    const special = orders.reduce((s, o) => s + (o.specialServices || []).reduce((a: number, b: any) => a + (b.amount || 0), 0), 0);

    const channels = [
      ["Photocopy Service", photocopy],
      ["Digital Color Printing", printing],
      ["Custom Framing & Glass", frames],
      ["T-Shirt & Apparel Prints", tshirts],
      ["Wide Format Banners", largeFormat],
      ["DTF Custom Films", dtf],
      ["Specialized Services", special],
    ];

    (autoTable as any)(doc, {
      startY: yPos,
      head: [["Service Channel", `Amount (${currency})`, "% of Total"]],
      body: channels.map(c => [c[0], c[1].toFixed(2), ((c[1] / (monthRevenue || 1)) * 100).toFixed(1) + "%"]),
      theme: "grid",
      headStyles: { fillColor: [16, 120, 80], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50, halign: "right", fontStyle: "bold" },
        2: { cellWidth: 50, halign: "right" }
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Job Breakdown Section
    addSectionHeader("Monthly Job Breakdown", [138, 43, 226]);
    addNote("Every custom contract job created this month is listed below. Check 'Balance' to see who still owes money. 'Priority' helps you identify urgent vs routine work.");

    if (monthJobs.length > 0) {
      const jobRows = monthJobs.map(j => [
        j.jobNumber,
        j.customerName,
        j.jobDescription.substring(0, 30) + (j.jobDescription.length > 30 ? "..." : ""),
        `${currency} ${j.totalAmount.toFixed(2)}`,
        `${currency} ${j.depositPaid.toFixed(2)}`,
        `${currency} ${j.balance.toFixed(2)}`,
        j.status,
        j.priority,
        j.assignedStaff
      ]);

      (autoTable as any)(doc, {
        startY: yPos,
        head: [["Job #", "Customer", "Description", "Total", "Deposit", "Balance", "Status", "Priority", "Staff"]],
        body: jobRows,
        theme: "grid",
        headStyles: { fillColor: [138, 43, 226], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [250, 245, 255] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 28 },
          2: { cellWidth: 35 },
          3: { cellWidth: 22, halign: "right" },
          4: { cellWidth: 22, halign: "right" },
          5: { cellWidth: 22, halign: "right" },
          6: { cellWidth: 22 },
          7: { cellWidth: 18 },
          8: { cellWidth: 20 }
        },
        margin: { left: margin, right: margin }
      });
    } else {
      doc.setFontSize(9);
      doc.text("No jobs created this month.", margin, yPos);
      yPos += 6;
    }

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Expenditure Breakdown Section
    addSectionHeader("Monthly Expenditure Breakdown", [220, 38, 38]);
    addNote("All money leaving the business this month. This includes raw material purchases (admin) and daily miscellaneous spending by staff. Compare against Revenue to see if the business is profitable.");

    const monthExpenditures = expenditures.filter(e => e.date.startsWith(currentMonth));
    const monthMiscs = miscs.filter(m => m.date.startsWith(currentMonth));
    const combinedExpenses = [
      ...monthExpenditures.map(e => ({ ...e, _type: "Expenditure" as const })),
      ...monthMiscs.map(m => ({ ...m, _type: "Miscellaneous" as const, category: "Miscellaneous" as const }))
    ].sort((a, b) => b.date.localeCompare(a.date));

    if (combinedExpenses.length > 0) {
      const expRows = combinedExpenses.map(e => [
        e.date,
        e.item,
        e.category,
        "supplier" in e ? e.supplier : (e.description || "—"),
        `${currency} ${e.amount.toFixed(2)}`,
        e._type
      ]);

      (autoTable as any)(doc, {
        startY: yPos,
        head: [["Date", "Item", "Category", "Supplier/Note", `Amount (${currency})`, "Type"]],
        body: expRows,
        theme: "grid",
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [255, 245, 245] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 40 },
          2: { cellWidth: 30 },
          3: { cellWidth: 45 },
          4: { cellWidth: 30, halign: "right", fontStyle: "bold", textColor: [180, 40, 40] },
          5: { cellWidth: 25 }
        },
        margin: { left: margin, right: margin }
      });
    } else {
      doc.setFontSize(9);
      doc.text("No expenditures recorded this month.", margin, yPos);
      yPos += 6;
    }

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Staff Attendance Section
    addSectionHeader("Staff Attendance Sessions", [30, 80, 160]);
    addNote("Clock-in and clock-out sessions recorded by staff and admin this month. Use this to verify attendance patterns and identify chronic late arrivals.");

    if (monthAttendance.length > 0) {
      const attRows = monthAttendance.map(a => [
        a.date,
        a.staffName,
        a.clockInTime || "—",
        a.clockOutTime || "—",
        a.sessionType,
        a.recordedBy
      ]);

      (autoTable as any)(doc, {
        startY: yPos,
        head: [["Date", "Staff Name", "Clock In", "Clock Out", "Session Type", "Recorded By"]],
        body: attRows,
        theme: "grid",
        headStyles: { fillColor: [30, 80, 160], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [230, 240, 255] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 35 },
          2: { cellWidth: 22, halign: "center" },
          3: { cellWidth: 22, halign: "center" },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 }
        },
        margin: { left: margin, right: margin }
      });
    } else {
      doc.setFontSize(9);
      doc.text("No attendance sessions recorded this month.", margin, yPos);
      yPos += 6;
    }

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Late Arrival Section
    addSectionHeader("Late Arrival Incidents", [200, 120, 20]);
    addNote("Incidents where staff arrived late to work, documented by admin. These notes are used for performance reviews and payroll adjustments.");

    if (monthLateNotes.length > 0) {
      const lateRows = monthLateNotes.map(n => [
        n.date,
        n.staffName,
        n.note.substring(0, 50) + (n.note.length > 50 ? "..." : ""),
        new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      ]);

      (autoTable as any)(doc, {
        startY: yPos,
        head: [["Date", "Staff Name", "Incident Note", "Time Recorded"]],
        body: lateRows,
        theme: "grid",
        headStyles: { fillColor: [200, 120, 20], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [255, 248, 230] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 35 },
          2: { cellWidth: 85 },
          3: { cellWidth: 30, halign: "center" }
        },
        margin: { left: margin, right: margin }
      });
    } else {
      doc.setFontSize(9);
      doc.setTextColor(40, 160, 40);
      doc.text("Excellent! No late arrival incidents recorded this month.", margin, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 6;
    }

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Daily Expense Trend Section
    addSectionHeader("Daily Expense Trend", [200, 90, 30]);
    addNote("How much was spent on each active day of the month. Spikes usually coincide with bulk material purchases or salary runs.");
    {
      const dailyExp: { day: string; amount: number }[] = [];
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${currentMonth}-${String(d).padStart(2, "0")}`;
        const amt = monthExpenditures.filter(e => e.date === ds).reduce((s, e) => s + e.amount, 0) +
          monthMiscs.filter(m => m.date === ds).reduce((s, m) => s + m.amount, 0);
        if (amt > 0) dailyExp.push({ day: String(d), amount: amt });
      }
      if (dailyExp.length > 0) {
        (autoTable as any)(doc, {
          startY: yPos,
          head: [["Day of Month", `Expense (${currency})`]],
          body: dailyExp.map(e => [e.day, e.amount.toFixed(2)]),
          theme: "grid",
          headStyles: { fillColor: [200, 90, 30], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [255, 248, 240] },
          columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 60, halign: "right", fontStyle: "bold", textColor: [180, 60, 20] } },
          margin: { left: margin, right: margin }
        });
      } else {
        doc.setFontSize(9);
        doc.text("No expenses recorded this month.", margin, yPos);
        yPos += 6;
      }
    }
    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Top Suppliers Section
    addSectionHeader("Top Suppliers", [30, 130, 170]);
    addNote("Vendors the business paid the most this month. Use to negotiate bulk discounts or evaluate supplier reliance.");
    {
      const supplierTotals: Record<string, number> = {};
      monthExpenditures.forEach(e => {
        const sup = e.supplier || "Unspecified";
        supplierTotals[sup] = (supplierTotals[sup] || 0) + e.amount;
      });
      const topSuppliers = Object.entries(supplierTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, amount]) => [name, `${currency} ${amount.toFixed(2)}`]);
      if (topSuppliers.length > 0) {
        (autoTable as any)(doc, {
          startY: yPos,
          head: [["Supplier / Vendor", `Total Paid (${currency})`]],
          body: topSuppliers,
          theme: "grid",
          headStyles: { fillColor: [30, 130, 170], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [235, 245, 255] },
          columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 70, halign: "right", fontStyle: "bold" } },
          margin: { left: margin, right: margin }
        });
      } else {
        doc.setFontSize(9);
        doc.text("No supplier payments recorded this month.", margin, yPos);
        yPos += 6;
      }
    }
    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Staff Performance Section
    addSectionHeader("Staff Performance Summary", [20, 130, 90]);
    addNote("Per-staff breakdown of late arrivals, attendance sessions, jobs completed, and shift reports submitted. Helps with payroll and performance reviews.");
    {
      const staffAccountsList = DBStore.getStaffAccounts();
      const allNames = Array.from(new Set([
        ...staffAccountsList.map(s => s.name),
        ...monthJobs.map(j => j.assignedStaff),
        ...monthLateNotes.map(n => n.staffName),
        ...monthAttendance.map(a => a.staffName)
      ].filter(Boolean)));
      if (allNames.length > 0) {
        const perfRows = allNames.map(name => [
          name,
          String(monthLateNotes.filter(n => n.staffName === name).length),
          String(monthAttendance.filter(a => a.staffName === name).length),
          String(monthJobs.filter(j => j.assignedStaff === name).length),
          String(reports.filter(r => r.staffName === name && r.date.startsWith(currentMonth)).length)
        ]);
        (autoTable as any)(doc, {
          startY: yPos,
          head: [["Staff Member", "Late Arrivals", "Attendance Sessions", "Jobs Completed", "Shift Reports"]],
          body: perfRows,
          theme: "grid",
          headStyles: { fillColor: [20, 130, 90], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [235, 250, 245] },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 30, halign: "center" },
            2: { cellWidth: 40, halign: "center" },
            3: { cellWidth: 32, halign: "center" },
            4: { cellWidth: 32, halign: "center" }
          },
          margin: { left: margin, right: margin }
        });
      } else {
        doc.setFontSize(9);
        doc.text("No staff activity recorded this month.", margin, yPos);
        yPos += 6;
      }
    }
    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Inventory Status Section
    addSectionHeader("Inventory Status", [20, 110, 180]);
    addNote("Current stock levels across all SKUs. Items at or below their minimum alert level are flagged so the admin knows what to reorder.");
    {
      const lowStock = inventory.filter(i => i.remainingStock <= i.minimumStock);
      const materialsUsed = inventory.reduce((s, i) => s + i.used, 0);
      const invSummary = [
        ["Total SKUs Cataloged", String(inventory.length)],
        ["Items Below Minimum Level", String(lowStock.length)],
        ["Total Units Used This Month", String(materialsUsed)]
      ];
      (autoTable as any)(doc, {
        startY: yPos,
        head: [["Inventory Metric", "Value"]],
        body: invSummary,
        theme: "grid",
        headStyles: { fillColor: [20, 110, 180], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [235, 245, 255] },
        columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 50, halign: "right", fontStyle: "bold" } },
        margin: { left: margin, right: margin }
      });
      yPos = (doc as any).lastAutoTable.finalY + 6;

      if (lowStock.length > 0) {
        addSubHeader("Items Needing Restock");
        const lowRows = lowStock.map(i => [
          i.item,
          String(i.remainingStock),
          String(i.minimumStock),
          `${currency} ${i.unitCost.toFixed(2)}`
        ]);
        (autoTable as any)(doc, {
          startY: yPos,
          head: [["Item", "Remaining", "Minimum", `Unit Cost (${currency})`]],
          body: lowRows,
          theme: "grid",
          headStyles: { fillColor: [185, 14, 14], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
          bodyStyles: { fontSize: 8, textColor: [120, 10, 10] },
          alternateRowStyles: { fillColor: [255, 235, 235] },
          columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 30, halign: "center" },
            2: { cellWidth: 30, halign: "center" },
            3: { cellWidth: 30, halign: "right" }
          },
          margin: { left: margin, right: margin }
        });
      } else {
        doc.setFontSize(9);
        doc.setTextColor(40, 160, 40);
        doc.text("All inventory items are currently above their minimum stock levels.", margin, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 6;
      }
    }
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Footer
    doc.setFillColor(240, 240, 250);
    doc.rect(0, yPos, pageWidth, 15, "F");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("This report was generated by Printopia Digital Press Management System.", margin, yPos + 6);
    doc.text("All figures are calculated from real-time recorded transactions. No manual adjustments applied.", margin, yPos + 10);
    doc.text("CONFIDENTIAL — For internal business review only.", pageWidth - margin, yPos + 10, { align: "right" });

    doc.save(`Printopia_Monthly_Business_Report_${currentMonth}.pdf`);
  };

  const handleDownloadDailyReport = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    DBStore.addAuditLog("Admin", "Export", "Daily Report", `Downloaded comprehensive daily business report as PDF for ${todayStr}.`);
    
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let yPos = 20;

    const todayOrders = orders.filter(o => o.date === todayStr);
    const todayJobs = jobs.filter(j => j.date === todayStr);
    const todayExpenditures = expenditures.filter(e => e.date === todayStr);
    const todayMiscs = miscs.filter(m => m.date === todayStr);
    const todayReports = reports.filter(r => r.date === todayStr);
    const todayTransactions = unifiedTransactions.filter(t => t.date === todayStr);
    
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0) + todayJobs.reduce((sum, j) => sum + j.depositPaid, 0);
    const todayExpenses = todayExpenditures.reduce((sum, e) => sum + e.amount, 0) + todayMiscs.reduce((sum, m) => sum + m.amount, 0);
    const todayProfit = todayRevenue - todayExpenses;
    const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

    // Helper to add section header
    const addSectionHeader = (title: string, color: [number, number, number]) => {
      doc.setFillColor(...color);
      doc.rect(margin, yPos, contentWidth, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(title.toUpperCase(), margin + 4, yPos + 6.5);
      doc.setTextColor(0, 0, 0);
      yPos += 12;
    };

    const addNote = (text: string) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text(text, margin, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    };

    const addSubHeader = (text: string) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 150);
      doc.text(text, margin, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 5;
    };

    // Header
    doc.setFillColor(30, 30, 100);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(settings.companyName || "PRINTOPIA DIGITAL PRESS", margin, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Daily Business Performance Report", margin, 22);
    doc.setFontSize(8);
    doc.text(`Date: ${todayStr} (${dayOfWeek}) | Generated: ${new Date().toLocaleString()}`, margin, 29);
    doc.setTextColor(0, 0, 0);
    yPos = 42;

    // Financial Summary
    addSectionHeader("Daily Financial Summary", [30, 58, 138]);
    addNote("This section shows the overall financial activity for the selected day. Revenue includes all general order totals and job deposits. Expenses include admin expenditures and staff miscellaneous expenses.");

    const kpiData = [
      ["Total Revenue", `${currency} ${todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Sum of all general printing orders + job deposits received today"],
      ["Total Expenditures", `${currency} ${todayExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Admin expenditures + staff miscellaneous expenses paid today"],
      ["Net Profit/Loss", `${currency} ${todayProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Revenue minus all expenses. Positive = profitable day"],
      ["General Orders", `${todayOrders.length}`, "Total over-the-counter general printing orders today"],
      ["Jobs Created", `${todayJobs.length}`, "Total custom contract jobs created today"],
      ["Shift Reports", `${todayReports.length}`, "End-of-shift reports submitted by staff today"],
    ];

    (autoTable as any)(doc, {
      startY: yPos,
      head: [["Metric", "Value", "Explanation"]],
      body: kpiData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: "bold" },
        1: { cellWidth: 50, halign: "right", fontStyle: "bold", textColor: [20, 30, 80] },
        2: { cellWidth: 90 }
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Revenue Breakdown
    addSectionHeader("Revenue Channel Breakdown", [16, 120, 80]);
    addNote("This table breaks down exactly which services generated income today. Use this to identify top-performing services for the day.");

    const photocopy = todayOrders.reduce((s, o) => s + (o.photocopy?.amount || 0), 0);
    const printing = todayOrders.reduce((s, o) => s + (o.printing?.amount || 0), 0);
    const frames = todayOrders.reduce((s, o) => s + (o.frame?.amount || 0), 0);
    const tshirts = todayOrders.reduce((s, o) => s + (o.tshirt?.amount || 0), 0);
    const largeFormat = todayOrders.reduce((s, o) => s + (o.largeFormat?.sticker?.amount || 0) + (o.largeFormat?.banner?.amount || 0), 0);
    const dtf = todayOrders.reduce((s, o) => s + (o.dtf?.a3?.amount || 0) + (o.dtf?.a4?.amount || 0), 0);
    const special = todayOrders.reduce((s, o) => s + (o.specialServices || []).reduce((a: number, b: any) => a + (b.amount || 0), 0), 0);

    const channels = [
      ["Photocopy Service", photocopy],
      ["Digital Color Printing", printing],
      ["Custom Framing & Glass", frames],
      ["T-Shirt & Apparel Prints", tshirts],
      ["Wide Format Banners", largeFormat],
      ["DTF Custom Films", dtf],
      ["Specialized Services", special],
    ];

    (autoTable as any)(doc, {
      startY: yPos,
      head: [["Service Channel", `Amount (${currency})`, "% of Total"]],
      body: channels.map(c => [c[0], c[1].toFixed(2), ((c[1] / (todayRevenue || 1)) * 100).toFixed(1) + "%"]),
      theme: "grid",
      headStyles: { fillColor: [16, 120, 80], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50, halign: "right", fontStyle: "bold" },
        2: { cellWidth: 50, halign: "right" }
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Job Breakdown
    addSectionHeader("Today's Jobs", [138, 43, 226]);
    addNote("All custom contract jobs created today. Check 'Balance' to see who still owes money. 'Priority' helps you identify urgent vs routine work.");

    if (todayJobs.length > 0) {
      const jobRows = todayJobs.map(j => [
        j.jobNumber,
        j.customerName,
        j.jobDescription.substring(0, 30) + (j.jobDescription.length > 30 ? "..." : ""),
        `${currency} ${j.totalAmount.toFixed(2)}`,
        `${currency} ${j.depositPaid.toFixed(2)}`,
        `${currency} ${j.balance.toFixed(2)}`,
        j.status,
        j.priority,
        j.assignedStaff
      ]);

      (autoTable as any)(doc, {
        startY: yPos,
        head: [["Job #", "Customer", "Description", "Total", "Deposit", "Balance", "Status", "Priority", "Staff"]],
        body: jobRows,
        theme: "grid",
        headStyles: { fillColor: [138, 43, 226], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [250, 245, 255] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 28 },
          2: { cellWidth: 35 },
          3: { cellWidth: 22, halign: "right" },
          4: { cellWidth: 22, halign: "right" },
          5: { cellWidth: 22, halign: "right" },
          6: { cellWidth: 22 },
          7: { cellWidth: 18 },
          8: { cellWidth: 20 }
        },
        margin: { left: margin, right: margin }
      });
    } else {
      doc.setFontSize(9);
      doc.text("No jobs created today.", margin, yPos);
      yPos += 6;
    }

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Expenditure Breakdown
    addSectionHeader("Today's Expenditures", [220, 38, 38]);
    addNote("All money leaving the business today. This includes raw material purchases (admin) and daily miscellaneous spending by staff. Compare against Revenue to see if the business is profitable today.");

    const combinedExpenses = [
      ...todayExpenditures.map(e => ({ ...e, _type: "Expenditure" as const })),
      ...todayMiscs.map(m => ({ ...m, _type: "Miscellaneous" as const, category: "Miscellaneous" as const }))
    ].sort((a, b) => b.date.localeCompare(a.date));

    if (combinedExpenses.length > 0) {
      const expRows = combinedExpenses.map(e => [
        e.date,
        e.item,
        e.category,
        "supplier" in e ? e.supplier : (e.description || "—"),
        `${currency} ${e.amount.toFixed(2)}`,
        e._type
      ]);

      (autoTable as any)(doc, {
        startY: yPos,
        head: [["Date", "Item", "Category", "Supplier/Note", `Amount (${currency})`, "Type"]],
        body: expRows,
        theme: "grid",
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [255, 245, 245] },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 40 },
          2: { cellWidth: 30 },
          3: { cellWidth: 45 },
          4: { cellWidth: 30, halign: "right", fontStyle: "bold", textColor: [180, 40, 40] },
          5: { cellWidth: 25 }
        },
        margin: { left: margin, right: margin }
      });
    } else {
      doc.setFontSize(9);
      doc.text("No expenditures recorded today.", margin, yPos);
      yPos += 6;
    }

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Shift Reports Section
    addSectionHeader("Today's Shift Reports", [20, 130, 90]);
    addNote("End-of-shift reports submitted by staff today. These reports summarize each staff member's sales, cash received, and any discrepancies for their shift.");

    if (todayReports.length > 0) {
      const reportRows = todayReports.map(r => [
        r.staffName,
        r.shift,
        `${currency} ${r.totalSales.toFixed(2)}`,
        `${currency} ${(r.cashReceived + r.mobileMoneyReceived + r.bankTransferReceived + r.posReceived).toFixed(2)}`,
        `${currency} ${(r.dailyMiscellaneous || 0).toFixed(2)}`,
        r.isApproved ? "Approved" : "Pending",
        r.remarks || "—"
      ]);

      (autoTable as any)(doc, {
        startY: yPos,
        head: [["Staff", "Shift", "Total Sales", "Total Received", "Misc Expenses", "Status", "Remarks"]],
        body: reportRows,
        theme: "grid",
        headStyles: { fillColor: [20, 130, 90], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [235, 250, 245] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 25 },
          2: { cellWidth: 30, halign: "right", fontStyle: "bold" },
          3: { cellWidth: 30, halign: "right" },
          4: { cellWidth: 25, halign: "right" },
          5: { cellWidth: 20 },
          6: { cellWidth: 40 }
        },
        margin: { left: margin, right: margin }
      });
    } else {
      doc.setFontSize(9);
      doc.text("No shift reports submitted today.", margin, yPos);
      yPos += 6;
    }

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Staff Activity
    addSectionHeader("Today's Staff Activity", [30, 80, 160]);
    addNote("All staff clock-in/clock-out sessions and late arrival notes recorded today. Use this to verify attendance.");

    const todayAttendance = DBStore.getStaffAttendance().filter(a => a.date === todayStr);
    const todayLateNotes = DBStore.getStaffNotes().filter(n => n.date === todayStr && n.sessionType === "Late Arrival");

    if (todayAttendance.length > 0) {
      const attRows = todayAttendance.map(a => [
        a.staffName,
        a.clockInTime || "—",
        a.clockOutTime || "—",
        a.sessionType,
        a.recordedBy
      ]);

      (autoTable as any)(doc, {
        startY: yPos,
        head: [["Staff Name", "Clock In", "Clock Out", "Session Type", "Recorded By"]],
        body: attRows,
        theme: "grid",
        headStyles: { fillColor: [30, 80, 160], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [230, 240, 255] },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 30, halign: "center" },
          2: { cellWidth: 30, halign: "center" },
          3: { cellWidth: 30 },
          4: { cellWidth: 40 }
        },
        margin: { left: margin, right: margin }
      });
      yPos = (doc as any).lastAutoTable.finalY + 8;
    } else {
      doc.setFontSize(9);
      doc.text("No attendance sessions recorded today.", margin, yPos);
      yPos += 6;
    }

    if (todayLateNotes.length > 0) {
      addSubHeader("Late Arrivals Today");
      const lateRows = todayLateNotes.map(n => [
        n.staffName,
        n.note.substring(0, 60) + (n.note.length > 60 ? "..." : ""),
        new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      ]);

      (autoTable as any)(doc, {
        startY: yPos,
        head: [["Staff Name", "Incident Note", "Time Recorded"]],
        body: lateRows,
        theme: "grid",
        headStyles: { fillColor: [200, 120, 20], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [255, 248, 230] },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 100 },
          2: { cellWidth: 30, halign: "center" }
        },
        margin: { left: margin, right: margin }
      });
    } else {
      doc.setFontSize(9);
      doc.setTextColor(40, 160, 40);
      doc.text("Excellent! No late arrivals today.", margin, yPos);
      doc.setTextColor(0, 0, 0);
    }

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Footer
    doc.setFillColor(240, 240, 250);
    doc.rect(0, yPos, pageWidth, 15, "F");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("This report was generated by Printopia Digital Press Management System.", margin, yPos + 6);
    doc.text("All figures are calculated from real-time recorded transactions. No manual adjustments applied.", margin, yPos + 10);
    doc.text("CONFIDENTIAL — For internal business review only.", pageWidth - margin, yPos + 10, { align: "right" });

    doc.save(`Printopia_Daily_Business_Report_${todayStr}.pdf`);
  };


  // ----------------------------------------------------
  // STATE FOR INVENTORY MANAGEMENT
  // ----------------------------------------------------
  const [invItemName, setInvItemName] = useState("");
  const [invSupplier, setInvSupplier] = useState("");
  const [invCat, setInvCat] = useState<InventoryItem["category"]>("Printing Materials");
  const [invOpenStock, setInvOpenStock] = useState(100);
  const [invCost, setInvCost] = useState(10);
  const [invSellPrice, setInvSellPrice] = useState(15);
  const [invMin, setInvMin] = useState(20);

  // Editing restock state
  const [editInvId, setEditInvId] = useState<string | null>(null);
  const [addQty, setAddQty] = useState(0);

  const handleCreateInventoryItem = () => {
    if (!invItemName.trim()) {
      alert("Please enter the item name.");
      return;
    }

    DBStore.addInventoryItem({
      item: invItemName,
      category: invCat,
      supplier: invSupplier || "General Supplier",
      openingStock: invOpenStock,
      purchased: 0,
      used: 0,
      minimumStock: invMin,
      alertLevel: invMin,
      unitCost: invCost,
      sellingPrice: invSellPrice,
      barcode: String(Math.floor(100000000000 + Math.random() * 900000000000)),
      qrCode: `QR-${invItemName.substring(0, 4).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`
    }, "Admin");

    // Reset Form
    setInvItemName("");
    setInvSupplier("");
    setInvOpenStock(100);
    setInvCost(10);
    setInvSellPrice(15);
    setInvMin(20);

    onRefreshGlobalState();
    alert("New inventory SKU cataloged successfully!");
  };

  const handleRegisterRestock = (item: InventoryItem) => {
    if (addQty <= 0) return;
    const updated = {
      ...item,
      purchased: item.purchased + addQty
    };
    DBStore.updateInventoryItem(updated, "Admin");
    setEditInvId(null);
    setAddQty(0);
    onRefreshGlobalState();
    alert(`Successfully registered purchase order of ${addQty} units for ${item.item}.`);
  };

  const handleDeleteInventoryItem = (item: InventoryItem) => {
    if (!window.confirm(`Delete "${item.item}" from the catalog?\n\nThis cannot be undone. Only delete materials that are no longer used.`)) return;
    DBStore.deleteInventoryItem(item.id, "Admin");
    if (editInvId === item.id) {
      setEditInvId(null);
      setAddQty(0);
    }
    onRefreshGlobalState();
    alert(`"${item.item}" has been removed from the catalog.`);
  };


  // ----------------------------------------------------
  // STATE FOR EOD APPROVAL DECK
  // ----------------------------------------------------
  const handleApproveReport = (reportId: string) => {
    DBStore.approveSalesReport(reportId, "Admin");
    onRefreshGlobalState();
    alert("Shift report certified and recorded in master ledger.");
  };


  // ----------------------------------------------------
  // SETTINGS CONTROLLER
  // ----------------------------------------------------
  const [settName, setSettName] = useState(settings.companyName);
  const [settAddress, setSettAddress] = useState(settings.address);
  const [settPhone, setSettPhone] = useState(settings.phone);
  const [settEmail, setSettEmail] = useState(settings.email);
  const [settVat, setSettVat] = useState(settings.vatRate);
  const [settReceiptFooter, setSettReceiptFooter] = useState(settings.receiptFooter);
  const [settInvoiceFooter, setSettInvoiceFooter] = useState(settings.invoiceFooter);
  const [settCurrency, setSettCurrency] = useState(settings.currency);
  const [settSyncServerUrl, setSettSyncServerUrl] = useState(settings.syncServerUrl || "");
  const [settAfricasTalkingUsername, setSettAfricasTalkingUsername] = useState(settings.africasTalkingUsername || "");
  const [settAfricasTalkingApiKey, setSettAfricasTalkingApiKey] = useState(settings.africasTalkingApiKey || "");
  const [settAfricasTalkingSenderId, setSettAfricasTalkingSenderId] = useState(settings.africasTalkingSenderId || "");

  // Load staff accounts
  const initialStaff = DBStore.getStaffAccounts();
  const s1 = initialStaff.find(s => s.id === "staff-1") || initialStaff[0];
  const s2 = initialStaff.find(s => s.id === "staff-2") || initialStaff[1];

  const [staff1Name, setStaff1Name] = useState(s1?.name || "");
  const [staff1User, setStaff1User] = useState(s1?.username || "");
  const [staff1Pass, setStaff1Pass] = useState(s1?.passwordText || "");
  const [staff1Role, setStaff1Role] = useState(s1?.roleDescription || "");

  const [staff2Name, setStaff2Name] = useState(s2?.name || "");
  const [staff2User, setStaff2User] = useState(s2?.username || "");
  const [staff2Pass, setStaff2Pass] = useState(s2?.passwordText || "");
  const [staff2Role, setStaff2Role] = useState(s2?.roleDescription || "");

  // Direct staff password manager states
  const [selectedStaffId, setSelectedStaffId] = useState<"staff-1" | "staff-2">("staff-1");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [showOverridePass, setShowOverridePass] = useState(false);

  // Security Modal States
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetModalStaffId, setResetModalStaffId] = useState<"staff-1" | "staff-2">("staff-1");
  const [resetModalNewPassword, setResetModalNewPassword] = useState("");
  const [resetModalConfirmPassword, setResetModalConfirmPassword] = useState("");
  const [resetModalShowPassword, setResetModalShowPassword] = useState(false);

  // Late Arrival Notes State
  const [lateNoteStaffId, setLateNoteStaffId] = useState<"staff-1" | "staff-2">("staff-1");
  const [lateNoteDate, setLateNoteDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [lateNoteText, setLateNoteText] = useState("");

  // Staff Attendance / Clock-In Sessions State
  const [lateNotesSubTab, setLateNotesSubTab] = useState<"attendance" | "notes">("attendance");
  const [attSessionDate, setAttSessionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attSessionStaffId, setAttSessionStaffId] = useState<"staff-1" | "staff-2">("staff-1");
  const [attSessionType, setAttSessionType] = useState<"Clock In" | "Clock Out">("Clock In");
  const [attSessionTime, setAttSessionTime] = useState(() => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));

  // SMS Broadcast State
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [broadcastCopied, setBroadcastCopied] = useState(false);
  const [smsContacts, setSmsContacts] = useState<Contact[]>(() => DBStore.getSmsContacts());
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingContactName, setEditingContactName] = useState("");
  const [editingContactPhone, setEditingContactPhone] = useState("");

  // Staff Activity Tracking Panel State
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("all");
  const [activityDateFilter, setActivityDateFilter] = useState<string>("");

  const staffAccounts = useMemo(() => DBStore.getStaffAccounts(), [refreshTrigger]);

  const filteredStaffLogs = useMemo(() => {
    return logs
      .filter(log => {
        const matchesStaff = selectedStaffFilter === "all" || log.user === selectedStaffFilter;
        const matchesDate = !activityDateFilter || log.timestamp.startsWith(activityDateFilter);
        return matchesStaff && matchesDate;
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [logs, selectedStaffFilter, activityDateFilter]);

  const handleDownloadStaffActivity = () => {
    const staffName = selectedStaffFilter === "all" ? "All Staff" : selectedStaffFilter;
    const today = new Date().toISOString().split("T")[0];
    const logsToExport = filteredStaffLogs;

    const tableRows = logsToExport.map(log => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${new Date(log.timestamp).toLocaleString()}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${log.user}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${log.action}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${log.module}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:11px;">${log.details}</td>
      </tr>
    `).join("");

    const html = `
      <html><head><title>Staff_Activity_${staffName}_${today}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; font-size: 12px; }
        h1 { color: #1e3a8a; font-size: 20px; margin-bottom: 4px; }
        h2 { color: #4F46E5; font-size: 13px; margin-bottom: 20px; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #1e3a8a; color: white; }
        thead th { padding: 10px 8px; text-align: left; font-size: 11px; }
        tbody tr:nth-child(even) { background: #f8fafc; }
      </style></head>
      <body>
        <h1>PRINTOPIA DIGITAL PRESS</h1>
        <h2>Staff Activity Report — ${staffName} | Generated: ${new Date().toLocaleString()}</h2>
        <table>
          <thead><tr>
            <th>Timestamp</th><th>Staff Name</th><th>Action</th><th>Module</th><th>Details</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body></html>
    `;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Printopia_Staff_Activity_${staffName.replace(/ /g,"_")}_${today}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Late Arrival Notes Handlers
  const staffNotes = useMemo(() => DBStore.getStaffNotes(), [refreshTrigger]);

  const handleSaveLateNote = () => {
    if (!lateNoteText.trim()) {
      alert("Please enter a note before saving.");
      return;
    }
    const staffAccount = DBStore.getStaffAccounts().find(s => s.id === lateNoteStaffId);
    const staffName = staffAccount?.name || lateNoteStaffId;
    DBStore.addStaffNote({
      date: lateNoteDate,
      staffId: lateNoteStaffId,
      staffName: staffName,
      note: lateNoteText.trim(),
      recordedBy: "Admin"
    });
    setLateNoteText("");
    onRefreshGlobalState();
    alert("Late arrival note recorded successfully.");
  };

  const handleDeleteLateNote = (id: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      DBStore.deleteStaffNote(id, "Admin");
      onRefreshGlobalState();
    }
  };

  // Staff Attendance Handlers
  const staffAttendance = useMemo(() => DBStore.getStaffAttendance(), [refreshTrigger]);

  const handleSaveAttendanceSession = () => {
    if (!attSessionTime.trim()) {
      alert("Please enter the session time (HH:MM).");
      return;
    }
    const staffAccount = DBStore.getStaffAccounts().find(s => s.id === attSessionStaffId);
    const staffName = staffAccount?.name || attSessionStaffId;
    DBStore.addStaffAttendance({
      date: attSessionDate,
      staffId: attSessionStaffId,
      staffName: staffName,
      note: `${attSessionType} recorded by Admin`,
      recordedBy: "Admin",
      sessionType: attSessionType,
      clockInTime: attSessionType === "Clock In" ? attSessionTime : undefined,
      clockOutTime: attSessionType === "Clock Out" ? attSessionTime : undefined
    });
    onRefreshGlobalState();
    alert("Session recorded successfully.");
  };

  // SMS Broadcast Handlers
  const broadcastRecipients = useMemo(() => {
    if (smsContacts.length > 0) {
      return smsContacts.map(c => c.phone);
    }
    return DBStore.getAllCustomerPhoneNumbers();
  }, [smsContacts, refreshTrigger]);

  const formatPhoneNumber = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith('+')) return trimmed;
    if (trimmed.startsWith('233')) return `+${trimmed}`;
    return `+233${trimmed.replace(/^0+/, '')}`;
  };

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      alert("Please enter both name and phone number.");
      return;
    }
    const contact = {
      id: `contact-${Date.now()}`,
      name: newContactName.trim(),
      phone: formatPhoneNumber(newContactPhone)
    };
    const updated = [...smsContacts, contact];
    setSmsContacts(updated);
    DBStore.saveSmsContacts(updated);
    setNewContactName("");
    setNewContactPhone("");
    DBStore.addAuditLog("Admin", "Create", "SMS Contacts", `Added contact: ${contact.name} (${contact.phone})`);
    onRefreshGlobalState();
  };

  const handleEditContact = (id: string) => {
    setEditingContactId(id);
    const contact = smsContacts.find(c => c.id === id);
    if (contact) {
      setEditingContactName(contact.name);
      setEditingContactPhone(contact.phone);
    }
  };

  const handleSaveEditContact = () => {
    if (!editingContactName.trim() || !editingContactPhone.trim()) {
      alert("Please enter both name and phone number.");
      return;
    }
    const updated = smsContacts.map(c =>
      c.id === editingContactId
        ? { ...c, name: editingContactName.trim(), phone: formatPhoneNumber(editingContactPhone) }
        : c
    );
    setSmsContacts(updated);
    DBStore.saveSmsContacts(updated);
    setEditingContactId(null);
    setEditingContactName("");
    setEditingContactPhone("");
    DBStore.addAuditLog("Admin", "Edit", "SMS Contacts", `Updated contact: ${editingContactName.trim()} (${editingContactPhone.trim()})`);
    onRefreshGlobalState();
  };

  const handleDeleteContact = (id: string) => {
    const contact = smsContacts.find(c => c.id === id);
    const updated = smsContacts.filter(c => c.id !== id);
    setSmsContacts(updated);
    DBStore.saveSmsContacts(updated);
    DBStore.addAuditLog("Admin", "Delete", "SMS Contacts", `Removed contact: ${contact?.name} (${contact?.phone})`);
    onRefreshGlobalState();
  };

  const handleClearAllContacts = () => {
    if (confirm("Are you sure you want to clear ALL SMS contacts? This cannot be undone.")) {
      setSmsContacts([]);
      DBStore.saveSmsContacts([]);
      DBStore.addAuditLog("Admin", "Delete", "SMS Contacts", "Cleared all SMS contacts.");
      onRefreshGlobalState();
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      alert("Please enter a message before sending.");
      return;
    }
    if (broadcastRecipients.length === 0) {
      alert("No recipients found. Add contacts or customers with phone numbers first.");
      return;
    }

    const settings = DBStore.getSettings();
    const { africasTalkingUsername, africasTalkingApiKey, africasTalkingSenderId } = settings;
    const syncUrl = DBStore.getSyncServerUrl();

    if (!africasTalkingUsername || !africasTalkingApiKey) {
      alert("Please configure Africa's Talking credentials in Global Settings first.");
      return;
    }

    const targetUrl = `${syncUrl}/api/sms/send`;
    console.log("SMS broadcast target URL:", targetUrl);

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: broadcastRecipients,
          message: broadcastMessage.trim(),
          username: africasTalkingUsername,
          apiKey: africasTalkingApiKey,
          senderId: africasTalkingSenderId || undefined
        })
      });

      console.log("SMS broadcast HTTP status:", response.status, response.statusText);

      let result: any = {};
      try {
        result = await response.json();
      } catch {
        const text = await response.text();
        result = { raw: text };
      }
      console.log("SMS broadcast result:", result);

      DBStore.addAuditLog("Admin", "Broadcast", "SMS", `Sent broadcast message to ${broadcastRecipients.length} recipients. URL: ${targetUrl}. Result: ${JSON.stringify(result).substring(0, 300)}`);

      setBroadcastSent(true);
      setBroadcastMessage("");
      onRefreshGlobalState();
      setTimeout(() => setBroadcastSent(false), 5000);

      if (!response.ok || !result.success) {
        const errorMsg = result.error || result.raw || `HTTP ${response.status}: ${response.statusText}`;

        if (errorMsg.includes('not allowed') || errorMsg.includes('GET') || response.status === 405) {
          alert(`SMS endpoint not found on the server.\n\nThe server needs to be redeployed.\n\nURL tried: ${targetUrl}\n\nError: ${errorMsg}`);
        } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('ERR_CONNECTION_REFUSED')) {
          alert(`Cannot reach the sync server.\n\nURL tried: ${targetUrl}\n\nPossible fixes:\n1. Make sure the server is running (npm run dev or npm start)\n2. Check the sync server URL in Settings\n3. If using Render, redeploy the service\n\nError: ${errorMsg}`);
        } else {
          alert(`SMS broadcast failed.\n\nTotal: ${broadcastRecipients.length} recipients\nBatches: ${result.batches || 0}\n\nError: ${errorMsg.substring(0, 500)}`);
        }
        return;
      }

      let successCount = broadcastRecipients.length;
      let failCount = 0;
      const failedNumbers = [];

      if (result.results && Array.isArray(result.results)) {
        for (const batch of result.results) {
          if (batch.parsed && batch.parsed.SMSMessageData && batch.parsed.SMSMessageData.Recipients) {
            for (const r of batch.parsed.SMSMessageData.Recipients) {
              if (r.status && r.status.toLowerCase() !== 'success') {
                failCount++;
                failedNumbers.push(`${r.number} (${r.status || 'unknown'})`);
              }
            }
          }
        }
      }

      successCount = broadcastRecipients.length - failCount;

      if (failCount > 0) {
        alert(`Broadcast completed with issues.\n\nTotal: ${broadcastRecipients.length}\nSent: ${successCount}\nFailed: ${failCount}\n\nFailed numbers:\n${failedNumbers.join('\n')}`);
      } else {
        alert(`Broadcast sent successfully to ${broadcastRecipients.length} recipients in ${result.batches || 1} batch(es).`);
      }
    } catch (error) {
      alert(`Failed to send broadcast. Cannot reach sync server.\n\nURL tried: ${targetUrl}\n\nError: ${error.message}\n\nPlease check:\n1. Server is running (npm run dev or npm start)\n2. Sync Server URL in Settings is correct\n3. No firewall blocking the connection`);
      console.error("Broadcast error:", error);
    }
  };

  const handleCopyBroadcastNumbers = async () => {
    if (broadcastRecipients.length === 0) {
      alert("No customer phone numbers found.");
      return;
    }
    const numbersText = broadcastRecipients.join("\n");
    try {
      await navigator.clipboard.writeText(numbersText);
      setBroadcastCopied(true);
      setTimeout(() => setBroadcastCopied(false), 2000);
    } catch {
      alert("Could not copy to clipboard. Please try again.");
    }
  };

  // Modal Generate Random Password Helper
  const handleModalGenerateRandom = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$";
    let generated = "";
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetModalNewPassword(generated);
    setResetModalConfirmPassword(generated);
  };

  // Modal Set Password Action
  const handleModalResetPassword = () => {
    if (!resetModalNewPassword.trim() || !resetModalConfirmPassword.trim()) {
      alert("Error: Please fill in both password fields.");
      return;
    }
    if (resetModalNewPassword.trim() !== resetModalConfirmPassword.trim()) {
      alert("Error: New Password and Confirm Password do not match.");
      return;
    }
    if (resetModalNewPassword.trim().length < 4) {
      alert("Security Alert: The password must be at least 4 characters long.");
      return;
    }

    const currentStaff1Pass = resetModalStaffId === "staff-1" ? resetModalNewPassword.trim() : staff1Pass;
    const currentStaff2Pass = resetModalStaffId === "staff-2" ? resetModalNewPassword.trim() : staff2Pass;

    if (currentStaff1Pass === currentStaff2Pass) {
      alert("Security Error: Both staff members must have completely unique passwords!");
      return;
    }

    // Update matching state
    if (resetModalStaffId === "staff-1") {
      setStaff1Pass(resetModalNewPassword.trim());
    } else {
      setStaff2Pass(resetModalNewPassword.trim());
    }

    // Prepare updated staff array
    const updatedStaff: StaffAccount[] = [
      {
        id: "staff-1",
        name: staff1Name.trim(),
        username: staff1User.trim().toLowerCase(),
        passwordText: resetModalStaffId === "staff-1" ? resetModalNewPassword.trim() : staff1Pass,
        roleDescription: staff1Role.trim()
      },
      {
        id: "staff-2",
        name: staff2Name.trim(),
        username: staff2User.trim().toLowerCase(),
        passwordText: resetModalStaffId === "staff-2" ? resetModalNewPassword.trim() : staff2Pass,
        roleDescription: staff2Role.trim()
      }
    ];

    DBStore.saveStaffAccounts(updatedStaff);
    DBStore.addAuditLog("Admin", "Password Reset", "Auth", `Successfully reset password for staff member ${resetModalStaffId === "staff-1" ? staff1Name : staff2Name} via Security Console.`);
    
    // Reset modal states and trigger updates
    setResetModalNewPassword("");
    setResetModalConfirmPassword("");
    setIsResetModalOpen(false);
    onRefreshGlobalState();
    alert(`Successfully reset password for ${resetModalStaffId === "staff-1" ? (staff1Name || "Staff Member 1") : (staff2Name || "Staff Member 2")}.`);
  };

  // Generate random password helper
  const handleGenerateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$";
    let generated = "";
    for (let i = 0; i < 10; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewStaffPassword(generated);
  };

  // Direct set/change password action
  const handleSetNewPassword = () => {
    if (!newStaffPassword.trim()) {
      alert("Please specify or generate a valid password first.");
      return;
    }
    if (newStaffPassword.length < 4) {
      alert("Security alert: The password must be at least 4 characters long.");
      return;
    }

    const currentStaff1Pass = selectedStaffId === "staff-1" ? newStaffPassword.trim() : staff1Pass;
    const currentStaff2Pass = selectedStaffId === "staff-2" ? newStaffPassword.trim() : staff2Pass;

    if (currentStaff1Pass === currentStaff2Pass) {
      alert("Security Error: Both staff members must have completely unique passwords!");
      return;
    }

    // Update state first
    if (selectedStaffId === "staff-1") {
      setStaff1Pass(newStaffPassword.trim());
    } else {
      setStaff2Pass(newStaffPassword.trim());
    }

    // Save directly to dbStore for instantaneous change
    const updatedStaff: StaffAccount[] = [
      {
        id: "staff-1",
        name: staff1Name.trim(),
        username: staff1User.trim().toLowerCase(),
        passwordText: selectedStaffId === "staff-1" ? newStaffPassword.trim() : staff1Pass,
        roleDescription: staff1Role.trim()
      },
      {
        id: "staff-2",
        name: staff2Name.trim(),
        username: staff2User.trim().toLowerCase(),
        passwordText: selectedStaffId === "staff-2" ? newStaffPassword.trim() : staff2Pass,
        roleDescription: staff2Role.trim()
      }
    ];

    DBStore.saveStaffAccounts(updatedStaff);
    DBStore.addAuditLog("Admin", "Password Override", "Auth", `Successfully modified security credentials and set a new password for ${selectedStaffId === "staff-1" ? staff1Name : staff2Name}.`);
    
    setNewStaffPassword("");
    onRefreshGlobalState();
    alert(`Successfully changed password for ${selectedStaffId === "staff-1" ? (staff1Name || "Staff Member 1") : (staff2Name || "Staff Member 2")} to: ${selectedStaffId === "staff-1" ? currentStaff1Pass : currentStaff2Pass}`);
  };

  const handleSaveSettings = () => {
    // Basic validations
    if (!staff1Name.trim() || !staff1User.trim() || !staff1Pass.trim()) {
      alert("Error: Please provide full name, username, and password for Staff Member 1!");
      return;
    }
    if (!staff2Name.trim() || !staff2User.trim() || !staff2Pass.trim()) {
      alert("Error: Please provide full name, username, and password for Staff Member 2!");
      return;
    }
    if (staff1Pass.trim() === staff2Pass.trim()) {
      alert("Security Error: Both staff members must have completely unique passwords!");
      return;
    }
    if (staff1User.trim().toLowerCase() === staff2User.trim().toLowerCase()) {
      alert("Error: Staff usernames must be unique!");
      return;
    }
    if (staff1User.trim().toLowerCase() === "admin" || staff2User.trim().toLowerCase() === "admin") {
      alert("Error: Staff usernames cannot be 'admin'!");
      return;
    }

    const updated: CompanySettings = {
      ...settings,
      companyName: settName,
      address: settAddress,
      phone: settPhone,
      email: settEmail,
      vatRate: settVat,
      receiptFooter: settReceiptFooter,
      invoiceFooter: settInvoiceFooter,
      currency: settCurrency,
      syncServerUrl: settSyncServerUrl,
      africasTalkingUsername: settAfricasTalkingUsername,
      africasTalkingApiKey: settAfricasTalkingApiKey,
      africasTalkingSenderId: settAfricasTalkingSenderId
    };

    const updatedStaff: StaffAccount[] = [
      {
        id: "staff-1",
        name: staff1Name.trim(),
        username: staff1User.trim().toLowerCase(),
        passwordText: staff1Pass,
        roleDescription: staff1Role.trim()
      },
      {
        id: "staff-2",
        name: staff2Name.trim(),
        username: staff2User.trim().toLowerCase(),
        passwordText: staff2Pass,
        roleDescription: staff2Role.trim()
      }
    ];

    onUpdateSettings(updated);
    DBStore.saveStaffAccounts(updatedStaff);
    onRefreshGlobalState();
    alert("Global system parameters and staff unique credentials updated successfully!");
  };

  // Trigger real JSON backup download
  const handleBackup = () => {
    DBStore.exportBackup();
    DBStore.triggerAutoBackup("Admin");
    onRefreshGlobalState();
    alert("Backup file downloaded successfully! Save it somewhere safe.");
  };

  const [purgeType, setPurgeType] = useState<"all" | "inventory" | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");

  const handleExecutePurgeAll = () => {
    if (purgeConfirmText.toUpperCase() !== "CONFIRM") {
      alert("Please type 'CONFIRM' exactly to authorize.");
      return;
    }
    DBStore.purgeDemoData("Admin");
    setPurgeType(null);
    setPurgeConfirmText("");
    onRefreshGlobalState();
    alert("All test/demo transactions, jobs, and reports have been purged. Your database is now a clean ledger!");
  };

  const handleExecutePurgeInventory = () => {
    if (purgeConfirmText.toUpperCase() !== "CONFIRM") {
      alert("Please type 'CONFIRM' exactly to authorize.");
      return;
    }
    DBStore.purgeInventoryData("Admin");
    setPurgeType(null);
    setPurgeConfirmText("");
    onRefreshGlobalState();
    alert("Default inventory SKUs cleared. You can now build your warehouse starting stock lists.");
  };

  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);

  const handleExecuteClearData = () => {
    DBStore.resetAllData("Admin");
    setPurgeType(null);
    setPurgeConfirmText("");
    setIsClearDataModalOpen(false);
    onRefreshGlobalState();
    alert("All system data has been cleared and factory defaults restored. Audit log retained the reset action.");
  };

  const handleDownloadLiveShiftCSV = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const liveTxs = unifiedTransactions.filter(t => t.date === todayStr);

    if (liveTxs.length === 0) {
      alert("No activities logged yet for today.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Time,Staff Name,Activity Type,Customer/Details,Amount Transacted,Payment Method\n";

    liveTxs.forEach(tx => {
      const time = tx.timestamp.split(" ")[1] || "12:00";
      const staffName = `"${tx.staff}"`;
      const type = `"${tx.type}"`;
      const details = `"${tx.customer} - ${tx.ref}"`;
      const amount = tx.amount.toFixed(2);
      const paymentMethod = `"${tx.paymentMethod}"`;
      
      csvContent += `${time},${staffName},${type},${details},${amount},${paymentMethod}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Live_Shift_Activity_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Decorative background blob specifically for dashboard tab depth */}
      <div className="absolute top-[20%] left-[10%] w-72 h-72 rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[30%] right-[15%] w-80 h-80 rounded-full bg-orange-500/10 dark:bg-orange-500/5 blur-[120px] pointer-events-none" />

      {/* Admin Tab Navigation (Mobile Only, Styled beautifully with glass badges) */}
      <div className="flex md:hidden overflow-x-auto gap-2 border-b border-white/10 pb-2.5 scrollbar-none">
        {[
          { id: "overview", label: "Analytics Overview", icon: TrendingUp },
          { id: "expenditures", label: "Expenditures (Overhead)", icon: CircleDollarSign },
          { id: "sales-reports", label: "Monthly Reports", icon: FileText },
          { id: "statistics", label: "Statistics", icon: TrendingUp },
          { id: "inventory", label: "SKU Inventory", icon: Boxes },
          { id: "eod", label: "EOD Approvals", icon: FileCheck2 },
          { id: "audit", label: "Audit & Backups", icon: History },
          { id: "staff-activity", label: "Staff Activity", icon: UserCheck },
          { id: "security", label: "Security", icon: ShieldCheck },
          { id: "late-notes", label: "Late Arrival Notes", icon: Clock },
          { id: "broadcast", label: "SMS Broadcast", icon: MessageSquare },
          { id: "settings", label: "Global Settings", icon: Settings },
          { id: "admin-guide", label: "Admin Guide", icon: BookOpen }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = adminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as any)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer whitespace-nowrap border ${
                active
                  ? "bg-gradient-to-r from-blue-600 to-orange-500 text-white border-orange-400/20 shadow-md shadow-orange-500/25 scale-[1.03]"
                  : "bg-white/30 dark:bg-zinc-900/30 text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 border-white/10 backdrop-blur-md"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ----------------------------------------------------
          TAB 1: ANALYTICS OVERVIEW
          ---------------------------------------------------- */}
      {adminTab === "overview" && (
        <div className="space-y-6">
          
          {/* Admin KPI Matrix */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* 1. Gross Revenue (Sales -> Red Gradient Glow) */}
            <div className="glass-card relative rounded-2xl p-5 shadow-lg overflow-hidden group border-l-4 border-l-red-600 dark:border-l-red-500">
              <div className="absolute top-3 right-3 opacity-15 dark:opacity-25 text-red-600 dark:text-red-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <CircleDollarSign className="h-10 w-10" />
              </div>
              <span className="text-[10px] font-mono font-bold text-red-700 dark:text-red-400 uppercase tracking-widest block">Gross Revenue</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2 leading-none tracking-tight">
                {currency} {kpi.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-emerald-600 font-bold mt-3 flex items-center gap-0.5">
                ▲ +14.2% <span className="text-gray-400 dark:text-zinc-500 font-medium font-sans">from June</span>
              </p>
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-red-600 to-red-800 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* 2. Total Expenditures (Expenses -> Dark Zinc Gradient Glow) */}
            <div className="glass-card relative rounded-2xl p-5 shadow-lg overflow-hidden group border-l-4 border-l-zinc-700 dark:border-l-zinc-600">
              <div className="absolute top-3 right-3 opacity-15 dark:opacity-25 text-zinc-500 dark:text-zinc-400 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                <TrendingUp className="h-10 w-10" />
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest block">Total Expenditures</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2 leading-none tracking-tight">
                {currency} {kpi.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold mt-3">
                Includes minor till spends
              </p>
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-zinc-600 to-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* 3. Net Business Profit (Profit -> Ruby Red Gradient Glow) */}
            <div className="glass-card relative rounded-2xl p-5 shadow-lg overflow-hidden group border-l-4 border-l-red-700 dark:border-l-red-600">
              <div className="absolute top-3 right-3 opacity-15 dark:opacity-25 text-red-700 dark:text-red-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <Briefcase className="h-10 w-10" />
              </div>
              <span className="text-[10px] font-mono font-bold text-red-700 dark:text-red-500 uppercase tracking-widest block">Net Business Profit</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2 leading-none tracking-tight">
                {currency} {kpi.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-3">
                Margin: {((kpi.netProfit / (kpi.grossRevenue || 1)) * 100).toFixed(1)}%
              </p>
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-red-700 to-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* 4. Outstanding Balances (Quotations -> Gray/Zinc Glow) */}
            <div className="glass-card relative rounded-2xl p-5 shadow-lg overflow-hidden group border-l-4 border-l-zinc-550 dark:border-l-zinc-500">
              <div className="absolute top-3 right-3 opacity-15 dark:opacity-25 text-zinc-600 dark:text-zinc-400 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                <Clock className="h-10 w-10" />
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-400 uppercase tracking-widest block">Outstanding Balances</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2 leading-none tracking-tight">
                {currency} {kpi.outstandingBalances.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-red-600 dark:text-red-400 font-bold mt-3">
                Uncollected client balances
              </p>
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-zinc-500 to-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* 5. Pending Pipeline (Orders -> Ruby Red Glow) */}
            <div className="glass-card relative rounded-2xl p-5 shadow-lg overflow-hidden group border-l-4 border-l-red-500 dark:border-l-red-400">
              <div className="absolute top-3 right-3 opacity-15 dark:opacity-25 text-red-500 dark:text-red-450 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <Boxes className="h-10 w-10" />
              </div>
              <span className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400 uppercase tracking-widest block">Pending Pipeline</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2 leading-none tracking-tight">
                {kpi.pendingJobs} <span className="text-xs font-normal text-gray-400 dark:text-zinc-500">active</span>
              </h3>
              <p className="text-[10px] text-red-600 dark:text-red-400 font-bold mt-3">
                In production Kanban
              </p>
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-red-500 to-zinc-950 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  Historical Sales Inspector & Account Reconciliation (Admin Mode)
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
                  { id: "month", label: "Monthly" }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setLedgerPeriod(p.id as any);
                      setLedgerOffset(0); // Reset offset on shift
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      ledgerPeriod === p.id
                        ? "bg-white dark:bg-zinc-800 text-gray-950 dark:text-white shadow-sm"
                        : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"
                    }`}
                  >
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
                        <th className="p-3">Staff / Origin</th>
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
          </div>

          {/* Charts Layout (Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sales vs Expenses chart (Span 2) */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden paper-texture">
              {/* Top CMYK accent bar */}
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Revenue Performance vs Expenses (7-Day Overview)</h4>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500">Live transaction distributions aggregated globally</p>
                </div>
              </div>

              <div className="h-64 text-[10px] font-bold font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartSalesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(129, 140, 248, 0.08)" />
                    <XAxis dataKey="name" stroke="#a1a1a1" />
                    <YAxis stroke="#a1a1a1" />
                    <Tooltip 
                      contentStyle={{ 
                        background: "rgba(15, 23, 42, 0.9)", 
                        border: "1px solid rgba(255, 255, 255, 0.15)", 
                        borderRadius: "12px",
                        color: "#fff"
                      }} 
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="Sales" stroke="#DC2626" strokeWidth={4} activeDot={{ r: 8, stroke: '#EF4444', strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="Expenses" stroke="#71717A" strokeWidth={3} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right sidebars: Breakdown charts */}
            <div className="space-y-6">
              
              {/* Service categories breakdown */}
              <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden">
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Top-Selling Services</h4>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500">Service categorization by volume</p>
                </div>
                
                <div className="space-y-3.5 pt-2">
{serviceBreakdown.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-700 dark:text-zinc-300 font-bold">{item.name}</span>
                        <span className="text-gray-900 dark:text-white font-black">{item.value}%</span>
                      </div>
                      <div className="w-full bg-slate-200/50 dark:bg-zinc-950/80 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${item.color} shadow-[0_0_8px_rgba(99,102,241,0.3)]`} 
                          style={{ width: `${item.value}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  {serviceBreakdown.length === 0 && (
                    <div className="py-8 text-center text-[11px] text-gray-400 dark:text-zinc-500">
                      No service data yet. Create jobs or orders to see breakdown.
                    </div>
                  )}
                </div>
              </div>

              {/* Payment distributions breakdown */}
              <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden">
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Payment Method Breakdown</h4>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500">Distribution of customer payment preferences</p>
                </div>
                
                <div className="space-y-3.5 pt-2">
{paymentBreakdown.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-700 dark:text-zinc-300 font-bold">{item.name}</span>
                        <span className="text-gray-900 dark:text-white font-black">{item.value}%</span>
                      </div>
                      <div className="w-full bg-slate-200/50 dark:bg-zinc-950/80 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${item.color} shadow-[0_0_8px_rgba(99,102,241,0.2)]`} 
                          style={{ width: `${item.value}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  {paymentBreakdown.length === 0 && (
                    <div className="py-8 text-center text-[11px] text-gray-400 dark:text-zinc-500">
                      No payment data yet. Process transactions to see breakdown.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 2: EXPENDITURES MODULE (ADMIN)
          ---------------------------------------------------- */}
      {adminTab === "expenditures" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-1 glass-panel rounded-2xl p-6 space-y-4 h-fit shadow-xl relative overflow-hidden paper-texture">
            <div className="border-b border-white/10 pb-3">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Log Monthly Expenditure</h3>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-relaxed font-medium">Enter recurring shop rent, salaries, materials, or equipment maintenance spends.</p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Expense Item Name *</label>
                <input type="text" value={expItem} onChange={(e) => setExpItem(e.target.value)} placeholder="e.g. Workshop Rental space" className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Quantity</label>
                  <input type="number" value={expQty} onChange={(e) => setExpQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Unit Price ({currency})</label>
                  <input type="number" value={expPrice || ""} onChange={(e) => setExpPrice(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Calculated Expense Amount</label>
                <div className="w-full bg-rose-500/10 dark:bg-rose-950/15 border border-rose-500/25 rounded-xl px-3.5 py-2.5 font-black text-rose-600 dark:text-rose-400 text-sm tracking-tight flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  {currency} {expAmount.toFixed(2)}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Expenditure Category</label>
                <select value={expCat} onChange={(e) => setExpCat(e.target.value as any)} className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold bg-white/40 dark:bg-zinc-900/40">
                  <option value="Printing Materials">Printing Materials</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Fuel">Fuel</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Rent">Rent</option>
                  <option value="Salary">Salary</option>
                  <option value="Other">Other Category</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Supplier / Merchant</label>
                <input type="text" value={expSupplier} onChange={(e) => setExpSupplier(e.target.value)} placeholder="e.g. Industrial Estates Ltd" className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
              </div>

              <div>
                <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Description Notes</label>
                <input type="text" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="Provide invoice detail reference" className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
              </div>

              <button onClick={handleSaveExpenditure} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-500 hover:to-orange-400 py-3.5 text-xs font-black text-white shadow-lg shadow-orange-500/25 active:scale-95 cursor-pointer transition-all duration-300 uppercase tracking-widest mt-2">
                Log Shop Expenditure
              </button>
            </div>
          </div>

          {/* Historical Overhead Ledger */}
          <div className="md:col-span-2 glass-panel rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden paper-texture">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-4">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Master Expenditures Overhead Ledger</h3>
              <div className="flex items-center gap-4 text-[10px] font-bold font-mono">
                <div className="text-gray-500 dark:text-zinc-400 uppercase tracking-widest">Yearly: <span className="text-rose-600 dark:text-rose-400 font-black text-xs">{currency} {kpi.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div className="text-gray-500 dark:text-zinc-400 uppercase tracking-widest">This Month: <span className="text-rose-500 dark:text-rose-400 font-black text-xs">{currency} {kpi.monthlyExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/5 shadow-inner">
              <table className="w-full text-left border-collapse text-xs overflow-hidden">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-950/45 dark:to-indigo-950/45 text-blue-900 dark:text-blue-300 font-black uppercase tracking-wider text-[10px] border-b border-white/10">
                    <th className="py-3.5 px-4 rounded-l-xl">Date</th>
                    <th className="py-3.5 px-4">Item</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Supplier</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4 text-right w-16 rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-700 dark:text-zinc-300">
                  {expenditures.map((exp) => (
                    <tr key={exp.id} className="hover:bg-white/5 dark:hover:bg-white/5 transition-all even:bg-white/2 dark:even:bg-white/1">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-400 dark:text-zinc-500">{exp.date}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                        {exp.item}
                        {exp.description && <span className="block text-[10px] text-gray-400 dark:text-zinc-500 font-medium mt-0.5">{exp.description}</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold border border-rose-500/20 uppercase tracking-widest">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-500 dark:text-zinc-400">{exp.supplier}</td>
                      <td className="py-3.5 px-4 text-right font-black text-rose-600 dark:text-rose-400">
                        {currency} {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button onClick={() => handleDeleteExpenditure(exp.id)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer transition duration-200">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 3: MONTHLY SALES REPORTS
          ---------------------------------------------------- */}
      {adminTab === "sales-reports" && (
        <div className="max-w-4xl mx-auto glass-panel rounded-2xl p-8 space-y-6 shadow-xl relative overflow-hidden paper-texture">
          {/* Top CMYK Accent Bar */}
          <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Monthly Business Performance Report</h2>
              <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">Aggregated revenue channels and material transaction audits</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleDownloadMonthlyReport()} className="inline-flex items-center gap-1 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black py-2 px-4 rounded-xl text-xs shadow-md transition cursor-pointer">
                <Download className="h-3.5 w-3.5" /> Download Monthly Business Report
              </button>
              <button onClick={() => handleExport("pdf")} className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-black py-2 px-4 rounded-xl text-xs shadow-md transition cursor-pointer">
                <Download className="h-3.5 w-3.5" /> Export PDF Report
              </button>
              <button onClick={() => handleExport("excel")} className="inline-flex items-center gap-1 border border-white/10 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer bg-white/10 dark:bg-zinc-900/40 hover:bg-white/20 backdrop-blur-md">
                <Download className="h-3.5 w-3.5" /> Excel Full Ledger
              </button>
              <button onClick={() => handleExport("jobs")} className="inline-flex items-center gap-1 border border-white/10 dark:border-zinc-800 text-gray-750 dark:text-zinc-300 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer bg-white/10 dark:bg-zinc-900/40 hover:bg-white/20 backdrop-blur-md">
                <Download className="h-3.5 w-3.5 text-blue-500" /> Jobs Spreadsheet
              </button>
              <button onClick={() => handleExport("inventory")} className="inline-flex items-center gap-1 border border-white/10 dark:border-zinc-800 text-gray-750 dark:text-zinc-300 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer bg-white/10 dark:bg-zinc-900/40 hover:bg-white/20 backdrop-blur-md">
                <Download className="h-3.5 w-3.5 text-emerald-500" /> Inventory Spreadsheet
              </button>
            </div>
          </div>

            {/* Monthly Master Report */}
            <div className="space-y-6">
              {/* ===== EXECUTIVE SUMMARY ===== */}
              <div className="rounded-2xl border border-white/10 overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-3">
                  <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Executive Summary
                  </h3>
                  <p className="text-[10px] text-blue-100 font-medium">High-level financial and operational overview for the current month</p>
                </div>
                <div className="bg-white/5 dark:bg-zinc-900/20 px-6 py-3">
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium leading-relaxed">
                    This summary consolidates the most important figures for the month. <strong className="text-gray-700 dark:text-zinc-300">Revenue</strong> includes all general order totals plus job deposits. <strong className="text-gray-700 dark:text-zinc-300">Expenses</strong> include admin expenditures and staff miscellaneous spends. A positive <strong className="text-gray-700 dark:text-zinc-300">Net Profit</strong> indicates a profitable month. <strong className="text-gray-700 dark:text-zinc-300">Outstanding Balances</strong> are amounts still owed by clients.
                  </p>
                </div>
                <div className="bg-white/5 dark:bg-zinc-900/20">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/10">
                    {[
                      { label: "Total Revenue", value: `${currency} ${monthAnalytics.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, tone: "text-emerald-600 dark:text-emerald-400" },
                      { label: "Total Expenses", value: `${currency} ${monthAnalytics.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, tone: "text-rose-600 dark:text-rose-400" },
                      { label: "Net Profit / Loss", value: `${currency} ${monthAnalytics.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, tone: monthAnalytics.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400" },
                      { label: "Total Jobs Created", value: monthAnalytics.monthJobs.length, tone: "text-gray-900 dark:text-white" },
                      { label: "Total General Orders", value: monthAnalytics.monthOrders.length, tone: "text-gray-900 dark:text-white" },
                      { label: "Outstanding Balances", value: `${currency} ${monthAnalytics.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, tone: "text-amber-600 dark:text-amber-400" },
                      { label: "Late Arrivals", value: monthAnalytics.totalLate, tone: "text-amber-600 dark:text-amber-400" },
                      { label: "Attendance Sessions", value: monthAnalytics.totalSessions, tone: "text-indigo-600 dark:text-indigo-400" },
                      { label: "Job Completion Rate", value: `${monthAnalytics.completionRate.toFixed(1)}%`, tone: "text-blue-600 dark:text-blue-400" },
                    ].map((card, i) => (
                      <div key={i} className="bg-white/5 dark:bg-zinc-900/20 p-4 flex flex-col justify-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">{card.label}</span>
                        <span className={`text-base font-black mt-1 ${card.tone}`}>{card.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            {/* Monthly Job Breakdown */}
            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3">
                <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Job Performance
                </h3>
                <p className="text-[10px] text-blue-100 font-medium">Every custom contract job created this month, with completion metrics</p>
              </div>
              <div className="bg-white/5 dark:bg-zinc-900/20 px-6 py-3">
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium leading-relaxed">
                  <strong className="text-gray-700 dark:text-zinc-300">Completion Rate</strong> = jobs marked Ready or Delivered ÷ total jobs. <strong className="text-gray-700 dark:text-zinc-300">Avg Job Value</strong> = total job value ÷ number of jobs. Use the staff and priority breakdowns to balance workload.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                  <div className="bg-white/5 dark:bg-zinc-900/30 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 dark:text-zinc-500 block">Completion Rate</span>
                    <span className="text-base font-black text-blue-600 dark:text-blue-400">{monthAnalytics.completionRate.toFixed(1)}%</span>
                  </div>
                  <div className="bg-white/5 dark:bg-zinc-900/30 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 dark:text-zinc-500 block">Avg Job Value</span>
                    <span className="text-base font-black text-gray-900 dark:text-white">{currency} {monthAnalytics.avgJobValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="bg-white/5 dark:bg-zinc-900/30 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 dark:text-zinc-500 block">Jobs Completed</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{monthAnalytics.completedJobs}</span>
                  </div>
                  <div className="bg-white/5 dark:bg-zinc-900/30 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 dark:text-zinc-500 block">Total Jobs</span>
                    <span className="text-base font-black text-gray-900 dark:text-white">{monthAnalytics.monthJobs.length}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 dark:bg-zinc-900/20 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-950/30 dark:to-indigo-950/30 text-blue-900 dark:text-blue-200 font-black uppercase tracking-wider text-[10px] border-b border-white/10">
                      <th className="py-3 px-3">Job Number</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3 text-right">Total</th>
                      <th className="py-3 px-3 text-right">Deposit</th>
                      <th className="py-3 px-3 text-right">Balance</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Assigned Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(() => {
                      const monthJobs = monthAnalytics.monthJobs;
                      if (monthJobs.length === 0) {
                        return <tr><td colSpan={9} className="py-6 text-center text-gray-400 dark:text-zinc-500 text-[10px]">No jobs created this month.</td></tr>;
                      }
                      return monthJobs.map((job, i) => (
                        <tr key={job.id} className={`hover:bg-white/5 transition-colors ${i % 2 === 0 ? "bg-white/2 dark:bg-white/1" : ""}`}>
                          <td className="py-3 px-3 font-mono font-bold text-blue-700 dark:text-blue-400">{job.jobNumber}</td>
                          <td className="py-3 px-3 font-semibold text-gray-800 dark:text-zinc-200">{job.customerName}</td>
                          <td className="py-3 px-3 text-gray-600 dark:text-zinc-400 max-w-[200px] truncate">{job.jobDescription}</td>
                          <td className="py-3 px-3 text-right font-black text-gray-900 dark:text-white">{currency} {job.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{currency} {job.depositPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-3 text-right font-bold text-amber-600 dark:text-amber-400">{currency} {job.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold border border-blue-500/20 uppercase tracking-widest">
                              {job.status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-widest ${
                              job.priority === "High" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" :
                              job.priority === "Medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
                              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            }`}>
                              {job.priority}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-600 dark:text-zinc-400">{job.assignedStaff}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Jobs by Staff & Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 pt-0">
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Jobs by Staff Member</h4>
                  {monthAnalytics.jobsByStaff.length === 0 ? (
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500">No jobs assigned this month.</p>
                  ) : monthAnalytics.jobsByStaff.map(s => (
                    <div key={s.staff} className="flex justify-between items-center text-xs border border-white/5 px-3 py-2 rounded-lg bg-white/5 dark:bg-zinc-900/20">
                      <span className="font-semibold text-gray-700 dark:text-zinc-300">{s.staff}</span>
                      <span className="font-black text-gray-900 dark:text-white">{s.count} jobs · {currency} {s.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Jobs by Priority</h4>
                  {monthAnalytics.jobsByPriority.map(p => (
                    <div key={p.priority} className="flex justify-between items-center text-xs border border-white/5 px-3 py-2 rounded-lg bg-white/5 dark:bg-zinc-900/20">
                      <span className={`font-semibold ${
                        p.priority === "High" ? "text-rose-600 dark:text-rose-400" :
                        p.priority === "Medium" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}>{p.priority}</span>
                      <span className="font-black text-gray-900 dark:text-white">{p.count} jobs</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Monthly Expenditure Breakdown */}
            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-rose-600 to-red-700 px-6 py-3">
                <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4" /> Expenditure Analysis
                </h3>
                <p className="text-[10px] text-rose-100 font-medium">All money leaving the business this month (admin + staff)</p>
              </div>
              <div className="bg-white/5 dark:bg-zinc-900/20 px-6 py-3">
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium leading-relaxed">
                  Spend is grouped by <strong className="text-gray-700 dark:text-zinc-300">category</strong> and <strong className="text-gray-700 dark:text-zinc-300">supplier</strong> below. Compare total expenses against the month's revenue to confirm profitability.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Category Breakdown</h4>
                    {monthAnalytics.categoryBreakdown.length === 0 ? (
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500">No expenses recorded this month.</p>
                    ) : monthAnalytics.categoryBreakdown.map(c => {
                      const pct = monthAnalytics.expenses ? (c.amount / monthAnalytics.expenses) * 100 : 0;
                      return (
                        <div key={c.category} className="space-y-1">
                          <div className="flex justify-between text-[11px] font-semibold">
                            <span className="text-gray-700 dark:text-zinc-300">{c.category}</span>
                            <span className="font-black text-gray-900 dark:text-white">{currency} {c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-slate-200/50 dark:bg-zinc-950/80 rounded-full h-2">
                            <div className="h-2 rounded-full bg-rose-500/70" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Top Suppliers</h4>
                    {monthAnalytics.topSuppliers.length === 0 ? (
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500">No supplier spend recorded.</p>
                    ) : monthAnalytics.topSuppliers.map((s, i) => (
                      <div key={i} className="flex justify-between items-center border border-white/5 px-3 py-2 rounded-lg bg-white/5 dark:bg-zinc-900/20 text-xs">
                        <span className="font-semibold text-gray-700 dark:text-zinc-300">{s.name}</span>
                        <span className="font-black text-rose-600 dark:text-rose-400">{currency} {s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white/5 dark:bg-zinc-900/20 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-950/30 dark:to-indigo-950/30 text-blue-900 dark:text-blue-200 font-black uppercase tracking-wider text-[10px] border-b border-white/10">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(() => {
                      const currentMonth = new Date().toISOString().substring(0, 7);
                      const monthExpenditures = expenditures.filter(e => e.date.startsWith(currentMonth));
                      const monthMiscs = miscs.filter(m => m.date.startsWith(currentMonth));
                      const combined = [
                        ...monthExpenditures.map(e => ({ ...e, _type: "Expenditure" as const })),
                        ...monthMiscs.map(m => ({ ...m, _type: "Miscellaneous" as const, category: "Miscellaneous" as const }))
                      ].sort((a, b) => b.date.localeCompare(a.date));

                      if (combined.length === 0) {
                        return <tr><td colSpan={5} className="py-6 text-center text-gray-400 dark:text-zinc-500 text-[10px]">No expenditures this month.</td></tr>;
                      }
                      return combined.map((item, i) => (
                        <tr key={item.id} className={`hover:bg-white/5 transition-colors ${i % 2 === 0 ? "bg-white/2 dark:bg-white/1" : ""}`}>
                          <td className="py-3 px-4 font-mono text-gray-500 dark:text-zinc-400">{item.date}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{item.item}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold border border-rose-500/20 uppercase tracking-widest">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-500 dark:text-zinc-400">{"supplier" in item ? item.supplier : item.description || "—"}</td>
                          <td className="py-3 px-4 text-right font-black text-rose-600 dark:text-rose-400">{currency} {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ===== STAFF PERFORMANCE ===== */}
            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-3">
                <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <UserCheck className="h-4 w-4" /> Staff Performance
                </h3>
                <p className="text-[10px] text-emerald-100 font-medium">Attendance, lateness, jobs and shift reports per staff member</p>
              </div>
              <div className="bg-white/5 dark:bg-zinc-900/20 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-950/30 dark:to-indigo-950/30 text-blue-900 dark:text-blue-200 font-black uppercase tracking-wider text-[10px] border-b border-white/10">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4 text-center">Late Arrivals</th>
                      <th className="py-3 px-4 text-center">Attendance Sessions</th>
                      <th className="py-3 px-4 text-center">Jobs Completed</th>
                      <th className="py-3 px-4 text-center">Shift Reports</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {monthAnalytics.staffPerformance.length === 0 ? (
                      <tr><td colSpan={5} className="py-6 text-center text-gray-400 dark:text-zinc-500 text-[10px]">No staff activity recorded this month.</td></tr>
                    ) : monthAnalytics.staffPerformance.map((s, i) => (
                      <tr key={i} className={`hover:bg-white/5 transition-colors ${i % 2 === 0 ? "bg-white/2 dark:bg-white/1" : ""}`}>
                        <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{s.staff}</td>
                        <td className="py-3 px-4 text-center font-black text-amber-600 dark:text-amber-400">{s.late}</td>
                        <td className="py-3 px-4 text-center font-bold text-gray-800 dark:text-zinc-200">{s.sessions}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{s.jobs}</td>
                        <td className="py-3 px-4 text-center font-bold text-indigo-600 dark:text-indigo-400">{s.reports}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ===== INVENTORY STATUS ===== */}
            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-3">
                <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Boxes className="h-4 w-4" /> Inventory Status
                </h3>
                <p className="text-[10px] text-cyan-100 font-medium">Current stock levels and materials consumed this month</p>
              </div>
              <div className="bg-white/5 dark:bg-zinc-900/20 px-6 py-3">
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium leading-relaxed">
                  <strong className="text-gray-700 dark:text-zinc-300">Items Below Minimum</strong> need restocking. <strong className="text-gray-700 dark:text-zinc-300">Materials Used</strong> is the total units consumed across all SKUs this month (auto-decremented when jobs and orders are produced).
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                  <div className="bg-white/5 dark:bg-zinc-900/30 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 dark:text-zinc-500 block">Total SKUs</span>
                    <span className="text-base font-black text-gray-900 dark:text-white">{inventory.length}</span>
                  </div>
                  <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                    <span className="text-[9px] uppercase tracking-widest font-black text-rose-600 dark:text-rose-400 block">Below Minimum</span>
                    <span className="text-base font-black text-rose-600 dark:text-rose-400">{monthAnalytics.lowStock.length}</span>
                  </div>
                  <div className="bg-white/5 dark:bg-zinc-900/30 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] uppercase tracking-widest font-black text-gray-400 dark:text-zinc-500 block">Materials Used</span>
                    <span className="text-base font-black text-gray-900 dark:text-white">{monthAnalytics.materialsUsed} units</span>
                  </div>
                </div>
                {monthAnalytics.lowStock.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <h4 className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Items Needing Restock</h4>
                    {monthAnalytics.lowStock.map(item => (
                      <div key={item.id} className="flex justify-between items-center border border-rose-500/15 px-3 py-2 rounded-lg bg-rose-500/5 text-xs">
                        <span className="font-semibold text-gray-800 dark:text-zinc-200">{item.item} <span className="text-[10px] text-gray-400">(min {item.minimumStock})</span></span>
                        <span className="font-black text-rose-600 dark:text-rose-400">{item.remainingStock} left</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">

            {/* ===== REVENUE BREAKDOWN (Service channels + daily trend) ===== */}
            <div className="md:col-span-2 space-y-4">
              <div className="rounded-2xl border border-white/10 overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-3">
                  <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Revenue Breakdown
                  </h3>
                  <p className="text-[10px] text-violet-100 font-medium">Service channel share and daily revenue trend</p>
                </div>
                <div className="bg-white/5 dark:bg-zinc-900/20 p-6 space-y-5">
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium leading-relaxed">
                    <strong className="text-gray-700 dark:text-zinc-300">Service Channel Breakdown</strong> shows which products earn the most — use it to focus marketing. <strong className="text-gray-700 dark:text-zinc-300">Daily Revenue Trend</strong> shows how income flows across the month.
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-64">
                      {monthAnalytics.serviceChannels.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center text-[11px] text-gray-400 dark:text-zinc-500">No revenue recorded this month.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={monthAnalytics.serviceChannels}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={(e: any) => `${e.name} ${e.pct.toFixed(0)}%`}
                            >
                              {monthAnalytics.serviceChannels.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: any, name: any) => [`${currency} ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })} (${monthAnalytics.serviceChannels.find(c => c.name === name)?.pct.toFixed(1)}%)`, name]}
                              contentStyle={{ background: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#fff" }}
                            />
                            <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "11px" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div className="h-64">
                      {monthAnalytics.daily.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center text-[11px] text-gray-400 dark:text-zinc-500">No daily revenue yet.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthAnalytics.daily}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(129,140,248,0.08)" />
                            <XAxis dataKey="day" stroke="#a1a1a1" fontSize={10} />
                            <YAxis stroke="#a1a1a1" fontSize={10} />
                            <Tooltip
                              contentStyle={{ background: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#fff" }}
                            />
                            <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "11px" }} />
                            <Bar dataKey="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Streams */}
            <div className="space-y-4">
              <h3 className="font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-1">CATEGORY SALES</h3>
              
              <div className="space-y-3">
                {[
                  { name: "Photocopy Service", value: salesReportData.photocopy },
                  { name: "Digital Color Printing", value: salesReportData.printing },
                  { name: "Custom Framing & Glass", value: salesReportData.frames },
                  { name: "T-Shirt & Apparel Prints", value: salesReportData.tshirts },
                  { name: "Wide Format Flex/Banners", value: salesReportData.largeFormat },
                  { name: "DTF Custom Films", value: salesReportData.dtf },
                  { name: "Specialized Restoration Services", value: salesReportData.special }
                ].map((channel) => (
                  <div key={channel.name} className="flex justify-between items-center text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:translate-x-1 transition-transform">
                    <span>{channel.name}</span>
                    <span className="font-black text-gray-900 dark:text-white">{currency} {channel.value.toFixed(2)}</span>
                  </div>
                ))}

                <hr className="border-white/5" />
                <div className="flex justify-between items-center text-base font-black text-gray-900 dark:text-white bg-gradient-to-r from-blue-500/10 to-orange-500/10 dark:from-blue-950/20 dark:to-orange-950/20 p-4 rounded-xl border border-white/5">
                  <span>Gross Sales Total:</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-orange-500 dark:from-blue-400 dark:to-orange-400 font-extrabold text-lg">
                    {currency} {salesReportData.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance KPIs */}
            <div className="space-y-4">
              <h3 className="font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-1">BUSINESS AUDIT SUMMARY</h3>
              
              <div className="space-y-4 pt-1">
                <div className="rounded-xl border border-white/5 p-4 bg-slate-500/5 dark:bg-zinc-950/40 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold block uppercase tracking-wider">Client Balance Pool</span>
                    <span className="text-base font-black text-rose-500 mt-0.5 block">{currency} {kpi.outstandingBalances.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold block uppercase tracking-wider">Monthly Rent + Utility</span>
                    <span className="text-base font-black text-gray-800 dark:text-white mt-0.5 block">{currency} {kpi.monthlyExpenses.toFixed(2)}</span>
                  </div>
                </div>

                  <div className="space-y-2.5">
                  <h4 className="font-black text-gray-800 dark:text-white uppercase tracking-wider text-[10px]">Star Personnel Analytics</h4>
                  {monthAnalytics.staffPerformance.length === 0 ? (
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500">No staff performance data yet this month.</p>
                  ) : monthAnalytics.staffPerformance
                    .slice()
                    .sort((a, b) => b.jobs - a.jobs)
                    .map((s, i) => (
                      <div key={i} className="flex justify-between items-center border border-white/5 p-3 rounded-xl bg-white/20 dark:bg-zinc-900/25 backdrop-blur-md">
                        <span className="font-semibold text-gray-700 dark:text-zinc-300">{s.staff}</span>
                        <span className="font-black text-blue-600 dark:text-blue-400 font-mono text-[11px] bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/15">{s.jobs} Jobs · {s.late} Late</span>
                      </div>
                    ))}
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/15 rounded-xl text-emerald-800 dark:text-emerald-400 flex items-center gap-2.5 font-bold leading-relaxed shadow-sm">
                  <UserCheck className="h-5 w-5 shrink-0 text-emerald-500" />
                  <span>Your company is operating at a {((kpi.netProfit / (kpi.grossRevenue || 1)) * 100).toFixed(0)}% net cash surplus margin this month!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB: STATISTICS (RECHARTS VISUAL DASHBOARD)
          ---------------------------------------------------- */}
      {adminTab === "statistics" && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden paper-texture">
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Business Statistics Dashboard
                </h3>
                <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium mt-0.5">
                  Visual analytics for the current month — revenue vs expenses, daily trends, service mix, staff and inventory.
                </p>
              </div>
            </div>

            {/* Revenue vs Expenses + Jobs per day */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
                <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Monthly Revenue vs Expenses</h4>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500">Bar comparison of money in vs money out this month.</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: "Month", Revenue: monthAnalytics.revenue, Expenses: monthAnalytics.expenses, Profit: Math.max(0, monthAnalytics.profit) }]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(129,140,248,0.08)" />
                      <XAxis dataKey="name" stroke="#a1a1a1" />
                      <YAxis stroke="#a1a1a1" />
                      <Tooltip formatter={(v: any) => `${currency} ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} contentStyle={{ background: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#fff" }} />
                      <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "11px" }} />
                      <Bar dataKey="Revenue" fill="#10B981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Expenses" fill="#EF4444" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Profit" fill="#6366F1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
                <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Jobs Per Day</h4>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500">Number of contract jobs opened on each active day.</p>
                <div className="h-64">
                  {monthAnalytics.jobsPerDay.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center text-[11px] text-gray-400 dark:text-zinc-500">No jobs created yet this month.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthAnalytics.jobsPerDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(129,140,248,0.08)" />
                        <XAxis dataKey="day" stroke="#a1a1a1" fontSize={10} />
                        <YAxis allowDecimals={false} stroke="#a1a1a1" />
                        <Tooltip contentStyle={{ background: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#fff" }} />
                        <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "11px" }} />
                        <Line type="monotone" dataKey="Jobs" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Service channel pie + Staff performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
                <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Service Channel Mix</h4>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500">Share of revenue across service categories.</p>
                <div className="h-64">
                  {monthAnalytics.serviceChannels.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center text-[11px] text-gray-400 dark:text-zinc-500">No revenue recorded yet.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={monthAnalytics.serviceChannels} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => `${e.name} ${e.pct.toFixed(0)}%`}>
                          {monthAnalytics.serviceChannels.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any, name: any) => [`${currency} ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, name]} contentStyle={{ background: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#fff" }} />
                        <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
                <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Staff Performance</h4>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500">Jobs completed vs late arrivals per staff member.</p>
                <div className="h-64">
                  {monthAnalytics.staffPerformance.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center text-[11px] text-gray-400 dark:text-zinc-500">No staff activity yet.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthAnalytics.staffPerformance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(129,140,248,0.08)" />
                        <XAxis dataKey="staff" stroke="#a1a1a1" fontSize={10} />
                        <YAxis allowDecimals={false} stroke="#a1a1a1" />
                        <Tooltip contentStyle={{ background: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#fff" }} />
                        <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "11px" }} />
                        <Bar dataKey="jobs" fill="#0EA5E9" radius={[4, 4, 0, 0]} name="Jobs" />
                        <Bar dataKey="late" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Late Arrivals" />
                        <Bar dataKey="reports" fill="#10B981" radius={[4, 4, 0, 0]} name="Shift Reports" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Inventory levels */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3 mt-6">
              <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Inventory Stock Levels</h4>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500">Current remaining stock per SKU (red markers indicate items at or below minimum).</p>
              <div className="h-72">
                {inventory.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-[11px] text-gray-400 dark:text-zinc-500">No inventory items cataloged.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={inventory.slice(0, 20).map(i => ({ name: i.item.length > 12 ? i.item.substring(0, 12) + "…" : i.item, Stock: i.remainingStock, low: i.remainingStock <= i.minimumStock ? i.remainingStock : 0 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(129,140,248,0.08)" />
                      <XAxis dataKey="name" stroke="#a1a1a1" fontSize={9} interval={0} angle={-30} textAnchor="end" height={60} />
                      <YAxis stroke="#a1a1a1" fontSize={10} />
                      <Tooltip contentStyle={{ background: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", color: "#fff" }} />
                      <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "11px" }} />
                      <Bar dataKey="Stock" fill="#6366F1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="low" fill="#EF4444" radius={[4, 4, 0, 0]} name="Below Minimum" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 4: SKU INVENTORY CONTROLLER
          ---------------------------------------------------- */}
      {adminTab === "inventory" && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create inventory item (Span 1) */}
            <div className="lg:col-span-1 glass-panel rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden paper-texture">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Catalog New Inventory SKU</h3>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-relaxed font-medium">Add new paper rolls, blanks, toners, or films to material lists.</p>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">SKU Item Name *</label>
                  <input type="text" value={invItemName} onChange={(e) => setInvItemName(e.target.value)} placeholder="e.g. Matte Lamination Film (100m)" className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Category</label>
                    <select value={invCat} onChange={(e) => setInvCat(e.target.value as any)} className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold bg-white/40 dark:bg-zinc-900/40">
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
                    <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Opening Stock</label>
                    <input type="number" value={invOpenStock} onChange={(e) => setInvOpenStock(Math.max(0, parseInt(e.target.value) || 0))} className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Cost ({currency})</label>
                    <input type="number" value={invCost || ""} onChange={(e) => setInvCost(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full glass-input rounded-xl px-2.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Sell ({currency})</label>
                    <input type="number" value={invSellPrice || ""} onChange={(e) => setInvSellPrice(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full glass-input rounded-xl px-2.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Min Alert</label>
                    <input type="number" value={invMin} onChange={(e) => setInvMin(Math.max(0, parseInt(e.target.value) || 0))} className="w-full glass-input rounded-xl px-2.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Supplier Merchant</label>
                  <input type="text" value={invSupplier} onChange={(e) => setInvSupplier(e.target.value)} placeholder="e.g. Shanghai DTF Tech" className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
                </div>

                <button onClick={handleCreateInventoryItem} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-500 hover:to-orange-400 py-3.5 text-xs font-black text-white shadow-lg shadow-orange-500/25 active:scale-95 cursor-pointer transition-all duration-300 uppercase tracking-widest mt-2">
                  Catalog SKU Item
                </button>
              </div>
            </div>

            {/* Inventory table (Span 2) */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-6 overflow-x-auto space-y-4 shadow-xl relative overflow-hidden paper-texture">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Warehousing Catalog ({inventory.length} SKUs)</h3>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium mt-0.5">Real-time depletion tracker for stock safety</p>
                </div>
                <button 
                  onClick={() => handleExport("inventory")}
                  className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-white/10 font-bold py-2 px-3.5 rounded-xl text-xs transition-all duration-200 cursor-pointer self-start sm:self-center"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-500" /> Export Inventory SKU Sheet
                </button>
              </div>
              
              <table className="w-full text-left border-collapse text-xs rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 dark:from-emerald-950/45 dark:to-cyan-950/45 text-emerald-900 dark:text-emerald-300 font-black uppercase tracking-wider text-[10px] border-b border-white/10">
                    <th className="py-3.5 px-4 rounded-l-xl">Item Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">Remaining Stock</th>
                    <th className="py-3.5 px-4 text-right">Cost Price</th>
                    <th className="py-3.5 px-4 text-right">Selling Price</th>
                    <th className="py-3.5 px-4 text-right">Value Left</th>
                    <th className="py-3.5 px-4 text-right w-36 rounded-r-xl">Purchase Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-700 dark:text-zinc-300">
                  {inventory.map((item) => {
                    const isLow = item.remainingStock <= item.minimumStock;
                    return (
                      <tr key={item.id} className="hover:bg-white/5 dark:hover:bg-white/5 transition-all even:bg-white/2 dark:even:bg-white/1">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-900 dark:text-white block">{item.item}</span>
                          <span className="block text-[9px] text-gray-450 dark:text-zinc-500 font-mono mt-0.5">BC: {item.barcode} | Supplier: {item.supplier}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-white/10 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-white/10">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-3 py-0.5 rounded-full font-black ${
                            isLow 
                              ? "bg-rose-500/15 text-rose-500 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-500/20 animated animate-pulse" 
                              : "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-500/10"
                          }`}>
                            {item.remainingStock} units
                          </span>
                          {isLow && <span className="block text-[8px] text-rose-550 dark:text-rose-400 font-extrabold mt-1">LOW STOCK</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">{currency} {item.unitCost.toFixed(2)}</td>
                        <td className="py-3 px-3.5 text-right font-semibold text-indigo-600 dark:text-indigo-400">{currency} {item.sellingPrice.toFixed(2)}</td>
                        <td className="py-3 px-3.5 text-right font-mono">
                          <div className="text-[9px] text-amber-600 dark:text-amber-400 font-black">{currency} {(item.remainingStock * item.unitCost).toFixed(2)}</div>
                          <div className="text-[9px] text-blue-600 dark:text-blue-400 font-black">{currency} {(item.remainingStock * item.sellingPrice).toFixed(2)}</div>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          {editInvId === item.id ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                placeholder="Qty"
                                value={addQty || ""}
                                onChange={(e) => setAddQty(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-16 glass-input rounded-lg px-2 py-1 text-xs text-right text-gray-900 dark:text-white"
                              />
                              <button
                                onClick={() => handleRegisterRestock(item)}
                                className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-lg hover:bg-emerald-500 cursor-pointer shadow-md shadow-emerald-600/10 active:scale-95 transition"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => { setEditInvId(item.id); setAddQty(0); }}
                                className="inline-flex items-center gap-1.5 border border-white/10 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-white/10 dark:hover:bg-zinc-800 text-[10px] font-black px-3 py-1.5 rounded-lg backdrop-blur-md cursor-pointer transition"
                              >
                                <PlusCircle className="h-3.5 w-3.5 text-blue-500" />
                                Order Restock
                              </button>
                              <button
                                onClick={() => handleDeleteInventoryItem(item)}
                                className="inline-flex items-center gap-1.5 border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-950/30 text-[10px] font-black px-2 py-1.5 rounded-lg backdrop-blur-md cursor-pointer transition"
                                title="Remove item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 5: EOD REPORT DECK APPROVALS
          ---------------------------------------------------- */}
      {adminTab === "eod" && (
        <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden paper-texture">
          {/* Top CMYK Accent Bar */}
          <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />

          <div className="border-b border-white/10 pb-3 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Day-End Sales Submission Desk</h3>
              <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium leading-relaxed">Authorize day close submissions uploaded by staff to transfer them to permanent accounting ledgers.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleDownloadDailyReport}
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-500/20 active:scale-95 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Download Daily Business Report
              </button>
              <button 
                onClick={handleDownloadLiveShiftCSV}
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg shadow-indigo-500/20 active:scale-95 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Export Live Shift Activity
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {reports.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center font-bold">No Day-End submissions exist in queue.</p>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="glass-card rounded-2xl p-5 text-xs flex flex-col md:flex-row justify-between gap-4 border border-white/10 bg-white/10 dark:bg-zinc-900/15 backdrop-blur-md shadow-lg">
                  <div className="space-y-2.5 w-full">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-950 dark:text-white text-sm">{report.date}</span>
                      <span className="font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-blue-500/10 uppercase tracking-widest">
                        {report.shift}
                      </span>
                    </div>
                    
                    <p className="text-gray-400 font-medium font-semibold">Submitted by: <span className="text-gray-950 dark:text-white font-black">{report.staffName}</span> at {report.closingTime}</p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1.5 bg-slate-500/5 dark:bg-zinc-950/40 p-4 rounded-xl border border-white/5">
                      <div><span className="text-gray-400 dark:text-zinc-500 block font-black uppercase text-[9px] tracking-wider">Apparel Sales</span> <span className="font-black text-gray-800 dark:text-zinc-200 text-sm">{currency} {report.tshirtsTotal.toFixed(2)}</span></div>
                      <div><span className="text-gray-400 dark:text-zinc-500 block font-black uppercase text-[9px] tracking-wider">Large Format</span> <span className="font-black text-gray-800 dark:text-zinc-200 text-sm">{currency} {report.largeFormatTotal.toFixed(2)}</span></div>
                      <div><span className="text-gray-400 dark:text-zinc-500 block font-black uppercase text-[9px] tracking-wider">DTF Print</span> <span className="font-black text-gray-800 dark:text-zinc-200 text-sm">{currency} {report.dtfTotal.toFixed(2)}</span></div>
                      <div><span className="text-gray-400 dark:text-zinc-500 block font-black uppercase text-[9px] tracking-wider">Total Sales</span> <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-orange-500 dark:from-blue-400 dark:to-orange-400 text-sm">{currency} {report.totalSales.toFixed(2)}</span></div>
                    </div>

                    {report.remarks && (
                      <p className="text-gray-550 dark:text-zinc-400 italic mt-2 bg-slate-500/5 p-3 rounded-xl border border-white/5 font-semibold">" {report.remarks} "</p>
                    )}
                  </div>

                  <div className="flex flex-col items-start md:items-end justify-between min-w-[190px] border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-4 shrink-0">
                    <div>
                      <span className={`inline-block font-black px-3.5 py-1 rounded-full text-[10px] tracking-widest border ${
                        report.isApproved 
                          ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-500/20" 
                          : "bg-orange-500/15 text-orange-600 dark:bg-orange-950/30 dark:text-orange-450 border-orange-500/20"
                      }`}>
                        {report.isApproved ? "✓ APPROVED" : "PENDING AUDIT"}
                      </span>
                    </div>

                    {!report.isApproved && (
                      <button
                        onClick={() => handleApproveReport(report.id)}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3 text-xs shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition active:scale-95 cursor-pointer mt-4 uppercase tracking-widest"
                      >
                        <ShieldCheck className="h-4 w-4" /> Certify Numbers
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 6: SYSTEM AUDIT & CRYPTO BACKUPS
          ---------------------------------------------------- */}
      {adminTab === "audit" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-1 glass-panel rounded-2xl p-6 space-y-4 h-fit shadow-xl relative overflow-hidden paper-texture">
            {/* Top CMYK Accent Bar */}
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
            
            <h3 className="text-sm font-black text-gray-900 dark:text-white border-b border-white/10 pb-3 uppercase tracking-tight">
              Automated Cloud Backups
            </h3>
            <p className="text-xs text-gray-400 dark:text-zinc-500 leading-relaxed font-medium">
              Printopia OS auto-saves encrypted database frames to AWS Glacier backup blocks. To enforce a localized restorable snap, trigger a manual backup below.
            </p>

            <button onClick={handleBackup} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-500 hover:to-orange-400 text-white py-3.5 font-black text-xs shadow-lg shadow-orange-500/25 cursor-pointer transition active:scale-95 uppercase tracking-widest">
              <RefreshCw className="h-3.5 w-3.5" /> Enforce Cloud Backup
            </button>
          </div>

          <div className="md:col-span-2 glass-panel rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden paper-texture">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Operational Audit Logs</h3>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium">Trace all staff workflows, stock additions, depletions, and process comments.</p>
              </div>

              {/* Filtering Suite */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={auditModuleFilter}
                  onChange={(e) => setAuditModuleFilter(e.target.value)}
                  className="glass-input rounded-lg text-gray-750 dark:text-white text-xs px-3 py-1.5 focus:border-indigo-500 outline-hidden bg-white/40 dark:bg-zinc-900/40 font-bold"
                >
                  <option value="All">All Modules</option>
                  <option value="Inventory">Inventory Only</option>
                  <option value="Jobs">Custom Jobs</option>
                  <option value="Sales">Sales & Printing</option>
                  <option value="Auth">Authentication</option>
                  <option value="Settings">Settings</option>
                </select>

                <input
                  type="text"
                  placeholder="Search log processes..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="glass-input rounded-lg text-gray-700 dark:text-white text-xs px-3.5 py-1.5 w-40 sm:w-48 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredLogs.length === 0 ? (
                <div className="py-8 text-center text-gray-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider">
                  No audit logs matching search parameters were found.
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isInventory = log.module.toLowerCase() === "inventory";
                  const isStockProcess = log.details.includes("[STOCK PROCESS]");
                  
                  return (
                    <div
                      key={log.id}
                      className={`text-xs p-4 rounded-xl border transition-all ${
                        isInventory
                          ? "bg-orange-500/5 border-orange-500/15 dark:border-orange-500/10"
                          : "border-white/5 bg-white/10 dark:bg-zinc-900/15 backdrop-blur-md"
                      } flex gap-3.5 hover:translate-x-1 duration-300`}
                    >
                      <div className={`h-9 w-9 rounded-full shrink-0 flex items-center justify-center font-black text-xs shadow-sm ${
                        isInventory
                          ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                          : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                      }`}>
                        {log.user.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1.5 w-full">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-gray-950 dark:text-white font-bold text-[13px]">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 font-extrabold">{log.user}</span> executed <span className="font-semibold text-gray-800 dark:text-zinc-200">{log.action}</span>
                          </p>
                          
                          {/* Module Badge */}
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            isInventory
                              ? "bg-orange-500/10 text-orange-600 border-orange-500/15 dark:text-orange-400"
                              : log.module.toLowerCase() === "auth"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/15 dark:text-emerald-400"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/15 dark:text-blue-450"
                          }`}>
                            {log.module}
                          </span>
                        </div>
                        
                        <p className={`text-[11px] font-medium leading-relaxed ${
                          isStockProcess 
                            ? "text-orange-800 dark:text-orange-300 bg-orange-500/5 px-3 py-2 rounded-lg border border-orange-500/10" 
                            : "text-gray-600 dark:text-zinc-300"
                        }`}>
                          {log.details}
                        </p>
                        
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB: STAFF ACTIVITY TRACKER (ADMIN ONLY)
          ---------------------------------------------------- */}
      {adminTab === "staff-activity" && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden paper-texture">
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-5">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-indigo-500" />
                  Live Staff Activity Monitor
                </h3>
                <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium mt-0.5">
                  View all recorded activities for each staff member. Download as Excel to cross-reference against End of Shift reports.
                </p>
              </div>
              <button
                onClick={handleDownloadStaffActivity}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black py-2.5 px-5 rounded-xl text-xs shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer transition-all uppercase tracking-widest shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Download Activity Report
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Filter by Staff Member</label>
                <select
                  value={selectedStaffFilter}
                  onChange={(e) => setSelectedStaffFilter(e.target.value)}
                  className="glass-input w-full rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 dark:text-white bg-white/40 dark:bg-zinc-900/40"
                >
                  <option value="all">All Staff Members</option>
                  {staffAccounts.map(st => (
                    <option key={st.id} value={st.name}>{st.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Filter by Date</label>
                <input
                  type="date"
                  value={activityDateFilter}
                  onChange={(e) => setActivityDateFilter(e.target.value)}
                  className="glass-input w-full rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => { setSelectedStaffFilter("all"); setActivityDateFilter(""); }}
                  className="inline-flex items-center gap-1.5 border border-white/10 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reset
                </button>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
              {filteredStaffLogs.length === 0 ? (
                <div className="py-12 text-center">
                  <UserCheck className="h-10 w-10 text-gray-300 dark:text-zinc-700 mx-auto mb-3" />
                  <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">No activity logs found for the selected filters.</p>
                </div>
              ) : (
                filteredStaffLogs.map((log) => (
                  <div key={log.id} className="flex gap-3.5 p-4 rounded-xl bg-white/10 dark:bg-zinc-900/20 border border-white/5 hover:bg-white/15 dark:hover:bg-zinc-900/30 transition-all duration-200 group">
                    <div className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center font-black text-xs shadow-sm bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                      {log.user.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[13px] font-bold text-gray-900 dark:text-white">
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400">{log.user}</span>
                          <span className="text-gray-500 dark:text-zinc-400 font-medium"> performed </span>
                          <span className="font-semibold text-gray-800 dark:text-zinc-200">{log.action}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-blue-500/10 text-blue-600 border-blue-500/15 dark:text-blue-400">{log.module}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-zinc-300 font-medium leading-relaxed">{log.details}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {filteredStaffLogs.length > 0 && (
              <p className="text-[10px] text-gray-400 dark:text-zinc-600 text-center font-mono mt-4">
                Showing {filteredStaffLogs.length} recorded activities — Download the report to compare with staff End of Shift submission.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB: LATE ARRIVAL NOTES (ADMIN)
          ---------------------------------------------------- */}
      {adminTab === "late-notes" && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden paper-texture">
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-5">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Staff Attendance & Late Arrival
                </h3>
                <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium mt-0.5">
                  Track staff clock-in/clock-out sessions and record tardiness incidents for performance audits.
                </p>
              </div>
            </div>

            {/* Sub-tab switcher */}
            <div className="flex p-0.5 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-white/5 mb-6 w-fit">
              {[
                { id: "attendance", label: "Attendance Sessions" },
                { id: "notes", label: "Late Arrival Notes" }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setLateNotesSubTab(t.id as "attendance" | "notes")}
                  className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    lateNotesSubTab === t.id
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20"
                      : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ===== ATTENDANCE SESSIONS SUB-TAB ===== */}
            {lateNotesSubTab === "attendance" && (
              <div className="space-y-6">
                {/* Record Session Form */}
                <div className="glass-card border border-white/10 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/10 p-6 rounded-2xl space-y-4 shadow-md">
                  <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Record New Session
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div>
                      <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Date</label>
                      <input
                        type="date"
                        value={attSessionDate}
                        onChange={(e) => setAttSessionDate(e.target.value)}
                        className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Staff Member</label>
                      <select
                        value={attSessionStaffId}
                        onChange={(e) => setAttSessionStaffId(e.target.value as "staff-1" | "staff-2")}
                        className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold bg-white/40 dark:bg-zinc-900/40"
                      >
                        {staffAccounts.map(st => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Session Type</label>
                      <select
                        value={attSessionType}
                        onChange={(e) => setAttSessionType(e.target.value as "Clock In" | "Clock Out")}
                        className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold bg-white/40 dark:bg-zinc-900/40"
                      >
                        <option value="Clock In">Clock In</option>
                        <option value="Clock Out">Clock Out</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Time (HH:MM)</label>
                      <input
                        type="time"
                        value={attSessionTime}
                        onChange={(e) => setAttSessionTime(e.target.value)}
                        className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveAttendanceSession}
                    className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-6 py-3.5 text-xs font-black text-white shadow-lg shadow-orange-500/25 active:scale-95 cursor-pointer transition-all duration-300 uppercase tracking-widest"
                  >
                    Record Session
                  </button>
                </div>

                {/* Sessions Table */}
                <div className="glass-card border border-white/10 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/10 p-6 rounded-2xl shadow-md overflow-x-auto">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-widest">
                      Attendance Sessions ({staffAttendance.length})
                    </h4>
                  </div>

                  {staffAttendance.length === 0 ? (
                    <div className="py-12 text-center">
                      <Clock className="h-10 w-10 text-gray-300 dark:text-zinc-700 mx-auto mb-3" />
                      <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">No attendance sessions recorded yet.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[760px]">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-zinc-400 border-b border-white/10">
                          <th className="py-2.5 pr-3 font-black">Date</th>
                          <th className="py-2.5 pr-3 font-black">Staff Name</th>
                          <th className="py-2.5 pr-3 font-black">Clock In</th>
                          <th className="py-2.5 pr-3 font-black">Clock Out</th>
                          <th className="py-2.5 pr-3 font-black">Type</th>
                          <th className="py-2.5 pr-3 font-black">Recorded By</th>
                          <th className="py-2.5 font-black">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {staffAttendance.map((s) => (
                          <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 dark:hover:bg-zinc-900/20 transition-colors">
                            <td className="py-3 pr-3 font-mono text-gray-700 dark:text-zinc-300">{s.date}</td>
                            <td className="py-3 pr-3 font-bold text-gray-900 dark:text-white">{s.staffName}</td>
                            <td className="py-3 pr-3 font-mono text-emerald-600 dark:text-emerald-400">{s.clockInTime || "—"}</td>
                            <td className="py-3 pr-3 font-mono text-rose-600 dark:text-rose-400">{s.clockOutTime || "—"}</td>
                            <td className="py-3 pr-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                s.sessionType === "Clock Out"
                                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              }`}>
                                {s.sessionType || "—"}
                              </span>
                            </td>
                            <td className="py-3 pr-3 text-gray-600 dark:text-zinc-300">{s.recordedBy}</td>
                            <td className="py-3 font-mono text-[10px] text-gray-400 dark:text-zinc-500">{new Date(s.timestamp).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ===== LATE ARRIVAL NOTES SUB-TAB ===== */}
            {lateNotesSubTab === "notes" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Note Entry Form */}
              <div className="lg:col-span-1 glass-card border border-white/10 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/10 p-6 rounded-2xl space-y-4 shadow-md h-fit">
                <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-widest border-b border-white/10 pb-2">
                  Record New Note
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Date of Incident</label>
                    <input
                      type="date"
                      value={lateNoteDate}
                      onChange={(e) => setLateNoteDate(e.target.value)}
                      className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Staff Member</label>
                    <select
                      value={lateNoteStaffId}
                      onChange={(e) => setLateNoteStaffId(e.target.value as "staff-1" | "staff-2")}
                      className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold bg-white/40 dark:bg-zinc-900/40"
                    >
                      {staffAccounts.map(st => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Note Details *</label>
                    <textarea
                      value={lateNoteText}
                      onChange={(e) => setLateNoteText(e.target.value)}
                      placeholder="e.g. Arrived 25 minutes late without prior notice..."
                      rows={4}
                      className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold resize-y"
                    />
                  </div>

                  <button
                    onClick={handleSaveLateNote}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 py-3.5 text-xs font-black text-white shadow-lg shadow-orange-500/25 active:scale-95 cursor-pointer transition-all duration-300 uppercase tracking-widest"
                  >
                    Save Late Arrival Note
                  </button>
                </div>
              </div>

              {/* Notes History */}
              <div className="lg:col-span-2 glass-card border border-white/10 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/10 p-6 rounded-2xl shadow-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-widest">
                    Recorded Notes ({staffNotes.length})
                  </h4>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {staffNotes.length === 0 ? (
                    <div className="py-12 text-center">
                      <Clock className="h-10 w-10 text-gray-300 dark:text-zinc-700 mx-auto mb-3" />
                      <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">No late arrival notes recorded yet.</p>
                    </div>
                  ) : (
                    staffNotes.map((note) => (
                      <div
                        key={note.id}
                        className="flex gap-3.5 p-4 rounded-xl bg-white/10 dark:bg-zinc-900/20 border border-white/5 hover:bg-white/15 dark:hover:bg-zinc-900/30 transition-all duration-200 group"
                      >
                        <div className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center font-black text-xs shadow-sm bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          <Clock className="h-4.5 w-4.5" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-[13px] font-bold text-gray-900 dark:text-white">
                              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400">{note.staffName}</span>
                              <span className="text-gray-500 dark:text-zinc-400 font-medium"> — </span>
                              <span className="font-mono text-[10px] bg-white/50 dark:bg-zinc-900 px-2 py-0.5 rounded border border-white/10 text-gray-600 dark:text-zinc-400">{note.date}</span>
                            </p>
                            <button
                              onClick={() => handleDeleteLateNote(note.id)}
                              className="text-rose-500 hover:text-rose-600 text-[10px] font-black uppercase tracking-wider cursor-pointer transition opacity-0 group-hover:opacity-100"
                              title="Delete note"
                            >
                              Delete
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-600 dark:text-zinc-300 font-medium leading-relaxed bg-slate-500/5 p-3 rounded-lg border border-white/5">
                            "{note.note}"
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(note.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB: SECURITY COMMAND CONSOLE
          ---------------------------------------------------- */}
      {adminTab === "security" && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden paper-texture">
            {/* Top CMYK Accent Bar */}
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
            
            <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Terminal Access & Security Command
                </h3>
                <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">
                  Review credential compliance and execute instant security overrides for registered staff operators.
                </p>
              </div>
              <div className="text-[10px] bg-emerald-500/10 border border-emerald-500/15 px-3 py-1.5 rounded-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 self-start md:self-auto uppercase tracking-wider">
                ✓ SSL/TLS Encrypted Storage
              </div>
            </div>

            {/* Active Operators Ledger */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-indigo-950 dark:text-zinc-400 uppercase tracking-widest">
                Active Staff Operator Ledger
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    id: "staff-1" as const,
                    name: staff1Name || "Staff Member 1",
                    username: staff1User || "staff1",
                     role: staff1Role || "Staff 1",
                    passText: staff1Pass,
                    avatarLetter: "1"
                  },
                  {
                    id: "staff-2" as const,
                    name: staff2Name || "Staff Member 2",
                    username: staff2User || "staff2",
                    role: staff2Role || "Inventory Officer",
                    passText: staff2Pass,
                    avatarLetter: "2"
                  }
                ].map((member) => (
                  <div 
                    key={member.id}
                    className="glass-card border border-white/10 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/10 p-6 rounded-2xl flex flex-col justify-between gap-6 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden"
                  >
                    {/* Background subtle shield accent */}
                    <ShieldCheck className="absolute right-[-20px] bottom-[-20px] h-32 w-32 text-indigo-500/3 dark:text-indigo-400/2 pointer-events-none" />

                    <div className="flex gap-4 items-start relative z-10">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
                        {member.avatarLetter}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/10 uppercase tracking-widest font-mono">
                          Staff Terminal
                        </span>
                        <h4 className="text-sm font-black text-gray-900 dark:text-white pt-1">
                          {member.name}
                        </h4>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 font-semibold">
                          {member.role}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-500/5 dark:bg-zinc-950/40 p-4 rounded-xl border border-white/5 space-y-2.5 relative z-10">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 dark:text-zinc-500 font-bold uppercase text-[9px] tracking-wider">Username</span>
                        <span className="font-mono font-black text-gray-900 dark:text-white bg-white/50 dark:bg-zinc-900 px-2.5 py-0.5 rounded border border-white/10">
                          {member.username}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 dark:text-zinc-500 font-bold uppercase text-[9px] tracking-wider">Access Status</span>
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 text-[10px] tracking-widest uppercase">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Authorized
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 dark:text-zinc-500 font-bold uppercase text-[9px] tracking-wider">Active Password</span>
                        <span className="font-mono font-bold text-gray-500 dark:text-zinc-400">
                          {"•".repeat(Math.max(6, member.passText.length))}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setResetModalStaffId(member.id);
                        setResetModalNewPassword("");
                        setResetModalConfirmPassword("");
                        setResetModalShowPassword(false);
                        setIsResetModalOpen(true);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black py-3 text-xs shadow-md shadow-indigo-600/15 transition active:scale-95 cursor-pointer relative z-10 uppercase tracking-widest text-[11px]"
                    >
                      <Key className="h-4 w-4" /> Reset Password
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance guidelines */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <div className="p-4 bg-slate-500/5 dark:bg-zinc-900/10 border border-white/5 rounded-2xl space-y-1.5">
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">1. Unique Passwords</span>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-relaxed font-semibold">
                  Printopia OS enforces unique logins. Staff 1 and Staff 2 cannot share identical access keys.
                </p>
              </div>
              <div className="p-4 bg-slate-500/5 dark:bg-zinc-900/10 border border-white/5 rounded-2xl space-y-1.5">
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">2. Periodic Rotations</span>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-relaxed font-semibold">
                  Admins should rotate terminal passwords monthly to mitigate shoulder-surfing risks inside the production floor.
                </p>
              </div>
              <div className="p-4 bg-slate-500/5 dark:bg-zinc-900/10 border border-white/5 rounded-2xl space-y-1.5">
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">3. Immutable Logging</span>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-relaxed font-semibold">
                  Every password modification is logged in the System Audit Log. Deletions or unauthorized edits are strictly tracked.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB: SMS BROADCAST
          ---------------------------------------------------- */}
      {adminTab === "broadcast" && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden paper-texture">
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
            
            <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  SMS Broadcast Center
                </h3>
                <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium mt-0.5">
                  Send one message to all saved customer phone numbers at once. You can also add contacts manually below.
                </p>
              </div>
              <div className="text-[10px] bg-indigo-500/10 border border-indigo-500/15 px-3 py-1.5 rounded-xl font-bold font-mono text-indigo-700 dark:text-indigo-400 self-start md:self-auto uppercase tracking-wider">
                {broadcastRecipients.length} Recipients
              </div>
            </div>

            {broadcastSent && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Broadcast sent successfully via Africa's Talking!
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Message Composer */}
              <div className="glass-card border border-white/10 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/10 p-6 rounded-2xl space-y-4 shadow-md h-fit">
                <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-widest border-b border-white/10 pb-2">
                  Compose Message
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Message *</label>
                    <textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Type your broadcast message here..."
                      rows={6}
                      maxLength={160}
                      className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold resize-y"
                    />
                    <p className="text-[9px] text-gray-400 dark:text-zinc-500 mt-1 font-medium">
                      {broadcastMessage.length}/160 characters
                    </p>
                  </div>

                  <button
                    onClick={handleSendBroadcast}
                    disabled={broadcastRecipients.length === 0}
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 py-3.5 text-xs font-black text-white shadow-lg shadow-indigo-500/25 active:scale-95 cursor-pointer transition-all duration-300 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send Broadcast
                  </button>

                  <p className="text-[9px] text-gray-400 dark:text-zinc-500 font-medium leading-relaxed">
                    Requires Africa's Talking credentials in Global Settings. Messages will be sent to all saved customer numbers or manually added contacts.
                  </p>
                </div>
              </div>

              {/* Recipients List & Contact Management */}
              <div className="glass-card border border-white/10 dark:border-zinc-800/40 bg-white/40 dark:bg-zinc-900/10 p-6 rounded-2xl shadow-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <h4 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-widest">
                    Recipients ({broadcastRecipients.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyBroadcastNumbers}
                      disabled={broadcastRecipients.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 text-gray-700 dark:text-zinc-300 font-bold py-2 px-3 text-[10px] cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {broadcastCopied ? "Copied!" : "Copy All Numbers"}
                    </button>
                    {smsContacts.length > 0 && (
                      <button
                        onClick={handleClearAllContacts}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold py-2 px-3 text-[10px] cursor-pointer transition"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Add Contact Form */}
                <div className="border border-white/10 rounded-xl p-4 mb-4 space-y-3">
                  <h5 className="text-[10px] font-black text-gray-700 dark:text-zinc-300 uppercase tracking-widest">Add New Contact</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-1">Name</label>
                      <input
                        type="text"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        placeholder="Contact name"
                        className="w-full glass-input rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        onBlur={(e) => setNewContactPhone(formatPhoneNumber(e.target.value))}
                        placeholder="e.g. 0201234567 or +233241234567"
                        className="w-full glass-input rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white font-semibold"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddContact}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-2.5 text-[10px] shadow-md cursor-pointer active:scale-95 transition-all uppercase tracking-widest"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Add Contact
                  </button>
                </div>

                {/* Contacts List */}
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {broadcastRecipients.length === 0 ? (
                    <div className="py-12 text-center">
                      <MessageSquare className="h-10 w-10 text-gray-300 dark:text-zinc-700 mx-auto mb-3" />
                      <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">No recipients found.</p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-600 mt-1">Add contacts manually above or add customers with phone numbers in orders.</p>
                    </div>
                  ) : smsContacts.length > 0 ? (
                    <div className="space-y-2">
                      {smsContacts.map((contact) => (
                        <div key={contact.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/10 dark:bg-zinc-900/20 border border-white/5">
                          {editingContactId === contact.id ? (
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={editingContactName}
                                onChange={(e) => setEditingContactName(e.target.value)}
                                className="glass-input rounded px-2 py-1 text-xs"
                              />
                              <input
                                type="text"
                                value={editingContactPhone}
                                onChange={(e) => setEditingContactPhone(e.target.value)}
                                onBlur={(e) => setEditingContactPhone(formatPhoneNumber(e.target.value))}
                                className="glass-input rounded px-2 py-1 text-xs"
                              />
                            </div>
                          ) : (
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{contact.name}</p>
                              <p className="text-[10px] font-mono text-gray-500 dark:text-zinc-400">{contact.phone}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-1 ml-2 shrink-0">
                            {editingContactId === contact.id ? (
                              <>
                                <button
                                  onClick={handleSaveEditContact}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 cursor-pointer transition"
                                  title="Save"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingContactId(null)}
                                  className="p-1.5 rounded-lg bg-gray-500/10 text-gray-600 hover:bg-gray-500/20 cursor-pointer transition"
                                  title="Cancel"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditContact(contact.id)}
                                  className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 cursor-pointer transition"
                                  title="Edit"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteContact(contact.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 cursor-pointer transition"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium mb-2">Auto-collected from customer orders:</p>
                      {broadcastRecipients.map((phone, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 dark:bg-zinc-900/20 border border-white/5 text-xs font-mono text-gray-700 dark:text-zinc-300"
                        >
                          <span className="h-2 w-2 rounded-full bg-indigo-500/50 shrink-0" />
                          {phone}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {adminTab === "settings" && (
        <div className="max-w-2xl mx-auto glass-panel rounded-2xl p-8 space-y-6 shadow-xl relative overflow-hidden paper-texture">
          {/* Top CMYK Accent Bar */}
          <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />

          <div className="border-b border-white/10 pb-3">
            <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Global Shop Configurator</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">Configure client billing addresses, local VAT indices, and transaction documentation templates.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Company Name</label>
              <input type="text" value={settName} onChange={(e) => setSettName(e.target.value)} className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Billing Phone Number</label>
              <input type="text" value={settPhone} onChange={(e) => setSettPhone(e.target.value)} className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Billing Email Inbox</label>
              <input type="email" value={settEmail} onChange={(e) => setSettEmail(e.target.value)} className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Billing Street Address</label>
              <textarea rows={2} value={settAddress} onChange={(e) => setSettAddress(e.target.value)} className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Tax Percentage (%)</label>
              <input type="number" value={settVat} onChange={(e) => setSettVat(parseFloat(e.target.value) || 0)} className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Currency Code</label>
              <select value={settCurrency} onChange={(e) => setSettCurrency(e.target.value)} className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold bg-white/40 dark:bg-zinc-900/40">
                <option value="GHS">GHS (₵ - Ghanaian Cedi)</option>
                <option value="USD">USD ($ - United States Dollar)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="NGN">NGN (₦ - Nigerian Naira)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Sync Server URL (for multi-computer sync)</label>
              <input
                type="text"
                value={settSyncServerUrl}
                onChange={(e) => setSettSyncServerUrl(e.target.value)}
                placeholder="e.g. http://192.168.1.50:3001 or https://your-server.com:3001"
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold"
              />
              <p className="text-[9px] text-gray-400 dark:text-zinc-500 mt-1 font-medium">
                Leave empty to auto-detect localhost. For multiple office computers, enter the server's LAN or internet address.
              </p>
            </div>

            <div className="sm:col-span-2 pt-4 border-t border-white/10">
              <p className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-widest mb-3">Africa's Talking SMS Configuration</p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">AT Username</label>
              <input
                type="text"
                value={settAfricasTalkingUsername}
                onChange={(e) => setSettAfricasTalkingUsername(e.target.value)}
                placeholder="e.g. Printopia"
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">AT API Key</label>
              <input
                type="password"
                value={settAfricasTalkingApiKey}
                onChange={(e) => setSettAfricasTalkingApiKey(e.target.value)}
                placeholder="Paste your Africa's Talking API key"
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Sender ID</label>
              <input
                type="text"
                value={settAfricasTalkingSenderId}
                onChange={(e) => setSettAfricasTalkingSenderId(e.target.value)}
                placeholder="e.g. Printopia"
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold"
              />
              <p className="text-[9px] text-gray-400 dark:text-zinc-500 mt-1 font-medium">
                Get your credentials from dashboard.africastalking.com
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Receipt Footer Note</label>
              <input type="text" value={settReceiptFooter} onChange={(e) => setSettReceiptFooter(e.target.value)} className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Invoice Terms / Footer</label>
              <input type="text" value={settInvoiceFooter} onChange={(e) => setSettInvoiceFooter(e.target.value)} className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold" />
            </div>
          </div>

          {/* Staff Credentials & Terminal Access */}
          <div className="border-t border-white/10 pt-6 mt-6 space-y-4">
            <div>
              <h3 className="text-sm font-black text-gray-950 dark:text-white flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Staff Credentials & Terminal Access
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5 leading-relaxed font-medium">
                Configure the two authorized staff members. For security compliance and precise shift audatability, both accounts must have completely unique passwords.
              </p>
            </div>

            {/* DIRECT PASSWORD OVERRIDE CONSOLE */}
            <div className="glass-card border border-indigo-500/15 bg-indigo-500/5 dark:bg-indigo-950/10 p-5 rounded-2xl space-y-4 shadow-md">
              <div className="flex items-center gap-2 border-b border-indigo-500/10 pb-3">
                <div className="h-7 w-7 rounded-lg bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">Quick Staff Password Override & Management</h4>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5 font-medium">Select a staff member to instantly change or set their login password.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end text-xs">
                {/* 1. Select Staff Dropdown */}
                <div>
                  <label className="block text-[9px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Select Staff Member</label>
                  <select 
                    value={selectedStaffId} 
                    onChange={(e) => {
                      setSelectedStaffId(e.target.value as any);
                      setNewStaffPassword("");
                    }} 
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-950 dark:text-white font-semibold bg-white/45 dark:bg-zinc-900/40"
                  >
                    <option value="staff-1">{staff1Name || "Staff Member 1"} ({staff1User || "staff1"})</option>
                    <option value="staff-2">{staff2Name || "Staff Member 2"} ({staff2User || "staff2"})</option>
                  </select>
                </div>

                {/* 2. New Password Input & Helper */}
                <div>
                  <label className="block text-[9px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Set New Password
                  </label>
                  <div className="relative">
                    <input 
                      type={showOverridePass ? "text" : "password"} 
                      value={newStaffPassword} 
                      onChange={(e) => setNewStaffPassword(e.target.value)} 
                      placeholder="Enter new custom password..." 
                      className="w-full glass-input rounded-xl pl-3.5 pr-14 py-2.5 text-xs text-gray-950 dark:text-white font-mono font-semibold"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 pr-2.5">
                      <button 
                        type="button" 
                        onClick={() => setShowOverridePass(!showOverridePass)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-white font-black text-[9px] uppercase cursor-pointer"
                        title={showOverridePass ? "Hide" : "Show"}
                      >
                        {showOverridePass ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Action Buttons Grid */}
                <div className="flex gap-2.5">
                  <button 
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 text-[10px] font-black py-3 rounded-xl cursor-pointer active:scale-95 transition uppercase tracking-wider text-center"
                  >
                    Generate
                  </button>
                  <button 
                    type="button"
                    onClick={handleSetNewPassword}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[10px] font-black py-3 rounded-xl cursor-pointer shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/20 active:scale-95 transition uppercase tracking-wider text-center"
                  >
                    Set Password
                  </button>
                </div>
              </div>

              {/* Show Current Password Status Badge */}
              <div className="flex items-center justify-between text-[10px] bg-slate-500/5 px-4 py-2.5 rounded-xl border border-white/5">
                <span className="font-semibold text-gray-500 dark:text-zinc-400">
                  Current password for <strong className="text-gray-900 dark:text-white">{selectedStaffId === "staff-1" ? staff1Name : staff2Name}</strong> is:
                </span>
                <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/10">
                  {selectedStaffId === "staff-1" ? staff1Pass : staff2Pass}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Staff 1 Card */}
              <div className="glass-card border border-white/10 bg-slate-500/5 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 font-black text-gray-800 dark:text-white border-b border-white/10 pb-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-500/15 text-[10px] text-blue-600 dark:text-blue-400 font-black">1</span>
                  Staff Member #1
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Display Full Name</label>
                    <input
                      type="text"
                      value={staff1Name}
                      onChange={(e) => setStaff1Name(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-gray-900 dark:text-white font-semibold"
                      placeholder="e.g. Selasie Boateng"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Terminal Username</label>
                    <input
                      type="text"
                      value={staff1User}
                      onChange={(e) => setStaff1User(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-gray-900 dark:text-white font-mono"
                      placeholder="e.g. selasie"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Unique Access Password</label>
                    <input
                      type="text"
                      value={staff1Pass}
                      onChange={(e) => setStaff1Pass(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-gray-900 dark:text-white font-mono font-bold"
                      placeholder="e.g. unique_pass_1"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Role / Title Description</label>
                    <input
                      type="text"
                      value={staff1Role}
                      onChange={(e) => setStaff1Role(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-gray-900 dark:text-white"
                       placeholder="e.g. Staff 1"
                    />
                  </div>
                </div>
              </div>

              {/* Staff 2 Card */}
              <div className="glass-card border border-white/10 bg-slate-500/5 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 font-black text-gray-800 dark:text-white border-b border-white/10 pb-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-500/15 text-[10px] text-blue-600 dark:text-blue-400 font-black">2</span>
                  Staff Member #2
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Display Full Name</label>
                    <input
                      type="text"
                      value={staff2Name}
                      onChange={(e) => setStaff2Name(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-gray-950 dark:text-white font-semibold"
                      placeholder="e.g. Kojo Mensah"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Terminal Username</label>
                    <input
                      type="text"
                      value={staff2User}
                      onChange={(e) => setStaff2User(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-gray-900 dark:text-white font-mono"
                      placeholder="e.g. kojo"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Unique Access Password</label>
                    <input
                      type="text"
                      value={staff2Pass}
                      onChange={(e) => setStaff2Pass(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-gray-900 dark:text-white font-mono font-bold"
                      placeholder="e.g. unique_pass_2"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Role / Title Description</label>
                    <input
                      type="text"
                      value={staff2Role}
                      onChange={(e) => setStaff2Role(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-gray-900 dark:text-white"
                       placeholder="e.g. Staff 2"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Maintenance & Production Readiness */}
          <div className="border-t border-white/10 pt-6 mt-6 space-y-4">
            <div className="bg-rose-50/20 dark:bg-rose-950/10 border border-rose-100/40 dark:border-rose-900/20 rounded-xl p-5 text-xs space-y-3">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-black text-sm uppercase tracking-wide">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 animate-pulse" />
                Production Deployment Utilities
              </div>
              <p className="text-gray-600 dark:text-zinc-400 leading-relaxed font-medium">
                Transition this terminal to active commercial service. You can selectively purge the default pre-filled demo data (jobs, transactions, reports, expenditures) and stock lists to start on a completely fresh, empty ledger.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="glass-card border border-white/10 bg-white/20 dark:bg-zinc-900/50 p-4 rounded-xl space-y-3">
                  <span className="font-bold text-gray-800 dark:text-white block text-xs">Purge Transaction Records</span>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-relaxed">Removes all default mock job folders, cash register receipts, custom invoice histories, expenditures, and end-of-day shift reports. Keeps inventory catalog and shop settings intact.</p>
                  
                  {purgeType === "all" ? (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] text-rose-600 font-bold block">Type "CONFIRM" to authorize purge:</span>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Type CONFIRM"
                          value={purgeConfirmText}
                          onChange={(e) => setPurgeConfirmText(e.target.value)}
                          className="w-full glass-input rounded-xl px-3.5 py-1 bg-white/40 dark:bg-zinc-950 text-xs text-gray-900 dark:text-white outline-hidden font-bold border-rose-500/35"
                        />
                        <button
                          onClick={handleExecutePurgeAll}
                          className="px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] whitespace-nowrap cursor-pointer transition active:scale-95 shadow-md shadow-rose-600/20"
                        >
                          Execute
                        </button>
                        <button
                          onClick={() => { setPurgeType(null); setPurgeConfirmText(""); }}
                          className="px-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-gray-700 dark:text-zinc-300 font-semibold rounded-lg text-[11px] cursor-pointer transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setPurgeType("all"); setPurgeConfirmText(""); }}
                      className="px-4 py-2.5 bg-rose-50/10 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40 border border-rose-500/25 rounded-xl font-bold text-[11px] transition cursor-pointer"
                    >
                      Clear All Demo Transactions
                    </button>
                  )}
                </div>

                <div className="glass-card border border-white/10 bg-white/20 dark:bg-zinc-900/50 p-4 rounded-xl space-y-3">
                  <span className="font-bold text-gray-800 dark:text-white block text-xs">Purge Inventory Catalog</span>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-relaxed">Removes all pre-populated test materials (Paper boxes, vinyl sticker rolls, apparel blanks, inks) so you can catalog your exact starting quantities.</p>
                  
                  {purgeType === "inventory" ? (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] text-rose-600 font-bold block">Type "CONFIRM" to authorize purge:</span>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Type CONFIRM"
                          value={purgeConfirmText}
                          onChange={(e) => setPurgeConfirmText(e.target.value)}
                          className="w-full glass-input rounded-xl px-3.5 py-1 bg-white/40 dark:bg-zinc-950 text-xs text-gray-900 dark:text-white outline-hidden font-bold border-rose-500/35"
                        />
                        <button
                          onClick={handleExecutePurgeInventory}
                          className="px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] whitespace-nowrap cursor-pointer transition active:scale-95 shadow-md shadow-rose-600/20"
                        >
                          Execute
                        </button>
                        <button
                          onClick={() => { setPurgeType(null); setPurgeConfirmText(""); }}
                          className="px-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-gray-700 dark:text-zinc-300 font-semibold rounded-lg text-[11px] cursor-pointer transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setPurgeType("inventory"); setPurgeConfirmText(""); }}
                      className="px-4 py-2.5 bg-rose-50/10 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40 border border-rose-500/25 rounded-xl font-bold text-[11px] transition cursor-pointer"
                    >
                      Clear Inventory Catalog
                    </button>
                  )}
                </div>

                {/* Clear ALL data card */}
                <div className="glass-card border border-rose-500/30 bg-rose-500/5 p-4 rounded-xl space-y-3">
                  <span className="font-bold text-rose-700 dark:text-rose-400 block text-xs flex items-center gap-2">
                    <Trash2 className="h-4 w-4" /> Wipe Entire System
                  </span>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-relaxed">
                    Permanently clears ALL data — jobs, general orders, expenditures, reports, inventory, staff notes and attendance — then restores factory defaults. This cannot be undone. Action is recorded in the audit log.
                  </p>
                  <button
                    onClick={() => setIsClearDataModalOpen(true)}
                    className="w-full px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-[11px] transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear All Data & Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10">
            <button onClick={handleSaveSettings} className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-500 hover:to-orange-400 text-xs font-black text-white shadow-lg shadow-orange-500/25 cursor-pointer active:scale-95 transition-all duration-300 uppercase tracking-widest">
              Apply Configuration Changes
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          SECURE RESET PASSWORD MODAL
          ---------------------------------------------------- */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden paper-texture">
            {/* Top CMYK Accent Bar */}
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[4px]" />

            <div className="p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <Key className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                    Reset Operator Password
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">
                    Set a new unique login key for <strong className="text-gray-950 dark:text-white">{resetModalStaffId === "staff-1" ? staff1Name : staff2Name}</strong>.
                  </p>
                </div>
                <button 
                  onClick={() => setIsResetModalOpen(false)}
                  className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-750 dark:hover:text-white cursor-pointer transition"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* 1. New Password Input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider">
                    New Secure Password *
                  </label>
                  <div className="relative">
                    <input
                      type={resetModalShowPassword ? "text" : "password"}
                      value={resetModalNewPassword}
                      onChange={(e) => setResetModalNewPassword(e.target.value)}
                      placeholder="Enter new custom password..."
                      className="w-full glass-input rounded-xl pl-3.5 pr-14 py-2.5 text-xs text-gray-950 dark:text-white font-mono font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setResetModalShowPassword(!resetModalShowPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-white font-bold text-[9px] uppercase cursor-pointer"
                    >
                      {resetModalShowPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* 2. Confirm Password Input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider">
                    Confirm New Password *
                  </label>
                  <input
                    type={resetModalShowPassword ? "text" : "password"}
                    value={resetModalConfirmPassword}
                    onChange={(e) => setResetModalConfirmPassword(e.target.value)}
                    placeholder="Confirm password matches exactly..."
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-gray-950 dark:text-white font-mono font-semibold"
                  />
                </div>

                {/* Password validation warning check */}
                {resetModalNewPassword && resetModalConfirmPassword && resetModalNewPassword !== resetModalConfirmPassword && (
                  <p className="text-[10px] font-extrabold text-rose-600 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Passwords do not match!
                  </p>
                )}
              </div>

              {/* Action Suite */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleModalGenerateRandom}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black py-3 text-xs cursor-pointer transition active:scale-95 uppercase tracking-wider"
                >
                  Generate Password
                </button>
                <button
                  onClick={handleModalResetPassword}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3 text-xs shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition active:scale-95 cursor-pointer uppercase tracking-wider"
                >
                  Save Password
                </button>
              </div>

              <div className="flex justify-center pt-1">
                <button
                  onClick={() => setIsResetModalOpen(false)}
                  className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-white font-bold uppercase hover:underline cursor-pointer tracking-wider"
                >
                  Keep Existing Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          CLEAR ALL DATA CONFIRMATION MODAL
          ---------------------------------------------------- */}
      {isClearDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-rose-300 dark:border-rose-800 shadow-2xl relative overflow-hidden paper-texture">
            <div className="cmyk-bar absolute top-0 left-0 right-0 h-[4px]" />
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    Wipe Entire System?
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">
                    This permanently erases <strong>all</strong> jobs, general orders, expenditures, inventory, staff notes and attendance, then restores factory defaults. This action is logged to the audit trail.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                  Type <strong className="text-rose-600 dark:text-rose-400">CLEAR ALL</strong> to confirm
                </label>
                <input
                  type="text"
                  placeholder="Type CLEAR ALL"
                  value={purgeConfirmText}
                  onChange={(e) => setPurgeConfirmText(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-gray-900 dark:text-white outline-hidden border-rose-500/35"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => { setIsClearDataModalOpen(false); setPurgeConfirmText(""); }}
                  className="w-full inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 text-gray-700 dark:text-zinc-300 font-black py-3 text-xs cursor-pointer transition uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteClearData}
                  disabled={purgeConfirmText.toUpperCase() !== "CLEAR ALL"}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black py-3 text-xs shadow-lg shadow-rose-600/25 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Confirm Wipe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          ADMIN GUIDE - PLAIN ENGLISH FEATURE EXPLANATIONS
          ---------------------------------------------------- */}
      {adminTab === "admin-guide" && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-8 md:p-10 shadow-xl">
            <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-5">
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg backdrop-blur-sm">
                <BookOpen className="h-9 w-9 text-white" />
              </div>
              <div className="space-y-2">
                <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-white/10 text-white px-2.5 py-0.5 rounded-full">
                  Admin Guide
                </span>
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                  What Each Feature Is Used For
                </h2>
                <p className="text-xs md:text-sm text-slate-300 font-medium max-w-3xl leading-relaxed">
                  This page explains every button and section in plain English. Use it to train new managers or remind yourself what each tool does. No technical jargon.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl p-6 space-y-3 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Analytics Overview</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">Shows the health of the business at a glance. You will see total sales, total expenses, net profit, outstanding client balances, and charts. Use this to quickly understand if the business is doing well today or this month.</p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-3 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Expenditures (Overhead)</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">Records money the business spends on raw materials, rent, utilities, and supplies. Every time you buy paper, ink, or pay a bill, log it here. This keeps track of where the money is going.</p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-3 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Monthly Reports</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">Downloads a full PDF report for the month. It shows total income, total expenses, profit, jobs completed, staff late arrivals, and stock levels. Use this for business review, tax, or planning.</p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-3 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Statistics</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">Colorful charts that show sales trends, popular services, staff performance, and inventory levels. Use this to see patterns — for example, which service brings in the most money or which staff member completes the most jobs.</p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-3 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">SKU Inventory</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">Manages all materials in the store — paper, ink, film, covers, and office supplies. You can see what is in stock, what is running low, and record new deliveries. Set minimum stock levels so the system warns you when to reorder.</p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-3 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">EOD Approvals</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">Shows the end-of-shift reports submitted by staff. You can review what each staff member sold, how much cash they collected, and any remarks. Approve the reports to confirm they are correct. You can also download a daily PDF report.</p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-3 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Audit & Backups</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">Shows a complete history of every action taken in the system — who logged in, who created a job, who changed a price, who deleted something. Use this to investigate issues or confirm work was done. You can also download a full backup of all data.</p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-3 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Staff Activity</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">Tracks what each staff member did during their shift — every keystroke, every button pressed, every change made. Use this to monitor productivity, train staff, or investigate mistakes. Filter by staff name or date.</p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-3 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Security</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">Change staff login names and passwords, reset passwords if forgotten, and see who logged in and when. You can also see which devices are being used to access the system. Keep passwords secure and change them regularly.</p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-3 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Late Arrival Notes</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">Record when staff arrive late or leave early. You can see all clock-in and clock-out sessions, and write notes about late arrivals. This helps with payroll and staff discipline. Staff can also clock in and out themselves from their dashboard.</p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-3 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">SMS Broadcast</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">Send text messages to clients or staff in bulk. Use this to notify clients that their job is ready, send payment reminders, or announce shop updates. Requires an Africa's Talking account to work.</p>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-3 relative overflow-hidden paper-texture shadow-xl">
              <div className="cmyk-bar absolute top-0 left-0 right-0 h-[3px]" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Global Settings</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">Change the shop name, logo, address, phone number, and currency. Update staff names and passwords. Wipe all data if you need to start fresh. These settings affect the entire system for all users.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
