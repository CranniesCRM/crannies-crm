import { PDFInvoice } from '@apandresipm/pdf-invoice';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  title: string;
  description?: string;
  issueDate: string;
  dueDate: string;
  customer: {
    name: string;
    email?: string;
    address?: string;
    company?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  taxAmount?: number;
  total: number;
  currency: string;
  workspace: {
    name: string;
    email?: string;
    address?: string;
    logoUrl?: string;
  };
  paymentInfo?: {
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
  };
  terms?: string;
}

export class PDFInvoiceGenerator {
  private static generationCache = new Map<string, { buffer: Buffer; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static async generateInvoice(data: InvoiceData): Promise<Buffer> {
    // Generate cache key for identical invoices
    const cacheKey = this.generateCacheKey(data);
    const cached = this.generationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.buffer;
    }

    const companyInfo: any = {
      name: data.workspace.name,
      address: data.workspace.address || '',
      email: data.workspace.email || '',
      logo: data.workspace.logoUrl || '',
    };

    // Only add image if logo URL is provided and not empty
    if (data.workspace.logoUrl && data.workspace.logoUrl.trim() !== '') {
      companyInfo.image = {
        path: data.workspace.logoUrl,
        styles: { width: 100, height: 100 }
      };
    }

    const invoicePayload: any = {
      company: companyInfo,
      customer: {
        name: data.customer.name,
        address: data.customer.address || '',
        email: data.customer.email || '',
        company: data.customer.company || '',
      },
      invoice: {
        number: data.invoiceNumber,
        date: data.issueDate,
        dueDate: data.dueDate,
        path: '', // We don't want to save to disk
        currency: data.currency,
        status: 'unpaid',
      },
      items: data.items.map(item => ({
        name: item.description,
        quantity: item.quantity,
        price: item.unitPrice / 100, // Convert from cents
      })),
      note: data.description || '',
    };

    // Add QR code only if data is provided
    if (data.paymentInfo && data.paymentInfo.accountNumber) {
      invoicePayload.qr = { data: '' };
    }

    try {
      const pdfInvoice = new PDFInvoice(invoicePayload);
      const pdfPath = await pdfInvoice.create();
      
      // Read the generated file and return as buffer
      const fs = await import('fs');
      const buffer = fs.readFileSync(pdfPath);
      
      // Clean up temporary file
      try {
        fs.unlinkSync(pdfPath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temporary PDF file:', cleanupError);
      }

      // Cache the result
      this.generationCache.set(cacheKey, {
        buffer,
        timestamp: Date.now()
      });

      return buffer;
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error('Failed to generate invoice PDF');
    }
  }

  private static generateCacheKey(data: InvoiceData): string {
    // Create a hash-like key based on invoice data
    const keyData = {
      invoiceNumber: data.invoiceNumber,
      customerName: data.customer.name,
      total: data.total,
      itemCount: data.items.length,
      currency: data.currency
    };
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  static clearCache(): void {
    this.generationCache.clear();
  }

  static async generateBulkInvoices(invoices: Array<{ data: InvoiceData; callback?: (progress: number) => void }>): Promise<Buffer[]> {
    const results: Buffer[] = [];
    const total = invoices.length;
    
    for (let i = 0; i < invoices.length; i++) {
      try {
        const buffer = await this.generateInvoice(invoices[i].data);
        results.push(buffer);
        
        if (invoices[i].callback) {
          invoices[i].callback(Math.round(((i + 1) / total) * 100));
        }
      } catch (error) {
        console.error(`Failed to generate PDF for invoice ${i + 1}/${total}:`, error);
        throw error;
      }
    }
    
    return results;
  }

  static getCacheStats() {
    const cache = this.generationCache;
    const entries = Array.from(cache.entries());
    return {
      totalEntries: entries.length,
      totalSize: entries.reduce((sum, [_, value]) => sum + value.buffer.length, 0),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(([_, value]) => value.timestamp)) : null,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(([_, value]) => value.timestamp)) : null
    };
  }
}

  static generatePaymentLink(invoiceId: string): string {
    // Generate a payment link for customer to pay via Plaid
    return `/pay/${invoiceId}`;
  }

  static formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100); // Convert from cents
  }

  static formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

// Utility function to create invoice PDF from database data
export async function createInvoicePDF(invoice: any, customer: any, workspace: any, lineItems: any[] = []): Promise<Buffer> {
  const items = lineItems.length > 0 ? lineItems : [{
    description: invoice.description || invoice.title,
    quantity: 1,
    unitPrice: invoice.totalAmount,
    total: invoice.totalAmount,
  }];

  const invoiceData: InvoiceData = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    title: invoice.title,
    description: invoice.description,
    issueDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    customer: {
      name: customer.name,
      email: customer.email,
      address: customer.billingAddress || customer.address,
      company: customer.company || customer.name,
    },
    items,
    subtotal: invoice.totalAmount,
    taxAmount: invoice.taxAmount || 0,
    total: invoice.totalAmount,
    currency: invoice.currency || 'USD',
    workspace: {
      name: workspace.name,
      email: workspace.billingEmail,
      address: workspace.address,
      logoUrl: workspace.logoUrl,
    },
    terms: 'Payment due within 30 days. Late payments may incur additional fees.',
  };

  return await PDFInvoiceGenerator.generateInvoice(invoiceData);
}

// Utility for generating payment links with Plaid integration
export function createPaymentLink(invoiceId: string, customerEmail?: string): string {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const params = new URLSearchParams({
    invoice: invoiceId,
    ...(customerEmail && { email: customerEmail })
  });
  
  return `${baseUrl}/pay?${params.toString()}`;
}