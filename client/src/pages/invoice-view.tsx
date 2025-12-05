import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Button } from '../components/ui/button';
import { Download, CreditCard, ExternalLink } from 'lucide-react';
import { 
  useCreatePaymentSession, 
  useStripeConnectAccount,
  useCreateAndSendStripeInvoice,
  useCanUseStripeInvoicing,
  useCreatePaymentIntent 
} from '../hooks/useAr';
import { useToast } from '../hooks/use-toast';
// import { loadStripe } from '@stripe/stripe-js';
// import { Elements } from '@stripe/react-stripe-js';
// import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  title: string;
  description?: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  subtotal: number;
  taxAmount?: number;
  currency: string;
  customer: {
    name: string;
    email?: string;
    address?: string;
    company?: string;
    stripeCustomerId?: string;
  };
  workspace: {
    name: string;
    email?: string;
    address?: string;
    logoUrl?: string;
  };
  lineItems: InvoiceLineItem[];
  // Stripe Invoicing Connect Integration
  stripeInvoiceId?: string;
  stripeHostedInvoiceUrl?: string;
  stripeInvoicePdf?: string;
  stripePaymentStatus?: string;
  stripeAmountDue?: number;
  stripeAmountPaid?: number;
  stripeApplicationFeeAmount?: number;
}

export function InvoiceView() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const createPaymentSession = useCreatePaymentSession();
  const createStripeInvoice = useCreateAndSendStripeInvoice();
  const { data: stripeConnectAccount } = useStripeConnectAccount();
  const stripeInvoiceData = useCanUseStripeInvoicing(id || '');

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/receivables/invoices/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoice');
      }
      
      const data = await response.json();
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    // Use browser's print functionality for PDF generation
    window.print();
  };

  const handlePayInvoice = async () => {
    if (!invoice) return;

    try {
      // Create a Stripe Checkout session for secure payment processing
      const result = await createPaymentSession.mutateAsync({ invoiceId: invoice.id });
      if (result.sessionId && result.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url;
      } else {
        toast({
          title: "Payment Error",
          description: "Failed to create payment session. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating payment session:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to create payment session",
        variant: "destructive",
      });
    }
  };


  const handleSendStripeInvoice = async () => {
    if (!invoice) return;

    try {
      await createStripeInvoice.mutateAsync({ invoiceId: invoice.id });
      toast({
        title: "Invoice Sent",
        description: "Invoice has been sent via Stripe and is now available for payment.",
      });
      // Refresh the invoice to show updated Stripe data
      fetchInvoice();
    } catch (error) {
      console.error('Error sending Stripe invoice:', error);
      toast({
        title: "Send Error",
        description: error instanceof Error ? error.message : "Failed to send Stripe invoice",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number | undefined | null, currency = 'USD') => {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100); // Convert from cents
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading invoice...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">{error || 'Invoice not found'}</div>
          <Button onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Print controls - hidden on screen, visible on print */}
      <div className="no-print sticky top-0 bg-white border-b border-gray-200 p-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-end">
          <Button onClick={downloadPDF} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1">
            {invoice.workspace.logoUrl && (
              <img
                src={invoice.workspace.logoUrl}
                alt={`${invoice.workspace.name} logo`}
                className="h-16 w-auto mb-4 print:h-12"
              />
            )}
            <h1 className="text-2xl font-bold text-gray-900 print:text-black">
              {invoice.workspace.name}
            </h1>
            {invoice.workspace.address && (
              <p className="text-gray-600 mt-1 print:text-gray-800">
                {invoice.workspace.address}
              </p>
            )}
            {invoice.workspace.email && (
              <p className="text-gray-600 print:text-gray-800">
                {invoice.workspace.email}
              </p>
            )}
          </div>
          
          <div className="text-right">
            <h2 className="text-xl font-semibold text-gray-900 print:text-black">
              Invoice
            </h2>
            <p className="text-gray-600 mt-2 print:text-gray-800">
              #{invoice.invoiceNumber}
            </p>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 print:text-black">Bill To:</h3>
            <div className="text-gray-600 print:text-gray-800">
              <p className="font-medium">{invoice.customer.name}</p>
              {invoice.customer.company && (
                <p>{invoice.customer.company}</p>
              )}
              {invoice.customer.address && (
                <p>{invoice.customer.address}</p>
              )}
              {invoice.customer.email && (
                <p>{invoice.customer.email}</p>
              )}
            </div>
          </div>
          
          <div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 print:text-gray-800">Invoice Date:</span>
                <span className="font-medium print:text-black">{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 print:text-gray-800">Due Date:</span>
                <span className="font-medium print:text-black">{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 print:text-gray-800">Status:</span>
                <span className={`font-medium capitalize print:text-black ${
                  invoice.status === 'paid' ? 'text-green-600 print:text-green-700' :
                  invoice.status === 'overdue' ? 'text-red-600 print:text-red-700' :
                  'text-yellow-600 print:text-yellow-700'
                }`}>
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 print:border-gray-400">
                <th className="text-left py-3 text-gray-900 print:text-black font-semibold">
                  Description
                </th>
                <th className="text-right py-3 text-gray-900 print:text-black font-semibold w-24">
                  Qty
                </th>
                <th className="text-right py-3 text-gray-900 print:text-black font-semibold w-32">
                  Unit Price
                </th>
                <th className="text-right py-3 text-gray-900 print:text-black font-semibold w-32">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 print:border-gray-300">
                  <td className="py-4 text-gray-900 print:text-black">
                    {item.description}
                  </td>
                  <td className="py-4 text-right text-gray-600 print:text-gray-800">
                    {item.quantity}
                  </td>
                  <td className="py-4 text-right text-gray-600 print:text-gray-800">
                    {formatCurrency(item.unitPrice, invoice.currency)}
                  </td>
                  <td className="py-4 text-right font-medium text-gray-900 print:text-black">
                    {formatCurrency(item.total, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-200 print:border-gray-400">
                <span className="text-gray-600 print:text-gray-800">Subtotal:</span>
                <span className="font-medium text-gray-900 print:text-black">
                  {formatCurrency(invoice.subtotal, invoice.currency)}
                </span>
              </div>
              {invoice.taxAmount && invoice.taxAmount > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200 print:border-gray-400">
                  <span className="text-gray-600 print:text-gray-800">Tax:</span>
                  <span className="font-medium text-gray-900 print:text-black">
                    {formatCurrency(invoice.taxAmount, invoice.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t-2 border-gray-300 print:border-gray-600">
                <span className="text-lg font-semibold text-gray-900 print:text-black">Total:</span>
                <span className="text-lg font-semibold text-gray-900 print:text-black">
                  {formatCurrency(invoice.totalAmount, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.description && (
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-2 print:text-black">Notes:</h3>
            <p className="text-gray-600 print:text-gray-800 whitespace-pre-wrap">
              {invoice.description}
            </p>
          </div>
        )}

        {/* Payment Section */}
        {invoice.status !== 'paid' && (
          <div className="mb-8 p-6 bg-blue-50 border border-blue-200 print:hidden">
            <h3 className="font-semibold text-gray-900 mb-3">Ready to pay?</h3>
            
            {/* Stripe Invoice Status Display */}
            {invoice.stripeHostedInvoiceUrl && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Stripe Invoice Available</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700">Payment Status:</span>
                    <span className="text-sm font-medium text-green-900 capitalize">
                      {invoice.stripePaymentStatus || 'pending'}
                    </span>
                  </div>
                  {invoice.stripeAmountPaid && invoice.stripeAmountPaid > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700">Amount Paid:</span>
                      <span className="text-sm font-medium text-green-900">
                        {formatCurrency(invoice.stripeAmountPaid, invoice.currency)}
                      </span>
                    </div>
                  )}
                  {invoice.stripeAmountDue && invoice.stripeAmountDue > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700">Amount Due:</span>
                      <span className="text-sm font-medium text-green-900">
                        {formatCurrency(invoice.stripeAmountDue, invoice.currency)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2">
                    <Button
                      onClick={() => window.open(invoice.stripeHostedInvoiceUrl, '_blank')}
                      variant="outline"
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View & Pay on Stripe
                    </Button>
                  </div>
                  {invoice.stripeInvoicePdf && (
                    <div className="pt-2">
                      <Button
                        onClick={() => window.open(invoice.stripeInvoicePdf, '_blank')}
                        variant="outline"
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Send Stripe Invoice Button for Draft Invoices */}
            {invoice.status === 'draft' && stripeInvoiceData.canUseStripeInvoicing && !invoice.stripeHostedInvoiceUrl && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-medium text-amber-900 mb-2">Send via Stripe Invoice</h4>
                <p className="text-sm text-amber-700 mb-3">
                  Convert this draft invoice to a Stripe invoice and send it to the customer for payment.
                </p>
                <Button
                  onClick={handleSendStripeInvoice}
                  disabled={createStripeInvoice.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {createStripeInvoice.isPending ? (
                    <>
                      <CreditCard className="w-4 h-4 mr-2 animate-pulse" />
                      Creating Stripe Invoice...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Send via Stripe Invoice
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Payment Method Selection - Only Elements */}
            {(!stripeInvoiceData.hasStripeInvoice || stripeInvoiceData.canUseStripeInvoicing) && (
              <div className="space-y-4">
                {!stripeConnectAccount?.enabled ? (
                  <div className="space-y-4">
                    <p className="text-gray-600 mb-4">
                      This invoice can be paid once Stripe Connect is enabled. Please contact the invoicing company to set up payment processing.
                    </p>
                    <div className="text-sm text-gray-500">
                      <p>💳 Secure payment processing powered by Stripe Connect</p>
                      <p>🔒 Your payment information is encrypted and secure</p>
                    </div>
                  </div>
                ) : !stripeConnectAccount?.chargesEnabled ? (
                  <div className="space-y-4">
                    <p className="text-gray-600 mb-4">
                      Payment processing is being set up. Please try again in a few minutes.
                    </p>
                    <div className="text-sm text-amber-600">
                      <p>⚠️ Stripe Connect account is not yet ready for payments</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-600 mb-4">
                      Enter your payment details directly in the form below to pay this invoice securely.
                    </p>
                    <Button
                      onClick={handlePayInvoice}
                      disabled={createPaymentSession.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {createPaymentSession.isPending ? (
                        <>
                          <CreditCard className="w-4 h-4 mr-2 animate-pulse" />
                          Creating Payment Session...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay with Stripe Checkout
                        </>
                      )}
                    </Button>
                    <div className="text-sm text-gray-500 space-y-1">
                      <>
                        <p>💳 Secure payment processing powered by Stripe</p>
                        <p>🔒 Your payment information is encrypted and secure</p>
                        <p>⚡ Instant payment confirmation</p>
                        <p>🎨 Hosted checkout experience</p>
                      </>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payment Terms */}
        <div className="text-sm text-gray-500 print:text-gray-600">
          <p>Payment due within 30 days. Late payments may incur additional fees.</p>
          {invoice.status === 'paid' && (
            <p className="mt-2 text-green-600 print:text-green-700 font-medium">
              ✓ This invoice has been paid
            </p>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { 
            -webkit-print-color-adjust: exact !important; 
            color-adjust: exact !important; 
          }
        }
      `}</style>
    </div>
  );
}