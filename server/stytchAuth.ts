import { Client } from "stytch";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

const stytch = new Client({
  project_id: process.env.STYTCH_PROJECT_ID!,
  secret: process.env.STYTCH_SECRET!,
});

export function getSession() {
  // For Stytch, we don't need a complex session store
  // Stytch handles session validation
  return (req: any, res: any, next: any) => {
    // Stytch session token is in cookies
    const sessionToken = req.cookies?.stytch_session;
    if (sessionToken) {
      req.sessionToken = sessionToken;
    }
    next();
  };
}

async function upsertUser(stytchUserId: string, email: string) {
  await storage.upsertUser({
    id: stytchUserId,
    email,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Login with magic link
  app.post("/api/login", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const protocol = req.protocol;
      const host = req.get("host");
      const redirectUrl = `${protocol}://${host}/api/authenticate`;

      const response = await stytch.magicLinks.email.loginOrCreate({
        email: email.toLowerCase().trim(), // Normalize email
        login_magic_link_url: redirectUrl,
        signup_magic_link_url: redirectUrl,
        login_expiration_minutes: 60,
        signup_expiration_minutes: 60,
      });

      res.json({ success: true, user_id: response.user_id, message: "Magic link sent to your email" });
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Handle specific Stytch errors
      if (error.error_type === "email_not_found") {
        return res.status(404).json({ message: "User not found. Please check your email or sign up first." });
      }
      
      res.status(500).json({ message: "Failed to send magic link. Please try again later." });
    }
  });

  // Resend magic link
  app.post("/api/resend-magic-link", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }

      const protocol = req.protocol;
      const host = req.get("host");
      const redirectUrl = `${protocol}://${host}/api/authenticate`;

      // Use loginOrCreate to send a fresh magic link
      const response = await stytch.magicLinks.email.loginOrCreate({
        email,
        login_magic_link_url: redirectUrl,
        signup_magic_link_url: redirectUrl,
        login_expiration_minutes: 60,
        signup_expiration_minutes: 60,
      });

      res.json({ success: true, user_id: response.user_id, message: "New magic link sent to your email" });
    } catch (error) {
      console.error("Resend magic link error:", error);
      res.status(500).json({ message: "Failed to send magic link" });
    }
  });

  // Authenticate magic link
  app.get("/api/authenticate", async (req, res) => {
    // Try different token parameters that Stytch might use
    let token = req.query.token as string;
    
    // If no token parameter, check for stytch_token or public_token
    if (!token) {
      token = req.query.stytch_token as string || req.query.public_token as string;
    }
    
    // Debug logging
    console.log("Authenticate request query:", req.query);
    console.log("Extracted token:", token);
    
    if (!token || typeof token !== "string") {
      console.error("No valid token found in request:", req.query);
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Invalid Magic Link</h1>
            <p>The magic link is missing or invalid.</p>
            <p>Request details: ${JSON.stringify(req.query)}</p>
            <p><a href="/login" style="color: #007bff; text-decoration: none;">← Back to Login</a></p>
          </body>
        </html>
      `);
    }

    try {
      console.log("Attempting to authenticate token:", token);
      
      const response = await stytch.magicLinks.authenticate({
        token,
        session_duration_minutes: 60 * 24 * 7, // 1 week
      });

      console.log("Authentication successful:", {
        user_id: response.user.user_id,
        email: response.user.emails[0]?.email,
        session_token: response.session_token ? "present" : "missing"
      });

      // Upsert user in our database
      await upsertUser(response.user.user_id, response.user.emails[0].email);
      
      console.log("User upserted successfully");

      // Set session cookie
      res.cookie("stytch_session", response.session_token, {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
        sameSite: "lax",
      });

      // Redirect to home
      res.redirect("/");
    } catch (error: any) {
      console.error("Authentication error details:", {
        message: error.message,
        error_type: error.error_type,
        error_message: error.error_message,
        error_url: error.error_url,
        request_id: error.request_id,
        token: token,
        query: req.query
      });
      
      // Handle specific Stytch errors
      if (error.error_type === "invalid_authentication" || 
          error.error_message?.includes("expired") ||
          error.error_message?.includes("already been used") ||
          error.error_type === "unable_to_auth_magic_link") {
        return res.status(410).send(`
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
        `);
      }
      
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Authentication Failed</h1>
            <p>There was an error authenticating your magic link.</p>
            <p>Error: ${error.error_message || error.message || 'Unknown error'}</p>
            <p><a href="/login" style="color: #007bff; text-decoration: none;">← Back to Login</a></p>
          </body>
        </html>
      `);
    }
  });

  // Logout endpoint
  app.post("/api/logout", async (req, res) => {
    const sessionToken = req.cookies?.stytch_session;
    if (sessionToken) {
      try {
        await stytch.sessions.revoke({ session_token: sessionToken });
      } catch (error) {
        console.error("Error revoking session:", error);
        // Continue with logout even if revoke fails
      }
    }
    res.clearCookie("stytch_session");
    res.json({ success: true });
  });

  // Logout endpoint (GET for browser links)
  app.get("/api/logout", async (req, res) => {
    const sessionToken = req.cookies?.stytch_session;
    if (sessionToken) {
      try {
        await stytch.sessions.revoke({ session_token: sessionToken });
      } catch (error) {
        console.error("Error revoking session:", error);
        // Continue with logout even if revoke fails
      }
    }
    res.clearCookie("stytch_session");
    res.redirect("/");
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const sessionToken = req.sessionToken;
  const apiKey = req.headers.authorization?.replace('Bearer ', '');

  // Try API key authentication first
  if (apiKey) {
    try {
      const { storage } = await import("./storage");
      const user = await storage.getUserByApiKey(apiKey);
      if (user) {
        req.user = {
          id: user.id,
          claims: {
            sub: user.id,
          },
        };
        return next();
      }
    } catch (error) {
      console.error("API key validation error:", error);
    }
  }

  // Fall back to session token authentication
  if (!sessionToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const response = await stytch.sessions.authenticate({
      session_token: sessionToken,
    });

    // Attach user info to request
    req.user = {
      id: response.session.user_id,
      claims: {
        sub: response.session.user_id,
      },
    };

    next();
  } catch (error) {
    console.error("Session validation error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};