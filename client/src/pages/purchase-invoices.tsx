import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Loader2,
  Download,
  Upload,
  Inbox,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type VendorRecord = {
  id: string;
  name: string;
  email?: string | null;
  paymentTerms?: string | null;
};

type InvoiceLineItemRecord = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  category?: string | null;
};

type PurchaseInvoiceRecord = {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  title: string;
  description?: string | null;
  status: string;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  invoiceDate: string;
  dueDate?: string | null;
  paidDate?: string | null;
  createdAt: string;
  updatedAt: string;
  vendor?: VendorRecord | null;
  receiptImageUrl?: string | null;
  ocrData?: Record<string, any> | null;
  lineItems?: InvoiceLineItemRecord[];
};

type PurchaseInvoiceResponse = {
  invoices: PurchaseInvoiceRecord[];
  vendors: VendorRecord[];
  stats: {
    totalInvoices: number;
    outstandingAmount: number;
    overdueCount: number;
    dueSoonCount: number;
    paidThisMonth: number;
  };
};

type PurchaseInvoicesPageProps = {
  embedded?: boolean;
};

 const statusVariants: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-blue-200 bg-blue-50 text-blue-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  overdue: "border-red-200 bg-red-50 text-red-700",
  submitted: "border-slate-200 bg-slate-50 text-slate-700",
  cancelled: "border-slate-200 bg-slate-50 text-slate-600",
};

 const formatCurrency = (valueInCents = 0, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(valueInCents / 100);

 const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(dateString)
    );
  } catch {
    return dateString;
  }
};

const emptyManualForm = () => ({
  vendorId: "",
  totalAmount: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  description: "",
});

 const usePurchaseInvoices = () =>
  useQuery<PurchaseInvoiceResponse>({
    queryKey: ["/api/payables/purchase-invoices"],
    queryFn: async () => {
      const response = await fetch("/api/payables/purchase-invoices");
      if (!response.ok) {
        throw new Error("Failed to load purchase invoices");
      }
      return response.json();
    },
  });

 const useVendorsFallback = () =>
  useQuery<VendorRecord[]>({
    queryKey: ["/api/vendors"],
    queryFn: async () => {
      const response = await fetch("/api/vendors");
      if (!response.ok) {
        throw new Error("Failed to load vendors");
      }
      return response.json();
    },
  });

 export default function PurchaseInvoicesPage({ embedded = false }: PurchaseInvoicesPageProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { data, isLoading, isFetching } = usePurchaseInvoices();
  const { data: fallbackVendors } = useVendorsFallback();

  const invoices = data?.invoices ?? [];
  const vendors =
    (data?.vendors && data.vendors.length > 0 ? data.vendors : fallbackVendors) ?? [];
  const stats = data?.stats;

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const selectedInvoice = useMemo(() => {
    if (!invoices.length) return null;
    if (!selectedInvoiceId) return invoices[0];
    return invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? invoices[0];
  }, [invoices, selectedInvoiceId]);

  const [formState, setFormState] = useState(() => emptyManualForm());
  const [filePreview, setFilePreview] = useState<{ dataUrl: string | null; name: string | null }>({
    dataUrl: null,
    name: null,
  });

  const addInvoiceMutation = useMutation({
    mutationFn: async () => {
      const totalAmountNumber = Number(formState.totalAmount);
      if (!Number.isFinite(totalAmountNumber) || totalAmountNumber <= 0) {
        throw new Error("Amount must be greater than zero");
      }

      const payload = {
        vendorId: formState.vendorId,
        description: formState.description,
        totalAmount: totalAmountNumber,
        taxAmount: 0,
        currency: "USD",
        invoiceDate: formState.invoiceDate,
        dueDate: formState.dueDate || undefined,
        status: "pending",
        receiptImageUrl: filePreview.dataUrl,
        ocrData: {
          submittedVia: "workspace",
          capturedBy: user?.email,
          originalFileName: filePreview.name,
        },
      };

      const response = await fetch("/api/invoices/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error((await response.json())?.message || "Failed to save invoice");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice saved", description: "Your invoice is ready for review." });
      setFormState(emptyManualForm());
      setFilePreview({ dataUrl: null, name: null });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      queryClient.invalidateQueries({ queryKey: ["/api/payables/purchase-invoices"] });
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error?.message || "Unable to save this invoice.",
        variant: "destructive",
      });
    },
  });

  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: string }) => {
      const response = await fetch(`/api/payables/purchase-invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error((await response.json())?.message || "Failed to update invoice status");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Status updated", description: "Invoice status has been changed." });
      queryClient.invalidateQueries({ queryKey: ["/api/payables/purchase-invoices"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error?.message || "Unable to update invoice status.",
        variant: "destructive",
      });
    },
  });

  const handleManualSubmit = () => {
    if (!formState.vendorId) {
      toast({ title: "Vendor required", description: "Select a vendor before saving." });
      return;
    }
    addInvoiceMutation.mutate();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview({ dataUrl: reader.result as string, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const clearUpload = () => {
    setFilePreview({ dataUrl: null, name: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const wrapperClass = embedded ? "space-y-6" : "py-8 space-y-6";

  return (
    <div className={wrapperClass}>
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatCurrency(stats.outstandingAmount)}</div>
              <p className="text-xs text-muted-foreground">Across open invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.overdueCount}</div>
              <p className="text-xs text-muted-foreground">Invoices past due</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Due soon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stats.dueSoonCount}</div>
              <p className="text-xs text-muted-foreground">Next 14 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Paid this month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatCurrency(stats.paidThisMonth)}</div>
              <p className="text-xs text-muted-foreground">Manually settled</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Captured invoices</CardTitle>
              <CardDescription>Keep vendor submissions organized before pushing to your AP stack.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-slate-200 divide-y">
              {isLoading || isFetching ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading invoices
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-60" />
                  <p className="font-medium">No purchase invoices yet</p>
                  <p className="text-sm">Log one manually or share the vendor link to collect PDFs.</p>
                </div>
              ) : (
                invoices.map((invoice) => {
                  const isSelected = selectedInvoice?.id === invoice.id;
                  return (
                    <button
                      type="button"
                      key={invoice.id}
                      onClick={() => setSelectedInvoiceId(invoice.id)}
                      className={`w-full px-4 py-4 text-left flex flex-col gap-2 transition ${
                        isSelected ? "bg-slate-100" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.vendor?.name || "Unknown vendor"}
                          </p>
                        </div>
                        <Badge className={statusVariants[invoice.status] || statusVariants.pending}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
                        <span>{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                        <span>{formatDate(invoice.invoiceDate)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Invoice details</CardTitle>
            <CardDescription>Download the document and push it through your payment tools.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedInvoice ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice</p>
                    <p className="text-xl font-semibold text-slate-900">{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <Select
                    value={selectedInvoice.status}
                    onValueChange={(value) => updateInvoiceStatusMutation.mutate({
                      invoiceId: selectedInvoice.id,
                      status: value
                    })}
                    disabled={updateInvoiceStatusMutation.isPending}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-slate-900">
                    {formatCurrency(selectedInvoice.totalAmount, selectedInvoice.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedInvoice.vendor?.name || "Unknown vendor"}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Invoice date</dt>
                    <dd className="font-medium text-slate-900">{formatDate(selectedInvoice.invoiceDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Due date</dt>
                    <dd className="font-medium text-slate-900">{formatDate(selectedInvoice.dueDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Submitted via</dt>
                    <dd className="font-medium text-slate-900">
                      {selectedInvoice.ocrData?.submittedVia === "vendor-portal"
                        ? "Vendor portal"
                        : "Workspace upload"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Contact</dt>
                    <dd className="font-medium text-slate-900">
                      {selectedInvoice.ocrData?.contactEmail || selectedInvoice.vendor?.email || "—"}
                    </dd>
                  </div>
                </dl>
                {selectedInvoice.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">
                      {selectedInvoice.description}
                    </p>
                  </div>
                )}
                {selectedInvoice.receiptImageUrl ? (
                  <Button variant="outline" asChild>
                    <a href={selectedInvoice.receiptImageUrl} download={`invoice-${selectedInvoice.invoiceNumber || selectedInvoice.id}`}>
                      <Download className="h-4 w-4 mr-2" />
                      Download invoice
                    </a>
                  </Button>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-muted-foreground flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    No file attached
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Mark the invoice as paid inside your accounting or banking software once the transfer clears.
                </p>
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-60" />
                <p>Select an invoice to view its details.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Log an invoice</CardTitle>
          <CardDescription>Capture vendor PDFs manually when they arrive in your inbox.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Vendor *</Label>
              <Select
                value={formState.vendorId}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, vendorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={vendors.length ? "Select vendor" : "Add vendors first"} />
                </SelectTrigger>
                <SelectContent>
                  {vendors.length === 0 ? (
                    <SelectItem value="no-vendors" disabled>
                      No vendors available
                    </SelectItem>
                  ) : (
                    vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Invoice number</Label>
              <p className="text-xs text-muted-foreground">
                No entry required—Crannies generates an internal reference automatically.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Total amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formState.totalAmount}
                onChange={(event) => setFormState((prev) => ({ ...prev, totalAmount: event.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label>Invoice date</Label>
              <Input
                type="date"
                value={formState.invoiceDate}
                onChange={(event) => setFormState((prev) => ({ ...prev, invoiceDate: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={formState.dueDate}
                onChange={(event) => setFormState((prev) => ({ ...prev, dueDate: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Support file (PDF or image)</Label>
              <div className="flex items-center gap-3">
                <Input type="file" accept="application/pdf,image/*" ref={fileInputRef} onChange={handleFileUpload} />
                {filePreview.dataUrl && (
                  <Button variant="ghost" size="sm" onClick={clearUpload}>
                    Clear
                  </Button>
                )}
              </div>
              {filePreview.name && (
                <p className="text-xs text-muted-foreground">Attached: {filePreview.name}</p>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={formState.description}
              onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Usage details, internal routing instructions, etc."
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>
              You can also share the vendor-facing link (from the Vendors tab) so partners can upload invoices
              themselves.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleManualSubmit} disabled={addInvoiceMutation.isPending}>
              {addInvoiceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" /> Log invoice
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
