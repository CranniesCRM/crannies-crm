import { Client } from "stytch";
import { storage } from "../server/storage";
import { sendChatInvitation, sendTeamInvitation } from "../server/resend";
import { randomBytes } from "crypto";
import { calculateTrialEndDate } from "../shared/trial";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Initialize Stytch client
const stytch = new Client({
  project_id: process.env.STYTCH_PROJECT_ID!,
  secret: process.env.STYTCH_SECRET!,
});

// Helper functions
function generateToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

function generatePasscode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

function generateSlug(): string {
  return randomBytes(8).toString("hex");
}

// Cookie parsing helper
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  });
  return cookies;
}

// Response helper
function createResponse(statusCode: number, body: any, headers: Record<string, string> = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

// Netlify Function handler
export async function handler(event: any, context: any) {
  const path = event.path || '';
  const method = event.httpMethod;
  const headers = event.headers || {};
  const cookies = parseCookies(headers.cookie || '');

  // Set CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  };

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    // AUTH ROUTES (from stytchAuth.ts)
    if (path === '/api/login' && method === 'POST') {
      let body: any = {};
      if (event.body) {
        body = event.body.startsWith('{') ? JSON.parse(event.body) : {};
      }

      const { email } = body;
      if (!email) {
        return createResponse(400, { message: "Email required" }, corsHeaders);
      }

      const protocol = headers['x-forwarded-proto'] || 'https';
      const host = headers.host || headers.Host || headers['x-forwarded-host'];
      const redirectUrl = `${protocol}://${host}/api/authenticate`;

      console.log('Netlify Login - Constructed redirect URL:', redirectUrl);
      console.log('Netlify Login - Host header:', host);
      console.log('Netlify Login - Protocol:', protocol);

      const response = await stytch.magicLinks.email.loginOrCreate({
        email,
        login_magic_link_url: redirectUrl,
        signup_magic_link_url: redirectUrl,
        login_expiration_minutes: 60,
        signup_expiration_minutes: 60,
      });

      return createResponse(200, { 
        success: true, 
        user_id: response.user_id,
        message: "Magic link sent to your email" 
      }, corsHeaders);
    }

    // Resend magic link
    if (path === '/api/resend-magic-link' && method === 'POST') {
      let body: any = {};
      if (event.body) {
        body = event.body.startsWith('{') ? JSON.parse(event.body) : {};
      }

      const { email } = body;
      if (!email) {
        return createResponse(400, { message: "Email required" }, corsHeaders);
      }

      const protocol = headers['x-forwarded-proto'] || 'https';
      const host = headers.host || headers.Host || headers['x-forwarded-host'];
      const redirectUrl = `${protocol}://${host}/api/authenticate`;

      const response = await stytch.magicLinks.email.loginOrCreate({
        email,
        login_magic_link_url: redirectUrl,
        signup_magic_link_url: redirectUrl,
        login_expiration_minutes: 60,
        signup_expiration_minutes: 60,
      });

      return createResponse(200, { 
        success: true, 
        user_id: response.user_id,
        message: "New magic link sent to your email" 
      }, corsHeaders);
    }

    if (path === '/api/authenticate' && method === 'GET') {
      // Enhanced token extraction - handle multiple token parameter names
      let token = event.queryStringParameters?.token;
      if (!token) {
        token = event.queryStringParameters?.stytch_token || event.queryStringParameters?.public_token;
      }

      console.log('Netlify Auth - Query params:', event.queryStringParameters);
      console.log('Netlify Auth - Extracted token:', token);

      if (!token) {
        console.error('Netlify Auth - No token found:', event.queryStringParameters);
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          body: `
            <html>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1>Invalid Magic Link</h1>
                <p>The magic link is missing or invalid.</p>
                <p><a href="/login" style="color: #007bff; text-decoration: none;">← Back to Login</a></p>
              </body>
            </html>
          `,
        };
      }

      try {
        console.log('Netlify Auth - Attempting to authenticate token:', token);
        
        const response = await stytch.magicLinks.authenticate({
          token,
          session_duration_minutes: 60 * 24 * 7, // 1 week
        });

        console.log('Netlify Auth - Authentication successful:', {
          user_id: response.user.user_id,
          email: response.user.emails[0]?.email,
          session_token: response.session_token ? "present" : "missing"
        });

        // Upsert user in our database
        const email = response.user.emails[0]?.email;
        if (email) {
          await storage.upsertUser({
            id: response.user.user_id,
            email,
          });
        }

        // Set session cookie
        const setCookieHeader = `stytch_session=${response.session_token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
        
        console.log('Netlify Auth - Setting cookie:', setCookieHeader);
        console.log('Netlify Auth - Redirecting to: /');

        // For SPAs, return HTML that handles the redirect client-side
        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html',
            'Set-Cookie': setCookieHeader,
          },
          body: `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Authentication Successful</title>
              <script>
                // Redirect to dashboard after a short delay
                setTimeout(function() {
                  window.location.href = '/';
                }, 100);
              </script>
            </head>
            <body>
              <p>Authentication successful! Redirecting...</p>
            </body>
            </html>
          `,
        };
      } catch (error: any) {
        console.error('Authentication error:', error);
        
        // Handle specific Stytch errors
        if (error.error_type === "invalid_authentication" || 
            error.error_message?.includes("expired") ||
            error.error_message?.includes("already been used") ||
            error.error_type === "unable_to_auth_magic_link") {
          return {
            statusCode: 410,
            headers: { ...corsHeaders, 'Content-Type': 'text/html' },
            body: `
              <html>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                  <h1>Magic Link Expired or Already Used</h1>
                  <p>This magic link has expired or has already been used.</p>
                  <p><a href="/login" style="color: #007bff; text-decoration: none; margin-right: 20px;">← Back to Login</a></p>
                  <button onclick="resendMagicLink()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Send Another Magic Link</button>
                  <script>
                    async function resendMagicLink() {
                      const email = prompt("Enter your email address:");
                      if (email) {
                        try {
                          const response = await fetch('/api/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email })
                          });
                          if (response.ok) {
                            alert('Magic link sent! Please check your email.');
                            window.location.href = '/login';
                          } else {
                            alert('Failed to send magic link. Please try again.');
                          }
                        } catch (error) {
                          alert('Failed to send magic link. Please try again.');
                        }
                      }
                    }
                  </script>
                </body>
              </html>
            `,
          };
        }

        return {
          statusCode: 500,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          body: `
            <html>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1>Authentication Failed</h1>
                <p>There was an error authenticating your magic link.</p>
                <p><a href="/login" style="color: #007bff; text-decoration: none;">← Back to Login</a></p>
              </body>
            </html>
          `,
        };
      }
    }

    if (path === '/api/logout') {
      const sessionToken = cookies.stytch_session;
      if (sessionToken) {
        try {
          await stytch.sessions.revoke({ session_token: sessionToken });
        } catch (error) {
          console.error("Error revoking session:", error);
        }
      }

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Set-Cookie': 'stytch_session=; HttpOnly; Secure; Max-Age=0',
        },
        body: JSON.stringify({ success: true }),
      };
    }

    if (path === '/api/auth/user') {
      const sessionToken = cookies.stytch_session;
      
      if (!sessionToken) {
        return createResponse(401, { message: 'Unauthorized' }, corsHeaders);
      }

      try {
        const response = await stytch.sessions.authenticate({
          session_token: sessionToken,
        });

        // Get user from database
        const user = await storage.getUser(response.session.user_id);
        
        if (!user) {
          return createResponse(401, { message: 'Unauthorized' }, corsHeaders);
        }

        return createResponse(200, user, corsHeaders);
      } catch (error) {
        console.error('Session validation error:', error);
        return createResponse(401, { message: 'Unauthorized' }, corsHeaders);
      }
    }

    // If we get here, no route matched
    return createResponse(404, { message: "Not found" }, corsHeaders);

  } catch (error) {
    console.error('Function error:', error);
    return createResponse(500, { 
      message: "Internal Server Error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, corsHeaders);
  }
}