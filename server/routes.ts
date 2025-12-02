import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./stytchAuth";
import { sendChatInvitation, sendTeamInvitation, sendInvoiceEmail } from "./resend";
// Removed PDF generator import - now using hosted pages approach
import { randomBytes } from "crypto";
import { z } from "zod";
import { calculateTrialEndDate } from "../shared/trial";
import { calculateInvoiceTotals, validateLineItems, TAX_OPTIONS, type LineItem } from "./utils/calculations";
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

function generateInvoiceNumber(workspaceId: string): string {
  const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
  const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 random chars
  return `INV-${timestamp}-${random}`;
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
      const { user: userData, workspace: workspaceData, dealsData } = req.body;

      console.log('Onboarding request received:', {
        userId,
        hasUserData: !!userData,
        hasWorkspaceData: !!workspaceData,
        hasDealsData: !!dealsData,
        dealsDataLength: dealsData?.length || 0,
        dealsDataType: typeof dealsData,
        isDealsDataArray: Array.isArray(dealsData)
      });

      let userWorkspaceId = null;

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

        console.log('Workspace created:', workspace.id);

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
        userWorkspaceId = workspace.id;
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

      // Process deals data if provided
      if (dealsData && Array.isArray(dealsData) && dealsData.length > 0) {
        console.log('Processing deals data:', dealsData.length, 'deals');
        
        const user = await storage.getUser(userId);
        console.log('User after workspace update:', { 
          id: user?.id, 
          workspaceId: user?.workspaceId,
          email: user?.email 
        });
        
        if (user?.workspaceId) {
          try {
            console.log('Creating issues for workspace:', user.workspaceId);
            
            // Use the existing bulk creation logic
            const createdIssues = [];
            let dealErrors = [];

            for (const dealData of dealsData) {
              try {
                console.log('Creating deal:', dealData.title || 'Untitled Deal');
                
                // Convert dealValue to integer if it's a string
                let dealValue = null;
                if (dealData.dealValue) {
                  dealValue = parseInt(dealData.dealValue.toString()) || null;
                }
                
                const issue = await storage.createIssue({
                  workspaceId: user.workspaceId,
                  title: dealData.title || 'Untitled Deal',
                  description: dealData.description || '',
                  contactName: dealData.contactName || '',
                  contactEmail: dealData.contactEmail || '',
                  contactCompany: dealData.contactCompany || '',
                  dealValue: dealValue,
                  labels: dealData.labels || [],
                  createdById: userId,
                  status: dealData.status || "open",
                });

                console.log('Deal created successfully:', issue.id, issue.title);

                // Log activity
                await storage.createActivity({
                  issueId: issue.id,
                  userId,
                  action: "created",
                });

                const issueWithDetails = await storage.getIssueWithDetails(issue.id);
                createdIssues.push(issueWithDetails);
              } catch (dealError) {
                console.error("Error creating individual deal:", dealError);
                dealErrors.push({ dealData, error: (dealError as Error).message });
                // Continue with other deals even if one fails
              }
            }

            console.log(`Successfully created ${createdIssues.length} deals out of ${dealsData.length} during onboarding`);
            if (dealErrors.length > 0) {
              console.log('Deal creation errors:', dealErrors);
            }
          } catch (bulkError) {
            console.error("Error creating deals during onboarding:", bulkError);
            // Don't fail the entire onboarding if deals creation fails
          }
        } else {
          console.warn("No workspace found for user, skipping deals creation");
        }
      } else {
        console.log('No deals data to process');
      }

      const updatedUser = await storage.getUser(userId);
      if (updatedUser) {
        console.log('Onboarding completed successfully for user:', updatedUser.id);
      }
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

      // Convert dealValue to integer if it's a string
      let dealValue = null;
      if (req.body.dealValue) {
        dealValue = parseInt(req.body.dealValue.toString()) || null;
      }

      const issue = await storage.createIssue({
        workspaceId: user.workspaceId,
        title: req.body.title,
        description: req.body.description,
        contactName: req.body.contactName,
        contactEmail: req.body.contactEmail,
        contactCompany: req.body.contactCompany,
        dealValue: dealValue,
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
          // Convert dealValue to integer if it's a string
          let dealValue = null;
          if (issueData.dealValue) {
            dealValue = parseInt(issueData.dealValue.toString()) || null;
          }
          
          const issue = await storage.createIssue({
            workspaceId: user.workspaceId,
            title: issueData.title,
            description: issueData.description,
            contactName: issueData.contactName,
            contactEmail: issueData.contactEmail,
            contactCompany: issueData.contactCompany,
            dealValue: dealValue,
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

        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as any;
          console.log('Payment succeeded:', paymentIntent.id);

          // Handle Stripe Connect payments
          if (paymentIntent.metadata?.invoiceId && paymentIntent.metadata?.workspaceId) {
            const invoiceId = paymentIntent.metadata.invoiceId;
            const workspaceId = paymentIntent.metadata.workspaceId;

            try {
              // Update invoice status to paid
              await storage.updateSalesInvoice(invoiceId, {
                status: 'paid',
                paidDate: new Date(),
              });

              // Create customer payment record
              const invoice = await storage.getSalesInvoice(invoiceId);
              if (invoice) {
                await storage.createCustomerPayment({
                  workspaceId,
                  customerId: invoice.customerId,
                  invoiceId: invoiceId,
                  amount: paymentIntent.amount_received,
                  currency: paymentIntent.currency.toUpperCase(),
                  method: 'credit_card',
                  paymentDate: new Date(),
                  externalTransactionId: paymentIntent.id,
                  createdById: null,
                });
              }

              console.log(`Successfully processed payment for invoice ${invoiceId}, workspace ${workspaceId}`);
            } catch (paymentError) {
              console.error('Error processing Stripe Connect payment:', paymentError);
            }
          }
          break;
        }

        // Stripe Connect Account Webhook Events
        case 'account.updated': {
          const account = event.data.object as any;
          console.log('Stripe Connect account updated:', account.id);

          // Find workspace by Stripe Connect account ID
          const workspaces = await storage.getWorkspacesByStripeConnectAccountId(account.id);
          if (workspaces.length > 0) {
            const workspace = workspaces[0];

            // Update workspace with current account status
            await storage.updateWorkspace(workspace.id, {
              stripeConnectEnabled: account.details_submitted,
              stripeConnectChargesEnabled: account.charges_enabled,
              stripeConnectPayoutsEnabled: account.payouts_enabled,
              // Only mark onboarding complete when both charges AND payouts are enabled
              stripeConnectOnboardingComplete: account.charges_enabled && account.payouts_enabled,
              stripeConnectOnboardingStarted: true,
              stripeConnectOnboardingStatus: (account.charges_enabled && account.payouts_enabled) ? 'complete' : 'in_progress',
              stripeConnectBusinessProfile: account.business_profile,
              stripeConnectLastWebhookEvent: 'account.updated',
              stripeConnectLastWebhookTimestamp: new Date(),
            });

            // Track the onboarding event
            const currentEvents = Array.isArray(workspace.stripeConnectOnboardingEvents) ? workspace.stripeConnectOnboardingEvents : [];
            await storage.updateWorkspace(workspace.id, {
              stripeConnectOnboardingEvents: [...currentEvents, {
                event: 'account.updated',
                timestamp: new Date().toISOString(),
                data: {
                  details_submitted: account.details_submitted,
                  charges_enabled: account.charges_enabled,
                  payouts_enabled: account.payouts_enabled,
                }
              }]
            });

            console.log(`Updated Stripe Connect status for workspace ${workspace.id}`);
          }
          break;
        }

        case 'account.application.authorized': {
          const account = event.data.object as any;
          console.log('Stripe Connect account authorized:', account.id);

          // Find workspace by Stripe Connect account ID
          const workspaces = await storage.getWorkspacesByStripeConnectAccountId(account.id);
          if (workspaces.length > 0) {
            const workspace = workspaces[0];

            // Update workspace with authorization status
            await storage.updateWorkspace(workspace.id, {
              stripeConnectEnabled: true,
              stripeConnectOnboardingStarted: true,
              stripeConnectOnboardingStatus: 'authorized',
              stripeConnectLastWebhookEvent: 'account.application.authorized',
              stripeConnectLastWebhookTimestamp: new Date(),
            });

            // Track the authorization event
            const currentEvents = Array.isArray(workspace.stripeConnectOnboardingEvents) ? workspace.stripeConnectOnboardingEvents : [];
            await storage.updateWorkspace(workspace.id, {
              stripeConnectOnboardingEvents: [...currentEvents, {
                event: 'account.application.authorized',
                timestamp: new Date().toISOString(),
                data: {
                  account_id: account.id,
                  authorized: true,
                }
              }]
            });

            console.log(`Stripe Connect account authorized for workspace ${workspace.id}`);
          }
          break;
        }

        case 'account.application.deauthorized': {
          const account = event.data.object as any;
          console.log('Stripe Connect account deauthorized:', account.id);

          // Find workspace by Stripe Connect account ID
          const workspaces = await storage.getWorkspacesByStripeConnectAccountId(account.id);
          if (workspaces.length > 0) {
            const workspace = workspaces[0];

            // Update workspace with deauthorization status
            await storage.updateWorkspace(workspace.id, {
              stripeConnectEnabled: false,
              stripeConnectOnboardingStatus: 'deauthorized',
              stripeConnectLastWebhookEvent: 'account.application.deauthorized',
              stripeConnectLastWebhookTimestamp: new Date(),
            });

            // Track the deauthorization event
            const currentEvents = Array.isArray(workspace.stripeConnectOnboardingEvents) ? workspace.stripeConnectOnboardingEvents : [];
            await storage.updateWorkspace(workspace.id, {
              stripeConnectOnboardingEvents: [...currentEvents, {
                event: 'account.application.deauthorized',
                timestamp: new Date().toISOString(),
                data: {
                  account_id: account.id,
                  authorized: false,
                }
              }]
            });

            console.log(`Stripe Connect account deauthorized for workspace ${workspace.id}`);
          }
          break;
        }

        case 'identity.verification_session.verified': {
          const session = event.data.object as any;
          console.log('Identity verification session verified:', session.id);

          // Find workspace by Stripe Connect account ID
          const workspaces = await storage.getWorkspacesByStripeConnectAccountId(session.account_id);
          if (workspaces.length > 0) {
            const workspace = workspaces[0];

            // Track the verification event
            const currentEvents = Array.isArray(workspace.stripeConnectOnboardingEvents) ? workspace.stripeConnectOnboardingEvents : [];
            await storage.updateWorkspace(workspace.id, {
              stripeConnectOnboardingEvents: [...currentEvents, {
                event: 'identity.verification_session.verified',
                timestamp: new Date().toISOString(),
                data: {
                  verification_session_id: session.id,
                  status: session.status,
                }
              }],
              stripeConnectLastWebhookEvent: 'identity.verification_session.verified',
              stripeConnectLastWebhookTimestamp: new Date(),
            });

            console.log(`Identity verification completed for workspace ${workspace.id}`);
          }
          break;
        }

        case 'identity.verification_session.requires_input': {
          const session = event.data.object as any;
          console.log('Identity verification requires input:', session.id);

          // Find workspace by Stripe Connect account ID
          const workspaces = await storage.getWorkspacesByStripeConnectAccountId(session.account_id);
          if (workspaces.length > 0) {
            const workspace = workspaces[0];

            // Track the verification event
            const currentEvents = Array.isArray(workspace.stripeConnectOnboardingEvents) ? workspace.stripeConnectOnboardingEvents : [];
            await storage.updateWorkspace(workspace.id, {
              stripeConnectOnboardingEvents: [...currentEvents, {
                event: 'identity.verification_session.requires_input',
                timestamp: new Date().toISOString(),
                data: {
                  verification_session_id: session.id,
                  required_input: session.requirements?.currently_due || [],
                }
              }],
              stripeConnectLastWebhookEvent: 'identity.verification_session.requires_input',
              stripeConnectLastWebhookTimestamp: new Date(),
            });

            console.log(`Identity verification requires input for workspace ${workspace.id}`);
          }
          break;
        }

        case 'identity.verification_session.canceled': {
          const session = event.data.object as any;
          console.log('Identity verification session canceled:', session.id);

          // Find workspace by Stripe Connect account ID
          const workspaces = await storage.getWorkspacesByStripeConnectAccountId(session.account_id);
          if (workspaces.length > 0) {
            const workspace = workspaces[0];

            // Track the verification event
            const currentEvents = Array.isArray(workspace.stripeConnectOnboardingEvents) ? workspace.stripeConnectOnboardingEvents : [];
            await storage.updateWorkspace(workspace.id, {
              stripeConnectOnboardingEvents: [...currentEvents, {
                event: 'identity.verification_session.canceled',
                timestamp: new Date().toISOString(),
                data: {
                  verification_session_id: session.id,
                  reason: session.cancelation_reason,
                }
              }],
              stripeConnectLastWebhookEvent: 'identity.verification_session.canceled',
              stripeConnectLastWebhookTimestamp: new Date(),
            });

            console.log(`Identity verification canceled for workspace ${workspace.id}`);
          }
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

  // ==================== STRIPE CONNECT ====================

  // Create Stripe Connect Account
  app.post("/api/stripe/connect/create-account", isAuthenticated, async (req: any, res) => {
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

      // If already has a connected account, just return the onboarding URL
      if (workspace.stripeConnectAccountId) {
        const accountLink = await stripe.accountLinks.create({
          account: workspace.stripeConnectAccountId,
          refresh_url: `${process.env.APP_URL}/settings?stripe_connect=refresh`,
          return_url: `${process.env.APP_URL}/settings?stripe_connect=success`,
          type: 'account_onboarding',
        });

        return res.json({ 
          onboardingUrl: accountLink.url,
          accountId: workspace.stripeConnectAccountId
        });
      }

      // Create new connected account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: workspace.billingEmail || user.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: workspace.name,
          product_description: 'Business services and consulting',
        },
        metadata: {
          workspaceId: workspace.id,
        },
      });

      // Update workspace with connected account info
      await storage.updateWorkspace(workspace.id, {
        stripeConnectAccountId: account.id,
        stripeConnectEnabled: true,
        stripeConnectOnboardingStarted: true,
        stripeConnectOnboardingStatus: 'in_progress',
        stripeConnectOnboardingEvents: [{
          event: 'account.created',
          timestamp: new Date().toISOString(),
          data: {
            account_id: account.id,
            capabilities_requested: ['card_payments', 'transfers']
          }
        }],
        stripeConnectLastWebhookEvent: 'account.created',
        stripeConnectLastWebhookTimestamp: new Date(),
      });

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.APP_URL}/settings?stripe_connect=refresh`,
        return_url: `${process.env.APP_URL}/settings?stripe_connect=success`,
        type: 'account_onboarding',
      });

      res.json({ 
        onboardingUrl: accountLink.url,
        accountId: account.id
      });
    } catch (error) {
      console.error("Error creating Stripe Connect account:", error);
      res.status(500).json({ message: "Failed to create Stripe Connect account", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Refresh Stripe Connect Account Status
  app.post("/api/stripe/connect/refresh-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId || !user.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const workspace = await storage.getWorkspace(user.workspaceId);
      if (!workspace?.stripeConnectAccountId) {
        return res.status(404).json({ message: "No Stripe Connect account found" });
      }

      // Retrieve account details from Stripe
      const account = await stripe.accounts.retrieve(workspace.stripeConnectAccountId);

      // Update workspace with current status
      await storage.updateWorkspace(workspace.id, {
        stripeConnectEnabled: account.details_submitted,
        stripeConnectChargesEnabled: account.charges_enabled,
        stripeConnectPayoutsEnabled: account.payouts_enabled,
        // Only mark onboarding complete when both charges AND payouts are enabled
        stripeConnectOnboardingComplete: account.charges_enabled && account.payouts_enabled,
        stripeConnectBusinessProfile: account.business_profile,
      });

      res.json({ 
        success: true,
        account: {
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        }
      });
    } catch (error) {
      console.error("Error refreshing Stripe Connect status:", error);
      res.status(500).json({ message: "Failed to refresh Stripe Connect status", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Create Payment Session for Invoice
  app.post("/api/stripe/connect/create-payment-session", isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId } = req.body;
      
      if (!invoiceId) {
        return res.status(400).json({ message: "Invoice ID is required" });
      }

      const invoice = await storage.getSalesInvoiceWithDetails(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const workspace = await storage.getWorkspace(invoice.workspaceId);
      if (!workspace?.stripeConnectAccountId || !workspace.stripeConnectEnabled) {
        return res.status(400).json({ message: "Workspace does not have Stripe Connect enabled" });
      }

      // Create payment session
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: invoice.customer?.email || undefined,
        line_items: [
          {
            price_data: {
              currency: invoice.currency.toLowerCase(),
              product_data: {
                name: invoice.title,
                description: invoice.description || undefined,
              },
              unit_amount: invoice.totalAmount,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: Math.round(invoice.totalAmount * 0.04), // 4% application fee
          transfer_data: {
            destination: workspace.stripeConnectAccountId,
          },
          metadata: {
            invoiceId: invoice.id,
            workspaceId: workspace.id,
          },
        },
        success_url: `${process.env.APP_URL}/ar/invoices/${invoice.id}?payment=success`,
        cancel_url: `${process.env.APP_URL}/ar/invoices/${invoice.id}?payment=cancelled`,
        metadata: {
          invoiceId: invoice.id,
          workspaceId: workspace.id,
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error("Error creating payment session:", error);
      res.status(500).json({ message: "Failed to create payment session", error: error instanceof Error ? error.message : String(error) });
    }
  });
  // Create Payment Intent for Stripe Elements
  app.post("/api/stripe/connect/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId } = req.body;
      
      if (!invoiceId) {
        return res.status(400).json({ message: "Invoice ID is required" });
      }

      const invoice = await storage.getSalesInvoiceWithDetails(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const workspace = await storage.getWorkspace(invoice.workspaceId);
      if (!workspace?.stripeConnectAccountId || !workspace.stripeConnectEnabled) {
        return res.status(400).json({ message: "Workspace does not have Stripe Connect enabled" });
      }

      // Get or create Stripe customer
      const customer = await storage.getCustomer(invoice.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      let stripeCustomerId = customer.stripeCustomerId;
      if (!stripeCustomerId) {
        // Create new Stripe customer if they don't have one
        const stripeCustomer = await stripe.customers.create({
          email: customer.email || undefined,
          name: customer.name,
          address: customer.billingAddress || customer.address ? {
            line1: customer.billingAddress || customer.address || undefined,
          } : undefined,
          metadata: {
            internalCustomerId: customer.id,
            workspaceId: customer.workspaceId,
          }
        }, {
          stripeAccount: workspace.stripeConnectAccountId,
        });

        // Update customer with Stripe customer ID
        await storage.updateCustomer(customer.id, {
          stripeCustomerId: stripeCustomer.id,
          stripeConnectAccountId: workspace.stripeConnectAccountId,
        });

        stripeCustomerId = stripeCustomer.id;
      }

      // Calculate application fee (4% as used elsewhere in the codebase)
      const applicationFeeAmount = Math.round(invoice.totalAmount * 0.04);

      // Create Payment Intent for Elements
      const paymentIntent = await stripe.paymentIntents.create({
        amount: invoice.totalAmount,
        currency: invoice.currency.toLowerCase(),
        customer: stripeCustomerId,
        automatic_payment_methods: {
          enabled: true,
        },
        application_fee_amount: applicationFeeAmount,
        description: `Invoice ${invoice.invoiceNumber} - ${invoice.title}`,
        metadata: {
          internalInvoiceId: invoice.id,
          internalInvoiceNumber: invoice.invoiceNumber,
          workspaceId: workspace.id,
          invoiceTitle: invoice.title,
        },
        // Set up for future payments if customer wants to save card
        setup_future_usage: 'off_session',
      }, {
        stripeAccount: workspace.stripeConnectAccountId,
      });

      console.log(`Created Payment Intent ${paymentIntent.id} for invoice ${invoice.invoiceNumber}`);

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        applicationFeeAmount: applicationFeeAmount,
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ 
        message: "Failed to create payment intent", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // ==================== ACCOUNTS RECEIVABLE ====================

  // AR Dashboard Statistics
  app.get("/api/ar/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.json({
          totalCustomers: 0,
          pendingInvoices: 0,
          overdueAmount: 0,
          monthlyRevenue: 0,
          avgCollectionTime: 0,
          recurringRevenue: 0,
          totalReceivable: 0,
          totalCollected: 0,
        });
      }

      const workspaceId = user.workspaceId;
      
      // Get customers count
      const customers = await storage.getCustomersByWorkspace(workspaceId);
      const totalCustomers = customers.length;

      // Get sales invoices
      const invoices = await storage.getSalesInvoicesByWorkspace(workspaceId);
      const pendingInvoices = invoices.filter(inv => ['draft', 'sent'].includes(inv.status)).length;
      const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      
      // Get this month's revenue (paid invoices)
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const monthlyInvoices = invoices.filter(inv => 
        inv.paidDate && new Date(inv.paidDate!) >= thisMonth
      );
      const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

      // Calculate average collection time (in days)
      const paidInvoicesWithCollectionTime = invoices
        .filter(inv => inv.paidDate && inv.invoiceDate)
        .map(inv => {
          const invoiceDate = new Date(inv.invoiceDate);
          const paidDate = new Date(inv.paidDate!);
          return Math.ceil((paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        });
      
      const avgCollectionTime = paidInvoicesWithCollectionTime.length > 0 
        ? Math.round(paidInvoicesWithCollectionTime.reduce((sum, days) => sum + days, 0) / paidInvoicesWithCollectionTime.length)
        : 0;

      // Get recurring revenue
      const recurringInvoices = await storage.getRecurringInvoicesByWorkspace(workspaceId);
      const activeRecurring = recurringInvoices.filter(rinv => rinv.isActive);
      const recurringRevenue = activeRecurring.reduce((sum, rinv) => sum + rinv.totalAmount, 0);

      // Get total amounts
      const totalReceivable = invoices.reduce((sum, inv) => {
        if (['draft', 'sent', 'overdue'].includes(inv.status)) {
          return sum + inv.totalAmount;
        }
        return sum;
      }, 0);

      const totalCollected = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.totalAmount, 0);

      res.json({
        totalCustomers,
        pendingInvoices,
        overdueAmount,
        monthlyRevenue,
        avgCollectionTime,
        recurringRevenue,
        totalReceivable,
        totalCollected,
      });
    } catch (error) {
      console.error("Error fetching AR dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch AR dashboard statistics" });
    }
  });

  // Customer Management
  app.get("/api/ar/customers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.json([]);
      }
      const customers = await storage.getCustomersByWorkspace(user.workspaceId);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/ar/customers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/ar/customers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.status(400).json({ message: "User not in a workspace" });
      }

      // Validate that email is provided
      if (!req.body.email) {
        return res.status(400).json({ message: "Email is required for all customers" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.email)) {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }

      const customer = await storage.createCustomer({
        ...req.body,
        workspaceId: user.workspaceId,
        createdById: userId,
      });

      res.json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.patch("/api/ar/customers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/ar/customers/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Convert Issue to Customer
  app.post("/api/ar/issues/:issueId/convert-to-customer", isAuthenticated, async (req: any, res) => {
    try {
      const customer = await storage.convertIssueToCustomer(req.params.issueId);
      if (!customer) {
        return res.status(400).json({ message: "Failed to convert issue to customer" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error converting issue to customer:", error);
      res.status(500).json({ message: "Failed to convert issue to customer" });
    }
  });

  // Sales Invoice Management
  app.get("/api/ar/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.json([]);
      }
      const invoices = await storage.getSalesInvoicesByWorkspace(user.workspaceId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/ar/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const invoice = await storage.getSalesInvoiceWithDetails(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const lineItems = await storage.getSalesInvoiceLineItems(invoice.id);
      
      // Transform the data to match frontend expectations
      const transformedInvoice = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        title: invoice.title,
        description: invoice.description,
        invoiceDate: invoice.invoiceDate?.toISOString() || new Date().toISOString(),
        dueDate: invoice.dueDate?.toISOString() || '',
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        subtotal: invoice.totalAmount - (invoice.taxAmount || 0), // Calculate subtotal
        taxAmount: invoice.taxAmount,
        currency: invoice.currency,
        // Transform customer data to match frontend expectations
        customer: invoice.customer ? {
          name: invoice.customer.name,
          email: invoice.customer.email,
          address: invoice.customer.address,
          company: invoice.customer.industry || invoice.customer.name
        } : {
          name: 'Unknown Customer',
          email: '',
          address: '',
          company: ''
        },
        // Transform workspace data to match frontend expectations  
        workspace: invoice.workspace ? {
          name: invoice.workspace.name,
          email: invoice.workspace.billingEmail,
          address: invoice.workspace.bio || '',
          logoUrl: invoice.workspace.logoUrl
        } : {
          name: 'Unknown Workspace',
          email: '',
          address: '',
          logoUrl: ''
        },
        // Transform line items to match frontend expectations
        lineItems: lineItems.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.totalPrice
        }))
      };
      
      res.json(transformedInvoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/ar/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.status(400).json({ message: "User not in a workspace" });
      }

      const { lineItems, taxPercentage, ...invoiceData } = req.body;

      // Validate that customer exists and has an email address
      if (!invoiceData.customerId) {
        return res.status(400).json({ message: "Customer is required" });
      }

      const customer = await storage.getCustomer(invoiceData.customerId);
      if (!customer) {
        return res.status(400).json({ message: "Customer not found" });
      }

      if (!customer.email) {
        return res.status(400).json({ 
          message: "Customer must have an email address to create invoices for sending",
          customerName: customer.name 
        });
      }
      
      // Generate invoice number if not provided
      if (!invoiceData.invoiceNumber) {
        invoiceData.invoiceNumber = generateInvoiceNumber(user.workspaceId);
      }

      let calculatedInvoiceData = { ...invoiceData };
      
      // If line items are provided, calculate totals automatically
      if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
        // Validate line items
        const validationErrors = validateLineItems(lineItems);
        if (validationErrors.length > 0) {
          return res.status(400).json({ 
            message: "Invalid line items", 
            errors: validationErrors 
          });
        }

        // Calculate totals from line items
        const calculations = calculateInvoiceTotals(lineItems, taxPercentage || 0);
        
        // Override any manually entered amounts with calculated amounts
        calculatedInvoiceData = {
          ...calculatedInvoiceData,
          totalAmount: calculations.totalAmount,
          taxAmount: calculations.taxAmount,
        };
        
        console.log('Calculated invoice totals:', {
          subtotal: calculations.subtotal,
          taxAmount: calculations.taxAmount,
          totalAmount: calculations.totalAmount,
          lineItemsCount: lineItems.length
        });
      } else if (!invoiceData.totalAmount || invoiceData.totalAmount <= 0) {
        return res.status(400).json({ 
          message: "Either line items or total amount is required" 
        });
      }
      
      const invoice = await storage.createSalesInvoice({
        ...calculatedInvoiceData,
        workspaceId: user.workspaceId,
        createdById: userId,
      });

      // Create line items if provided
      if (lineItems && Array.isArray(lineItems)) {
        for (const item of lineItems) {
          await storage.createSalesInvoiceLineItem({
            ...item,
            invoiceId: invoice.id,
          });
        }
      }

      const invoiceWithItems = await storage.getSalesInvoiceWithDetails(invoice.id);
      const items = await storage.getSalesInvoiceLineItems(invoice.id);
      res.json({ ...invoiceWithItems, lineItems: items });
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Publish/Send Invoice
  app.post("/api/ar/invoices/:id/publish", isAuthenticated, async (req: any, res) => {
    try {
      const invoice = await storage.getSalesInvoiceWithDetails(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (invoice.status !== 'draft') {
        return res.status(400).json({ message: "Only draft invoices can be published" });
      }

      // Update invoice status to 'sent'
      const updatedInvoice = await storage.updateSalesInvoice(req.params.id, {
        status: 'sent',
        sentDate: new Date(),
      });

      // Send email to customer if they have an email address
      if (invoice.customer?.email) {
        try {
          const protocol = req.protocol;
          const host = req.get("host");
          const invoiceUrl = `${protocol}://${host}/ar/invoices/${invoice.id}`;
          
          console.log(`Sending invoice email to ${invoice.customer.email} for invoice ${invoice.invoiceNumber}`);
          
          // Send the actual email using Resend
          await sendInvoiceEmail(
            invoice.customer.email,
            invoice.invoiceNumber,
            invoiceUrl,
            invoice.customer.name,
            invoice.totalAmount,
            invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A',
            new Date(invoice.invoiceDate).toLocaleDateString(),
            invoice.workspace?.name || 'Your Company'
          );
          
          console.log(`Successfully sent invoice email to ${invoice.customer.email}`);
          
        } catch (emailError) {
          console.error("Failed to send invoice email:", emailError);
          // Don't fail the entire request if email sending fails
        }
      }

      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error publishing invoice:", error);
      res.status(500).json({ message: "Failed to publish invoice" });
    }
  });

  app.patch("/api/ar/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { lineItems, taxPercentage, ...updateData } = req.body;
      
      // If line items are provided, recalculate totals
      if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
        // Validate line items
        const validationErrors = validateLineItems(lineItems);
        if (validationErrors.length > 0) {
          return res.status(400).json({ 
            message: "Invalid line items", 
            errors: validationErrors 
          });
        }

        // Calculate totals from line items
        const calculations = calculateInvoiceTotals(lineItems, taxPercentage || 0);
        
        // Override any manually entered amounts with calculated amounts
        updateData.totalAmount = calculations.totalAmount;
        updateData.taxAmount = calculations.taxAmount;
        
        console.log('Updated invoice totals:', {
          subtotal: calculations.subtotal,
          taxAmount: calculations.taxAmount,
          totalAmount: calculations.totalAmount,
          lineItemsCount: lineItems.length
        });
      }
      
      const invoice = await storage.updateSalesInvoice(req.params.id, updateData);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // If line items are provided, update them (delete existing and create new)
      if (lineItems && Array.isArray(lineItems)) {
        // Delete existing line items
        await storage.deleteSalesInvoiceLineItems(req.params.id);
        
        // Create new line items
        for (const item of lineItems) {
          await storage.createSalesInvoiceLineItem({
            ...item,
            invoiceId: req.params.id,
          });
        }
      }

      const invoiceWithItems = await storage.getSalesInvoiceWithDetails(req.params.id);
      const items = await storage.getSalesInvoiceLineItems(req.params.id);
      res.json({ ...invoiceWithItems, lineItems: items });
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete("/api/ar/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteSalesInvoice(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });
  // PDF generation removed - now using hosted pages approach
  // Users can view invoices at /ar/invoices/:id and download as PDF using browser print function



  // Recurring Invoice Management
  app.get("/api/ar/recurring-invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.json([]);
      }
      const recurringInvoices = await storage.getRecurringInvoicesByWorkspace(user.workspaceId);
      res.json(recurringInvoices);
    } catch (error) {
      console.error("Error fetching recurring invoices:", error);
      res.status(500).json({ message: "Failed to fetch recurring invoices" });
    }
  });

  app.post("/api/ar/recurring-invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.status(400).json({ message: "User not in a workspace" });
      }

      const recurringInvoice = await storage.createRecurringInvoice({
        ...req.body,
        workspaceId: user.workspaceId,
        createdById: userId,
      });

      res.json(recurringInvoice);
    } catch (error) {
      console.error("Error creating recurring invoice:", error);
      res.status(500).json({ message: "Failed to create recurring invoice" });
    }
  });

  app.patch("/api/ar/recurring-invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const recurringInvoice = await storage.updateRecurringInvoice(req.params.id, req.body);
      if (!recurringInvoice) {
        return res.status(404).json({ message: "Recurring invoice not found" });
      }
      res.json(recurringInvoice);
    } catch (error) {
      console.error("Error updating recurring invoice:", error);
      res.status(500).json({ message: "Failed to update recurring invoice" });
    }
  });

  // Customer Payment Management
  app.get("/api/ar/payments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.json([]);
      }
      const payments = await storage.getCustomerPaymentsByWorkspace(user.workspaceId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/ar/payments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.status(400).json({ message: "User not in a workspace" });
      }

      const payment = await storage.createCustomerPayment({
        ...req.body,
        workspaceId: user.workspaceId,
        createdById: userId,
      });

      // Update invoice status if payment is for a specific invoice
      if (payment.invoiceId) {
        const invoice = await storage.getSalesInvoice(payment.invoiceId);
        if (invoice) {
          const totalPaid = payment.amount;
          if (totalPaid >= invoice.totalAmount) {
            await storage.updateSalesInvoice(payment.invoiceId, { 
              status: 'paid',
              paidDate: payment.paymentDate 
            });
          }
        }
      }

      res.json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Payment Method Management
  app.get("/api/ar/payment-methods/:customerId", isAuthenticated, async (req: any, res) => {
    try {
      const paymentMethods = await storage.getPaymentMethodsByCustomer(req.params.customerId);
      res.json(paymentMethods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  app.post("/api/ar/payment-methods", isAuthenticated, async (req: any, res) => {
    try {
      const paymentMethod = await storage.createPaymentMethod(req.body);
      res.json(paymentMethod);
    } catch (error) {
      console.error("Error creating payment method:", error);
      res.status(500).json({ message: "Failed to create payment method" });
    }
  });

  app.patch("/api/ar/payment-methods/:id", isAuthenticated, async (req: any, res) => {
    try {
      const paymentMethod = await storage.updatePaymentMethod(req.params.id, req.body);
      if (!paymentMethod) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      res.json(paymentMethod);
    } catch (error) {
      console.error("Error updating payment method:", error);
      res.status(500).json({ message: "Failed to update payment method" });
    }
  });

  // AR Reports and Analytics
  app.get("/api/ar/reports/aging", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.json({ current: 0, thirty: 0, sixty: 0, ninety: 0, overNinety: 0 });
      }

      const invoices = await storage.getSalesInvoicesByWorkspace(user.workspaceId);
      const now = new Date();
      
      let current = 0;
      let thirty = 0;
      let sixty = 0;
      let ninety = 0;
      let overNinety = 0;

      invoices.forEach(invoice => {
        if (['draft', 'sent', 'overdue'].includes(invoice.status) && invoice.dueDate) {
          const dueDate = new Date(invoice.dueDate);
          const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysPastDue <= 0) {
            current += invoice.totalAmount;
          } else if (daysPastDue <= 30) {
            thirty += invoice.totalAmount;
          } else if (daysPastDue <= 60) {
            sixty += invoice.totalAmount;
          } else if (daysPastDue <= 90) {
            ninety += invoice.totalAmount;
          } else {
            overNinety += invoice.totalAmount;
          }
        }
      });

      res.json({ current, thirty, sixty, ninety, overNinety });
    } catch (error) {
      console.error("Error generating aging report:", error);
      res.status(500).json({ message: "Failed to generate aging report" });
    }
  });

  app.get("/api/ar/reports/collection-insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user?.workspaceId) {
        return res.json({ totalCollected: 0, avgPaymentTime: 0, paymentMethods: [], topCustomers: [] });
      }

      const payments = await storage.getCustomerPaymentsByWorkspace(user.workspaceId);
      const invoices = await storage.getSalesInvoicesByWorkspace(user.workspaceId);
      
      const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      // Calculate average payment time
      const paidInvoices = invoices.filter(inv => inv.paidDate && inv.invoiceDate);
      const paymentTimes = paidInvoices.map(inv => {
        const invoiceDate = new Date(inv.invoiceDate);
        const paidDate = new Date(inv.paidDate!);
        return Math.ceil((paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      });
      const avgPaymentTime = paymentTimes.length > 0 
        ? Math.round(paymentTimes.reduce((sum, days) => sum + days, 0) / paymentTimes.length)
        : 0;

      // Payment method distribution
      const paymentMethods: { [key: string]: number } = {};
      payments.forEach(payment => {
        paymentMethods[payment.method] = (paymentMethods[payment.method] || 0) + payment.amount;
      });

      res.json({
        totalCollected,
        avgPaymentTime,
        paymentMethods,
        topCustomers: [], // This would require more complex aggregation
      });
    } catch (error) {
      console.error("Error generating collection insights:", error);
      res.status(500).json({ message: "Failed to generate collection insights" });
    }
  });

  // Stripe Connect account link generation
  app.post("/api/stripe/connect/generate-account-link", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.workspaceId || !user.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const workspace = await storage.getWorkspace(user.workspaceId);
      if (!workspace?.stripeConnectAccountId) {
        return res.status(400).json({ message: "No Stripe Connect account found" });
      }

      // Fetch fresh account details to determine current requirements
      const account = await stripe.accounts.retrieve(workspace.stripeConnectAccountId);
      
      // Determine the appropriate link type based on current account state
      let linkType = 'account_onboarding';
      let refreshUrl = `${process.env.APP_URL}/settings?stripe_connect=refresh`;
      let returnUrl = `${process.env.APP_URL}/settings?stripe_connect=success`;

      // If account needs verification or has past due requirements, use verification flow
      if ((account.requirements?.currently_due?.length || 0) > 0 || (account.requirements?.past_due?.length || 0) > 0) {
        linkType = 'account_onboarding'; // This handles both onboarding and verification
        refreshUrl = `${process.env.APP_URL}/settings?stripe_connect=verification_refresh`;
        returnUrl = `${process.env.APP_URL}/settings?stripe_connect=verification_complete`;
      }

      // Generate account link using Stripe Connect
      const accountLink = await stripe.accountLinks.create({
        account: workspace.stripeConnectAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: linkType as any,
      });

      // Store the account link and expiration
      const linkExpiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      await storage.updateWorkspace(workspace.id, {
        stripeConnectAccountLink: accountLink.url,
        stripeConnectAccountLinkExpires: linkExpiration,
      });

      // Update requirements from Stripe
      await storage.updateWorkspace(workspace.id, {
        stripeConnectRequirementsCurrentlyDue: account.requirements?.currently_due || [],
        stripeConnectRequirementsEventuallyDue: account.requirements?.eventually_due || [],
        stripeConnectRequirementsPastDue: account.requirements?.past_due || [],
      });

      // Track the account link generation
      const currentEvents = Array.isArray(workspace.stripeConnectOnboardingEvents) ? workspace.stripeConnectOnboardingEvents : [];
      await storage.updateWorkspace(workspace.id, {
        stripeConnectOnboardingEvents: [...currentEvents, {
          event: 'account_link.generated',
          timestamp: new Date().toISOString(),
          data: {
            account_id: workspace.stripeConnectAccountId,
            link_type: linkType,
            requirements_due: account.requirements?.currently_due || [],
            expires_at: linkExpiration.toISOString(),
          }
        }]
      });

      console.log(`Generated account link for workspace ${workspace.id}`);
      
      res.json({
        accountLink: accountLink.url,
        linkType: linkType,
        expiresAt: linkExpiration.toISOString(),
      });
    } catch (error) {
      console.error("Error generating account link:", error);
      res.status(500).json({ message: "Failed to generate account link" });
    }
  });

  app.get("/api/stripe/connect/verification-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.workspaceId || !user.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const workspace = await storage.getWorkspace(user.workspaceId);
      
      if (!workspace?.stripeConnectAccountId) {
        return res.status(400).json({ message: "No Stripe Connect account found" });
      }

      // Fetch fresh account details from Stripe
      const account = await stripe.accounts.retrieve(workspace.stripeConnectAccountId);
      
      // Check if account link has expired
      const linkExpired = workspace.stripeConnectAccountLinkExpires
        ? new Date(workspace.stripeConnectAccountLinkExpires) < new Date()
        : true;

      const response = {
        accountId: account.id,
        requirements: {
          currentlyDue: account.requirements?.currently_due || [],
          eventuallyDue: account.requirements?.eventually_due || [],
          pastDue: account.requirements?.past_due || [],
        },
        verificationFields: account.requirements?.disabled_reason || [],
        onboardingStatus: workspace.stripeConnectOnboardingStatus,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        accountLink: linkExpired ? null : workspace.stripeConnectAccountLink,
        linkExpired,
        lastWebhookEvent: workspace.stripeConnectLastWebhookEvent,
        lastWebhookTimestamp: workspace.stripeConnectLastWebhookTimestamp,
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching verification status:", error);
      res.status(500).json({ message: "Failed to fetch verification status" });
    }
  });

  // ==================== STRIPE INVOICING CONNECT ====================

  // Create or get Stripe customer for existing customer
  app.post("/api/stripe/invoicing/create-customer", isAuthenticated, async (req: any, res) => {
    try {
      const { customerId } = req.body;
      
      if (!customerId) {
        return res.status(400).json({ message: "Customer ID is required" });
      }

      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const workspace = await storage.getWorkspace(customer.workspaceId);
      if (!workspace?.stripeConnectAccountId) {
        return res.status(400).json({ message: "Workspace does not have Stripe Connect enabled" });
      }

      // If customer already has a Stripe customer ID, return it
      if (customer.stripeCustomerId) {
        return res.json({ 
          stripeCustomerId: customer.stripeCustomerId,
          existing: true 
        });
      }

      // Create new Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: customer.email || undefined,
        name: customer.name,
        address: customer.billingAddress || customer.address ? {
          line1: customer.billingAddress || customer.address || undefined,
        } : undefined,
        metadata: {
          internalCustomerId: customer.id,
          workspaceId: customer.workspaceId,
        }
      }, {
        stripeAccount: workspace.stripeConnectAccountId,
      });

      // Update customer with Stripe customer ID
      await storage.updateCustomer(customerId, {
        stripeCustomerId: stripeCustomer.id,
        stripeConnectAccountId: workspace.stripeConnectAccountId,
      });

      res.json({ 
        stripeCustomerId: stripeCustomer.id,
        existing: false 
      });
    } catch (error) {
      console.error("Error creating Stripe customer:", error);
      res.status(500).json({ message: "Failed to create Stripe customer", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Create Stripe invoice and send to customer
  app.post("/api/stripe/invoicing/create-and-send-invoice", isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceId } = req.body;
      
      if (!invoiceId) {
        return res.status(400).json({ message: "Invoice ID is required" });
      }

      const invoice = await storage.getSalesInvoiceWithDetails(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const workspace = await storage.getWorkspace(invoice.workspaceId);
      if (!workspace?.stripeConnectAccountId) {
        return res.status(400).json({ message: "Workspace does not have Stripe Connect enabled" });
      }

      // Get customer and ensure they have a Stripe customer ID
      const customer = await storage.getCustomer(invoice.customerId);
      if (!customer?.stripeCustomerId) {
        return res.status(400).json({ message: "Customer must have a Stripe customer ID" });
      }

      // Get line items for the invoice
      const lineItems = await storage.getSalesInvoiceLineItems(invoice.id);

      // Create Stripe invoice
      const stripeInvoice = await stripe.invoices.create({
        customer: customer.stripeCustomerId,
        auto_advance: true, // Automatically finalize and attempt payment
        collection_method: 'send_invoice',
        days_until_due: invoice.dueDate ? Math.ceil((new Date(invoice.dueDate).getTime() - new Date(invoice.invoiceDate).getTime()) / (1000 * 60 * 60 * 24)) : 30,
        application_fee_amount: Math.round(invoice.totalAmount * 0.04), // 4% application fee
        metadata: {
          internalInvoiceId: invoice.id,
          workspaceId: invoice.workspaceId,
        }
      }, {
        stripeAccount: workspace.stripeConnectAccountId,
      });

      // Add line items to the invoice using simple invoice items
      for (const item of lineItems) {
        try {
          // Use amount (total price) with description for simple invoice items
          // This approach works reliably without requiring product creation
          await stripe.invoiceItems.create({
            customer: customer.stripeCustomerId,
            invoice: stripeInvoice.id,
            amount: item.totalPrice, // Use total price for the line item
            currency: invoice.currency.toLowerCase(),
            description: item.description,
          }, {
            stripeAccount: workspace.stripeConnectAccountId,
          });
        } catch (itemError) {
          console.error(`Failed to create invoice item for "${item.description}":`, itemError);
          // Continue with other items even if one fails
          const errorMessage = itemError instanceof Error ? itemError.message : String(itemError);
          throw new Error(`Failed to add line item "${item.description}": ${errorMessage}`);
        }
      }

      // Finalize the invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id, {}, {
        stripeAccount: workspace.stripeConnectAccountId,
      });

      // Send the invoice to the customer
      await stripe.invoices.sendInvoice(finalizedInvoice.id, {}, {
        stripeAccount: workspace.stripeConnectAccountId,
      });

      // Update internal invoice with Stripe data
      await storage.updateSalesInvoice(invoiceId, {
        stripeInvoiceId: finalizedInvoice.id,
        stripeConnectAccountId: workspace.stripeConnectAccountId,
        stripeHostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
        stripeInvoicePdf: finalizedInvoice.invoice_pdf,
        stripePaymentStatus: (finalizedInvoice as any).payment_status,
        stripeAmountDue: finalizedInvoice.amount_due,
        stripeAmountPaid: finalizedInvoice.amount_paid,
        stripeApplicationFeeAmount: (finalizedInvoice as any).application_fee_amount,
        status: 'sent',
        sentDate: new Date(),
      });

      res.json({
        stripeInvoiceId: finalizedInvoice.id,
        hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
        invoicePdf: finalizedInvoice.invoice_pdf,
      });
    } catch (error) {
      console.error("Error creating Stripe invoice:", error);
      res.status(500).json({ message: "Failed to create Stripe invoice", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Update invoice status from Stripe webhook
  app.post("/api/stripe/invoicing/webhook", async (req, res) => {
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
        case 'invoice.created': {
          const stripeInvoice = event.data.object as any;
          console.log('Stripe invoice created:', stripeInvoice.id);
          
          if (stripeInvoice.metadata?.internalInvoiceId) {
            const invoiceId = stripeInvoice.metadata.internalInvoiceId;
            
            await storage.updateSalesInvoice(invoiceId, {
              stripePaymentStatus: stripeInvoice.payment_status,
              stripeAmountDue: stripeInvoice.amount_due,
            });
          }
          break;
        }

        case 'invoice.finalized': {
          const stripeInvoice = event.data.object as any;
          console.log('Stripe invoice finalized:', stripeInvoice.id);
          
          if (stripeInvoice.metadata?.internalInvoiceId) {
            const invoiceId = stripeInvoice.metadata.internalInvoiceId;
            
            await storage.updateSalesInvoice(invoiceId, {
              stripePaymentStatus: stripeInvoice.payment_status,
              stripeAmountDue: stripeInvoice.amount_due,
              stripeHostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
              stripeInvoicePdf: stripeInvoice.invoice_pdf,
            });
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const stripeInvoice = event.data.object as any;
          console.log('Stripe invoice payment succeeded:', stripeInvoice.id);
          
          if (stripeInvoice.metadata?.internalInvoiceId) {
            const invoiceId = stripeInvoice.metadata.internalInvoiceId;
            
            // Update invoice status to paid
            await storage.updateSalesInvoice(invoiceId, {
              status: 'paid',
              paidDate: new Date(),
              stripePaymentStatus: stripeInvoice.payment_status,
              stripeAmountPaid: stripeInvoice.amount_paid,
              stripeAmountDue: stripeInvoice.amount_due,
            });

            // Create customer payment record
            const invoice = await storage.getSalesInvoice(invoiceId);
            if (invoice) {
              await storage.createCustomerPayment({
                workspaceId: invoice.workspaceId,
                customerId: invoice.customerId,
                invoiceId: invoiceId,
                amount: stripeInvoice.amount_paid,
                currency: stripeInvoice.currency.toUpperCase(),
                method: 'stripe_invoice',
                paymentDate: new Date(),
                externalTransactionId: stripeInvoice.id,
                createdById: null,
              });
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const stripeInvoice = event.data.object as any;
          console.log('Stripe invoice payment failed:', stripeInvoice.id);
          
          if (stripeInvoice.metadata?.internalInvoiceId) {
            const invoiceId = stripeInvoice.metadata.internalInvoiceId;
            
            await storage.updateSalesInvoice(invoiceId, {
              status: 'overdue',
              stripePaymentStatus: stripeInvoice.payment_status,
              stripeAmountDue: stripeInvoice.amount_due,
            });
          }
          break;
        }

        case 'invoice.payment_action_required': {
          const stripeInvoice = event.data.object as any;
          console.log('Stripe invoice payment action required:', stripeInvoice.id);
          
          if (stripeInvoice.metadata?.internalInvoiceId) {
            const invoiceId = stripeInvoice.metadata.internalInvoiceId;
            
            await storage.updateSalesInvoice(invoiceId, {
              stripePaymentStatus: stripeInvoice.payment_status,
              stripeAmountDue: stripeInvoice.amount_due,
            });
          }
          break;
        }

        case 'invoice.sent': {
          const stripeInvoice = event.data.object as any;
          console.log('Stripe invoice sent:', stripeInvoice.id);
          
          if (stripeInvoice.metadata?.internalInvoiceId) {
            const invoiceId = stripeInvoice.metadata.internalInvoiceId;
            
            await storage.updateSalesInvoice(invoiceId, {
              status: 'sent',
              sentDate: new Date(),
              stripePaymentStatus: stripeInvoice.payment_status,
            });
          }
          break;
        }

        case 'invoice.voided': {
          const stripeInvoice = event.data.object as any;
          console.log('Stripe invoice voided:', stripeInvoice.id);
          
          if (stripeInvoice.metadata?.internalInvoiceId) {
            const invoiceId = stripeInvoice.metadata.internalInvoiceId;
            
            await storage.updateSalesInvoice(invoiceId, {
              status: 'cancelled',
            });
          }
          break;
        }

        default:
          console.log(`Unhandled Stripe invoice event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error processing Stripe invoice webhook:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  });

  return httpServer;
}
