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
      const host = headers.host;
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
        message: "Magic link sent to your email" 
      }, corsHeaders);
    }

    if (path === '/api/authenticate' && method === 'GET') {
      const token = event.queryStringParameters?.token;
      if (!token) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          body: '<h1>Invalid token</h1>',
        };
      }

      const response = await stytch.magicLinks.authenticate({
        token,
        session_duration_minutes: 60 * 24 * 7, // 1 week
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

      // Redirect to home
      return {
        statusCode: 302,
        headers: {
          ...corsHeaders,
          'Set-Cookie': setCookieHeader,
          'Location': '/',
        },
        body: '',
      };
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