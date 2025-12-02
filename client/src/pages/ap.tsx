import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Filter,
  Search,
  Download,
  Upload
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AccountsPayable() {
  const { user } = useAuth();

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
    totalAmount: 0,
    dueDate: '',
    invoiceDate: '',
  });
  const [poForm, setPoForm] = useState({
    title: '',
    description: '',
    vendorId: '',
    totalAmount: 0,
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

  // Sample data for AP dashboard
  const stats = {
    totalVendors: 24,
    pendingInvoices: 12,
    overdueAmount: 15420, // in cents
    monthlySpend: 89450, // in cents
    pendingApprovals: 5,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts Payable</h1>
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVendors}</div>
            <p className="text-xs text-muted-foreground">Active suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${(stats.overdueAmount / 100).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Past due invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.monthlySpend / 100).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.pendingApprovals}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="vendors" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="invoices">Purchase Invoices</TabsTrigger>
            <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="payments">Payment Runs</TabsTrigger>
            <TabsTrigger value="receipts">Receipts</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        </div>

        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendors</CardTitle>
              <CardDescription>
                Manage your supplier relationships and vendor information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">No vendors yet</h3>
                <p className="text-sm mb-4">Add your first vendor to start managing invoices</p>
                <Button onClick={() => setShowVendorModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Vendor
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Invoices</CardTitle>
              <CardDescription>
                Track and manage incoming invoices with 3-way matching
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">No invoices yet</h3>
                <p className="text-sm mb-4">Capture invoices via OCR or manual entry</p>
                <Button onClick={() => setShowInvoiceModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>
                Track purchase orders and their fulfillment status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">No purchase orders yet</h3>
                <p className="text-sm mb-4">Create purchase orders to track your spending</p>
                <Button onClick={() => setShowPurchaseOrderModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create PO
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Runs</CardTitle>
              <CardDescription>
                Process batch payments via ACH, checks, or wire transfers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">No payment runs yet</h3>
                <p className="text-sm mb-4">Set up automated payment processing</p>
                <Button onClick={() => setShowPaymentRunModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Payment Run
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Goods Receipts</CardTitle>
              <CardDescription>
                Track receiving and complete the 3-way matching process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">No receipts recorded yet</h3>
                <p className="text-sm mb-4">Record goods and services received</p>
                <Button onClick={() => setShowReceiptModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Receipt
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              <Select value={invoiceForm.vendorId} onValueChange={(value) => setInvoiceForm({...invoiceForm, vendorId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {/* Vendors would be loaded here */}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoiceAmount">Amount ($)</Label>
              <Input
                id="invoiceAmount"
                type="number"
                step="0.01"
                value={invoiceForm.totalAmount / 100}
                onChange={(e) => setInvoiceForm({...invoiceForm, totalAmount: Math.round(parseFloat(e.target.value || '0') * 100)})}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceForm.invoiceDate}
                onChange={(e) => setInvoiceForm({...invoiceForm, invoiceDate: e.target.value})}
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
                setShowInvoiceModal(false);
                setInvoiceForm({
                  title: '',
                  description: '',
                  vendorId: '',
                  totalAmount: 0,
                  dueDate: '',
                  invoiceDate: '',
                });
              }}
              disabled={!invoiceForm.title || !invoiceForm.vendorId}
            >
              Create Invoice
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
              <Select value={poForm.vendorId} onValueChange={(value) => setPoForm({...poForm, vendorId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {/* Vendors would be loaded here */}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="poAmount">Total Amount ($)</Label>
              <Input
                id="poAmount"
                type="number"
                step="0.01"
                value={poForm.totalAmount / 100}
                onChange={(e) => setPoForm({...poForm, totalAmount: Math.round(parseFloat(e.target.value || '0') * 100)})}
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
                  totalAmount: 0,
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
              <Select value={receiptForm.vendorId} onValueChange={(value) => setReceiptForm({...receiptForm, vendorId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {/* Vendors would be loaded here */}
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