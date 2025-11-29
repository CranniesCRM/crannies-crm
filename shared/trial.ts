import type { Workspace } from "./schema";

/**
 * Checks if a workspace is currently in its trial period
 * @param workspace The workspace to check
 * @returns true if the workspace is in trial, false otherwise
 * @throws Error if workspace has no trial end date
 */
export function isWorkspaceInTrial(workspace: Workspace): boolean {
  if (!workspace.trialEndDate) {
    throw new Error("Workspace has no trial end date");
  }

  // If subscription is active, it's not in trial
  if (workspace.subscriptionStatus === 'active') {
    return false;
  }

  const now = new Date();
  return now < workspace.trialEndDate;
}

/**
 * Calculates the trial end date (7 days from workspace creation)
 * @param creationDate The date the workspace was created
 * @returns Date object representing when the trial ends
 */
export function calculateTrialEndDate(creationDate: Date): Date {
  const trialEndDate = new Date(creationDate);
  trialEndDate.setDate(trialEndDate.getDate() + 7);
  return trialEndDate;
}

/**
 * Checks if a workspace's trial has expired
 * @param workspace The workspace to check
 * @returns true if the trial has expired, false otherwise
 */
export function isTrialExpired(workspace: Workspace): boolean {
  // If subscription is active, trial is not expired
  if (workspace.subscriptionStatus === 'active') {
    return false;
  }

  // If no trial end date, assume not in trial
  if (!workspace.trialEndDate) {
    return false;
  }

  // Check if trial has expired
  const now = new Date();
  const trialEnd = new Date(workspace.trialEndDate);
  return now > trialEnd;
}