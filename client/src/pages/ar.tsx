import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  DollarSign,
  CreditCard,
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Filter,
  Search,
  Download,
  Upload,
  Calendar,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Send,
  Archive,
  ShoppingCart
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useArDashboardStats,
  useCustomers,
  useSalesInvoices,
  useCustomerPayments,
  useCreateCustomer,
  useCreateSalesInvoice,
  useCreateCustomerPayment,
  useCreatePaymentSession,
  useCreateStripeCustomer,
  useStripeConnectAccount
} from "@/hooks/useAr";

export default function AccountsReceivable() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // State for modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditInvoiceModal, setShowEditInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);
  const [showDeleteCustomerDialog, setShowDeleteCustomerDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);

  // Form states
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    customerType: 'business',
  });
  const [invoiceForm, setInvoiceForm] = useState({
    title: '',
    description: '',
    customerId: '',
    dueDate: '',
  });
  
  // Line items state
  const [lineItems, setLineItems] = useState([
    { description: '', quantity: 1, unitPrice: 0 }
  ]);
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [paymentForm, setPaymentForm] = useState({
    customerId: '',
    invoiceId: '',
    amount: 0,
    method: 'credit_card',
    paymentDate: '',
  });


  // Fetch real data from backend
  const { data: dashboardStats, isLoading: statsLoading } = useArDashboardStats();
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const { data: invoices, isLoading: invoicesLoading } = useSalesInvoices();
  const { data: payments, isLoading: paymentsLoading } = useCustomerPayments();

  // Mutations
  const createCustomer = useCreateCustomer();
  const createInvoice = useCreateSalesInvoice();
  const createPayment = useCreateCustomerPayment();
  const createPaymentSession = useCreatePaymentSession();
  const createStripeCustomer = useCreateStripeCustomer();
  const { data: stripeConnectAccount } = useStripeConnectAccount();

  // Invoice navigation function
  const viewInvoice = (invoiceId: string) => {
    // Navigate to the invoice view page
    setLocation(`/ar/invoices/${invoiceId}`);
  };

  // Provide fallback values while loading
  const stats = dashboardStats || {
    totalCustomers: 0,
    pendingInvoices: 0,
    overdueAmount: 0,
    monthlyRevenue: 0,
    avgCollectionTime: 0,
    recurringRevenue: 0,
    totalReceivable: 0,
    totalCollected: 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts Receivable</h1>
          <p className="text-muted-foreground mt-1">
            Manage customers, billing, and collect payments
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
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
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${(stats.monthlyRevenue / 100).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Collection</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgCollectionTime}</div>
            <p className="text-xs text-muted-foreground">Days to collect</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recurring Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${(stats.recurringRevenue / 100).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">MRR</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="customers" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="invoices">Sales Invoices</TabsTrigger>
            <TabsTrigger value="recurring">Recurring Billing</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
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

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <CardDescription>
                Manage customer relationships and billing information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading customers...</p>
                </div>
              ) : customers && customers.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {customers.map((customer: any) => (
                      <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium">{customer.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {customer.email} • {customer.customerType || 'Business'}
                            </p>
                            {customer.stripeCustomerId && (
                              <p className="text-xs text-green-600 font-medium">
                                ✓ Stripe Customer Ready
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={customer.isActive ? "default" : "secondary"}>
                            {customer.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {customer.stripeCustomerId ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Stripe Ready
                            </Badge>
                          ) : stripeConnectAccount?.enabled ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                createStripeCustomer.mutate({ customerId: customer.id }, {
                                  onSuccess: () => {
                                    queryClient.invalidateQueries({ queryKey: ["ar", "customers"] });
                                  },
                                  onError: (error: any) => {
                                    alert(error.message || 'Failed to create Stripe customer. Please try again.');
                                  }
                                });
                              }}
                              disabled={createStripeCustomer.isPending}
                              className="text-xs"
                            >
                              {createStripeCustomer.isPending ? 'Creating...' : 'Create Stripe Customer'}
                            </Button>
                          ) : null}
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setCustomerToDelete(customer);
                              setShowDeleteCustomerDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold mb-2">No customers yet</h3>
                  <p className="text-sm mb-4">
                    Convert Issues to customers or import from external systems
                  </p>
                  <Button onClick={() => setShowCustomerModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Customer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Invoices</CardTitle>
              <CardDescription>
                Create and manage invoices for your customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading invoices...</p>
                </div>
              ) : invoices && invoices.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {invoices.map((invoice: any) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">{invoice.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {invoice.invoiceNumber} • Due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="font-medium">${(invoice.totalAmount / 100).toFixed(2)}</p>
                            <Badge variant={
                              invoice.status === 'paid' ? 'default' :
                              invoice.status === 'overdue' ? 'destructive' :
                              'secondary'
                            }>
                              {invoice.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewInvoice(invoice.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingInvoice(invoice);
                                setShowEditInvoiceModal(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            {invoice.status === 'draft' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`/api/stripe/invoicing/create-and-send-invoice`, {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        invoiceId: invoice.id
                                      }),
                                    });
                                    
                                    if (response.ok) {
                                      const result = await response.json();
                                      // Open Stripe-hosted invoice page
                                      window.open(result.hostedInvoiceUrl, '_blank');
                                      // Refresh the data without page reload
                                      queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
                                      queryClient.invalidateQueries({ queryKey: ["ar", "dashboard", "stats"] });
                                    } else {
                                      const error = await response.json();
                                      alert(`Failed to create and send Stripe invoice: ${error.message}`);
                                    }
                                  } catch (error) {
                                    console.error('Error creating Stripe invoice:', error);
                                    alert('Failed to create Stripe invoice. Please try again.');
                                  }
                                }}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Send via Stripe
                              </Button>
                            )}
                            {invoice.stripeHostedInvoiceUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(invoice.stripeHostedInvoiceUrl, '_blank')}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Stripe Invoice
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setInvoiceToDelete(invoice);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold mb-2">No invoices yet</h3>
                  <p className="text-sm mb-4">Create your first invoice to get paid</p>
                  <Button onClick={() => setShowInvoiceModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recurring Billing</CardTitle>
              <CardDescription>
                Set up automated recurring invoices for subscription services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">No recurring invoices yet</h3>
                <p className="text-sm mb-4">Automate your subscription billing</p>
                <Button onClick={() => setShowInvoiceModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Recurring Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payments Received</CardTitle>
              <CardDescription>
                Track customer payments and payment methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading payments...</p>
                </div>
              ) : payments && payments.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {payments.map((payment: any) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">Payment #{payment.id.slice(0, 8)}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.paymentDate).toLocaleDateString()} • {payment.method}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="font-medium">${(payment.amount / 100).toFixed(2)}</p>
                            <Badge variant="default">Completed</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold mb-2">No payments recorded yet</h3>
                  <p className="text-sm mb-4">Record customer payments as they come in</p>
                  <Button onClick={() => setShowPaymentModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Record Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
              <CardDescription>
                Revenue analysis, aging reports, and collection insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">No data for reports yet</h3>
                <p className="text-sm mb-4">
                  Create invoices and record payments to see analytics
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Customer Modal */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Create a new customer record for billing and payments.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="customerName">Name *</Label>
              <Input
                id="customerName"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                placeholder="Customer name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customerEmail">Email *</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                placeholder="customer@example.com"
                required
              />
              {!customerForm.email && (
                <div className="text-sm text-red-600">
                  Email is required for all customers
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customerType">Customer Type</Label>
              <Select value={customerForm.customerType} onValueChange={(value) => setCustomerForm({...customerForm, customerType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customerAddress">Address</Label>
              <Textarea
                id="customerAddress"
                value={customerForm.address}
                onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
                placeholder="Customer address"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowCustomerModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                createCustomer.mutate(customerForm, {
                  onSuccess: () => {
                    setShowCustomerModal(false);
                    setCustomerForm({
                      name: '',
                      email: '',
                      phone: '',
                      address: '',
                      customerType: 'business',
                    });
                  },
                  onError: (error: any) => {
                    alert(error.message || 'Failed to create customer. Please try again.');
                  }
                });
              }}
              disabled={!customerForm.name || !customerForm.email || createCustomer.isPending}
            >
              {createCustomer.isPending ? 'Creating...' : 'Create Customer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              Create a new invoice for a customer with line items and automatic calculations.
            </DialogDescription>
          </DialogHeader>
          
          {/* Invoice Details */}
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
              <Label htmlFor="invoiceCustomer">Customer *</Label>
              <Select value={invoiceForm.customerId} onValueChange={(value) => setInvoiceForm({...invoiceForm, customerId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{customer.name}</span>
                        <div className="flex items-center space-x-2">
                          {!customer.email && (
                            <span className="text-xs text-orange-600">(No email)</span>
                          )}
                          {customer.stripeCustomerId && (
                            <span className="text-xs text-green-600">✓ Stripe</span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {invoiceForm.customerId && (() => {
                const selectedCustomer = customers?.find((customer: any) => customer.id === invoiceForm.customerId);
                return selectedCustomer && !selectedCustomer.email ? (
                  <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded border">
                    ⚠️ This customer does not have an email address. You will not be able to send invoices to them.
                  </div>
                ) : null;
              })()}
            </div>
            
            {/* Line Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Line Items *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
              
              {/* Line Items Table */}
              <div className="border rounded-lg p-4">
                <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 mb-3">
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2 text-right">Qty</div>
                  <div className="col-span-3 text-right">Unit Price</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                
                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-5">
                      <Input
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...lineItems];
                          newItems[index].description = e.target.value;
                          setLineItems(newItems);
                        }}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...lineItems];
                          newItems[index].quantity = parseInt(e.target.value) || 1;
                          setLineItems(newItems);
                        }}
                        className="text-right"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice / 100}
                        onChange={(e) => {
                          const newItems = [...lineItems];
                          newItems[index].unitPrice = Math.round(parseFloat(e.target.value || '0') * 100);
                          setLineItems(newItems);
                        }}
                        className="text-right"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="text-sm font-medium">
                        ${((item.quantity * item.unitPrice) / 100).toFixed(2)}
                      </span>
                      {lineItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setLineItems(lineItems.filter((_, i) => i !== index))}
                          className="ml-2 h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Tax and Totals */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invoiceTax">Tax Rate</Label>
                <Select value={taxPercentage.toString()} onValueChange={(value) => setTaxPercentage(parseFloat(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tax rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Tax (0%)</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="7.25">7.25%</SelectItem>
                    <SelectItem value="8.25">8.25%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoiceDueDate">Due Date</Label>
                <Input
                  id="invoiceDueDate"
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm({...invoiceForm, dueDate: e.target.value})}
                />
              </div>
            </div>
            
            {/* Invoice Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">
                    ${lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) / 100}
                  </span>
                </div>
                {taxPercentage > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({taxPercentage}%):</span>
                    <span className="font-medium">
                      ${((lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * taxPercentage) / 10000).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total:</span>
                  <span>
                    ${((lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * (100 + taxPercentage)) / 10000).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="invoiceDescription">Description</Label>
              <Textarea
                id="invoiceDescription"
                value={invoiceForm.description}
                onChange={(e) => setInvoiceForm({...invoiceForm, description: e.target.value})}
                placeholder="Invoice description or notes"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => {
              setShowInvoiceModal(false);
              setInvoiceForm({ title: '', description: '', customerId: '', dueDate: '' });
              setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]);
              setTaxPercentage(0);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // Check if selected customer has email
                const selectedCustomer = customers?.find((customer: any) => customer.id === invoiceForm.customerId);
                if (selectedCustomer && !selectedCustomer.email) {
                  alert('This customer does not have an email address. An email is required to send invoices.');
                  return;
                }

                const invoiceData = {
                  ...invoiceForm,
                  lineItems: lineItems.filter(item => item.description.trim() !== ''),
                  taxPercentage,
                  invoiceDate: new Date().toISOString().split('T')[0],
                  status: 'draft',
                  currency: 'USD',
                };
                createInvoice.mutate(invoiceData, {
                  onSuccess: () => {
                    setShowInvoiceModal(false);
                    setInvoiceForm({ title: '', description: '', customerId: '', dueDate: '' });
                    setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]);
                    setTaxPercentage(0);
                  },
                  onError: (error: any) => {
                    // Show error message from server validation
                    alert(error.message || 'Failed to create invoice. Please try again.');
                  }
                });
              }}
              disabled={!invoiceForm.title || !invoiceForm.customerId || lineItems.length === 0 || lineItems.every(item => !item.description.trim()) || createInvoice.isPending}
            >
              {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a customer payment received.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="paymentCustomer">Customer *</Label>
              <Select value={paymentForm.customerId} onValueChange={(value) => setPaymentForm({...paymentForm, customerId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{customer.name}</span>
                        <div className="flex items-center space-x-2">
                          {!customer.email && (
                            <span className="text-xs text-orange-600">(No email)</span>
                          )}
                          {customer.stripeCustomerId && (
                            <span className="text-xs text-green-600">✓ Stripe</span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paymentAmount">Amount ($)</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                value={paymentForm.amount / 100}
                onChange={(e) => setPaymentForm({...paymentForm, amount: Math.round(parseFloat(e.target.value || '0') * 100)})}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentForm.method} onValueChange={(value) => setPaymentForm({...paymentForm, method: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="ach">ACH Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="wire">Wire Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({...paymentForm, paymentDate: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const paymentData = {
                  ...paymentForm,
                  currency: 'USD',
                };
                createPayment.mutate(paymentData, {
                  onSuccess: () => {
                    setShowPaymentModal(false);
                    setPaymentForm({
                      customerId: '',
                      invoiceId: '',
                      amount: 0,
                      method: 'credit_card',
                      paymentDate: '',
                    });
                  }
                });
              }}
              disabled={!paymentForm.customerId || !paymentForm.amount || createPayment.isPending}
            >
              {createPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Modal - Simplified for now */}
      <Dialog open={showEditInvoiceModal} onOpenChange={setShowEditInvoiceModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update invoice details and status.
            </DialogDescription>
          </DialogHeader>
          {editingInvoice && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="editInvoiceTitle">Title *</Label>
                <Input
                  id="editInvoiceTitle"
                  defaultValue={editingInvoice.title}
                  placeholder="Invoice title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editInvoiceStatus">Status</Label>
                <Select defaultValue={editingInvoice.status}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editInvoiceDueDate">Due Date</Label>
                <Input
                  id="editInvoiceDueDate"
                  type="date"
                  defaultValue={editingInvoice.dueDate ? editingInvoice.dueDate.split('T')[0] : ''}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editInvoiceDescription">Description</Label>
                <Textarea
                  id="editInvoiceDescription"
                  defaultValue={editingInvoice.description || ''}
                  placeholder="Invoice description"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => {
              setShowEditInvoiceModal(false);
              setEditingInvoice(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                try {
                  const title = (document.getElementById('editInvoiceTitle') as HTMLInputElement)?.value;
                  const status = (document.getElementById('editInvoiceStatus') as HTMLInputElement)?.value;
                  const dueDate = (document.getElementById('editInvoiceDueDate') as HTMLInputElement)?.value;
                  const description = (document.getElementById('editInvoiceDescription') as HTMLTextAreaElement)?.value;

                  const response = await fetch(`/api/ar/invoices/${editingInvoice.id}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      title,
                      status,
                      dueDate,
                      description
                    }),
                  });
                  
                  if (response.ok) {
                    // Refresh the data without page reload
                    queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
                    queryClient.invalidateQueries({ queryKey: ["ar", "dashboard", "stats"] });
                    setShowEditInvoiceModal(false);
                    setEditingInvoice(null);
                  } else {
                    const error = await response.json();
                    alert(`Failed to update invoice: ${error.message}`);
                  }
                } catch (error) {
                  console.error('Error updating invoice:', error);
                  alert('Failed to update invoice. Please try again.');
                }
              }}
            >
              Update Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice
              {invoiceToDelete && ` "${invoiceToDelete.title}"`} and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setInvoiceToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                try {
                  const response = await fetch(`/api/ar/invoices/${invoiceToDelete?.id}`, {
                    method: 'DELETE',
                  });
                  
                  if (response.ok) {
                    // Refresh the data without page reload
                    queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
                    queryClient.invalidateQueries({ queryKey: ["ar", "dashboard", "stats"] });
                    setShowEditInvoiceModal(false);
                    setEditingInvoice(null);
                  } else {
                    const error = await response.json();
                    alert(`Failed to delete invoice: ${error.message}`);
                  }
                } catch (error) {
                  console.error('Error deleting invoice:', error);
                  alert('Failed to delete invoice. Please try again.');
                }
                setShowDeleteDialog(false);
                setInvoiceToDelete(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Customer Confirmation Dialog */}
      <AlertDialog open={showDeleteCustomerDialog} onOpenChange={setShowDeleteCustomerDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the customer
              {customerToDelete && ` "${customerToDelete.name}"`} and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteCustomerDialog(false);
              setCustomerToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                try {
                  const response = await fetch(`/api/ar/customers/${customerToDelete?.id}`, {
                    method: 'DELETE',
                  });
                  
                  if (response.ok) {
                    // Refresh the data without page reload
                    queryClient.invalidateQueries({ queryKey: ["ar", "customers"] });
                    queryClient.invalidateQueries({ queryKey: ["ar", "dashboard", "stats"] });
                  } else {
                    const error = await response.json();
                    alert(`Failed to delete customer: ${error.message}`);
                  }
                } catch (error) {
                  console.error('Error deleting customer:', error);
                  alert('Failed to delete customer. Please try again.');
                }
                setShowDeleteCustomerDialog(false);
                setCustomerToDelete(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}