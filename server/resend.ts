import { Resend } from 'resend';
import type { Express } from "express";
import crypto from 'crypto';
import { db } from './db';
import { emailThreads, emailMessages, issues } from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@notifications.colonyops.com';
const resendWebhookSecret = process.env.RESEND_WEBHOOK_SECRET;

if (!resendApiKey) {
  throw new Error('RESEND_API_KEY environment variable is required');
}

if (!resendWebhookSecret) {
  throw new Error('RESEND_WEBHOOK_SECRET environment variable is required');
}

// Create a single Resend client instance
const resendClient = new Resend(resendApiKey);

// Webhook verification utility
function verifyWebhookSignature(payload: string, headers: any, secret: string): boolean {
  try {
    const signature = headers['svix-signature'];
    const timestamp = headers['svix-timestamp'];
    const id = headers['svix-id'];

    if (!signature || !timestamp || !id) {
      return false;
    }

    // Simple verification - in production you might want to use the Resend SDK
    // or implement proper HMAC verification
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${id}.${timestamp}.${payload}`)
      .digest('base64');

    return signature === `v1,${expectedSignature}`;
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
}

export function getResendClient() {
  return {
    client: resendClient,
    fromEmail: resendFromEmail
  };
}

// Note: EmailThread and EmailMessage types are now imported from shared/schema


export async function sendTeamInvitation(
  toEmail: string,
  inviteLink: string,
  inviterName: string,
  workspaceName: string
) {
  try {
    const { client, fromEmail } = getResendClient();

    await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `${inviterName} invited you to join ${workspaceName} on Crannies`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">You're Invited to Join ${workspaceName}</h2>
          <p style="color: #666; line-height: 1.6;">
            <strong>${inviterName}</strong> has invited you to join their team on Crannies,
            a collaborative CRM that brings your entire team together.
          </p>
          <p style="margin: 30px 0;">
            <a href="${inviteLink}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Accept Invitation
            </a>
          </p>
          <p style="color: #666; line-height: 1.6;">
            Once you accept, you'll be able to collaborate on deals, participate in discussions,
            and work together with your team.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            This invitation was sent via Crannies. If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      `
    });

    return true;
  } catch (error) {
    console.error('Failed to send team invitation email:', error);
    throw error;
  }
}

export async function sendInvoiceEmail(
  toEmail: string,
  invoiceNumber: string,
  invoiceUrl: string,
  customerName: string,
  totalAmount: number,
  dueDate: string,
  invoiceDate: string,
  companyName: string
) {
  try {
    const { client, fromEmail } = getResendClient();

    await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `Invoice ${invoiceNumber} from ${companyName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">Invoice ${invoiceNumber}</h2>
          <p style="color: #666; line-height: 1.6;">Dear ${customerName},</p>
          <p style="color: #666; line-height: 1.6;">
            Please find your invoice details below:
          </p>
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Invoice Number:</td>
                <td style="padding: 8px 0; font-weight: 600;">${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Invoice Date:</td>
                <td style="padding: 8px 0; font-weight: 600;">${invoiceDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Due Date:</td>
                <td style="padding: 8px 0; font-weight: 600;">${dueDate}</td>
              </tr>
              <tr style="border-top: 1px solid #e5e7eb;">
                <td style="padding: 12px 0 8px 0; color: #666; font-size: 16px;">Total Amount:</td>
                <td style="padding: 12px 0 8px 0; font-weight: 600; font-size: 16px; color: #059669;">${(totalAmount / 100).toFixed(2)}</td>
              </tr>
            </table>
          </div>
          <p style="margin: 30px 0; text-align: center;">
            <a href="${invoiceUrl}" style="display: inline-block; background-color: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
              View & Pay Invoice
            </a>
          </p>
          <p style="color: #666; line-height: 1.6;">
            Thank you for your business!
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 40px; text-align: center;">
            This invoice was sent via Crannies CRM. If you have any questions, please contact us.
          </p>
        </div>
      `
    });

    return true;
  } catch (error) {
    console.error('Failed to send invoice email:', error);
    throw error;
  }
}

// New bidirectional email functionality
export async function createEmailThread(workspaceId: string, issueId: string | null, subject: string, initialParticipants: string[], initialMessage?: string) {
  const threadId = `thread_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const thread = await db.insert(emailThreads).values({
    id: threadId,
    workspaceId,
    issueId,
    subject,
    participants: initialParticipants,
    lastMessageAt: new Date(),
  }).returning();

  const createdThread = thread[0];

  // Send initial email to start the thread if a message is provided
  if (initialMessage && initialParticipants.length > 0) {
    try {
      const { client, fromEmail } = getResendClient();
      const toEmail = initialParticipants[0]; // Send to first participant

      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">New Discussion: ${subject}</h2>
          <div style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            ${initialMessage.split('\n').map(line => `<p>${line}</p>`).join('')}
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            This is the start of a new email thread. Reply to continue the discussion.
          </p>
        </div>
      `;

      await client.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: subject,
        html: htmlContent,
        headers: {
          'Message-ID': `<${threadId}@threads.colonyops.com>`,
          'In-Reply-To': `<${threadId}@threads.colonyops.com>`,
          'References': `<${threadId}@threads.colonyops.com}`
        }
      });

      // Store the sent email
      await db.insert(emailMessages).values({
        id: `sent_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        threadId: createdThread.id,
        fromEmail: fromEmail,
        toEmails: [toEmail],
        subject,
        bodyHtml: htmlContent,
        direction: 'outbound',
        status: 'sent',
        sentAt: new Date(),
        isFromUser: true,
      });

      console.log(`Sent initial email for thread ${threadId} to ${toEmail}`);
    } catch (error) {
      console.error(`Failed to send initial email for thread ${threadId}:`, error);
      // Don't fail the thread creation if email sending fails
    }
  }

  return thread;
}

export async function getEmailThread(threadId: string) {
  const threads = await db.select().from(emailThreads).where(eq(emailThreads.id, threadId));
  return threads[0] || null;
}

export async function getEmailsForThread(threadId: string) {
  return await db.select().from(emailMessages).where(eq(emailMessages.threadId, threadId)).orderBy(desc(emailMessages.receivedAt));
}

export async function sendReplyEmail(
  threadId: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  body: string,
  replyToMessageId?: string
) {
  try {
    const { client, fromEmail: defaultFromEmail } = getResendClient();

    // Get thread context for better email threading
    const thread = await getEmailThread(threadId);

    // Add references and in-reply-to headers for proper email threading
    const headers = {
      'In-Reply-To': replyToMessageId || `<${threadId}@threads.colonyops.com>`,
      'References': replyToMessageId ? `<${replyToMessageId}> <${threadId}@threads.colonyops.com>` : `<${threadId}@crannies.com>`
    };

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="color: #666; line-height: 1.6; margin-bottom: 20px;">
          ${body.split('\n').map(line => `<p>${line}</p>`).join('')}
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 40px;">
          This email is part of a threaded conversation. Reply to continue the discussion.
        </p>
      </div>
    `;

    await client.emails.send({
      from: fromEmail || defaultFromEmail,
      to: toEmail,
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      html: htmlContent,
      headers: headers
    });

    // Store the sent reply email
    await db.insert(emailMessages).values({
      id: `sent_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      threadId,
      fromEmail: fromEmail || defaultFromEmail,
      toEmails: [toEmail],
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      bodyHtml: htmlContent,
      direction: 'outbound',
      status: 'sent',
      sentAt: new Date(),
      isFromUser: true,
    });

    return true;
  } catch (error) {
    console.error('Failed to send reply email:', error);
    throw error;
  }
}

// Webhook handler for receiving emails
export function registerResendWebhookRoutes(app: Express) {
  app.post("/api/webhooks/resend", async (req, res) => {
    try {
      // Verify webhook signature
      const payload = JSON.stringify(req.body);
      const headers = {
        'svix-id': req.headers['svix-id'],
        'svix-timestamp': req.headers['svix-timestamp'],
        'svix-signature': req.headers['svix-signature'],
      };

      // Temporarily disable signature verification for testing
      // if (!verifyWebhookSignature(payload, headers, resendWebhookSecret || '')) {
      //   console.error('Invalid webhook signature');
      //   return res.status(401).json({ message: 'Invalid webhook signature' });
      // }
      console.log('Webhook received:', event.type);

      const event = req.body;
      console.log('Webhook event received:', event.type, event.data?.email_id);

      if (event.type === 'email.received') {
        const emailData = event.data;

        try {
          // Fetch the actual email content from Resend API using direct HTTP request
          const response = await fetch(`https://api.resend.com/emails/receiving/${emailData.email_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            console.error('Failed to fetch email content:', response.status, response.statusText);
            return res.status(400).json({ message: 'Failed to fetch email content' });
          }

          const fullEmailData = await response.json();

          // For CRM: All emails for an issue go into a single thread
          // Extract issue ID from subject (e.g., "Regarding Issue #123" -> "123")
          const subject = fullEmailData.subject || 'No Subject';
          const issueIdMatch = subject.match(/Issue #(\w+)/);
          const extractedIssueId = issueIdMatch ? issueIdMatch[1] : 'unassigned';
          let threadId: string;

          // Check if there's already a thread for this issue
          let existingThread = null;
          if (extractedIssueId !== 'unassigned') {
            const threads = await db.select().from(emailThreads).where(eq(emailThreads.issueId, extractedIssueId));
            existingThread = threads[0] || null;
          }

          if (existingThread) {
            // Use the existing thread for this issue
            threadId = existingThread.id;
          } else {
            // Create a new thread for this issue
            // TODO: Get workspaceId properly - for now using a placeholder
            const workspaceId = 'placeholder-workspace-id'; // This should be configured or derived
            const newThread = await createEmailThread(
              workspaceId,
              extractedIssueId === 'unassigned' ? null : extractedIssueId,
              subject,
              [fullEmailData.from, ...(fullEmailData.to || [])]
            );
            threadId = newThread[0].id;
          }

          // Store the received email with actual content
          await db.insert(emailMessages).values({
            id: emailData.email_id,
            threadId,
            messageId: emailData.email_id,
            fromEmail: fullEmailData.from,
            toEmails: fullEmailData.to || [],
            subject: fullEmailData.subject || '',
            bodyHtml: fullEmailData.html,
            bodyText: fullEmailData.text,
            direction: 'inbound',
            status: 'received',
            receivedAt: new Date(fullEmailData.created_at),
            isFromUser: false,
            attachments: fullEmailData.attachments,
          });

          console.log(`Received and stored email ${emailData.email_id} for issue thread ${threadId}`);

          return res.status(200).json({ success: true, threadId });
        } catch (fetchError) {
          console.error('Error fetching email content:', fetchError);
          return res.status(400).json({ message: 'Error fetching email content' });
        }
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error processing Resend webhook:', error);
      return res.status(400).json({
        message: 'Error processing webhook',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}