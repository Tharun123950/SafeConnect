require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'instagram_secret_token_key_9988';
const fs = require('fs');
const path = require('path');
const { moderateImage } = require('./imageModerationService.cjs');
const { ImageSecurityError, SECURITY_CONFIG } = require('./imageSecurityValidator.cjs');

const abusiveKeywords = new Set();
const HARASSMENT_PATTERNS = [
  "you are hot",
  "send me nude images",
  "send nude pics",
  "send me naked pictures",
  "show me your nude photo",
  "send your private photos",
  "show me your body",
  "send me your naked photo",
  "send nude images",
  "naked pictures",
  "nude pics",
  "nude photo",
  "naked photo"
];

function cleanObfuscation(str) {
  if (!str) return "";
  let clean = str.toLowerCase();
  clean = clean
    .replace(/@/g, 'a')
    .replace(/4/g, 'a')
    .replace(/1/g, 'i')
    .replace(/0/g, 'o')
    .replace(/3/g, 'e')
    .replace(/\$/g, 's')
    .replace(/\*/g, '')
    .replace(/[.!,\-?()_]/g, '');
  return clean;
}

function cleanObfuscationNoSpaces(str) {
  return cleanObfuscation(str).replace(/\s+/g, '');
}

function loadAbusiveDataset() {
  abusiveKeywords.add("idiot");
  try {
    const csvPath = path.join(__dirname, 'dataset', 'telugu_abusive_variants_dataset.csv');
    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length > 0) {
          const rawWord = parts[0].trim();
          if (rawWord) {
            abusiveKeywords.add(rawWord.toLowerCase());
          }
        }
      }
      console.log(`[Hybrid Detector] Loaded ${abusiveKeywords.size} key abusive terms from CSV and built-in English list.`);
    } else {
      console.warn("[Hybrid Detector] WARNING: CSV dataset not found at: " + csvPath);
    }
  } catch (err) {
    console.error("[Hybrid Detector] Error loading dataset:", err);
  }
}

function matchAbusive(message) {
  if (!message) return false;
  const msgClean = cleanObfuscation(message);
  const msgNoSpace = cleanObfuscationNoSpaces(message);
  const msgWords = message.toLowerCase().split(/\s+/).map(w => cleanObfuscation(w));

  for (const rawKw of abusiveKeywords) {
    const kwClean = cleanObfuscation(rawKw);
    const kwNoSpace = cleanObfuscationNoSpaces(rawKw);
    if (!kwNoSpace) continue;

    const regex = new RegExp('\\b' + escapeRegExp(kwClean) + '\\b', 'i');
    if (regex.test(msgClean)) {
      return true;
    }

    if (kwNoSpace.length >= 4 && msgNoSpace.includes(kwNoSpace)) {
      return true;
    }

    if (msgWords.includes(kwClean) || msgWords.includes(kwNoSpace)) {
      return true;
    }
  }
  return false;
}

function matchHarassment(message) {
  if (!message) return false;
  const msgClean = cleanObfuscation(message);
  const msgNoSpace = cleanObfuscationNoSpaces(message);

  for (const pattern of HARASSMENT_PATTERNS) {
    const patClean = cleanObfuscation(pattern);
    const patNoSpace = cleanObfuscationNoSpaces(pattern);
    if (msgNoSpace.includes(patNoSpace)) {
      return true;
    }
  }
  return false;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

loadAbusiveDataset();

let userFeedbackRules = [];

async function loadUserFeedbackDataset() {
  try {
    const feedbackItems = await prisma.abusiveFeedback.findMany({
      select: {
        id: true,
        abusiveWordOrPhrase: true,
        normalizedWordOrPhrase: true,
        originalSenderId: true,
        originalReceiverId: true
      }
    });
    userFeedbackRules = feedbackItems.map(item => ({
      id: item.id,
      originalSenderId: item.originalSenderId,
      originalReceiverId: item.originalReceiverId,
      abusivePhrase: item.abusiveWordOrPhrase,
      normalizedPhrase: item.normalizedWordOrPhrase || cleanObfuscationNoSpaces(item.abusiveWordOrPhrase)
    }));
    console.log(`[Hybrid Detector] Loaded ${userFeedbackRules.length} user-feedback rules (scoped to sender->receiver).`);
    syncUserFeedbackToJsonFile();
    syncAdminUpdatedWordsToJsonFile();
  } catch (err) {
    console.error("[Hybrid Detector] Error loading user feedback dataset:", err.message);
  }
}

async function syncUserFeedbackToJsonFile() {
  try {
    const feedbackItems = await prisma.abusiveFeedback.findMany({
      orderBy: { id: 'asc' }
    });
    const jsonPath = path.join(__dirname, 'dataset', 'user_added_abusive_words.json');
    fs.writeFileSync(jsonPath, JSON.stringify(feedbackItems, null, 2), 'utf8');
    await syncAdminUpdatedWordsToJsonFile();
  } catch (err) {
    console.warn('[User Feedback] Could not sync to JSON file:', err.message);
  }
}

async function syncAdminUpdatedWordsToJsonFile() {
  try {
    const approvedItems = await prisma.abusiveFeedback.findMany({
      where: {
        status: { in: ['APPROVED', 'ADDED_TO_MAIN_DATASET'] }
      },
      orderBy: { id: 'asc' }
    });
    const jsonPath = path.join(__dirname, 'dataset', 'admin_updated_abusive_words.json');
    fs.writeFileSync(jsonPath, JSON.stringify(approvedItems, null, 2), 'utf8');
    console.log(`[Admin Dataset] Synced ${approvedItems.length} approved words to admin_updated_abusive_words.json`);
  } catch (err) {
    console.warn('[Admin Dataset] Could not sync to admin_updated_abusive_words.json:', err.message);
  }
}

loadUserFeedbackDataset();

function matchUserFeedbackAbusive(message, currentSenderId, currentReceiverId) {
  if (!message || !currentSenderId || !currentReceiverId) return false;
  const numSender = Number(currentSenderId);
  const numReceiver = Number(currentReceiverId);

  const msgClean = cleanObfuscation(message);
  const msgNoSpace = cleanObfuscationNoSpaces(message);
  const msgWords = message.toLowerCase().split(/\s+/).map(w => cleanObfuscation(w));

  for (const rule of userFeedbackRules) {
    // 1. MUST match exact originalSenderId
    if (Number(rule.originalSenderId) !== numSender) continue;

    // 2. MUST match exact originalReceiverId
    if (Number(rule.originalReceiverId) !== numReceiver) continue;

    // 3. normalizedMessage contains/matches storedNormalizedPhrase
    const phraseClean = cleanObfuscation(rule.abusivePhrase || rule.normalizedPhrase);
    const phraseNoSpace = cleanObfuscationNoSpaces(rule.normalizedPhrase || rule.abusivePhrase);
    if (!phraseNoSpace) continue;

    const regex = new RegExp('\\b' + escapeRegExp(phraseClean) + '\\b', 'i');
    if (regex.test(msgClean)) {
      return true;
    }

    if (phraseNoSpace.length >= 3 && msgNoSpace.includes(phraseNoSpace)) {
      return true;
    }

    if (msgWords.includes(phraseClean) || msgWords.includes(phraseNoSpace)) {
      return true;
    }
  }
  return false;
}


app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'SafeConnect API Server', time: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', server: 'SafeConnect API Server' });
});

// Wrap Express inside http Server for Socket.IO support
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Map to track online client socket connections
const onlineUsers = new Map(); // userId (Int) -> socket.id (String)
const socketMap = {}; // userId (Int) -> socketId (String)

// Socket.IO Connection Auth Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication token required."));
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error("Authentication failed. Session expired."));
    socket.userId = decoded.id;
    next();
  });
});

io.on('connection', (socket) => {
  onlineUsers.set(socket.userId, socket.id);
  socketMap[socket.userId] = socket.id;
  socket.join(`user_${socket.userId}`);
  console.log(`User ${socket.userId} connected to Socket.IO and joined room user_${socket.userId}`);

  socket.on('disconnect', () => {
    if (onlineUsers.get(socket.userId) === socket.id) {
      onlineUsers.delete(socket.userId);
    }
    if (socketMap[socket.userId] === socket.id) {
      delete socketMap[socket.userId];
    }
    console.log(`User ${socket.userId} disconnected`);
  });
});

// Auth Token Verification Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required.' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Session expired or invalid token.' });
    req.user = decoded;
    next();
  });
};

async function createAndEmitNotification({ userId, senderId, type, title, message, text, postId, messageId, complaintId, warningNumber }) {
  if (type === 'ADMIN_WARNING') {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'ADMIN_WARNING'
      }
    });
    if (existing) {
      const updated = await prisma.notification.update({
        where: { id: existing.id },
        data: {
          title: title || existing.title,
          message: message || existing.message,
          text: text || message || existing.text,
          warningNumber: warningNumber !== undefined && warningNumber !== null ? warningNumber : existing.warningNumber,
          complaintId: complaintId || existing.complaintId,
          createdAt: new Date(),
          isRead: 0,
          readStatus: 0
        }
      });

      await prisma.notification.deleteMany({
        where: {
          userId,
          type: 'ADMIN_WARNING',
          id: { not: existing.id }
        }
      });

      const senderUser = await prisma.user.findUnique({
        where: { id: senderId },
        select: { username: true, avatar: true }
      });

      const payload = {
        id: updated.id,
        user_id: updated.userId,
        sender_id: updated.senderId,
        type: updated.type,
        title: updated.title,
        message: updated.message,
        text: updated.text,
        complaint_id: updated.complaintId,
        warning_number: updated.warningNumber,
        readStatus: updated.readStatus,
        isRead: updated.isRead,
        createdAt: updated.createdAt.toISOString(),
        created_at: updated.createdAt.toISOString(),
        sender_username: senderUser ? senderUser.username : 'admin',
        sender_avatar: senderUser ? senderUser.avatar : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
      };

      const receiverSocketId = socketMap[userId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('notificationCreated', payload);
      }
      io.to(`user_${userId}`).emit('notificationCreated', payload);

      return updated;
    }
  }

  if (messageId && type) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type,
        messageId
      }
    });
    if (existing) {
      const senderUser = await prisma.user.findUnique({
        where: { id: senderId },
        select: { username: true, avatar: true }
      });

      let receiverDecision = null;
      let messageSenderId = null;
      const msg = await prisma.message.findUnique({
        where: { id: messageId },
        select: { receiverDecision: true, senderId: true }
      });
      if (msg) {
        receiverDecision = msg.receiverDecision;
        messageSenderId = msg.senderId;
      }

      const payload = {
        id: existing.id,
        user_id: existing.userId,
        sender_id: existing.senderId,
        type: existing.type,
        title: existing.title,
        message: existing.message,
        text: existing.text,
        postId: existing.postId,
        messageId: existing.messageId,
        complaint_id: existing.complaintId,
        warning_number: existing.warningNumber,
        readStatus: existing.readStatus,
        isRead: existing.isRead,
        createdAt: existing.createdAt.toISOString(),
        sender: senderUser ? { username: senderUser.username, avatar: senderUser.avatar } : null,
        msg: messageId ? { receiverDecision, senderId: messageSenderId } : null
      };

      const receiverSocketId = socketMap[userId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('notificationCreated', payload);
      }
      io.to(`user_${userId}`).emit('notificationCreated', payload);

      return existing;
    }
  }

  const created = await prisma.notification.create({
    data: {
      userId,
      senderId,
      type,
      title: title || null,
      message: message || null,
      text: text || message || null,
      postId: postId || null,
      messageId: messageId || null,
      complaintId: complaintId || null,
      warningNumber: warningNumber || null,
      readStatus: 0,
      isRead: 0
    }
  });

  const senderUser = await prisma.user.findUnique({
    where: { id: senderId },
    select: { username: true, avatar: true }
  });

  let receiverDecision = null;
  let messageSenderId = null;
  if (messageId) {
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      select: { receiverDecision: true, senderId: true }
    });
    if (msg) {
      receiverDecision = msg.receiverDecision;
      messageSenderId = msg.senderId;
    }
  }

  const payload = {
    id: created.id,
    user_id: created.userId,
    sender_id: created.senderId,
    type: created.type,
    post_id: created.postId,
    message_id: created.messageId,
    complaint_id: created.complaintId,
    warning_number: created.warningNumber,
    title: created.title,
    message: created.message,
    text: created.text,
    is_read: created.isRead,
    created_at: created.createdAt.toISOString(),
    sender_username: senderUser ? senderUser.username : 'admin',
    sender_avatar: senderUser ? senderUser.avatar : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    receiverDecision,
    messageSenderId
  };

  const receiverUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true }
  });

  const receiverSocketId = socketMap[userId];
  if (receiverSocketId) {
    io.to(receiverSocketId).emit('notificationCreated', payload);
  }
  io.to(`user_${userId}`).emit('notificationCreated', payload);

  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: 0,
      type: {
        in: ['like', 'follow', 'AI_FLAGGED_MESSAGE', 'ai_flagged', 'REPORT_SUBMITTED', 'MESSAGE_REPORTED', 'AI_MESSAGE_ALLOWED', 'ADMIN_WARNING']
      }
    }
  });
  if (receiverSocketId) {
    io.to(receiverSocketId).emit('unread_notifications', count);
  }
  io.to(`user_${userId}`).emit('unread_notifications', count);

  return payload;
}

// Helper to calculate RMSD-based face similarity
function calculateSimilarity(embedding1, embedding2) {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) return 0;
  let sumSq = 0;
  for (let i = 0; i < embedding1.length; i++) {
    const diff = embedding1[i] - embedding2[i];
    sumSq += diff * diff;
  }
  const rmsd = Math.sqrt(sumSq / embedding1.length);
  return 1 - rmsd;
}

// ==========================================
// EMAIL & MOBILE OTP VERIFICATION SERVICE
// ==========================================
const OTP_SALT = process.env.OTP_SALT || 'safeconnect_secure_otp_salt_8712';

function hashOtp(identifier, otp) {
  return crypto.createHash('sha256').update(`${identifier}:${otp}:${OTP_SALT}`).digest('hex');
}

function generateSecureOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

// Nodemailer setup
let mailTransporter = null;
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  mailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
}

async function sendEmailOtp(toEmail, otp) {
  const subject = 'SafeConnect - Your Email Verification Code';
  const text = `Your SafeConnect verification code is: ${otp}. It expires in 5 minutes. Do not share this code with anyone.`;
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #000; color: #fff; padding: 24px; border-radius: 8px; max-width: 450px; margin: auto; border: 1px solid #262626;">
      <h2 style="color: #0095f6; margin-bottom: 8px;">SafeConnect Verification</h2>
      <p style="font-size: 14px; color: #ccc;">Use the code below to verify your email address. It will expire in <strong>5 minutes</strong>.</p>
      <div style="background: #111; border: 1px solid #333; padding: 16px; border-radius: 6px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #fff;">${otp}</span>
      </div>
      <p style="font-size: 12px; color: #888;">If you did not request this code, please disregard this message.</p>
    </div>
  `;
  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"SafeConnect Security" <security@safeconnect.app>',
        to: toEmail,
        subject,
        text,
        html
      });
      console.log(`[Email Service] Sent OTP email successfully to ${toEmail}`);
      return true;
    } catch (err) {
      console.error(`[Email Service] Error sending email to ${toEmail}:`, err.message);
      console.log(`[Email Service DEV FALLBACK] To: ${toEmail} | OTP: ${otp}`);
      return false;
    }
  } else {
    console.log(`[Email Service (SMTP Unconfigured - Dev Mode)] To: ${toEmail} | OTP: ${otp}`);
    return true;
  }
}

function normalizeIndianMobile(mobile) {
  if (!mobile) return '';
  let clean = mobile.toString().trim().replace(/[\s\-()]/g, '');
  if (clean.startsWith('+')) {
    return clean;
  }
  if (clean.startsWith('0')) {
    clean = clean.substring(1);
  }
  if (clean.startsWith('91') && clean.length === 12) {
    return `+${clean}`;
  }
  if (clean.length === 10) {
    return `+91${clean}`;
  }
  return `+91${clean}`;
}

async function sendSmsViaAndroidGateway(mobile, message) {
  const gatewayUrl = (process.env.SMS_GATEWAY_URL || '').trim();
  const apiKey = (process.env.SMS_GATEWAY_API_KEY || '').trim();
  const deviceId = (process.env.SMS_GATEWAY_DEVICE_ID || '').trim();
  const provider = (process.env.SMS_GATEWAY_PROVIDER || '').toLowerCase().trim();

  if (!gatewayUrl) {
    console.error('[SMS Gateway Notice] SMS_GATEWAY_URL is not set in .env.');
    console.log(`[SMS Gateway SIM Request] Destination: ${mobile} | Message: "${message}"`);
    console.log('[SMS Gateway Tip] To send real SMS via your Android phone, set SMS_GATEWAY_URL in .env');
    // Allow development testing even if gateway is not connected yet
    return true;
  }

  console.log(`[SMS Gateway] Disagreeing request to Android phone SIM gateway: ${gatewayUrl}`);

  // 1. TextBee Provider
  if (provider === 'textbee' || gatewayUrl.includes('textbee.dev')) {
    const targetUrl = deviceId
      ? `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/sendSMS`
      : gatewayUrl;
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        recipients: [mobile],
        message: message
      })
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[TextBee Gateway Error] HTTP ${resp.status}: ${errText}`);
      throw new Error(`TextBee Android Gateway error: ${errText}`);
    }
    console.log(`[SMS Gateway] Successfully sent SMS via TextBee Android SIM to ${mobile}`);
    return true;
  }

  // 2. HTTP SMS (httpsms) Provider
  if (provider === 'httpsms' || gatewayUrl.includes('httpsms.com')) {
    const resp = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        to: mobile,
        content: message
      })
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[httpsms Gateway Error] HTTP ${resp.status}: ${errText}`);
      throw new Error(`httpsms Android Gateway error: ${errText}`);
    }
    console.log(`[SMS Gateway] Successfully sent SMS via httpsms Android SIM to ${mobile}`);
    return true;
  }

  // 3. Local URL template format (e.g. http://192.168.48.X:8080/send?to={mobile}&msg={message})
  if (gatewayUrl.includes('{mobile}') || gatewayUrl.includes('{phone}') || gatewayUrl.includes('{message}') || gatewayUrl.includes('{text}')) {
    const formattedUrl = gatewayUrl
      .replace('{mobile}', encodeURIComponent(mobile))
      .replace('{phone}', encodeURIComponent(mobile))
      .replace('{to}', encodeURIComponent(mobile))
      .replace('{message}', encodeURIComponent(message))
      .replace('{text}', encodeURIComponent(message));

    const headers = {};
    if (apiKey) {
      headers['Authorization'] = apiKey.startsWith('Basic ') || apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
      headers['x-api-key'] = apiKey;
    }
    const resp = await fetch(formattedUrl, { method: 'GET', headers });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[Android Gateway URL Error] HTTP ${resp.status}: ${errText}`);
      throw new Error(`Android SMS Gateway returned error (${resp.status}): ${errText}`);
    }
    console.log(`[SMS Gateway] Dispatched SMS to ${mobile} via Android phone`);
    return true;
  }

  // 4. Standard RESTful JSON POST (Capcom6 android-sms-gateway & local Android HTTP server apps)
  const headers = {
    'Content-Type': 'application/json'
  };
  if (apiKey) {
    headers['Authorization'] = apiKey.startsWith('Basic ') || apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
    headers['x-api-key'] = apiKey;
  }
  if (deviceId) {
    headers['x-device-id'] = deviceId;
  }

  const payload = {
    phoneNumbers: [mobile],
    recipients: [mobile],
    to: mobile,
    mobile: mobile,
    message: message,
    text: message
  };

  const resp = await fetch(gatewayUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[Android Gateway Error] HTTP ${resp.status}: ${errText}`);
    throw new Error(`Android SMS Gateway rejected request (${resp.status}): ${errText}`);
  }

  console.log(`[SMS Gateway] Dispatched SMS successfully to ${mobile} via Android phone SIM`);
  return true;
}

// 0a. SEND EMAIL OTP
app.post('/api/auth/send-email-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const normEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    // 1. Check if email is associated with a deleted account
    const deletedAccount = await prisma.deletedAccount.findFirst({
      where: { previousEmail: normEmail }
    });
    if (deletedAccount) {
      return res.status(400).json({ error: 'This email cannot be used to create a new account.' });
    }

    // 2. Check if email is already registered to an existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: normEmail }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Email address is already registered.' });
    }

    // 3. Cooldown check (60 seconds)
    const latestOtp = await prisma.oTPVerification.findFirst({
      where: { identifier: normEmail, type: 'email' },
      orderBy: { createdAt: 'desc' }
    });
    if (latestOtp) {
      const elapsedMs = Date.now() - new Date(latestOtp.createdAt).getTime();
      if (elapsedMs < 60000) {
        const remainingSec = Math.ceil((60000 - elapsedMs) / 1000);
        return res.status(429).json({
          error: `Please wait ${remainingSec} seconds before requesting another OTP.`,
          retryAfter: remainingSec
        });
      }
    }

    // 4. Invalidate prior unverified OTPs for this email
    await prisma.oTPVerification.deleteMany({
      where: { identifier: normEmail, type: 'email', verified: false }
    });

    // 5. Generate secure 6-digit OTP and store hash
    const otp = generateSecureOtp();
    const otpHash = hashOtp(normEmail, otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.oTPVerification.create({
      data: {
        identifier: normEmail,
        type: 'email',
        otpHash,
        attempts: 0,
        verified: false,
        expiresAt
      }
    });

    // 6. Send OTP via email
    await sendEmailOtp(normEmail, otp);

    res.json({ success: true, message: 'Email OTP sent successfully.' });
  } catch (err) {
    console.error('Error sending email OTP:', err);
    res.status(500).json({ error: 'Failed to send email verification code.' });
  }
});

// 0b. VERIFY EMAIL OTP
app.post('/api/auth/verify-email-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !email.trim() || !otp || !otp.toString().trim()) {
    return res.status(400).json({ error: 'Email and 6-digit OTP code are required.' });
  }

  const normEmail = email.trim().toLowerCase();
  const cleanOtp = otp.toString().trim();

  if (!/^\d{6}$/.test(cleanOtp)) {
    return res.status(400).json({ error: 'Verification code must be 6 digits.' });
  }

  try {
    const record = await prisma.oTPVerification.findFirst({
      where: { identifier: normEmail, type: 'email', verified: false },
      orderBy: { createdAt: 'desc' }
    });

    if (!record) {
      return res.status(400).json({ error: 'No active OTP request found. Please request a new OTP.' });
    }

    if (new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
    }

    if (record.attempts >= 5) {
      return res.status(400).json({ error: 'Maximum incorrect attempts exceeded. Please request a new OTP.' });
    }

    const calculatedHash = hashOtp(normEmail, cleanOtp);
    if (calculatedHash !== record.otpHash) {
      await prisma.oTPVerification.update({
        where: { id: record.id },
        data: { attempts: record.attempts + 1 }
      });
      const remaining = 5 - (record.attempts + 1);
      return res.status(400).json({
        error: `Invalid verification code. ${remaining > 0 ? remaining + ' attempts remaining.' : 'Please request a new OTP.'}`
      });
    }

    // OTP matched! Mark verified
    await prisma.oTPVerification.update({
      where: { id: record.id },
      data: { verified: true, attempts: record.attempts + 1 }
    });

    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    console.error('Error verifying email OTP:', err);
    res.status(500).json({ error: 'Failed to verify email OTP.' });
  }
});

// 0c. SEND MOBILE OTP (Android SIM Gateway)
const handleSendOtpRoute = async (req, res) => {
  const { mobile } = req.body;
  if (!mobile || !mobile.toString().trim()) {
    return res.status(400).json({ success: false, message: 'Mobile number is required.' });
  }

  const normMobile = normalizeIndianMobile(mobile);
  if (!/^\+91[0-9]{10}$/.test(normMobile)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
  }

  const clean10 = normMobile.replace(/^\+?91/, '');
  const with91 = `+91${clean10}`;

  try {
    // 1. Check if mobile number is already registered
    const existingUser = await prisma.user.findFirst({
      where: { mobile: { in: [normMobile, clean10, with91] } }
    });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Mobile number is already registered.' });
    }

    // 2. Cooldown check (60 seconds) to prevent abuse
    const latestOtp = await prisma.oTPVerification.findFirst({
      where: { identifier: { in: [normMobile, clean10, with91] }, type: 'mobile' },
      orderBy: { createdAt: 'desc' }
    });
    if (latestOtp) {
      const elapsedMs = Date.now() - new Date(latestOtp.createdAt).getTime();
      if (elapsedMs < 60000) {
        const remainingSec = Math.ceil((60000 - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSec} seconds before requesting another OTP.`,
          retryAfter: remainingSec
        });
      }
    }

    // 3. Invalidate prior unverified OTPs for this mobile
    await prisma.oTPVerification.deleteMany({
      where: { identifier: { in: [normMobile, clean10, with91] }, type: 'mobile', verified: false }
    });

    // 4. Generate cryptographically secure 6-digit OTP and store hash
    const otp = generateSecureOtp();
    const otpHash = hashOtp(normMobile, otp);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.oTPVerification.create({
      data: {
        identifier: normMobile,
        type: 'mobile',
        otpHash,
        attempts: 0,
        verified: false,
        expiresAt
      }
    });

    // 5. Send OTP via Android phone SIM gateway
    const message = `Your SafeConnect OTP is: ${otp}. This OTP is valid for 5 minutes. Do not share it with anyone.`;
    try {
      await sendSmsViaAndroidGateway(normMobile, message);
    } catch (gatewayErr) {
      console.error('[SMS Dispatch Failure]:', gatewayErr.message);
      return res.status(502).json({
        success: false,
        message: 'Failed to send SMS OTP. Please ensure Android SMS Gateway is active and reachable.'
      });
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Error in send-otp:', err);
    res.status(500).json({ success: false, message: 'Failed to send mobile verification code.' });
  }
};

app.post('/api/auth/send-otp', handleSendOtpRoute);
app.post('/api/auth/send-mobile-otp', handleSendOtpRoute);

// 0d. VERIFY MOBILE OTP
const handleVerifyOtpRoute = async (req, res) => {
  const { mobile, otp } = req.body;
  if (!mobile || !mobile.toString().trim() || !otp || !otp.toString().trim()) {
    return res.status(400).json({ success: false, verified: false, message: 'Mobile number and 6-digit OTP code are required.' });
  }

  const normMobile = normalizeIndianMobile(mobile);
  const cleanOtp = otp.toString().trim();

  if (!/^\d{6}$/.test(cleanOtp)) {
    return res.status(400).json({ success: false, verified: false, message: 'Verification code must be 6 digits.' });
  }

  const clean10 = normMobile.replace(/^\+?91/, '');
  const with91 = `+91${clean10}`;

  try {
    const record = await prisma.oTPVerification.findFirst({
      where: {
        identifier: { in: [normMobile, clean10, with91] },
        type: 'mobile',
        verified: false
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!record) {
      return res.status(400).json({ success: false, verified: false, message: 'Invalid or expired OTP' });
    }

    if (new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({ success: false, verified: false, message: 'Invalid or expired OTP' });
    }

    if (record.attempts >= 5) {
      return res.status(400).json({ success: false, verified: false, message: 'Maximum incorrect attempts exceeded. Please request a new OTP.' });
    }

    const calculatedHash = hashOtp(record.identifier, cleanOtp);
    if (calculatedHash !== record.otpHash) {
      await prisma.oTPVerification.update({
        where: { id: record.id },
        data: { attempts: record.attempts + 1 }
      });
      const remaining = 5 - (record.attempts + 1);
      return res.status(400).json({
        success: false,
        verified: false,
        message: remaining > 0 ? `Invalid OTP. ${remaining} attempts remaining.` : 'Invalid or expired OTP'
      });
    }

    // OTP matched! Mark verified for all format variations
    await prisma.oTPVerification.update({
      where: { id: record.id },
      data: { verified: true, attempts: record.attempts + 1 }
    });

    // Create synchronized verified records for clean10 and with91
    await prisma.oTPVerification.deleteMany({
      where: { identifier: { in: [clean10, with91] }, type: 'mobile', verified: false }
    });
    if (clean10 !== record.identifier) {
      await prisma.oTPVerification.create({
        data: {
          identifier: clean10,
          type: 'mobile',
          otpHash: record.otpHash,
          attempts: record.attempts + 1,
          verified: true,
          expiresAt: record.expiresAt
        }
      });
    }
    if (with91 !== record.identifier) {
      await prisma.oTPVerification.create({
        data: {
          identifier: with91,
          type: 'mobile',
          otpHash: record.otpHash,
          attempts: record.attempts + 1,
          verified: true,
          expiresAt: record.expiresAt
        }
      });
    }

    res.json({ success: true, verified: true, message: 'Mobile number verified successfully.' });
  } catch (err) {
    console.error('Error verifying mobile OTP:', err);
    res.status(500).json({ success: false, verified: false, message: 'Failed to verify mobile OTP.' });
  }
};

app.post('/api/auth/verify-otp', handleVerifyOtpRoute);
app.post('/api/auth/verify-mobile-otp', handleVerifyOtpRoute);

// 1. REGISTER
app.post('/api/register', async (req, res) => {
  const { username, email, mobile, password, name, bio, avatar, gender, registrationPhoto, faceEmbedding } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Username, password, and name are required.' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required.' });
  }
  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ error: 'Mobile number is required.' });
  }
  if (!gender) {
    return res.status(400).json({ error: 'Gender selection is required.' });
  }
  if (!registrationPhoto) {
    return res.status(400).json({ error: 'Face photo capture is required to register.' });
  }
  try {
    const normUsername = username.trim().toLowerCase();
    const normEmail = email.trim().toLowerCase();
    const normMobile = mobile.trim().replace(/[\s\-()]/g, '');

    // Check username uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { username: normUsername }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    // Check against deleted account records
    const deletedAccount = await prisma.deletedAccount.findFirst({
      where: { previousEmail: normEmail }
    });
    if (deletedAccount) {
      return res.status(400).json({ error: 'This email cannot be used to create a new account.' });
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email: normEmail }
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email address is already registered.' });
    }

    const existingMobile = await prisma.user.findFirst({
      where: { mobile: normMobile }
    });
    if (existingMobile) {
      return res.status(400).json({ error: 'Mobile number is already registered.' });
    }
    // --- ENFORCE MOBILE OTP VERIFICATION ---
    const clean10Mobile = normMobile.replace(/^\+?91/, '');
    const with91Mobile = `+91${clean10Mobile}`;
    const verifiedMobileRecord = await prisma.oTPVerification.findFirst({
      where: {
        identifier: { in: [normMobile, clean10Mobile, with91Mobile] },
        type: 'mobile',
        verified: true,
        expiresAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (!verifiedMobileRecord) {
      return res.status(400).json({ error: 'Please verify your mobile number with OTP.' });
    }

    // Check registration photo face embedding reuse with deleted accounts
    if (faceEmbedding) {
      let incomingEmbedding = null;
      try {
        incomingEmbedding = JSON.parse(faceEmbedding);
      } catch (err) {
        // Safe skip format error
      }

      if (incomingEmbedding && Array.isArray(incomingEmbedding)) {
        const deletedAccounts = await prisma.deletedAccount.findMany({
          where: {
            faceEmbedding: { not: null }
          }
        });

        const SIMILARITY_THRESHOLD = parseFloat(process.env.FACE_SIMILARITY_THRESHOLD || '0.92');

        for (const da of deletedAccounts) {
          try {
            const dbEmbedding = JSON.parse(da.faceEmbedding);
            if (dbEmbedding && Array.isArray(dbEmbedding)) {
              const similarity = calculateSimilarity(incomingEmbedding, dbEmbedding);
              if (similarity > SIMILARITY_THRESHOLD) {
                return res.status(400).json({
                  error: 'This person appears to be associated with a previously deleted account and cannot create a new account.'
                });
              }
            }
          } catch (err) {
            // Safe skip
          }
        }
      }
    }

    // Secure Password Hashing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const defaultAvatar = avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
    const created = await prisma.user.create({
      data: {
        username: normUsername,
        email: normEmail,
        mobile: normMobile,
        password: hashedPassword,
        name,
        bio: bio || '',
        avatar: defaultAvatar,
        gender,
        registrationPhoto,
        faceEmbedding
      }
    });

    // Invalidate/delete used OTP records
    await prisma.oTPVerification.deleteMany({
      where: {
        OR: [
          { identifier: normEmail, type: 'email' },
          { identifier: { in: [normMobile, clean10Mobile, with91Mobile] }, type: 'mobile' }
        ]
      }
    });

    res.status(201).json({ success: true, userId: created.id, username: normUsername });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. LOGIN
app.post('/api/login', async (req, res) => {
  const { username, password, rememberMe } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  try {
    const normUsername = username.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: normUsername },
          { email: username }
        ]
      }
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    // Session/JWT token setup with Remember Me option
    const tokenExpiry = rememberMe ? '30d' : '24h';
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: tokenExpiry });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth Token Verification Middleware for Admins
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required.' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Session expired or invalid token.' });
    if (decoded.role !== 'admin' && decoded.username !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Administrators only.' });
    }
    req.user = decoded;
    next();
  });
};

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Validate admin credentials
  if (username === 'ADMIN' && password === 'admin325698') {
    const token = jwt.sign({ id: -1, username: 'ADMIN', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({
      success: true,
      token,
      user: {
        id: -1,
        username: 'ADMIN',
        name: 'Administrator'
      }
    });
  } else {
    return res.status(400).json({ error: 'Invalid admin credentials.' });
  }
});

// Admin Users List
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        mobile: true,
        name: true,
        bio: true,
        avatar: true,
        gender: true,
        registrationPhoto: true,
        warningCount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:userId
app.delete('/api/admin/users/:userId', authenticateAdmin, async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  try {
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (userToDelete.username.toUpperCase() === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot delete the administrator account.' });
    }

    // Fetch reports against this user before deletion to identify reporters
    const reportsAgainstUser = await prisma.report.findMany({
      where: { reportedUserId: userId },
      select: { reporterId: true }
    });

    await prisma.$transaction(async (tx) => {
      // 1. Delete reports created BY the user being deleted
      await tx.report.deleteMany({
        where: { reporterId: userId }
      });

      // 2. Create COMPLAINT_ACTION_TAKEN notifications for all reporters of reports against the user being deleted
      for (const r of reportsAgainstUser) {
        await tx.notification.create({
          data: {
            userId: r.reporterId,
            senderId: 1, // System ID
            type: 'COMPLAINT_ACTION_TAKEN',
            title: 'Complaint Update',
            message: 'Action has been taken regarding your complaint.',
            text: 'Action has been taken regarding your complaint.',
            readStatus: 0,
            isRead: 0
          }
        });
      }

      // Get the primary report to associate with the deleted account tracking
      const primaryReport = await tx.report.findFirst({
        where: { reportedUserId: userId }
      });

      // 2.5 Create Banned/Deleted Account prevention entry
      await tx.deletedAccount.create({
        data: {
          previousEmail: userToDelete.email ? userToDelete.email.trim().toLowerCase() : null,
          accountName: userToDelete.username,
          registrationPhotoReference: userToDelete.registrationPhoto || "",
          faceEmbedding: userToDelete.faceEmbedding,
          complaintId: primaryReport ? primaryReport.id : null
        }
      });

      // 3. Update reports against the user being deleted to set actionTaken = true, etc.
      await tx.report.updateMany({
        where: { reportedUserId: userId },
        data: {
          actionTaken: true,
          actionTakenTimestamp: new Date(),
          reportedUserId: null,
          reportedUserPhoto: userToDelete.registrationPhoto,
          flaggedMessageId: null,
          postId: null
        }
      });

      // 4. Delete the user (cascading other models)
      await tx.user.delete({
        where: { id: userId }
      });
    });

    // Real-time socket emission outside transaction
    try {
      for (const r of reportsAgainstUser) {
        const receiverSocketId = socketMap[r.reporterId];
        const latestNotif = await prisma.notification.findFirst({
          where: { userId: r.reporterId, type: 'COMPLAINT_ACTION_TAKEN' },
          orderBy: { createdAt: 'desc' }
        });
        if (latestNotif) {
          const payload = {
            id: latestNotif.id,
            user_id: latestNotif.userId,
            sender_id: latestNotif.senderId,
            type: latestNotif.type,
            title: latestNotif.title,
            message: latestNotif.message,
            text: latestNotif.text,
            is_read: latestNotif.isRead,
            created_at: latestNotif.createdAt.toISOString(),
            sender_username: 'admin',
            sender_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
          };
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('notificationCreated', payload);
          }
          io.to(`user_${r.reporterId}`).emit('notificationCreated', payload);

          const count = await prisma.notification.count({
            where: { userId: r.reporterId, isRead: 0 }
          });
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('unread_notifications', count);
          }
          io.to(`user_${r.reporterId}`).emit('unread_notifications', count);
        }
      }
    } catch (socketErr) {
      console.warn('Socket notification emission failed:', socketErr.message);
    }

    res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account: ' + err.message });
  }
});

// GET /api/complaints (Normal users get their submitted complaints)
app.get('/api/complaints', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const reports = await prisma.report.findMany({
      where: {
        reporterId: userId,
        status: { not: 'Draft' }
      },
      include: {
        reportedUser: { select: { username: true, name: true } },
        flaggedMessage: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const complaints = reports.map(r => {
      let additionalDetails = '';
      let screenshots = [];
      try {
        const parsed = JSON.parse(r.reason);
        additionalDetails = parsed.additionalDetails || '';
        screenshots = parsed.screenshots || [];
      } catch (err) {
        // Fallback for simple string reasons
      }

      return {
        id: r.id,
        complaintId: r.id,
        reportId: r.id,
        messageId: r.messageId || (r.flaggedMessage ? r.flaggedMessage.messageId : null),
        senderId: r.reportedUserId,
        receiverId: r.reporterId,
        senderUsername: r.reportedUserUsername || (r.reportedUser ? r.reportedUser.username : 'Unknown'),
        reportedMessage: r.flaggedMessage ? (r.flaggedMessage.message || 'Flagged Message') : (r.reason || 'Flagged Message'),
        messageTimestamp: r.flaggedMessage ? r.flaggedMessage.timestamp : r.createdAt,
        status: r.status,
        actionTaken: r.actionTaken,
        actionTakenTimestamp: r.actionTakenTimestamp,
        additionalDetails,
        screenshots
      };
    });

    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/complaints/:id (User updates their complaint)
app.put('/api/complaints/:id', authenticateToken, async (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  if (isNaN(reportId)) {
    return res.status(400).json({ error: 'Invalid complaint ID.' });
  }

  try {
    const report = await prisma.report.findFirst({
      where: { id: reportId, reporterId: userId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const { status, additionalDetails, screenshots } = req.body;

    let existingParsed = {};
    try {
      existingParsed = JSON.parse(report.reason);
    } catch (e) {}

    const reasonObj = {
      ...existingParsed,
      text: existingParsed.text || 'Reported abusive message flagged by AI.',
      additionalDetails: additionalDetails !== undefined ? additionalDetails : (existingParsed.additionalDetails || ''),
      screenshots: screenshots !== undefined ? screenshots : (existingParsed.screenshots || [])
    };

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: status || report.status,
        reason: JSON.stringify(reasonObj)
      }
    });

    res.json({ success: true, report: updatedReport });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/complaints (Admin fetches all submitted complaints)
app.get('/api/admin/complaints', authenticateAdmin, async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: {
        status: { not: 'Draft' }
      },
      include: {
        reporter: { select: { id: true, username: true, name: true } },
        reportedUser: { select: { id: true, username: true, name: true, registrationPhoto: true, warningCount: true } },
        flaggedMessage: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Also fetch all users to ensure every complaint correctly maps to the reported user's persistent warning count
    const allUsers = await prisma.user.findMany({
      select: { id: true, username: true, name: true, registrationPhoto: true, warningCount: true }
    });
    const userById = new Map();
    const userByUsername = new Map();
    for (const u of allUsers) {
      userById.set(u.id, u);
      if (u.username) userByUsername.set(u.username.toLowerCase(), u);
    }

    const complaints = reports.map(r => {
      let additionalDetails = '';
      let screenshots = [];
      try {
        const parsed = JSON.parse(r.reason);
        additionalDetails = parsed.additionalDetails || '';
        screenshots = parsed.screenshots || [];
      } catch (err) {
        // Fallback
      }

      // Warning count belongs to the REPORTED USER'S UNIQUE ID
      let targetUser = r.reportedUser;
      if (!targetUser && r.reportedUserId && userById.has(r.reportedUserId)) {
        targetUser = userById.get(r.reportedUserId);
      }
      if (!targetUser && r.reportedUserUsername && userByUsername.has(r.reportedUserUsername.toLowerCase())) {
        targetUser = userByUsername.get(r.reportedUserUsername.toLowerCase());
      }

      const targetUserId = targetUser ? targetUser.id : (r.reportedUserId || null);
      const targetUsername = targetUser ? targetUser.username : (r.reportedUserUsername || 'Unknown');
      const targetName = targetUser ? targetUser.name : (r.reportedUserUsername || 'Unknown');
      const targetPhoto = targetUser ? (targetUser.registrationPhoto || r.reportedUserPhoto) : r.reportedUserPhoto;
      const userWarningCount = targetUser ? (targetUser.warningCount || 0) : (r.warningCount || 0);

      return {
        id: r.id,
        complaintId: r.id,
        reportId: r.id,
        messageId: r.messageId || (r.flaggedMessage ? r.flaggedMessage.messageId : null),
        reporterId: r.reporter ? r.reporter.id : (r.reporterId || null),
        reporterUsername: r.reporter ? r.reporter.username : 'Unknown',
        reporterName: r.reporter ? r.reporter.name : 'Unknown',
        reportedUserId: targetUserId,
        reportedUserUsername: targetUsername,
        reportedUserName: targetName,
        reportedUserPhoto: targetPhoto,
        warningCount: userWarningCount,
        warningLimit: 3,
        warningStatus: userWarningCount >= 3 ? 'LIMIT_REACHED' : 'ACTIVE',
        reportedUserWarningCount: userWarningCount,
        warningIssued: userWarningCount > 0,
        warningIssuedAt: r.warningIssuedAt || null,
        warningNumber: userWarningCount,
        reportedMessage: r.flaggedMessage ? (r.flaggedMessage.message || r.flaggedMessage.text || 'Flagged Message') : (r.reason || 'Flagged Message'),
        messageTimestamp: r.flaggedMessage ? r.flaggedMessage.timestamp : r.createdAt,
        aiLabel: r.flaggedMessage ? r.flaggedMessage.aiLabel : 'N/A',
        confidence: r.flaggedMessage ? r.flaggedMessage.confidence : 0.0,
        severity: r.flaggedMessage ? r.flaggedMessage.severity : 'N/A',
        status: r.status,
        actionTaken: r.actionTaken,
        actionTakenTimestamp: r.actionTakenTimestamp,
        additionalDetails,
        screenshots,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString()
      };
    });

    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/complaints/:id/warning (Admin issues official warning to reported user for this complaint)
app.post('/api/admin/complaints/:id/warning', authenticateAdmin, async (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  if (isNaN(reportId)) {
    return res.status(400).json({ error: 'Invalid complaint ID.' });
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reportedUser: true,
        reporter: { select: { id: true, username: true, name: true } }
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    let targetUserId = report.reportedUserId;
    let targetUser = report.reportedUser;

    if (!targetUserId && report.reportedUserUsername) {
      targetUser = await prisma.user.findUnique({
        where: { username: report.reportedUserUsername.toLowerCase() }
      });
      if (targetUser) targetUserId = targetUser.id;
    } else if (targetUserId && !targetUser) {
      targetUser = await prisma.user.findUnique({
        where: { id: targetUserId }
      });
    }

    if (!targetUserId || !targetUser) {
      return res.status(400).json({ error: 'Reported user does not exist or has already been deleted.' });
    }

    // Warning count belongs strictly to the REPORTED USER'S UNIQUE ID, NOT individual complaints
    const currentWarningCount = targetUser.warningCount || 0;
    const warningLimit = 3;

    if (currentWarningCount >= warningLimit) {
      return res.status(400).json({
        error: `Maximum warnings reached (${warningLimit}/${warningLimit}) for this user. Account can now be deleted.`,
        warningCount: currentWarningCount,
        warningLimit,
        reportedUserId: targetUserId
      });
    }

    const nextWarningCount = currentWarningCount + 1;
    const isNowLimitReached = nextWarningCount >= warningLimit;

    // Increment warningCount on the reported USER record in the database
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        warningCount: nextWarningCount
      }
    });

    // Also update all complaints against this reported user so records stay consistent in database
    await prisma.report.updateMany({
      where: {
        OR: [
          { reportedUserId: targetUserId },
          ...(targetUser.username ? [{ reportedUserUsername: targetUser.username }] : [])
        ]
      },
      data: {
        reportedUserId: targetUserId,
        warningCount: nextWarningCount,
        warningIssued: true,
        warningIssuedAt: new Date(),
        warningNumber: nextWarningCount,
        warningStatus: isNowLimitReached ? 'LIMIT_REACHED' : 'ACTIVE'
      }
    });

    // Find admin user for senderId
    let adminUser = await prisma.user.findFirst({
      where: { username: { in: ['admin', 'ADMIN'] } }
    });
    if (!adminUser) {
      adminUser = await prisma.user.findFirst({
        orderBy: { id: 'asc' }
      });
    }
    const senderId = adminUser ? adminUser.id : report.reporterId;

    const warningText = "We has received a complaint on you on abusing others if neglected this warning you may face legal consequences";
    const warningTitle = `Admin Warning — ${nextWarningCount}/3`;

    await createAndEmitNotification({
      userId: targetUserId,
      senderId: senderId,
      type: 'ADMIN_WARNING',
      title: warningTitle,
      message: warningText,
      text: warningText,
      complaintId: report.id,
      warningNumber: nextWarningCount
    });

    res.json({
      success: true,
      message: `Warning #${nextWarningCount} issued successfully (${nextWarningCount}/${warningLimit}).`,
      warningCount: nextWarningCount,
      warningNumber: nextWarningCount,
      warningLimit: warningLimit,
      warningStatus: isNowLimitReached ? 'LIMIT_REACHED' : 'ACTIVE',
      reportedUserId: targetUserId
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to issue warning: ' + err.message });
  }
});

// 3. GET PROFILE
app.get('/api/users/:username', authenticateToken, async (req, res) => {
  const { username } = req.params;
  const viewerId = req.user.id;
  try {
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Fetch statistics
    const postsCount = await prisma.post.count({ where: { userId: user.id } });
    const followersCount = await prisma.follow.count({ where: { followingId: user.id } });
    const followingCount = await prisma.follow.count({ where: { followerId: user.id } });

    let isFollowing = false;
    if (viewerId) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: user.id
          }
        }
      });
      isFollowing = !!follow;
    }

    const posts = await prisma.post.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      bio: user.bio,
      avatar: user.avatar,
      postsCount,
      followersCount,
      followingCount,
      isFollowing,
      posts: posts.map(p => ({
        id: p.id,
        user_id: p.userId,
        type: p.type,
        img: p.img,
        content: p.content,
        title: p.title,
        caption: p.caption,
        created_at: p.createdAt.toISOString()
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. UPDATE PROFILE & PROFILE PIC
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  const { name, bio, avatar, username } = req.body;
  const userId = req.user.id;
  try {
    const data = { name, bio };
    if (avatar) data.avatar = avatar;

    let newUsername = req.user.username;
    if (username) {
      const normUsername = username.trim().toLowerCase();
      if (normUsername !== req.user.username) {
        // Validate uniqueness
        const duplicate = await prisma.user.findUnique({
          where: { username: normUsername }
        });
        if (duplicate) {
          return res.status(400).json({ error: 'Username is already taken.' });
        }
        data.username = normUsername;
        newUsername = normUsername;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data
    });

    // If username updated, issue a new token with updated session credentials
    let token = null;
    if (username && username.trim().toLowerCase() !== req.user.username) {
      token = jwt.sign({ id: userId, username: newUsername }, JWT_SECRET, { expiresIn: '24h' });
    }

    res.json({
      success: true,
      token,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. FOLLOW / UNFOLLOW
app.post('/api/follow', authenticateToken, async (req, res) => {
  const { followingId } = req.body;
  const followerId = req.user.id;

  if (parseInt(followerId) === parseInt(followingId)) {
    return res.status(400).json({ error: 'You cannot follow yourself.' });
  }
  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(followingId) }
    });
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: parseInt(followingId)
        }
      }
    });

    if (existing) {
      // Unfollow
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId: parseInt(followingId)
          }
        }
      });

      // Delete notification
      await prisma.notification.deleteMany({
        where: {
          userId: parseInt(followingId),
          senderId: followerId,
          type: 'follow'
        }
      });

      res.json({ success: true, following: false });
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId,
          followingId: parseInt(followingId)
        }
      });

      // Trigger notification
      await createAndEmitNotification({
        userId: parseInt(followingId),
        senderId: followerId,
        type: 'follow',
        text: 'started following you.'
      });

      res.json({ success: true, following: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. CREATE POST
app.post('/api/posts', authenticateToken, async (req, res) => {
  const { type, img, content, title, caption } = req.body;
  const userId = req.user.id;
  try {
    const created = await prisma.post.create({
      data: {
        userId,
        type,
        img: img || null,
        content: content || null,
        title: title || null,
        caption: caption || null
      }
    });
    res.status(201).json({ success: true, postId: created.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. EDIT POST CAPTION
app.put('/api/posts/:id/caption', authenticateToken, async (req, res) => {
  const postId = parseInt(req.params.id);
  const { caption } = req.body;
  const userId = req.user.id;
  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    if (post.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to edit this caption.' });
    }
    await prisma.post.update({
      where: { id: postId },
      data: { caption }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. DELETE POST
app.delete('/api/posts/:id', authenticateToken, async (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.user.id;
  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    if (post.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this post.' });
    }
    await prisma.post.delete({ where: { id: postId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. LIKE / UNLIKE POST
app.post('/api/posts/:id/like', authenticateToken, async (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.user.id;
  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const existing = await prisma.like.findUnique({
      where: {
        userId_postId: { userId, postId }
      }
    });

    if (existing) {
      // Unlike
      await prisma.like.delete({
        where: {
          userId_postId: { userId, postId }
        }
      });

      // Delete notification
      await prisma.notification.deleteMany({
        where: {
          userId: post.userId,
          senderId: userId,
          type: 'like',
          postId
        }
      });

      res.json({ success: true, liked: false });
    } else {
      // Like
      await prisma.like.create({
        data: { userId, postId }
      });

      // Create notification if not self liking
      if (post.userId !== userId) {
        await createAndEmitNotification({
          userId: post.userId,
          senderId: userId,
          type: 'like',
          postId,
          text: 'liked your post.'
        });
      }
      res.json({ success: true, liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. COMMENT ON POST
app.post('/api/posts/:id/comment', authenticateToken, async (req, res) => {
  const postId = parseInt(req.params.id);
  const { text } = req.body;
  const userId = req.user.id;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment content cannot be blank.' });
  }
  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const created = await prisma.comment.create({
      data: { postId, userId, text }
    });

    // Create notification if not self commenting
    if (post.userId !== userId) {
      await createAndEmitNotification({
        userId: post.userId,
        senderId: userId,
        type: 'comment',
        postId,
        text: `commented: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`
      });
    }

    const commenter = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, avatar: true }
    });

    res.json({
      success: true,
      comment: {
        id: created.id,
        post_id: postId,
        user_id: userId,
        text,
        username: commenter.username,
        avatar: commenter.avatar,
        created_at: created.createdAt.toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. DELETE COMMENT
app.delete('/api/comments/:id', authenticateToken, async (req, res) => {
  const commentId = parseInt(req.params.id);
  const userId = req.user.id;
  try {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    if (comment.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment.' });
    }
    await prisma.comment.delete({ where: { id: commentId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. GET FEED POSTS
app.get('/api/posts', authenticateToken, async (req, res) => {
  const viewerId = req.user.id;
  try {
    let whereClause = {};
    if (viewerId) {
      const followed = await prisma.follow.findMany({
        where: { followerId: viewerId },
        select: { followingId: true }
      });
      const followedIds = followed.map(f => f.followingId);
      // Show posts of followed users + self
      whereClause = {
        userId: { in: [viewerId, ...followedIds] }
      };
    }
    const posts = await prisma.post.findMany({
      where: whereClause,
      include: {
        user: { select: { username: true, avatar: true, name: true } },
        likes: { select: { userId: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { username: true, avatar: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = posts.map(post => {
      const isLiked = viewerId ? post.likes.some(like => like.userId === viewerId) : false;
      return {
        id: post.id,
        user_id: post.userId,
        type: post.type,
        img: post.img,
        content: post.content,
        title: post.title,
        caption: post.caption,
        created_at: post.createdAt.toISOString(),
        username: post.user.username,
        user_avatar: post.user.avatar,
        user_name: post.user.name,
        likesCount: post.likes.length,
        isLiked,
        comments: post.comments.map(c => ({
          id: c.id,
          post_id: c.postId,
          user_id: c.userId,
          text: c.text,
          created_at: c.createdAt.toISOString(),
          username: c.user.username,
          avatar: c.user.avatar
        }))
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. SEARCH PROFILES
app.get('/api/search', authenticateToken, async (req, res) => {
  const { query } = req.query;
  try {
    if (!query || !query.trim()) {
      return res.json([]);
    }
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query } },
          { name: { contains: query } }
        ]
      },
      select: { id: true, username: true, name: true, avatar: true, bio: true }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. SUGGESTED USERS
app.get('/api/suggestions', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    // Get profiles NOT followed and NOT self
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });
    const followedIds = follows.map(f => f.followingId);

    const suggestions = await prisma.user.findMany({
      where: {
        id: {
          notIn: [userId, ...followedIds]
        }
      },
      select: { id: true, username: true, name: true, avatar: true, bio: true },
      take: 5
    });
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. CHAT INBOX USERS LIST
app.get('/api/chats', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      select: { senderId: true, receiverId: true }
    });
    const partnerIds = new Set();
    for (const msg of messages) {
      if (msg.senderId !== userId) partnerIds.add(msg.senderId);
      if (msg.receiverId !== userId) partnerIds.add(msg.receiverId);
    }

    const targetUserIds = Array.from(partnerIds);

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: targetUserIds
        }
      },
      select: { id: true, username: true, name: true, avatar: true }
    });
    const chatsList = [];

    for (const u of users) {
      const lastMsg = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: u.id },
            { senderId: u.id, receiverId: userId }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      if (lastMsg) {
        const partnerUnreadCount = await prisma.message.count({
          where: {
            senderId: u.id,
            receiverId: userId,
            status: 'sent'
          }
        });

        chatsList.push({
          id: u.id,
          username: u.username,
          name: u.name,
          avatar: u.avatar,
          unreadCount: partnerUnreadCount,
          lastMessage: {
            text: lastMsg.text,
            image: lastMsg.image,
            senderId: lastMsg.senderId,
            created_at: lastMsg.createdAt.toISOString()
          }
        });
      }
    }

    // Sort inbox by last active message timestamp DESC
    chatsList.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bTime - aTime;
    });

    res.json(chatsList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 23. GET FOLLOWED USERS FOR STORIES
app.get('/api/stories', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: { select: { id: true, username: true, name: true, avatar: true } }
      }
    });
    const storyUsers = follows.map(f => f.following);
    res.json(storyUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 24. DELETE CHAT CONVERSATION THREAD
app.delete('/api/chats/:username', authenticateToken, async (req, res) => {
  const targetUsername = req.params.username.toLowerCase();
  const userId = req.user.id;
  try {
    const targetUser = await prisma.user.findUnique({
      where: { username: targetUsername }
    });
    if (!targetUser) return res.status(404).json({ error: 'User not found.' });

    // Delete all messages between these users
    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUser.id },
          { senderId: targetUser.id, receiverId: userId }
        ]
      }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats/pre-check', authenticateToken, async (req, res) => {
  const { text, receiverId } = req.body;
  if (!text || !text.trim()) {
    return res.json({ safe: true, label: 'non-toxic', confidence: 1.0, severity: 'None' });
  }
  const senderId = req.user.id;
  try {
    // LAYER 2: Run USER-ADDED dataset detection (Scoped strictly to senderId -> receiverId)
    const isUserAddedAbusive = matchUserFeedbackAbusive(text, senderId, receiverId);
    if (isUserAddedAbusive) {
      return res.json({
        safe: false,
        label: 'toxic',
        confidence: 0.99,
        severity: 'High',
        isAbusive: true,
        category: 'ABUSE',
        source: 'USER_ADDED_DATASET'
      });
    }

    // If any message sent by this sender to this receiver has already been allowed, whitelist the sender
    const previouslyAllowed = await prisma.message.findFirst({
      where: {
        senderId,
        ...(receiverId ? { receiverId: Number(receiverId) } : {}),
        receiverDecision: 'ALLOWED'
      }
    });

    if (previouslyAllowed) {
      return res.json({ safe: true, label: 'non-toxic', confidence: 1.0, severity: 'None', allowedBypass: true });
    }

    // LAYER 1: Run local keyword detection (Telugu CSV + English) - Global
    const isKeywordAbusive = matchAbusive(text);

    // 2. Run local harassment detection - Global
    const isHarassment = matchHarassment(text);

    // 3. Contact FastAPI service for contextual AI detection
    let aiPrediction = { safe: true, label: 'non-toxic', confidence: 1.0, severity: 'None' };
    let aiServiceFailed = false;

    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      if (response.ok) {
        aiPrediction = await response.json();
      } else {
        console.warn('FastAPI predict failed with status:', response.status);
        aiServiceFailed = true;
      }
    } catch (err) {
      console.error('Error contacting FastAPI prediction service:', err.message);
      aiServiceFailed = true;
    }

    // Combine results:
    const finalFlagged = isKeywordAbusive || isHarassment || !aiPrediction.safe;

    if (finalFlagged) {
      let category = 'AI_DETECTED';
      let source = 'AI_MODEL';
      let confidence = aiPrediction.confidence || 0.95;
      let severity = aiPrediction.severity || 'Medium';

      if (isHarassment) {
        category = 'HARASSMENT';
        source = 'HARASSMENT_RULE';
        confidence = 0.98;
        severity = 'High';
      } else if (isKeywordAbusive) {
        category = 'ABUSE';
        source = 'DATASET';
        confidence = 0.95;
        severity = 'Medium';
      }

      return res.json({
        safe: false,
        label: 'toxic',
        confidence,
        severity,
        isAbusive: true,
        category,
        source
      });
    }

    // If AI service failed and no local keyword flagged, report the 503 failure
    if (aiServiceFailed) {
      return res.status(503).json({ error: 'Abuse detection service is temporarily unavailable. Please try again.', unavailable: true });
    }

    // If safe:
    return res.json({ safe: true, label: 'non-toxic', confidence: 1.0, severity: 'None' });

  } catch (err) {
    console.error('Error in pre-check route:', err.message);
    return res.status(503).json({ error: 'Abuse detection service is temporarily unavailable. Please try again.', unavailable: true });
  }
});

// 26. ALLOW A FLAGGED MESSAGE
app.post('/api/messages/:id/allow', authenticateToken, async (req, res) => {
  const messageId = parseInt(req.params.id);
  const userId = req.user.id;
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });
    if (!message) return res.status(404).json({ error: 'Message not found.' });
    if (message.receiverId !== userId) return res.status(403).json({ error: 'Not authorized to allow this message.' });

    const updatedMsg = await prisma.message.update({
      where: { id: messageId },
      data: { receiverDecision: 'ALLOWED' }
    });

    await prisma.flaggedMessage.updateMany({
      where: { messageId },
      data: {
        receiverDecision: 'ALLOWED',
        decisionTimestamp: new Date(),
        status: 'ALLOWED'
      }
    });

    const senderUser = await prisma.user.findUnique({
      where: { id: message.senderId }
    });

    // Check if an AI flagged notification already exists for this messageId
    const existingNotif = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'AI_FLAGGED_MESSAGE',
        messageId
      }
    });

    let createdNotif;
    if (existingNotif) {
      createdNotif = await prisma.notification.update({
        where: { id: existingNotif.id },
        data: {
          title: 'Flagged Message Allowed',
          message: `You allowed an AI-flagged message from ${senderUser.name}.`,
          text: `You allowed an AI-flagged message from ${senderUser.name}.`
        }
      });
      // Emit the update via sockets
      const receiverSocketId = socketMap[userId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('notificationCreated', createdNotif);
      }
      io.to(`user_${userId}`).emit('notificationCreated', createdNotif);
    } else {
      createdNotif = await createAndEmitNotification({
        userId,
        senderId: message.senderId,
        type: 'AI_FLAGGED_MESSAGE',
        title: 'Flagged Message Allowed',
        message: `You allowed an AI-flagged message from ${senderUser.name}.`,
        messageId
      });
    }

    const payload = {
      messageId,
      receiverDecision: 'ALLOWED',
      status: 'ALLOWED'
    };

    const receiverUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    const rSocket = socketMap[userId];
    const sSocket = socketMap[message.senderId];
    if (rSocket) io.to(rSocket).emit('messageStatusUpdated', payload);
    if (sSocket) io.to(sSocket).emit('messageStatusUpdated', payload);
    io.to(`user_${userId}`).emit('messageStatusUpdated', payload);
    io.to(`user_${message.senderId}`).emit('messageStatusUpdated', payload);

    res.json({ success: true, message: updatedMsg, notification: createdNotif });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 26b. PREPARE REPORT (DECOUPLED - DOES NOT SUBMIT COMPLAINT)
app.post('/api/messages/:id/prepare-report', authenticateToken, async (req, res) => {
  const messageId = parseInt(req.params.id);
  const userId = req.user.id;
  if (isNaN(messageId)) {
    return res.status(400).json({ error: 'Valid message ID is required.' });
  }

  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, username: true, name: true, registrationPhoto: true } }
      }
    });
    if (!message) return res.status(404).json({ error: 'Message not found.' });
    if (message.receiverId !== userId) return res.status(403).json({ error: 'Not authorized to report this message.' });

    const flaggedMsg = await prisma.flaggedMessage.findFirst({
      where: { messageId }
    });

    // Check if complaint was ALREADY submitted for this message (duplicate protection)
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: userId,
        status: { not: 'Draft' },
        OR: [
          { messageId },
          { flaggedMessageId: flaggedMsg ? flaggedMsg.id : undefined }
        ]
      },
      include: {
        reportedUser: { select: { username: true, name: true, registrationPhoto: true } }
      }
    });

    if (existingReport) {
      let additionalDetails = '';
      let screenshots = [];
      try {
        const parsed = JSON.parse(existingReport.reason);
        additionalDetails = parsed.additionalDetails || '';
        screenshots = parsed.screenshots || [];
      } catch (e) {}

      return res.json({
        success: true,
        alreadySubmitted: true,
        complaint: {
          id: existingReport.id,
          reportId: existingReport.id,
          complaintId: existingReport.id,
          messageId: message.id,
          senderId: message.senderId,
          receiverId: userId,
          senderUsername: existingReport.reportedUserUsername || (existingReport.reportedUser ? existingReport.reportedUser.username : message.sender.username),
          reportedMessage: message.text || message.image || 'Flagged Message',
          messageTimestamp: message.createdAt,
          aiLabel: flaggedMsg ? flaggedMsg.aiLabel : 'abusive',
          confidence: flaggedMsg ? flaggedMsg.confidence : 0.95,
          severity: flaggedMsg ? flaggedMsg.severity : 'High',
          status: 'Submitted',
          actionTaken: existingReport.actionTaken,
          actionTakenTimestamp: existingReport.actionTakenTimestamp,
          additionalDetails,
          screenshots
        }
      });
    }

    // Preserve original message metadata and return draft data
    // NOTE: DO NOT create report in DB, DO NOT notify admin/sender/receiver, DO NOT mark as REPORTED
    res.json({
      success: true,
      alreadySubmitted: false,
      complaintData: {
        id: `draft_${message.id}`,
        messageId: message.id,
        senderId: message.senderId,
        senderUsername: message.sender ? message.sender.username : 'Unknown',
        senderName: message.sender ? message.sender.name : 'Unknown',
        receiverId: userId,
        reportedMessage: message.text || message.image || 'Flagged Message',
        messageTimestamp: message.createdAt,
        aiLabel: flaggedMsg ? flaggedMsg.aiLabel : 'abusive',
        confidence: flaggedMsg ? flaggedMsg.confidence : 0.95,
        severity: flaggedMsg ? flaggedMsg.severity : 'High',
        flaggedMessageId: flaggedMsg ? flaggedMsg.id : null,
        status: 'Draft',
        additionalDetails: '',
        screenshots: []
      }
    });
  } catch (err) {
    console.error('Error preparing report:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function for full complaint submission
async function executeComplaintSubmission({ messageId, userId, additionalDetails, screenshots, res }) {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, username: true, name: true, registrationPhoto: true } }
      }
    });
    if (!message) return res.status(404).json({ error: 'Message not found.' });
    if (message.receiverId !== userId) return res.status(403).json({ error: 'Not authorized to report this message.' });

    const flaggedMsg = await prisma.flaggedMessage.findFirst({
      where: { messageId }
    });

    // Duplicate submission check
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: userId,
        status: { not: 'Draft' },
        OR: [
          { messageId },
          { flaggedMessageId: flaggedMsg ? flaggedMsg.id : undefined }
        ]
      }
    });

    if (existingReport) {
      return res.json({
        success: true,
        alreadySubmitted: true,
        reportId: existingReport.id,
        complaintId: existingReport.id,
        message: 'Complaint submitted successfully.'
      });
    }

    const offender = message.sender || await prisma.user.findUnique({
      where: { id: message.senderId },
      select: { username: true, registrationPhoto: true }
    });

    const reasonObj = {
      text: 'Reported abusive message flagged by AI.',
      messageId: message.id,
      senderId: message.senderId,
      receiverId: userId,
      additionalDetails: additionalDetails || '',
      screenshots: screenshots || []
    };

    const createdReport = await prisma.report.create({
      data: {
        reporterId: userId,
        reportedUserId: message.senderId,
        reportedUserUsername: offender ? offender.username : 'Unknown',
        reportedUserPhoto: offender ? offender.registrationPhoto : null,
        flaggedMessageId: flaggedMsg ? flaggedMsg.id : null,
        messageId: message.id,
        reason: JSON.stringify(reasonObj),
        status: 'Submitted'
      }
    });

    const updatedMsg = await prisma.message.update({
      where: { id: messageId },
      data: { receiverDecision: 'REPORTED' }
    });

    await prisma.flaggedMessage.updateMany({
      where: { messageId },
      data: {
        receiverDecision: 'REPORTED',
        decisionTimestamp: new Date(),
        status: 'REPORTED'
      }
    });

    let receiverNotif = null;
    try {
      let systemSenderId = 1;
      const adminUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: 1 },
            { username: 'admin' },
            { username: 'ADMIN' }
          ]
        },
        select: { id: true }
      });
      if (adminUser) {
        systemSenderId = adminUser.id;
      } else {
        const anyUser = await prisma.user.findFirst({ select: { id: true } });
        if (anyUser) systemSenderId = anyUser.id;
      }

      receiverNotif = await createAndEmitNotification({
        userId,
        senderId: systemSenderId,
        type: 'REPORT_SUBMITTED',
        title: 'Report Submitted',
        message: 'Your report has been submitted successfully.',
        text: 'Your report has been submitted successfully.',
        messageId
      });

      await createAndEmitNotification({
        userId: message.senderId,
        senderId: systemSenderId,
        type: 'MESSAGE_REPORTED',
        title: 'Message Reported',
        message: 'One of your messages has been reported.',
        text: 'One of your messages has been reported.',
        messageId
      });
    } catch (notifErr) {
      console.warn('Safe notification creation warning:', notifErr.message);
    }

    const payload = {
      messageId,
      receiverDecision: 'REPORTED',
      status: 'REPORTED'
    };

    const rSocket = socketMap[userId];
    const sSocket = socketMap[message.senderId];
    if (rSocket) io.to(rSocket).emit('messageStatusUpdated', payload);
    if (sSocket) io.to(sSocket).emit('messageStatusUpdated', payload);
    io.to(`user_${userId}`).emit('messageStatusUpdated', payload);
    io.to(`user_${message.senderId}`).emit('messageStatusUpdated', payload);

    return res.json({
      success: true,
      message: 'Complaint submitted successfully.',
      reportId: createdReport.id,
      complaintId: createdReport.id,
      receiverNotification: receiverNotif
    });
  } catch (err) {
    console.error('Error submitting complaint:', err);
    return res.status(500).json({ error: err.message });
  }
}

// 27a. SUBMIT COMPLAINT (FINALIZES COMPLAINT, NOTIFIES ADMIN & PARTIES)
app.post('/api/complaints/submit', authenticateToken, async (req, res) => {
  const { messageId: rawMessageId, additionalDetails, screenshots } = req.body;
  const messageId = parseInt(rawMessageId);
  const userId = req.user.id;

  if (isNaN(messageId)) {
    return res.status(400).json({ error: 'Valid messageId is required.' });
  }

  return executeComplaintSubmission({ messageId, userId, additionalDetails, screenshots, res });
});

// 27. REPORT A FLAGGED MESSAGE (Legacy / Direct Submit Route)
app.post('/api/messages/:id/report', authenticateToken, async (req, res) => {
  const messageId = parseInt(req.params.id);
  const userId = req.user.id;
  const { additionalDetails, screenshots } = req.body || {};

  if (isNaN(messageId)) {
    return res.status(400).json({ error: 'Valid message ID is required.' });
  }

  return executeComplaintSubmission({ messageId, userId, additionalDetails, screenshots, res });
});

// 16. GET CONVERSATION MESSAGE LIST
app.get('/api/chats/:username', authenticateToken, async (req, res) => {
  const { username } = req.params;
  const userId = req.user.id;
  try {
    const targetUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });
    if (!targetUser) return res.status(404).json({ error: 'Target recipient user not found.' });

    // Mark received messages from target as read
    await prisma.message.updateMany({
      where: {
        senderId: targetUser.id,
        receiverId: userId,
        status: 'sent'
      },
      data: { status: 'read' }
    });

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUser.id },
          { senderId: targetUser.id, receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    // Delete temporary message notifications from this sender to this receiver
    await prisma.notification.deleteMany({
      where: {
        userId,
        senderId: targetUser.id,
        type: 'message'
      }
    });

    // Notify original sender that their messages have been read
    const targetSocket = socketMap[targetUser.id];
    if (targetSocket) {
      io.to(targetSocket).emit('message_read', { senderId: targetUser.id, receiverId: userId });
    }
    io.to(`user_${targetUser.id}`).emit('message_read', { senderId: targetUser.id, receiverId: userId });

    // Find or create Chat session for conversation ID
    const user1Id = Math.min(userId, targetUser.id);
    const user2Id = Math.max(userId, targetUser.id);
    let chat = await prisma.chat.findUnique({
      where: {
        user1Id_user2Id: { user1Id, user2Id }
      }
    });
    if (!chat) {
      chat = await prisma.chat.create({
        data: { user1Id, user2Id }
      });
    }

    res.json({
      conversationId: chat.id,
      targetUserId: targetUser.id,
      messages: messages.map(m => ({
        id: m.id,
        chatId: m.chatId,
        sender_id: m.senderId,
        receiver_id: m.receiverId,
        text: m.text,
        image: m.image,
        status: m.status,
        created_at: m.createdAt.toISOString(),
        isFlagged: m.isFlagged,
        aiLabel: m.aiLabel,
        aiConfidence: m.aiConfidence,
        aiSeverity: m.aiSeverity,
        receiverDecision: m.receiverDecision,
        senderDecision: m.senderDecision
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 16.4 TEXT MODERATION HELPER FOR OCR TEXT
async function runTextModeration(extractedText, senderId, receiverId) {
  if (!extractedText || !extractedText.trim()) {
    return { isAbusive: false, categories: [], confidence: 0 };
  }

  // 1. User-Added Abusive Dataset (Strictly scoped to senderId -> receiverId)
  if (senderId && receiverId && matchUserFeedbackAbusive(extractedText, senderId, receiverId)) {
    return {
      isAbusive: true,
      source: 'USER_ADDED_DATASET',
      categories: ['ABUSIVE_TEXT'],
      confidence: 0.99
    };
  }

  // 2. Global Abusive Terms (Telugu CSV dataset + English list)
  if (matchAbusive(extractedText)) {
    return {
      isAbusive: true,
      source: 'GLOBAL_ABUSIVE_DATASET',
      categories: ['ABUSIVE_TEXT'],
      confidence: 0.98
    };
  }

  // 3. Harassment Patterns
  if (matchHarassment(extractedText)) {
    return {
      isAbusive: true,
      source: 'HARASSMENT_PATTERN',
      categories: ['HARASSMENT'],
      confidence: 0.98
    };
  }

  // 4. Contextual AI model (Toxic-BERT / XLM-R)
  // For OCR text, only invoke if the text has coherent word structure (at least 3 words),
  // and only flag if the AI prediction is high confidence (pred.confidence >= 0.85 && pred.severity === 'High')
  // This prevents out-of-distribution noise/fragments from causing false positives.
  const words = extractedText.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    try {
      const aiRes = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: extractedText })
      });
      if (aiRes.ok) {
        const pred = await aiRes.json();
        if (pred && !pred.safe && (pred.severity === 'High' || pred.confidence >= 0.88)) {
          return {
            isAbusive: true,
            source: 'AI_TEXT_MODEL',
            categories: [pred.label || 'toxic'],
            confidence: pred.confidence || 0.90
          };
        }
      }
    } catch (err) {
      console.warn('[OCR TEXT MODERATION] AI text service predict unavailable:', err.message);
    }
  }

  return { isAbusive: false, categories: [], confidence: 0 };
}

// 16.5 UNIFIED IMAGE MODERATION PIPELINE (Part 10 - Final Integration)
const MAX_CONCURRENT_IMAGE_MODERATIONS = parseInt(process.env.MAX_CONCURRENT_IMAGE_MODERATIONS || '4', 10);
let activeImageModerationCount = 0;

/**
 * Single authoritative image moderation execution gateway.
 * Enforces concurrency guards, timeout catching, fail-closed handling,
 * and passes the existing sender->receiver scoped text moderation callback.
 */
async function runImageModerationPipeline(image, senderId, receiverId) {
  if (activeImageModerationCount >= MAX_CONCURRENT_IMAGE_MODERATIONS) {
    const busyErr = new Error('Image moderation service is busy. Please try again in a few moments.');
    busyErr.statusCode = 503;
    throw busyErr;
  }

  activeImageModerationCount++;
  try {
    return await moderateImage(image, {
      senderId,
      receiverId,
      textModerator: (t) => runTextModeration(t, senderId, receiverId)
    });
  } catch (err) {
    console.error('[IMAGE MODERATION PIPELINE] Error:', err.message || err);
    const isSecurityErr = err instanceof ImageSecurityError || err.name === 'ImageSecurityError';
    const isValidationErr = isSecurityErr || (err.message && (
      err.message.includes('decode') ||
      err.message.includes('format') ||
      err.message.includes('corrupted') ||
      err.message.includes('exceed') ||
      err.message.includes('dimensions') ||
      err.message.includes('too large')
    ));
    const isTimeout = err.name === 'ImageModerationTimeoutError' || (err.message && err.message.includes('timed out'));

    const publicMsg = isValidationErr
      ? err.message
      : (isTimeout ? 'Image moderation timed out. Please try again.' : 'Image moderation service is temporarily unavailable. Please try again.');

    const formattedErr = new Error(publicMsg);
    formattedErr.statusCode = isValidationErr ? 400 : 503;
    throw formattedErr;
  } finally {
    activeImageModerationCount--;
  }
}

app.post('/api/chats/image-check', authenticateToken, async (req, res) => {
  const { image, receiverId } = req.body;
  const senderId = req.user.id; // Security: Strictly derived from authenticated session

  if (!image || typeof image !== 'string' || !image.trim()) {
    return res.status(400).json({ success: false, allowed: false, error: 'Image payload is required.' });
  }

  // Security: Receiver validation
  let validatedReceiverId = undefined;
  if (receiverId !== undefined && receiverId !== null && receiverId !== '') {
    validatedReceiverId = parseInt(receiverId);
    if (isNaN(validatedReceiverId)) {
      return res.status(400).json({ success: false, allowed: false, error: 'Valid receiverId is required.' });
    }
    const receiver = await prisma.user.findUnique({
      where: { id: validatedReceiverId },
      select: { id: true }
    });
    if (!receiver) {
      return res.status(404).json({ success: false, allowed: false, error: 'Receiver user not found.' });
    }
  }

  try {
    const result = await runImageModerationPipeline(image, senderId, validatedReceiverId);
    return res.json({
      success: true,
      allowed: result.allowed !== undefined ? result.allowed : !result.isAbusive,
      ...result
    });
  } catch (err) {
    return res.status(err.statusCode || 503).json({
      success: false,
      allowed: false,
      status: 'MODERATION_ERROR',
      error: err.message || 'Image moderation service is temporarily unavailable. Please try again.',
      moderationType: 'IMAGE'
    });
  }
});

// 17. SEND MESSAGE
app.post('/api/chats/message', authenticateToken, async (req, res) => {
  const { receiverId, text, image, isFlagged, aiLabel, aiConfidence, aiSeverity, senderDecision } = req.body;
  const senderId = req.user.id; // Security: Strictly derived from authenticated session

  // Security: Receiver validation
  if (!receiverId || isNaN(parseInt(receiverId))) {
    return res.status(400).json({ success: false, allowed: false, error: 'Valid receiverId is required.' });
  }
  const targetReceiverId = parseInt(receiverId);
  const receiverUser = await prisma.user.findUnique({
    where: { id: targetReceiverId },
    select: { id: true, username: true }
  });
  if (!receiverUser) {
    return res.status(404).json({ success: false, allowed: false, error: 'Receiver user not found.' });
  }

  try {
    // Image Moderation Checkpoint (Part 1, 8, 9, & 10 - Single Gatekeeper Pipeline)
    if (image && typeof image === 'string' && image.trim().length > 0) {
      let imageModerationResult;
      try {
        imageModerationResult = await runImageModerationPipeline(image, senderId, targetReceiverId);
      } catch (modErr) {
        return res.status(modErr.statusCode || 503).json({
          success: false,
          allowed: false,
          status: 'MODERATION_ERROR',
          error: modErr.message || 'Image moderation service is temporarily unavailable. Please try again.',
          moderationType: 'IMAGE'
        });
      }

      if (imageModerationResult && (!imageModerationResult.allowed || imageModerationResult.isAbusive || imageModerationResult.status === 'ABUSIVE')) {
        console.warn(`[IMAGE MODERATION] Abusive image blocked from sender ${senderId} to receiver ${targetReceiverId} (Sources: [${(imageModerationResult.sources || []).join(', ')}], Categories: [${(imageModerationResult.categories || []).join(', ')}])`);
        return res.status(400).json({
          success: false,
          allowed: false,
          blocked: true,
          status: 'ABUSIVE',
          moderationType: 'IMAGE',
          moderationStatus: 'ABUSIVE',
          sources: imageModerationResult.sources || [],
          categories: imageModerationResult.categories || [],
          confidence: imageModerationResult.confidence || 0,
          confidenceBreakdown: imageModerationResult.confidenceBreakdown || {},
          synthetic: imageModerationResult.synthetic || null,
          message: 'Image blocked: Image contains abusive or inappropriate content and cannot be sent.'
        });
      }
    }
    // Find or create Chat session
    const user1Id = Math.min(senderId, targetReceiverId);
    const user2Id = Math.max(senderId, targetReceiverId);

    let chat = await prisma.chat.findUnique({
      where: {
        user1Id_user2Id: { user1Id, user2Id }
      }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: { user1Id, user2Id }
      });
    }

    const finalSenderDecision = senderDecision ? senderDecision.toUpperCase() : 'FORCE_SEND';
    const senderUser = await prisma.user.findUnique({
      where: { id: senderId }
    });

    let finalIsFlagged = isFlagged || false;
    let finalAiLabel = aiLabel || null;
    let finalAiConfidence = aiConfidence ? parseFloat(aiConfidence) : null;
    let finalAiSeverity = aiSeverity || null;

    if (!finalIsFlagged && text) {
      const isUserAbusive = matchUserFeedbackAbusive(text, senderId, parseInt(receiverId));
      if (isUserAbusive) {
        finalIsFlagged = true;
        finalAiLabel = 'toxic';
        finalAiConfidence = 0.99;
        finalAiSeverity = 'High';
      } else {
        const isGlobalAbusive = matchAbusive(text);
        const isHarr = matchHarassment(text);
        if (isGlobalAbusive || isHarr) {
          finalIsFlagged = true;
          finalAiLabel = 'toxic';
          finalAiConfidence = 0.98;
          finalAiSeverity = isHarr ? 'High' : 'Medium';
        }
      }
    }

    // Save message in database
    const createdMsg = await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId,
        receiverId: parseInt(receiverId),
        text: text || '',
        image: image || '',
        isFlagged: finalIsFlagged,
        aiLabel: finalAiLabel,
        aiConfidence: finalAiConfidence,
        aiSeverity: finalAiSeverity,
        receiverDecision: finalIsFlagged ? 'PENDING' : null,
        senderDecision: finalIsFlagged ? finalSenderDecision : null
      }
    });

    if (finalIsFlagged) {
      await prisma.flaggedMessage.create({
        data: {
          senderId,
          receiverId: parseInt(receiverId),
          messageId: createdMsg.id,
          message: text || '',
          aiLabel: finalAiLabel || 'toxic',
          confidence: finalAiConfidence || 0.99,
          severity: finalAiSeverity || 'High',
          senderDecision: finalSenderDecision,
          receiverDecision: 'PENDING',
          status: 'FLAGGED'
        }
      });

      // Notification for receiver only (sender must NOT receive this receiver-side AI abuse alert)
      await createAndEmitNotification({
        userId: parseInt(receiverId),
        senderId, // Actual senderId instead of 1
        type: 'AI_FLAGGED_MESSAGE',
        title: 'AI Flagged Message',
        message: `⚠️ AI detected a potentially abusive message from ${senderUser ? senderUser.name : 'User'}.`,
        text: `⚠️ AI detected a potentially abusive message from ${senderUser ? senderUser.name : 'User'}.`,
        messageId: createdMsg.id
      });
    }



    const senderInfo = await prisma.user.findUnique({
      where: { id: senderId },
      select: { username: true }
    });

    const receiverInfo = await prisma.user.findUnique({
      where: { id: parseInt(receiverId) },
      select: { username: true }
    });

    const payload = {
      id: createdMsg.id,
      chatId: chat.id,
      sender_id: senderId,
      receiver_id: parseInt(receiverId),
      sender_username: senderInfo.username,
      receiver_username: receiverInfo.username,
      text: createdMsg.text,
      image: createdMsg.image,
      status: createdMsg.status,
      created_at: createdMsg.createdAt.toISOString(),
      isFlagged: createdMsg.isFlagged,
      aiLabel: createdMsg.aiLabel,
      aiConfidence: createdMsg.aiConfidence,
      aiSeverity: createdMsg.aiSeverity,
      receiverDecision: createdMsg.receiverDecision,
      senderDecision: createdMsg.senderDecision
    };

    const senderSocketId = socketMap[senderId];
    const receiverSocketId = socketMap[receiverId];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receive_message', payload);
    }
    io.to(`user_${receiverId}`).emit('receive_message', payload);

    if (senderSocketId) {
      io.to(senderSocketId).emit('receive_message', payload);
    }
    io.to(`user_${senderId}`).emit('receive_message', payload);

    // Broadcast updated notification count to receiver user room
    const unreadCount = await prisma.notification.count({
      where: {
        userId: parseInt(receiverId),
        isRead: 0,
        type: {
          in: ['like', 'follow', 'AI_FLAGGED_MESSAGE', 'ai_flagged', 'REPORT_SUBMITTED', 'MESSAGE_REPORTED', 'AI_MESSAGE_ALLOWED', 'ADMIN_WARNING']
        }
      }
    });
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('unread_notifications', unreadCount);
    }
    io.to(`user_${receiverId}`).emit('unread_notifications', unreadCount);

    res.status(201).json({
      success: true,
      message: payload
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 18. UNSEND MESSAGE
app.post('/api/chats/unsend/:id', authenticateToken, async (req, res) => {
  const messageId = parseInt(req.params.id);
  const userId = req.user.id;
  try {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) return res.status(404).json({ error: 'Message not found.' });
    if (msg.senderId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to unsend this message.' });
    }
    await prisma.message.delete({ where: { id: messageId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 19. GET NOTIFICATIONS
app.get('/api/notifications', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const list = await prisma.notification.findMany({
      where: {
        userId,
        type: {
          in: ['like', 'follow', 'AI_FLAGGED_MESSAGE', 'ai_flagged', 'REPORT_SUBMITTED', 'MESSAGE_REPORTED', 'AI_MESSAGE_ALLOWED', 'ADMIN_WARNING']
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { username: true, avatar: true } },
        msg: { select: { receiverDecision: true, senderId: true } }
      }
    });

    let hasAdminWarning = false;
    const deduplicatedList = [];
    for (const n of list) {
      if (n.type === 'ADMIN_WARNING') {
        if (!hasAdminWarning) {
          hasAdminWarning = true;
          deduplicatedList.push(n);
        }
      } else {
        deduplicatedList.push(n);
      }
    }

    const unreadCount = deduplicatedList.filter(n => n.isRead === 0).length;

    res.json({
      notifications: deduplicatedList.map(n => ({
        id: n.id,
        user_id: n.userId,
        sender_id: n.senderId,
        type: n.type,
        post_id: n.postId,
        message_id: n.messageId,
        complaint_id: n.complaintId,
        warning_number: n.warningNumber,
        title: n.title,
        message: n.message,
        text: n.text,
        is_read: n.isRead,
        created_at: n.createdAt.toISOString(),
        sender_username: n.sender ? n.sender.username : 'admin',
        sender_avatar: n.sender ? n.sender.avatar : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        receiverDecision: n.msg ? n.msg.receiverDecision : null,
        messageSenderId: n.msg ? n.msg.senderId : null
      })),
      unreadCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 20. MARK NOTIFICATIONS READ
app.post('/api/notifications/read', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    // Delete normal temporary notifications so they disappear
    await prisma.notification.deleteMany({
      where: {
        userId,
        type: { in: ['message', 'follow', 'like', 'comment'] }
      }
    });

    // Mark safety notifications as read but keep them stored
    await prisma.notification.updateMany({
      where: {
        userId,
        type: { notIn: ['message', 'follow', 'like', 'comment'] }
      },
      data: { isRead: 1 }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 21. DELETE ALL NOTIFICATIONS EXCEPT AI FLAGS
app.delete('/api/notifications', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    await prisma.notification.deleteMany({
      where: {
        userId,
        type: {
          notIn: ['AI_FLAGGED_MESSAGE', 'ai_flagged']
        }
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 22. DELETE NOTIFICATION
app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  const notifId = parseInt(req.params.id);
  const userId = req.user.id;
  try {
    const notif = await prisma.notification.findUnique({ where: { id: notifId } });
    if (!notif) return res.status(404).json({ error: 'Notification not found.' });
    if (notif.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this notification.' });
    }
    await prisma.notification.delete({ where: { id: notifId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 21. SUBMIT REPORT
app.post('/api/reports', authenticateToken, async (req, res) => {
  const { reportedUserId, postId, reason } = req.body;
  const reporterId = req.user.id;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Report reason is required.' });
  }
  try {
    const offender = reportedUserId ? await prisma.user.findUnique({
      where: { id: parseInt(reportedUserId) },
      select: { username: true, registrationPhoto: true }
    }) : null;

    await prisma.report.create({
      data: {
        reporterId,
        reportedUserId: reportedUserId ? parseInt(reportedUserId) : null,
        reportedUserUsername: offender ? offender.username : null,
        reportedUserPhoto: offender ? offender.registrationPhoto : null,
        postId: postId ? parseInt(postId) : null,
        reason
      }
    });
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 22. USER FEEDBACK: ADD TO ABUSIVE DATASET
app.post('/api/abusive-feedback', authenticateToken, async (req, res) => {
  try {
    let { completeMessage, abusiveWordOrPhrase, originalMessageId, language, originalSenderId, originalReceiverId } = req.body;
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    const trimmedMessage = (completeMessage || '').trim();
    const trimmedWord = (abusiveWordOrPhrase || '').trim();

    if (!trimmedMessage) {
      return res.status(400).json({ error: 'Complete Message cannot be empty.' });
    }
    if (!trimmedWord) {
      return res.status(400).json({ error: 'Abusive Word / Phrase cannot be empty.' });
    }

    const normalized = cleanObfuscationNoSpaces(trimmedWord);
    if (!normalized) {
      return res.status(400).json({ error: 'Invalid abusive word or phrase.' });
    }

    // Resolve original sender & receiver from message if originalMessageId is provided
    if (originalMessageId) {
      const origMsg = await prisma.message.findUnique({
        where: { id: Number(originalMessageId) }
      });
      if (origMsg) {
        originalSenderId = origMsg.senderId;
        originalReceiverId = origMsg.receiverId;
      }
    }

    // Defaults: receiver is whoever submitted (B), sender is who sent to B (A)
    if (!originalReceiverId) {
      originalReceiverId = userId;
    }
    if (!originalSenderId && req.body.originalSenderId) {
      originalSenderId = Number(req.body.originalSenderId);
    }

    if (!originalSenderId || !originalReceiverId) {
      return res.status(400).json({ error: 'Original sender and receiver must be identified.' });
    }

    // Fetch usernames for reference
    let senderUser = null;
    let receiverUser = null;
    if (originalSenderId) {
      senderUser = await prisma.user.findUnique({ where: { id: Number(originalSenderId) }, select: { username: true } });
    }
    if (originalReceiverId) {
      receiverUser = await prisma.user.findUnique({ where: { id: Number(originalReceiverId) }, select: { username: true } });
    }

    // Check if rule already exists for this EXACT sender + receiver + phrase
    const existingRule = await prisma.abusiveFeedback.findFirst({
      where: {
        originalSenderId: Number(originalSenderId),
        originalReceiverId: Number(originalReceiverId),
        normalizedWordOrPhrase: normalized
      }
    });

    if (existingRule) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: 'This abusive word/phrase is already added for this sender and receiver.'
      });
    }

    const newEntry = await prisma.abusiveFeedback.create({
      data: {
        completeMessage: trimmedMessage,
        abusiveWordOrPhrase: trimmedWord,
        normalizedWordOrPhrase: normalized,
        originalSenderId: Number(originalSenderId),
        originalReceiverId: Number(originalReceiverId),
        originalSenderUsername: senderUser ? senderUser.username : null,
        originalReceiverUsername: receiverUser ? receiverUser.username : null,
        submittedById: userId,
        submittedByUsername: user ? user.username : 'user',
        originalMessageId: originalMessageId ? Number(originalMessageId) : null,
        source: 'user_feedback',
        status: 'PENDING',
        language: language || 'auto',
        createdAt: new Date()
      }
    });

    // Update in-memory userFeedbackRules so future messages for this pair are immediately flagged
    userFeedbackRules.push({
      id: newEntry.id,
      originalSenderId: Number(originalSenderId),
      originalReceiverId: Number(originalReceiverId),
      abusivePhrase: trimmedWord,
      normalizedPhrase: normalized
    });

    console.log(`[User Feedback] Stored rule: sender ${originalSenderId} -> receiver ${originalReceiverId} -> phrase "${trimmedWord}" (${normalized})`);
    syncUserFeedbackToJsonFile();

    return res.status(201).json({
      success: true,
      message: 'Added to abusive dataset.',
      data: newEntry
    });
  } catch (err) {
    console.error('Error submitting abusive feedback:', err);
    res.status(500).json({ error: 'Failed to submit abusive feedback: ' + err.message });
  }
});

// 23. ADMIN: GET ALL ABUSIVE DATASET FEEDBACK
app.get('/api/admin/abusive-feedback', authenticateAdmin, async (req, res) => {
  try {
    const feedback = await prisma.abusiveFeedback.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 24. ADMIN: APPROVE DATASET FEEDBACK → ADD TO MAIN GLOBAL ABUSIVE DATASET
app.post('/api/admin/abusive-feedback/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id, 10);
    if (isNaN(feedbackId)) {
      return res.status(400).json({ success: false, error: 'Valid feedback ID is required.' });
    }

    const feedback = await prisma.abusiveFeedback.findUnique({
      where: { id: feedbackId }
    });

    if (!feedback) {
      return res.status(404).json({ success: false, error: 'Feedback record not found.' });
    }

    const rawWord = (feedback.abusiveWordOrPhrase || '').trim();
    if (!rawWord) {
      return res.status(400).json({ success: false, error: 'Abusive word or phrase is empty.' });
    }

    // 1. Normalize using existing SafeConnect normalization functions
    const lowerRaw = rawWord.toLowerCase();
    const cleanWord = cleanObfuscation(rawWord);
    const cleanNoSpace = cleanObfuscationNoSpaces(rawWord);

    // 2. Duplicate check against existing main abusive dataset (in-memory + CSV)
    let alreadyExists = false;
    if (abusiveKeywords.has(lowerRaw) || (cleanWord && abusiveKeywords.has(cleanWord))) {
      alreadyExists = true;
    } else {
      for (const existing of abusiveKeywords) {
        if (cleanObfuscationNoSpaces(existing) === cleanNoSpace) {
          alreadyExists = true;
          break;
        }
      }
    }

    // 3. If not already in the main dataset, append to dataset/telugu_abusive_variants_dataset.csv
    if (!alreadyExists) {
      const csvPath = path.join(__dirname, 'dataset', 'telugu_abusive_variants_dataset.csv');
      let prefix = '';
      if (fs.existsSync(csvPath)) {
        const fileContent = fs.readFileSync(csvPath, 'utf8');
        if (fileContent.length > 0 && !fileContent.endsWith('\n') && !fileContent.endsWith('\r\n')) {
          prefix = '\n';
        }
      }
      const lang = feedback.language && feedback.language !== 'auto' ? feedback.language : 'te-rom';
      fs.appendFileSync(csvPath, `${prefix}${lowerRaw},${lang},1\n`, 'utf8');

      // 4. Update in-memory abusiveKeywords set & reload active dataset safely
      abusiveKeywords.add(lowerRaw);
      if (cleanWord) abusiveKeywords.add(cleanWord);
      loadAbusiveDataset();
      console.log(`[Admin Dataset Approval] Added "${rawWord}" (normalized: "${cleanWord}") to main abusive dataset.`);
    } else {
      console.log(`[Admin Dataset Approval] Word "${rawWord}" already exists in main abusive dataset.`);
    }

    // 5. Update feedback record status to APPROVED
    const updatedFeedback = await prisma.abusiveFeedback.update({
      where: { id: feedbackId },
      data: {
        status: 'APPROVED'
      }
    });

    // 6. Synchronize JSON backup files (both user feedback and admin updated words)
    await syncUserFeedbackToJsonFile();
    await syncAdminUpdatedWordsToJsonFile();

    return res.json({
      success: true,
      message: alreadyExists
        ? `"${rawWord}" was already present in the global abusive dataset. Marked as approved.`
        : `"${rawWord}" successfully added to the main global abusive dataset.`,
      data: updatedFeedback,
      alreadyExists
    });
  } catch (err) {
    console.error('Error approving abusive feedback:', err);
    return res.status(500).json({ success: false, error: 'Failed to approve feedback: ' + err.message });
  }
});

// 25. ADMIN: GET APPROVED / UPDATED ABUSIVE DATASET (JSON)
app.get('/api/admin/abusive-feedback/updated-words', authenticateAdmin, async (req, res) => {
  try {
    const approvedItems = await prisma.abusiveFeedback.findMany({
      where: {
        status: { in: ['APPROVED', 'ADDED_TO_MAIN_DATASET'] }
      },
      orderBy: { id: 'asc' }
    });
    res.json(approvedItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 26. DATASET: DIRECT JSON FILE ACCESS
app.get('/api/dataset/admin-updated-words', (req, res) => {
  try {
    const jsonPath = path.join(__dirname, 'dataset', 'admin_updated_abusive_words.json');
    if (fs.existsSync(jsonPath)) {
      res.sendFile(jsonPath);
    } else {
      res.json([]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dataset/user-added-words', (req, res) => {
  try {
    const jsonPath = path.join(__dirname, 'dataset', 'user_added_abusive_words.json');
    if (fs.existsSync(jsonPath)) {
      res.sendFile(jsonPath);
    } else {
      res.json([]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Run Init Scheme & Startup Server
server.listen(PORT, () => {
  console.log(`Express and Socket.IO API Server listening on port ${PORT}`);
});
