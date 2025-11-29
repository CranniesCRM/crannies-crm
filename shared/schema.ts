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

// Analytics identities for tracking users across sessions
export const analyticsIdentities = pgTable("analytics_identities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueId: varchar("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  anonymousId: varchar("anonymous_id"), // Segment anonymous ID
  userId: varchar("user_id"), // Segment user ID
  contactEmail: varchar("contact_email"), // Associated contact email
  traits: jsonb("traits"), // Additional user traits
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schema types and insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({ createdAt: true, updatedAt: true });
export const insertIssueSchema = createInsertSchema(issues).omit({ createdAt: true, updatedAt: true, id: true, issueNumber: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ createdAt: true, updatedAt: true, id: true });
export const insertAttachmentSchema = createInsertSchema(attachments).omit({ createdAt: true, id: true });
export const insertInviteSchema = createInsertSchema(invites).omit({ createdAt: true, id: true });
export const insertLabelSchema = createInsertSchema(labels).omit({ createdAt: true, id: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ createdAt: true, id: true });
export const insertIssueAssigneeSchema = createInsertSchema(issueAssignees).omit({ createdAt: true, id: true });
export const insertAnalyticsIdentitySchema = createInsertSchema(analyticsIdentities).omit({ createdAt: true, updatedAt: true, id: true });
export const insertWorkspaceSubscriptionSchema = createInsertSchema(workspaceSubscriptions).omit({ createdAt: true, updatedAt: true, id: true });

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

export type AnalyticsIdentity = typeof analyticsIdentities.$inferSelect;
export type InsertAnalyticsIdentity = z.infer<typeof insertAnalyticsIdentitySchema>;

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
