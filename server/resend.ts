// Resend integration for sending emails
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@resend.dev';

if (!resendApiKey) {
  throw new Error('RESEND_API_KEY environment variable is required');
}

// Create a single Resend client instance
const resendClient = new Resend(resendApiKey);

export function getResendClient() {
  return {
    client: resendClient,
    fromEmail: resendFromEmail
  };
}

export async function sendChatInvitation(
  toEmail: string,
  chatLink: string,
  passcode: string,
  issueTitle: string
) {
  try {
    const { client, fromEmail } = getResendClient();
    
    await client.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `You've been invited to a discussion: ${issueTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">You've Been Invited to Collaborate</h2>
          <p style="color: #666; line-height: 1.6;">
            You've been invited to join a conversation about: <strong>${issueTitle}</strong>
          </p>
          <p style="color: #666; line-height: 1.6;">
            Click the link below to join the discussion:
          </p>
          <p style="margin: 30px 0;">
            <a href="${chatLink}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Join Discussion
            </a>
          </p>
          <p style="color: #666; line-height: 1.6;">
            Your access passcode is: <strong style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${passcode}</strong>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 40px;">
            This invitation was sent via Crannies. If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      `
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send chat invitation email:', error);
    throw error;
  }
}

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
