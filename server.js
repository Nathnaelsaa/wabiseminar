import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { google } from "googleapis";
import multer from "multer";
import fs from "fs";
import jwt from "jsonwebtoken";
import { db, initializeDbConnection } from "./database.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "wabiseminar-jwt-secret-key-2026";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
const initDb = async () => {
  if (!(await db.schema.hasTable("meetings"))) {
    await db.schema.createTable("meetings", (table) => {
      table.string("id").primary();
      table.string("name");
      table.string("host_id");
      table.string("password");
      table.timestamp("scheduled_at").nullable();
      table.json("settings");
      table.timestamp("created_at").defaultTo(db.fn.now());
    });
  } else {
    // Check and add columns if they don't exist
    if (!(await db.schema.hasColumn("meetings", "password"))) {
      await db.schema.alterTable("meetings", (table) => {
        table.string("password");
      });
    }
    if (!(await db.schema.hasColumn("meetings", "scheduled_at"))) {
      await db.schema.alterTable("meetings", (table) => {
        table.timestamp("scheduled_at").nullable();
      });
    }
  }
  if (!(await db.schema.hasTable("chat_messages"))) {
    await db.schema.createTable("chat_messages", (table) => {
      table.string("id").primary();
      table.string("meeting_id");
      table.string("user_id");
      table.string("user_name");
      table.text("content");
      table.timestamp("timestamp").defaultTo(db.fn.now());
    });
  }
  if (!(await db.schema.hasTable("polls"))) {
    await db.schema.createTable("polls", (table) => {
      table.string("id").primary();
      table.string("meeting_id");
      table.string("question");
      table.json("options");
      table.boolean("active").defaultTo(true);
      table.timestamp("created_at").defaultTo(db.fn.now());
    });
  }
  if (!(await db.schema.hasTable("poll_responses"))) {
    await db.schema.createTable("poll_responses", (table) => {
      table.increments("id").primary();
      table.string("poll_id");
      table.string("user_id");
      table.integer("answer_index");
    });
  }
  if (!(await db.schema.hasTable("meeting_allowlist"))) {
    await db.schema.createTable("meeting_allowlist", (table) => {
      table.increments("id").primary();
      table.string("meeting_id");
      table.string("email");
      table.string("name");
    });
  }
  if (!(await db.schema.hasTable("join_requests"))) {
    await db.schema.createTable("join_requests", (table) => {
      table.string("id").primary();
      table.string("meeting_id");
      table.string("user_id");
      table.string("user_name");
      table.string("email");
      table.string("status").defaultTo("pending"); // pending, approved, rejected
      table.timestamp("created_at").defaultTo(db.fn.now());
    });
  }
  if (!(await db.schema.hasTable("global_allowlist"))) {
    await db.schema.createTable("global_allowlist", (table) => {
      table.increments("id").primary();
      table.string("email").unique();
      table.string("name");
      table.timestamp("created_at").defaultTo(db.fn.now());
    });
  }
  if (!(await db.schema.hasTable("users"))) {
    await db.schema.createTable("users", (table) => {
      table.string("id").primary();
      table.string("email").unique();
      table.string("password");
      table.string("name");
      table.string("google_id").nullable();
      table.string("google_refresh_token").nullable();
      table.json("settings"); // Store user preferences like theme, notifications etc.
      table.timestamp("created_at").defaultTo(db.fn.now());
    });
  } else {
    // Check for google columns if users table exists
    if (!(await db.schema.hasColumn("users", "google_id"))) {
      await db.schema.alterTable("users", (table) => {
        table.string("google_id").nullable();
      });
    }
    if (!(await db.schema.hasColumn("users", "google_refresh_token"))) {
      await db.schema.alterTable("users", (table) => {
        table.string("google_refresh_token").nullable();
      });
    }
  }

  if (!(await db.schema.hasTable("recordings"))) {
    await db.schema.createTable("recordings", (table) => {
      table.string("id").primary();
      table.string("meeting_id");
      table.string("user_id");
      table.string("user_name");
      table.string("file_name");
      table.string("file_path");
      table.timestamp("created_at").defaultTo(db.fn.now());
    });
  }
};

async function startServer() {
  await initializeDbConnection();
  await initDb();
  
  const app = express();
  
  // Ensure recordings directory exists
  const recordingsDir = path.join(process.cwd(), "public", "recordings");
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  // Multer disk storage setup
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, recordingsDir);
    },
    filename: (req, file, cb) => {
      const fileExt = path.extname(file.originalname) || ".webm";
      const uniqueName = `recording-${req.body.meetingId || "unknown"}-${Date.now()}${fileExt}`;
      cb(null, uniqueName);
    }
  });
  const upload = multer({ storage });

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  app.use(express.json());
  app.use(express.static(path.join(process.cwd(), "public")));

  // Google OAuth Helper
  const getGoogleAuthClient = (req) => {
    let clientId = process.env.GOOGLE_CLIENT_ID;
    let clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (clientId) clientId = clientId.trim();
    if (clientSecret) clientSecret = clientSecret.trim();
    
    if (!clientId || !clientSecret || clientId === "your_google_client_id") {
      throw new Error("GOOGLE_OAUTH_MISSING");
    }

    const host = req.get("host");
    const protocol = req.get("x-forwarded-proto") || req.protocol;
    const origin = `${protocol}://${host}`;
    
    let baseUrl = (process.env.APP_URL || origin).trim();
    while (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }
    const callbackUrl = `${baseUrl}/api/auth/google/callback`;

    return new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
  };

  // Google OAuth Routes
  app.get("/api/auth/google/url", (req, res) => {
    try {
      const oauth2Client = getGoogleAuthClient(req);
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/gmail.modify",
          "https://www.googleapis.com/auth/gmail.send",
        ],
        prompt: "consent", // Force to get refresh token
      });
      res.json({ url });
    } catch (err) {
      if (err.message === "GOOGLE_OAUTH_MISSING") {
        return res.status(400).json({ 
          error: "Google OAuth credentials are missing. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the Secrets panel in Settings." 
        });
      }
      console.error(err);
      res.status(500).json({ error: "Critical: Failed to generate Auth URL" });
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const oauth2Client = getGoogleAuthClient(req);
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const { data: userInfo } = await oauth2.userinfo.get();

      let user = await db("users").where({ email: userInfo.email }).first();
      
      if (!user) {
        const userId = uuidv4();
        user = {
          id: userId,
          email: userInfo.email,
          name: userInfo.name,
          google_id: userInfo.id,
          google_refresh_token: tokens.refresh_token,
          settings: JSON.stringify({ theme: "light" }),
        };
        await db("users").insert(user);
      } else {
        const updateData = {
          google_id: userInfo.id,
        };
        if (tokens.refresh_token) {
          updateData.google_refresh_token = tokens.refresh_token;
        }
        await db("users").where({ id: user.id }).update(updateData);
        user = await db("users").where({ id: user.id }).first();
      }

      const { password: _, ...userData } = user;
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: ${JSON.stringify(userData)} }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Auth Success! Closing...</p>
          </body>
        </html>
      `);
    } catch (err) {
      console.error(err);
      res.status(500).send("Auth Failed");
    }
  });

  // Gmail API Routes
  app.get("/api/gmail/list", async (req, res) => {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const user = await db("users").where({ id: userId }).first();
      if (!user || !user.google_refresh_token) return res.status(400).json({ error: "Google account not linked" });

      const oauth2Client = getGoogleAuthClient(req);
      oauth2Client.setCredentials({ refresh_token: user.google_refresh_token });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      const response = await gmail.users.messages.list({ userId: "me", maxResults: 10 });
      
      const messages = await Promise.all((response.data.messages || []).map(async (msg) => {
        const fullMsg = await gmail.users.messages.get({ userId: "me", id: msg.id });
        const headers = fullMsg.data.payload.headers;
        const subject = headers.find(h => h.name === "Subject")?.value || "(No Subject)";
        const from = headers.find(h => h.name === "From")?.value || "Unknown";
        const date = headers.find(h => h.name === "Date")?.value || "";
        return {
          id: msg.id,
          subject,
          from,
          date,
          snippet: fullMsg.data.snippet,
        };
      }));

      res.json(messages);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/gmail/send", async (req, res) => {
    const userId = req.headers["x-user-id"];
    const { to, subject, body } = req.body;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const user = await db("users").where({ id: userId }).first();
      if (!user || !user.google_refresh_token) return res.status(400).json({ error: "Google account not linked" });

      const oauth2Client = getGoogleAuthClient(req);
      oauth2Client.setCredentials({ refresh_token: user.google_refresh_token });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
      const messageParts = [
        `To: ${to}`,
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        `Subject: ${utf8Subject}`,
        "",
        body,
      ];
      const message = messageParts.join("\r\n");
      const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    try {
      const existing = await db("users").where({ email }).first();
      if (existing) return res.status(400).json({ error: "User already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();
      const newUser = {
        id: userId,
        name,
        email,
        password: hashedPassword,
        settings: JSON.stringify({ theme: "light" }),
      };
      
      await db("users").insert(newUser);
      const { password: _, ...user } = newUser;
      
      // Generate JWT Token
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ ...user, token });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await db("users").where({ email }).first();
      if (!user) return res.status(400).json({ error: "Invalid credentials" });
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });
      
      const { password: _, ...userData } = user;
      
      // Generate JWT Token
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ ...userData, token });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    const { name, settings } = req.body;
    try {
      const updateData = {};
      if (name) updateData.name = name;
      if (settings) updateData.settings = JSON.stringify(settings);
      
      await db("users").where({ id: req.params.id }).update(updateData);
      const user = await db("users").where({ id: req.params.id }).first();
      const { password: _, ...userData } = user;
      res.json(userData);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // API Routes
  app.post("/api/meetings", async (req, res) => {
    const { name, hostId, password, scheduledAt } = req.body;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const meetingId = `wabiseminar-${dateStr}-${uuidv4().substring(0, 6)}`;
    await db("meetings").insert({
      id: meetingId,
      name: name || "New Meeting",
      host_id: hostId,
      password: password || null,
      scheduled_at: scheduledAt || null,
      settings: JSON.stringify({ locks: false, chatEnabled: true, active: true }),
    });
    res.json({ meetingId });
  });

  app.get("/api/meetings/:id", async (req, res) => {
    const meeting = await db("meetings").where({ id: req.params.id }).first();
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    
    const settings = JSON.parse(meeting.settings || "{}");
    if (settings.ended) {
      return res.status(403).json({ error: "This seminar has already concluded and is no longer accessible." });
    }
    
    res.json(meeting);
  });

  app.get("/api/meetings/:id/messages", async (req, res) => {
    const messages = await db("chat_messages")
      .where({ meeting_id: req.params.id })
      .orderBy("timestamp", "asc");
    res.json(messages);
  });

  // Recording Routes
  app.post("/api/recordings/upload", upload.single("recording"), async (req, res) => {
    try {
      const { meetingId, userId, userName } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No recording file received" });
      }

      const recordingId = uuidv4();
      const relativePath = `/recordings/${file.filename}`;

      await db("recordings").insert({
        id: recordingId,
        meeting_id: meetingId || "unknown",
        user_id: userId || "unknown",
        user_name: userName || "Unknown User",
        file_name: file.filename,
        file_path: relativePath,
      });

      console.log(`Saved recording file ${file.filename} for meeting ${meetingId} by ${userName}`);
      res.json({
        success: true,
        recording: {
          id: recordingId,
          filePath: relativePath,
          fileName: file.filename,
        }
      });
    } catch (err) {
      console.error("Recording upload failed", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/meetings/:id/recordings", async (req, res) => {
    try {
      const list = await db("recordings")
        .where({ meeting_id: req.params.id })
        .orderBy("created_at", "desc");
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/meetings/:id/polls", async (req, res) => {
    const polls = await db("polls")
      .where({ meeting_id: req.params.id })
      .orderBy("created_at", "desc");
    
    const pollsWithVotes = await Promise.all(polls.map(async (poll) => {
        const votes = await db("poll_responses").where({ poll_id: poll.id });
        return { ...poll, options: JSON.parse(poll.options), votes };
    }));
    
    res.json(pollsWithVotes);
  });

  app.get("/api/meetings/:id/participants", async (req, res) => {
    try {
      const participants = await db("join_requests")
        .where({ meeting_id: req.params.id, status: "approved" })
        .distinct("user_id", "user_name", "email");
      res.json(participants);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/meetings/history/:hostId", async (req, res) => {
    const meetings = await db("meetings")
      .where({ host_id: req.params.hostId })
      .orderBy("created_at", "desc");
    res.json(meetings);
  });

  app.post("/api/meetings/:id/allowlist", async (req, res) => {
    const { students } = req.body; // Array of { name, email }
    await db("meeting_allowlist").where({ meeting_id: req.params.id }).delete();
    if (students && students.length > 0) {
      const rows = students.map(s => ({ meeting_id: req.params.id, name: s.name, email: s.email }));
      await db("meeting_allowlist").insert(rows);
    }
    res.json({ success: true });
  });

  app.get("/api/meetings/:id/allowlist", async (req, res) => {
    const list = await db("meeting_allowlist").where({ meeting_id: req.params.id });
    res.json(list);
  });

  app.get("/api/meetings/:id/join-requests", async (req, res) => {
    const requests = await db("join_requests").where({ meeting_id: req.params.id, status: "pending" });
    res.json(requests);
  });

  app.post("/api/meetings/:id/check-access", async (req, res) => {
    const { email, userId } = req.body;
    const meeting = await db("meetings").where({ id: req.params.id }).first();
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    // Host always has access
    if (meeting.host_id === userId) return res.json({ status: "approved" });

    // Check global allowlist
    const globallyAllowed = await db("global_allowlist").where({ email }).first();
    if (globallyAllowed) return res.json({ status: "approved" });

    // Check per-meeting allowlist
    const allowed = await db("meeting_allowlist").where({ meeting_id: req.params.id, email }).first();
    if (allowed) {
        // Automatically approve if in allowlist
        return res.json({ status: "approved" });
    }

    // Check existing join request
    const existing = await db("join_requests").where({ meeting_id: req.params.id, user_id: userId }).first();
    if (existing) return res.json({ status: existing.status });

    return res.json({ status: "approved" });
  });

  app.get("/api/admin/allowlist", async (req, res) => {
    const list = await db("global_allowlist").orderBy("created_at", "desc");
    res.json(list);
  });

  app.post("/api/admin/allowlist", async (req, res) => {
    const { email, name } = req.body;
    try {
      await db("global_allowlist").insert({ email, name: name || "User" });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.delete("/api/admin/allowlist/:id", async (req, res) => {
    await db("global_allowlist").where({ id: req.params.id }).delete();
    res.json({ success: true });
  });

  // Socket.io Signaling & Events
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-meeting", ({ meetingId, userId, userName }) => {
      socket.join(meetingId);
      socket.to(meetingId).emit("user-connected", { userId, userName, socketId: socket.id });
      // Notification for join
      io.to(meetingId).emit("notification", { text: `${userName} joined the seminar`, type: "join" });
      console.log(`${userName} joined ${meetingId}`);
    });

    socket.on("speaker-active", ({ meetingId, userId }) => {
      io.to(meetingId).emit("active-speaker", { userId });
    });

    socket.on("ask-to-join", async ({ meetingId, userId, userName, email }) => {
      const requestId = uuidv4();
      await db("join_requests").insert({
        id: requestId,
        meeting_id: meetingId,
        user_id: userId,
        user_name: userName,
        email,
        status: "pending"
      });
      console.log(`Join request from ${userName} for ${meetingId}`);
      io.to(meetingId).emit("join-request-received", { id: requestId, userId, userName, email });
    });

    socket.on("approve-join", async ({ requestId, meetingId, userId }) => {
      await db("join_requests").where({ id: requestId }).update({ status: "approved" });
      io.to(meetingId).emit("join-request-approved", { userId });
    });

    socket.on("reject-join", async ({ requestId, meetingId, userId }) => {
      await db("join_requests").where({ id: requestId }).update({ status: "rejected" });
      io.to(meetingId).emit("join-request-rejected", { userId });
    });

    socket.on("send-message", async ({ meetingId, userId, userName, content }) => {
      const message = {
        id: uuidv4(),
        meeting_id: meetingId,
        user_id: userId,
        user_name: userName,
        content,
      };
      await db("chat_messages").insert(message);
      io.to(meetingId).emit("new-message", message);
    });

    socket.on("create-poll", async ({ meetingId, question, options }) => {
      const poll = {
        id: uuidv4(),
        meeting_id: meetingId,
        question,
        options: JSON.stringify(options),
        active: true,
      };
      await db("polls").insert(poll);
      io.to(meetingId).emit("new-poll", { ...poll, options, votes: [] });
      io.to(meetingId).emit("notification", { text: "A new poll was created", type: "poll" });
    });

    socket.on("vote", async ({ pollId, userId, answerIndex, meetingId }) => {
      await db("poll_responses").insert({ poll_id: pollId, user_id: userId, answer_index: answerIndex });
      const votes = await db("poll_responses").where({ poll_id: pollId });
      io.to(meetingId).emit("poll-updated", { pollId, votes });
    });

    socket.on("reaction", ({ meetingId, userId, emoji }) => {
      io.to(meetingId).emit("new-reaction", { userId, emoji });
    });

    socket.on("hand-raise", ({ meetingId, userId, raised }) => {
      io.to(meetingId).emit("hand-raised", { userId, raised, timestamp: Date.now() });
    });
    
    socket.on("screen-share-request", ({ meetingId, userId, userName }) => {
      io.to(meetingId).emit("screen-share-request-received", { userId, userName });
    });

    socket.on("screen-share-approve", ({ meetingId, userId }) => {
      io.to(meetingId).emit("screen-share-approved", { userId });
    });

    socket.on("screen-share", ({ meetingId, userId, sharing }) => {
      io.to(meetingId).emit("screen-shared", { userId, sharing });
    });

    // Recording authorization sockets
    socket.on("recording-request", ({ meetingId, userId, userName }) => {
      io.to(meetingId).emit("recording-request-received", { userId, userName });
    });

    socket.on("recording-approve", ({ meetingId, userId }) => {
      io.to(meetingId).emit("recording-approved", { userId });
    });

    socket.on("recording-reject", ({ meetingId, userId }) => {
      io.to(meetingId).emit("recording-rejected", { userId });
    });

    socket.on("recording-state-change", ({ meetingId, userId, userName, isRecording }) => {
      io.to(meetingId).emit("recording-state-updated", { userId, userName, isRecording });
    });

    socket.on("toggle-media", ({ meetingId, userId, type, enabled }) => {
      io.to(meetingId).emit("media-toggled", { userId, type, enabled });
    });

    socket.on("host-action", ({ meetingId, action, targetUserId, payload, fromName, fromUserId }) => {
      // In a real app, we'd verify the socket.id belongs to the host_id in DB
      io.to(meetingId).emit("host-action-received", { action, targetUserId, payload, fromName, fromUserId });
      if (action === "mute") {
        io.to(meetingId).emit("notification", { text: "A participant was muted by host", type: "host" });
      }
    });

    // Signaling for WebRTC (Simple Mesh)
    socket.on("signal", ({ to, from, signal }) => {
      io.to(to).emit("signal", { from, signal });
    });

    socket.on("end-meeting", async ({ meetingId }) => {
      await db("meetings").where({ id: meetingId }).update({
        settings: JSON.stringify({ locks: true, chatEnabled: false, ended: true })
      });
      io.to(meetingId).emit("meeting-ended");
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      // Logic to notify others in meetings would go here, 
      // but requires tracking which rooms user was in.
      // For simplicity, we emit a global user-disconnected and rooms handle it.
      io.emit("user-disconnected", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Explicitly serve index.html for the spa root and fallbacks
    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) return next();
      try {
        const template = await vite.transformIndexHtml(req.originalUrl, await (await import("fs/promises")).readFile(path.join(process.cwd(), "index.html"), "utf-8"));
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
