/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  Search,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  User,
  CheckCircle,
  FileText,
  AlertTriangle,
  Receipt,
  HelpCircle,
  Truck,
  TrendingUp,
  Boxes,
  CircleDollarSign,
  FileCheck2,
  History,
  Settings,
  ClipboardList,
  PlusCircle,
  Briefcase,
  Clock,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Server,
  MessageSquare,
  GraduationCap,
  UserCheck,
  BookOpen
} from "lucide-react";
import LoginScreen from "./components/LoginScreen";
import StaffDashboard from "./components/StaffDashboard";
import AdminDashboard from "./components/AdminDashboard";
import DocumentViewer from "./components/DocumentViewer";
import LegalModal from "./components/LegalModal";
import { DBStore } from "./dbStore";
import { UserRole, CompanySettings, Notification, Job, GeneralPrintingOrder } from "./types";
import logoUrl from "./assets/images/printopia_logo_1783376948226.jpg";

interface PairingModalProps {
  mode: "ask" | "client";
  setMode: (mode: "ask" | "client") => void;
  serverUrl: string;
  setServerUrl: (url: string) => void;
  status: "idle" | "testing" | "success" | "error";
  error: string;
  onTest: () => void;
  onConfirmServer: () => void;
  onSkip: () => void;
}

function PairingModal({ mode, setMode, serverUrl, setServerUrl, status, error, onTest, onConfirmServer, onSkip }: PairingModalProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-8 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

        <div className="text-center space-y-2 pt-2">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg">
            <Wifi className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Office Network Setup</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">
            Link this computer to your office network so all staff can work together in real-time.
          </p>
        </div>

        {mode === "ask" && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-zinc-950/60 border border-white/10 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-gray-800 dark:text-white text-center">
                Is this the <span className="text-blue-600 dark:text-blue-400">Main Office Computer</span>?
              </p>
              <p className="text-[10px] text-gray-500 dark:text-zinc-500 text-center font-medium leading-relaxed">
                The main computer runs the server and stores the master record. All other computers connect to it.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onConfirmServer}
                className="flex flex-col items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 text-xs shadow-lg active:scale-95 cursor-pointer transition-all uppercase tracking-widest"
              >
                <Server className="h-5 w-5" />
                Yes, I'm the Main PC
              </button>
              <button
                onClick={() => setMode("client")}
                className="flex flex-col items-center gap-2 rounded-xl border border-white/10 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 hover:bg-white/60 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-black py-4 text-xs active:scale-95 cursor-pointer transition-all uppercase tracking-widest"
              >
                <Wifi className="h-5 w-5" />
                No, Connect Me
              </button>
            </div>
          </div>
        )}

        {mode === "client" && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-indigo-950/80 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Main PC Address</label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://192.168.1.50:3000"
                className="w-full rounded-xl px-3.5 py-2.5 text-xs text-gray-900 dark:text-white font-semibold border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 focus:border-indigo-500 outline-hidden"
              />
              <p className="text-[9px] text-gray-400 dark:text-zinc-500 mt-1 font-medium">
                Ask the main PC user to open the app and look at the address bar.
              </p>
            </div>

            <button
              onClick={onTest}
              disabled={status === "testing"}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3 text-xs shadow-lg active:scale-95 cursor-pointer transition-all uppercase tracking-widest disabled:opacity-60"
            >
              {status === "testing" ? "Testing Connection..." : "Test & Connect"}
            </button>

            {status === "success" && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Connection successful! Click Continue.
              </div>
            )}

            {status === "error" && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-xs font-bold text-rose-700 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}

            <button
              onClick={onSkip}
              className="w-full text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-white font-bold uppercase tracking-wider cursor-pointer bg-transparent border-0 p-0"
            >
              Skip and use this PC only
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  // Session State
  const [currentUser, setCurrentUser] = useState<{ name: string; role: UserRole } | null>(null);
  
  // App Settings
  const [settings, setSettings] = useState<CompanySettings>(() => DBStore.getSettings());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Legal Modal States
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<"privacy" | "terms">("privacy");

  // Layout states
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string>("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Pairing / Network Setup State
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [pairingMode, setPairingMode] = useState<"ask" | "client">("ask");
  const [pairingServerUrl, setPairingServerUrl] = useState("");
  const [pairingStatus, setPairingStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [pairingError, setPairingError] = useState("");
  
  // Live states refreshed on updates
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeDocument, setActiveDocument] = useState<{ type: "invoice" | "receipt" | "waybill" | "delivery_receipt"; data: any } | null>(null);
  const [liveActivities, setLiveActivities] = useState<any[]>([]);

  // Refresh helper
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const savePairing = (url: string, isServer: boolean) => {
    const data = { serverUrl: url, isServer, pairedAt: new Date().toISOString() };
    localStorage.setItem("printing_db_sync_pairing", JSON.stringify(data));
    if (isServer) {
      (window as any).__printopiaIsServer = true;
    }
    setShowPairingModal(false);
    setPairingStatus("idle");
    setPairingError("");
    setPairingMode("ask");
    setPairingServerUrl("");
    handleRefresh();
  };

  const testPairingConnection = async () => {
    if (!pairingServerUrl.trim()) {
      setPairingError("Please enter the server address.");
      return;
    }
    setPairingStatus("testing");
    setPairingError("");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch(`${pairingServerUrl.trim()}/socket.io/?EIO=4&transport=polling`, {
        method: "GET",
        signal: controller.signal
      });
      clearTimeout(timeout);
      setPairingStatus("success");
      setTimeout(() => savePairing(pairingServerUrl.trim(), false), 600);
    } catch (err: any) {
      setPairingStatus("error");
      setPairingError("Could not reach server. Check the address and try again.");
    }
  };

  const getDefaultSyncUrl = () => {
    try {
      const { protocol, hostname, port } = window.location;
      if (port && port !== "3001") {
        return `${protocol}//${hostname}:3001`;
      }
    } catch {
      // ignore
    }
    return window.location.origin;
  };

  const confirmServerMode = () => {
    savePairing(getDefaultSyncUrl(), true);
  };

  const onSkip = () => savePairing(pairingServerUrl.trim() || getDefaultSyncUrl(), false);

  // Live storage listener for multi-tab reactivity
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("printing_db_")) {
        handleRefresh();
      }
    };
    const handleSyncUpdate = (e: any) => {
      if (e.detail && e.detail.key && e.detail.key.startsWith("printing_db_")) {
        handleRefresh();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("printopia-sync", handleSyncUpdate);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("printopia-sync", handleSyncUpdate);
    };
  }, []);

  // Sync DB notifications & theme settings on mount/refresh
  useEffect(() => {
    setNotifications(DBStore.getNotifications());
    setSettings(DBStore.getSettings());
    setLiveActivities(DBStore.getLiveActivities ? DBStore.getLiveActivities() : []);
  }, [refreshTrigger]);

  // Check if first launch requires network pairing
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pairing = localStorage.getItem("printing_db_sync_pairing");
      if (!pairing) {
        setShowPairingModal(true);
      }
    }
  }, []);

  // Apply Dark Mode Class to app container
  const themeClass = isDarkMode ? "dark" : "light";

  const handleLogin = (role: UserRole, name: string) => {
    setCurrentUser({ name, role });
    setActiveTabId("overview");
    DBStore.addAuditLog(name, "Login", "Security", `Successfully authenticated into Printopia Digital Press terminal. Session initialized.`);
    DBStore.broadcastLiveActivity(name, "Login", "Security", "Signed in to terminal");
    handleRefresh();
  };

  const handleLogout = () => {
    if (currentUser) {
      DBStore.addAuditLog(currentUser.name, "Logout", "Security", `Terminated terminal session.`);
      DBStore.broadcastLiveActivity(currentUser.name, "Logout", "Security", "Signed out of terminal");
    }
    setCurrentUser(null);
    setSearchQuery("");
    setShowNotifications(false);
    setActiveTabId("overview");
  };

  // ----------------------------------------------------
  // GLOBAL SEARCH ALGORITHM
  // ----------------------------------------------------
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    
    const allJobs = DBStore.getJobs();
    const allGpo = DBStore.getGeneralPrintingOrders();

    const matchedJobs = allJobs.filter(j => 
      j.jobNumber.toLowerCase().includes(query) ||
      j.customerName.toLowerCase().includes(query) ||
      (j.customerPhone && j.customerPhone.includes(query)) ||
      j.jobDescription.toLowerCase().includes(query)
    ).map(j => ({ ...j, docType: "job" }));

    const matchedGpo = allGpo.filter(g =>
      g.orderNumber.toLowerCase().includes(query) ||
      g.customerName.toLowerCase().includes(query) ||
      (g.customerPhone && g.customerPhone.includes(query))
    ).map(g => ({ ...g, docType: "gpo" }));

    return [...matchedJobs, ...matchedGpo];
  }, [searchQuery, refreshTrigger]);

  // Read notification helpers
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    DBStore.markAllNotificationsRead();
    handleRefresh();
  };

  const handleMarkRead = (id: string) => {
    DBStore.markNotificationRead(id);
    handleRefresh();
  };

  const handleNotificationClick = (not: Notification) => {
    // 1. Mark as read if not already read
    if (!not.isRead) {
      DBStore.markNotificationRead(not.id);
      handleRefresh();
    }
    
    // 2. Hide notification drawer
    setShowNotifications(false);

    // 3. Determine and update the correct active tab
    if (isAdmin) {
      switch (not.type) {
        case "low_stock":
          setActiveTabId("inventory");
          break;
        case "missing_report":
          setActiveTabId("eod");
          break;
        case "overdue_job":
        case "unpaid_deposit":
        case "large_sale":
        default:
          setActiveTabId("overview");
          break;
      }
    } else {
      switch (not.type) {
        case "low_stock":
          setActiveTabId("inventory");
          break;
        case "missing_report":
          setActiveTabId("shift-report");
          break;
        case "overdue_job":
          setActiveTabId("kanban");
          break;
        case "unpaid_deposit":
        case "large_sale":
        default:
          setActiveTabId("overview");
          break;
      }
    }
  };

  // ----------------------------------------------------
  // RENDER INTERACTION
  // ----------------------------------------------------
  if (showPairingModal) {
    return (
      <div className={themeClass}>
        <PairingModal
          mode={pairingMode}
          setMode={setPairingMode}
          serverUrl={pairingServerUrl}
          setServerUrl={setPairingServerUrl}
          status={pairingStatus}
          error={pairingError}
          onTest={testPairingConnection}
          onConfirmServer={confirmServerMode}
          onSkip={() => savePairing(pairingServerUrl.trim() || getDefaultSyncUrl(), false)}
        />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={themeClass}>
        <LoginScreen 
          onLogin={handleLogin} 
          isDarkMode={isDarkMode} 
        />
      </div>
    );
  }

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const menuItems = isAdmin
    ? [
        { id: "overview", label: "Analytics Overview", icon: TrendingUp },
        { id: "inventory", label: "SKU Inventory", icon: Boxes },
        { id: "sales-reports", label: "Monthly Reports", icon: FileText },
        { id: "statistics", label: "Statistics", icon: TrendingUp },
        { id: "expenditures", label: "Expenditures", icon: CircleDollarSign },
        { id: "eod", label: "EOD Approvals", icon: FileCheck2 },
        { id: "audit", label: "Audit & Backups", icon: History },
        { id: "staff-activity", label: "Staff Activity", icon: UserCheck },
        { id: "security", label: "Security", icon: ShieldCheck },
        { id: "late-notes", label: "Late Arrival Notes", icon: Clock },
        { id: "broadcast", label: "SMS Broadcast", icon: MessageSquare },
        { id: "settings", label: "Global Settings", icon: Settings },
        { id: "admin-guide", label: "Admin Guide", icon: BookOpen },
      ]
    : [
        { id: "overview", label: "Dashboard", icon: ClipboardList },
        { id: "gen-print", label: "General Printing (M1)", icon: Receipt },
        { id: "job-intake", label: "Job Intake (M2)", icon: PlusCircle },
        { id: "kanban", label: "Production (M3)", icon: Briefcase },
        { id: "inventory", label: "Inventory (M6)", icon: Boxes },
        { id: "misc", label: "Daily Expenses (M5)", icon: CircleDollarSign },
        { id: "shift-report", label: "End of Shift (M4)", icon: FileCheck2 },
        { id: "learning", label: "Training (M*)", icon: GraduationCap },
      ];

  // ----------------------------------------------------
  // RENDER INTERACTION
  // ----------------------------------------------------
  if (showPairingModal) {
    return (
      <div className={themeClass}>
        <PairingModal
          mode={pairingMode}
          setMode={setPairingMode}
          serverUrl={pairingServerUrl}
          setServerUrl={setPairingServerUrl}
          status={pairingStatus}
          error={pairingError}
          onTest={testPairingConnection}
          onConfirmServer={confirmServerMode}
          onSkip={onSkip}
        />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={themeClass}>
        <LoginScreen 
          onLogin={handleLogin} 
          isDarkMode={isDarkMode} 
        />
      </div>
    );
  }

  const currentTabLabel = menuItems.find(item => item.id === activeTabId)?.label || "Terminal";

  return (
    <div className={`${themeClass} min-h-screen flex bg-gradient-to-tr from-slate-100 via-slate-50 to-indigo-100/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 font-sans overflow-x-hidden`}>

      {/* ----------------------------------------------------
          DESKTOP LEFT SIDEBAR
          ---------------------------------------------------- */}
      <aside className={`hidden md:flex md:flex-col ${isSidebarCollapsed ? "w-20" : "w-66"} glass-sidebar text-slate-300 border-r border-indigo-500/10 shrink-0 z-30 relative transition-all duration-300`}>
        {/* Sidebar Collapse Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-7 h-6 w-6 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border border-white/15 text-white flex items-center justify-center cursor-pointer shadow-lg hover:shadow-indigo-500/25 z-40 transition-transform active:scale-95 animate-pulse"
          title={isSidebarCollapsed ? "Expand Menu" : "Collapse Menu"}
        >
          {isSidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Brand Logo Header */}
        <div className={`px-5 py-6 border-b border-white/10 flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} relative overflow-hidden`}>
          {/* Subtle illumination behind logo */}
          <div className="absolute -left-4 -top-4 w-24 h-24 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-25 blur-xl rounded-full pointer-events-none" />
          <img
            src={logoUrl}
            alt="Printopia Logo"
            className="h-9 w-auto object-contain rounded-xl relative z-10 shadow-lg border border-white/20 transition-transform hover:scale-105"
            referrerPolicy="no-referrer"
          />
          {!isSidebarCollapsed && (
            <div className="min-w-0 relative z-10">
              <span className="font-black tracking-tight text-sm text-white block truncate leading-tight">
                {settings.companyName}
              </span>
              <span className="text-[9px] text-indigo-400 font-mono font-black uppercase tracking-widest block mt-0.5">
                {isAdmin ? "Admin Console" : "Staff Desk"}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto scrollbar-thin">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activeTabId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTabId(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black transition-all duration-200 relative ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${active ? "text-white" : "text-slate-400"}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-black text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="truncate">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ----------------------------------------------------
          MOBILE SIDEBAR DRAWER (SLIDE-OVER)
          ---------------------------------------------------- */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            
             {/* Sidebar Box */}
             <motion.div
               initial={{ x: "-100%" }}
               animate={{ x: 0 }}
               exit={{ x: "-100%" }}
               transition={{ type: "spring", damping: 25, stiffness: 220 }}
               className="relative flex flex-col w-full max-w-xs bg-[#0F172A] text-slate-300 h-full p-5 shadow-2xl z-50 border-r border-slate-800"
             >
              <div className="flex justify-between items-center pb-5 border-b border-slate-800/60 mb-5">
                <div className="flex items-center gap-2.5">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-7 w-auto object-contain rounded"
                    referrerPolicy="no-referrer"
                  />
                  <span className="font-extrabold text-xs text-white leading-none">
                    {settings.companyName}
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTabId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTabId(item.id);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black transition-all duration-200 relative ${
                        active
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                      }`}
                    >
                      <Icon className={`h-4.5 w-4.5 ${active ? "text-white" : "text-slate-400"}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Mobile Footer */}
              <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 font-extrabold text-[10px]">
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-white truncate max-w-[120px]">{currentUser.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------
          RIGHT MAIN PANEL (HEADER + CONTENT + FOOTER)
          ---------------------------------------------------- */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10 bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">
        
        {/* Decorative Premium CMYK Ambient Background Lights */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] rounded-full bg-indigo-500/10 dark:bg-indigo-600/6 blur-[120px] animate-pulse" style={{ animationDuration: "12s" }} />
          <div className="absolute top-[25%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-400/5 dark:bg-violet-400/3 blur-[140px] animate-pulse" style={{ animationDuration: "15s" }} />
        </div>

        {/* HEADER */}
        <header className="sticky top-0 z-20 glass-panel border-b border-white/10 dark:border-zinc-800/60 px-4 py-3 md:px-8 md:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden p-2 rounded-xl bg-white/40 dark:bg-zinc-900/40 text-gray-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-sm md:text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  {currentTabLabel}
                </h1>
                <p className="text-[10px] text-gray-500 dark:text-zinc-500 font-medium">
                  {isAdmin ? "Administrator Control Panel" : "Staff Operations Terminal"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-xl bg-white/40 dark:bg-zinc-900/40 text-gray-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-800 cursor-pointer relative"
                >
                  <Bell className="h-4.5 w-4.5" />
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center animate-pulse">
                      {notifications.filter(n => !n.isRead).length}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-full left-0 sm:left-auto sm:right-0 sm:w-80 sm:max-w-[320px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 z-50 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center justify-between">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">Notifications</h3>
                      {notifications.filter(n => !n.isRead).length > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[9px] bg-white/20 hover:bg-white/30 text-white font-bold px-2 py-1 rounded-lg cursor-pointer transition uppercase tracking-wider"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="overflow-y-auto max-h-[50vh]">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 dark:text-zinc-500 text-xs">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map(not => (
                          <div
                            key={not.id}
                            onClick={() => handleNotificationClick(not)}
                            className={`p-3 border-b border-gray-50 dark:border-zinc-800 cursor-pointer transition hover:bg-gray-50 dark:hover:bg-zinc-800 ${!not.isRead ? "bg-indigo-50/50 dark:bg-indigo-950/10" : ""}`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${!not.isRead ? "bg-indigo-500" : "bg-gray-300 dark:bg-zinc-600"}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 dark:text-white">
                                  {not.title}
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-zinc-500 mt-0.5">
                                  {not.message}
                                </p>
                                <p className="text-[9px] text-gray-400 dark:text-zinc-600 mt-1 font-mono">
                                  {new Date(not.timestamp).toLocaleString()}
                                </p>
                              </div>
                              {!not.isRead && (
                                <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* User Menu */}
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/10">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center text-xs font-black shadow-lg">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden lg:block">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[120px]">{currentUser.name}</p>
                  <p className="text-[9px] text-gray-500 dark:text-zinc-500 font-mono uppercase tracking-wider">{isAdmin ? "Admin" : "Staff"}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN SCREEN CONTENT */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-7xl w-full mx-auto relative z-10">
          <AnimatePresence mode="wait">
            {isAdmin ? (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <AdminDashboard
                  settings={settings}
                  onUpdateSettings={(updated) => { DBStore.updateSettings(updated); handleRefresh(); }}
                  onRefreshGlobalState={handleRefresh}
                  onOpenDocument={(type, data) => setActiveDocument({ type, data })}
                  activeTab={activeTabId}
                  setActiveTab={setActiveTabId}
                  refreshTrigger={refreshTrigger}
                />
              </motion.div>
            ) : (
              <motion.div
                key="staff"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <StaffDashboard
                  settings={settings}
                  onOpenDocument={(type, data) => setActiveDocument({ type, data })}
                  onRefreshGlobalState={handleRefresh}
                  activeUserName={currentUser?.name}
                  activeTab={activeTabId}
                  setActiveTab={setActiveTabId}
                  refreshTrigger={refreshTrigger}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* APPLICATION FOOTER */}
        <footer className="border-t border-slate-200/50 dark:border-zinc-800/80 bg-white/40 dark:bg-zinc-900/30 py-4 px-6 text-center text-[10px] text-gray-400 dark:text-zinc-500 font-mono relative z-10 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between gap-4 items-center">
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center sm:justify-start items-center">
              <span>© {new Date().getFullYear()} {settings.companyName}. All rights reserved.</span>
              <span className="hidden sm:inline text-slate-300 dark:text-zinc-700">|</span>
              <span>Printopia Operations Terminal v2.0</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-zinc-600">
              <ShieldCheck className="h-3 w-3" />
              <span>Secure Session Active</span>
            </div>
          </div>
        </footer>
      </div>

      {/* ----------------------------------------------------
          GLOBAL DOCUMENT VIEWER MODAL
          ---------------------------------------------------- */}
      {activeDocument && (
        <DocumentViewer
          type={activeDocument.type}
          data={activeDocument.data}
          settings={settings}
          onClose={() => setActiveDocument(null)}
          onAddAuditLog={(action, module, details) => {
            DBStore.addAuditLog(currentUser.name, action, module, details);
            handleRefresh();
          }}
        />
      )}

      {/* ----------------------------------------------------
          GLOBAL LEGAL MODAL
          ---------------------------------------------------- */}
      <LegalModal 
        isOpen={isLegalOpen} 
        onClose={() => setIsLegalOpen(false)} 
        defaultTab={legalTab} 
      />

    </div>
  );
}
