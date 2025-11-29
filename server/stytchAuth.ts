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

      const protocol = req.protocol;
      const host = req.get("host");
      const redirectUrl = `${protocol}://${host}/api/authenticate`;

      const response = await stytch.magicLinks.email.loginOrCreate({
        email,
        login_magic_link_url: redirectUrl,
        signup_magic_link_url: redirectUrl,
        login_expiration_minutes: 60,
        signup_expiration_minutes: 60,
      });

      res.json({ success: true, user_id: response.user_id });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to send magic link" });
    }
  });

  // Authenticate magic link
  app.get("/api/authenticate", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).send("Invalid token");
      }

      const response = await stytch.magicLinks.authenticate({
        token,
        session_duration_minutes: 60 * 24 * 7, // 1 week
      });

      // Upsert user in our database
      await upsertUser(response.user.user_id, response.user.emails[0].email);

      // Set session cookie
      res.cookie("stytch_session", response.session_token, {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
        sameSite: "lax",
      });

      // Redirect to home
      res.redirect("/");
    } catch (error) {
      console.error("Authentication error:", error);
      res.status(500).send("Authentication failed");
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