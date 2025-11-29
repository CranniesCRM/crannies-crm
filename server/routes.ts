import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./stytchAuth";
import { sendChatInvitation, sendTeamInvitation } from "./resend";
import { randomBytes } from "crypto";
import { z } from "zod";
import { calculateTrialEndDate } from "../shared/trial";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Helper to generate random tokens
function generateToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

function generatePasscode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

function generateSlug(): string {
  return randomBytes(8).toString("hex");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Onboarding
  app.post("/api/onboarding/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { user: userData, workspace: workspaceData } = req.body;

      // If creating new workspace
      if (workspaceData) {
        const now = new Date();
        const workspace = await storage.createWorkspace({
          name: workspaceData.companyName,
          billingEmail: workspaceData.billingEmail,
          industry: workspaceData.industry,
          bio: workspaceData.bio,
          logoUrl: workspaceData.logoUrl,
          createdById: userId,
          subscriptionStatus: 'trial',
          trialEndDate: calculateTrialEndDate(now),
        });

        // Update user with workspace and make them admin
        await storage.updateUser(userId, {
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          teamName: userData.teamName,
          profileImageUrl: userData.profileImageUrl,
          workspaceId: workspace.id,
          isAdmin: true,
          onboardingCompleted: true,
        });
      } else {
        // Just updating user profile (invited user)
        await storage.updateUser(userId, {
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          teamName: userData.teamName,
          profileImageUrl: userData.profileImageUrl,
          onboardingCompleted: true,
        });
      }

      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.json({ openIssues: 0, closedIssues: 0, totalValue: 0, teamMembers: 0 });
      }
      const stats = await storage.getDashboardStats(user.workspaceId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Recent activities
  app.get("/api/activities/recent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.json([]);
      }
      const activities = await storage.getRecentActivities(user.workspaceId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Issues
  app.get("/api/issues", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.json([]);
      }
      const status = req.query.status as string | undefined;
      const issues = await storage.getIssuesByWorkspace(user.workspaceId, status);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  app.get("/api/issues/:id", isAuthenticated, async (req: any, res) => {
    try {
      const issue = await storage.getIssueWithDetails(req.params.id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      res.json(issue);
    } catch (error) {
      console.error("Error fetching issue:", error);
      res.status(500).json({ message: "Failed to fetch issue" });
    }
  });

  app.get("/api/issues/:id/team-chat", isAuthenticated, async (req: any, res) => {
    try {
      const issue = await storage.getIssueWithDetails(req.params.id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      const teamMembers = issue.workspaceId
        ? await storage.getUsersByWorkspace(issue.workspaceId)
        : [];
      res.json({
        issue,
        comments: await storage.getCommentsByIssue(issue.id),
        teamMembers,
      });
    } catch (error) {
      console.error("Error fetching team chat:", error);
      res.status(500).json({ message: "Failed to fetch team chat" });
    }
  });

  app.post("/api/issues", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.status(400).json({ message: "User not in a workspace" });
      }

      const issue = await storage.createIssue({
        workspaceId: user.workspaceId,
        title: req.body.title,
        description: req.body.description,
        contactName: req.body.contactName,
        contactEmail: req.body.contactEmail,
        contactCompany: req.body.contactCompany,
        dealValue: req.body.dealValue,
        labels: req.body.labels,
        createdById: userId,
        status: "open",
      });

      // Log activity
      await storage.createActivity({
        issueId: issue.id,
        userId,
        action: "created",
      });

      const issueWithDetails = await storage.getIssueWithDetails(issue.id);
      res.json(issueWithDetails);
    } catch (error) {
      console.error("Error creating issue:", error);
      res.status(500).json({ message: "Failed to create issue" });
    }
  });

  app.post("/api/issues/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.status(400).json({ message: "User not in a workspace" });
      }

      const issues = req.body.issues;
      if (!Array.isArray(issues)) {
        return res.status(400).json({ message: "issues must be an array" });
      }

      if (issues.length === 0) {
        return res.status(400).json({ message: "issues array cannot be empty" });
      }

      if (issues.length > 100) {
        return res.status(400).json({ message: "Cannot create more than 100 issues at once" });
      }

      const createdIssues = [];

      for (const issueData of issues) {
        try {
          const issue = await storage.createIssue({
            workspaceId: user.workspaceId,
            title: issueData.title,
            description: issueData.description,
            contactName: issueData.contactName,
            contactEmail: issueData.contactEmail,
            contactCompany: issueData.contactCompany,
            dealValue: issueData.dealValue,
            labels: issueData.labels,
            createdById: userId,
            status: issueData.status || "open",
          });

          // Log activity
          await storage.createActivity({
            issueId: issue.id,
            userId,
            action: "created",
          });

          const issueWithDetails = await storage.getIssueWithDetails(issue.id);
          createdIssues.push(issueWithDetails);
        } catch (error) {
          console.error("Error creating issue in bulk:", error);
          // Continue with other issues even if one fails
        }
      }

      res.json({
        created: createdIssues.length,
        issues: createdIssues,
        totalRequested: issues.length
      });
    } catch (error) {
      console.error("Error creating issues in bulk:", error);
      res.status(500).json({ message: "Failed to create issues" });
    }
  });

  app.patch("/api/issues/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.updateIssue(req.params.id, req.body);

      if (req.body.status) {
        await storage.createActivity({
          issueId: req.params.id,
          userId,
          action: "status_changed",
          metadata: { newStatus: req.body.status },
        });
      }

      const issueWithDetails = await storage.getIssueWithDetails(req.params.id);
      res.json(issueWithDetails);
    } catch (error) {
      console.error("Error updating issue:", error);
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  // Comments
  app.post("/api/issues/:id/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      const comment = await storage.createComment({
        issueId: req.params.id,
        authorId: userId,
        content: req.body.content,
        isClientComment: false,
      });

      await storage.createActivity({
        issueId: req.params.id,
        userId,
        action: "commented",
      });

      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.delete("/api/issues/:id/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id: issueId, commentId } = req.params;

      // Get user to check authorization
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // For now, only admins can delete comments (prevent accidental deletion)
      if (!user.isAdmin) {
        return res.status(403).json({ message: "Only admins can delete comments" });
      }

      // Delete the comment via database
      const { db } = await import("./db");
      const { comments } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
      
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      await db.delete(comments).where(eq(comments.id, commentId));

      await storage.createActivity({
        issueId,
        userId,
        action: "deleted_comment",
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Publish issue
  app.post("/api/issues/:id/publish", isAuthenticated, async (req: any, res) => {
    try {
      const issue = await storage.getIssue(req.params.id);
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      const passcode = generatePasscode();
      const slug = generateSlug();

      await storage.updateIssue(req.params.id, {
        isPublished: true,
        publishedPasscode: passcode,
        publishedSlug: slug,
      });

      // Send email if provided
      if (req.body.email) {
        const protocol = req.protocol;
        const host = req.get("host");
        const chatLink = `${protocol}://${host}/chat/${slug}`;
        
        try {
          await sendChatInvitation(req.body.email, chatLink, passcode, issue.title);
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
          // Continue even if email fails
        }
      }

      res.json({ slug, passcode });
    } catch (error) {
      console.error("Error publishing issue:", error);
      res.status(500).json({ message: "Failed to publish issue" });
    }
  });

  app.post("/api/issues/:id/unpublish", isAuthenticated, async (req: any, res) => {
    try {
      await storage.updateIssue(req.params.id, {
        isPublished: false,
        publishedPasscode: null,
        publishedSlug: null,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error unpublishing issue:", error);
      res.status(500).json({ message: "Failed to unpublish issue" });
    }
  });

  // Public chat routes (no auth required, but passcode protected)
  app.get("/api/chat/:slug/auth-check", (req, res) => {
    const cookieName = `chat_${req.params.slug}`;
    const cookie = req.cookies?.[cookieName];
    
    if (cookie) {
      try {
        const data = JSON.parse(Buffer.from(cookie, "base64").toString());
        res.json({ authenticated: true, clientName: data.name });
      } catch {
        res.json({ authenticated: false });
      }
    } else {
      res.json({ authenticated: false });
    }
  });

  app.post("/api/chat/:slug/verify", async (req, res) => {
    try {
      const issue = await storage.getIssueBySlug(req.params.slug);
      if (!issue || !issue.isPublished) {
        return res.status(404).json({ message: "Chat not found" });
      }

      if (issue.publishedPasscode !== req.body.passcode) {
        return res.status(401).json({ message: "Invalid passcode" });
      }

      // Set cookie
      const cookieName = `chat_${req.params.slug}`;
      const cookieValue = Buffer.from(JSON.stringify({ name: req.body.name })).toString("base64");

      res.cookie(cookieName, cookieValue, {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      });

      res.json({
        success: true,
        contactEmail: issue.contactEmail,
        issueId: issue.id
      });
    } catch (error) {
      console.error("Error verifying passcode:", error);
      res.status(500).json({ message: "Failed to verify" });
    }
  });

  app.get("/api/chat/:slug", async (req, res) => {
    try {
      const issue = await storage.getIssueBySlug(req.params.slug);
      if (!issue || !issue.isPublished) {
        return res.status(404).json({ message: "Chat not found" });
      }

      const comments = await storage.getCommentsByIssue(issue.id);
      const teamMembers = issue.workspaceId
        ? await storage.getUsersByWorkspace(issue.workspaceId)
        : [];

      res.json({
        issue,
        comments,
        teamMembers,
      });
    } catch (error) {
      console.error("Error fetching chat:", error);
      res.status(500).json({ message: "Failed to fetch chat" });
    }
  });

  app.post("/api/chat/:slug/message", async (req, res) => {
    try {
      const issue = await storage.getIssueBySlug(req.params.slug);
      if (!issue || !issue.isPublished) {
        return res.status(404).json({ message: "Chat not found" });
      }

      const comment = await storage.createComment({
        issueId: issue.id,
        authorName: req.body.authorName,
        content: req.body.content,
        isClientComment: true,
      });

      res.json(comment);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Team
  app.get("/api/team", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.json([]);
      }
      const members = await storage.getUsersByWorkspace(user.workspaceId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  // Invites
  app.get("/api/invites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId || !user.isAdmin) {
        return res.json([]);
      }
      const invites = await storage.getInvitesByWorkspace(user.workspaceId);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Failed to fetch invites" });
    }
  });

  app.post("/api/invites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId || !user.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const workspace = await storage.getWorkspace(user.workspaceId);
      if (!workspace) {
        return res.status(404).json({ message: "Workspace not found" });
      }

      const token = generateToken();
      const invite = await storage.createInvite({
        workspaceId: user.workspaceId,
        email: req.body.email,
        invitedById: userId,
        token,
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      });

      // Send invitation email
      const protocol = req.protocol;
      const host = req.get("host");
      const inviteLink = `${protocol}://${host}/invite/${token}`;
      const inviterName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "A team member";
      
      try {
        await sendTeamInvitation(req.body.email, inviteLink, inviterName, workspace.name);
      } catch (emailError) {
        console.error("Failed to send invite email:", emailError);
      }

      res.json(invite);
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  app.delete("/api/invites/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deleteInvite(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invite:", error);
      res.status(500).json({ message: "Failed to delete invite" });
    }
  });

  // Workspace
  app.get("/api/workspace", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.status(404).json({ message: "No workspace" });
      }
      const workspace = await storage.getWorkspace(user.workspaceId);
      res.json(workspace);
    } catch (error) {
      console.error("Error fetching workspace:", error);
      res.status(500).json({ message: "Failed to fetch workspace" });
    }
  });

  app.patch("/api/workspace", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId || !user.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const workspace = await storage.updateWorkspace(user.workspaceId, req.body);
      res.json(workspace);
    } catch (error) {
      console.error("Error updating workspace:", error);
      res.status(500).json({ message: "Failed to update workspace" });
    }
  });

  // User profile
  app.patch("/api/users/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.updateUser(userId, req.body);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Stripe checkout
  app.post("/api/create-checkout-session", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const protocol = req.protocol;
      const host = req.get("host");
      const successUrl = `${protocol}://${host}/?success=true`;
      const cancelUrl = `${protocol}://${host}/trial-expired`;

      console.log("Creating checkout session for user:", userId, user.email);
      console.log("Stripe key loaded:", !!process.env.STRIPE_SECRET_KEY);

      const session = await stripe.checkout.sessions.create({
        line_items: [{
          price: 'price_1SYv6HFRJliLrxglmBv4BkA5',
        }],
        mode: 'subscription',
        metadata: {
          userId: userId,
          workspaceId: user.workspaceId || '',
          userEmail: user.email!,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
      });

      console.log("Checkout session created:", session.id);
      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Stripe webhook
  app.post("/api/webhooks/stripe", async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret!);
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err);
      return res.status(400).send('Webhook Error');
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          console.log('Checkout session completed:', session.id);

          if (session.metadata?.userId && session.metadata?.workspaceId) {
            const userId = session.metadata.userId;
            const workspaceId = session.metadata.workspaceId;

            // Update workspace to active
            await storage.updateWorkspace(workspaceId, { subscriptionStatus: 'active' });

            // Create workspace subscription record
            if (session.subscription) {
              const subscription = await stripe.subscriptions.retrieve(session.subscription) as any;
              await storage.createWorkspaceSubscription({
                workspaceId,
                stripeCustomerId: session.customer,
                stripeSubscriptionId: session.subscription,
                status: subscription.status,
                trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              });
            }

            console.log(`Activated subscription for workspace ${workspaceId}, user ${userId}`);
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as any;
          console.log('Invoice payment succeeded:', invoice.id);

          // Update subscription status if needed
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription) as any;
            // Update workspace subscription status
            await storage.updateWorkspaceSubscription(invoice.subscription, {
              status: subscription.status,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            });
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          console.log('Subscription cancelled:', subscription.id);

          // Update workspace back to trial or inactive
          await storage.updateWorkspaceSubscription(subscription.id, {
            status: 'canceled',
          });

          // Optionally update workspace status
          // await storage.updateWorkspace(workspaceId, { subscriptionStatus: 'canceled' });
          break;
        }

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  });

  // API Key management
  app.post("/api/users/generate-api-key", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const apiKey = generateToken(32); // Generate a new API key
      const user = await storage.updateUser(userId, { apiKey });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ apiKey: user.apiKey });
    } catch (error) {
      console.error("Error generating API key:", error);
      res.status(500).json({ message: "Failed to generate API key" });
    }
  });

  app.delete("/api/users/api-key", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.updateUser(userId, { apiKey: null });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  // Update client logo (for public chat)
  app.patch("/api/chat/:slug/client-logo", async (req: any, res) => {
    try {
      const { slug } = req.params;
      const { clientName, clientLogoUrl } = req.body;

      if (!clientName || !clientLogoUrl) {
        return res.status(400).json({ message: "Client name and logo URL required" });
      }

      // Find the issue by slug and get its workspace
      const issue = await storage.getIssueBySlug(slug);
      if (!issue) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // Store client logo URL in session/cookie for this chat
      // In a real app, you might want to store this somewhere more persistent
      res.json({ success: true, clientLogoUrl });
    } catch (error) {
      console.error("Error updating client logo:", error);
      res.status(500).json({ message: "Failed to update client logo" });
    }
  });

  // Analytics webhook endpoint for Segment events
  app.post("/api/webhooks/analytics", async (req, res) => {
    try {
      const events = Array.isArray(req.body) ? req.body : [req.body];

      for (const event of events) {
        const { type, userId, anonymousId, traits, properties } = event;

        // Handle identify events to merge identities
        if (type === 'identify') {
          const email = traits?.email;
          if (email) {
            // Find existing identity by email
            let identity = await storage.findAnalyticsIdentityByEmail(email);

            if (identity) {
              // Update existing identity with new IDs
              await storage.updateAnalyticsIdentity(identity.id, {
                anonymousId: anonymousId || identity.anonymousId,
                userId: userId || identity.userId,
                traits: { ...(identity.traits || {}), ...traits },
              });

              // Post identify event to team chat
              const issue = await storage.getIssue(identity.issueId);
              if (issue) {
                const identifyMessage = `👤 Client identified: ${traits?.name || email}`;
                await storage.createComment({
                  issueId: identity.issueId,
                  authorName: 'Analytics Bot',
                  content: `Segment: ${identifyMessage}`,
                  isClientComment: false,
                });
              }
            } else {
              // For identify events without existing identity, we can't associate with an issue
              // These will be linked later when track events come in with issue context
              console.log(`Identify event received for ${email} but no existing identity found`);
            }
          }
        }

        // Handle track events for client interactions
        if (type === 'track') {
          const email = properties?.email || traits?.email;

          if (email) {
            // Find identity by email
            let identity = await storage.findAnalyticsIdentityByEmail(email);

            if (identity) {
              // Update existing identity
              await storage.updateAnalyticsIdentity(identity.id, {
                anonymousId: anonymousId || identity.anonymousId,
                userId: userId || identity.userId,
                traits: { ...(identity.traits || {}), ...traits },
              });

              // Post event to team chat if it's a significant event
              const significantEvents = ['page_view', 'form_submit', 'button_click', 'purchase', 'chat_joined', 'message_sent'];
              if (significantEvents.includes(event.event)) {
                const issue = await storage.getIssue(identity.issueId);
                if (issue) {
                  const eventMessage = `${event.event.replace('_', ' ')}: ${properties?.description || 'Client activity'}`;
                  await storage.createComment({
                    issueId: identity.issueId,
                    authorName: 'Analytics Bot',
                    content: `Segment: ${eventMessage}`,
                    isClientComment: false,
                  });
                }
              }
            }
          }
        }
      }

      res.json({ success: true, processed: events.length });
    } catch (error) {
      console.error("Error processing analytics webhook:", error);
      res.status(500).json({ message: "Failed to process analytics events" });
    }
  });

  return httpServer;
}
