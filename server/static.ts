import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // For Vercel, look for client files in the dist directory
  const distPath = process.env.VERCEL === '1'
    ? path.resolve(__dirname, "../client/dist")
    : path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.warn(`Could not find the build directory: ${distPath}, serving API-only mode`);
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (SPA routing)
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
