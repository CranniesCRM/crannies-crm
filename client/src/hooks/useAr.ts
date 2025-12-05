import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types
export interface Customer {
  id: string;
  workspaceId: string;
  issueId?: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  billingAddress?: string;
  taxId?: string;
  paymentTerms?: string;
  creditLimit?: number;
  isActive: boolean;
  customerType?: string;
  industry?: string;
  notes?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  // Stripe Invoicing Connect Integration
  stripeCustomerId?: string;
  stripeConnectAccountId?: string;
}

export interface SalesInvoice {
  id: string;
  workspaceId: string;
  invoiceNumber: string;
  customerId: string;
  title: string;
  description?: string;
  status: string;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  invoiceDate: string;
  dueDate?: string;
  paidDate?: string;
  sentDate?: string;
  isRecurring: boolean;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  lineItems?: InvoiceLineItem[];
  // Stripe Invoicing Connect Integration
  stripeInvoiceId?: string;
  stripeConnectAccountId?: string;
  stripeHostedInvoiceUrl?: string;
  stripeInvoicePdf?: string;
  stripePaymentStatus?: string;
  stripeAmountDue?: number;
  stripeAmountPaid?: number;
  stripeApplicationFeeAmount?: number;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  createdAt: string;
}

export interface CustomerPayment {
  id: string;
  workspaceId: string;
  customerId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  method: string;
  referenceNumber?: string;
  paymentDate: string;
  notes?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArDashboardStats {
  totalCustomers: number;
  pendingInvoices: number;
  overdueAmount: number;
  monthlyRevenue: number;
  avgCollectionTime: number;
  recurringRevenue: number;
  totalReceivable: number;
  totalCollected: number;
}

// API functions
const apiCall = async (endpoint: string, options?: RequestInit) => {
  const response = await fetch(`/api${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
};

// Dashboard Stats Hook
export const useArDashboardStats = () => {
  return useQuery({
    queryKey: ["ar", "dashboard", "stats"],
    queryFn: () => apiCall("/receivables/dashboard/stats"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Customers Hooks
export const useCustomers = () => {
  return useQuery({
    queryKey: ["ar", "customers"],
    queryFn: () => apiCall("/receivables/customers"),
  });
};

export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: ["ar", "customers", id],
    queryFn: () => apiCall(`/receivables/customers/${id}`),
    enabled: !!id,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (customer: Partial<Customer>) =>
      apiCall("/receivables/customers", {
        method: "POST",
        body: JSON.stringify(customer),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "customers"] });
    },
    onError: (error: Error) => {
      // Enhanced error handling for customer creation
      if (error.message.includes("Email is required")) {
        throw new Error("Email is required for all customers");
      }
      if (error.message.includes("valid email address")) {
        throw new Error("Please provide a valid email address");
      }
      throw error;
    },
  });
};

// Sales Invoices Hooks
export const useSalesInvoices = () => {
  return useQuery({
    queryKey: ["ar", "invoices"],
    queryFn: () => apiCall("/receivables/invoices"),
  });
};

export const useCreateSalesInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (invoice: any) =>
      apiCall("/receivables/invoices", {
        method: "POST",
        body: JSON.stringify(invoice),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ar", "dashboard", "stats"] });
    },
    onError: (error: Error) => {
      // Enhanced error handling for invoice creation
      if (error.message.includes("Customer must have an email address")) {
        throw new Error("This customer does not have an email address. An email is required to send invoices.");
      }
      throw error;
    },
  });
};

// Customer Payments Hooks
export const useCustomerPayments = () => {
  return useQuery({
    queryKey: ["receivables", "payments"],
    queryFn: () => apiCall("/receivables/payments"),
  });
};

export const useCreateCustomerPayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payment: Partial<CustomerPayment>) =>
      apiCall("/receivables/payments", {
        method: "POST",
        body: JSON.stringify(payment),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables", "payments"] });
      queryClient.invalidateQueries({ queryKey: ["receivables", "dashboard", "stats"] });
    },
  });
};

// Stripe Connect Payment Hooks
export const useCreatePaymentSession = () => {
  return useMutation({
    mutationFn: ({ invoiceId }: { invoiceId: string }) =>
      apiCall("/stripe/connect/create-payment-session", {
        method: "POST",
        body: JSON.stringify({ invoiceId }),
      }),
    onError: (error: Error) => {
      // Enhanced error handling for payment session creation
      if (error.message.includes("Stripe Connect enabled")) {
        throw new Error("Stripe Connect must be enabled to process payments. Please connect your Stripe account in settings.");
      }
      throw error;
    },
  });
};

export const useStripeConnectAccount = () => {
  return useQuery({
    queryKey: ["workspace", "stripe-connect"],
    queryFn: () => apiCall("/workspace"),
    select: (workspace: any) => ({
      accountId: workspace?.stripeConnectAccountId,
      enabled: workspace?.stripeConnectEnabled,
      chargesEnabled: workspace?.stripeConnectChargesEnabled,
      payoutsEnabled: workspace?.stripeConnectPayoutsEnabled,
      onboardingComplete: workspace?.stripeConnectOnboardingComplete,
    }),
  });
};

export const useRefreshStripeConnectStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () =>
      apiCall("/stripe/connect/refresh-status", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace", "stripe-connect"] });
    },
  });
};

// Create Payment Intent for Stripe Elements
export const useCreatePaymentIntent = () => {
  return useMutation({
    mutationFn: ({ invoiceId }: { invoiceId: string }) =>
      apiCall("/stripe/connect/create-payment-intent", {
        method: "POST",
        body: JSON.stringify({ invoiceId }),
      }),
    onError: (error: Error) => {
      // Enhanced error handling for payment intent creation
      if (error.message.includes("Stripe Connect enabled")) {
        throw new Error("Stripe Connect must be enabled to process payments. Please connect your Stripe account in settings.");
      }
      if (error.message.includes("Customer not found")) {
        throw new Error("Customer not found. Please refresh the page and try again.");
      }
      throw error;
    },
  });
};

// ==================== STRIPE INVOICING HOOKS ====================

// Create Stripe Customer for existing customer
export const useCreateStripeCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ customerId }: { customerId: string }) =>
      apiCall("/stripe/invoicing/create-customer", {
        method: "POST",
        body: JSON.stringify({ customerId }),
      }),
    onSuccess: (data, variables) => {
      // Invalidate customers to refresh the list
      queryClient.invalidateQueries({ queryKey: ["ar", "customers"] });
      queryClient.invalidateQueries({ queryKey: ["ar", "customers", variables.customerId] });
    },
    onError: (error: Error) => {
      // Enhanced error handling for Stripe customer creation
      if (error.message.includes("Stripe Connect enabled")) {
        throw new Error("Stripe Connect must be enabled to create Stripe customers. Please connect your Stripe account in settings.");
      }
      if (error.message.includes("Customer not found")) {
        throw new Error("Customer not found. Please refresh the page and try again.");
      }
      throw error;
    },
  });
};

// Create and send Stripe invoice
export const useCreateAndSendStripeInvoice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ invoiceId }: { invoiceId: string }) =>
      apiCall("/stripe/invoicing/create-and-send-invoice", {
        method: "POST",
        body: JSON.stringify({ invoiceId }),
      }),
    onSuccess: (data, variables) => {
      // Invalidate invoices to refresh the list and current invoice
      queryClient.invalidateQueries({ queryKey: ["ar", "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ar", "invoices", variables.invoiceId] });
    },
    onError: (error: Error) => {
      // Enhanced error handling for Stripe invoice creation
      if (error.message.includes("Stripe Connect enabled")) {
        throw new Error("Stripe Connect must be enabled to create Stripe invoices. Please connect your Stripe account in settings.");
      }
      if (error.message.includes("Customer must have a Stripe customer ID")) {
        throw new Error("This customer must be converted to a Stripe customer first. Please create a Stripe customer for this customer.");
      }
      if (error.message.includes("Invoice not found")) {
        throw new Error("Invoice not found. Please refresh the page and try again.");
      }
      throw error;
    },
  });
};

// Fetch Stripe invoice details
export const useStripeInvoice = (invoiceId: string) => {
  return useQuery({
    queryKey: ["ar", "stripe-invoice", invoiceId],
    queryFn: () => apiCall(`/receivables/invoices/${invoiceId}`), // Reuse existing invoice endpoint which includes Stripe data
    enabled: !!invoiceId,
    staleTime: 30 * 1000, // 30 seconds - Stripe invoice data changes frequently
  });
};

// Check if invoice can use Stripe invoicing
export const useCanUseStripeInvoicing = (invoiceId: string) => {
  const { data: invoice, isLoading } = useStripeInvoice(invoiceId);
  
  return {
    canUseStripeInvoicing: !!invoice?.customer?.stripeCustomerId && !!invoice?.stripeConnectAccountId,
    hasStripeInvoice: !!invoice?.stripeInvoiceId,
    stripeHostedInvoiceUrl: invoice?.stripeHostedInvoiceUrl,
    stripePaymentStatus: invoice?.stripePaymentStatus,
    isLoading,
  };
};