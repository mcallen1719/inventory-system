/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Printer, 
  Scale, 
  Lock, 
  FileSignature, 
  BookOpen, 
  HelpCircle,
  Eye,
  Info,
  Search
} from "lucide-react";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "privacy" | "terms";
}

export default function LegalModal({ isOpen, onClose, defaultTab = "privacy" }: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<"privacy" | "terms">(defaultTab);
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the legal document.");
      return;
    }

    const title = activeTab === "privacy" ? "Printopia Digital Press - Privacy Policy" : "Printopia Digital Press - Terms of Service";
    const contentHtml = activeTab === "privacy" ? getPrivacyPrintContent() : getTermsPrintContent();

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              color: #111827;
              line-height: 1.6;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              font-size: 24px;
              font-weight: 800;
              text-transform: uppercase;
              border-b: 2px solid #E5E7EB;
              padding-bottom: 12px;
              margin-bottom: 24px;
              color: #4F46E5;
            }
            h2 {
              font-size: 16px;
              font-weight: 700;
              text-transform: uppercase;
              margin-top: 30px;
              margin-bottom: 12px;
              color: #1F2937;
            }
            p {
              font-size: 14px;
              margin-bottom: 16px;
              color: #374151;
            }
            ul {
              margin-bottom: 16px;
              padding-left: 20px;
            }
            li {
              font-size: 14px;
              margin-bottom: 8px;
              color: #374151;
            }
            .meta {
              font-size: 12px;
              color: #6B7280;
              margin-bottom: 30px;
              font-family: monospace;
            }
            .footer {
              margin-top: 50px;
              font-size: 11px;
              color: #9CA3AF;
              text-align: center;
              border-t: 1px solid #F3F4F6;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">
            LAST MODIFIED: JULY 8, 2026 | VERSION 1.0.0 | STATUS: OPERATIONAL COMPLIANCE
          </div>
          ${contentHtml}
          <div class="footer">
            Copyright &copy; 2026 Printopia Digital Press. All operational rights reserved.
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const parts = text.split(new RegExp(`(${escapeRegExp(search)})`, "gi"));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-yellow-100 dark:bg-yellow-500/30 text-gray-900 dark:text-white px-0.5 rounded font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  return (
    <div id="legal-modal-container" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-all duration-300">
      <div className="w-full max-w-4xl h-[85vh] bg-white dark:bg-zinc-950 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden relative paper-texture">
        {/* Top CMYK Styling Bar */}
        <div className="cmyk-bar absolute top-0 left-0 right-0 h-[4px]" />

        {/* Modal Header */}
        <div className="p-6 md:p-8 border-b border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-zinc-900/20">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  Printopia Legal Compliance & Center
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-500 font-medium">
                  Verify information processing security protocols, operational liabilities, and corporate guidelines.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Search Input inside Documents */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search legal clauses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-[11px] font-semibold w-40 md:w-48 glass-input px-3 py-2 pl-7.5 rounded-xl focus:w-56 transition-all"
              />
              <Search className="h-3 w-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <button
              onClick={handlePrint}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer hover:border-indigo-500/25 transition active:scale-95"
              title="Print Document"
            >
              <Printer className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 dark:text-zinc-300 cursor-pointer transition active:scale-95"
              title="Close Panel"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="px-6 md:px-8 pt-3 pb-0 border-b border-slate-200 dark:border-zinc-800 flex gap-4 bg-slate-50/20 dark:bg-zinc-900/10 shrink-0">
          <button
            onClick={() => { setActiveTab("privacy"); setSearchQuery(""); }}
            className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "privacy"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-zinc-300"
            }`}
          >
            <Lock className="h-4 w-4" />
            Privacy Policy
          </button>
          <button
            onClick={() => { setActiveTab("terms"); setSearchQuery(""); }}
            className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "terms"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-zinc-300"
            }`}
          >
            <FileSignature className="h-4 w-4" />
            Terms of Service
          </button>
        </div>

        {/* Scrollable Content Pane */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin scroll-smooth select-text">
          
          {/* Header Banner inside container */}
          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 dark:bg-indigo-400/2 flex items-start gap-3">
            <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Regulatory Status Ledger</span>
              <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed font-semibold">
                This document is a legally binding contract governing operational terminals, file transfers, client data databases, and expenditure reports of <strong className="text-gray-900 dark:text-white">Printopia Digital Press</strong>. Last modified on <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold">July 8, 2026</span>.
              </p>
            </div>
          </div>

          {activeTab === "privacy" ? (
            <div className="space-y-6 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed font-medium">
              
              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">1.0</span>
                  INTRODUCTORY SCOPE & OPERATOR DIRECTIVE
                </h4>
                <p>
                  {highlightText("At Printopia Digital Press (hereafter \"Printopia\", \"We\", \"Us\", \"Our\"), we prioritize the absolute security, confidentiality, and integrity of the data processed within our digital production environment and industrial printing terminal systems. This Privacy Policy documents our structured practices concerning the collection, storage, and handling of information inputted by registered staff operators and administrators into our proprietary operational system.", searchQuery)}
                </p>
                <p>
                  {highlightText("This Policy applies exclusively to the Printopia Operations Ledger terminal, its local offline-first state-engines, secure cloud backups, custom databases, shift logs, and general workspace integrations. By logging into this system, operators consent to data practices described herein.", searchQuery)}
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">2.0</span>
                  THE CLASSIFICATION OF DATA PROCESSED
                </h4>
                <p>
                  {highlightText("We process various classifications of system logs, graphics data, and user attributes. These include but are not limited to:", searchQuery)}
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>{highlightText("Client Contact & Billing Information", searchQuery)}:</strong> {highlightText("Full names, phone coordinates, corporate designations, addresses, and email contacts gathered during the GPO (General Printing Order) and Job Intake pathways.", searchQuery)}
                  </li>
                  <li>
                    <strong>{highlightText("Artwork Assets & Design Files", searchQuery)}:</strong> {highlightText("Graphics specifications, file sizes, SKU categories, custom print directives, color profiles, dimensions, and visual artwork attributes processed for commercial presses.", searchQuery)}
                  </li>
                  <li>
                    <strong>{highlightText("Financial & Transaction Ledgers", searchQuery)}:</strong> {highlightText("Invoices, receipts, expenditure entries, cost centers, unit calculations, material usage depotions, and pending accounts receivable.", searchQuery)}
                  </li>
                  <li>
                    <strong>{highlightText("System Audit Trails & Telemetry Logs", searchQuery)}:</strong> {highlightText("Immutable timestamps tracking active user sessions, password modifications, data exports, settings alterations, and shift report clearances.", searchQuery)}
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">3.0</span>
                  PURPOSE OF SYSTEM DATA PROCESSING
                </h4>
                <p>
                  {highlightText("We process this structured data strictly to execute operational tasks requested by users, conforming to professional print standards:", searchQuery)}
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>{highlightText("Fulfillment of commercial print jobs, graphic designs, and logistics tracking via waybills.", searchQuery)}</li>
                  <li>{highlightText("Real-time local inventory tracking, SKU depletions, and stock warning thresholds.", searchQuery)}</li>
                  <li>{highlightText("Automated creation of accounting documents (Invoices, Receipts) for customer verification.", searchQuery)}</li>
                  <li>{highlightText("Compliance reviews, fraud prevention, and audit oversight via historical system backups.", searchQuery)}</li>
                  <li>{highlightText("Shift handover logs to confirm proper daily financial balances (End-of-Day Approvals).", searchQuery)}</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">4.0</span>
                  RETENTION & DATA IMMUTABILITY
                </h4>
                <p>
                  {highlightText("Data integrity is key to our business operations. Transactional records, customer job accounts, and system audit logs are preserved securely to maintain historical print shop integrity. Artwork files uploaded to the terminal are cached locally and purged periodically according to server threshold configurations. Administrators may purge, export, or restore system backups via the Audit & Backup panel, but general audit logs remain immutable to protect corporate ledger reliability.", searchQuery)}
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">5.0</span>
                  OPERATIONAL SECURITY AND ENCRYPTED CHANNELS
                </h4>
                <p>
                  {highlightText("The Printopia system utilizes defense-in-depth architectural mechanisms to secure sensitive files:", searchQuery)}
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>{highlightText("Data in transit is fully encrypted using SSL/TLS protocols to prevent sniffing.", searchQuery)}</li>
                  <li>{highlightText("Sensitive credentials, passwords, and API integration paths are stored securely using browser-level sandboxed states and server-side encryption.", searchQuery)}</li>
                  <li>{highlightText("Our terminal enforces zero-sharing user accounts. Operators must utilize unique passwords as checked by the Security Console.", searchQuery)}</li>
                  <li>{highlightText("Automatic session termination and idle state detection are in place to reduce physical terminal intrusion risks.", searchQuery)}</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">6.0</span>
                  REGULATORY STANDARDS, GDPR, & COMPLIANCE RIGHTS
                </h4>
                <p>
                  {highlightText("We fully comply with global data protection frameworks, including the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA). Clients whose print jobs are processed through this terminal hold full rights to request detailed order logs, rectify contact details, or request total removal of optional personal records from the client database where not prohibited by financial reporting regulations. Data requests may be dispatched through the Admin Desk.", searchQuery)}
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">7.0</span>
                  INQUIRIES AND LEGAL COMPLIANCE DESK
                </h4>
                <p>
                  {highlightText("For questions regarding our privacy mechanisms, data transit security, or third-party credential integrations, please contact the legal department at legal@printopiadigitalpress.com or write to Printopia Operations HQ, Technical Division.", searchQuery)}
                </p>
              </section>

            </div>
          ) : (
            <div className="space-y-6 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed font-medium">
              
              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">1.0</span>
                  AGREEMENT TO CONTRACTUAL TERMS
                </h4>
                <p>
                  {highlightText("These Terms of Service (hereafter \"Terms\") represent a legally binding operational contract between Printopia Digital Press and the registered staff operators, supervisors, administrators, and clients who access or interact with the Printopia Operations Ledger terminal system.", searchQuery)}
                </p>
                <p>
                  {highlightText("By initializing a session on any terminal or inputting custom job order parameters, you explicitly declare that you have read, understood, and agreed to adhere to these operational constraints.", searchQuery)}
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">2.0</span>
                  OPERATOR SECURITY, LOGINS & LEDGER RESPONSIBILITY
                </h4>
                <p>
                  {highlightText("Access to this operational ledger requires authorized user credentials. Terminal operators must fulfill the following security mandates:", searchQuery)}
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>{highlightText("Unique Access Keys", searchQuery)}:</strong> {highlightText("Operators are strictly prohibited from sharing individual password hashes. Passwords must be completely unique to maintain non-repudiation.", searchQuery)}</li>
                  <li><strong>{highlightText("Audit Trail Acceptance", searchQuery)}:</strong> {highlightText("Operators acknowledge that all system actions—including job creation, SKU inventory adjustments, shift approvals, and financial logs—are permanently logged with their identity under the immutable Audit System.", searchQuery)}</li>
                  <li><strong>{highlightText("Terminal Watchdog", searchQuery)}:</strong> {highlightText("Operators must log out immediately upon leaving the physical terminal workspace to prevent unauthorized access.", searchQuery)}</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">3.0</span>
                  ORDER SPECIFICATIONS, INTAKE & INVENTORY RULES
                </h4>
                <p>
                  {highlightText("When registering a General Printing Order (GPO) or creating a custom Job Intake record, the operator must guarantee that all inputs represent verified customer data and factual measurements. Material depotions (paper stocks, inks, card substrates) must be accurately cataloged in real-time. Any detected material shrinkage, damage, or miscalculated SKU inventory levels must be immediately flagged to the administrator and entered into the expenditure records.", searchQuery)}
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">4.0</span>
                  INTELLECTUAL PROPERTY & SUBMITTED WORK
                </h4>
                <p>
                  {highlightText("Customers retain full ownership and intellectual property rights of all graphic assets, design drafts, typography files, layouts, and artwork files submitted for industrial press production. Printopia, its staff, and its operators must preserve strict confidentiality of customer works-in-progress and must not utilize customer assets for unauthorized publicity, replication, or personal projects.", searchQuery)}
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">5.0</span>
                  EXPENDITURE LOGS, EOD BALANCE, & SYSTEM SETTLEMENTS
                </h4>
                <p>
                  {highlightText("Daily expenses, petty cash logs, material purchases, and operational overheads must be validated and logged. At the termination of each shift, active operators must compile their EOD (End-of-Day) Shift Report, documenting cumulative order revenues, expenditures, and digital payments. Admin approval is required for all shift report settlements before the subsequent work cycle may commence. Falsifying shift handovers or ledger balances is a breach of this agreement and grounds for terminal suspension.", searchQuery)}
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">6.0</span>
                  LIMITATION OF INDUSTRIAL LIABILITY
                </h4>
                <p>
                  {highlightText("While Printopia strives to guarantee 100% terminal uptime and accurate order computations, we are not liable for:", searchQuery)}
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>{highlightText("Production downtimes caused by local hardware malfunctions, press calibration failures, or network interruptions.", searchQuery)}</li>
                  <li>{highlightText("Unintentional file corruption of artwork formats or vector design profiles during terminal transfers.", searchQuery)}</li>
                  <li>{highlightText("Shortages or supply chain delays of paper stocks, polymer plates, or cyan-magenta-yellow-black inks.", searchQuery)}</li>
                  <li>{highlightText("Local client-side hardware browser cache clearings resulting in loss of un-synced draft records.", searchQuery)}</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">7.0</span>
                  TERMINATION AND ACCOUNT SUSPENSION
                </h4>
                <p>
                  {highlightText("Printopia Administrators reserve the absolute right to revoke, suspend, or terminate terminal login privileges for any operator found in violation of these Terms. Upon termination of operator credentials, all outstanding shift logs and audit trails are preserved indefinitely within the database archives to fulfill business reporting regulations.", searchQuery)}
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-mono">8.0</span>
                  GOVERNING LAW AND RESOLUTION JURISDICTION
                </h4>
                <p>
                  {highlightText("These Terms of Service are governed by and construed in accordance with the corporate laws of the state of operations, without regard to conflict of law principles. Any legal dispute arising from industrial print errors or ledger discrepancies will be settled through fast-track binding business arbitration.", searchQuery)}
                </p>
              </section>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 md:p-6 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-zinc-900/20 shrink-0 text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
          <span>SECURED OPERATIONAL LEGAL DESK // CLIENT ARCHIVE</span>
          <div className="flex gap-4">
            <span>REGULATORY LEVEL: VERIFIED</span>
            <span>SYSTEM ENCRYPTION: SHA-256</span>
          </div>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------
// PRINT HELPERS (RAW HTML FOR EXTERNAL PRINT POPUP)
// ----------------------------------------------------

function getPrivacyPrintContent() {
  return `
    <h2>1.0 INTRODUCTORY SCOPE & OPERATOR DIRECTIVE</h2>
    <p>At Printopia Digital Press, we prioritize the absolute security, confidentiality, and integrity of the data processed within our digital production environment and industrial printing terminal systems. This Privacy Policy documents our structured practices concerning the collection, storage, and handling of information inputted by registered staff operators and administrators into our proprietary operational system.</p>
    <p>This Policy applies exclusively to the Printopia Operations Ledger terminal, its local offline-first state-engines, secure cloud backups, custom databases, shift logs, and general workspace integrations. By logging into this system, operators consent to data practices described herein.</p>

    <h2>2.0 THE CLASSIFICATION OF DATA PROCESSED</h2>
    <p>We process various classifications of system logs, graphics data, and user attributes. These include but are not limited to:</p>
    <ul>
      <li><strong>Client Contact & Billing Information:</strong> Full names, phone coordinates, corporate designations, addresses, and email contacts gathered during the GPO and Job Intake pathways.</li>
      <li><strong>Artwork Assets & Design Files:</strong> Graphics specifications, file sizes, SKU categories, custom print directives, color profiles, dimensions, and visual artwork attributes processed for commercial presses.</li>
      <li><strong>Financial & Transaction Ledgers:</strong> Invoices, receipts, expenditure entries, cost centers, unit calculations, material usage depotions, and pending accounts receivable.</li>
      <li><strong>System Audit Trails & Telemetry Logs:</strong> Immutable timestamps tracking active user sessions, password modifications, data exports, settings alterations, and shift report clearances.</li>
    </ul>

    <h2>3.0 PURPOSE OF SYSTEM DATA PROCESSING</h2>
    <p>We process this structured data strictly to execute operational tasks requested by users, conforming to professional print standards:</p>
    <ul>
      <li>Fulfillment of commercial print jobs, graphic designs, and logistics tracking via waybills.</li>
      <li>Real-time local inventory tracking, SKU depletions, and stock warning thresholds.</li>
      <li>Automated creation of accounting documents (Invoices, Receipts) for customer verification.</li>
      <li>Compliance reviews, fraud prevention, and audit oversight via historical system backups.</li>
      <li>Shift handover logs to confirm proper daily financial balances (End-of-Day Approvals).</li>
    </ul>

    <h2>4.0 RETENTION & DATA IMMUTABILITY</h2>
    <p>Data integrity is key to our business operations. Transactional records, customer job accounts, and system audit logs are preserved securely to maintain historical print shop integrity. Artwork files uploaded to the terminal are cached locally and purged periodically according to server threshold configurations. Administrators may purge, export, or restore system backups via the Audit & Backup panel, but general audit logs remain immutable to protect corporate ledger reliability.</p>

    <h2>5.0 OPERATIONAL SECURITY AND ENCRYPTED CHANNELS</h2>
    <p>The Printopia system utilizes defense-in-depth architectural mechanisms to secure sensitive files:</p>
    <ul>
      <li>Data in transit is fully encrypted using SSL/TLS protocols to prevent sniffing.</li>
      <li>Sensitive credentials, passwords, and API integration paths are stored securely using browser-level sandboxed states and server-side encryption.</li>
      <li>Our terminal enforces zero-sharing user accounts. Operators must utilize unique passwords as checked by the Security Console.</li>
      <li>Automatic session termination and idle state detection are in place to reduce physical terminal intrusion risks.</li>
    </ul>

    <h2>6.0 REGULATORY STANDARDS, GDPR, & COMPLIANCE RIGHTS</h2>
    <p>We fully comply with global data protection frameworks, including the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA). Clients whose print jobs are processed through this terminal hold full rights to request detailed order logs, rectify contact details, or request total removal of optional personal records from the client database where not prohibited by financial reporting regulations. Data requests may be dispatched through the Admin Desk.</p>

    <h2>7.0 INQUIRIES AND LEGAL COMPLIANCE DESK</h2>
    <p>For questions regarding our privacy mechanisms, data transit security, or third-party credential integrations, please contact the legal department at legal@printopiadigitalpress.com or write to Printopia Operations HQ, Technical Division.</p>
  `;
}

function getTermsPrintContent() {
  return `
    <h2>1.0 AGREEMENT TO CONTRACTUAL TERMS</h2>
    <p>These Terms of Service represent a legally binding operational contract between Printopia Digital Press and the registered staff operators, supervisors, administrators, and clients who access or interact with the Printopia Operations Ledger terminal system.</p>
    <p>By initializing a session on any terminal or inputting custom job order parameters, you explicitly declare that you have read, understood, and agreed to adhere to these operational constraints.</p>

    <h2>2.0 OPERATOR SECURITY, LOGINS & LEDGER RESPONSIBILITY</h2>
    <p>Access to this operational ledger requires authorized user credentials. Terminal operators must fulfill the following security mandates:</p>
    <ul>
      <li><strong>Unique Access Keys:</strong> Operators are strictly prohibited from sharing individual password hashes. Passwords must be completely unique to maintain non-repudiation.</li>
      <li><strong>Audit Trail Acceptance:</strong> Operators acknowledge that all system actions—including job creation, SKU inventory adjustments, shift approvals, and financial logs—are permanently logged with their identity under the immutable Audit System.</li>
      <li><strong>Terminal Watchdog:</strong> Operators must log out immediately upon leaving the physical terminal workspace to prevent unauthorized access.</li>
    </ul>

    <h2>3.0 ORDER SPECIFICATIONS, INTAKE & INVENTORY RULES</h2>
    <p>When registering a General Printing Order (GPO) or creating a custom Job Intake record, the operator must guarantee that all inputs represent verified customer data and factual measurements. Material depotions (paper stocks, inks, card substrates) must be accurately cataloged in real-time. Any detected material shrinkage, damage, or miscalculated SKU inventory levels must be immediately flagged to the administrator and entered into the expenditure records.</p>

    <h2>4.0 INTELLECTUAL PROPERTY & SUBMITTED WORK</h2>
    <p>Customers retain full ownership and intellectual property rights of all graphic assets, design drafts, typography files, layouts, and artwork files submitted for industrial press production. Printopia, its staff, and its operators must preserve strict confidentiality of customer works-in-progress and must not utilize customer assets for unauthorized publicity, replication, or personal projects.</p>

    <h2>5.0 EXPENDITURE LOGS, EOD BALANCE, & SYSTEM SETTLEMENTS</h2>
    <p>Daily expenses, petty cash logs, material purchases, and operational overheads must be validated and logged. At the termination of each shift, active operators must compile their EOD (End-of-Day) Shift Report, documenting cumulative order revenues, expenditures, and digital payments. Admin approval is required for all shift report settlements before the subsequent work cycle may commence. Falsifying shift handovers or ledger balances is a breach of this agreement and grounds for terminal suspension.</p>

    <h2>6.0 LIMITATION OF INDUSTRIAL LIABILITY</h2>
    <p>While Printopia strives to guarantee 100% terminal uptime and accurate order computations, we are not liable for:</p>
    <ul>
      <li>Production downtimes caused by local hardware malfunctions, press calibration failures, or network interruptions.</li>
      <li>Unintentional file corruption of artwork formats or vector design profiles during terminal transfers.</li>
      <li>Shortages or supply chain delays of paper stocks, polymer plates, or cyan-magenta-yellow-black inks.</li>
      <li>Local client-side hardware browser cache clearings resulting in loss of un-synced draft records.</li>
    </ul>

    <h2>7.0 TERMINATION AND ACCOUNT SUSPENSION</h2>
    <p>Printopia Administrators reserve the absolute right to revoke, suspend, or terminate terminal login privileges for any operator found in violation of these Terms. Upon termination of operator credentials, all outstanding shift logs and audit trails are preserved indefinitely within the database archives to fulfill business reporting regulations.</p>

    <h2>8.0 GOVERNING LAW AND RESOLUTION JURISDICTION</h2>
    <p>These Terms of Service are governed by and construed in accordance with the corporate laws of the state of operations, without regard to conflict of law principles. Any legal dispute arising from industrial print errors or ledger discrepancies will be settled through fast-track binding business arbitration.</p>
  `;
}
