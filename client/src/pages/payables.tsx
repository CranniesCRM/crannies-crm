import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2,
  Receipt,
  CreditCard,
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Download,
  Upload
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import PurchaseInvoicesPage from "./purchase-invoices";
import { CompanyLogo } from "@/components/company-logo";
import { useToast } from "@/hooks/use-toast";
import type { Vendor } from "@shared/schema";

// Money input component with proper formatting
function MoneyInput({ value, onChange, placeholder = "0.00", ...props }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  [key: string]: any;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const formatCurrency = (numStr: string) => {
    if (!numStr || numStr === '0') return '';
    const num = parseFloat(numStr);
    if (isNaN(num)) return numStr;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrency = (formattedStr: string) => {
    return formattedStr.replace(/,/g, '');
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^\d.]/g, '');
    onChange(input);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (value) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        onChange(num.toString());
      }
    }
  };

  const displayValue = isEditing ? value : (value ? formatCurrency(value) : '');

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
      <input
        {...props}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`flex h-10 w-full rounded-md border border-input bg-background px-8 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${props.className || ''}`}
      />
    </div>
  );
}

const fetchJSON = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export default function AccountsPayable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
    queryFn: () => fetchJSON<Vendor[]>("/api/vendors"),
  });

  // State for modals
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [showPaymentRunModal, setShowPaymentRunModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Form states
  const [vendorForm, setVendorForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: 'net_30',
  });
  const [invoiceForm, setInvoiceForm] = useState({
    title: '',
    description: '',
    vendorId: '',
    totalAmount: '',
    dueDate: '',
    status: 'pending',
  });
  const [poForm, setPoForm] = useState({
    title: '',
    description: '',
    vendorId: '',
    totalAmount: '',
    requestedDeliveryDate: '',
  });
  const [paymentRunForm, setPaymentRunForm] = useState({
    name: '',
    description: '',
    paymentMethod: 'ach',
  });
  const [receiptForm, setReceiptForm] = useState({
    poId: '',
    vendorId: '',
    receiptNumber: '',
    receivedDate: '',
    notes: '',
  });

  const createPurchaseInvoice = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/invoices/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payables/purchase-invoices"] });
      toast({ title: "Purchase invoice created", description: "The invoice has been added to your payables." });
      setShowInvoiceModal(false);
      setInvoiceForm({
        title: '',
        description: '',
        vendorId: '',
        totalAmount: '',
        dueDate: '',
        status: 'pending',
      });
    },
    onError: (err) => {
      toast({
        title: "Unable to create invoice",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payables</h1>
          <p className="text-muted-foreground mt-1">
            Manage vendors, invoices, and payment processing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button size="sm" onClick={() => setShowInvoiceModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>


      {/* Purchase Invoices */}
      <PurchaseInvoicesPage embedded />

      {/* Create Vendor Modal */}
      <Dialog open={showVendorModal} onOpenChange={setShowVendorModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Create a new vendor for purchasing and payments.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="vendorName">Name *</Label>
              <Input
                id="vendorName"
                value={vendorForm.name}
                onChange={(e) => setVendorForm({...vendorForm, name: e.target.value})}
                placeholder="Vendor name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vendorEmail">Email</Label>
              <Input
                id="vendorEmail"
                type="email"
                value={vendorForm.email}
                onChange={(e) => setVendorForm({...vendorForm, email: e.target.value})}
                placeholder="vendor@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vendorPhone">Phone</Label>
              <Input
                id="vendorPhone"
                value={vendorForm.phone}
                onChange={(e) => setVendorForm({...vendorForm, phone: e.target.value})}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select value={vendorForm.paymentTerms} onValueChange={(value) => setVendorForm({...vendorForm, paymentTerms: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="net_15">Net 15</SelectItem>
                  <SelectItem value="net_30">Net 30</SelectItem>
                  <SelectItem value="net_60">Net 60</SelectItem>
                  <SelectItem value="net_90">Net 90</SelectItem>
                  <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vendorAddress">Address</Label>
              <Textarea
                id="vendorAddress"
                value={vendorForm.address}
                onChange={(e) => setVendorForm({...vendorForm, address: e.target.value})}
                placeholder="Vendor address"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowVendorModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowVendorModal(false);
                setVendorForm({
                  name: '',
                  email: '',
                  phone: '',
                  address: '',
                  paymentTerms: 'net_30',
                });
              }}
              disabled={!vendorForm.name}
            >
              Create Vendor
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Purchase Invoice Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Purchase Invoice</DialogTitle>
            <DialogDescription>
              Create a new purchase invoice for a vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="invoiceTitle">Title *</Label>
              <Input
                id="invoiceTitle"
                value={invoiceForm.title}
                onChange={(e) => setInvoiceForm({...invoiceForm, title: e.target.value})}
                placeholder="Invoice title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoiceVendor">Vendor *</Label>
              <Select
                value={invoiceForm.vendorId}
                onValueChange={(value) => setInvoiceForm({...invoiceForm, vendorId: value})}
                disabled={vendors.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      vendorsLoading
                        ? "Loading vendors..."
                        : vendors.length === 0
                        ? "Add a vendor first"
                        : "Select vendor"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {vendors.length === 0 ? (
                    <SelectItem value="no-vendors" disabled>
                      No vendors available
                    </SelectItem>
                  ) : (
                    vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        <div className="flex items-center gap-2">
                          <CompanyLogo
                            domain={vendor.website || vendor.email}
                            className="h-5 w-5 flex-shrink-0"
                            alt={`${vendor.name} logo`}
                          />
                          <span>{vendor.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoiceAmount">Amount</Label>
              <MoneyInput
                id="invoiceAmount"
                value={invoiceForm.totalAmount}
                onChange={(value) => setInvoiceForm({...invoiceForm, totalAmount: value})}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm({...invoiceForm, dueDate: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoiceStatus">Status</Label>
              <Select
                value={invoiceForm.status}
                onValueChange={(value) => setInvoiceForm({...invoiceForm, status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoiceDescription">Description</Label>
              <Textarea
                id="invoiceDescription"
                value={invoiceForm.description}
                onChange={(e) => setInvoiceForm({...invoiceForm, description: e.target.value})}
                placeholder="Invoice description"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                const amountInCents = Math.round(parseFloat(invoiceForm.totalAmount || '0') * 100);
                createPurchaseInvoice.mutate({
                  title: invoiceForm.title,
                  description: invoiceForm.description,
                  vendorId: invoiceForm.vendorId,
                  totalAmount: amountInCents,
                  dueDate: invoiceForm.dueDate || null,
                  invoiceDate: today,
                  status: invoiceForm.status,
                });
              }}
              disabled={!invoiceForm.title || !invoiceForm.vendorId || createPurchaseInvoice.isPending}
            >
              {createPurchaseInvoice.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Purchase Order Modal */}
      <Dialog open={showPurchaseOrderModal} onOpenChange={setShowPurchaseOrderModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Create a new purchase order for a vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="poTitle">Title *</Label>
              <Input
                id="poTitle"
                value={poForm.title}
                onChange={(e) => setPoForm({...poForm, title: e.target.value})}
                placeholder="Purchase order title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="poVendor">Vendor *</Label>
              <Select
                value={poForm.vendorId}
                onValueChange={(value) => setPoForm({...poForm, vendorId: value})}
                disabled={vendors.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      vendorsLoading
                        ? "Loading vendors..."
                        : vendors.length === 0
                        ? "Add a vendor first"
                        : "Select vendor"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {vendors.length === 0 ? (
                    <SelectItem value="no-vendors" disabled>
                      No vendors available
                    </SelectItem>
                  ) : (
                    vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        <div className="flex items-center gap-2">
                          <CompanyLogo
                            domain={vendor.website || vendor.email}
                            className="h-5 w-5 flex-shrink-0"
                            alt={`${vendor.name} logo`}
                          />
                          <span>{vendor.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="poAmount">Total Amount</Label>
              <MoneyInput
                id="poAmount"
                value={poForm.totalAmount}
                onChange={(value) => setPoForm({...poForm, totalAmount: value})}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deliveryDate">Requested Delivery Date</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={poForm.requestedDeliveryDate}
                onChange={(e) => setPoForm({...poForm, requestedDeliveryDate: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="poDescription">Description</Label>
              <Textarea
                id="poDescription"
                value={poForm.description}
                onChange={(e) => setPoForm({...poForm, description: e.target.value})}
                placeholder="Purchase order description"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowPurchaseOrderModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowPurchaseOrderModal(false);
                setPoForm({
                  title: '',
                  description: '',
                  vendorId: '',
                  totalAmount: '',
                  requestedDeliveryDate: '',
                });
              }}
              disabled={!poForm.title || !poForm.vendorId}
            >
              Create Purchase Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Payment Run Modal */}
      <Dialog open={showPaymentRunModal} onOpenChange={setShowPaymentRunModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New Payment Run</DialogTitle>
            <DialogDescription>
              Set up a batch payment run for multiple invoices.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="paymentRunName">Name *</Label>
              <Input
                id="paymentRunName"
                value={paymentRunForm.name}
                onChange={(e) => setPaymentRunForm({...paymentRunForm, name: e.target.value})}
                placeholder="Payment run name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentRunForm.paymentMethod} onValueChange={(value) => setPaymentRunForm({...paymentRunForm, paymentMethod: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ach">ACH Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="wire">Wire Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paymentRunDescription">Description</Label>
              <Textarea
                id="paymentRunDescription"
                value={paymentRunForm.description}
                onChange={(e) => setPaymentRunForm({...paymentRunForm, description: e.target.value})}
                placeholder="Payment run description"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowPaymentRunModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowPaymentRunModal(false);
                setPaymentRunForm({
                  name: '',
                  description: '',
                  paymentMethod: 'ach',
                });
              }}
              disabled={!paymentRunForm.name}
            >
              Create Payment Run
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Goods Receipt</DialogTitle>
            <DialogDescription>
              Record goods or services received from a vendor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="receiptPo">Purchase Order</Label>
              <Select value={receiptForm.poId} onValueChange={(value) => setReceiptForm({...receiptForm, poId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select purchase order" />
                </SelectTrigger>
                <SelectContent>
                  {/* Purchase orders would be loaded here */}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receiptVendor">Vendor *</Label>
              <Select
                value={receiptForm.vendorId}
                onValueChange={(value) => setReceiptForm({...receiptForm, vendorId: value})}
                disabled={vendors.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      vendorsLoading
                        ? "Loading vendors..."
                        : vendors.length === 0
                        ? "Add a vendor first"
                        : "Select vendor"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {vendors.length === 0 ? (
                    <SelectItem value="no-vendors" disabled>
                      No vendors available
                    </SelectItem>
                  ) : (
                    vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        <div className="flex items-center gap-2">
                          <CompanyLogo
                            domain={vendor.website || vendor.email}
                            className="h-5 w-5 flex-shrink-0"
                            alt={`${vendor.name} logo`}
                          />
                          <span>{vendor.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receiptNumber">Receipt Number *</Label>
              <Input
                id="receiptNumber"
                value={receiptForm.receiptNumber}
                onChange={(e) => setReceiptForm({...receiptForm, receiptNumber: e.target.value})}
                placeholder="Receipt number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receivedDate">Received Date *</Label>
              <Input
                id="receivedDate"
                type="date"
                value={receiptForm.receivedDate}
                onChange={(e) => setReceiptForm({...receiptForm, receivedDate: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receiptNotes">Notes</Label>
              <Textarea
                id="receiptNotes"
                value={receiptForm.notes}
                onChange={(e) => setReceiptForm({...receiptForm, notes: e.target.value})}
                placeholder="Receipt notes"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowReceiptModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowReceiptModal(false);
                setReceiptForm({
                  poId: '',
                  vendorId: '',
                  receiptNumber: '',
                  receivedDate: '',
                  notes: '',
                });
              }}
              disabled={!receiptForm.vendorId || !receiptForm.receiptNumber || !receiptForm.receivedDate}
            >
              Record Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
