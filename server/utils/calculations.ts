// Utility functions for invoice calculations

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number; // in cents
  category?: string;
}

export interface InvoiceCalculation {
  subtotal: number; // in cents
  taxAmount: number; // in cents
  totalAmount: number; // in cents
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category?: string;
  }>;
}

/**
 * Calculate the total price for a line item (quantity * unit price)
 */
export function calculateLineItemTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice);
}

/**
 * Calculate subtotal from line items
 */
export function calculateSubtotal(lineItems: LineItem[]): number {
  return lineItems.reduce((subtotal, item) => {
    return subtotal + calculateLineItemTotal(item.quantity, item.unitPrice);
  }, 0);
}

/**
 * Calculate tax amount from subtotal and tax percentage
 */
export function calculateTaxAmount(subtotal: number, taxPercentage: number): number {
  return Math.round(subtotal * (taxPercentage / 100));
}

/**
 * Calculate total amount (subtotal + tax)
 */
export function calculateTotalAmount(subtotal: number, taxAmount: number): number {
  return subtotal + taxAmount;
}

/**
 * Process line items and calculate all totals
 */
export function calculateInvoiceTotals(
  lineItems: LineItem[],
  taxPercentage: number = 0
): InvoiceCalculation {
  const processedLineItems = lineItems.map(item => ({
    ...item,
    totalPrice: calculateLineItemTotal(item.quantity, item.unitPrice),
  }));

  const subtotal = calculateSubtotal(lineItems);
  const taxAmount = calculateTaxAmount(subtotal, taxPercentage);
  const totalAmount = calculateTotalAmount(subtotal, taxAmount);

  return {
    subtotal,
    taxAmount,
    totalAmount,
    lineItems: processedLineItems,
  };
}

/**
 * Convert dollars to cents (integer)
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars (float)
 */
export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Format cents as currency string
 */
export function formatCurrency(cents: number, currency: string = 'USD'): string {
  const dollars = centsToDollars(cents);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(dollars);
}

/**
 * Common tax percentages for dropdown
 */
export const TAX_OPTIONS = [
  { label: 'No Tax', value: 0 },
  { label: '5%', value: 5 },
  { label: '7.25%', value: 7.25 },
  { label: '8.25%', value: 8.25 },
  { label: '10%', value: 10 },
  { label: 'Custom...', value: -1 }, // Special value for custom input
] as const;

/**
 * Validate line items
 */
export function validateLineItems(lineItems: LineItem[]): string[] {
  const errors: string[] = [];

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    errors.push('At least one line item is required');
    return errors;
  }

  lineItems.forEach((item, index) => {
    if (!item.description?.trim()) {
      errors.push(`Line item ${index + 1}: Description is required`);
    }

    if (!item.quantity || item.quantity <= 0) {
      errors.push(`Line item ${index + 1}: Quantity must be greater than 0`);
    }

    if (!item.unitPrice || item.unitPrice < 0) {
      errors.push(`Line item ${index + 1}: Unit price must be 0 or greater`);
    }
  });

  return errors;
}