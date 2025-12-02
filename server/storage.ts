import {
  users,
  workspaces,
  workspaceSubscriptions,
  issues,
  issueAssignees,
  comments,
  attachments,
  invites,
  labels,
  activities,
  // AP entities
  vendors,
  purchaseOrders,
  poLineItems,
  purchaseInvoices,
  invoiceLineItems,
  receipts,
  receiptLineItems,
  paymentRuns,
  payments,
  // AR entities
  customers,
  salesInvoices,
  salesInvoiceLineItems,
  recurringInvoices,
  customerPayments,
  paymentMethods,
  // Procurement entities
  purchaseRequisitions,
  requisitionLineItems,
  supplierRatings,
  spendCategories,
  spendTransactions,
  type User,
  type UpsertUser,
  type Workspace,
  type InsertWorkspace,
  type WorkspaceSubscription,
  type InsertWorkspaceSubscription,
  type Issue,
  type InsertIssue,
  type Comment,
  type InsertComment,
  type Attachment,
  type InsertAttachment,
  type Invite,
  type InsertInvite,
  type Label,
  type InsertLabel,
  type Activity,
  type InsertActivity,
  type IssueAssignee,
  type InsertIssueAssignee,
  type IssueWithDetails,
  type CommentWithAuthor,
  // New types
  type Vendor,
  type InsertVendor,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type PoLineItem,
  type InsertPoLineItem,
  type PurchaseInvoice,
  type InsertPurchaseInvoice,
  type InvoiceLineItem,
  type Receipt,
  type InsertReceipt,
  type ReceiptLineItem,
  type PaymentRun,
  type InsertPaymentRun,
  type Payment,
  type InsertPayment,
  type Customer,
  type InsertCustomer,
  type SalesInvoice,
  type InsertSalesInvoice,
  type SalesInvoiceLineItem,
  type RecurringInvoice,
  type InsertRecurringInvoice,
  type CustomerPayment,
  type InsertCustomerPayment,
  type PaymentMethod,
  type InsertPaymentMethod,
  type PurchaseRequisition,
  type InsertPurchaseRequisition,
  type RequisitionLineItem,
  type SupplierRating,
  type SpendCategory,
  type SpendTransaction,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count as countFn } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByApiKey(apiKey: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getUsersByWorkspace(workspaceId: string): Promise<User[]>;

  // Workspace operations
  getWorkspace(id: string): Promise<Workspace | undefined>;
  getWorkspacesByStripeConnectAccountId(accountId: string): Promise<Workspace[]>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  updateWorkspace(id: string, data: Partial<Workspace>): Promise<Workspace | undefined>;

  // Issue operations
  getIssue(id: string): Promise<Issue | undefined>;
  getIssueWithDetails(id: string): Promise<IssueWithDetails | undefined>;
  getIssuesByWorkspace(workspaceId: string, status?: string): Promise<IssueWithDetails[]>;
  getIssueBySlug(slug: string): Promise<Issue | undefined>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(id: string, data: Partial<Issue>): Promise<Issue | undefined>;
  deleteIssue(id: string): Promise<void>;
  getNextIssueNumber(workspaceId: string): Promise<number>;

  // Comment operations
  getCommentsByIssue(issueId: string): Promise<CommentWithAuthor[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  // Invite operations
  getInvitesByWorkspace(workspaceId: string): Promise<Invite[]>;
  getInviteByToken(token: string): Promise<Invite | undefined>;
  createInvite(invite: InsertInvite): Promise<Invite>;
  updateInvite(id: string, data: Partial<Invite>): Promise<void>;
  deleteInvite(id: string): Promise<void>;

  // Activity operations
  createActivity(activity: InsertActivity): Promise<Activity>;
  getRecentActivities(workspaceId: string, limit?: number): Promise<any[]>;

  // Workspace subscriptions
  createWorkspaceSubscription(subscription: InsertWorkspaceSubscription): Promise<WorkspaceSubscription>;
  updateWorkspaceSubscription(stripeSubscriptionId: string, data: Partial<WorkspaceSubscription>): Promise<void>;



  // Dashboard stats
  getDashboardStats(workspaceId: string): Promise<{
    openIssues: number;
    closedIssues: number;
    totalValue: number;
    teamMembers: number;
  }>;

  // ==================== ACCOUNTS PAYABLE ====================
  
  // Vendor operations
  getVendorsByWorkspace(workspaceId: string): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, data: Partial<Vendor>): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<void>;

  // Purchase Order operations
  getPurchaseOrdersByWorkspace(workspaceId: string): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: string): Promise<void>;
  createPoLineItem(item: InsertPoLineItem): Promise<PoLineItem>;
  getPoLineItems(poId: string): Promise<PoLineItem[]>;

  // Purchase Invoice operations
  getPurchaseInvoicesByWorkspace(workspaceId: string): Promise<PurchaseInvoice[]>;
  getPurchaseInvoice(id: string): Promise<PurchaseInvoice | undefined>;
  createPurchaseInvoice(invoice: InsertPurchaseInvoice): Promise<PurchaseInvoice>;
  updatePurchaseInvoice(id: string, data: Partial<PurchaseInvoice>): Promise<PurchaseInvoice | undefined>;
  deletePurchaseInvoice(id: string): Promise<void>;
  createInvoiceLineItem(item: any): Promise<InvoiceLineItem>;
  getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]>;

  // Receipt operations
  getReceiptsByWorkspace(workspaceId: string): Promise<Receipt[]>;
  createReceipt(receipt: InsertReceipt): Promise<Receipt>;
  updateReceipt(id: string, data: Partial<Receipt>): Promise<Receipt | undefined>;
  createReceiptLineItem(item: any): Promise<ReceiptLineItem>;

  // Payment operations
  getPaymentRunsByWorkspace(workspaceId: string): Promise<PaymentRun[]>;
  createPaymentRun(run: InsertPaymentRun): Promise<PaymentRun>;
  updatePaymentRun(id: string, data: Partial<PaymentRun>): Promise<PaymentRun | undefined>;
  getPaymentsByWorkspace(workspaceId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, data: Partial<Payment>): Promise<Payment | undefined>;

  // ==================== ACCOUNTS RECEIVABLE ====================
  
  // Customer operations
  getCustomersByWorkspace(workspaceId: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<void>;
  convertIssueToCustomer(issueId: string): Promise<Customer | undefined>;

  // Sales Invoice operations
  getSalesInvoicesByWorkspace(workspaceId: string): Promise<SalesInvoice[]>;
  getSalesInvoice(id: string): Promise<SalesInvoice | undefined>;
  getSalesInvoiceWithDetails(id: string): Promise<(SalesInvoice & { workspace?: Workspace }) | undefined>;
  createSalesInvoice(invoice: InsertSalesInvoice): Promise<SalesInvoice>;
  updateSalesInvoice(id: string, data: Partial<SalesInvoice>): Promise<SalesInvoice | undefined>;
  deleteSalesInvoice(id: string): Promise<void>;
  createSalesInvoiceLineItem(item: any): Promise<SalesInvoiceLineItem>;
  getSalesInvoiceLineItems(invoiceId: string): Promise<SalesInvoiceLineItem[]>;
  deleteSalesInvoiceLineItems(invoiceId: string): Promise<void>;

  // Recurring Invoice operations
  getRecurringInvoicesByWorkspace(workspaceId: string): Promise<RecurringInvoice[]>;
  createRecurringInvoice(invoice: InsertRecurringInvoice): Promise<RecurringInvoice>;
  updateRecurringInvoice(id: string, data: Partial<RecurringInvoice>): Promise<RecurringInvoice | undefined>;

  // Customer Payment operations
  getCustomerPaymentsByWorkspace(workspaceId: string): Promise<CustomerPayment[]>;
  createCustomerPayment(payment: InsertCustomerPayment): Promise<CustomerPayment>;

  // Payment Method operations
  getPaymentMethodsByCustomer(customerId: string): Promise<PaymentMethod[]>;
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined>;

  // ==================== PROCUREMENT ====================
  
  // Purchase Requisition operations
  getPurchaseRequisitionsByWorkspace(workspaceId: string): Promise<PurchaseRequisition[]>;
  createPurchaseRequisition(requisition: InsertPurchaseRequisition): Promise<PurchaseRequisition>;
  updatePurchaseRequisition(id: string, data: Partial<PurchaseRequisition>): Promise<PurchaseRequisition | undefined>;
  createRequisitionLineItem(item: any): Promise<RequisitionLineItem>;
  getRequisitionLineItems(requisitionId: string): Promise<RequisitionLineItem[]>;

  // Supplier Rating operations
  getSupplierRatingsByVendor(vendorId: string): Promise<SupplierRating[]>;
  createSupplierRating(rating: any): Promise<SupplierRating>;

  // Spend Category operations
  getSpendCategoriesByWorkspace(workspaceId: string): Promise<SpendCategory[]>;
  createSpendCategory(category: any): Promise<SpendCategory>;
  updateSpendCategory(id: string, data: Partial<SpendCategory>): Promise<SpendCategory | undefined>;

  // Spend Transaction operations
  getSpendTransactionsByWorkspace(workspaceId: string): Promise<SpendTransaction[]>;
  createSpendTransaction(transaction: any): Promise<SpendTransaction>;

  // ==================== MERCURY INTEGRATION ====================
  // TODO: Implement when Mercury integration is ready
  // createMercurySyncLog(log: any): Promise<MercurySyncLog>;
  // updateMercurySyncStatus(entityId: string, status: string, error?: string): Promise<void>;
  // getMercurySyncLogs(workspaceId: string): Promise<MercurySyncLog[]>;


}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByApiKey(apiKey: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.apiKey, apiKey));
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          id: userData.id, // Update the ID to match Stytch user ID
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUsersByWorkspace(workspaceId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.workspaceId, workspaceId));
  }

  // Workspace operations
  async getWorkspace(id: string): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace;
  }

  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    const [created] = await db.insert(workspaces).values(workspace).returning();
    return created;
  }

  async getWorkspacesByStripeConnectAccountId(accountId: string): Promise<Workspace[]> {
    return await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.stripeConnectAccountId, accountId));
  }

  async updateWorkspace(id: string, data: Partial<Workspace>): Promise<Workspace | undefined> {
    const [workspace] = await db
      .update(workspaces)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();
    return workspace;
  }

  // Workspace subscription operations
  async createWorkspaceSubscription(subscription: InsertWorkspaceSubscription): Promise<WorkspaceSubscription> {
    const [created] = await db.insert(workspaceSubscriptions).values(subscription).returning();
    return created;
  }

  async updateWorkspaceSubscription(stripeSubscriptionId: string, data: Partial<WorkspaceSubscription>): Promise<void> {
    await db
      .update(workspaceSubscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workspaceSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
  }

  // Issue operations
  async getIssue(id: string): Promise<Issue | undefined> {
    const [issue] = await db.select().from(issues).where(eq(issues.id, id));
    return issue;
  }

  async getIssueWithDetails(id: string): Promise<IssueWithDetails | undefined> {
    const [issue] = await db.select().from(issues).where(eq(issues.id, id));
    if (!issue) return undefined;

    const assigneeRows = await db
      .select({ user: users })
      .from(issueAssignees)
      .innerJoin(users, eq(issueAssignees.userId, users.id))
      .where(eq(issueAssignees.issueId, id));

    const createdByUser = issue.createdById
      ? await this.getUser(issue.createdById)
      : null;


    const commentsWithAuthors = await this.getCommentsByIssue(id);

    const [commentCount] = await db
      .select({ count: countFn() })
      .from(comments)
      .where(eq(comments.issueId, id));

    return {
      ...issue,
      assignees: assigneeRows.map((r) => r.user),
      createdBy: createdByUser,
      comments: commentsWithAuthors,
      commentCount: commentCount?.count || 0,
    };
  }

  async getIssuesByWorkspace(workspaceId: string, status?: string): Promise<IssueWithDetails[]> {
    let query = db.select().from(issues).where(eq(issues.workspaceId, workspaceId));
    
    const issueList = status
      ? await db.select().from(issues).where(and(eq(issues.workspaceId, workspaceId), eq(issues.status, status))).orderBy(desc(issues.createdAt))
      : await db.select().from(issues).where(eq(issues.workspaceId, workspaceId)).orderBy(desc(issues.createdAt));

    const results: IssueWithDetails[] = [];
    
    for (const issue of issueList) {
      const assigneeRows = await db
        .select({ user: users })
        .from(issueAssignees)
        .innerJoin(users, eq(issueAssignees.userId, users.id))
        .where(eq(issueAssignees.issueId, issue.id));

      const createdByUser = issue.createdById
        ? await this.getUser(issue.createdById)
        : null;

      const [commentCount] = await db
        .select({ count: countFn() })
        .from(comments)
        .where(eq(comments.issueId, issue.id));

      results.push({
        ...issue,
        assignees: assigneeRows.map((r) => r.user),
        createdBy: createdByUser,
        commentCount: commentCount?.count || 0,
      });
    }

    return results;
  }

  async getIssueBySlug(slug: string): Promise<Issue | undefined> {
    const [issue] = await db.select().from(issues).where(eq(issues.publishedSlug, slug));
    return issue;
  }

  async createIssue(issue: InsertIssue): Promise<Issue> {
    const issueNumber = await this.getNextIssueNumber(issue.workspaceId);
    const [created] = await db
      .insert(issues)
      .values({ ...issue, issueNumber })
      .returning();
    return created;
  }

  async updateIssue(id: string, data: Partial<Issue>): Promise<Issue | undefined> {
    const [issue] = await db
      .update(issues)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(issues.id, id))
      .returning();
    return issue;
  }

  async deleteIssue(id: string): Promise<void> {
    await db.delete(issues).where(eq(issues.id, id));
  }

  async getNextIssueNumber(workspaceId: string): Promise<number> {
    const [result] = await db
      .select({ maxNumber: sql<number>`COALESCE(MAX(${issues.issueNumber}), 0)` })
      .from(issues)
      .where(eq(issues.workspaceId, workspaceId));
    return (result?.maxNumber || 0) + 1;
  }

  // Comment operations
  async getCommentsByIssue(issueId: string): Promise<CommentWithAuthor[]> {
    const commentList = await db
      .select()
      .from(comments)
      .where(eq(comments.issueId, issueId))
      .orderBy(comments.createdAt);

    const results: CommentWithAuthor[] = [];
    
    for (const comment of commentList) {
      const author = comment.authorId
        ? await this.getUser(comment.authorId)
        : null;

      const commentAttachments = await db
        .select()
        .from(attachments)
        .where(eq(attachments.commentId, comment.id));

      results.push({
        ...comment,
        author,
        attachments: commentAttachments,
      });
    }

    return results;
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [created] = await db.insert(comments).values(comment).returning();
    return created;
  }

  // Invite operations
  async getInvitesByWorkspace(workspaceId: string): Promise<Invite[]> {
    return await db
      .select()
      .from(invites)
      .where(and(eq(invites.workspaceId, workspaceId), eq(invites.status, "pending")))
      .orderBy(desc(invites.createdAt));
  }

  async getInviteByToken(token: string): Promise<Invite | undefined> {
    const [invite] = await db.select().from(invites).where(eq(invites.token, token));
    return invite;
  }

  async createInvite(invite: InsertInvite): Promise<Invite> {
    const [created] = await db.insert(invites).values(invite).returning();
    return created;
  }

  async updateInvite(id: string, data: Partial<Invite>): Promise<void> {
    await db.update(invites).set(data).where(eq(invites.id, id));
  }

  async deleteInvite(id: string): Promise<void> {
    await db.delete(invites).where(eq(invites.id, id));
  }

  // Activity operations
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [created] = await db.insert(activities).values(activity).returning();
    return created;
  }

  async getRecentActivities(workspaceId: string, limit: number = 10): Promise<any[]> {
    const recentActivities = await db
      .select({
        activity: activities,
        user: users,
        issue: issues,
      })
      .from(activities)
      .innerJoin(issues, eq(activities.issueId, issues.id))
      .leftJoin(users, eq(activities.userId, users.id))
      .where(eq(issues.workspaceId, workspaceId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    return recentActivities.map((r) => ({
      id: r.activity.id,
      action: r.activity.action,
      issueTitle: r.issue.title,
      issueId: r.issue.id,
      userName: r.user ? `${r.user.firstName || ""} ${r.user.lastName || ""}`.trim() : "Unknown",
      userImage: r.user?.profileImageUrl,
      createdAt: r.activity.createdAt,
    }));
  }



  // Dashboard stats
  async getDashboardStats(workspaceId: string): Promise<{
    openIssues: number;
    closedIssues: number;
    totalValue: number;
    teamMembers: number;
  }> {
    const [openCount] = await db
      .select({ count: countFn() })
      .from(issues)
      .where(and(eq(issues.workspaceId, workspaceId), eq(issues.status, "open")));

    const [closedCount] = await db
      .select({ count: countFn() })
      .from(issues)
      .where(
        and(
          eq(issues.workspaceId, workspaceId),
          sql`${issues.status} != 'open'`
        )
      );

    const [valueSum] = await db
      .select({ total: sql<number>`COALESCE(SUM(${issues.dealValue}), 0)` })
      .from(issues)
      .where(eq(issues.workspaceId, workspaceId));

    const [memberCount] = await db
      .select({ count: countFn() })
      .from(users)
      .where(eq(users.workspaceId, workspaceId));

    return {
      openIssues: Number(openCount?.count) || 0,
      closedIssues: Number(closedCount?.count) || 0,
      totalValue: Number(valueSum?.total) || 0,
      teamMembers: Number(memberCount?.count) || 0,
    };
  }

  // ==================== ACCOUNTS PAYABLE ====================
  
  // Vendor operations
  async getVendorsByWorkspace(workspaceId: string): Promise<Vendor[]> {
    return await db
      .select()
      .from(vendors)
      .where(eq(vendors.workspaceId, workspaceId))
      .orderBy(desc(vendors.createdAt));
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [created] = await db.insert(vendors).values(vendor).returning();
    return created;
  }

  async updateVendor(id: string, data: Partial<Vendor>): Promise<Vendor | undefined> {
    const [vendor] = await db
      .update(vendors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    return vendor;
  }

  async deleteVendor(id: string): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
  }

  // Purchase Order operations
  async getPurchaseOrdersByWorkspace(workspaceId: string): Promise<PurchaseOrder[]> {
    return await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.workspaceId, workspaceId))
      .orderBy(desc(purchaseOrders.createdAt));
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
    const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return order;
  }

  async createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder> {
    // Convert date strings to Date objects for timestamp fields
    const processedOrder = {
      ...order,
      requestedDeliveryDate: order.requestedDeliveryDate ? (order.requestedDeliveryDate instanceof Date ? order.requestedDeliveryDate : new Date(order.requestedDeliveryDate)) : null,
      approvedAt: order.approvedAt ? (order.approvedAt instanceof Date ? order.approvedAt : new Date(order.approvedAt)) : null,
    };

    const [created] = await db.insert(purchaseOrders).values(processedOrder).returning();
    return created;
  }

  async updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const [order] = await db
      .update(purchaseOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning();
    return order;
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  }

  async createPoLineItem(item: InsertPoLineItem): Promise<PoLineItem> {
    const [created] = await db.insert(poLineItems).values(item).returning();
    return created;
  }

  async getPoLineItems(poId: string): Promise<PoLineItem[]> {
    return await db
      .select()
      .from(poLineItems)
      .where(eq(poLineItems.poId, poId))
      .orderBy(poLineItems.createdAt);
  }

  // Purchase Invoice operations
  async getPurchaseInvoicesByWorkspace(workspaceId: string): Promise<PurchaseInvoice[]> {
    return await db
      .select()
      .from(purchaseInvoices)
      .where(eq(purchaseInvoices.workspaceId, workspaceId))
      .orderBy(desc(purchaseInvoices.createdAt));
  }

  async getPurchaseInvoice(id: string): Promise<PurchaseInvoice | undefined> {
    const [invoice] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id));
    return invoice;
  }

  async createPurchaseInvoice(invoice: InsertPurchaseInvoice): Promise<PurchaseInvoice> {
    // Convert date strings to Date objects for timestamp fields
    const processedInvoice = {
      ...invoice,
      invoiceDate: invoice.invoiceDate instanceof Date ? invoice.invoiceDate : new Date(invoice.invoiceDate),
      dueDate: invoice.dueDate ? (invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate)) : null,
      paidDate: invoice.paidDate ? (invoice.paidDate instanceof Date ? invoice.paidDate : new Date(invoice.paidDate)) : null,
      approvedAt: invoice.approvedAt ? (invoice.approvedAt instanceof Date ? invoice.approvedAt : new Date(invoice.approvedAt)) : null,
    };

    const [created] = await db.insert(purchaseInvoices).values(processedInvoice).returning();
    return created;
  }

  async updatePurchaseInvoice(id: string, data: Partial<PurchaseInvoice>): Promise<PurchaseInvoice | undefined> {
    const [invoice] = await db
      .update(purchaseInvoices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(purchaseInvoices.id, id))
      .returning();
    return invoice;
  }

  async deletePurchaseInvoice(id: string): Promise<void> {
    await db.delete(purchaseInvoices).where(eq(purchaseInvoices.id, id));
  }

  async createInvoiceLineItem(item: any): Promise<InvoiceLineItem> {
    const [created] = await db.insert(invoiceLineItems).values(item).returning();
    return created;
  }

  async getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    return await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId))
      .orderBy(invoiceLineItems.createdAt);
  }

  // Receipt operations
  async getReceiptsByWorkspace(workspaceId: string): Promise<Receipt[]> {
    return await db
      .select()
      .from(receipts)
      .where(eq(receipts.workspaceId, workspaceId))
      .orderBy(desc(receipts.createdAt));
  }

  async createReceipt(receipt: InsertReceipt): Promise<Receipt> {
    // Convert date strings to Date objects for timestamp fields
    const processedReceipt = {
      ...receipt,
      receivedDate: receipt.receivedDate instanceof Date ? receipt.receivedDate : new Date(receipt.receivedDate),
    };

    const [created] = await db.insert(receipts).values(processedReceipt).returning();
    return created;
  }

  async updateReceipt(id: string, data: Partial<Receipt>): Promise<Receipt | undefined> {
    const [receipt] = await db
      .update(receipts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(receipts.id, id))
      .returning();
    return receipt;
  }

  async createReceiptLineItem(item: any): Promise<ReceiptLineItem> {
    const [created] = await db.insert(receiptLineItems).values(item).returning();
    return created;
  }

  // Payment operations
  async getPaymentRunsByWorkspace(workspaceId: string): Promise<PaymentRun[]> {
    return await db
      .select()
      .from(paymentRuns)
      .where(eq(paymentRuns.workspaceId, workspaceId))
      .orderBy(desc(paymentRuns.createdAt));
  }

  async createPaymentRun(run: InsertPaymentRun): Promise<PaymentRun> {
    // Convert date strings to Date objects for timestamp fields
    const processedRun = {
      ...run,
      scheduledDate: run.scheduledDate ? (run.scheduledDate instanceof Date ? run.scheduledDate : new Date(run.scheduledDate)) : null,
      executedDate: run.executedDate ? (run.executedDate instanceof Date ? run.executedDate : new Date(run.executedDate)) : null,
    };

    const [created] = await db.insert(paymentRuns).values(processedRun).returning();
    return created;
  }

  async updatePaymentRun(id: string, data: Partial<PaymentRun>): Promise<PaymentRun | undefined> {
    const [run] = await db
      .update(paymentRuns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentRuns.id, id))
      .returning();
    return run;
  }

  async getPaymentsByWorkspace(workspaceId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.workspaceId, workspaceId))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    // Convert date strings to Date objects for timestamp fields
    const processedPayment = {
      ...payment,
      processedDate: payment.processedDate ? (payment.processedDate instanceof Date ? payment.processedDate : new Date(payment.processedDate)) : null,
    };

    const [created] = await db.insert(payments).values(processedPayment).returning();
    return created;
  }

  async updatePayment(id: string, data: Partial<Payment>): Promise<Payment | undefined> {
    const [payment] = await db
      .update(payments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  // ==================== ACCOUNTS RECEIVABLE ====================
  
  // Customer operations
  async getCustomersByWorkspace(workspaceId: string): Promise<Customer[]> {
    return await db
      .select()
      .from(customers)
      .where(eq(customers.workspaceId, workspaceId))
      .orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  async convertIssueToCustomer(issueId: string): Promise<Customer | undefined> {
    const issue = await this.getIssue(issueId);
    if (!issue || !issue.workspaceId || issue.status !== 'closed') {
      return undefined;
    }

    // Check if customer already exists
    const existingCustomers = await this.getCustomersByWorkspace(issue.workspaceId);
    const existingCustomer = existingCustomers.find(c => c.email === issue.contactEmail);
    
    if (existingCustomer) {
      return existingCustomer;
    }

    // Create new customer from issue
    const newCustomer = await this.createCustomer({
      workspaceId: issue.workspaceId,
      issueId: issue.id,
      name: issue.contactName || issue.contactCompany || 'Unknown',
      email: issue.contactEmail || '',
      phone: null,
      address: null,
      billingAddress: null,
      taxId: null,
      paymentTerms: null,
      creditLimit: null,
      isActive: true,
      customerType: 'business',
      industry: null,
      notes: null,
      createdById: issue.createdById,
    });

    return newCustomer;
  }

  // Sales Invoice operations
  async getSalesInvoicesByWorkspace(workspaceId: string): Promise<SalesInvoice[]> {
    return await db
      .select()
      .from(salesInvoices)
      .where(eq(salesInvoices.workspaceId, workspaceId))
      .orderBy(desc(salesInvoices.createdAt));
  }

  async getSalesInvoice(id: string): Promise<SalesInvoice | undefined> {
    const [invoice] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, id));
    return invoice;
  }

  async getSalesInvoiceWithDetails(id: string): Promise<(SalesInvoice & { workspace?: Workspace; customer?: Customer }) | undefined> {
    const [invoice] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, id));
    if (!invoice) return undefined;

    // Fetch workspace information
    const workspace = invoice.workspaceId ? await this.getWorkspace(invoice.workspaceId) : null;

    // Fetch customer information
    const customer = invoice.customerId ? await this.getCustomer(invoice.customerId) : null;

    return {
      ...invoice,
      workspace: workspace || undefined,
      customer: customer || undefined,
    };
  }

  async createSalesInvoice(invoice: InsertSalesInvoice): Promise<SalesInvoice> {
    // Convert date strings to Date objects for timestamp fields
    const processedInvoice = {
      ...invoice,
      invoiceDate: invoice.invoiceDate instanceof Date ? invoice.invoiceDate : new Date(invoice.invoiceDate),
      dueDate: invoice.dueDate ? (invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate)) : null,
      paidDate: invoice.paidDate ? (invoice.paidDate instanceof Date ? invoice.paidDate : new Date(invoice.paidDate)) : null,
      sentDate: invoice.sentDate ? (invoice.sentDate instanceof Date ? invoice.sentDate : new Date(invoice.sentDate)) : null,
    };

    const [created] = await db.insert(salesInvoices).values(processedInvoice).returning();
    return created;
  }

  async updateSalesInvoice(id: string, data: Partial<SalesInvoice>): Promise<SalesInvoice | undefined> {
    const [invoice] = await db
      .update(salesInvoices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(salesInvoices.id, id))
      .returning();
    return invoice;
  }

  async deleteSalesInvoice(id: string): Promise<void> {
    await db.delete(salesInvoices).where(eq(salesInvoices.id, id));
  }

  async createSalesInvoiceLineItem(item: any): Promise<SalesInvoiceLineItem> {
    const [created] = await db.insert(salesInvoiceLineItems).values(item).returning();
    return created;
  }

  async getSalesInvoiceLineItems(invoiceId: string): Promise<SalesInvoiceLineItem[]> {
    return await db
      .select()
      .from(salesInvoiceLineItems)
      .where(eq(salesInvoiceLineItems.invoiceId, invoiceId))
      .orderBy(salesInvoiceLineItems.createdAt);
  }

  async deleteSalesInvoiceLineItems(invoiceId: string): Promise<void> {
    await db.delete(salesInvoiceLineItems).where(eq(salesInvoiceLineItems.invoiceId, invoiceId));
  }

  // Recurring Invoice operations
  async getRecurringInvoicesByWorkspace(workspaceId: string): Promise<RecurringInvoice[]> {
    return await db
      .select()
      .from(recurringInvoices)
      .where(eq(recurringInvoices.workspaceId, workspaceId))
      .orderBy(desc(recurringInvoices.createdAt));
  }

  async createRecurringInvoice(invoice: InsertRecurringInvoice): Promise<RecurringInvoice> {
    // Convert date strings to Date objects for timestamp fields
    const processedInvoice = {
      ...invoice,
      nextInvoiceDate: invoice.nextInvoiceDate ? (invoice.nextInvoiceDate instanceof Date ? invoice.nextInvoiceDate : new Date(invoice.nextInvoiceDate)) : null,
      lastInvoiceDate: invoice.lastInvoiceDate ? (invoice.lastInvoiceDate instanceof Date ? invoice.lastInvoiceDate : new Date(invoice.lastInvoiceDate)) : null,
      startDate: invoice.startDate instanceof Date ? invoice.startDate : new Date(invoice.startDate),
      endDate: invoice.endDate ? (invoice.endDate instanceof Date ? invoice.endDate : new Date(invoice.endDate)) : null,
    };

    const [created] = await db.insert(recurringInvoices).values(processedInvoice).returning();
    return created;
  }

  async updateRecurringInvoice(id: string, data: Partial<RecurringInvoice>): Promise<RecurringInvoice | undefined> {
    const [invoice] = await db
      .update(recurringInvoices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(recurringInvoices.id, id))
      .returning();
    return invoice;
  }

  // Customer Payment operations
  async getCustomerPaymentsByWorkspace(workspaceId: string): Promise<CustomerPayment[]> {
    return await db
      .select()
      .from(customerPayments)
      .where(eq(customerPayments.workspaceId, workspaceId))
      .orderBy(desc(customerPayments.createdAt));
  }

  async createCustomerPayment(payment: InsertCustomerPayment): Promise<CustomerPayment> {
    // Convert date strings to Date objects for timestamp fields
    const processedPayment = {
      ...payment,
      paymentDate: payment.paymentDate instanceof Date ? payment.paymentDate : new Date(payment.paymentDate),
    };

    const [created] = await db.insert(customerPayments).values(processedPayment).returning();
    return created;
  }

  // Payment Method operations
  async getPaymentMethodsByCustomer(customerId: string): Promise<PaymentMethod[]> {
    return await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.customerId, customerId))
      .orderBy(desc(paymentMethods.createdAt));
  }

  async createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod> {
    // Convert date strings to Date objects for timestamp fields
    const processedMethod = {
      ...method,
      expiresAt: method.expiresAt ? (method.expiresAt instanceof Date ? method.expiresAt : new Date(method.expiresAt)) : null,
    };

    const [created] = await db.insert(paymentMethods).values(processedMethod).returning();
    return created;
  }

  async updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    const [method] = await db
      .update(paymentMethods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id))
      .returning();
    return method;
  }

  // ==================== PROCUREMENT ====================
  
  // Purchase Requisition operations
  async getPurchaseRequisitionsByWorkspace(workspaceId: string): Promise<PurchaseRequisition[]> {
    return await db
      .select()
      .from(purchaseRequisitions)
      .where(eq(purchaseRequisitions.workspaceId, workspaceId))
      .orderBy(desc(purchaseRequisitions.createdAt));
  }

  async createPurchaseRequisition(requisition: InsertPurchaseRequisition): Promise<PurchaseRequisition> {
    // Convert date strings to Date objects for timestamp fields
    const processedRequisition = {
      ...requisition,
      neededByDate: requisition.neededByDate ? (requisition.neededByDate instanceof Date ? requisition.neededByDate : new Date(requisition.neededByDate)) : null,
      approvedAt: requisition.approvedAt ? (requisition.approvedAt instanceof Date ? requisition.approvedAt : new Date(requisition.approvedAt)) : null,
    };

    const [created] = await db.insert(purchaseRequisitions).values(processedRequisition).returning();
    return created;
  }

  async updatePurchaseRequisition(id: string, data: Partial<PurchaseRequisition>): Promise<PurchaseRequisition | undefined> {
    const [requisition] = await db
      .update(purchaseRequisitions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(purchaseRequisitions.id, id))
      .returning();
    return requisition;
  }

  async createRequisitionLineItem(item: any): Promise<RequisitionLineItem> {
    const [created] = await db.insert(requisitionLineItems).values(item).returning();
    return created;
  }

  async getRequisitionLineItems(requisitionId: string): Promise<RequisitionLineItem[]> {
    return await db
      .select()
      .from(requisitionLineItems)
      .where(eq(requisitionLineItems.requisitionId, requisitionId))
      .orderBy(requisitionLineItems.createdAt);
  }

  // Supplier Rating operations
  async getSupplierRatingsByVendor(vendorId: string): Promise<SupplierRating[]> {
    return await db
      .select()
      .from(supplierRatings)
      .where(eq(supplierRatings.vendorId, vendorId))
      .orderBy(desc(supplierRatings.createdAt));
  }

  async createSupplierRating(rating: any): Promise<SupplierRating> {
    const [created] = await db.insert(supplierRatings).values(rating).returning();
    return created;
  }

  // Spend Category operations
  async getSpendCategoriesByWorkspace(workspaceId: string): Promise<SpendCategory[]> {
    return await db
      .select()
      .from(spendCategories)
      .where(eq(spendCategories.workspaceId, workspaceId))
      .orderBy(spendCategories.name);
  }

  async createSpendCategory(category: any): Promise<SpendCategory> {
    const [created] = await db.insert(spendCategories).values(category).returning();
    return created;
  }

  async updateSpendCategory(id: string, data: Partial<SpendCategory>): Promise<SpendCategory | undefined> {
    const [category] = await db
      .update(spendCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(spendCategories.id, id))
      .returning();
    return category;
  }

  // Spend Transaction operations
  async getSpendTransactionsByWorkspace(workspaceId: string): Promise<SpendTransaction[]> {
    return await db
      .select()
      .from(spendTransactions)
      .where(eq(spendTransactions.workspaceId, workspaceId))
      .orderBy(desc(spendTransactions.createdAt));
  }

  async createSpendTransaction(transaction: any): Promise<SpendTransaction> {
    // Convert date strings to Date objects for timestamp fields
    const processedTransaction = {
      ...transaction,
      transactionDate: transaction.transactionDate instanceof Date ? transaction.transactionDate : new Date(transaction.transactionDate),
    };

    const [created] = await db.insert(spendTransactions).values(processedTransaction).returning();
    return created;
  }

  // ==================== MERCURY INTEGRATION ====================
  
  // Mercury Sync operations - TODO: Implement when Mercury integration is ready
  // async createMercurySyncLog(log: any): Promise<MercurySyncLog> {
  //   const [created] = await db.insert(mercurySyncLogs).values(log).returning();
  //   return created;
  // }

  // async updateMercurySyncStatus(entityId: string, status: string, error?: string): Promise<void> {
  //   // This would typically update the mercurySyncStatus on the relevant entity
  //   // Implementation would depend on the entity type
  //   console.log(`Updating Mercury sync status for entity ${entityId} to ${status}`, error ? `Error: ${error}` : '');
  // }

  // async getMercurySyncLogs(workspaceId: string): Promise<MercurySyncLog[]> {
  //   return await db
  //     .select()
  //     .from(mercurySyncLogs)
  //     .where(eq(mercurySyncLogs.workspaceId, workspaceId))
  //     .orderBy(desc(mercurySyncLogs.createdAt));
  // }
}

export const storage = new DatabaseStorage();

