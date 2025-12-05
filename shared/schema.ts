import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - extended for Crannies CRM
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  clientLogoUrl: varchar("client_logo_url"), // Logo for client organization in public chat
  role: varchar("role"), // e.g., "Sales Rep", "Marketing Lead", "Designer"
  teamName: varchar("team_name"), // e.g., "Sales", "Marketing", "Design"
  isAdmin: boolean("is_admin").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  apiKey: varchar("api_key"), // For programmatic API access
  workspaceId: varchar("workspace_id").references(() => workspaces.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Workspaces table - companies using Crannies
export const workspaces = pgTable("workspaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  billingEmail: varchar("billing_email"),
  industry: varchar("industry"),
  bio: text("bio"),
  logoUrl: varchar("logo_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  subscriptionStatus: varchar("subscription_status"),
  trialEndDate: timestamp("trial_end_date"),
  createdById: varchar("created_by_id"),
  // Stripe Connect Integration Fields
  stripeConnectAccountId: varchar("stripe_connect_account_id"), // Connected account ID for payments
  stripeConnectEnabled: boolean("stripe_connect_enabled").default(false), // Whether connected account is enabled
  stripeConnectChargesEnabled: boolean("stripe_connect_charges_enabled").default(false), // Whether charges are enabled
  stripeConnectPayoutsEnabled: boolean("stripe_connect_payouts_enabled").default(false), // Whether payouts are enabled
  stripeConnectBusinessProfile: jsonb("stripe_connect_business_profile"), // Business profile data
  stripeConnectOnboardingComplete: boolean("stripe_connect_onboarding_complete").default(false), // Whether onboarding is complete
  stripeConnectOnboardingStarted: boolean("stripe_connect_onboarding_started").default(false), // Whether onboarding has started
  stripeConnectOnboardingStatus: varchar("stripe_connect_onboarding_status"), // Current onboarding status
  stripeConnectOnboardingEvents: jsonb("stripe_connect_onboarding_events"), // Track onboarding events
  stripeConnectLastWebhookEvent: varchar("stripe_connect_last_webhook_event"), // Last webhook event received
  stripeConnectLastWebhookTimestamp: timestamp("stripe_connect_last_webhook_timestamp"), // When last webhook was received
  // Identity Verification Fields
  stripeConnectVerificationFields: jsonb("stripe_connect_verification_fields"), // Array of verification fields (e.g., company, individual, representative)
  stripeConnectRequirementsCurrentlyDue: jsonb("stripe_connect_requirements_currently_due"), // Array of currently due requirements
  stripeConnectRequirementsEventuallyDue: jsonb("stripe_connect_requirements_eventually_due"), // Array of eventually due requirements
  stripeConnectRequirementsPastDue: jsonb("stripe_connect_requirements_past_due"), // Array of past due requirements
  stripeConnectAccountLink: varchar("stripe_connect_account_link"), // Generated account link for onboarding/verification
  stripeConnectAccountLinkExpires: timestamp("stripe_connect_account_link_expires"), // When account link expires
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
// Workspace subscriptions table
export const workspaceSubscriptions = pgTable("workspace_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  status: varchar("status").notNull(),
  trialEndDate: timestamp("trial_end_date"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Issues (Deals/Contacts) - GitHub-style issue tracking
export const issues = pgTable("issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  issueNumber: integer("issue_number").notNull(),
  title: varchar("title").notNull(),
  issueType: varchar("issue_type").notNull().default("deal"), // deal (customer) or rfp (vendor)
  rfpId: varchar("rfp_id").references(() => rfps.id),
  chatTitle: varchar("chat_title"), // Separate title for published chat
  description: text("description"),
  status: varchar("status").notNull().default("open"), // open, closed, won, lost
  contactName: varchar("contact_name"),
  contactEmail: varchar("contact_email"),
  contactCompany: varchar("contact_company"),
  dealValue: integer("deal_value"),
  labels: text("labels").array(),
  createdById: varchar("created_by_id").references(() => users.id),
  isPublished: boolean("is_published").default(false),
  publishedPasscode: varchar("published_passcode"),
  publishedSlug: varchar("published_slug").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Issue assignees (many-to-many)
export const issueAssignees = pgTable("issue_assignees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comments on issues
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").references(() => users.id),
  authorName: varchar("author_name"), // For external client comments
  authorEmail: varchar("author_email"), // For external client comments
  isClientComment: boolean("is_client_comment").default(false),
  content: text("content").notNull(),
  mentions: text("mentions").array(), // Array of user IDs mentioned
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Attachments for comments
export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commentId: varchar("comment_id").references(() => comments.id, { onDelete: "cascade" }),
  issueId: varchar("issue_id").references(() => issues.id, { onDelete: "cascade" }),
  fileName: varchar("file_name").notNull(),
  fileUrl: varchar("file_url").notNull(),
  fileType: varchar("file_type"),
  fileSize: integer("file_size"),
  uploadedById: varchar("uploaded_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Workspace invites
export const invites = pgTable("invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  email: varchar("email").notNull(),
  invitedById: varchar("invited_by_id").references(() => users.id),
  token: varchar("token").notNull().unique(),
  status: varchar("status").notNull().default("pending"), // pending, accepted, expired
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Labels for issues
export const labels = pgTable("labels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  name: varchar("name").notNull(),
  color: varchar("color").notNull(), // hex color
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity log for issues
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(), // created, commented, status_changed, assigned, mentioned
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});



// ==================== ACCOUNTS PAYABLE ====================

// Vendors/Suppliers (separate from Issue Contacts which are clients)
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  website: varchar("website"),
  address: text("address"),
  taxId: varchar("tax_id"),
  paymentTerms: varchar("payment_terms"), // net_30, net_60, etc.
  bankAccountInfo: jsonb("bank_account_info"), // Encrypted bank details
  stripeConnectAccountId: varchar("stripe_connect_account_id"),
  stripeTreasuryFinancialAccountId: varchar("stripe_treasury_financial_account_id"),
  stripePayoutsEnabled: boolean("stripe_payouts_enabled").default(false),
  stripeOnboardingStatus: varchar("stripe_onboarding_status"),
  isActive: boolean("is_active").default(true),
  rating: integer("rating"), // 1-5 stars
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase Orders
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  poNumber: varchar("po_number").notNull(),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  title: varchar("title").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("draft"), // draft, pending_approval, approved, sent, partially_received, completed, cancelled
  totalAmount: integer("total_amount").notNull().default(0), // in cents
  currency: varchar("currency").notNull().default("USD"),
  requestedDeliveryDate: timestamp("requested_delivery_date"),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase Order Line Items
export const poLineItems = pgTable("po_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  poId: varchar("po_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  description: varchar("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull().default(0), // in cents
  totalPrice: integer("total_price").notNull().default(0), // in cents
  category: varchar("category"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchase Invoices
export const purchaseInvoices = pgTable("purchase_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  invoiceNumber: varchar("invoice_number").notNull(),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  poId: varchar("po_id").references(() => purchaseOrders.id),
  title: varchar("title").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("pending"), // pending, approved, paid, overdue, cancelled
  totalAmount: integer("total_amount").notNull().default(0), // in cents
  taxAmount: integer("tax_amount").notNull().default(0), // in cents
  currency: varchar("currency").notNull().default("USD"),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  ocrData: jsonb("ocr_data"), // Extracted data from OCR processing
  receiptImageUrl: varchar("receipt_image_url"), // For OCR processing
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase Invoice Line Items
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => purchaseInvoices.id, { onDelete: "cascade" }),
  description: varchar("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull().default(0), // in cents
  totalPrice: integer("total_price").notNull().default(0), // in cents
  category: varchar("category"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Goods/Service Receipts
export const receipts = pgTable("receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  poId: varchar("po_id").references(() => purchaseOrders.id),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  receiptNumber: varchar("receipt_number").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, partial, complete, rejected
  receivedDate: timestamp("received_date").notNull(),
  receivedById: varchar("received_by_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Receipt Line Items
export const receiptLineItems = pgTable("receipt_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  receiptId: varchar("receipt_id").notNull().references(() => receipts.id, { onDelete: "cascade" }),
  poLineItemId: varchar("po_line_item_id").references(() => poLineItems.id),
  description: varchar("description").notNull(),
  quantityOrdered: integer("quantity_ordered").notNull().default(0),
  quantityReceived: integer("quantity_received").notNull().default(0),
  unitPrice: integer("unit_price").notNull().default(0), // in cents
  condition: varchar("condition"), // good, damaged, missing, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment Runs (batch processing)
export const paymentRuns = pgTable("payment_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  name: varchar("name").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("draft"), // draft, processing, completed, failed
  paymentMethod: varchar("payment_method").notNull(), // ach, check, wire
  totalAmount: integer("total_amount").notNull().default(0), // in cents
  batchReference: varchar("batch_reference"), // External batch reference
  scheduledDate: timestamp("scheduled_date"),
  executedDate: timestamp("executed_date"),
  executedById: varchar("executed_by_id").references(() => users.id),
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual Payments
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  paymentRunId: varchar("payment_run_id").references(() => paymentRuns.id),
  invoiceId: varchar("invoice_id").references(() => purchaseInvoices.id),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  amount: integer("amount").notNull(), // in cents
  currency: varchar("currency").notNull().default("USD"),
  method: varchar("method").notNull(), // ach, check, wire
  status: varchar("status").notNull().default("pending"), // pending, processing, completed, failed
  referenceNumber: varchar("reference_number"),
  externalTransactionId: varchar("external_transaction_id"), // Bank/Payment processor ID
  processedDate: timestamp("processed_date"),
  failureReason: text("failure_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==================== ACCOUNTS RECEIVABLE ====================

// Customers (linked to closed Issues or imported)
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  issueId: varchar("issue_id").references(() => issues.id), // Link to original Issue if converted
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  website: varchar("website"),
  address: text("address"),
  billingAddress: text("billing_address"),
  taxId: varchar("tax_id"),
  paymentTerms: varchar("payment_terms"), // net_30, net_60, etc.
  creditLimit: integer("credit_limit"), // in cents
  isActive: boolean("is_active").default(true),
  customerType: varchar("customer_type"), // individual, business, enterprise
  industry: varchar("industry"),
  notes: text("notes"),
  // Stripe Invoicing Connect Integration
  stripeCustomerId: varchar("stripe_customer_id"), // Stripe Customer ID for invoicing
  stripeConnectAccountId: varchar("stripe_connect_account_id"), // Which connected account owns this customer
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales Invoices
export const salesInvoices = pgTable("sales_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  invoiceNumber: varchar("invoice_number").notNull(),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  issueId: varchar("issue_id").references(() => issues.id), // Optional link to original Issue
  title: varchar("title").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("draft"), // draft, sent, paid, overdue, cancelled, refunded
  totalAmount: integer("total_amount").notNull().default(0), // in cents
  taxAmount: integer("tax_amount").notNull().default(0), // in cents
  currency: varchar("currency").notNull().default("USD"),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  sentDate: timestamp("sent_date"),
  isRecurring: boolean("is_recurring").default(false),
  recurringInvoiceId: varchar("recurring_invoice_id").references(() => recurringInvoices.id),
  // Stripe Invoicing Connect Integration
  stripeInvoiceId: varchar("stripe_invoice_id"), // Stripe Invoice ID - source of truth
  stripeConnectAccountId: varchar("stripe_connect_account_id"), // Which connected account owns this invoice
  stripeHostedInvoiceUrl: varchar("stripe_hosted_invoice_url"), // Stripe-hosted invoice page URL
  stripeInvoicePdf: varchar("stripe_invoice_pdf"), // PDF download URL
  stripePaymentStatus: varchar("stripe_payment_status"), // stripe payment status
  stripeAmountDue: integer("stripe_amount_due"), // current amount due in cents
  stripeAmountPaid: integer("stripe_amount_paid"), // amount paid in cents
  stripeApplicationFeeAmount: integer("stripe_application_fee_amount"), // platform fee in cents
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales Invoice Line Items
export const salesInvoiceLineItems = pgTable("sales_invoice_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => salesInvoices.id, { onDelete: "cascade" }),
  description: varchar("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull().default(0), // in cents
  totalPrice: integer("total_price").notNull().default(0), // in cents
  category: varchar("category"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Recurring Invoices (templates for automated billing)
export const recurringInvoices = pgTable("recurring_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  title: varchar("title").notNull(),
  description: text("description"),
  frequency: varchar("frequency").notNull(), // weekly, monthly, quarterly, yearly
  interval: integer("interval").notNull().default(1), // Every X weeks/months/etc
  totalAmount: integer("total_amount").notNull().default(0), // in cents
  currency: varchar("currency").notNull().default("USD"),
  nextInvoiceDate: timestamp("next_invoice_date"),
  lastInvoiceDate: timestamp("last_invoice_date"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  autoSend: boolean("auto_send").default(false),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Payments (received)
export const customerPayments = pgTable("customer_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  invoiceId: varchar("invoice_id").references(() => salesInvoices.id),
  amount: integer("amount").notNull(), // in cents
  currency: varchar("currency").notNull().default("USD"),
  method: varchar("method").notNull(), // credit_card, ach, check, wire, cash, other
  referenceNumber: varchar("reference_number"),
  externalTransactionId: varchar("external_transaction_id"),
  paymentDate: timestamp("payment_date").notNull(),
  notes: text("notes"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Payment Methods (for recurring billing)
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  type: varchar("type").notNull(), // credit_card, ach, bank_account
  displayName: varchar("display_name").notNull(), // "Visa ending in 1234"
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  provider: varchar("provider"), // stripe, paypal, etc.
  providerPaymentMethodId: varchar("provider_payment_method_id"),
  stripeConnectAccountId: varchar("stripe_connect_account_id"), // Which connected account owns this payment method
  expiresAt: timestamp("expires_at"),
  last4: varchar("last4"), // Last 4 digits for cards
  brand: varchar("brand"), // visa, mastercard, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==================== REQUEST FOR PROPOSALS (RFP) ====================

// RFPs
export const rfps = pgTable("rfps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  title: varchar("title").notNull(),
  about: text("about"), // Rich text/markdown content - About the project
  budget: text("budget"), // Budget information/range
  responsibilities: text("responsibilities"), // What the vendor will be responsible for
  process: text("process"), // Selection process and timeline
  companyName: varchar("company_name").notNull(),
  companyLogo: varchar("company_logo_url"),
  status: varchar("status").notNull().default("draft"), // draft, published, closed, archived
  deadline: timestamp("deadline"),
  publishedAt: timestamp("published_at"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Proposals submitted by vendors
export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rfpId: varchar("rfp_id").notNull().references(() => rfps.id, { onDelete: "cascade" }),
  // Vendor Information
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  company: varchar("company").notNull(),
  vendorLogoUrl: varchar("vendor_logo_url"),
  website: varchar("website"),
  teamSize: varchar("team_size").notNull(),
  certifications: text("certifications").array(), // Array of certification names
  hourlyRate: integer("hourly_rate").notNull(), // in cents
  capabilitiesStatementUrl: varchar("capabilities_statement_url"), // PDF file URL
  // Proposal Content
  coverLetter: text("cover_letter"),
  technicalApproach: text("technical_approach"),
  timeline: text("timeline"),
  budget: integer("budget"), // in cents
  status: varchar("status").notNull().default("submitted"), // submitted, under_review, accepted, rejected, withdrawn
  submittedAt: timestamp("submitted_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Proposal Issues - Links proposals to issues for communication
export const proposalIssues = pgTable("proposal_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proposalId: varchar("proposal_id").notNull().references(() => proposals.id, { onDelete: "cascade" }),
  issueId: varchar("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Unified conversation messages (internal issues, vendor chat, customer chat)
export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
    issueId: varchar("issue_id").references(() => issues.id, { onDelete: "cascade" }),
    rfpId: varchar("rfp_id").references(() => rfps.id, { onDelete: "cascade" }),
    vendorEmail: varchar("vendor_email"),
    contactEmail: varchar("contact_email"),
    parentMessageId: varchar("parent_message_id"),
    rootMessageId: varchar("root_message_id"),
    authorType: varchar("author_type").notNull(), // internal, vendor, contact
    authorId: varchar("author_id"),
    authorName: varchar("author_name"),
    authorEmail: varchar("author_email"),
    authorAvatarUrl: varchar("author_avatar_url"),
    authorCompany: varchar("author_company"),
    authorCompanyLogo: varchar("author_company_logo"),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("conversation_messages_issue_idx").on(table.issueId),
    index("conversation_messages_rfp_vendor_idx").on(table.rfpId, table.vendorEmail),
    index("conversation_messages_workspace_idx").on(table.workspaceId),
  ],
);

// ==================== PROCUREMENT ====================

// Purchase Requisitions
export const purchaseRequisitions = pgTable("purchase_requisitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  requisitionNumber: varchar("requisition_number").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  requestedById: varchar("requested_by_id").notNull().references(() => users.id),
  department: varchar("department"),
  urgency: varchar("urgency").notNull().default("normal"), // low, normal, high, urgent
  status: varchar("status").notNull().default("draft"), // draft, submitted, approved, rejected, converted_to_po
  totalEstimatedAmount: integer("total_estimated_amount").notNull().default(0), // in cents
  currency: varchar("currency").notNull().default("USD"),
  neededByDate: timestamp("needed_by_date"),
  approvedById: varchar("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Requisition Line Items
export const requisitionLineItems = pgTable("requisition_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requisitionId: varchar("requisition_id").notNull().references(() => purchaseRequisitions.id, { onDelete: "cascade" }),
  description: varchar("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  estimatedUnitPrice: integer("estimated_unit_price").notNull().default(0), // in cents
  estimatedTotalPrice: integer("estimated_total_price").notNull().default(0), // in cents
  category: varchar("category"),
  specifications: text("specifications"),
  suggestedVendor: varchar("suggested_vendor"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Supplier/Vendor Ratings
export const supplierRatings = pgTable("supplier_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  ratedById: varchar("rated_by_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5 stars
  qualityScore: integer("quality_score"), // 1-100
  deliveryScore: integer("delivery_score"), // 1-100
  serviceScore: integer("service_score"), // 1-100
  priceScore: integer("price_score"), // 1-100
  comments: text("comments"),
  transactionId: varchar("transaction_id"), // Link to PO, Invoice, or Receipt
  createdAt: timestamp("created_at").defaultNow(),
});

// Spend Categories
export const spendCategories = pgTable("spend_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  name: varchar("name").notNull(),
  description: text("description"),
  color: varchar("color"), // hex color for UI
  parentCategoryId: varchar("parent_category_id"), // Self-reference to allow hierarchical categories
  isActive: boolean("is_active").default(true),
  budgetAmount: integer("budget_amount"), // in cents, optional
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Spend Transactions (for analytics and reporting)
export const spendTransactions = pgTable("spend_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  type: varchar("type").notNull(), // purchase_order, invoice, payment, refund
  referenceId: varchar("reference_id").notNull(), // ID of the related record
  vendorId: varchar("vendor_id").references(() => vendors.id),
  customerId: varchar("customer_id").references(() => customers.id),
  amount: integer("amount").notNull(), // in cents (positive for payments out, negative for payments received)
  currency: varchar("currency").notNull().default("USD"),
  categoryId: varchar("category_id").references(() => spendCategories.id),
  transactionDate: timestamp("transaction_date").notNull(),
  description: text("description"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});


// ==================== MERCURY INTEGRATION ====================

// ==================== STRIPE CONNECT INTEGRATION ====================

// ==================== SCHEMA GENERATION ====================

// Core entity insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({ createdAt: true, updatedAt: true });
export const insertIssueSchema = createInsertSchema(issues).omit({ createdAt: true, updatedAt: true, id: true, issueNumber: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ createdAt: true, updatedAt: true, id: true });
export const insertAttachmentSchema = createInsertSchema(attachments).omit({ createdAt: true, id: true });
export const insertInviteSchema = createInsertSchema(invites).omit({ createdAt: true, id: true });
export const insertLabelSchema = createInsertSchema(labels).omit({ createdAt: true, id: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ createdAt: true, id: true });
export const insertIssueAssigneeSchema = createInsertSchema(issueAssignees).omit({ createdAt: true, id: true });
export const insertConversationMessageSchema = createInsertSchema(conversationMessages).omit({
  createdAt: true,
  updatedAt: true,
  id: true,
  rootMessageId: true,
});
export const insertWorkspaceSubscriptionSchema = createInsertSchema(workspaceSubscriptions).omit({ createdAt: true, updatedAt: true, id: true });

// Insert schemas for new tables
export const insertVendorSchema = createInsertSchema(vendors).omit({ createdAt: true, updatedAt: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ createdAt: true, updatedAt: true });
export const insertPoLineItemSchema = createInsertSchema(poLineItems).omit({ createdAt: true });
export const insertPurchaseInvoiceSchema = createInsertSchema(purchaseInvoices).omit({ createdAt: true, updatedAt: true });
export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({ createdAt: true });
export const insertReceiptSchema = createInsertSchema(receipts).omit({ createdAt: true, updatedAt: true });
export const insertReceiptLineItemSchema = createInsertSchema(receiptLineItems).omit({ createdAt: true });
export const insertPaymentRunSchema = createInsertSchema(paymentRuns).omit({ createdAt: true, updatedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ createdAt: true, updatedAt: true });

export const insertCustomerSchema = createInsertSchema(customers).omit({ createdAt: true, updatedAt: true });
export const insertSalesInvoiceSchema = createInsertSchema(salesInvoices).omit({ createdAt: true, updatedAt: true });
export const insertSalesInvoiceLineItemSchema = createInsertSchema(salesInvoiceLineItems).omit({ createdAt: true });
export const insertRecurringInvoiceSchema = createInsertSchema(recurringInvoices).omit({ createdAt: true, updatedAt: true });
export const insertCustomerPaymentSchema = createInsertSchema(customerPayments).omit({ createdAt: true, updatedAt: true });
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ createdAt: true, updatedAt: true });

export const insertPurchaseRequisitionSchema = createInsertSchema(purchaseRequisitions).omit({ createdAt: true, updatedAt: true });
export const insertRequisitionLineItemSchema = createInsertSchema(requisitionLineItems).omit({ createdAt: true });
export const insertSupplierRatingSchema = createInsertSchema(supplierRatings).omit({ createdAt: true });
export const insertSpendCategorySchema = createInsertSchema(spendCategories).omit({ createdAt: true, updatedAt: true });
export const insertSpendTransactionSchema = createInsertSchema(spendTransactions).omit({ createdAt: true });

// RFP Schemas
export const insertRfpSchema = createInsertSchema(rfps).omit({ createdAt: true, updatedAt: true });
export const insertProposalSchema = createInsertSchema(proposals).omit({ updatedAt: true });
export const insertProposalIssueSchema = createInsertSchema(proposalIssues).omit({ createdAt: true });


// ==================== TYPE DEFINITIONS ====================

// Core entity types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Issue = typeof issues.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Invite = typeof invites.$inferSelect;
export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Label = typeof labels.$inferSelect;
export type InsertLabel = z.infer<typeof insertLabelSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type IssueAssignee = typeof issueAssignees.$inferSelect;
export type InsertIssueAssignee = z.infer<typeof insertIssueAssigneeSchema>;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;
export type WorkspaceSubscription = typeof workspaceSubscriptions.$inferSelect;
export type InsertWorkspaceSubscription = z.infer<typeof insertWorkspaceSubscriptionSchema>;

// Extended types for frontend
export type IssueWithDetails = Issue & {
  assignees?: (User | null)[];
  createdBy?: User | null;
  comments?: CommentWithAuthor[];
  commentCount?: number;
};

export type CommentWithAuthor = Comment & {
  author?: User | null;
  attachments?: Attachment[];
};

// AP Types
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PoLineItem = typeof poLineItems.$inferSelect;
export type InsertPoLineItem = z.infer<typeof insertPoLineItemSchema>;
export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type InsertPurchaseInvoice = z.infer<typeof insertPurchaseInvoiceSchema>;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;
export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type ReceiptLineItem = typeof receiptLineItems.$inferSelect;
export type InsertReceiptLineItem = z.infer<typeof insertReceiptLineItemSchema>;
export type PaymentRun = typeof paymentRuns.$inferSelect;
export type InsertPaymentRun = z.infer<typeof insertPaymentRunSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// AR Types
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type InsertSalesInvoice = z.infer<typeof insertSalesInvoiceSchema>;
export type SalesInvoiceLineItem = typeof salesInvoiceLineItems.$inferSelect;
export type InsertSalesInvoiceLineItem = z.infer<typeof insertSalesInvoiceLineItemSchema>;
export type RecurringInvoice = typeof recurringInvoices.$inferSelect;
export type InsertRecurringInvoice = z.infer<typeof insertRecurringInvoiceSchema>;
export type CustomerPayment = typeof customerPayments.$inferSelect;
export type InsertCustomerPayment = z.infer<typeof insertCustomerPaymentSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

// Procurement Types
export type PurchaseRequisition = typeof purchaseRequisitions.$inferSelect;
export type InsertPurchaseRequisition = z.infer<typeof insertPurchaseRequisitionSchema>;
export type RequisitionLineItem = typeof requisitionLineItems.$inferSelect;
export type InsertRequisitionLineItem = z.infer<typeof insertRequisitionLineItemSchema>;
export type SupplierRating = typeof supplierRatings.$inferSelect;
export type InsertSupplierRating = z.infer<typeof insertSupplierRatingSchema>;
export type SpendCategory = typeof spendCategories.$inferSelect;
export type InsertSpendCategory = z.infer<typeof insertSpendCategorySchema>;
export type SpendTransaction = typeof spendTransactions.$inferSelect;
export type InsertSpendTransaction = z.infer<typeof insertSpendTransactionSchema>;

// ==================== EMAIL THREADS ====================

// Email threads for bidirectional email communication
export const emailThreads = pgTable("email_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id),
  issueId: varchar("issue_id").references(() => issues.id),
  subject: varchar("subject").notNull(),
  participants: text("participants").array(), // Array of email addresses
  status: varchar("status").notNull().default("active"), // active, archived
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email messages within threads
export const emailMessages = pgTable("email_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => emailThreads.id, { onDelete: "cascade" }),
  messageId: varchar("message_id"), // External message ID from email provider
  fromEmail: varchar("from_email").notNull(),
  toEmails: text("to_emails").array(), // Array of recipient emails
  ccEmails: text("cc_emails").array(), // Array of CC emails
  bccEmails: text("bcc_emails").array(), // Array of BCC emails
  subject: varchar("subject").notNull(),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  isFromUser: boolean("is_from_user").default(false), // Whether sent by internal user
  direction: varchar("direction").notNull(), // inbound, outbound
  status: varchar("status").notNull().default("received"), // received, sent, failed
  sentAt: timestamp("sent_at"),
  receivedAt: timestamp("received_at"),
  attachments: jsonb("attachments"), // Array of attachment objects
  metadata: jsonb("metadata"), // Additional email metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("email_messages_thread_idx").on(table.threadId),
  index("email_messages_message_id_idx").on(table.messageId),
  index("email_messages_received_at_idx").on(table.receivedAt),
]);

// Insert schemas for email tables
export const insertEmailThreadSchema = createInsertSchema(emailThreads).omit({ createdAt: true, updatedAt: true, id: true });
export const insertEmailMessageSchema = createInsertSchema(emailMessages).omit({ createdAt: true, updatedAt: true, id: true });

// RFP Types
export type Rfp = typeof rfps.$inferSelect;
export type InsertRfp = z.infer<typeof insertRfpSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type ProposalIssue = typeof proposalIssues.$inferSelect;
export type InsertProposalIssue = z.infer<typeof insertProposalIssueSchema>;

// Email Types
export type EmailThread = typeof emailThreads.$inferSelect;
export type InsertEmailThread = z.infer<typeof insertEmailThreadSchema>;
export type EmailMessage = typeof emailMessages.$inferSelect;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;