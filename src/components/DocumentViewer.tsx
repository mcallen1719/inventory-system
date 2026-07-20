/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Printer, Download, X, QrCode, ShieldCheck, CheckCircle, Truck, FileText } from "lucide-react";
import { CompanySettings } from "../types";
import logoUrl from "../assets/images/printopia_logo_1783376948226.jpg";
import logoDataUri from "../assets/images/logoDataUri";

interface DocumentViewerProps {
  type: "invoice" | "receipt" | "waybill" | "delivery_receipt";
  data: any; // Can be a Job or GeneralPrintingOrder
  settings: CompanySettings;
  onClose: () => void;
  onAddAuditLog: (action: string, module: string, details: string) => void;
}

export default function DocumentViewer({
  type,
  data,
  settings,
  onClose,
  onAddAuditLog
}: DocumentViewerProps) {
  const printRef = React.useRef<HTMLDivElement>(null);

  const resolveLogo = () => {
    const raw = (settings.logoUrl || "").trim();
    if (!raw) return logoDataUri;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("data:image")) return raw;
    if (raw.startsWith("/src/") || raw.startsWith("src/")) return logoDataUri;
    return raw;
  };

  // Toggle state to let the user switch view format dynamically
  const [activeFormat, setActiveFormat] = React.useState<"invoice" | "receipt" | "waybill" | "delivery_receipt">(type);

  // Auto-generate helper date/number if needed
  const dateStr = data.date || new Date().toISOString().split("T")[0];
  const customerName = data.customerName || "Walk-In Customer";
  const customerPhone = data.customerPhone || "N/A";
  const currency = settings.currency || "GHS";

  // Auto generated document identifiers
  const documentNumber = React.useMemo(() => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const suffix = data.jobNumber 
      ? (data.jobNumber.split("-")[2] || rand) 
      : (data.orderNumber ? (data.orderNumber.split("-")[2] || rand) : rand);

    if (activeFormat === "invoice") {
      return `INV-${suffix}`;
    } else if (activeFormat === "receipt") {
      return `REC-${suffix}`;
    } else if (activeFormat === "delivery_receipt") {
      return `DLV-${suffix}`;
    } else {
      return `WAY-${suffix}`;
    }
  }, [activeFormat, data.jobNumber, data.orderNumber]);

  // Extract items for display
  const itemsList = React.useMemo(() => {
    if (data.jobDescription) {
      // It's a Job
      // Let's back-calculate subtotal for the line item description so that tax + subtotal sum up to the total contract amount
      const rate = settings.vatRate || 0;
      const sub = data.totalAmount / (1 + rate / 100);
      return [
        {
          description: data.jobDescription,
          quantity: 1,
          unitPrice: sub,
          total: sub
        }
      ];
    } else {
      // It's a GeneralPrintingOrder
      const list: Array<{ description: string; quantity: number; unitPrice: number; total: number }> = [];
      if (data.photocopy?.quantity > 0) {
        const lines = Array.isArray(data.photocopy.lines) ? data.photocopy.lines : null;
        if (lines && lines.length) {
          lines.forEach((l: any) => list.push({
            description: `Photocopy (${l.type})`,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            total: l.quantity * l.unitPrice
          }));
        } else {
          list.push({
            description: `Photocopy (${data.photocopy.colored ? "Colored" : "B&W"})`,
            quantity: data.photocopy.quantity,
            unitPrice: data.photocopy.unitPrice,
            total: data.photocopy.amount
          });
        }
      }
      if (data.printing?.quantity > 0) {
        const lines = Array.isArray(data.printing.lines) ? data.printing.lines : null;
        if (lines && lines.length) {
          lines.forEach((l: any) => list.push({
            description: `Printing (${l.type})`,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            total: l.quantity * l.unitPrice
          }));
        } else {
          list.push({
            description: `Printing (${data.printing.colored ? "Colored" : "B&W"})`,
            quantity: data.printing.quantity,
            unitPrice: data.printing.unitPrice,
            total: data.printing.amount
          });
        }
      }
      if (data.frame?.quantity > 0) {
        list.push({
          description: `Frame (Size: ${data.frame.size || "Standard"})`,
          quantity: data.frame.quantity,
          unitPrice: data.frame.unitPrice,
          total: data.frame.amount
        });
      }
      if (data.tshirt?.quantity > 0) {
        list.push({
          description: `T-Shirt Printing (${data.tshirt.category || "Cotton"})`,
          quantity: data.tshirt.quantity,
          unitPrice: data.tshirt.unitPrice,
          total: data.tshirt.amount
        });
      }
      if (data.largeFormat?.sticker?.quantity > 0) {
        list.push({
          description: `Large Format Sticker (${data.largeFormat.sticker.size})`,
          quantity: data.largeFormat.sticker.quantity,
          unitPrice: data.largeFormat.sticker.unitPrice,
          total: data.largeFormat.sticker.amount
        });
      }
      if (data.largeFormat?.banner?.quantity > 0) {
        list.push({
          description: `Large Format Banner (${data.largeFormat.banner.size})`,
          quantity: data.largeFormat.banner.quantity,
          unitPrice: data.largeFormat.banner.unitPrice,
          total: data.largeFormat.banner.amount
        });
      }
      if (data.dtf?.a3?.quantity > 0) {
        list.push({
          description: "DTF Printing A3 Sheet",
          quantity: data.dtf.a3.quantity,
          unitPrice: data.dtf.a3.unitPrice,
          total: data.dtf.a3.amount
        });
      }
      if (data.dtf?.a4?.quantity > 0) {
        list.push({
          description: "DTF Printing A4 Sheet",
          quantity: data.dtf.a4.quantity,
          unitPrice: data.dtf.a4.unitPrice,
          total: data.dtf.a4.amount
        });
      }
      if (data.specialServices && data.specialServices.length > 0) {
        data.specialServices.forEach((serv: any) => {
          list.push({
            description: serv.description,
            quantity: serv.quantity || 1,
            unitPrice: serv.amount / (serv.quantity || 1),
            total: serv.amount
          });
        });
      }
      return list;
    }
  }, [data, settings.vatRate]);

  const isJob = !!data.jobDescription;

  const subtotal = React.useMemo(() => {
    if (isJob) {
      const rate = settings.vatRate || 0;
      return data.totalAmount / (1 + rate / 100);
    }
    return data.subtotal || data.totalAmount || itemsList.reduce((sum, item) => sum + item.total, 0);
  }, [isJob, data.subtotal, data.totalAmount, settings.vatRate, itemsList]);

  const discount = data.discount || 0;

  const vat = React.useMemo(() => {
    if (isJob) {
      return data.totalAmount - subtotal;
    }
    return data.tax !== undefined ? data.tax : (subtotal * (settings.vatRate / 100));
  }, [isJob, data.totalAmount, subtotal, data.tax, settings.vatRate]);

  const grandTotal = isJob ? data.totalAmount : (data.grandTotal || (subtotal - discount + vat));
  const depositPaid = data.depositPaid !== undefined ? data.depositPaid : grandTotal;
  const balance = data.balance !== undefined ? data.balance : (grandTotal - depositPaid);
  const paymentMethod = data.paymentMethod || "Cash";

  const handlePrint = () => {
    onAddAuditLog("Print", activeFormat.toUpperCase(), `Printed document ${documentNumber} for client ${customerName}.`);
    
    const printContent = printRef.current?.innerHTML;
    if (printContent) {
      try {
        // 1. Create a temporary container
        const tempDiv = document.createElement("div");
        tempDiv.id = "printopia-temp-print-container";
        
        // 2. Set styles to ensure it only shows during print and occupies full page
        tempDiv.className = activeFormat === "receipt" ? "print-receipt-body" : "bg-white p-8";
        tempDiv.innerHTML = printContent;
        
        // 3. Append to body
        document.body.appendChild(tempDiv);
        
        // 4. Add print-active classes to body
        document.body.classList.add("printopia-print-active");
        if (activeFormat === "receipt") {
          document.body.classList.add("printopia-print-receipt");
        }
        
        // 5. Trigger print
        setTimeout(() => {
          try {
            window.print();
          } catch (err) {
            console.error("Print failed:", err);
          } finally {
            // 6. Clean up
            document.body.classList.remove("printopia-print-active");
            document.body.classList.remove("printopia-print-receipt");
            if (tempDiv.parentNode) {
              tempDiv.parentNode.removeChild(tempDiv);
            }
          }
        }, 50);
      } catch (e) {
        console.error("Direct print failed, falling back to window.print():", e);
        window.print();
      }
    }
  };

  const handleDownloadPDF = () => {
    onAddAuditLog("Download", activeFormat.toUpperCase(), `Generated and exported PDF for ${documentNumber}.`);
    
    const printContent = printRef.current?.innerHTML;
    if (printContent) {
      try {
        // 1. Create a temporary container
        const tempDiv = document.createElement("div");
        tempDiv.id = "printopia-temp-print-container";
        
        // 2. Set styles to ensure it only shows during print and occupies full page
        tempDiv.className = activeFormat === "receipt" ? "print-receipt-body" : "bg-white p-8";
        
        // Prepend PDF Notice
        const noticeHtml = `
          <div class="no-print" style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center; font-size: 12px; margin-bottom: 24px; color: #475569; font-family: sans-serif; font-weight: 600;">
            <strong>PDF Export Guide:</strong> Please select <strong>"Save as PDF"</strong> as the Destination in the print settings to download this document.
          </div>
        `;
        tempDiv.innerHTML = noticeHtml + printContent;
        
        // 3. Append to body
        document.body.appendChild(tempDiv);
        
        // 4. Add print-active classes to body
        document.body.classList.add("printopia-print-active");
        if (activeFormat === "receipt") {
          document.body.classList.add("printopia-print-receipt");
        }
        
        // 5. Trigger print
        setTimeout(() => {
          try {
            window.print();
          } catch (err) {
            console.error("PDF generation print failed:", err);
          } finally {
            // 6. Clean up
            document.body.classList.remove("printopia-print-active");
            document.body.classList.remove("printopia-print-receipt");
            if (tempDiv.parentNode) {
              tempDiv.parentNode.removeChild(tempDiv);
            }
          }
        }, 50);
      } catch (e) {
        console.error("Direct print failed, falling back to window.print():", e);
        window.print();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      {/* Self-contained print style sheet */}
      <style>{`
        @media print {
          /* Hide all other elements on the page during print active state */
          body.printopia-print-active > *:not(#printopia-temp-print-container) {
            display: none !important;
          }
          body.printopia-print-active {
            background: white !important;
            color: black !important;
          }
          body.printopia-print-active #printopia-temp-print-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 10mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* For receipt specifically, constrain body width */
          body.printopia-print-active.printopia-print-receipt #printopia-temp-print-container {
            max-width: 80mm !important;
            width: 80mm !important;
            margin: 0 auto !important;
            padding: 4mm !important;
            font-family: monospace !important;
            font-size: 11px !important;
          }
          body.printopia-print-active.printopia-print-receipt #printopia-temp-print-container .thermal-card-print {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
          }
          @page {
            margin: 10mm !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="relative w-full max-w-3xl rounded-xl bg-white text-gray-900 shadow-2xl overflow-hidden flex flex-col my-8">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              <span className="font-bold text-gray-800 text-sm">
                Format:
              </span>
            </div>
            
            {/* Format Toggles */}
            <div className="inline-flex rounded-lg bg-gray-200/75 p-0.5 border border-gray-200">
              <button
                type="button"
                onClick={() => setActiveFormat("invoice")}
                className={`rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  activeFormat === "invoice"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Corporate Invoice
              </button>
              <button
                type="button"
                onClick={() => setActiveFormat("receipt")}
                className={`rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  activeFormat === "receipt"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Intake Receipt
              </button>
              <button
                type="button"
                onClick={() => setActiveFormat("delivery_receipt")}
                className={`rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  activeFormat === "delivery_receipt"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Delivery Receipt
              </button>
              <button
                type="button"
                onClick={() => setActiveFormat("waybill")}
                className={`rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  activeFormat === "waybill"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Waybill
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white transition cursor-pointer shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 cursor-pointer shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Container */}
        <div className="flex-grow p-8 overflow-y-auto max-h-[75vh]" ref={printRef}>
          {activeFormat === "invoice" && (
            <div className="space-y-6 relative min-h-[550px]">
              {/* Background watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0" style={{ opacity: 0.20 }}>
                <img
                  src={resolveLogo()}
                  alt="Watermark"
                  className="w-4/5 max-w-sm object-contain"
                  style={{ filter: "grayscale(100%) contrast(120%)" }}
                  
                />
              </div>

              <div className="relative z-10 space-y-6">
                {/* Invoice Layout */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={resolveLogo()}
                        alt="Printopia Logo"
                        className="h-10 w-auto object-contain"
                        
                      />
                      <span className="text-xl font-bold tracking-tight text-gray-900">
                        {settings.companyName}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 max-w-sm whitespace-pre-line">
                      {settings.address}
                    </p>
                    <p className="text-xs text-gray-500">Phone: {settings.phone}</p>
                    <p className="text-xs text-gray-500">Email: {settings.email}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <h1 className="text-2xl font-black text-indigo-600 uppercase tracking-wider mb-1">
                      INVOICE
                    </h1>
                    <p className="text-sm font-semibold text-gray-800">{documentNumber}</p>
                    <p className="text-xs text-gray-500">Date: {dateStr}</p>
                    <p className="text-xs text-gray-500">
                      Expected Delivery: {data.expectedDeliveryDate || "Immediate"}
                    </p>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Bill To */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                      Bill To
                    </h3>
                    <p className="text-sm font-bold text-gray-800">{customerName}</p>
                    <p className="text-xs text-gray-500">Phone: {customerPhone}</p>
                    {data.deliveryAddress && (
                      <p className="text-xs text-gray-500 mt-1">Address: {data.deliveryAddress}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                      Payment Status
                    </h3>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        balance <= 0
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : depositPaid > 0
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {balance <= 0 ? "FULLY PAID" : depositPaid > 0 ? "PARTIALLY PAID" : "UNPAID"}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Method: {paymentMethod}</p>
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-100 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-2.5">Item Description</th>
                      <th className="py-2.5 text-right w-20">Qty</th>
                      <th className="py-2.5 text-right w-28">Unit Price</th>
                      <th className="py-2.5 text-right w-28">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itemsList.map((item, i) => (
                      <tr key={i} className="text-gray-700">
                        <td className="py-3 font-medium text-gray-900">{item.description}</td>
                        <td className="py-3 text-right">{item.quantity}</td>
                        <td className="py-3 text-right">
                          {currency} {item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-semibold">
                          {currency} {item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Subtotal, Tax, Grand Total */}
                <div className="flex justify-end pt-4">
                  <div className="w-64 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>
                        {currency} {subtotal.toFixed(2)}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Discount</span>
                        <span>
                          - {currency} {discount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {settings.vatRate > 0 && (
                      <div className="flex justify-between">
                        <span>VAT ({settings.vatRate}%)</span>
                        <span>
                          {currency} {vat.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <hr className="border-gray-100" />
                    <div className="flex justify-between font-black text-gray-900 text-base">
                      <span>Grand Total</span>
                      <span className="text-indigo-600">
                        {currency} {grandTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                      <span>Paid (Deposit)</span>
                      <span>
                        {currency} {depositPaid.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-rose-600 font-bold">
                      <span>Balance Due</span>
                      <span>
                        {currency} {balance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="max-w-md text-center sm:text-left">
                    <p className="text-xs font-medium text-gray-500 italic">
                      {settings.invoiceFooter}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeFormat === "receipt" && (
            <div className="thermal-card-print mx-auto max-w-sm border border-gray-200 p-6 bg-amber-50/10 font-mono text-xs text-gray-800 rounded-md relative overflow-hidden min-h-[400px]">
              {/* Background watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0" style={{ opacity: 0.25 }}>
                <img
                  src={resolveLogo()}
                  alt="Watermark"
                  className="w-3/4 object-contain"
                  style={{ filter: "grayscale(100%) contrast(150%)" }}
                  
                />
              </div>

              <div className="relative z-10 space-y-4">
                {/* Thermal Receipt design (approx 80mm roll width representation) */}
                <div className="text-center space-y-1">
                  <div className="flex justify-center mb-2">
                    <img
                      src={resolveLogo()}
                      alt="Printopia Logo"
                      className="h-12 w-auto object-contain grayscale"
                      
                    />
                  </div>
                  <h2 className="text-base font-bold uppercase tracking-tight text-gray-900">
                    {settings.companyName}
                  </h2>
                  <p className="text-[10px] text-gray-500 whitespace-pre-line leading-tight">
                    {settings.address}
                  </p>
                  <p className="text-[10px] text-gray-500">Tel: {settings.phone}</p>
                  <p className="text-[10px] font-semibold text-gray-700">THERMAL TRANSACTION RECORD</p>
                </div>

                <div className="border-t border-dashed border-gray-300 pt-3 space-y-1">
                  <div className="flex justify-between">
                    <span>REC NO:</span>
                    <span>{documentNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DATE:</span>
                    <span>{dateStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CLIENT:</span>
                    <span className="truncate max-w-[180px]">{customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CASHIER:</span>
                    <span>{data.staffInitials || data.staffName || "Admin"}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-300 py-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-dashed border-gray-300 font-bold">
                        <th className="pb-1 text-left">ITEM</th>
                        <th className="pb-1 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsList.map((item, i) => (
                        <tr key={i}>
                          <td className="py-1">
                            {item.quantity}x {item.description}
                          </td>
                          <td className="py-1 text-right">
                            {currency} {item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>SUBTOTAL:</span>
                    <span>
                      {currency} {subtotal.toFixed(2)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-650">
                      <span>DISCOUNT:</span>
                      <span>
                        - {currency} {discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {settings.vatRate > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>VAT ({settings.vatRate}%):</span>
                      <span>
                        {currency} {vat.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-950 border-t border-dashed border-gray-300 pt-1">
                    <span>GRAND TOTAL:</span>
                    <span>
                      {currency} {grandTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>PAYMENT ({paymentMethod}):</span>
                    <span>
                      {currency} {depositPaid.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>BALANCE:</span>
                    <span>
                      {currency} {balance.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Signature Section */}
                <div className="mt-2">
                  <div className="flex flex-row gap-3">
                    {/* Client Signature */}
                    <div className="flex-1">
                      <div className="border-t border-dashed border-gray-300 pt-2">
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2 text-center">
                          Client Signature
                        </p>
                        <p 
                          className="font-serif italic text-sm text-gray-900 text-center truncate" 
                          style={{ borderBottom: "2px solid #4b5563", paddingBottom: "4px", minHeight: "22px", lineHeight: "1.4" }}
                        >
                          {customerName}
                        </p>
                      </div>
                    </div>
                    {/* Staff Signature */}
                    <div className="flex-1">
                      <div className="border-t border-dashed border-gray-300 pt-2">
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2 text-center">
                          Staff Signature
                        </p>
                        <p 
                          className="font-serif italic text-sm text-gray-900 text-center truncate" 
                          style={{ borderBottom: "2px solid #4b5563", paddingBottom: "4px", minHeight: "22px", lineHeight: "1.4" }}
                        >
                          {data.staffInitials || data.staffName || "Admin"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-300 pt-4 text-center space-y-3">
                  <div className="flex flex-col items-center">
                    {/* Barcode Mockup */}
                    <div className="h-8 flex items-end gap-0.5 px-3 bg-white border border-gray-200">
                      {[
                        2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 2, 3, 1,
                        4
                      ].map((width, idx) => (
                        <div
                          key={idx}
                          className="bg-black h-full"
                          style={{ width: `${width}px` }}
                        ></div>
                      ))}
                    </div>
                    <span className="text-[9px] tracking-[3px] text-gray-500 mt-1 font-sans">
                      *{documentNumber}*
                    </span>
                  </div>


                  <p className="text-[9px] leading-tight text-gray-500 italic">
                    {settings.receiptFooter}
                  </p>
                  <p className="text-[9px] text-gray-400">--- Powered by Printopia OS ---</p>
                </div>
              </div>
            </div>
          )}

          {activeFormat === "delivery_receipt" && (
            <div className="thermal-card-print mx-auto max-w-sm border border-gray-200 p-6 bg-emerald-50/10 font-mono text-xs text-gray-800 rounded-md relative overflow-hidden min-h-[400px]">
              {/* Background watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0" style={{ opacity: 0.25 }}>
                <img
                  src={resolveLogo()}
                  alt="Watermark"
                  className="w-3/4 object-contain"
                  style={{ filter: "grayscale(100%) contrast(150%)" }}
                  
                />
              </div>

              <div className="relative z-10 space-y-4">
                {/* Delivery Receipt Header */}
                <div className="text-center space-y-1">
                  <div className="flex justify-center mb-2">
                    <img
                      src={resolveLogo()}
                      alt="Printopia Logo"
                      className="h-12 w-auto object-contain grayscale"
                      
                    />
                  </div>
                  <h2 className="text-base font-bold uppercase tracking-tight text-gray-900">
                    {settings.companyName}
                  </h2>
                  <p className="text-[10px] text-gray-500 whitespace-pre-line leading-tight">
                    {settings.address}
                  </p>
                  <p className="text-[10px] text-gray-500">Tel: {settings.phone}</p>
                  <p className="text-[10px] font-semibold text-emerald-700">DELIVERY RECEIPT</p>
                </div>

                <div className="border-t border-dashed border-gray-300 pt-3 space-y-1">
                  <div className="flex justify-between">
                    <span>DELIVERY NO:</span>
                    <span>{documentNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DATE:</span>
                    <span>{dateStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CLIENT:</span>
                    <span className="truncate max-w-[180px]">{customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CONTACT:</span>
                    <span className="truncate max-w-[180px]">{customerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>JOB / ORDER:</span>
                    <span>{data.jobNumber || data.orderNumber || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DELIVERY METHOD:</span>
                    <span className="font-bold text-emerald-700">{data.collectionMethod || data.deliveryMethod || "N/A"}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-300 py-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-dashed border-gray-300 font-bold">
                        <th className="pb-1 text-left">ITEM</th>
                        <th className="pb-1 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsList.map((item, i) => (
                        <tr key={i}>
                          <td className="py-1">
                            {item.quantity}x {item.description}
                          </td>
                          <td className="py-1 text-right">
                            {currency} {item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
                  <div className="flex justify-between font-bold text-gray-950 border-t border-dashed border-gray-300 pt-1">
                    <span>GRAND TOTAL:</span>
                    <span>
                      {currency} {grandTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>PAYMENT ({paymentMethod}):</span>
                    <span>
                      {currency} {depositPaid.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>BALANCE DUE:</span>
                    <span>
                      {currency} {balance.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Signature Section */}
                <div className="mt-2">
                  <div className="flex flex-row gap-2">
                    {/* Client Signature */}
                    <div className="flex-1">
                      <div className="border-t border-dashed border-gray-300 pt-2">
                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1 text-center">
                          Client Signature
                        </p>
                        <p 
                          className="font-serif italic text-xs text-gray-900 text-center truncate" 
                          style={{ borderBottom: "2px solid #4b5563", paddingBottom: "3px", minHeight: "20px", lineHeight: "1.3" }}
                        >
                          {customerName}
                        </p>
                      </div>
                    </div>
                    {/* Staff Signature */}
                    <div className="flex-1">
                      <div className="border-t border-dashed border-gray-300 pt-2">
                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1 text-center">
                          Staff Signature
                        </p>
                        <p 
                          className="font-serif italic text-xs text-gray-900 text-center truncate" 
                          style={{ borderBottom: "2px solid #4b5563", paddingBottom: "3px", minHeight: "20px", lineHeight: "1.3" }}
                        >
                          {data.staffInitials || data.staffName || "Admin"}
                        </p>
                      </div>
                    </div>
                    {/* Received By */}
                    <div className="flex-1">
                      <div className="border-t border-dashed border-gray-300 pt-2">
                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-1 text-center">
                          Received By
                        </p>
                        <p 
                          className="font-serif italic text-xs text-gray-900 text-center truncate" 
                          style={{ borderBottom: "2px solid #4b5563", paddingBottom: "3px", minHeight: "20px", lineHeight: "1.3" }}
                        >
                          {data.staffInitials || data.staffName || "Admin"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-300 pt-4 text-center space-y-3">
                  <div className="flex flex-col items-center">
                    <div className="h-8 flex items-end gap-0.5 px-3 bg-white border border-gray-200">
                      {[
                        2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 2, 3, 1,
                        4
                      ].map((width, idx) => (
                        <div
                          key={idx}
                          className="bg-black h-full"
                          style={{ width: `${width}px` }}
                        ></div>
                      ))}
                    </div>
                    <span className="text-[9px] tracking-[3px] text-gray-500 mt-1 font-sans">
                      *{documentNumber}*
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] leading-tight text-gray-500 italic">
                      {settings.receiptFooter}
                    </p>
                    <p className="text-[9px] text-emerald-700 font-bold">--- Delivery Confirmation ---</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeFormat === "waybill" && (
            <div className="space-y-6 relative min-h-[500px]">
              {/* Background watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0" style={{ opacity: 0.20 }}>
                <img
                  src={resolveLogo()}
                  alt="Watermark"
                  className="w-4/5 max-w-sm object-contain"
                  style={{ filter: "grayscale(100%) contrast(120%)" }}
                  
                />
              </div>

              <div className="relative z-10 space-y-6">
                {/* Waybill / Delivery Note Template */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={resolveLogo()}
                        alt="Printopia Logo"
                        className="h-10 w-auto object-contain"
                        
                      />
                      <span className="text-xl font-bold tracking-tight text-gray-900">
                        Printopia Logistics
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Waybill & Delivery Note Form</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-extrabold text-gray-800">{documentNumber}</h2>
                    <p className="text-xs text-gray-500">Date: {dateStr}</p>
                    <p className="text-xs text-gray-500">Origin: Printopia Central Workshop</p>
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Ship To (Customer)
                    </h4>
                    <p className="font-bold text-gray-800">{customerName}</p>
                    <p className="text-xs text-gray-600 mt-1 font-semibold">
                      Address: {data.deliveryAddress || (data.collectionMethod === "Shop Delivery" ? "Printopia Office pickup" : (data.specialInstructions?.split("Ship to")[1] || "Client Registered Address"))}
                    </p>
                    <p className="text-xs text-gray-500">Phone: {customerPhone}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Delivery Logistics
                    </h4>
                    <p className="text-xs text-gray-700 mt-0.5">
                      <span className="font-semibold text-gray-500">Vehicle Number: </span> 
                      M-26-GR 8910
                    </p>
                    <p className="text-xs text-gray-700 mt-0.5">
                      <span className="font-semibold text-gray-500">Method: </span> 
                      {data.collectionMethod || "N/A"}
                    </p>
                    <p className="text-xs text-gray-700 mt-0.5">
                      <span className="font-semibold text-gray-500">Status: </span>
                      <span className="text-amber-600 font-bold">PENDING SIGNATURE</span>
                    </p>
                  </div>
                </div>

                {/* Package Content List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Package Contents
                  </h4>
                  <table className="w-full text-left border border-gray-100 rounded-lg text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs font-bold">
                      <tr>
                        <th className="p-3">Item Description</th>
                        <th className="p-3 text-right w-24">Quantity</th>
                        <th className="p-3 text-right w-36">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itemsList.map((item, idx) => (
                        <tr key={idx} className="text-gray-700">
                          <td className="p-3 font-semibold text-gray-900">{item.description}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">
                              Ready / Sealed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Signature pads representation */}
                <div className="grid grid-cols-2 gap-8 pt-8">
                  <div className="space-y-1">
                    <div className="h-16 border border-dashed border-gray-200 bg-gray-50/50 rounded flex items-center justify-center text-[10px] text-gray-400 font-mono italic">
                      
                    </div>
                    <p className="text-[11px] font-bold text-gray-800 text-center">Dispatch Officer Signature</p>
                    <p className="text-[10px] text-gray-400 text-center">Printopia Press Authority</p>
                  </div>
                  <div className="space-y-1">
                    <div className="h-16 border border-dashed border-indigo-200 bg-indigo-50/20 rounded flex items-center justify-center text-[10px] text-indigo-500 font-mono italic">
                      
                    </div>
                    <p className="text-[11px] font-bold text-gray-800 text-center">Customer Handover Signature</p>
                    <p className="text-[10px] text-gray-400 text-center">Sign on electronic terminal upon arrival</p>
                  </div>
                </div>

                {/* Legal verification info */}
                <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Printopia Safe-Transit Guaranteed Logistics</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">SYS-WAYBILL-ID: {data.id || "SYS-TEMP"}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
