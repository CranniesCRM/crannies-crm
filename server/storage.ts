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
  analyticsIdentities,
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
  type AnalyticsIdentity,
  type InsertAnalyticsIdentity,
  type IssueWithDetails,
  type CommentWithAuthor,
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

  // Analytics identities
  getAnalyticsIdentitiesByIssue(issueId: string): Promise<AnalyticsIdentity[]>;
  createAnalyticsIdentity(identity: InsertAnalyticsIdentity): Promise<AnalyticsIdentity>;
  updateAnalyticsIdentity(id: string, data: Partial<AnalyticsIdentity>): Promise<AnalyticsIdentity | undefined>;
  findAnalyticsIdentityByEmail(email: string): Promise<AnalyticsIdentity | undefined>;

  // Dashboard stats
  getDashboardStats(workspaceId: string): Promise<{
    openIssues: number;
    closedIssues: number;
    totalValue: number;
    teamMembers: number;
  }>;
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

  // Analytics identities
  async getAnalyticsIdentitiesByIssue(issueId: string): Promise<AnalyticsIdentity[]> {
    return await db.select().from(analyticsIdentities).where(eq(analyticsIdentities.issueId, issueId));
  }

  async createAnalyticsIdentity(identity: InsertAnalyticsIdentity): Promise<AnalyticsIdentity> {
    const [created] = await db.insert(analyticsIdentities).values(identity).returning();
    return created;
  }

  async updateAnalyticsIdentity(id: string, data: Partial<AnalyticsIdentity>): Promise<AnalyticsIdentity | undefined> {
    const [updated] = await db
      .update(analyticsIdentities)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(analyticsIdentities.id, id))
      .returning();
    return updated;
  }

  async findAnalyticsIdentityByEmail(email: string): Promise<AnalyticsIdentity | undefined> {
    const [identity] = await db.select().from(analyticsIdentities).where(eq(analyticsIdentities.contactEmail, email));
    return identity;
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
}

export const storage = new DatabaseStorage();
