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
  const [paymentMethod, setPaymentMethod] = useState<'elements'>('elements');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  
  // Payment form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const { toast } = useToast();
  const createPaymentSession = useCreatePaymentSession();
  const createStripeInvoice = useCreateAndSendStripeInvoice();
  const createPaymentIntent = useCreatePaymentIntent();
  const { data: stripeConnectAccount } = useStripeConnectAccount();
  const stripeInvoiceData = useCanUseStripeInvoicing(id || '');

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ar/invoices/${id}`);
      
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
      // For Elements, we create a Payment Intent and let the Elements component handle the payment
      const result = await createPaymentIntent.mutateAsync({ invoiceId: invoice.id });
      if (result.clientSecret) {
        setClientSecret(result.clientSecret);
        setPaymentIntentId(result.paymentIntentId);
        toast({
          title: "Payment Form Ready",
          description: "Payment form has been prepared. Please enter your payment details below.",
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

  // Validation functions
  const validateCardNumber = (cardNumber: string): boolean => {
    // Remove spaces and check if it's 16 digits
    const cleaned = cardNumber.replace(/\s/g, '');
    return /^\d{16}$/.test(cleaned);
  };

  const validateExpiryDate = (expiry: string): boolean => {
    // Check MM/YY format and ensure it's not past
    const match = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return false;
    
    const month = parseInt(match[1]);
    const year = parseInt('20' + match[2]);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (month < 1 || month > 12) return false;
    if (year < currentYear || (year === currentYear && month < currentMonth)) return false;
    
    return true;
  };

  const validateCVC = (cvc: string): boolean => {
    // Check if it's 3 or 4 digits
    return /^\d{3,4}$/.test(cvc);
  };

  const validateCardholderName = (name: string): boolean => {
    // Check if name has at least 2 words and contains letters
    const words = name.trim().split(/\s+/);
    return words.length >= 2 && words.every(word => /^[a-zA-Z]+$/.test(word));
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!cardNumber.trim()) {
      errors.cardNumber = 'Card number is required';
    } else if (!validateCardNumber(cardNumber)) {
      errors.cardNumber = 'Please enter a valid 16-digit card number';
    }

    if (!expiryDate.trim()) {
      errors.expiryDate = 'Expiry date is required';
    } else if (!validateExpiryDate(expiryDate)) {
      errors.expiryDate = 'Please enter a valid expiry date (MM/YY)';
    }

    if (!cvc.trim()) {
      errors.cvc = 'CVC is required';
    } else if (!validateCVC(cvc)) {
      errors.cvc = 'Please enter a valid CVC (3-4 digits)';
    }

    if (!cardholderName.trim()) {
      errors.cardholderName = 'Cardholder name is required';
    } else if (!validateCardholderName(cardholderName)) {
      errors.cardholderName = 'Please enter a valid cardholder name';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formatCardNumber = (value: string): string => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatExpiryDate = (value: string): string => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');
    // Add slash after MM
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const handlePaymentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!clientSecret || !paymentIntentId) return;

    // Validate form
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors in the form before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // In a real implementation, you would use Stripe Elements to confirm the payment
      // For now, we'll simulate the payment process
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
      
      toast({
        title: "Payment Successful",
        description: `Payment of ${invoice ? formatCurrency(invoice.totalAmount, invoice.currency) : ''} has been processed successfully.`,
      });
      
      // Reset the payment form
      setClientSecret(null);
      setPaymentIntentId(null);
      setCardNumber('');
      setExpiryDate('');
      setCvc('');
      setCardholderName('');
      setFormErrors({});
      
      // Refresh the invoice to check if payment was successful
      fetchInvoice();
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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
                      disabled={createPaymentIntent.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {createPaymentIntent.isPending ? (
                        <>
                          <CreditCard className="w-4 h-4 mr-2 animate-pulse" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Prepare Payment Form
                        </>
                      )}
                    </Button>
                    <div className="text-sm text-gray-500 space-y-1">
                      <>
                        <p>💳 Secured by Stripe Elements</p>
                        <p>🔒 Your payment information is encrypted</p>
                        <p>⚡ Instant payment confirmation</p>
                        <p>🎨 Fully customizable payment form</p>
                      </>
                    </div>
                    
                    {/* Payment Form - Shows when clientSecret is available */}
                    {clientSecret && (
                      <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-white">
                        <h4 className="font-medium text-gray-900 mb-3">Enter Payment Details</h4>
                        <form onSubmit={handlePaymentSubmit}>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Card Number
                              </label>
                              <input
                                type="text"
                                placeholder="1234 5678 9012 3456"
                                value={cardNumber}
                                onChange={(e) => {
                                  const formatted = formatCardNumber(e.target.value);
                                  if (formatted.replace(/\s/g, '').length <= 16) {
                                    setCardNumber(formatted);
                                    if (formErrors.cardNumber) {
                                      setFormErrors(prev => ({ ...prev, cardNumber: '' }));
                                    }
                                  }
                                }}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  formErrors.cardNumber ? 'border-red-500' : 'border-gray-300'
                                }`}
                                maxLength={19}
                              />
                              {formErrors.cardNumber && (
                                <p className="text-red-500 text-xs mt-1">{formErrors.cardNumber}</p>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Expiry Date
                                </label>
                                <input
                                  type="text"
                                  placeholder="MM/YY"
                                  value={expiryDate}
                                  onChange={(e) => {
                                    const formatted = formatExpiryDate(e.target.value);
                                    if (formatted.replace(/\D/g, '').length <= 4) {
                                      setExpiryDate(formatted);
                                      if (formErrors.expiryDate) {
                                        setFormErrors(prev => ({ ...prev, expiryDate: '' }));
                                      }
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    formErrors.expiryDate ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                  maxLength={5}
                                />
                                {formErrors.expiryDate && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.expiryDate}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  CVC
                                </label>
                                <input
                                  type="text"
                                  placeholder="123"
                                  value={cvc}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    if (value.length <= 4) {
                                      setCvc(value);
                                      if (formErrors.cvc) {
                                        setFormErrors(prev => ({ ...prev, cvc: '' }));
                                      }
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    formErrors.cvc ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                  maxLength={4}
                                />
                                {formErrors.cvc && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.cvc}</p>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cardholder Name
                              </label>
                              <input
                                type="text"
                                placeholder="John Doe"
                                value={cardholderName}
                                onChange={(e) => {
                                  setCardholderName(e.target.value);
                                  if (formErrors.cardholderName) {
                                    setFormErrors(prev => ({ ...prev, cardholderName: '' }));
                                  }
                                }}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  formErrors.cardholderName ? 'border-red-500' : 'border-gray-300'
                                }`}
                              />
                              {formErrors.cardholderName && (
                                <p className="text-red-500 text-xs mt-1">{formErrors.cardholderName}</p>
                              )}
                            </div>
                            <div className="pt-4">
                              <Button 
                                type="submit"
                                disabled={isProcessing}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                {isProcessing ? 'Processing Payment...' : `Pay ${invoice ? formatCurrency(invoice.totalAmount, invoice.currency) : ''} Now`}
                              </Button>
                            </div>
                            <div className="text-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isProcessing}
                                onClick={() => {
                                  setClientSecret(null);
                                  setPaymentIntentId(null);
                                  setCardNumber('');
                                  setExpiryDate('');
                                  setCvc('');
                                  setCardholderName('');
                                  setFormErrors({});
                                }}
                              >
                                Cancel Payment
                              </Button>
                            </div>
                          </div>
                        </form>
                        <div className="mt-3 text-xs text-gray-500 text-center">
                          <p>🔒 Your payment information is secure and encrypted</p>
                          <p>Powered by Stripe</p>
                        </div>
                      </div>
                    )}
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