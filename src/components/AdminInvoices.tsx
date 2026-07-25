import React, { useState, useMemo } from "react";
import { FileText, Plus, Trash2, CheckCircle, Eye, Edit as EditIcon } from "lucide-react";
import { DBStore } from "../dbStore";
import { AdminInvoice } from "../types";

interface AdminInvoicesProps {
  settings: any;
  onRefresh: () => void;
  onOpenDocument?: (type: "invoice" | "receipt" | "waybill" | "delivery_receipt" | "admin_invoice", data: any) => void;
}

export default function AdminInvoices({ settings, onRefresh, onOpenDocument }: AdminInvoicesProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [items, setItems] = useState<Array<{ description: string; quantity: number; unitPrice: number; total: number }>>([]);
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"Mobile Money" | "Cash" | "Bank Transfer" | "POS">("Mobile Money");
  const [paymentType, setPaymentType] = useState<"mobile_money" | "bank" | "">("mobile_money");
  const [momoName, setMomoName] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"draft" | "confirmed">("draft");
  const [editingId, setEditingId] = useState<string | null>(null);

  const invoices = DBStore.getAdminInvoices();
  const currency = settings.currency || "GHS";

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = subtotal - discount;
  const balance = Math.max(0, grandTotal - amountPaid);

  const handleAddItem = () => {
    if (!itemDesc.trim() || itemQty <= 0 || itemPrice <= 0) {
      alert("Please enter valid item details.");
      return;
    }
    setItems([...items, { description: itemDesc, quantity: itemQty, unitPrice: itemPrice, total: itemQty * itemPrice }]);
    setItemDesc("");
    setItemQty(1);
    setItemPrice(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSaveInvoice = () => {
    if (!customerName.trim()) {
      alert("Please enter customer name.");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one item.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    if (editingId) {
      const existing = invoices.find((inv) => inv.id === editingId);
      if (!existing) return;
      const updated: AdminInvoice = {
        ...existing,
        customerName,
        customerPhone,
        companyName,
        representativeName,
        date: existing.date,
        items,
        subtotal,
        tax: 0,
        discount,
        grandTotal,
        amountPaid,
        balance,
        paymentMethod,
        paymentDetails: {
          type: paymentType,
          momoName: paymentType === "mobile_money" ? momoName : "",
          momoNumber: paymentType === "mobile_money" ? momoNumber : "",
          accountNumber: paymentType === "bank" ? accountNumber : "",
          bankName: paymentType === "bank" ? bankName : "",
        },
        notes,
        status
      };
      DBStore.updateAdminInvoice(updated);
      alert("Admin invoice updated successfully!");
    } else {
      DBStore.saveAdminInvoice({
        customerName,
        customerPhone,
        companyName,
        representativeName,
        date: todayStr,
        items,
        subtotal,
        tax: 0,
        discount,
        grandTotal,
        amountPaid,
        balance,
        paymentMethod,
        paymentDetails: {
          type: paymentType,
          momoName: paymentType === "mobile_money" ? momoName : "",
          momoNumber: paymentType === "mobile_money" ? momoNumber : "",
          accountNumber: paymentType === "bank" ? accountNumber : "",
          bankName: paymentType === "bank" ? bankName : "",
        },
        notes,
        status,
        createdBy: "Admin"
      });
      alert("Admin invoice created successfully!");
    }

    resetForm();
    onRefresh();
  };

  const handleDeleteInvoice = (id: string) => {
    if (confirm("Are you sure you want to delete this admin invoice?")) {
      DBStore.deleteAdminInvoice(id, "Admin");
      onRefresh();
    }
  };

  const handleViewInvoice = (invoice: AdminInvoice) => {
    if (onOpenDocument) {
      onOpenDocument("admin_invoice", invoice);
    }
  };

  const handleEditInvoice = (invoice: AdminInvoice) => {
    setEditingId(invoice.id);
    setCustomerName(invoice.customerName);
    setCustomerPhone(invoice.customerPhone);
    setCompanyName(invoice.companyName);
    setRepresentativeName(invoice.representativeName);
    setItems(invoice.items);
    setDiscount(invoice.discount);
    setPaymentMethod(invoice.paymentMethod);
    setPaymentType(invoice.paymentDetails?.type || "mobile_money");
    setMomoName(invoice.paymentDetails?.momoName || "");
    setMomoNumber(invoice.paymentDetails?.momoNumber || "");
    setAccountNumber(invoice.paymentDetails?.accountNumber || "");
    setBankName(invoice.paymentDetails?.bankName || "");
    setAmountPaid(invoice.amountPaid);
    setNotes(invoice.notes || "");
    setStatus(invoice.status);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmInvoice = (invoice: AdminInvoice) => {
    if (confirm("Are you sure you want to confirm this invoice?")) {
      DBStore.updateAdminInvoice({ ...invoice, status: "confirmed" });
      onRefresh();
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCompanyName("");
    setRepresentativeName("");
    setItems([]);
    setDiscount(0);
    setPaymentMethod("Mobile Money");
    setPaymentType("mobile_money");
    setMomoName("");
    setMomoNumber("");
    setAccountNumber("");
    setBankName("");
    setAmountPaid(0);
    setNotes("");
    setStatus("draft");
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-800 via-indigo-900 to-slate-950 p-8 md:p-10 shadow-xl">
        <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg backdrop-blur-sm">
            <FileText className="h-9 w-9 text-white" />
          </div>
          <div className="space-y-2">
            <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-white/10 text-white px-2.5 py-0.5 rounded-full">
              Admin Invoices
            </span>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
              Walk-In Customer Invoices
            </h2>
            <p className="text-xs md:text-sm text-slate-300 font-medium max-w-3xl leading-relaxed">
              Create invoices for walk-in customers or company representatives who are not associated with staff sales. These invoices do not appear in staff records or sales reports.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 glass-panel rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden paper-texture">
          <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">New Admin Invoice</h3>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Customer Name</label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in customer name" className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Phone</label>
              <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone number" className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Company Name</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name (optional)" className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Representative Name</label>
              <input type="text" value={representativeName} onChange={(e) => setRepresentativeName(e.target.value)} placeholder="Rep name (optional)" className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Item Description</label>
              <input type="text" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="Service or product" className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Qty</label>
                <input type="number" value={itemQty} onChange={(e) => setItemQty(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Unit Price</label>
                <input type="number" value={itemPrice} onChange={(e) => setItemPrice(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none" />
              </div>
            </div>
            <button onClick={handleAddItem} className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider py-2 transition cursor-pointer">Add Item</button>

            {items.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-gray-900 dark:text-white truncate">{item.description}</p>
                      <p className="text-[9px] text-gray-500">{item.quantity}x @ {currency} {item.unitPrice.toFixed(2)}</p>
                    </div>
                    <span className="text-[10px] font-black text-gray-900 dark:text-white">{currency} {item.total.toFixed(2)}</span>
                    <button onClick={() => handleRemoveItem(idx)} className="ml-2 text-rose-500 hover:text-rose-700 text-[10px] font-black">X</button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Discount</label>
              <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none">
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="POS">POS</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none">
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Payment Type</label>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setPaymentType("mobile_money")} className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${paymentType === "mobile_money" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>Mobile Money</button>
                <button type="button" onClick={() => setPaymentType("bank")} className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${paymentType === "bank" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}>Bank</button>
              </div>
            </div>

            {paymentType === "mobile_money" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">MoMo Name</label>
                  <input type="text" value={momoName} onChange={(e) => setMomoName(e.target.value)} placeholder="MoMo name" className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">MoMo Number</label>
                  <input type="text" value={momoNumber} onChange={(e) => setMomoNumber(e.target.value)} placeholder="MoMo number" className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Account Number</label>
                  <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account number" className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Bank Name</label>
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none" />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Amount Paid</label>
              <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none" />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:border-indigo-400 focus:outline-none" />
            </div>

            <div className="rounded-lg bg-gray-50 dark:bg-zinc-900/50 p-3 space-y-1 text-[10px] font-mono">
              <div className="flex justify-between"><span>Subtotal</span><span>{currency} {subtotal.toFixed(2)}</span></div>
              {discount > 0 && <div className="flex justify-between text-rose-600"><span>Discount</span><span>-{currency} {discount.toFixed(2)}</span></div>}
              <div className="flex justify-between font-black text-gray-900 dark:text-white"><span>Total Cost</span><span>{currency} {grandTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-emerald-600"><span>Amount Paid</span><span>{currency} {amountPaid.toFixed(2)}</span></div>
              <div className="flex justify-between text-rose-600 font-bold"><span>Balance Left</span><span>{currency} {balance.toFixed(2)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleSaveInvoice} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider py-2.5 transition cursor-pointer">{editingId ? "Update Invoice" : "Create Invoice"}</button>
              {editingId && (
                <button onClick={resetForm} className="w-full rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-[10px] font-black uppercase tracking-wider py-2.5 transition cursor-pointer">Cancel</button>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 glass-panel rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden paper-texture">
          <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">All Admin Invoices</h3>
          <div className="overflow-x-auto rounded-2xl border border-white/5 shadow-inner">
            <table className="w-full text-left border-collapse text-xs overflow-hidden">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 dark:from-indigo-950/45 dark:to-violet-950/45 text-indigo-900 dark:text-indigo-300 font-black uppercase tracking-wider text-[10px] border-b border-white/10">
                  <th className="py-3 px-3 rounded-l-xl">Invoice</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Company</th>
                  <th className="py-3 px-3 text-right">Total</th>
                  <th className="py-3 px-3 text-right">Paid</th>
                  <th className="py-3 px-3 text-right">Balance</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-700 dark:text-zinc-300">
                {invoices.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-gray-400 dark:text-zinc-500 text-[10px]">No admin invoices yet.</td></tr>
                ) : invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/5 transition-all">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">{inv.customerName}</td>
                    <td className="py-3 px-3 text-gray-600 dark:text-zinc-400">{inv.companyName || "—"}</td>
                    <td className="py-3 px-3 text-right font-black text-gray-900 dark:text-white">{currency} {inv.grandTotal.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{currency} {inv.amountPaid.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">{currency} {inv.balance.toFixed(2)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${inv.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{inv.status}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => handleViewInvoice(inv)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-indigo-500/20 transition">
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        <button onClick={() => handleEditInvoice(inv)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-amber-500/20 transition">
                          <EditIcon className="h-3.5 w-3.5" /> Manual
                        </button>
                        {inv.status === "draft" && (
                          <button onClick={() => handleConfirmInvoice(inv)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-emerald-500/20 transition">
                            <CheckCircle className="h-3.5 w-3.5" /> Accept
                          </button>
                        )}
                        <button onClick={() => handleDeleteInvoice(inv.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600 text-[10px] font-black uppercase tracking-wider cursor-pointer hover:bg-rose-500/20 transition">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}