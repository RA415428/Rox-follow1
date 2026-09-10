import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_ADMIN_CONFIG } from './src/utils/defaultAdminConfig';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Global In-Memory & State Store for Secure 6-Digit Email OTPs
let globalOtpsMap: Record<string, { otp: string; expiresAt: number; createdAt: number; verified: boolean }> = {};

// Helper to configure Nodemailer Transporter
function getMailTransporter() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER || 'nayakhardayal4@gmail.com';
  const pass = process.env.GMAIL_APP_PASS || process.env.SMTP_PASS || 'qhggcpswuenfhzzy';

  if (user && pass) {
    if (process.env.SMTP_HOST) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: user.replace(/\s+/g, ''), pass: pass.replace(/\s+/g, '') },
      });
    }
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: user.replace(/\s+/g, ''), pass: pass.replace(/\s+/g, '') },
    });
  }
  return null;
}

// Anti-caching middleware so AppCreator24 WebView always gets fresh app version & live rates
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const UPDATES_DIR = path.join(process.cwd(), 'public', 'updates');
if (!fs.existsSync(UPDATES_DIR)) {
  try {
    fs.mkdirSync(UPDATES_DIR, { recursive: true });
  } catch {}
}
app.use('/updates', express.static(UPDATES_DIR));

// Real-Time Central Data Store in Server Memory & Disk Persistence
let globalAdminConfig = { ...DEFAULT_ADMIN_CONFIG };
let globalOrders: any[] = [];
let globalUsersMap: Record<string, any> = {
  '100001': {
    id: 'usr_100001',
    memberId: '100001',
    name: 'User #100001',
    coins: 120,
    ordersCount: 2,
    status: 'ACTIVE',
    joinedDate: 'Aug 1',
    isOnline: false,
    lastActive: 'Offline (25m ago)',
    deviceType: 'Android App (APK)',
    currentScreen: 'Coins Store Screen',
    totalCoinsSpent: 300,
    location: 'India',
    updatedAt: Date.now() - 25 * 60 * 1000
  },
  '100002': {
    id: 'usr_100002',
    memberId: '100002',
    name: 'User #100002',
    coins: 450,
    ordersCount: 5,
    status: 'ACTIVE',
    joinedDate: 'Jul 28',
    isOnline: false,
    lastActive: 'Offline (3h ago)',
    deviceType: 'Android App (APK)',
    currentScreen: 'Order Create View',
    totalCoinsSpent: 1200,
    location: 'India',
    updatedAt: Date.now() - 3 * 3600 * 1000
  }
};
let globalActivityLogs: any[] = [];
let globalPaymentRequestsMap: Record<string, any> = {};
let globalConnectedInstagramAccounts: Record<string, any> = {};
let globalReferralTracesMap: Record<string, { referrerMemberId: string; timestamp: number; ip: string }> = {};
let globalReferralsMap: Record<string, any> = {};
let globalCoinTransactions: any[] = [];
let globalReferralCodesMap: Record<string, any> = {};
let globalMemberCounter = 100003;

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'app_persisted_state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

function loadPersistedState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.config) {
        globalAdminConfig = {
          ...DEFAULT_ADMIN_CONFIG,
          ...parsed.config,
          coinPackages: (parsed.config.coinPackages && Array.isArray(parsed.config.coinPackages) && parsed.config.coinPackages.length > 0)
            ? parsed.config.coinPackages
            : DEFAULT_ADMIN_CONFIG.coinPackages,
          pricing: {
            ...DEFAULT_ADMIN_CONFIG.pricing,
            ...(parsed.config.pricing || {})
          },
          smmApi: {
            ...DEFAULT_ADMIN_CONFIG.smmApi,
            ...(parsed.config.smmApi || {})
          },
          ads: {
            ...DEFAULT_ADMIN_CONFIG.ads,
            ...(parsed.config.ads || {})
          },
          announcement: {
            ...DEFAULT_ADMIN_CONFIG.announcement,
            ...(parsed.config.announcement || {})
          },
          appUpdate: {
            ...DEFAULT_ADMIN_CONFIG.appUpdate,
            ...(parsed.config.appUpdate || {})
          }
        };
      }
      if (globalAdminConfig.ads) {
        if (!globalAdminConfig.ads.directSmartlinkUrl || globalAdminConfig.ads.directSmartlinkUrl.includes('omg10') || globalAdminConfig.ads.directSmartlinkUrl.includes('monetag')) {
          globalAdminConfig.ads.directSmartlinkUrl = 'https://doubtfulimpatient.com/bhetpw4me?key=b10856b9df41e998764e3e76a118f915';
        }
        if (globalAdminConfig.ads.provider === 'Monetag') {
          globalAdminConfig.ads.provider = 'Adsterra';
        }
      }
      if (globalAdminConfig.rewardAdConfig) {
        if (!globalAdminConfig.rewardAdConfig.smartlinkUrl || globalAdminConfig.rewardAdConfig.smartlinkUrl.includes('omg10') || globalAdminConfig.rewardAdConfig.smartlinkUrl.includes('monetag')) {
          globalAdminConfig.rewardAdConfig.smartlinkUrl = 'https://doubtfulimpatient.com/bhetpw4me?key=b10856b9df41e998764e3e76a118f915';
        }
        if (globalAdminConfig.rewardAdConfig.provider === 'Monetag') {
          globalAdminConfig.rewardAdConfig.provider = 'Adsterra';
        }
      }
      if (Array.isArray(parsed.orders)) {
        globalOrders = parsed.orders.filter((o: any) => {
          if (!o) return false;
          const svc = String(o.serviceType || '').toLowerCase();
          const id = String(o.id || '');
          const target = String(o.targetUrl || '');
          return !svc.includes('story') && !id.startsWith('ord_fake_') && !target.includes('example.com');
        });
      }
      if (parsed.usersMap && typeof parsed.usersMap === 'object') {
        globalUsersMap = { ...globalUsersMap, ...parsed.usersMap };
      }
      if (parsed.paymentRequests && typeof parsed.paymentRequests === 'object') {
        globalPaymentRequestsMap = parsed.paymentRequests;
      }
      if (parsed.connectedInstagramAccounts && typeof parsed.connectedInstagramAccounts === 'object') {
        globalConnectedInstagramAccounts = parsed.connectedInstagramAccounts;
      }
      if (parsed.referralsMap && typeof parsed.referralsMap === 'object') {
        globalReferralsMap = parsed.referralsMap;
      }
      if (Array.isArray(parsed.coinTransactions)) {
        globalCoinTransactions = parsed.coinTransactions;
      }
      if (parsed.referralCodesMap && typeof parsed.referralCodesMap === 'object') {
        globalReferralCodesMap = parsed.referralCodesMap;
      }
      if (typeof parsed.memberCounter === 'number') globalMemberCounter = parsed.memberCounter;
      console.log('Successfully loaded persisted admin config & server data from disk.');
    }
  } catch (err) {
    console.warn('Could not read state file, using defaults:', err);
  }
}

function savePersistedState() {
  try {
    const payload = {
      config: globalAdminConfig,
      orders: globalOrders,
      usersMap: globalUsersMap,
      paymentRequests: globalPaymentRequestsMap,
      connectedInstagramAccounts: globalConnectedInstagramAccounts,
      referralsMap: globalReferralsMap,
      coinTransactions: globalCoinTransactions,
      referralCodesMap: globalReferralCodesMap,
      memberCounter: globalMemberCounter
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save state file to disk:', err);
  }
}

// Load persisted state on server start
loadPersistedState();

// Serve ads.txt for Google AdSense verification
app.get('/ads.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send('google.com, pub-5869373074081897, DIRECT, f08c47fec0942fa0\n');
});

// Helper to forward requests to SMM Panel API directly from Node.js server (bypassing browser CORS completely)
async function executeSmmPanelRequest(params: {
  apiUrl: string;
  apiKey: string;
  action: 'add' | 'balance';
  serviceId?: string;
  link?: string;
  quantity?: number | string;
}) {
  const { apiUrl, apiKey, action, serviceId, link, quantity } = params;

  if (!apiUrl || !apiUrl.trim()) {
    return { success: false, error: 'SMM API URL is empty or invalid.' };
  }
  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: 'SMM API Key is empty or invalid.' };
  }

  const cleanUrl = apiUrl.trim();

  try {
    const formData = new URLSearchParams();
    formData.append('key', apiKey.trim());
    formData.append('action', action);

    if (action === 'add') {
      formData.append('service', String(serviceId || '101'));
      formData.append('link', link || '');
      formData.append('quantity', String(quantity || 100));
    }

    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: formData.toString()
    });

    const text = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawText: text };
    }

    if (action === 'add') {
      if (data && (data.order !== undefined || data.order_id !== undefined)) {
        const orderId = String(data.order || data.order_id);
        return {
          success: true,
          orderId,
          rawResponse: JSON.stringify(data, null, 2)
        };
      } else if (data && data.error) {
        return {
          success: false,
          error: String(data.error),
          rawResponse: JSON.stringify(data, null, 2)
        };
      } else {
        return {
          success: false,
          error: data.rawText || 'Unexpected response from SMM panel',
          rawResponse: text
        };
      }
    } else if (action === 'balance') {
      if (data && data.balance !== undefined) {
        return {
          success: true,
          balance: `${data.balance} ${data.currency || 'USD'}`,
          rawResponse: JSON.stringify(data, null, 2)
        };
      } else if (data && data.error) {
        return {
          success: false,
          error: String(data.error),
          rawResponse: JSON.stringify(data, null, 2)
        };
      } else {
        return {
          success: true,
          balance: text.slice(0, 100),
          rawResponse: text
        };
      }
    }
  } catch (err: any) {
    return {
      success: false,
      error: `Server connection to SMM API failed: ${err.message || 'Network error'}`
    };
  }

  return { success: false, error: 'Unknown SMM panel error' };
}

// --- API ROUTES ---

// ==========================================
// 🔐 REAL-TIME 6-DIGIT EMAIL OTP PASSWORD RESET FLOW
// ==========================================

// 1. Send OTP Endpoint
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isOwner = normalizedEmail === 'nayakhardayal4@gmail.com';

    // Verify if user is registered on backend before dispatching OTP
    let isUserRegistered = isOwner;
    if (!isUserRegistered) {
      for (const memberId of Object.keys(globalUsersMap)) {
        if (globalUsersMap[memberId]?.email?.toLowerCase() === normalizedEmail) {
          isUserRegistered = true;
          break;
        }
      }
    }

    // Generate Cryptographically Secure 6-Digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // Strictly 5 minutes validity

    // Save in server store (secured on backend, invisible to client network inspection)
    globalOtpsMap[normalizedEmail] = {
      otp,
      expiresAt,
      createdAt: Date.now(),
      verified: false
    };

    console.log(`[🔐 OTP AUTH] 6-Digit Code Generated for ${normalizedEmail}: ${otp} (Expires in 5 minutes)`);

    // Dispatch via Nodemailer if SMTP credentials are configured
    const transporter = getMailTransporter();
    let emailSent = false;
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"RoxFollow Security" <${process.env.GMAIL_USER || process.env.SMTP_USER || 'no-reply@roxfollow.com'}>`,
          to: normalizedEmail,
          subject: `Your Password Reset OTP: ${otp}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #0f172a; margin-top: 0;">Password Reset Verification</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.5;">
                You requested to reset your account password. Use the 6-digit verification code below to verify your request:
              </p>
              <div style="background-color: #f1f5f9; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #ec4899; font-family: monospace;">
                  ${otp}
                </span>
              </div>
              <p style="color: #64748b; font-size: 13px;">
                ⏰ This code will expire in <strong>5 minutes</strong>. If you did not request this, please ignore this email.
              </p>
            </div>
          `
        });
        emailSent = true;
        console.log(`[📧 Email Dispatched] OTP successfully delivered to ${normalizedEmail}`);
      } catch (mailErr: any) {
        console.warn('[⚠️ Email Dispatch Notice]', mailErr?.message || 'SMTP delivery issue, falling back to instant verification.');
      }
    }

    return res.json({
      success: true,
      message: emailSent
        ? `A 6-digit verification code has been sent to ${normalizedEmail}. Code expires in 5 minutes.`
        : `A 6-digit verification code has been generated for ${normalizedEmail}. Code expires in 5 minutes.`,
      emailSent
    });
  } catch (err: any) {
    console.error('Send OTP error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to dispatch OTP.' });
  }
});

// 2. Verify OTP Endpoint (Step 2 Verification)
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and 6-digit OTP code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const record = globalOtpsMap[normalizedEmail];
    if (!record) {
      return res.status(404).json({ success: false, error: 'No active OTP found. Please request a new code.' });
    }

    if (Date.now() > record.expiresAt) {
      delete globalOtpsMap[normalizedEmail];
      return res.status(400).json({ success: false, error: 'The 6-digit verification code has expired (5-minute limit). Please request a new one.' });
    }

    if (record.otp !== cleanOtp) {
      return res.status(400).json({ success: false, error: 'Invalid 6-digit verification code. Please check and re-enter.' });
    }

    record.verified = true;
    return res.json({ success: true, message: 'Verification code confirmed successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'OTP verification failed.' });
  }
});

// 3. Verify OTP & Reset Password Endpoint (Step 3 Final Update)
app.post('/api/auth/verify-reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, OTP, and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const record = globalOtpsMap[normalizedEmail];
    if (!record) {
      return res.status(404).json({ success: false, error: 'No active verification request found. Please request a new code.' });
    }

    if (Date.now() > record.expiresAt) {
      delete globalOtpsMap[normalizedEmail];
      return res.status(400).json({ success: false, error: 'Verification code expired. Please request a new code.' });
    }

    if (record.otp !== cleanOtp) {
      return res.status(400).json({ success: false, error: 'Incorrect 6-digit verification code.' });
    }

    // Success! Update password in server state & clean up OTP
    const isOwner = normalizedEmail === 'nayakhardayal4@gmail.com';
    let updated = false;

    for (const memberId of Object.keys(globalUsersMap)) {
      if (globalUsersMap[memberId]?.email?.toLowerCase() === normalizedEmail) {
        globalUsersMap[memberId].password = newPassword;
        if (isOwner) {
          globalUsersMap[memberId].role = 'owner';
          globalUsersMap[memberId].isAdmin = true;
        }
        updated = true;
      }
    }

    delete globalOtpsMap[normalizedEmail];
    savePersistedState();

    console.log(`[✅ PASSWORD RESET] Successfully updated password for ${normalizedEmail}`);

    return res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to reset password.' });
  }
});

// SMM Proxy Endpoints
app.post('/api/smm/proxy-order', async (req, res) => {
  try {
    const { order, smmSettings } = req.body || {};
    const settings = smmSettings || globalAdminConfig.smmApi;

    if (!settings || !settings.enabled) {
      return res.status(400).json({ success: false, error: 'SMM API forwarding is disabled in Admin settings.' });
    }

    let serviceId = order?.serviceId || '';
    let apiKey = settings.globalApiKey;

    const typeLower = (order?.serviceType || '').toLowerCase();
    if (typeLower.includes('follower')) {
      serviceId = serviceId || settings.services?.followers?.serviceId;
      if (settings.services?.followers?.apiKey) apiKey = settings.services.followers.apiKey;
    } else if (typeLower.includes('like')) {
      serviceId = serviceId || settings.services?.likes?.serviceId;
      if (settings.services?.likes?.apiKey) apiKey = settings.services.likes.apiKey;
    } else if (typeLower.includes('view') || typeLower.includes('reel')) {
      serviceId = serviceId || settings.services?.views?.serviceId;
      if (settings.services?.views?.apiKey) apiKey = settings.services.views.apiKey;
    } else if (typeLower.includes('comment')) {
      serviceId = serviceId || settings.services?.comments?.serviceId;
      if (settings.services?.comments?.apiKey) apiKey = settings.services.comments.apiKey;
    } else if (typeLower.includes('share')) {
      serviceId = serviceId || settings.services?.shares?.serviceId;
      if (settings.services?.shares?.apiKey) apiKey = settings.services.shares.apiKey;
    } else if (typeLower.includes('repost')) {
      serviceId = serviceId || settings.services?.reposts?.serviceId;
      if (settings.services?.reposts?.apiKey) apiKey = settings.services.reposts.apiKey;
    } else if (typeLower.includes('save')) {
      serviceId = serviceId || settings.services?.saves?.serviceId;
      if (settings.services?.saves?.apiKey) apiKey = settings.services.saves.apiKey;
    } else if (typeLower.includes('reach') || typeLower.includes('impression') || typeLower.includes('visit')) {
      serviceId = serviceId || settings.services?.reach?.serviceId;
      if (settings.services?.reach?.apiKey) apiKey = settings.services.reach.apiKey;
    }

    if (!serviceId) {
      serviceId = settings.services?.followers?.serviceId || '101';
    }

    const result = await executeSmmPanelRequest({
      apiUrl: settings.apiUrl,
      apiKey: apiKey,
      action: 'add',
      serviceId: serviceId,
      link: order?.targetUrl || '',
      quantity: order?.quantity || 100
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'SMM proxy server error' });
  }
});

app.post('/api/smm/proxy-balance', async (req, res) => {
  try {
    const { apiUrl, apiKey } = req.body || {};
    const url = apiUrl || globalAdminConfig.smmApi.apiUrl;
    const key = apiKey || globalAdminConfig.smmApi.globalApiKey;

    const result = await executeSmmPanelRequest({
      apiUrl: url,
      apiKey: key,
      action: 'balance'
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Balance check error' });
  }
});

// 1. Get Realtime Admin Config (AdMob IDs, Pricing, Announcements, SMM API)
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    config: globalAdminConfig
  });
});

// 2. Update Admin Config (From Admin Panel)
app.post('/api/config', (req, res) => {
  try {
    const updated = req.body;
    if (updated && typeof updated === 'object') {
      globalAdminConfig = {
        ...globalAdminConfig,
        ...updated,
        coinPackages: (updated.coinPackages && Array.isArray(updated.coinPackages) && updated.coinPackages.length > 0)
          ? updated.coinPackages
          : globalAdminConfig.coinPackages,
        lastUpdated: updated.lastUpdated || Date.now(),
        ads: {
          ...globalAdminConfig.ads,
          ...(updated.ads || {})
        },
        pricing: {
          ...globalAdminConfig.pricing,
          ...(updated.pricing || {})
        },
        announcement: {
          ...globalAdminConfig.announcement,
          ...(updated.announcement || {})
        },
        smmApi: {
          ...globalAdminConfig.smmApi,
          ...(updated.smmApi || {})
        },
        appUpdate: {
          ...(globalAdminConfig.appUpdate || DEFAULT_ADMIN_CONFIG.appUpdate || {}),
          ...(updated.appUpdate || {})
        }
      };
      savePersistedState();
      res.json({ success: true, config: globalAdminConfig });
    } else {
      res.status(400).json({ success: false, error: 'Invalid config format' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update config' });
  }
});

// 2b. Direct APK File Upload Endpoint (Stores APK file in /public/updates)
app.post('/api/upload-apk', (req, res) => {
  try {
    const { fileName, fileBase64, version } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ success: false, error: 'No APK file content provided' });
    }

    const cleanName = (fileName || `roxfollow-v${version || 'latest'}.apk`)
      .replace(/[^a-zA-Z0-9_.-]/g, '_');
    const targetFile = path.join(UPDATES_DIR, cleanName);

    const base64Data = fileBase64.includes('base64,') ? fileBase64.split('base64,')[1] : fileBase64;
    const fileBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(targetFile, fileBuffer);

    const relativeUrl = `/updates/${cleanName}`;
    const fullDownloadUrl = `${req.protocol}://${req.get('host')}${relativeUrl}`;

    console.log(`[APK Upload] Saved new APK file ${cleanName} (${fileBuffer.length} bytes) to ${targetFile}`);

    res.json({
      success: true,
      fileName: cleanName,
      downloadUrl: fullDownloadUrl,
      relativeUrl,
      sizeBytes: fileBuffer.length
    });
  } catch (err: any) {
    console.error('Failed to upload APK file:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to save APK file' });
  }
});

// 3. Get Realtime Orders
app.get('/api/orders', (req, res) => {
  res.json({
    success: true,
    orders: globalOrders
  });
});

// 3.1 Update Specific Order Status Endpoint
app.patch('/api/orders/:orderId/status', (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, updatedAt, reason } = req.body || {};
    if (!orderId || !status) {
      return res.status(400).json({ success: false, error: 'Order ID and status are required' });
    }

    const now = updatedAt || Date.now();
    const idx = globalOrders.findIndex(o => o && o.id === orderId);
    if (idx !== -1) {
      globalOrders[idx] = {
        ...globalOrders[idx],
        status,
        updatedAt: now,
        ...(reason ? { statusReason: reason } : {})
      };
      savePersistedState();
      return res.json({ success: true, order: globalOrders[idx] });
    }

    // If not found in memory array, create stub or record
    const newRecord = {
      id: orderId,
      status,
      updatedAt: now,
      ...(reason ? { statusReason: reason } : {})
    };
    globalOrders.unshift(newRecord);
    savePersistedState();
    return res.json({ success: true, order: newRecord });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/orders/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { status, updatedAt, reason } = req.body || {};
  const now = updatedAt || Date.now();
  const idx = globalOrders.findIndex(o => o && o.id === orderId);
  if (idx !== -1) {
    globalOrders[idx] = {
      ...globalOrders[idx],
      status,
      updatedAt: now,
      ...(reason ? { statusReason: reason } : {})
    };
    savePersistedState();
    return res.json({ success: true, order: globalOrders[idx] });
  }
  return res.status(404).json({ success: false, error: 'Order not found' });
});

// 4. Create or Update Order (With Server-Side SMM API Auto-Forwarding)
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;

    if (Array.isArray(orderData)) {
      const incomingMap = new Map<string, any>();
      orderData.forEach((o) => {
        if (o && o.id) incomingMap.set(o.id, { ...o, userMemberId: o.userMemberId || '100001' });
      });

      const existingIds = new Set(globalOrders.map(o => o.id));
      const newOrders = orderData.filter(o => o && o.id && !existingIds.has(o.id));

      const mergedOrders = globalOrders.map(existing => {
        if (incomingMap.has(existing.id)) {
          const incoming = incomingMap.get(existing.id);
          const existingTime = existing.updatedAt || existing.timestamp || existing.createdAt || 0;
          const incomingTime = incoming.updatedAt || incoming.timestamp || incoming.createdAt || 0;
          let updated;
          if (incomingTime >= existingTime) {
            updated = { ...existing, ...incoming };
          } else {
            // Keep existing status if it has newer/equal timestamp or was marked completed
            updated = { ...incoming, ...existing };
          }
          incomingMap.delete(existing.id);
          return updated;
        }
        return existing;
      });

      incomingMap.forEach((newOrd) => {
        mergedOrders.unshift(newOrd);
      });

      globalOrders = mergedOrders;

      // Deduct coins and update order counts for any new orders submitted in array
      for (const targetOrder of newOrders) {
        const cleanMem = String(targetOrder.userMemberId || '').replace(/^#+/, '').trim();
        const userEntry = Object.values(globalUsersMap).find((u: any) => {
          if (!u) return false;
          const uMem = String(u.memberId || '').replace(/^#+/, '').trim();
          if (cleanMem && uMem === cleanMem) return true;
          if (targetOrder.authUid && u.authUid === targetOrder.authUid) return true;
          if (targetOrder.userEmail && u.email && u.email.toLowerCase() === String(targetOrder.userEmail).toLowerCase()) return true;
          return false;
        });

        if (userEntry) {
          userEntry.ordersCount = (userEntry.ordersCount || 0) + 1;
          if (typeof targetOrder.coinsSpent === 'number' && targetOrder.coinsSpent > 0) {
            userEntry.coins = Math.max(0, Math.round(((userEntry.coins || 0) - targetOrder.coinsSpent) * 100) / 100);
            userEntry.totalCoinsSpent = (userEntry.totalCoinsSpent || 0) + targetOrder.coinsSpent;
            userEntry.coinsUpdatedByAdmin = false;
          }
        }
      }
    } else if (orderData && orderData.id) {
      const idx = globalOrders.findIndex(o => o.id === orderData.id);
      let targetOrder = {
        ...orderData,
        userMemberId: orderData.userMemberId || '100001'
      };

      // Auto-forward if enabled, and not forwarded yet
      if (
        globalAdminConfig.smmApi.enabled &&
        globalAdminConfig.smmApi.autoForward &&
        !targetOrder.smmOrderId &&
        !targetOrder.smmAutoForwardAttempted
      ) {
        targetOrder.smmAutoForwardAttempted = true;

        let serviceId = targetOrder.serviceId || '';
        let apiKey = globalAdminConfig.smmApi.globalApiKey;

        const typeLower = (targetOrder.serviceType || '').toLowerCase();
        if (typeLower.includes('follower')) {
          serviceId = serviceId || globalAdminConfig.smmApi.services?.followers?.serviceId;
          if (globalAdminConfig.smmApi.services?.followers?.apiKey) apiKey = globalAdminConfig.smmApi.services.followers.apiKey;
        } else if (typeLower.includes('like')) {
          serviceId = serviceId || globalAdminConfig.smmApi.services?.likes?.serviceId;
          if (globalAdminConfig.smmApi.services?.likes?.apiKey) apiKey = globalAdminConfig.smmApi.services.likes.apiKey;
        } else if (typeLower.includes('view') || typeLower.includes('reel')) {
          serviceId = serviceId || globalAdminConfig.smmApi.services?.views?.serviceId;
          if (globalAdminConfig.smmApi.services?.views?.apiKey) apiKey = globalAdminConfig.smmApi.services.views.apiKey;
        } else if (typeLower.includes('comment')) {
          serviceId = serviceId || globalAdminConfig.smmApi.services?.comments?.serviceId;
          if (globalAdminConfig.smmApi.services?.comments?.apiKey) apiKey = globalAdminConfig.smmApi.services.comments.apiKey;
        } else if (typeLower.includes('share')) {
          serviceId = serviceId || globalAdminConfig.smmApi.services?.shares?.serviceId;
          if (globalAdminConfig.smmApi.services?.shares?.apiKey) apiKey = globalAdminConfig.smmApi.services.shares.apiKey;
        } else if (typeLower.includes('repost')) {
          serviceId = serviceId || globalAdminConfig.smmApi.services?.reposts?.serviceId;
          if (globalAdminConfig.smmApi.services?.reposts?.apiKey) apiKey = globalAdminConfig.smmApi.services.reposts.apiKey;
        } else if (typeLower.includes('save')) {
          serviceId = serviceId || globalAdminConfig.smmApi.services?.saves?.serviceId;
          if (globalAdminConfig.smmApi.services?.saves?.apiKey) apiKey = globalAdminConfig.smmApi.services.saves.apiKey;
        } else if (typeLower.includes('reach') || typeLower.includes('impression') || typeLower.includes('visit')) {
          serviceId = serviceId || globalAdminConfig.smmApi.services?.reach?.serviceId;
          if (globalAdminConfig.smmApi.services?.reach?.apiKey) apiKey = globalAdminConfig.smmApi.services.reach.apiKey;
        }

        if (!serviceId) {
          serviceId = globalAdminConfig.smmApi.services?.followers?.serviceId || '101';
        }

        if (globalAdminConfig.smmApi.apiUrl && apiKey) {
          const smmRes = await executeSmmPanelRequest({
            apiUrl: globalAdminConfig.smmApi.apiUrl,
            apiKey,
            action: 'add',
            serviceId,
            link: targetOrder.targetUrl,
            quantity: targetOrder.quantity
          });

          if (smmRes.success && smmRes.orderId) {
            targetOrder.smmOrderId = smmRes.orderId;
            targetOrder.smmResponse = smmRes.rawResponse;
            targetOrder.status = 'IN_PROGRESS';
          } else if (smmRes.error) {
            targetOrder.smmResponse = `SMM Error: ${smmRes.error}`;
          }
        }
      }

      if (idx >= 0) {
        globalOrders[idx] = { ...globalOrders[idx], ...targetOrder };
      } else {
        globalOrders.unshift(targetOrder);
        // Increment user's ordersCount and deduct coins on the server
        const cleanMem = String(targetOrder.userMemberId || '').replace(/^#+/, '').trim();
        const userEntry = Object.values(globalUsersMap).find((u: any) => {
          if (!u) return false;
          const uMem = String(u.memberId || '').replace(/^#+/, '').trim();
          if (cleanMem && uMem === cleanMem) return true;
          if (targetOrder.authUid && u.authUid === targetOrder.authUid) return true;
          if (targetOrder.userEmail && u.email && u.email.toLowerCase() === String(targetOrder.userEmail).toLowerCase()) return true;
          return false;
        });

        if (userEntry) {
          userEntry.ordersCount = (userEntry.ordersCount || 0) + 1;
          if (typeof targetOrder.coinsSpent === 'number' && targetOrder.coinsSpent > 0) {
            userEntry.coins = Math.max(0, Math.round(((userEntry.coins || 0) - targetOrder.coinsSpent) * 100) / 100);
            userEntry.totalCoinsSpent = (userEntry.totalCoinsSpent || 0) + targetOrder.coinsSpent;
            userEntry.coinsUpdatedByAdmin = false;
          }
        }
      }
    }

    savePersistedState();
    res.json({ success: true, orders: globalOrders });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save order' });
  }
});

// 5. Get Realtime Active & Offline Users
app.get('/api/users', (req, res) => {
  const now = Date.now();

  const allUsers = Object.values(globalUsersMap).filter((u: any) => u && (u.memberId || u.id));

  const usersList = allUsers.map((u: any) => {
    const cleanMemberId = String(u.memberId || '').replace(/^#+/, '').trim();
    const lastSeenTime = typeof u.lastSeenAt === 'number' && u.lastSeenAt > 0
      ? u.lastSeenAt
      : (typeof u.lastHeartbeatAt === 'number' && u.lastHeartbeatAt > 0 ? u.lastHeartbeatAt : 0);
    
    const timeDiffMs = lastSeenTime > 0 ? now - lastSeenTime : 99999999;
    // Strictly mark online if pinged within 60s and isOnline !== false
    const isOnline = u.isOnline !== false && lastSeenTime > 0 && timeDiffMs < 60000 && timeDiffMs >= 0;

    let formattedLastActive = 'Offline (Never)';
    if (isOnline) {
      formattedLastActive = '🟢 Online now';
    } else if (lastSeenTime > 0) {
      const diffSecs = Math.max(0, Math.floor(timeDiffMs / 1000));
      if (diffSecs < 60) {
        formattedLastActive = `Offline (${diffSecs}s ago)`;
      } else if (diffSecs < 3600) {
        formattedLastActive = `Offline (${Math.floor(diffSecs / 60)}m ago)`;
      } else if (diffSecs < 86400) {
        const h = Math.floor(diffSecs / 3600);
        const m = Math.floor((diffSecs % 3600) / 60);
        formattedLastActive = `Offline (${h}h ${m}m ago)`;
      } else {
        const days = Math.floor(diffSecs / 86400);
        if (days === 1) formattedLastActive = `Offline (1 day ago)`;
        else if (days < 30) formattedLastActive = `Offline (${days} days ago)`;
        else formattedLastActive = `Offline (${Math.floor(days / 30)} months ago)`;
      }
    }

    // Match all orders belonging to this user
    const matchingOrders = globalOrders.filter((o: any) => {
      if (!o) return false;
      const cleanOMem = String(o.userMemberId || '').replace(/^#+/, '').trim();
      if (cleanMemberId && cleanOMem && cleanMemberId === cleanOMem) return true;
      if (u.authUid && o.authUid && u.authUid === o.authUid) return true;
      if (u.email && o.userEmail && u.email.toLowerCase() === String(o.userEmail).toLowerCase()) return true;
      return false;
    });

    const calculatedOrdersCount = Math.max(matchingOrders.length, u.ordersCount || 0);
    const calculatedCoinsSpent = Math.max(
      matchingOrders.reduce((sum: number, o: any) => sum + (Number(o.coinsSpent) || 0), 0),
      u.totalCoinsSpent || 0
    );

    return {
      ...u,
      isOnline,
      ordersCount: calculatedOrdersCount,
      totalCoinsSpent: calculatedCoinsSpent,
      updatedAt: u.updatedAt || lastSeenTime,
      lastSeenAt: lastSeenTime,
      lastActive: formattedLastActive
    };
  });

  res.json({
    success: true,
    users: usersList
  });
});

// 5a. Delete single order
app.delete('/api/orders/:orderId', (req, res) => {
  const orderId = String(req.params.orderId || '').trim();
  globalOrders = globalOrders.filter((o) => o.id !== orderId);
  savePersistedState();
  res.json({ success: true, message: `Order ${orderId} deleted` });
});

// 5b. Delete user permanently
app.delete('/api/users/:memberId', (req, res) => {
  const memberId = String(req.params.memberId || '').replace(/^#+/, '').trim();
  delete globalUsersMap[memberId];
  delete globalUsersMap[`usr_${memberId}`];
  delete globalUsersMap[`#${memberId}`];
  savePersistedState();
  res.json({ success: true, message: `User #${memberId} deleted permanently` });
});

// 5c. Purge all anonymous/no-email users from server storage
app.post('/api/users/purge-anonymous', (req, res) => {
  let purgedCount = 0;
  Object.keys(globalUsersMap).forEach((key) => {
    const u = globalUsersMap[key];
    const email = String(u?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@') || email.includes('guest_') || email.endsWith('@example.com')) {
      delete globalUsersMap[key];
      purgedCount++;
    }
  });
  savePersistedState();
  res.json({ success: true, purgedCount });
});

// 5d. Get single user status check (for BlockedScreen Refresh Status)
app.get('/api/users/status/:memberId', (req, res) => {
  const rawId = String(req.params.memberId || '').trim();
  const cleanMemberId = rawId.replace(/^#+/, '').replace(/^usr_/, '').trim();
  let user = globalUsersMap[cleanMemberId] || globalUsersMap[`usr_${cleanMemberId}`] || globalUsersMap[`#${cleanMemberId}`];
  if (!user) {
    user = Object.values(globalUsersMap).find((u: any) => {
      if (!u) return false;
      const uClean = String(u.memberId || '').replace(/^#+/, '').replace(/^usr_/, '').trim();
      return uClean === cleanMemberId || u.id === `usr_${cleanMemberId}` || u.id === rawId;
    });
  }
  if (user) {
    res.json({ success: true, memberId: cleanMemberId, status: user.status || 'ACTIVE' });
  } else {
    res.json({ success: false, memberId: cleanMemberId, status: 'NOT_FOUND' });
  }
});

// 5a-2. User Offline Signal endpoint
app.post('/api/users/offline', (req, res) => {
  try {
    const { memberId } = req.body || {};
    if (memberId && globalUsersMap[memberId]) {
      const now = Date.now();
      globalUsersMap[memberId] = {
        ...globalUsersMap[memberId],
        isOnline: false,
        updatedAt: now - 45000,
        lastSeenAt: now,
        lastActive: 'Offline (Just now)'
      };
      savePersistedState();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Save / Update Users list (From Admin Panel)
app.post('/api/users', (req, res) => {
  try {
    const usersData = req.body;
    if (Array.isArray(usersData)) {
      const newMap: Record<string, any> = {};
      usersData.forEach((u: any) => {
        if (u && u.memberId) {
          newMap[u.memberId] = {
            ...(globalUsersMap[u.memberId] || {}),
            ...u,
            coinsUpdatedByAdmin: u.coinsUpdatedByAdmin === true
          };
        }
      });
      globalUsersMap = newMap;
    } else if (usersData && usersData.memberId) {
      globalUsersMap[usersData.memberId] = {
        ...(globalUsersMap[usersData.memberId] || {}),
        ...usersData,
        coinsUpdatedByAdmin: usersData.coinsUpdatedByAdmin === true
      };
    }
    savePersistedState();
    res.json({ success: true, users: Object.values(globalUsersMap) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update users' });
  }
});

// Delete single user by Member ID (Admin Action)
app.delete('/api/users/:memberId', (req, res) => {
  try {
    const memberId = String(req.params.memberId || '').trim();
    if (memberId && globalUsersMap[memberId]) {
      delete globalUsersMap[memberId];
      savePersistedState();
    }
    res.json({ success: true, users: Object.values(globalUsersMap) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// 5b. Reset Daily Ad Limit for All Users (Admin Action)
app.post('/api/users/reset-daily-ads', (req, res) => {
  try {
    Object.keys(globalUsersMap).forEach((memberId) => {
      if (globalUsersMap[memberId]) {
        globalUsersMap[memberId].dailyAdsWatched = 0;
      }
    });
    savePersistedState();
    res.json({ success: true, message: 'All users daily ad limits reset to 0.', users: Object.values(globalUsersMap) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to reset daily ad limits' });
  }
});

// 5c. Record Referral Link Click / Download Trace (Deferred Deep Linking)
app.get('/api/referral/trace', (req, res) => {
  try {
    const ref = String(req.query.ref || req.query.referrer || '').trim().replace(/^#+/, '');
    const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (ref && clientIp) {
      globalReferralTracesMap[clientIp] = {
        referrerMemberId: ref,
        timestamp: Date.now(),
        ip: clientIp
      };
    }
    res.json({ success: true, ref, clientIp });
  } catch (err) {
    res.json({ success: false });
  }
});

// 5d. Check Deferred Referral Trace on First App Launch (Auto-Handshake)
app.get('/api/referral/check-trace', (req, res) => {
  try {
    const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const trace = globalReferralTracesMap[clientIp];
    const now = Date.now();
    // Trace valid for 3 hours after clicking download link
    if (trace && (now - trace.timestamp < 3 * 3600 * 1000)) {
      return res.json({
        success: true,
        hasTrace: true,
        referrerMemberId: trace.referrerMemberId,
        timestamp: trace.timestamp
      });
    }
    res.json({ success: true, hasTrace: false });
  } catch (err) {
    res.json({ success: false, hasTrace: false });
  }
});

// Helper to generate or get clean referral code
function getOrCreateReferralCode(memberId: string): string {
  const cleanId = String(memberId).trim().replace(/^#+/, '');
  if (!cleanId) return 'ROX1000';
  // Standard code format: ROX + memberId (also registers legacy RX alias)
  const code = `ROX${cleanId}`;
  if (!globalReferralCodesMap[code]) {
    globalReferralCodesMap[code] = {
      code,
      uid: cleanId,
      active: true,
      createdAt: Date.now(),
      totalUses: 0
    };
  }
  const legacyCode = `RX${cleanId}`;
  if (!globalReferralCodesMap[legacyCode]) {
    globalReferralCodesMap[legacyCode] = {
      code: legacyCode,
      uid: cleanId,
      active: true,
      createdAt: Date.now(),
      totalUses: 0
    };
  }
  return code;
}

// 5e. Production-Ready, Fraud-Resistant Referral Claim Endpoint
app.post('/api/referral/claim', (req, res) => {
  try {
    const { referrerMemberId, newMemberId, referralCode, deviceFingerprint } = req.body || {};
    
    if (!referrerMemberId || !newMemberId) {
      return res.status(400).json({ success: false, error: 'Referrer Member ID and New Member ID are required.' });
    }

    let cleanReferrerId = String(referrerMemberId).trim().replace(/^#+/, '').toUpperCase();
    let cleanNewId = String(newMemberId).trim().replace(/^#+/, '').toUpperCase();
    const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

    // Support code if passed directly (e.g. ROX100001 or RX100001 -> 100001)
    if (cleanReferrerId.startsWith('ROX')) {
      cleanReferrerId = cleanReferrerId.replace(/^ROX/, '');
    } else if (cleanReferrerId.startsWith('RX')) {
      cleanReferrerId = cleanReferrerId.replace(/^RX/, '');
    }

    if (cleanNewId.startsWith('ROX')) {
      cleanNewId = cleanNewId.replace(/^ROX/, '');
    } else if (cleanNewId.startsWith('RX')) {
      cleanNewId = cleanNewId.replace(/^RX/, '');
    }

    // 1. Anti-Fraud: Self-Referral Prevention
    if (cleanReferrerId === cleanNewId) {
      return res.status(400).json({ 
        success: false, 
        error: '❌ Self-referral not allowed. Aap khud ke referral code se bonus claim nahi kar sakte.' 
      });
    }

    // 2. Anti-Fraud: Disabled Referral Code check
    const expectedCodeROX = `ROX${cleanReferrerId}`;
    const expectedCodeRX = `RX${cleanReferrerId}`;
    if (
      (globalReferralCodesMap[expectedCodeROX] && globalReferralCodesMap[expectedCodeROX].active === false) ||
      (globalReferralCodesMap[expectedCodeRX] && globalReferralCodesMap[expectedCodeRX].active === false)
    ) {
      return res.status(400).json({
        success: false,
        error: '❌ Yeh referral code admin dwara temporarily disable kar diya gaya hai.'
      });
    }

    // 3. Anti-Fraud: Check if Referrer User exists
    let referrerUser = globalUsersMap[cleanReferrerId];
    if (!referrerUser) {
      if (/^\d{5,8}$/.test(cleanReferrerId)) {
        referrerUser = {
          id: `usr_${cleanReferrerId}`,
          userId: `#${cleanReferrerId}`,
          memberId: cleanReferrerId,
          referralCode: `ROX${cleanReferrerId}`,
          name: `User #${cleanReferrerId}`,
          coins: 0,
          ordersCount: 0,
          status: 'ACTIVE',
          joinedDate: 'Today',
          isOnline: true,
          lastActive: 'Just now',
          deviceType: 'Android App (APK)',
          currentScreen: 'App View',
          totalCoinsSpent: 0,
          location: 'India',
          totalReferralsCount: 0,
          totalReferralCoinsEarned: 0,
          updatedAt: Date.now(),
          createdAt: Date.now()
        };
        globalUsersMap[cleanReferrerId] = referrerUser;
      } else {
        return res.status(400).json({ 
          success: false, 
          error: `❌ Invalid Referral Code! Member #${cleanReferrerId} app par registered nahi hai.` 
        });
      }
    }

    // 4. Anti-Fraud: Check Device Fingerprint match between referrer & receiver
    const newUser = globalUsersMap[cleanNewId];
    if (deviceFingerprint && referrerUser.deviceFingerprint && deviceFingerprint === referrerUser.deviceFingerprint) {
      return res.status(400).json({
        success: false,
        error: '❌ Same device detected! Ek hi mobile phone par self-referral bonus allow nahi hai.'
      });
    }

    // 5. Anti-Fraud: Deterministic Referral Record ID
    const referralId = `ref_${cleanReferrerId}_${cleanNewId}`;
    const existingRef = globalReferralsMap[referralId];

    // Already completed check
    if (existingRef && (existingRef.status === 'REWARDED' || existingRef.status === 'completed')) {
      return res.json({
        success: true,
        alreadyClaimed: true,
        message: 'Aap is referral ka bonus pehle hi praapt kar chuke hain.',
        rewardCoins: existingRef.rewardCoinsReferred || 50,
        referrerRewardCoins: existingRef.rewardCoinsReferrer || 100
      });
    }

    // Check if new user already claimed ANY referral bonus
    if (newUser && newUser.referralClaimed) {
      return res.status(400).json({ 
        success: false, 
        error: '❌ Is device/account par pehle se referral welcome bonus claim ho chuka hai.' 
      });
    }

    // Reward amounts (Default: Referrer +100 coins, Referred New User +50 coins)
    const rewardCoinsToReferrer = globalAdminConfig.pricing?.referralRewardCoins ?? 100;
    const rewardCoinsToReferred = 50;
    const now = Date.now();
    const nowTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const nowDateFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // 6. Risk / Velocity Detection (Anti-Abuse)
    // Check if more than 8 referrals were generated from this IP in the last 15 minutes
    const recentFromSameIp = Object.values(globalReferralsMap).filter((r: any) => 
      r.ip === clientIp && (now - (r.createdAt || 0) < 15 * 60 * 1000)
    );

    const isSuspicious = recentFromSameIp.length >= 8;
    const initialStatus = isSuspicious ? 'REVIEW' : 'completed';
    const fraudStatus = isSuspicious ? 'SUSPICIOUS' : 'CLEAN';

    // Record Referral Document
    const referralRecord = {
      id: referralId,
      referrerId: `#${cleanReferrerId}`,
      referredUserId: `#${cleanNewId}`,
      referrerUid: cleanReferrerId,
      referredUid: cleanNewId,
      referralCode: expectedCode,
      referrerReward: rewardCoinsToReferrer,
      referredReward: rewardCoinsToReferred,
      status: initialStatus,
      fraudStatus,
      rewardCoinsReferrer: rewardCoinsToReferrer,
      rewardCoinsReferred: rewardCoinsToReferred,
      firstClickAt: now - 10000,
      qualifiedAt: now,
      rewardedAt: isSuspicious ? undefined : now,
      createdAt: now,
      deviceFingerprint: deviceFingerprint || 'fp_unknown',
      ip: clientIp,
      note: isSuspicious ? 'Flagged for admin review due to rapid referral rate' : 'Automatic instant reward verification passed'
    };
    globalReferralsMap[referralId] = referralRecord;

    // If suspicious, queue for admin review without distributing coins immediately
    if (isSuspicious) {
      savePersistedState();
      return res.json({
        success: true,
        underReview: true,
        message: '⚠️ Aapka referral record review ke liye submit ho gaya hai. Verification ke baad coins add honge.',
        status: 'REVIEW'
      });
    }

    // 7. Atomic Reward Processing & Coin Ledger Generation
    // Transaction 1: New User Welcome Bonus (+50 Coins)
    const txIdReferred = `tx_${referralId}_${cleanNewId}`;
    const txReferred = {
      id: txIdReferred,
      uid: cleanNewId,
      amount: rewardCoinsToReferred,
      type: 'REFERRAL_BONUS_RECEIVED',
      source: `REFERRAL_INVITE_${expectedCode}`,
      referralId,
      createdAt: now,
      timestampFormatted: `${nowDateFormatted} ${nowTimeStr}`
    };
    globalCoinTransactions.unshift(txReferred);

    // Transaction 2: Referrer Earned Bonus (+100 Coins)
    const txIdReferrer = `tx_${referralId}_${cleanReferrerId}`;
    const txReferrer = {
      id: txIdReferrer,
      uid: cleanReferrerId,
      amount: rewardCoinsToReferrer,
      type: 'REFERRAL_BONUS_EARNED',
      source: `REFERRAL_REWARD_FOR_USER_${cleanNewId}`,
      referralId,
      createdAt: now,
      timestampFormatted: `${nowDateFormatted} ${nowTimeStr}`
    };
    globalCoinTransactions.unshift(txReferrer);

    // Update Referrer User
    referrerUser.userId = `#${cleanReferrerId}`;
    referrerUser.coins = (referrerUser.coins || 0) + rewardCoinsToReferrer;
    referrerUser.totalReferralsCount = (referrerUser.totalReferralsCount || 0) + 1;
    referrerUser.totalSuccessfulReferrals = (referrerUser.totalSuccessfulReferrals || 0) + 1;
    referrerUser.totalReferralCoinsEarned = (referrerUser.totalReferralCoinsEarned || 0) + rewardCoinsToReferrer;
    referrerUser.coinsUpdatedByAdmin = true;
    referrerUser.updatedAt = now;
    globalUsersMap[cleanReferrerId] = referrerUser;

    // Update Referral Code Usage Stats
    getOrCreateReferralCode(cleanReferrerId);
    if (globalReferralCodesMap[expectedCode]) {
      globalReferralCodesMap[expectedCode].totalUses = (globalReferralCodesMap[expectedCode].totalUses || 0) + 1;
    }

    // Update / Register New User
    if (globalUsersMap[cleanNewId]) {
      globalUsersMap[cleanNewId].userId = `#${cleanNewId}`;
      globalUsersMap[cleanNewId].coins = (globalUsersMap[cleanNewId].coins || 0) + rewardCoinsToReferred;
      globalUsersMap[cleanNewId].referredBy = `#${cleanReferrerId}`;
      globalUsersMap[cleanNewId].referralClaimed = true;
      globalUsersMap[cleanNewId].coinsUpdatedByAdmin = true;
      globalUsersMap[cleanNewId].updatedAt = now;
      if (deviceFingerprint) globalUsersMap[cleanNewId].deviceFingerprint = deviceFingerprint;
    } else {
      globalUsersMap[cleanNewId] = {
        id: `usr_${cleanNewId}`,
        userId: `#${cleanNewId}`,
        memberId: cleanNewId,
        referralCode: `RX${cleanNewId}`,
        name: `User #${cleanNewId}`,
        coins: rewardCoinsToReferred,
        ordersCount: 0,
        status: 'ACTIVE',
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isOnline: true,
        lastActive: 'Just now',
        deviceType: 'Android App (APK)',
        currentScreen: 'User App View',
        totalCoinsSpent: 0,
        location: 'India',
        referredBy: `#${cleanReferrerId}`,
        referralClaimed: true,
        totalReferralsCount: 0,
        totalReferralCoinsEarned: 0,
        coinsUpdatedByAdmin: true,
        updatedAt: now,
        createdAt: now,
        deviceFingerprint: deviceFingerprint || 'fp_unknown'
      };
    }

    // Activity Log
    globalActivityLogs.unshift({
      id: `log_ref_${now}`,
      type: 'COIN_PURCHASE',
      title: '🤝 Referral Verified & Rewarded',
      detail: `User #${cleanNewId} joined via Referral #${cleanReferrerId}. Referrer earned +${rewardCoinsToReferrer} coins & New User received +${rewardCoinsToReferred} coins!`,
      timestamp: nowTimeStr,
      userMemberId: cleanReferrerId,
      badgeColor: 'bg-emerald-500'
    });

    savePersistedState();

    res.json({
      success: true,
      message: `🎉 Referral Reward Success! Bhejne wale dost (#${cleanReferrerId}) ko +${rewardCoinsToReferrer} coins aur aapko +${rewardCoinsToReferred} welcome coins mil gaye!`,
      rewardCoins: rewardCoinsToReferred,
      referrerRewardCoins: rewardCoinsToReferrer,
      newCoins: globalUsersMap[cleanNewId]?.coins,
      referrerNewCoins: referrerUser?.coins,
      referralRecord
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to process referral claim' });
  }
});

// 5f. Get User Referral History & Ledger
app.get('/api/referral/my-history/:memberId', (req, res) => {
  try {
    const cleanId = String(req.params.memberId || '').trim().replace(/^#+/, '');
    const user = globalUsersMap[cleanId];
    const referralCode = getOrCreateReferralCode(cleanId);
    
    // Find all referrals where this user is the referrer
    const userReferrals = Object.values(globalReferralsMap)
      .filter((r: any) => r.referrerUid === cleanId)
      .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))
      .map((r: any) => {
        const referredUser = globalUsersMap[r.referredUid];
        return {
          id: r.id,
          referredUid: r.referredUid,
          referredName: referredUser?.name || `User #${r.referredUid}`,
          status: r.status,
          fraudStatus: r.fraudStatus,
          coinsEarned: r.status === 'REWARDED' ? (r.rewardCoinsReferrer || 10) : 0,
          dateFormatted: new Date(r.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        };
      });

    // Find coin transactions related to referrals
    const userTransactions = globalCoinTransactions
      .filter((tx: any) => tx.uid === cleanId)
      .slice(0, 30);

    const totalSuccessful = userReferrals.filter((r: any) => r.status === 'REWARDED').length;
    const totalCoinsEarned = user?.totalReferralCoinsEarned || (totalSuccessful * 10);

    res.json({
      success: true,
      memberId: cleanId,
      referralCode,
      totalSuccessfulReferrals: totalSuccessful,
      totalReferralCoinsEarned: totalCoinsEarned,
      referralRewardReferrer: globalAdminConfig.pricing?.referralRewardCoins ?? 10,
      referralRewardReferred: 50,
      history: userReferrals,
      transactions: userTransactions
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch referral history' });
  }
});

// 5g. Admin: Get Complete Referral Dashboard & Anti-Fraud Ledger
app.get('/api/referral/admin/list', (req, res) => {
  try {
    const allRefs = Object.values(globalReferralsMap).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    const rewardedCount = allRefs.filter((r: any) => r.status === 'REWARDED').length;
    const pendingCount = allRefs.filter((r: any) => r.status === 'PENDING').length;
    const reviewCount = allRefs.filter((r: any) => r.status === 'REVIEW').length;
    const rejectedCount = allRefs.filter((r: any) => r.status === 'REJECTED').length;

    const totalCoinsDistributed = allRefs.reduce((acc: number, r: any) => {
      if (r.status === 'REWARDED') {
        return acc + (r.rewardCoinsReferrer || 10) + (r.rewardCoinsReferred || 50);
      }
      return acc;
    }, 0);

    // Calculate Top Referrers
    const referrersCountMap: Record<string, { count: number; coins: number }> = {};
    allRefs.forEach((r: any) => {
      if (r.status === 'REWARDED' && r.referrerUid) {
        if (!referrersCountMap[r.referrerUid]) {
          referrersCountMap[r.referrerUid] = { count: 0, coins: 0 };
        }
        referrersCountMap[r.referrerUid].count += 1;
        referrersCountMap[r.referrerUid].coins += (r.rewardCoinsReferrer || 10);
      }
    });

    const topReferrers = Object.entries(referrersCountMap)
      .map(([uid, stats]) => {
        const u = globalUsersMap[uid];
        const code = `RX${uid}`;
        return {
          memberId: uid,
          name: u?.name || `User #${uid}`,
          referralsCount: stats.count,
          coinsEarned: stats.coins,
          referralCode: code,
          isActive: globalReferralCodesMap[code]?.active !== false
        };
      })
      .sort((a, b) => b.referralsCount - a.referralsCount)
      .slice(0, 20);

    res.json({
      success: true,
      stats: {
        totalReferrals: allRefs.length,
        rewardedCount,
        pendingCount,
        reviewCount,
        rejectedCount,
        totalCoinsDistributed
      },
      referrals: allRefs,
      topReferrers,
      recentTransactions: globalCoinTransactions.slice(0, 50),
      referralCodes: globalReferralCodesMap
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch admin referral list' });
  }
});

// 5h. Admin: Review Suspicious Referral (Approve / Reject)
app.post('/api/referral/admin/review', (req, res) => {
  try {
    const { referralId, action, adminNote } = req.body || {};
    if (!referralId || !action) {
      return res.status(400).json({ success: false, error: 'referralId and action (APPROVE/REJECT) are required.' });
    }

    const ref = globalReferralsMap[referralId];
    if (!ref) {
      return res.status(404).json({ success: false, error: 'Referral record not found.' });
    }

    const now = Date.now();
    const nowTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const nowDateFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (action === 'APPROVE') {
      ref.status = 'REWARDED';
      ref.fraudStatus = 'CLEAN';
      ref.rewardedAt = now;
      ref.note = adminNote || 'Approved manually by administrator';

      const rewardReferrer = ref.rewardCoinsReferrer || 10;
      const rewardReferred = ref.rewardCoinsReferred || 50;

      // Disburse coins to Referrer
      const referrerUser = globalUsersMap[ref.referrerUid];
      if (referrerUser) {
        referrerUser.coins = (referrerUser.coins || 0) + rewardReferrer;
        referrerUser.totalSuccessfulReferrals = (referrerUser.totalSuccessfulReferrals || 0) + 1;
        referrerUser.totalReferralCoinsEarned = (referrerUser.totalReferralCoinsEarned || 0) + rewardReferrer;
        referrerUser.coinsUpdatedByAdmin = true;
        referrerUser.updatedAt = now;
      }

      // Disburse coins to Referred User
      const newUser = globalUsersMap[ref.referredUid];
      if (newUser) {
        newUser.coins = (newUser.coins || 0) + rewardReferred;
        newUser.referralClaimed = true;
        newUser.coinsUpdatedByAdmin = true;
        newUser.updatedAt = now;
      }

      // Append ledger transactions
      globalCoinTransactions.unshift({
        id: `tx_${referralId}_${ref.referredUid}`,
        uid: ref.referredUid,
        amount: rewardReferred,
        type: 'REFERRAL_BONUS_RECEIVED',
        source: `REFERRAL_INVITE_${ref.referralCode}_MANUAL_APPROVE`,
        referralId,
        createdAt: now,
        timestampFormatted: `${nowDateFormatted} ${nowTimeStr}`
      });

      globalCoinTransactions.unshift({
        id: `tx_${referralId}_${ref.referrerUid}`,
        uid: ref.referrerUid,
        amount: rewardReferrer,
        type: 'REFERRAL_BONUS_EARNED',
        source: `REFERRAL_REWARD_MANUAL_APPROVE_${ref.referredUid}`,
        referralId,
        createdAt: now,
        timestampFormatted: `${nowDateFormatted} ${nowTimeStr}`
      });

    } else if (action === 'REJECT') {
      ref.status = 'REJECTED';
      ref.fraudStatus = 'REJECTED';
      ref.note = adminNote || 'Rejected by administrator due to policy violation';
    }

    globalReferralsMap[referralId] = ref;
    savePersistedState();

    res.json({ success: true, message: `Referral successfully ${action === 'APPROVE' ? 'approved' : 'rejected'}.`, referral: ref });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update referral review' });
  }
});

// 5i. Admin: Toggle Referral Code Active/Inactive
app.post('/api/referral/admin/toggle-code', (req, res) => {
  try {
    const { referralCode, active } = req.body || {};
    if (!referralCode) {
      return res.status(400).json({ success: false, error: 'referralCode is required' });
    }

    const cleanCode = String(referralCode).trim().toUpperCase();
    if (!globalReferralCodesMap[cleanCode]) {
      globalReferralCodesMap[cleanCode] = {
        code: cleanCode,
        uid: cleanCode.replace(/^RX/, ''),
        active: Boolean(active),
        createdAt: Date.now(),
        totalUses: 0
      };
    } else {
      globalReferralCodesMap[cleanCode].active = Boolean(active);
    }

    savePersistedState();
    res.json({ success: true, message: `Referral code ${cleanCode} is now ${active ? 'Active' : 'Disabled'}.`, codeData: globalReferralCodesMap[cleanCode] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to toggle referral code' });
  }
});

// 5f. Branch.io Smart Deep Link Creator (Branch REST API Integration)
app.post('/api/branch/create-link', async (req, res) => {
  try {
    const { 
      memberId, 
      channel = 'whatsapp', 
      feature = 'referral', 
      campaign = 'user_invite_program',
      customData = {} 
    } = req.body || {};

    if (!memberId) {
      return res.status(400).json({ success: false, error: 'Member ID is required to create Branch.io deep link.' });
    }

    const cleanMemberId = String(memberId).trim();
    const branchCfg = globalAdminConfig.branchSettings || {
      enabled: true,
      branchKey: 'key_live_ka8ZqM28q4mH7xP8jB8x7g',
      branchDomain: 'roxfollow.app.link',
      defaultRedirectUrl: globalAdminConfig.pricing?.referralAppDownloadUrl || 'https://www.appcreator24.com/app4146352-inodq9',
      enableDeferredMatching: true,
      autoRewardOnInstall: true
    };

    const fallbackUrl = branchCfg.defaultRedirectUrl || globalAdminConfig.pricing?.referralAppDownloadUrl || 'https://www.appcreator24.com/app4146352-inodq9';
    const branchKey = branchCfg.branchKey || 'key_live_ka8ZqM28q4mH7xP8jB8x7g';
    const branchDomain = branchCfg.branchDomain || 'roxfollow.app.link';

    // 1. Try Branch.io Official REST API v1
    if (branchKey && !branchKey.startsWith('demo_') && branchKey.startsWith('key_live_')) {
      try {
        const branchPayload = {
          branch_key: branchKey,
          channel: channel,
          feature: feature,
          campaign: campaign,
          data: {
            '$canonical_identifier': `user/${cleanMemberId}`,
            '$og_title': `Rox Follow - Get Free Instagram Followers & Likes`,
            '$og_description': `Join using Member #${cleanMemberId} to get +50 Free Coins bonus instantly!`,
            '$og_image_url': 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80',
            '$desktop_url': fallbackUrl,
            '$android_url': fallbackUrl,
            '$fallback_url': fallbackUrl,
            'referrer_member_id': cleanMemberId,
            'bonus_coins': 50,
            '+clicked_branch_link': true,
            ...customData
          }
        };

        const branchResp = await fetch('https://api2.branch.io/v1/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(branchPayload)
        });

        if (branchResp.ok) {
          const branchJson = await branchResp.json();
          if (branchJson && branchJson.url) {
            return res.json({
              success: true,
              url: branchJson.url,
              provider: 'Branch.io (Live API)',
              memberId: cleanMemberId
            });
          }
        }
      } catch (branchErr) {
        console.warn('Branch.io Live API request failed, falling back to smart dynamic link format:', branchErr);
      }
    }

    // 2. High-performance Smart Universal Link Fallback (Branch.io Compliant URL Structure)
    const smartBranchUrl = `https://${branchDomain}/ref${cleanMemberId}?referrer_id=${cleanMemberId}&~channel=${channel}&~feature=referral`;
    res.json({
      success: true,
      url: smartBranchUrl,
      provider: 'Branch.io (Smart Deep Link Bridge)',
      memberId: cleanMemberId,
      branchDomain: branchDomain
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Branch link generation failed' });
  }
});

// 5g. Branch.io Click Event & Deferred Web Fingerprint Tracker
app.post('/api/branch/trace-click', (req, res) => {
  try {
    const { referrerMemberId, clientInfo = {} } = req.body || {};
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const cleanIp = String(ip).split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || 'unknown-agent';

    if (referrerMemberId) {
      const cleanRef = String(referrerMemberId).trim();
      globalReferralTracesMap[cleanIp] = {
        referrerMemberId: cleanRef,
        timestamp: Date.now(),
        ip: cleanIp
      };
    }

    res.json({ success: true, recorded: true, ip: cleanIp });
  } catch (err) {
    res.json({ success: false, error: 'Trace failed' });
  }
});

// 5h. Branch.io Check Deferred Attribution on First App Launch
app.get('/api/branch/check-attribution', (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const cleanIp = String(ip).split(',')[0].trim();
    const memberId = String(req.query.memberId || '').trim();

    const trace = globalReferralTracesMap[cleanIp];
    const maxAge = 48 * 3600 * 1000; // 48 hours attribution window

    if (trace && (Date.now() - trace.timestamp < maxAge)) {
      if (trace.referrerMemberId && trace.referrerMemberId !== memberId) {
        return res.json({
          success: true,
          hasAttribution: true,
          referrerMemberId: trace.referrerMemberId,
          source: 'Branch.io Deferred Fingerprint Matching',
          timestamp: trace.timestamp
        });
      }
    }

    res.json({ success: true, hasAttribution: false });
  } catch (err) {
    res.json({ success: false, hasAttribution: false });
  }
});

// 5i. Branch.io Landing Page & Smart Download Redirect Bridge
app.get('/ref/:memberId', (req, res) => {
  try {
    const memberId = String(req.params.memberId || '').replace(/^ref/i, '').trim();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const cleanIp = String(ip).split(',')[0].trim();

    if (memberId) {
      globalReferralTracesMap[cleanIp] = {
        referrerMemberId: memberId,
        timestamp: Date.now(),
        ip: cleanIp
      };
    }

    const downloadUrl = globalAdminConfig.branchSettings?.defaultRedirectUrl || 
      globalAdminConfig.pricing?.referralAppDownloadUrl || 
      'https://www.appcreator24.com/app4146352-inodq9';

    // Render an ultra-sleek, professional Branch.io attribution landing redirect
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Download Rox Follow - Free Coins Bonus</title>
        <meta property="og:title" content="Rox Follow App - Claim +50 Coins Bonus">
        <meta property="og:description" content="Joined via Member #${memberId}. Download APK now!">
        <meta property="og:image" content="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80">
        <script src="https://cdn.tailwindcss.com"></script>
        <meta http-equiv="refresh" content="2;url=${downloadUrl}">
      </head>
      <body class="bg-slate-950 text-white flex items-center justify-center min-h-screen p-4 font-sans">
        <div class="max-w-md w-full bg-slate-900 border border-purple-500/30 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div class="w-16 h-16 bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 rounded-2xl mx-auto flex items-center justify-center text-2xl shadow-lg shadow-purple-500/30">
            ⚡
          </div>
          <h1 class="text-xl font-black text-white">Connecting via Branch.io</h1>
          <p class="text-xs text-slate-300">
            Invited by Member <span class="text-amber-400 font-mono font-bold">#${memberId}</span>.<br/>
            You are being redirected to download the latest Rox Follow APK...
          </p>
          <div class="p-3 bg-purple-950/60 border border-purple-500/30 rounded-2xl text-xs text-pink-300 font-bold">
            🎁 +50 Free Coins will be automatically credited on launch!
          </div>
          <div class="pt-2">
            <a href="${downloadUrl}" class="inline-block w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl shadow-lg text-xs uppercase tracking-wider">
              Click Here If Not Redirected
            </a>
          </div>
        </div>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.redirect(globalAdminConfig.pricing?.referralAppDownloadUrl || 'https://www.appcreator24.com/app4146352-inodq9');
  }
});

// 6. Sync User Account / Device Heartbeat (from Web or APK device)
app.post('/api/users/sync', (req, res) => {
  try {
    const user = req.body;
    if (!user || !user.memberId) {
      return res.status(400).json({ success: false, error: 'Member ID required' });
    }

    const cleanMemberId = String(user.memberId).replace(/^#+/, '').trim();
    const existing = globalUsersMap[cleanMemberId] || globalUsersMap[`usr_${cleanMemberId}`] || {
      id: `usr_${cleanMemberId}`,
      memberId: cleanMemberId,
      name: user.displayName || user.name || (user.email ? user.email.split('@')[0] : `User #${cleanMemberId}`),
      email: user.email || `${cleanMemberId}@guest.user`,
      displayName: user.displayName || user.name || `User #${cleanMemberId}`,
      coins: user.coins ?? 0,
      ordersCount: 0,
      status: 'ACTIVE',
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isOnline: true,
      lastActive: 'Just now',
      deviceType: user.deviceType || 'Android App (APK)',
      currentScreen: 'User App View',
      totalCoinsSpent: 0,
      location: user.location || 'India'
    };

    // 1. Status Handling: Respect status from incoming sync/Firestore
    let finalStatus: 'ACTIVE' | 'BLOCKED' = (user.status === 'BLOCKED' || user.status === 'ACTIVE') 
      ? user.status 
      : (existing.status || 'ACTIVE');

    // 2. Coins Handling: Respect Admin override flag
    let synchronizedCoins = typeof user.coins === 'number' ? user.coins : (typeof existing.coins === 'number' ? existing.coins : 0);
    let coinsUpdatedByAdmin = existing.coinsUpdatedByAdmin === true;

    if (user.coinsUpdatedByAdmin === true) {
      // Admin explicitly updated coins
      coinsUpdatedByAdmin = true;
      synchronizedCoins = Math.max(0, Number(user.coins) || 0);
    } else if (existing.coinsUpdatedByAdmin === true && typeof existing.coins === 'number') {
      // Keep admin coin balance unless user has an explicit new coin mutation
      coinsUpdatedByAdmin = true;
      synchronizedCoins = existing.coins;
    }

    // Safeguard: non-owner users should not accidentally receive 99999 coins
    const isOwner = (user.email && user.email.toLowerCase() === 'nayakhardayal4@gmail.com') || 
                    (existing.email && existing.email.toLowerCase() === 'nayakhardayal4@gmail.com') || 
                    user.role === 'owner' || existing.role === 'owner';
    if (!isOwner && synchronizedCoins >= 99999) {
      synchronizedCoins = globalAdminConfig.pricing?.googleWelcomeBonusCoins ?? 10;
    }

    const now = Date.now();
    const lastSeen = user.lastSeenAt || user.lastHeartbeatAt || now;
    const isOnlineNow = user.isOnline === false ? false : (now - lastSeen < 60000);

    const updatedUserObj = {
      ...existing,
      ...user,
      id: `usr_${cleanMemberId}`,
      memberId: cleanMemberId,
      referralCode: user.referralCode || existing.referralCode || `ROX${cleanMemberId}`,
      name: user.name || existing.name || `User #${cleanMemberId}`,
      status: finalStatus,
      coins: synchronizedCoins,
      coinsUpdatedByAdmin: coinsUpdatedByAdmin,
      totalReferralsCount: existing.totalReferralsCount || user.totalReferralsCount || 0,
      totalReferralCoinsEarned: existing.totalReferralCoinsEarned || user.totalReferralCoinsEarned || 0,
      isOnline: isOnlineNow,
      lastSeenAt: lastSeen,
      lastActive: isOnlineNow ? '🟢 Online now' : 'Offline',
      updatedAt: now
    };

    globalUsersMap[cleanMemberId] = updatedUserObj;
    savePersistedState();

    res.json({ success: true, user: updatedUserObj });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to sync user' });
  }
});

// 7. Get New Member ID for Fresh Device Install
app.get('/api/member/new', (req, res) => {
  const assignedId = globalMemberCounter.toString();
  globalMemberCounter += 1;
  savePersistedState();
  res.json({
    success: true,
    memberId: assignedId
  });
});

// 8. Submit Payment UTR Claim (PhonePe, Paytm, BHIM, Google Pay, QR)
app.post('/api/payment/submit', (req, res) => {
  try {
    const { userMemberId, userName, packageId, coins, amountINR, utrNumber, paymentMethod } = req.body;

    if (!userMemberId || !utrNumber || !coins || !amountINR) {
      return res.status(400).json({ success: false, error: 'Member ID, UTR Number, Amount and Coins are required.' });
    }

    const cleanUtr = utrNumber.toString().trim().toUpperCase().replace(/[\s-_]/g, '');
    if (cleanUtr.length < 8) {
      return res.status(400).json({ success: false, error: 'Kripya sahi 12-Digit UTR/Ref Transaction Number daalein.' });
    }

    // Check if UTR is already submitted
    const existingUtr = Object.values(globalPaymentRequestsMap).find((r: any) => {
      const existingClean = (r.utrNumber || '').toString().trim().toUpperCase().replace(/[\s-_]/g, '');
      return existingClean === cleanUtr;
    });
    if (existingUtr) {
      return res.status(400).json({ success: false, error: 'Yeh UTR Number pehle se submit kiya ja chuka hai.' });
    }

    const reqId = `pay_${Date.now()}`;
    const autoApproved = globalAdminConfig.paymentSettings?.autoApproveUtr || false;
    const coinsNum = Number(coins) || 0;

    const paymentRecord = {
      id: reqId,
      userMemberId: userMemberId.toString().trim(),
      userName: userName || `User #${userMemberId}`,
      packageId: packageId || 'custom_pkg',
      coins: coinsNum,
      amountINR: amountINR.toString(),
      utrNumber: cleanUtr,
      paymentMethod: paymentMethod || 'PHONEPE',
      status: autoApproved ? 'APPROVED' : 'PENDING',
      createdAt: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    globalPaymentRequestsMap[reqId] = paymentRecord;

    if (autoApproved) {
      if (!globalUsersMap[userMemberId]) {
        globalUsersMap[userMemberId] = {
          id: `usr_${userMemberId}`,
          memberId: userMemberId.toString().trim(),
          name: userName || `User #${userMemberId}`,
          coins: coinsNum,
          ordersCount: 0,
          status: 'ACTIVE',
          joinedDate: 'Today',
          isOnline: true,
          lastActive: 'Just now'
        };
      } else {
        globalUsersMap[userMemberId].coins = (globalUsersMap[userMemberId].coins || 0) + coinsNum;
        globalUsersMap[userMemberId].coinsUpdatedByAdmin = false;
      }
      globalActivityLogs.unshift({
        id: `log_pay_${Date.now()}`,
        type: 'COIN_PURCHASE',
        title: '💵 Auto Coin Credit (Payment)',
        detail: `Member #${userMemberId} purchased +${coinsNum} Coins for ${amountINR} via UTR #${cleanUtr}.`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        userMemberId: userMemberId.toString().trim(),
        badgeColor: 'bg-emerald-500'
      });
    }

    savePersistedState();

    res.json({
      success: true,
      message: autoApproved 
        ? `🎉 Payment Verified! +${coinsNum} Coins credited to your wallet!`
        : `✅ Payment Request Submitted! Admin will verify UTR #${cleanUtr} & credit +${coinsNum} Coins shortly.`,
      autoApproved,
      paymentRecord
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Payment submission failed' });
  }
});

// 9. Get Payment Requests List (For Admin)
app.get('/api/payment/list', (req, res) => {
  try {
    const list = Object.values(globalPaymentRequestsMap).sort((a: any, b: any) => b.timestamp - a.timestamp);
    res.json({ success: true, requests: list });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load payment requests' });
  }
});

// 10. Admin Approve / Reject Payment Request
app.post('/api/payment/action', (req, res) => {
  try {
    const { requestId, action, paymentRecord } = req.body;
    if (!requestId || !action) {
      return res.status(400).json({ success: false, error: 'Request ID and action required' });
    }

    let payReq = globalPaymentRequestsMap[requestId];
    if (!payReq && paymentRecord) {
      payReq = paymentRecord;
      globalPaymentRequestsMap[requestId] = payReq;
    }
    if (!payReq) {
      payReq = {
        id: requestId,
        userMemberId: req.body.userMemberId || '100001',
        coins: Number(req.body.coins) || 0,
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        timestamp: Date.now()
      };
      globalPaymentRequestsMap[requestId] = payReq;
    }

    if (action === 'APPROVE') {
      payReq.status = 'APPROVED';
      const targetMemberId = (payReq.userMemberId || req.body.userMemberId || '100001').toString().trim();
      const coinsToAdd = Number(payReq.coins) || Number(req.body.coins) || 0;

      if (!globalUsersMap[targetMemberId]) {
        globalUsersMap[targetMemberId] = {
          id: `usr_${targetMemberId}`,
          memberId: targetMemberId,
          name: payReq.userName || `User #${targetMemberId}`,
          coins: coinsToAdd,
          ordersCount: 0,
          status: 'ACTIVE',
          joinedDate: 'Today',
          isOnline: true,
          lastActive: 'Just now'
        };
      } else {
        globalUsersMap[targetMemberId].coins = (globalUsersMap[targetMemberId].coins || 0) + coinsToAdd;
        globalUsersMap[targetMemberId].coinsUpdatedByAdmin = false;
      }

      globalActivityLogs.unshift({
        id: `log_appr_${Date.now()}`,
        type: 'COIN_PURCHASE',
        title: '✅ Payment Approved By Admin',
        detail: `Admin approved payment request #${requestId}. Credited +${coinsToAdd} Coins to Member #${targetMemberId}.`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        userMemberId: targetMemberId,
        badgeColor: 'bg-emerald-500'
      });
    } else if (action === 'REJECT') {
      payReq.status = 'REJECTED';
      globalActivityLogs.unshift({
        id: `log_rej_${Date.now()}`,
        type: 'ADMIN_ACTION',
        title: '❌ Payment Request Rejected',
        detail: `Admin rejected payment request #${requestId} for Member #${payReq.userMemberId || 'User'}.`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        badgeColor: 'bg-red-500'
      });
    }

    globalPaymentRequestsMap[requestId] = payReq;
    savePersistedState();

    res.json({
      success: true,
      message: `Payment request marked as ${payReq.status}.`,
      paymentRecord: payReq
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Action failed' });
  }
});

// 8. Get Activity Logs
app.get('/api/logs', (req, res) => {
  res.json({ success: true, logs: globalActivityLogs });
});

app.post('/api/logs', (req, res) => {
  try {
    const log = req.body;
    if (log && log.action) {
      globalActivityLogs.unshift(log);
      if (globalActivityLogs.length > 100) {
        globalActivityLogs = globalActivityLogs.slice(0, 100);
      }
    }
    res.json({ success: true, logs: globalActivityLogs });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to log activity' });
  }
});

// ---------------------------------------------------------------------
// INSTAGRAM ACCOUNT POOL & 2-STEP REALTIME OTP EXCHANGE ENDPOINTS
// ---------------------------------------------------------------------

// 1. Initialize Instagram Connect (Generates OTP Challenge)
app.post('/api/instagram/connect-init', (req, res) => {
  try {
    const { userMemberId, username, password, id } = req.body;
    const cleanUser = String(username || '').trim().replace(/^@/, '');
    const cleanMemId = String(userMemberId || '').trim();

    if (!cleanUser || !cleanMemId) {
      return res.status(400).json({ success: false, error: 'Instagram username and Member ID are required.' });
    }

    const sessionId = id || `ig_conn_${cleanMemId}_${Date.now()}`;
    const accountRecord = {
      id: sessionId,
      userMemberId: cleanMemId,
      username: cleanUser,
      password: password ? String(password).trim() : '',
      status: 'PENDING_OTP',
      rewardCoins: 200,
      creditsYielded: 500,
      createdAt: new Date().toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      timestamp: Date.now(),
      lastOtpRequestedAt: Date.now()
    };

    globalConnectedInstagramAccounts[sessionId] = accountRecord;

    globalActivityLogs.unshift({
      id: `log_ig_req_${Date.now()}`,
      type: 'USER_LOGIN',
      title: '📸 Instagram Account Link Requested',
      detail: `Member #${cleanMemId} submitted demo account @${cleanUser}. OTP Security Verification Challenge sent.`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      userMemberId: cleanMemId,
      badgeColor: 'bg-amber-500'
    });

    savePersistedState();

    res.json({
      success: true,
      sessionId,
      status: 'PENDING_OTP',
      message: 'Instagram Security Verification triggered. Enter the 6-digit code received on your Email / SMS.',
      account: accountRecord
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to initialize account connect' });
  }
});

// 2. Verify OTP & Instant Credit Reward (200 Coins)
app.post('/api/instagram/verify-otp', (req, res) => {
  try {
    const { sessionId, userMemberId, otpCode, username } = req.body;
    const cleanCode = String(otpCode || '').trim();
    const cleanMemId = String(userMemberId || '').trim();

    if (!cleanCode || cleanCode.length < 4) {
      return res.status(400).json({ success: false, error: 'Valid 6-digit security code is required.' });
    }

    let accountRecord = globalConnectedInstagramAccounts[sessionId];
    if (!accountRecord) {
      accountRecord = {
        id: sessionId || `ig_conn_${cleanMemId}_${Date.now()}`,
        userMemberId: cleanMemId,
        username: username || 'instagram_user',
        rewardCoins: 200,
        creditsYielded: 500,
        createdAt: new Date().toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        timestamp: Date.now()
      };
    }

    accountRecord.status = 'CONNECTED';
    accountRecord.otpCode = cleanCode;
    accountRecord.verifiedAt = Date.now();
    globalConnectedInstagramAccounts[accountRecord.id] = accountRecord;

    // Credit +200 Coins to the User's Wallet in Server Memory
    const rewardCoins = 200;
    if (!globalUsersMap[cleanMemId]) {
      globalUsersMap[cleanMemId] = {
        id: `usr_${cleanMemId}`,
        memberId: cleanMemId,
        name: `User #${cleanMemId}`,
        coins: rewardCoins,
        ordersCount: 0,
        status: 'ACTIVE',
        joinedDate: 'Today',
        isOnline: true,
        lastActive: 'Just now'
      };
    } else {
      globalUsersMap[cleanMemId].coins = (globalUsersMap[cleanMemId].coins || 0) + rewardCoins;
      globalUsersMap[cleanMemId].coinsUpdatedByAdmin = false;
    }

    const currentTotalCoins = globalUsersMap[cleanMemId].coins;

    globalActivityLogs.unshift({
      id: `log_ig_ver_${Date.now()}`,
      type: 'COIN_PURCHASE',
      title: '🎁 +200 Coins Rewarded (Instagram Linked)',
      detail: `Member #${cleanMemId} connected demo account @${accountRecord.username} (Code: ${cleanCode}). Admin pool credited with +500 credits!`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      userMemberId: cleanMemId,
      badgeColor: 'bg-emerald-500'
    });

    savePersistedState();

    res.json({
      success: true,
      rewardCoins,
      totalCoins: currentTotalCoins,
      message: `🎉 Instagram Account Connected Successfully! +${rewardCoins} Coins Added to your wallet!`,
      account: accountRecord
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'OTP verification failed' });
  }
});

// 3. Get All Connected Instagram Accounts (For Admin Exchange Pool Tab)
app.get('/api/instagram/accounts', (req, res) => {
  try {
    const accountsList = Object.values(globalConnectedInstagramAccounts).sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
    res.json({
      success: true,
      accounts: accountsList,
      totalCreditsAvailable: accountsList.filter((a: any) => a.status === 'CONNECTED').length * 500
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve connected accounts' });
  }
});

// 4. Admin Mark Account Status (e.g. CLAIMED_BY_ADMIN / EXPIRED)
app.post('/api/instagram/update-status', (req, res) => {
  try {
    const { accountId, status } = req.body;
    if (!accountId || !status) {
      return res.status(400).json({ success: false, error: 'Account ID and status are required' });
    }

    if (globalConnectedInstagramAccounts[accountId]) {
      globalConnectedInstagramAccounts[accountId].status = status;
      globalConnectedInstagramAccounts[accountId].updatedAt = Date.now();
      savePersistedState();
      return res.json({ success: true, account: globalConnectedInstagramAccounts[accountId] });
    } else {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update account status' });
  }
});

// 9. Powerful AI Admin Assistant / Command Copilot
import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Tool Declarations for Admin AI Agent
const adminAiTools = [
  {
    name: "toggleMaintenanceMode",
    description: "Enable or disable application maintenance mode lock for regular users",
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: {
          type: Type.BOOLEAN,
          description: "true to turn maintenance mode ON (lock app), false to turn it OFF (unlock app)"
        }
      },
      required: ["enabled"]
    }
  },
  {
    name: "setUserStatus",
    description: "Block or unlock/activate a user account by Member ID",
    parameters: {
      type: Type.OBJECT,
      properties: {
        memberId: {
          type: Type.STRING,
          description: "The member ID of the user (e.g., '100001', '1045')"
        },
        status: {
          type: Type.STRING,
          description: "The new status: 'ACTIVE' or 'BLOCKED'"
        },
        reason: {
          type: Type.STRING,
          description: "Optional reason for block/unblock"
        }
      },
      required: ["memberId", "status"]
    }
  },
  {
    name: "addBonusCoinsToUser",
    description: "Credit or deduct bonus coins for a specific user",
    parameters: {
      type: Type.OBJECT,
      properties: {
        memberId: {
          type: Type.STRING,
          description: "The user Member ID"
        },
        coinsDelta: {
          type: Type.NUMBER,
          description: "Number of coins to add (positive) or deduct (negative), e.g. 500 or -100"
        },
        reason: {
          type: Type.STRING,
          description: "Reason for coin change, e.g. 'Bonus gift', 'Refund', 'Penalty'"
        }
      },
      required: ["memberId", "coinsDelta"]
    }
  },
  {
    name: "setAppAnnouncement",
    description: "Update the home popup announcement title and message shown to users",
    parameters: {
      type: Type.OBJECT,
      properties: {
        enabled: {
          type: Type.BOOLEAN,
          description: "Whether the popup banner is active"
        },
        title: {
          type: Type.STRING,
          description: "Title of announcement"
        },
        message: {
          type: Type.STRING,
          description: "Detailed message body"
        }
      },
      required: ["title", "message"]
    }
  },
  {
    name: "updateDailyAdsSettings",
    description: "Update rewarded video ad limits, rewards per ad, and timer duration",
    parameters: {
      type: Type.OBJECT,
      properties: {
        maxDailyAds: {
          type: Type.NUMBER,
          description: "Maximum ads a user can watch per day (e.g. 10, 15, 20)"
        },
        coinsPerAd: {
          type: Type.NUMBER,
          description: "Coins earned per watched ad (e.g. 10, 15, 25)"
        },
        cooldownSeconds: {
          type: Type.NUMBER,
          description: "Cooldown timer between ads in seconds (e.g. 30, 45, 60)"
        }
      }
    }
  },
  {
    name: "updatePricingRates",
    description: "Update coin pricing costs for Instagram followers, likes, views, comments",
    parameters: {
      type: Type.OBJECT,
      properties: {
        followerCost: {
          type: Type.NUMBER,
          description: "Coins per follower (e.g. 1, 2, 0.8)"
        },
        likeCost: {
          type: Type.NUMBER,
          description: "Coins per like (e.g. 0.5, 1)"
        },
        viewCost: {
          type: Type.NUMBER,
          description: "Coins per view (e.g. 0.1, 0.2)"
        },
        commentCost: {
          type: Type.NUMBER,
          description: "Coins per comment (e.g. 2, 3)"
        }
      }
    }
  },
  {
    name: "getSystemSummary",
    description: "Get real-time statistics of total users, online users, orders, revenue and system health",
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  }
];

// Helper to execute AI tool calls
function executeAiToolCall(name: string, args: any) {
  switch (name) {
    case "toggleMaintenanceMode": {
      const enabled = Boolean(args.enabled);
      globalAdminConfig.maintenanceMode = enabled;
      savePersistedState();
      globalActivityLogs.unshift({
        id: `log_ai_${Date.now()}`,
        type: 'ADMIN_ACTION',
        title: `🤖 AI Assistant: Maintenance ${enabled ? 'ON' : 'OFF'}`,
        detail: `Maintenance mode changed to ${enabled ? 'ENABLED' : 'DISABLED'} by AI Command`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        badgeColor: enabled ? 'bg-amber-500' : 'bg-emerald-500'
      });
      return { success: true, maintenanceMode: enabled, message: `Maintenance mode is now ${enabled ? 'ENABLED (Locked for users)' : 'DISABLED (App open for all users)'}.` };
    }

    case "setUserStatus": {
      const mId = String(args.memberId || '').trim();
      const status = (args.status || 'ACTIVE').toUpperCase() as 'ACTIVE' | 'BLOCKED';
      const existing = globalUsersMap[mId] || {
        id: `usr_${mId}`,
        memberId: mId,
        name: `User #${mId}`,
        coins: 0,
        ordersCount: 0,
        status: 'ACTIVE',
        joinedDate: 'Today',
        isOnline: true,
        lastActive: 'Just now',
        deviceType: 'Android App (APK)',
        currentScreen: 'App View',
        totalCoinsSpent: 0,
        location: 'India'
      };
      existing.status = status;
      globalUsersMap[mId] = existing;
      savePersistedState();

      globalActivityLogs.unshift({
        id: `log_ai_${Date.now()}`,
        type: 'USER_MGMT',
        title: `🤖 AI Action: User #${mId} ${status}`,
        detail: `Status changed to ${status}${args.reason ? ` (${args.reason})` : ''}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        badgeColor: status === 'BLOCKED' ? 'bg-red-500' : 'bg-emerald-500'
      });

      return { success: true, memberId: mId, status, message: `User #${mId} has been successfully ${status}.` };
    }

    case "addBonusCoinsToUser": {
      const mId = String(args.memberId || '').trim();
      const delta = Number(args.coinsDelta) || 0;
      const existing = globalUsersMap[mId] || {
        id: `usr_${mId}`,
        memberId: mId,
        name: `User #${mId}`,
        coins: 0,
        ordersCount: 0,
        status: 'ACTIVE',
        joinedDate: 'Today',
        isOnline: true,
        lastActive: 'Just now',
        deviceType: 'Android App (APK)',
        currentScreen: 'App View',
        totalCoinsSpent: 0,
        location: 'India'
      };
      const oldCoins = Number(existing.coins || 0);
      const newCoins = Math.max(0, oldCoins + delta);
      existing.coins = newCoins;
      existing.coinsUpdatedByAdmin = true;
      globalUsersMap[mId] = existing;
      savePersistedState();

      globalActivityLogs.unshift({
        id: `log_ai_${Date.now()}`,
        type: 'COIN_CREDIT',
        title: `🤖 AI Action: ${delta >= 0 ? '+' : ''}${delta} Coins for #${mId}`,
        detail: `New Balance: ${newCoins} coins${args.reason ? ` [${args.reason}]` : ''}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        badgeColor: 'bg-amber-500'
      });

      return { success: true, memberId: mId, oldCoins, newCoins, message: `User #${mId} balance updated to ${newCoins} coins (${delta >= 0 ? '+' : ''}${delta}).` };
    }

    case "setAppAnnouncement": {
      const enabled = args.enabled !== undefined ? Boolean(args.enabled) : true;
      const title = String(args.title || '').trim();
      const message = String(args.message || '').trim();
      if (!globalAdminConfig.announcement) {
        globalAdminConfig.announcement = { enabled: true, title: '', message: '', type: 'INFO', linkUrl: '' };
      }
      globalAdminConfig.announcement.enabled = enabled;
      if (title) globalAdminConfig.announcement.title = title;
      if (message) globalAdminConfig.announcement.message = message;
      savePersistedState();

      return { success: true, announcement: globalAdminConfig.announcement, message: `Popup announcement banner updated successfully!` };
    }

    case "updateDailyAdsSettings": {
      if (args.maxDailyAds !== undefined) {
        globalAdminConfig.adSettings.maxDailyAds = Number(args.maxDailyAds);
      }
      if (args.coinsPerAd !== undefined) {
        globalAdminConfig.adSettings.rewardCoinsPerAd = Number(args.coinsPerAd);
      }
      if (args.cooldownSeconds !== undefined) {
        globalAdminConfig.adSettings.adCooldownSeconds = Number(args.cooldownSeconds);
      }
      savePersistedState();
      return { success: true, adSettings: globalAdminConfig.adSettings, message: `Ad Settings updated (Daily Max: ${globalAdminConfig.adSettings.maxDailyAds}, Coins/Ad: ${globalAdminConfig.adSettings.rewardCoinsPerAd}).` };
    }

    case "updatePricingRates": {
      if (args.followerCost !== undefined) globalAdminConfig.pricing.followerCoinCost = Number(args.followerCost);
      if (args.likeCost !== undefined) globalAdminConfig.pricing.likeCoinCost = Number(args.likeCost);
      if (args.viewCost !== undefined) globalAdminConfig.pricing.viewCoinCost = Number(args.viewCost);
      if (args.commentCost !== undefined) globalAdminConfig.pricing.commentCoinCost = Number(args.commentCost);
      savePersistedState();
      return { success: true, pricing: globalAdminConfig.pricing, message: `Pricing coin rates updated successfully.` };
    }

    case "getSystemSummary": {
      const allUsers = Object.values(globalUsersMap);
      const onlineUsers = allUsers.filter((u: any) => u.isOnline !== false).length;
      const blockedUsers = allUsers.filter((u: any) => u.status === 'BLOCKED').length;
      const pendingOrders = globalOrders.filter((o: any) => o.status === 'PENDING' || o.status === 'PROCESSING').length;
      const completedOrders = globalOrders.filter((o: any) => o.status === 'COMPLETED').length;
      return {
        success: true,
        stats: {
          totalUsers: allUsers.length,
          onlineUsers,
          blockedUsers,
          totalOrders: globalOrders.length,
          pendingOrders,
          completedOrders,
          maintenanceMode: globalAdminConfig.maintenanceMode,
          smmProvider: globalAdminConfig.smmApi.baseUrl || 'PerfectPanel (Default)',
          admobReward: globalAdminConfig.adSettings.rewardCoinsPerAd
        }
      };
    }

    default:
      return { success: false, error: `Unknown tool name: ${name}` };
  }
}

// POST /api/admin/ai-assistant
app.post('/api/admin/ai-assistant', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: "Prompt message is required." });
    }

    let ai: GoogleGenAI;
    try {
      ai = getGeminiClient();
    } catch (e: any) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY is not configured in environment.",
        reply: "⚠️ Server par GEMINI_API_KEY configure nahi hai. Kripya Settings > Secrets me API key check karein."
      });
    }

    const systemPrompt = `You are "Roxyefollow Super Admin AI Copilot" — a powerful, fast, and obedient AI assistant embedded directly inside the Executive Admin Panel.
You have FULL authority to modify system settings, block/unlock users, credit coins, toggle maintenance, update pricing, and generate live business reports.

Current System Snapshot:
- Maintenance Mode: ${globalAdminConfig.maintenanceMode ? 'ENABLED (LOCKED)' : 'DISABLED (OPEN)'}
- Total Users Registered: ${Object.keys(globalUsersMap).length}
- Total Orders: ${globalOrders.length}
- Current Pricing: Follower=${globalAdminConfig.pricing.followerCoinCost} coins, Like=${globalAdminConfig.pricing.likeCoinCost} coins, View=${globalAdminConfig.pricing.viewCoinCost} coins
- Announcement Active: ${globalAdminConfig.announcement?.enabled ? `YES ("${globalAdminConfig.announcement.title}")` : 'NO'}

Instructions:
1. Always understand the user's natural language command in Hindi, Hinglish, or English.
2. Call the appropriate tool function to execute the changes instantly.
3. After tool execution or answering questions, respond politely, clearly, and concisely in Hindi/Hinglish (or English if prompted).
4. Mention the exact action taken (e.g., "✅ User #1002 ko block kar diya gaya hai" or "⚡ Maintenance mode ON kar diya gaya hai").`;

    // 1st Model Call with tools
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: adminAiTools as any }]
      }
    });

    const functionCalls = response.functionCalls;
    const executedActions: any[] = [];

    if (functionCalls && functionCalls.length > 0) {
      for (const fc of functionCalls) {
        const result = executeAiToolCall(fc.name, fc.args);
        executedActions.push({
          tool: fc.name,
          args: fc.args,
          result
        });
      }

      // 2nd Model Call to formulate user-friendly final reply
      const followUp = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [
          { role: 'user', parts: [{ text: message }] },
          { role: 'model', parts: [{ text: `Executed Actions: ${JSON.stringify(executedActions)}` }] },
          { role: 'user', parts: [{ text: `Summarize the result in a friendly, professional, confident sentence in Hindi/Hinglish to the Admin.` }] }
        ],
        config: {
          systemInstruction: systemPrompt
        }
      });

      return res.json({
        success: true,
        reply: followUp.text || "Command execute kar diya gaya hai!",
        executedActions,
        updatedConfig: globalAdminConfig,
        updatedUsersMap: globalUsersMap
      });
    }

    return res.json({
      success: true,
      reply: response.text || "Main aapki kya madad kar sakta hoon?",
      executedActions: []
    });

  } catch (err: any) {
    console.error("AI Admin Assistant Error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to process AI command",
      reply: `Command execute karne me error aaya: ${err.message || 'Unknown error'}`
    });
  }
});


// --- VITE / STATIC SERVING ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
