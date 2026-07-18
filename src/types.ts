/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = "Admin",
  STAFF = "Staff",
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface PhotocopyOrder {
  colored: boolean;
  blackAndWhite: boolean;
  custom: boolean;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PrintingOrder {
  colored: boolean;
  blackAndWhite: boolean;
  custom: boolean;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface FrameOrder {
  size: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface TshirtOrder {
  category: "Cotton" | "Lacoste" | "Eyelet" | "";
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface LargeFormatOrder {
  sticker: {
    size: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  };
  banner: {
    size: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  };
}

export interface DtfOrder {
  a3: {
    quantity: number;
    unitPrice: number;
    amount: number;
  };
  a4: {
    quantity: number;
    unitPrice: number;
    amount: number;
  };
}

export interface SpecialServiceOrder {
  description: string;
  quantity: number;
  amount: number;
}

export interface GeneralPrintingOrder {
  id: string; // Auto-generated
  orderNumber: string; // e.g. GPO-2026-0001
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  photocopy: PhotocopyOrder;
  printing: PrintingOrder;
  frame: FrameOrder;
  tshirt: TshirtOrder;
  largeFormat: LargeFormatOrder;
  dtf: DtfOrder;
  specialServices: SpecialServiceOrder[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  staffName: string;
  paymentMethod: "Mobile Money" | "Cash" | "Bank Transfer" | "POS";
}

export type JobStatus = "Pending" | "Design" | "Printing" | "Ready" | "Delivered" | "Cancelled";
export type KanbanStage = "Design" | "Printing / Production" | "Finishing" | "Quality Check" | "Ready for Delivery" | "Delivered" | "Job Completed";

export interface PaymentRecord {
  id: string;
  timestamp: string; // e.g. "2026-07-07 13:45:00"
  amountPaid: number;
  paymentMethod: "Mobile Money" | "Cash" | "Bank Transfer" | "POS";
  receivedBy: string;
}

export interface Job {
  id: string;
  jobNumber: string; // Auto-generated e.g. JOB-2026-0001
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  jobDescription: string;
  totalAmount: number;
  depositPaid: number;
  balance: number;
  expectedDeliveryDate: string;
  staffInitials: string;
  paymentMethod: "Mobile Money" | "Cash" | "Bank Transfer" | "POS";
  specialInstructions: string;
  collectionMethod: "Pick Up" | "Shop Delivery" | "Courier" | "Dispatch Rider" | "Other";
  status: JobStatus;
  kanbanStage: KanbanStage;
  priority: "Low" | "Medium" | "High";
  assignedStaff: string;
  paymentHistory?: PaymentRecord[];
}

export interface DailySalesReport {
  id: string;
  date: string;
  closingTime: string;
  staffName: string;
  shift: string;
  photocopyTotal: number;
  printingTotal: number;
  framesTotal: number;
  tshirtsTotal: number;
  largeFormatTotal: number;
  dtfTotal: number;
  specialServicesTotal: number;
  dailyMiscellaneous: number;
  cashReceived: number;
  mobileMoneyReceived: number;
  bankTransferReceived: number;
  posReceived: number;
  totalSales: number;
  remarks: string;
  isApproved?: boolean;
}

export interface DailyMiscellaneous {
  id: string;
  date: string;
  item: string;
  description: string;
  purpose: string;
  amount: number;
  staffName: string;
  receiptUrl?: string; // or simulated base64/file info
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // INV-2026-0001
  customerId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  paymentMethod: string;
  depositPaid: number;
  balance: number;
  qrCodeData: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string; // REC-2026-0001
  customerName: string;
  date: string;
  items: Array<{
    description: string;
    total: number;
  }>;
  grandTotal: number;
  paymentAmount: number;
  balance: number;
  cashier: string;
  barcodeData: string;
  qrCodeData: string;
}

export interface Waybill {
  id: string;
  waybillNumber: string; // WAY-2026-0001
  customerName: string;
  deliveryAddress: string;
  phone: string;
  date: string;
  items: Array<{
    description: string;
    quantity: number;
  }>;
  dispatchRider: string;
  vehicleNumber: string;
  customerSignature?: string;
  staffSignature: string;
  status: "Pending" | "Delivered";
}

export interface Expenditure {
  id: string;
  date: string;
  item: string;
  description: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category: "Printing Materials" | "Office Supplies" | "Fuel" | "Maintenance" | "Utilities" | "Rent" | "Salary" | "Other";
}

export interface InventoryItem {
  id: string;
  item: string;
  category: "Paper" | "Ink" | "DTF" | "Apparel" | "Finishing" | "Other" | "Printing Materials" | "Office Supplies";
  supplier: string;
  openingStock: number;
  purchased: number;
  used: number;
  remainingStock: number;
  minimumStock: number;
  alertLevel: number;
  unitCost: number;
  sellingPrice: number;
  barcode: string;
  qrCode: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string; // "Create", "Edit", "Delete"
  module: string;
  details: string;
}

export interface Notification {
  id: string;
  timestamp: string;
  type: "low_stock" | "overdue_job" | "unpaid_deposit" | "large_sale" | "missing_report" | "deadline_approaching" | "shift_submitted" | "clock_in" | "clock_out" | "service_added" | "job_created";
  message: string;
  isRead: boolean;
}

export interface CompanySettings {
  companyName: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  vatRate: number; // e.g. 15 for 15%
  receiptFooter: string;
  invoiceFooter: string;
  theme: "light" | "dark";
  currency: string; // e.g. "USD", "GHS", "EUR"
  language: string;
  syncServerUrl?: string;
  africasTalkingUsername?: string;
  africasTalkingApiKey?: string;
  africasTalkingSenderId?: string;
}

export interface StaffAccount {
  id: string; // "staff-1" or "staff-2"
  username: string;
  name: string;
  passwordText: string;
  roleDescription: string;
}

export interface StaffNote {
  id: string;
  date: string;
  staffId: string;
  staffName: string;
  note: string;
  recordedBy: string;
  timestamp: string;
  clockInTime?: string; // format "HH:MM"
  clockOutTime?: string; // format "HH:MM"
  sessionType?: "Clock In" | "Clock Out" | "Late Arrival";
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  group?: string;
}

