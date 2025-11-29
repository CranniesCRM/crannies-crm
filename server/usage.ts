import { db } from "./db";
import { issues, workspaceSubscriptions } from "@shared/schema";
import { eq, and, ne } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Get the count of active deals (issues) for a workspace
 * Active deals are issues that are not closed or lost
 */
export async function getActiveDealsCount(workspaceId: string): Promise<number> {
  const [result] = await db
    .select({ count: db.$count(issues) })
    .from(issues)
    .where(
      and(
        eq(issues.workspaceId, workspaceId),
        ne(issues.status, "closed"),
        ne(issues.status, "lost")
      )
    );

  return result?.count || 0;
}

/**
 * Report usage for all active subscriptions
 * This should be run monthly or when usage changes significantly
 */
export async function reportUsageForAllSubscriptions(): Promise<void> {
  console.log("Starting monthly usage reporting...");

  try {
    // Get all active workspace subscriptions
    const subscriptions = await db
      .select()
      .from(workspaceSubscriptions)
      .where(eq(workspaceSubscriptions.status, "active"));

    console.log(`Found ${subscriptions.length} active subscriptions to report usage for`);

    for (const subscription of subscriptions) {
      try {
        // Get current active deals count for this workspace
        const activeDealsCount = await getActiveDealsCount(subscription.workspaceId);

        // Report usage to Stripe
        if (subscription.stripeCustomerId) {
          await stripe.billing.meterEvents.create({
            event_name: 'active_deals', // This needs to match your meter in Stripe Dashboard
            payload: {
              stripe_customer_id: subscription.stripeCustomerId,
              value: activeDealsCount.toString(),
            },
          });
        }

        console.log(`Reported ${activeDealsCount} active deals for workspace ${subscription.workspaceId}`);
      } catch (error) {
        console.error(`Failed to report usage for workspace ${subscription.workspaceId}:`, error);
        // Continue with other subscriptions even if one fails
      }
    }

    console.log("Monthly usage reporting completed");
  } catch (error) {
    console.error("Error in monthly usage reporting:", error);
  }
}

/**
 * Report usage for a specific workspace (useful for immediate updates)
 */
export async function reportUsageForWorkspace(workspaceId: string): Promise<void> {
  try {
    // Get the workspace subscription
    const [subscription] = await db
      .select()
      .from(workspaceSubscriptions)
      .where(
        and(
          eq(workspaceSubscriptions.workspaceId, workspaceId),
          eq(workspaceSubscriptions.status, "active")
        )
      );

    if (!subscription) {
      console.log(`No active subscription found for workspace ${workspaceId}`);
      return;
    }

    // Get active deals count
    const activeDealsCount = await getActiveDealsCount(workspaceId);

    // Report to Stripe
    if (subscription.stripeCustomerId) {
      await stripe.billing.meterEvents.create({
        event_name: 'active_deals',
        payload: {
          stripe_customer_id: subscription.stripeCustomerId,
          value: activeDealsCount.toString(),
        },
      });
    }

    console.log(`Reported ${activeDealsCount} active deals for workspace ${workspaceId}`);
  } catch (error) {
    console.error(`Failed to report usage for workspace ${workspaceId}:`, error);
  }
}