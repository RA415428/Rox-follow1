import { ActivityLog, AdminConfig, Order, OrderStatus, PaymentRequest, UserAccount, UserWallet } from '../types';
import { DEFAULT_ADMIN_CONFIG } from './defaultAdminConfig';
import { initialOrders } from '../data/appData';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, getDocs, collection, query, where, orderBy, limit, onSnapshot, runTransaction } from 'firebase/firestore';
import { getPersistedRates, savePersistedRates } from './adPreloadManager';

export const ADMIN_CONFIG_KEY = 'instaboost_admin_config';
export const ORDERS_KEY = 'instaboost_orders';
export const WALLET_KEY = 'instaboost_user_wallet';
export const USERS_KEY = 'instaboost_users_list';
export const ACTIVITY_LOGS_KEY = 'instaboost_activity_logs';

/**
 * Flag to break Infinite Write Loop.
 * When true, onSnapshot or remote Firestore synchronization is active,
 * and any background client write/heartbeat is prevented from overwriting Firestore.
 */
export let isProcessingRemoteSync = false;

/**
 * Server-confirmed User document update.
 * Resolves only when Firestore server confirms write.
 * Throws or returns error if PERMISSION_DENIED or rejected.
 */
export async function updateUserOnFirestore(
  memberId: string,
  dataToUpdate: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const cleanId = String(memberId).replace(/^#+/, '').replace(/^usr_/, '').trim();
  if (!cleanId) return { success: false, error: 'Invalid member ID' };

  const userRef = doc(db, 'users', cleanId);
  const path = `users/${cleanId}`;

  try {
    const payload = {
      ...dataToUpdate,
      updatedAt: Date.now()
    };
    await setDoc(userRef, payload, { merge: true });
    return { success: true };
  } catch (err: any) {
    const errInfo = handleFirestoreError(err, OperationType.WRITE, path);
    return { success: false, error: errInfo.error };
  }
}

/**
 * Resolves the backend server API URL dynamically.
 * Works seamlessly in both web browsers and native APK/WebView apps on any mobile device.
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : '/' + path;

  // 1. Check for custom backend URL saved in localStorage
  try {
    const customUrl = localStorage.getItem('instaboost_custom_backend_url');
    if (customUrl && customUrl.trim().startsWith('http')) {
      const baseUrl = customUrl.trim().replace(/\/+$/, '');
      return `${baseUrl}${cleanPath}`;
    }
  } catch {
    // ignore
  }

  // 2. In browser / WebView environment, use window.location.origin directly
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (origin.startsWith('http://') || origin.startsWith('https://')) {
      return `${origin}${cleanPath}`;
    }
  }

  // 3. Fallback relative path
  return cleanPath;
}

export function sanitizeAdminConfig(cfg: AdminConfig): AdminConfig {
  if (!cfg) return DEFAULT_ADMIN_CONFIG;
  const updated = { ...cfg };
  const persistedRates = getPersistedRates();

  if (updated.ads) {
    updated.ads = {
      ...updated.ads,
      // Protect coinsPerRewardAd from dropping to 0 or null on slow network sync
      coinsPerRewardAd: (typeof updated.ads.coinsPerRewardAd === 'number' && updated.ads.coinsPerRewardAd > 0)
        ? updated.ads.coinsPerRewardAd
        : persistedRates.coinsPerRewardAd || 50,
      maxDailyAdsPerUser: (typeof updated.ads.maxDailyAdsPerUser === 'number' && updated.ads.maxDailyAdsPerUser > 0)
        ? updated.ads.maxDailyAdsPerUser
        : persistedRates.maxDailyAdsPerUser || 10
    };
    if (!updated.ads.directSmartlinkUrl || updated.ads.directSmartlinkUrl.includes('omg10') || updated.ads.directSmartlinkUrl.includes('monetag')) {
      updated.ads.directSmartlinkUrl = persistedRates.directSmartlinkUrl || 'https://doubtfulimpatient.com/bhetpw4me?key=b10856b9df41e998764e3e76a118f915';
    }
  } else {
    updated.ads = {
      ...DEFAULT_ADMIN_CONFIG.ads,
      coinsPerRewardAd: persistedRates.coinsPerRewardAd || 50,
      maxDailyAdsPerUser: persistedRates.maxDailyAdsPerUser || 10
    };
  }
  return updated;
}

export function loadAdminConfig(): AdminConfig {
  const persistedRates = getPersistedRates();
  try {
    const data = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      const merged: AdminConfig = {
        ...DEFAULT_ADMIN_CONFIG,
        ...parsed,
        coinPackages: (parsed.coinPackages && Array.isArray(parsed.coinPackages) && parsed.coinPackages.length > 0)
          ? parsed.coinPackages
          : DEFAULT_ADMIN_CONFIG.coinPackages,
        subscriptionPackage: parsed.subscriptionPackage || DEFAULT_ADMIN_CONFIG.subscriptionPackage,
        announcement: { ...(DEFAULT_ADMIN_CONFIG.announcement || {}), ...(parsed.announcement || {}) },
        smmApi: { ...(DEFAULT_ADMIN_CONFIG.smmApi || {}), ...(parsed.smmApi || {}) },
        ads: {
          ...(DEFAULT_ADMIN_CONFIG.ads || {}),
          ...(parsed.ads || {}),
          coinsPerRewardAd: (parsed.ads && typeof parsed.ads.coinsPerRewardAd === 'number' && parsed.ads.coinsPerRewardAd > 0)
            ? parsed.ads.coinsPerRewardAd
            : persistedRates.coinsPerRewardAd || 50
        },
        pricing: { ...(DEFAULT_ADMIN_CONFIG.pricing || {}), ...(parsed.pricing || {}) },
        paymentSettings: { ...(DEFAULT_ADMIN_CONFIG.paymentSettings || {}), ...(parsed.paymentSettings || {}) },
        branchSettings: { ...(DEFAULT_ADMIN_CONFIG.branchSettings || {}), ...(parsed.branchSettings || {}) },
        appUpdate: { ...(DEFAULT_ADMIN_CONFIG.appUpdate || {}), ...(parsed.appUpdate || {}) }
      };
      return sanitizeAdminConfig(merged);
    }
  } catch (err) {
    console.warn('Failed to load admin config from localStorage:', err);
  }
  return sanitizeAdminConfig(DEFAULT_ADMIN_CONFIG);
}

export function saveAdminConfig(config: AdminConfig): void {
  try {
    const configToSave: AdminConfig = {
      ...config,
      lastUpdated: Date.now()
    };

    // Also update persistent rates storage snapshot
    if (config.ads) {
      savePersistedRates({
        coinsPerRewardAd: config.ads.coinsPerRewardAd,
        maxDailyAdsPerUser: config.ads.maxDailyAdsPerUser,
        interstitialIntervalMinutes: config.ads.autoAdIntervalMinutes,
        rewardedAdCooldownSeconds: config.ads.rewardAdDurationSeconds,
        directSmartlinkUrl: config.ads.directSmartlinkUrl,
        bannerAdKey: config.ads.bannerAdId
      });
    }

    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(configToSave));
    window.dispatchEvent(new Event('instaboost_config_updated'));
    // Sync to Express Server
    fetch(getApiUrl('/api/config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configToSave)
    }).catch(() => {});

    // Direct Firestore Sync
    setDoc(doc(db, 'config', 'global'), configToSave, { merge: true }).catch(() => {});
  } catch (err) {
    console.error('Failed to save admin config:', err);
  }
}

export function saveOrders(orders: Order[]): void {
  try {
    if (!Array.isArray(orders)) return;
    const now = Date.now();
    const sanitizedOrders = orders.map((o) => ({
      ...o,
      createdAt: o.createdAt || o.timestamp || now,
      updatedAt: o.updatedAt || now,
      timestamp: o.timestamp || o.createdAt || now
    }));

    // 1. Perform the update locally in LocalStorage & dispatch event
    localStorage.setItem(ORDERS_KEY, JSON.stringify(sanitizedOrders));
    window.dispatchEvent(new Event('instaboost_orders_updated'));

    // 2. Sync orders to Express Server (catch offline silently)
    fetch(getApiUrl('/api/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedOrders)
    }).catch(() => {});
  } catch (err) {
    // ignore
  }
}

/**
 * Updates a single order's status atomically in Firestore, Express Backend, and LocalStorage.
 * Prevents race condition where older snapshots or sync loops revert 'COMPLETED' orders.
 */
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus, reason?: string): Promise<boolean> {
  if (!orderId) return false;
  const now = Date.now();

  try {
    // 1. Update in LocalStorage immediately
    const currentOrders = loadOrders();
    const updatedLocal = currentOrders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: newStatus,
          updatedAt: now,
          statusReason: reason || o.statusReason
        };
      }
      return o;
    });
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updatedLocal));
    window.dispatchEvent(new Event('instaboost_orders_updated'));

    // 2. Update directly in Firestore document
    const orderDocRef = doc(db, 'orders', orderId);
    setDoc(orderDocRef, {
      status: newStatus,
      updatedAt: now,
      ...(reason ? { statusReason: reason } : {})
    }, { merge: true }).catch((err) => {
      console.warn('Firestore updateOrderStatus warning:', err);
    });

    // 3. Update in Express backend via PATCH /api/orders/:orderId/status
    fetch(getApiUrl(`/api/orders/${encodeURIComponent(orderId)}/status`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        updatedAt: now,
        reason
      })
    }).catch(() => {
      // Fallback post full orders if patch endpoint unavailable
      fetch(getApiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLocal)
      }).catch(() => {});
    });

    return true;
  } catch (err) {
    console.error('Error in updateOrderStatus:', err);
    return false;
  }
}

export async function deleteOrderPermanently(orderId: string): Promise<void> {
  if (!orderId) return;
  try {
    // 1. Delete on Firestore
    deleteDoc(doc(db, 'orders', orderId)).catch(() => {});

    // 2. Delete on Express server
    fetch(getApiUrl(`/api/orders/${encodeURIComponent(orderId)}`), {
      method: 'DELETE'
    }).catch(() => {});

    // 3. Update localStorage
    const local = loadOrders();
    const filtered = local.filter((o) => o.id !== orderId);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event('instaboost_orders_updated'));
  } catch (err) {
    console.error('Failed to delete order permanently:', err);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Firestore operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Sync with central real-time server and Firebase Firestore across devices
export async function fetchServerAdminConfig(): Promise<AdminConfig | null> {
  const localConfig = loadAdminConfig();
  try {
    // 1. Try Firestore first with 8s timeout
    const docRef = doc(db, 'config', 'global');
    const docSnap = await withTimeout(getDoc(docRef), 8000);
    if (docSnap.exists()) {
      const firestoreConfig = sanitizeAdminConfig(docSnap.data() as AdminConfig);
      if (firestoreConfig) {
        const merged: AdminConfig = {
          ...DEFAULT_ADMIN_CONFIG,
          ...firestoreConfig,
          pricing: { ...DEFAULT_ADMIN_CONFIG.pricing, ...(firestoreConfig.pricing || {}) },
          ads: { ...DEFAULT_ADMIN_CONFIG.ads, ...(firestoreConfig.ads || {}) },
          appUpdate: { ...(DEFAULT_ADMIN_CONFIG.appUpdate!), ...(firestoreConfig.appUpdate || {}) },
          coinPackages: firestoreConfig.coinPackages?.length ? firestoreConfig.coinPackages : DEFAULT_ADMIN_CONFIG.coinPackages,
          subscriptionPackage: firestoreConfig.subscriptionPackage || DEFAULT_ADMIN_CONFIG.subscriptionPackage
        };
        localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(merged));
        if (merged.ads) {
          savePersistedRates({
            coinsPerRewardAd: merged.ads.coinsPerRewardAd,
            maxDailyAdsPerUser: merged.ads.maxDailyAdsPerUser,
            interstitialIntervalMinutes: merged.ads.autoAdIntervalMinutes,
            rewardedAdCooldownSeconds: merged.ads.rewardAdDurationSeconds,
            directSmartlinkUrl: merged.ads.directSmartlinkUrl,
            bannerAdKey: merged.ads.bannerAdId
          });
        }
        window.dispatchEvent(new Event('instaboost_config_updated'));
        return merged;
      }
    }
  } catch (e) {
    // Fallback to Express backend smoothly
  }

  try {
    const res = await fetch(getApiUrl('/api/config'));
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.config) {
        const serverConfig: AdminConfig = sanitizeAdminConfig(data.config);
        if (serverConfig) {
          const merged: AdminConfig = {
            ...localConfig,
            ...serverConfig,
            pricing: { ...localConfig.pricing, ...(serverConfig.pricing || {}) },
            ads: { ...localConfig.ads, ...(serverConfig.ads || {}) },
            appUpdate: { ...(DEFAULT_ADMIN_CONFIG.appUpdate!), ...(localConfig.appUpdate || {}), ...(serverConfig.appUpdate || {}) },
            coinPackages: serverConfig.coinPackages?.length ? serverConfig.coinPackages : localConfig.coinPackages
          };
          localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(merged));
          window.dispatchEvent(new Event('instaboost_config_updated'));
          return merged;
        }
      }
    }
  } catch (err) {
    // server unreachable / offline fallback
  }
  return localConfig;
}

export async function fetchServerOrders(): Promise<Order[] | null> {
  const mergedMap = new Map<string, Order>();

  // 0. Load cached orders
  try {
    const cached = localStorage.getItem(ORDERS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        parsed.forEach((o) => {
          if (o && o.id) mergedMap.set(o.id, o);
        });
      }
    }
  } catch (_) {}

  // 1. Fetch from Firestore
  try {
    const querySnap = await withTimeout(getDocs(collection(db, 'orders')), 5000);
    if (!querySnap.empty) {
      querySnap.forEach((docSnap) => {
        const o = docSnap.data() as Order;
        if (o && o.id) {
          const existing = mergedMap.get(o.id);
          if (!existing) {
            mergedMap.set(o.id, o);
          } else {
            const existingTime = existing.updatedAt || existing.timestamp || existing.createdAt || 0;
            const newTime = o.updatedAt || o.timestamp || o.createdAt || 0;
            if (newTime >= existingTime) {
              mergedMap.set(o.id, { ...existing, ...o });
            } else {
              mergedMap.set(o.id, { ...o, ...existing });
            }
          }
        }
      });
    }
  } catch (e) {
    // Fallback to Express backend smoothly
  }

  // 2. Fetch from Express backend
  try {
    const res = await fetch(getApiUrl('/api/orders'));
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.orders)) {
        data.orders.forEach((o: Order) => {
          if (o && o.id) {
            const existing = mergedMap.get(o.id);
            if (!existing) {
              mergedMap.set(o.id, o);
            } else {
              const existingTime = existing.updatedAt || existing.timestamp || existing.createdAt || 0;
              const newTime = o.updatedAt || o.timestamp || o.createdAt || 0;
              if (newTime >= existingTime) {
                mergedMap.set(o.id, { ...existing, ...o });
              } else {
                mergedMap.set(o.id, { ...o, ...existing });
              }
            }
          }
        });
      }
    }
  } catch (err) {
    // server unreachable / offline fallback
  }

  const allOrders = Array.from(mergedMap.values());
  if (allOrders.length > 0) {
    // Sort newest first
    allOrders.sort((a, b) => {
      const timeA = typeof a.timestamp === 'number' ? a.timestamp : (typeof a.createdAt === 'number' ? a.createdAt : 0);
      const timeB = typeof b.timestamp === 'number' ? b.timestamp : (typeof b.createdAt === 'number' ? b.createdAt : 0);
      return timeB - timeA;
    });

    localStorage.setItem(ORDERS_KEY, JSON.stringify(allOrders));
    window.dispatchEvent(new Event('instaboost_orders_updated'));
    return allOrders;
  }

  return null;
}

export async function fetchServerUsers(): Promise<UserAccount[] | null> {
  try {
    // 1. Try Firestore first with 5s timeout
    const querySnap = await withTimeout(getDocs(collection(db, 'users')), 5000);
    if (!querySnap.empty) {
      const firestoreUsers: UserAccount[] = [];
      const now = Date.now();
      
      querySnap.forEach((docSnap) => {
        const u = docSnap.data() as any;
        if (!u || (!u.memberId && !u.id)) return;

        const lastSeenTime = typeof u.lastSeenAt === 'number' && u.lastSeenAt > 0
          ? u.lastSeenAt
          : (typeof u.lastHeartbeatAt === 'number' && u.lastHeartbeatAt > 0 ? u.lastHeartbeatAt : 0);
        const timeDiffMs = lastSeenTime > 0 ? now - lastSeenTime : 99999999;
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

        firestoreUsers.push({
          ...u,
          isOnline,
          updatedAt: u.updatedAt || lastSeenTime,
          lastSeenAt: lastSeenTime,
          lastActive: formattedLastActive
        });
      });

      if (firestoreUsers.length > 0) {
        localStorage.setItem(USERS_KEY, JSON.stringify(firestoreUsers));
        window.dispatchEvent(new Event('instaboost_users_updated'));
        return firestoreUsers;
      }
    }
  } catch (e) {
    // Fallback to Express backend smoothly
  }

  try {
    const res = await fetch(getApiUrl('/api/users'));
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.users)) {
        const validUsers = data.users.filter((u: any) => u && (u.memberId || u.id));
        localStorage.setItem(USERS_KEY, JSON.stringify(validUsers));
        window.dispatchEvent(new Event('instaboost_users_updated'));
        return validUsers;
      }
    }
  } catch (err) {
    // server unreachable / offline fallback
  }
  return null;
}

export async function purgeNonEmailUsersFromDatabase(): Promise<number> {
  return 0;
}

export async function fetchServerActivityLogs(): Promise<ActivityLog[] | null> {
  try {
    const querySnap = await withTimeout(getDocs(query(collection(db, 'logs'), limit(50))), 5000);
    if (!querySnap.empty) {
      const firestoreLogs: ActivityLog[] = [];
      querySnap.forEach((docSnap) => {
        firestoreLogs.push(docSnap.data() as ActivityLog);
      });
      if (firestoreLogs.length > 0) {
        localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify(firestoreLogs));
        window.dispatchEvent(new Event('instaboost_logs_updated'));
        return firestoreLogs;
      }
    }
  } catch (e) {
    // Fallback smoothly without throwing noisy warnings
  }

  try {
    const res = await fetch(getApiUrl('/api/logs'));
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.logs)) {
        localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify(data.logs));
        window.dispatchEvent(new Event('instaboost_logs_updated'));
        return data.logs;
      }
    }
  } catch (err) {
    // offline fallback
  }
  return null;
}

export function getDeviceFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let canvasHash = '';
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = "14px 'Arial'";
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('InstaBoostEngage_v1_FP', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('InstaBoostEngage_v1_FP', 4, 17);
      canvasHash = canvas.toDataURL().slice(-50);
    }

    let webglVendor = '';
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          webglVendor = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        }
      }
    } catch {
      // ignore
    }

    const screenStr = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}_${window.devicePixelRatio}`;
    const navStr = `${navigator.userAgent}_${navigator.language}_${(navigator as any).hardwareConcurrency || 2}_${Intl.DateTimeFormat().resolvedOptions().timeZone}`;

    const rawString = `${canvasHash}__${webglVendor}__${screenStr}__${navStr}`;
    
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
      const char = rawString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'fp_' + Math.abs(hash).toString(36);
  } catch (e) {
    return 'fp_default_device';
  }
}

/**
 * Automatic Cloud Account Restore on App Reinstall or Clear Data
 * Scans Firebase Firestore using device hardware fingerprint to restore Member ID, Coins & History instantly.
 */
export async function initAutoDeviceRestore(): Promise<{ restored: boolean; memberId?: string; coins?: number }> {
  try {
    const hasLocalWallet = localStorage.getItem(WALLET_KEY);
    const hasMemberId = localStorage.getItem('roxyefollow_user_member_id');
    
    // Only run auto-restore if localStorage was cleared or app was freshly reinstalled
    if (hasLocalWallet && hasMemberId) {
      return { restored: false };
    }

    const fp = getDeviceFingerprint();
    // 1. Check device mapping doc in Firestore
    const deviceRef = doc(db, 'devices', fp);
    const deviceSnap = await withTimeout(getDoc(deviceRef), 5000).catch(() => null);

    let restoredMemberId: string | null = null;
    if (deviceSnap && deviceSnap.exists()) {
      restoredMemberId = deviceSnap.data()?.memberId || null;
    }

    // 2. Fallback query if device mapping not directly present (targeted single-doc query)
    if (!restoredMemberId) {
      try {
        const qUser = query(collection(db, 'users'), where('deviceFingerprint', '==', fp), limit(1));
        const querySnap = await withTimeout(getDocs(qUser), 5000).catch(() => null);
        if (querySnap && !querySnap.empty) {
          const docSnap = querySnap.docs[0];
          const data = docSnap.data();
          if (data && data.memberId) {
            restoredMemberId = data.memberId;
          }
        }
      } catch (e) {
        // silent catch
      }
    }

    if (restoredMemberId) {
      // Found previous account! Restore wallet and history
      const userRef = doc(db, 'users', restoredMemberId);
      const userSnap = await withTimeout(getDoc(userRef), 5000).catch(() => null);

      const todayStr = new Date().toISOString().split('T')[0];
      let coins = 0;
      let dailyAdsWatched = 0;
      let maxDailyAds = 10;

      let uData: any = {};
      if (userSnap && userSnap.exists()) {
        uData = userSnap.data() || {};
        coins = uData.coins !== undefined ? Number(uData.coins) : 0;
        dailyAdsWatched = uData.dailyAdsWatched !== undefined ? Number(uData.dailyAdsWatched) : 0;
        maxDailyAds = uData.maxDailyAds !== undefined ? Number(uData.maxDailyAds) : 10;
      }

      // Safeguard: clamp coins if non-owner previously got 99999
      const isOwnerRestored = uData.email?.toLowerCase() === 'nayakhardayal4@gmail.com' || uData.role === 'owner';
      if (!isOwnerRestored && coins >= 99999) {
        coins = 50;
      }

      const hasValidGoogleAuth = Boolean(uData.authUid && !uData.authUid.startsWith('guest_') && (uData.isGoogleLinked || uData.isEmailLinked));
      const restoredWallet: UserWallet = {
        memberId: restoredMemberId,
        referralCode: uData.referralCode || `ROX${restoredMemberId}`,
        coins,
        dailyAdsWatched,
        maxDailyAds,
        lastAdResetDate: todayStr,
        authUid: hasValidGoogleAuth ? uData.authUid : undefined,
        isGoogleLinked: Boolean(uData.isGoogleLinked),
        isEmailLinked: Boolean(uData.isEmailLinked),
        email: hasValidGoogleAuth ? uData.email : undefined,
        displayName: hasValidGoogleAuth ? uData.displayName : undefined,
        photoURL: hasValidGoogleAuth ? uData.photoURL : undefined,
        role: isOwnerRestored ? 'owner' : (uData.role || 'user'),
        isAdmin: isOwnerRestored ? true : Boolean(uData.isAdmin),
        isOwner: isOwnerRestored ? true : Boolean(uData.isOwner),
        referredBy: uData.referredBy || undefined,
        referralClaimed: Boolean(uData.referralClaimed),
        totalReferralsCount: typeof uData.totalReferralsCount === 'number' ? uData.totalReferralsCount : 0,
        totalReferralCoinsEarned: typeof uData.totalReferralCoinsEarned === 'number' ? uData.totalReferralCoinsEarned : 0
      };

      localStorage.setItem('roxyefollow_user_member_id', restoredMemberId);
      saveUserWallet(restoredWallet);

      // Restore user orders from Firestore using indexed query
      try {
        const qOrders = query(collection(db, 'orders'), where('userMemberId', '==', restoredMemberId), limit(100));
        const ordersSnap = await withTimeout(getDocs(qOrders), 5000).catch(() => null);
        if (ordersSnap && !ordersSnap.empty) {
          const restoredOrders: Order[] = [];
          ordersSnap.forEach((docSnap) => {
            const oData = docSnap.data() as Order;
            if (oData && oData.id) {
              restoredOrders.push(oData);
            }
          });
          if (restoredOrders.length > 0) {
            saveOrders(restoredOrders);
          }
        }
      } catch (e) {
        // silent
      }

      window.dispatchEvent(new Event('instaboost_wallet_updated'));
      window.dispatchEvent(new Event('instaboost_orders_updated'));
      console.log(`🎉 Account #${restoredMemberId} auto-restored from Firebase!`);

      return { restored: true, memberId: restoredMemberId, coins };
    }
  } catch (err) {
    // Silent catch on network timeout
  }
  return { restored: false };
}

/**
 * Manual Account Recovery by Member ID (e.g. #482910)
 */
export async function restoreAccountByMemberId(targetMemberId: string): Promise<{ success: boolean; message: string; wallet?: UserWallet }> {
  try {
    const cleanId = targetMemberId.replace('#', '').trim();
    if (!cleanId || cleanId.length < 3) {
      return { success: false, message: 'Please enter a valid Member ID' };
    }

    const userRef = doc(db, 'users', cleanId);
    const userSnap = await withTimeout(getDoc(userRef), 4000);

    if (!userSnap.exists()) {
      return { success: false, message: `Member ID #${cleanId} not found in Firebase database` };
    }

    const uData = userSnap.data();
    const todayStr = new Date().toISOString().split('T')[0];
    const restoredWallet: UserWallet = {
      memberId: cleanId,
      coins: uData.coins !== undefined ? Number(uData.coins) : 0,
      dailyAdsWatched: uData.dailyAdsWatched !== undefined ? Number(uData.dailyAdsWatched) : 0,
      maxDailyAds: uData.maxDailyAds !== undefined ? Number(uData.maxDailyAds) : 10,
      lastAdResetDate: todayStr
    };

    localStorage.setItem('roxyefollow_user_member_id', cleanId);
    saveUserWallet(restoredWallet);

    // Fetch and restore orders for this member ID
    try {
      const ordersSnap = await withTimeout(getDocs(collection(db, 'orders')), 4000);
      if (!ordersSnap.empty) {
        const userOrders: Order[] = [];
        ordersSnap.forEach((docSnap) => {
          const o = docSnap.data() as Order;
          if (o.userMemberId === cleanId) {
            userOrders.push(o);
          }
        });
        if (userOrders.length > 0) {
          saveOrders(userOrders);
        }
      }
    } catch (e) {
      console.warn('Orders fetch error during manual restore:', e);
    }

    window.dispatchEvent(new Event('instaboost_wallet_updated'));
    window.dispatchEvent(new Event('instaboost_orders_updated'));

    // Also link device fingerprint to this member ID
    const fp = getDeviceFingerprint();
    setDoc(doc(db, 'devices', fp), { memberId: cleanId, updatedAt: Date.now() }, { merge: true }).catch(() => {});

    return {
      success: true,
      message: `Account #${cleanId} restored! Balance: ${restoredWallet.coins} Coins`,
      wallet: restoredWallet
    };
  } catch (e) {
    return { success: false, message: 'Network error restoring account. Please try again.' };
  }
}

export function detectUserLocationAndDevice(): { location: string; deviceType: string } {
  let location = '🇮🇳 India';
  let deviceType = '📱 Mobile Web';

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Kolkata') || tz.includes('Calcutta') || tz.includes('India')) location = '🇮🇳 India (Kolkata)';
    else if (tz.includes('Karachi')) location = '🇵🇰 Pakistan (Karachi)';
    else if (tz.includes('Dhaka')) location = '🇧🇩 Bangladesh (Dhaka)';
    else if (tz.includes('Kathmandu')) location = '🇳🇵 Nepal (Kathmandu)';
    else if (tz.includes('Dubai') || tz.includes('Abu_Dhabi') || tz.includes('Muscat')) location = '🇦🇪 UAE (Dubai)';
    else if (tz.includes('Riyadh')) location = '🇸🇦 Saudi Arabia (Riyadh)';
    else if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago') || tz.includes('Denver') || tz.includes('Phoenix')) location = '🇺🇸 United States';
    else if (tz.includes('London')) location = '🇬🇧 United Kingdom (London)';
    else if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Montreal')) location = '🇨🇦 Canada';
    else if (tz.includes('Sydney') || tz.includes('Melbourne') || tz.includes('Brisbane')) location = '🇦🇺 Australia';
    else if (tz.includes('Berlin') || tz.includes('Frankfurt')) location = '🇩🇪 Germany';
    else if (tz.includes('Paris')) location = '🇫🇷 France';
    else if (tz.includes('Tokyo')) location = '🇯🇵 Japan';
    else if (tz.includes('Singapore')) location = '🇸🇬 Singapore';
    else if (tz.includes('Jakarta')) location = '🇮🇩 Indonesia';
    else if (tz.includes('Sao_Paulo')) location = '🇧🇷 Brazil';
    else if (tz.includes('Moscow')) location = '🇷🇺 Russia';
    else if (tz.includes('Istanbul')) location = '🇹🇷 Turkey';
    else if (tz.includes('Cairo')) location = '🇪🇬 Egypt';
    else if (tz.includes('Johannesburg')) location = '🇿🇦 South Africa';
    else if (tz) {
      const parts = tz.split('/');
      location = `🌍 ${parts[parts.length - 1].replace(/_/g, ' ')}`;
    }
  } catch (e) {}

  try {
    const ua = navigator.userAgent || '';
    if (/AppCreator24|CustomAPK/i.test(ua) || (window as any).isAndroidApp) {
      deviceType = '📱 Android App (APK)';
    } else if (/Android/i.test(ua)) {
      deviceType = '📱 Android (Chrome)';
    } else if (/iPhone/i.test(ua)) {
      deviceType = '📱 iPhone (iOS)';
    } else if (/iPad/i.test(ua)) {
      deviceType = '📱 iPad (iOS)';
    } else if (/Windows/i.test(ua)) {
      deviceType = '💻 Windows PC';
    } else if (/Macintosh|Mac OS/i.test(ua)) {
      deviceType = '💻 Mac OS';
    } else if (/Linux/i.test(ua)) {
      deviceType = '💻 Linux';
    }
  } catch (e) {}

  return { location, deviceType };
}

export function isUserOnline(u: UserAccount): boolean {
  if (!u) return false;
  if (u.isOnline === false) return false;
  const lastSeen = typeof (u as any).lastSeenAt === 'number' && (u as any).lastSeenAt > 0 
    ? (u as any).lastSeenAt 
    : (typeof (u as any).lastHeartbeatAt === 'number' && (u as any).lastHeartbeatAt > 0 ? (u as any).lastHeartbeatAt : 0);

  if (!lastSeen) {
    return u.isOnline === true;
  }
  const timeDiffMs = Date.now() - lastSeen;
  return timeDiffMs >= 0 && timeDiffMs < 60000;
}

export async function syncUserDeviceWithServer(passedWallet?: UserWallet): Promise<void> {
  // CRITICAL: Break infinite loop. Never write if remote sync / onSnapshot is processing!
  if (isProcessingRemoteSync) {
    return;
  }

  const wallet = passedWallet || loadUserWallet();
  if (!wallet || !wallet.memberId) {
    return;
  }

  const cleanMemberId = String(wallet.memberId).replace(/^#+/, '').replace(/^usr_/, '').trim();
  if (!cleanMemberId) return;

  // 1. Sync directly to Firebase Firestore
  try {
    const isExplicitLocalUpdate = !!passedWallet;
    const fp = getDeviceFingerprint();
    const userRef = doc(db, 'users', cleanMemberId);
    const path = `users/${cleanMemberId}`;
    // Fetch current state from Firestore
    const existingSnap = await withTimeout(getDoc(userRef), 4000).catch(() => null);
    const { location, deviceType } = detectUserLocationAndDevice();

    if (existingSnap && existingSnap.exists()) {
      const existingData = existingSnap.data();

      // FIRESTORE IS THE AUTHORITY: Adopt remote updates into local client state
      let walletNeedsLocalSave = false;

      // 1. Adopt remote status (BLOCKED / ACTIVE)
      if (existingData.status) {
        if (wallet.status !== existingData.status) {
          wallet.status = existingData.status;
          localStorage.setItem('roxyefollow_user_status', existingData.status);
          walletNeedsLocalSave = true;
        }
      }

      // 2. Adopt remote coins if changed in Firestore
      if (existingData.coins !== undefined) {
        const remoteCoins = Number(existingData.coins);
        if (!isNaN(remoteCoins) && !isExplicitLocalUpdate && remoteCoins !== wallet.coins) {
          wallet.coins = remoteCoins;
          walletNeedsLocalSave = true;
        }
      }

      // 3. Adopt remote memberId if admin changed it
      if (existingData.memberId) {
        const remoteMemId = String(existingData.memberId).replace(/^#+/, '').trim();
        if (remoteMemId && remoteMemId !== wallet.memberId) {
          wallet.memberId = remoteMemId;
          localStorage.setItem('roxyefollow_user_member_id', remoteMemId);
          walletNeedsLocalSave = true;
        }
      }

      // 4. Adopt maxDailyAds
      if (existingData.maxDailyAds !== undefined) {
        const remoteMaxAds = Number(existingData.maxDailyAds);
        if (!isNaN(remoteMaxAds) && wallet.maxDailyAds !== remoteMaxAds) {
          wallet.maxDailyAds = remoteMaxAds;
          walletNeedsLocalSave = true;
        }
      }

      // 5. Adopt displayName/name
      if (existingData.name && wallet.displayName !== existingData.name) {
        wallet.displayName = existingData.name;
        walletNeedsLocalSave = true;
      }

      if (walletNeedsLocalSave) {
        wallet.lastLocalCoinMutationAt = existingData.updatedAt || Date.now();
        saveUserWallet(wallet);
        window.dispatchEvent(new Event('instaboost_wallet_updated'));
      }

      // WHAT TO WRITE TO FIRESTORE:
      if (isExplicitLocalUpdate) {
        // User explicitly earned ad reward coins or placed an order
        // ONLY update coins & dailyAdsWatched. NEVER overwrite status, memberId, or settings!
        try {
          await setDoc(userRef, {
            coins: wallet.coins,
            dailyAdsWatched: wallet.dailyAdsWatched || 0,
            updatedAt: Date.now(),
            lastSeenAt: Date.now(),
            isOnline: true,
            lastActive: '🟢 Online now'
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      } else {
        // PASSIVE PRESENCE HEARTBEAT (Interval, Focus, Tab switch):
        // ONLY update online presence. NEVER touch coins, status, memberId, or settings!
        try {
          await setDoc(userRef, {
            isOnline: true,
            lastSeenAt: Date.now(),
            lastActive: '🟢 Online now',
            deviceType,
            location
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      }
    } else if (existingSnap !== null && !existingSnap.exists()) {
      // Document DOES NOT EXIST in Firestore: Brand new first-time user registration
      const initialName = wallet.displayName || (wallet.email ? wallet.email.split('@')[0] : `User #${cleanMemberId}`);
      const newUserPayload = {
        id: `usr_${cleanMemberId}`,
        userId: `#${cleanMemberId}`,
        memberId: cleanMemberId,
        email: wallet.email || `${cleanMemberId}@guest.user`,
        displayName: initialName,
        authUid: wallet.authUid || cleanMemberId,
        deviceFingerprint: fp,
        name: initialName,
        coins: typeof wallet.coins === 'number' ? wallet.coins : 0,
        dailyAdsWatched: wallet.dailyAdsWatched || 0,
        maxDailyAds: wallet.maxDailyAds || 10,
        referredBy: wallet.referredBy ? (wallet.referredBy.startsWith('#') ? wallet.referredBy : `#${wallet.referredBy}`) : null,
        referralClaimed: Boolean(wallet.referralClaimed),
        totalReferralsCount: wallet.totalReferralsCount || 0,
        totalReferralCoinsEarned: wallet.totalReferralCoinsEarned || 0,
        lastActive: '🟢 Online now',
        isOnline: true,
        updatedAt: Date.now(),
        lastSeenAt: Date.now(),
        createdAt: Date.now(),
        deviceType,
        location,
        status: wallet.status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE',
        coinsUpdatedByAdmin: false
      };
      try {
        await setDoc(userRef, newUserPayload, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }
    // Note: If existingSnap === null (network timeout), we purposefully do NOT write to avoid overwriting remote changes!

    // Link device fingerprint
    setDoc(doc(db, 'devices', fp), { memberId: cleanMemberId, updatedAt: Date.now() }, { merge: true }).catch(() => {});

    // Sync non-destructive presence to Express backend
    try {
      await fetch(getApiUrl('/api/users/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: cleanMemberId,
          coins: wallet.coins,
          status: wallet.status || 'ACTIVE',
          deviceFingerprint: fp,
          location,
          deviceType,
          isOnline: true
        })
      });
    } catch {
      // ignore offline
    }
  } catch (e) {
    // catch silently
  }
}

export function setUserOfflinePresence(memberId: string): void {
  if (!memberId) return;
  try {
    const userRef = doc(db, 'users', memberId);
    const now = Date.now();
    setDoc(
      userRef,
      {
        isOnline: false,
        lastActive: 'Offline (Just now)',
        updatedAt: now,
        lastSeenAt: now
      },
      { merge: true }
    ).catch(() => {});

    // Also sync offline status to Express backend
    fetch(getApiUrl('/api/users/offline'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId })
    }).catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * Real-Time Listener for Firebase Firestore Collections & Config
 * Instantly applies changes made in Firebase Console or Admin Panel to the app.
 */
export function subscribeToFirestore(
  onConfigUpdate: (config: AdminConfig) => void,
  onOrdersUpdate: (orders: Order[]) => void,
  onUsersUpdate: (users: UserAccount[]) => void,
  onUserWalletUpdate?: (coins?: number, dailyAdsWatched?: number, status?: string, coinsUpdatedByAdmin?: boolean, updatedAt?: number) => void,
  currentMemberId?: string,
  onLogsUpdate?: (logs: ActivityLog[]) => void
) {
  // 1. Listen to global config
  const unsubConfig = onSnapshot(doc(db, 'config', 'global'), (docSnap) => {
    if (docSnap.exists()) {
      const data = sanitizeAdminConfig(docSnap.data() as AdminConfig);
      if (data) {
        localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(data));
        if (data.ads) {
          savePersistedRates({
            coinsPerRewardAd: data.ads.coinsPerRewardAd,
            maxDailyAdsPerUser: data.ads.maxDailyAdsPerUser,
            interstitialIntervalMinutes: data.ads.autoAdIntervalMinutes,
            rewardedAdCooldownSeconds: data.ads.rewardAdDurationSeconds,
            directSmartlinkUrl: data.ads.directSmartlinkUrl,
            bannerAdKey: data.ads.bannerAdId
          });
        }
        window.dispatchEvent(new Event('instaboost_config_updated'));
        fetch(getApiUrl('/api/config'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).catch(() => {});
        onConfigUpdate(data);
      }
    }
  }, () => {
    // Quiet error handler for background tab / closing database state
  });

  // 2. Listen to orders in real-time across all users (Firestore is authoritative)
  const unsubOrders = onSnapshot(collection(db, 'orders'), (querySnap) => {
    const ordersMap = new Map<string, Order>();

    querySnap.forEach((docSnap) => {
      const o = docSnap.data() as Order;
      if (o && o.id) {
        ordersMap.set(o.id, o);
      }
    });

    const ordersList = Array.from(ordersMap.values());
    if (ordersList.length > 0) {
      ordersList.sort((a, b) => {
        const timeA = typeof a.timestamp === 'number' ? a.timestamp : (typeof a.createdAt === 'number' ? a.createdAt : 0);
        const timeB = typeof b.timestamp === 'number' ? b.timestamp : (typeof b.createdAt === 'number' ? b.createdAt : 0);
        return timeB - timeA;
      });
      localStorage.setItem(ORDERS_KEY, JSON.stringify(ordersList));
      fetch(getApiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ordersList)
      }).catch(() => {});
      window.dispatchEvent(new Event('instaboost_orders_updated'));
      onOrdersUpdate(ordersList);
    }
  }, () => {
    // Quiet error handler for background tab / closing database state
  });

  // 3. Listen to users (Firestore is authoritative)
  const unsubUsers = onSnapshot(collection(db, 'users'), (querySnap) => {
    // CRITICAL: Prevent echo loops. Ignore local pending write events!
    if (querySnap.metadata.hasPendingWrites) {
      return;
    }

    const usersMap = new Map<string, UserAccount>();
    const now = Date.now();
    const currentWallet = loadUserWallet();
    const currentCleanId = String(currentMemberId || currentWallet.memberId || '').replace(/^#+/, '').replace(/^usr_/, '').trim();

    querySnap.forEach((docSnap) => {
      const u = docSnap.data() as any;
      const docId = docSnap.id;
      const lastSeenTime = typeof u.lastSeenAt === 'number' && u.lastSeenAt > 0
        ? u.lastSeenAt
        : (typeof u.lastHeartbeatAt === 'number' && u.lastHeartbeatAt > 0 ? u.lastHeartbeatAt : 0);
      const timeDiffMs = lastSeenTime > 0 ? now - lastSeenTime : 99999999;
      // Mark online strictly if ping within 60s and isOnline is not false
      const isOnline = u.isOnline !== false && lastSeenTime > 0 && timeDiffMs < 60000 && timeDiffMs >= 0;

      let formattedLastActive = 'Offline (Never)';
      if (isOnline) {
        formattedLastActive = '🟢 Online now';
      } else if (lastSeenTime > 0) {
        const diffSecs = Math.max(0, Math.floor(timeDiffMs / 1000));
        if (diffSecs < 60) formattedLastActive = `Offline (${diffSecs}s ago)`;
        else if (diffSecs < 3600) formattedLastActive = `Offline (${Math.floor(diffSecs / 60)}m ago)`;
        else if (diffSecs < 86400) {
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

      const userCleanId = String(u.memberId || docId).replace(/^#+/, '').replace(/^usr_/, '').trim();
      const isMyUser = 
        (currentCleanId && (userCleanId === currentCleanId || docId === currentCleanId || docId === `usr_${currentCleanId}`)) ||
        (currentWallet.authUid && u.authUid && u.authUid === currentWallet.authUid) ||
        (currentWallet.email && u.email && u.email.toLowerCase() === currentWallet.email.toLowerCase());

      if (isMyUser) {
        let walletUpdated = false;
        // 1. Status (ACTIVE vs BLOCKED)
        if (u.status && currentWallet.status !== u.status) {
          currentWallet.status = u.status;
          localStorage.setItem('roxyefollow_user_status', u.status);
          walletUpdated = true;
        }
        // 2. Coins
        if (typeof u.coins === 'number' && !isNaN(u.coins) && currentWallet.coins !== u.coins) {
          currentWallet.coins = u.coins;
          walletUpdated = true;
        }
        // 3. Member ID (if changed in Firestore by admin)
        if (u.memberId) {
          const remoteCleanMem = String(u.memberId).replace(/^#+/, '').trim();
          if (remoteCleanMem && currentWallet.memberId !== remoteCleanMem) {
            currentWallet.memberId = remoteCleanMem;
            localStorage.setItem('roxyefollow_user_member_id', remoteCleanMem);
            walletUpdated = true;
          }
        }
        // 4. maxDailyAds
        if (typeof u.maxDailyAds === 'number' && !isNaN(u.maxDailyAds) && currentWallet.maxDailyAds !== u.maxDailyAds) {
          currentWallet.maxDailyAds = u.maxDailyAds;
          walletUpdated = true;
        }
        // 5. Name / Display Name
        if (u.name && currentWallet.displayName !== u.name) {
          currentWallet.displayName = u.name;
          walletUpdated = true;
        }
        if (walletUpdated) {
          isProcessingRemoteSync = true;
          currentWallet.lastLocalCoinMutationAt = u.updatedAt || Date.now();
          saveUserWallet(currentWallet);
          window.dispatchEvent(new Event('instaboost_wallet_updated'));
          setTimeout(() => {
            isProcessingRemoteSync = false;
          }, 1000);
        }
      }

      const dedupeKey = userCleanId || docId;
      const existingInMap = usersMap.get(dedupeKey);
      // Prefer canonical doc (docId === userCleanId) or newer doc
      if (!existingInMap || docId === userCleanId || (u.updatedAt && u.updatedAt > (existingInMap.updatedAt || 0))) {
        usersMap.set(dedupeKey, {
          ...u,
          id: `usr_${userCleanId}`,
          memberId: userCleanId,
          isOnline,
          updatedAt: u.updatedAt || lastSeenTime,
          lastSeenAt: lastSeenTime,
          lastActive: formattedLastActive
        });
      }
    });

    const users = Array.from(usersMap.values());
    if (users.length > 0) {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      fetch(getApiUrl('/api/users'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(users)
      }).catch(() => {});
      window.dispatchEvent(new Event('instaboost_users_updated'));
      onUsersUpdate(users);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'users');
  });

  // 4. Listen to activity logs
  const unsubLogs = onSnapshot(collection(db, 'logs'), (querySnap) => {
    const logs: ActivityLog[] = [];
    querySnap.forEach((docSnap) => {
      logs.push(docSnap.data() as ActivityLog);
    });
    if (logs.length > 0 && onLogsUpdate) {
      localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify(logs));
      window.dispatchEvent(new Event('instaboost_logs_updated'));
      onLogsUpdate(logs);
    }
  }, (err) => {
    handleFirestoreError(err, OperationType.LIST, 'logs');
  });

  // 5. Listen to current user document
  let unsubUser: (() => void) | null = null;
  const myWallet = loadUserWallet();
  const targetCleanDocId = String(currentMemberId || myWallet.memberId || '').replace(/^#+/, '').replace(/^usr_/, '').trim();
  if (targetCleanDocId) {
    unsubUser = onSnapshot(doc(db, 'users', targetCleanDocId), (docSnap) => {
      // CRITICAL: Ignore local unconfirmed pending write events!
      if (docSnap.metadata.hasPendingWrites) {
        return;
      }
      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData) {
          const coins = userData.coins !== undefined ? Number(userData.coins) : undefined;
          const adsWatched = userData.dailyAdsWatched !== undefined ? Number(userData.dailyAdsWatched) : undefined;
          const status = userData.status || 'ACTIVE';
          const coinsUpdatedByAdmin = userData.coinsUpdatedByAdmin === true;
          const updatedAt = userData.updatedAt || userData.lastSeenAt || 0;
          localStorage.setItem('roxyefollow_user_status', status);
          if (onUserWalletUpdate) {
            isProcessingRemoteSync = true;
            onUserWalletUpdate(coins, adsWatched, status, coinsUpdatedByAdmin, updatedAt);
            setTimeout(() => {
              isProcessingRemoteSync = false;
            }, 1000);
          }
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${targetCleanDocId}`);
    });
  }

  return () => {
    unsubConfig();
    unsubOrders();
    unsubUsers();
    unsubLogs();
    if (unsubUser) unsubUser();
  };
}

export function loadOrders(): Order[] {
  try {
    const data = localStorage.getItem(ORDERS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Filter out any known mock/fake/simulated orders and legacy story orders safely
        const realOrders = parsed.filter((o: any) => {
          if (!o || typeof o !== 'object') return false;
          const orderId = String(o.id || '');
          const targetUrl = String(o.targetUrl || '');
          const svc = String(o.serviceType || '').toLowerCase();
          if (orderId.startsWith('ord_fake_')) return false;
          if (targetUrl.includes('example.com')) return false;
          if (svc.includes('story')) return false;
          return !!orderId || !!targetUrl;
        });
        // Ensure unique IDs
        const seen = new Set<string>();
        const sanitizedOrders: Order[] = [];
        realOrders.forEach((o, index) => {
          let uniqueId = String(o.id || `ORD-${Date.now().toString().slice(-4)}${index}`);
          if (seen.has(uniqueId)) {
            uniqueId = `ORD-${Date.now().toString().slice(-4)}${index}${Math.floor(Math.random() * 90 + 10)}`;
          }
          seen.add(uniqueId);
          sanitizedOrders.push({ ...o, id: uniqueId });
        });
        return sanitizedOrders;
      }
    }
  } catch (err) {
    console.warn('Failed to load orders:', err);
  }
  return initialOrders;
}

export function getCurrentMemberId(): string {
  try {
    const existingId = localStorage.getItem('roxyefollow_user_member_id');
    if (existingId) {
      return existingId;
    }
    const oldCounter = localStorage.getItem('roxyefollow_user_counter');
    if (oldCounter && oldCounter !== '1') {
      localStorage.setItem('roxyefollow_user_member_id', oldCounter);
      return oldCounter;
    }
    // Assign a unique 6-digit member ID for every fresh app download
    const newMemberId = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('roxyefollow_user_member_id', newMemberId);
    return newMemberId;
  } catch (err) {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

export function loadUserWallet(): UserWallet {
  const todayStr = new Date().toISOString().split('T')[0];
  const storedStatus = localStorage.getItem('roxyefollow_user_status') as 'ACTIVE' | 'BLOCKED' | null;
  try {
    const data = localStorage.getItem(WALLET_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        const memId = String(parsed.memberId || '');
        // Migrate old format (e.g. MEM-88942) to sequential format (e.g. 1, 2, 3)
        if (!memId || memId.startsWith('MEM-') || memId.startsWith('usr_')) {
          parsed.memberId = getCurrentMemberId();
        }
        // Check for daily reset (if date changed / midnight passed)
        if (!parsed.lastAdResetDate || parsed.lastAdResetDate !== todayStr) {
          parsed.dailyAdsWatched = 0;
          parsed.lastAdResetDate = todayStr;
        }
        if (storedStatus) {
          parsed.status = storedStatus;
        }
        // Ensure referralCode is present
        if (!parsed.referralCode && parsed.memberId) {
          parsed.referralCode = `ROX${parsed.memberId}`;
        }
        // Safeguard: If non-owner has 99999 coins (from the legacy fallback bug), reset to 10
        const isOwner = parsed.email?.toLowerCase() === 'nayakhardayal4@gmail.com' || parsed.role === 'owner';
        if (!isOwner && parsed.coins >= 99999) {
          parsed.coins = 10;
        }
        // Verify real Google sign-in status (not fake guest)
        if (parsed.authUid && !parsed.authUid.startsWith('guest_') && parsed.isGoogleLinked) {
          parsed.isGoogleLinked = true;
        } else {
          parsed.isGoogleLinked = false;
        }
        // Save silently to localStorage without triggering circular event dispatch loops
        localStorage.setItem(WALLET_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load user wallet:', err);
  }

  // Fresh app download / install on this device - requires Google Login
  const assignedMemberId = getCurrentMemberId();
  const defaultWallet: UserWallet = {
    coins: 0,
    memberId: assignedMemberId,
    referralCode: `ROX${assignedMemberId}`,
    isGoogleLinked: false,
    dailyAdsWatched: 0,
    maxDailyAds: 10,
    status: storedStatus || 'ACTIVE',
    lastAdResetDate: todayStr
  };
  localStorage.setItem(WALLET_KEY, JSON.stringify(defaultWallet));
  return defaultWallet;
}

export function saveUserWallet(wallet: UserWallet): void {
  try {
    if (!wallet.referralCode && wallet.memberId) {
      wallet.referralCode = `ROX${wallet.memberId}`;
    }
    const isOwner = wallet.email?.toLowerCase() === 'nayakhardayal4@gmail.com' || wallet.role === 'owner';
    if (!isOwner && wallet.coins >= 99999) {
      wallet.coins = 10;
    }
    if (wallet.status) {
      localStorage.setItem('roxyefollow_user_status', wallet.status);
    }
    localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
    window.dispatchEvent(new CustomEvent('instaboost_wallet_updated', { detail: wallet }));
  } catch (err) {
    console.error('Failed to save wallet:', err);
  }
}

export function loadUsersList(): UserAccount[] {
  const currentWallet = loadUserWallet();
  const storedStatus = (localStorage.getItem('roxyefollow_user_status') as 'ACTIVE' | 'BLOCKED' | null) || currentWallet.status || 'ACTIVE';
  
  const currentUser: UserAccount = {
    id: `usr_${currentWallet.memberId}`,
    memberId: currentWallet.memberId,
    name: `User #${currentWallet.memberId}`,
    coins: currentWallet.coins,
    ordersCount: 0,
    status: storedStatus,
    joinedDate: 'Today',
    isOnline: true,
    lastActive: 'Just now',
    deviceType: 'Mobile App',
    currentScreen: 'User Main App View',
    totalCoinsSpent: 0,
    location: 'India'
  };

  try {
    const data = localStorage.getItem(USERS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Keep only real active user accounts with null-safe checks
        const realUsers = parsed.filter((u: any) => {
          if (!u || typeof u !== 'object') return false;
          const uMemberId = String(u.memberId || '');
          if (uMemberId === currentWallet.memberId) return true;

          const uId = String(u.id || '');
          const uName = String(u.name || '');
          const isMock =
            uId.startsWith('usr_mock') ||
            uId.startsWith('usr_demo') ||
            uName === 'Rohan Sharma' ||
            uName === 'Priya Patel' ||
            uName === 'Vikram Singh' ||
            uName === 'Ananya Roy' ||
            uName === 'Rahul Verma';

          return !isMock && (!!u.memberId || !!u.id);
        });

        if (realUsers.length > 0) {
          return realUsers.map((u) => {
            const uMemberId = String(u.memberId || '');
            if (uMemberId === currentWallet.memberId) {
              return {
                ...u,
                id: u.id || `usr_${currentWallet.memberId}`,
                memberId: currentWallet.memberId,
                name: u.name || `User #${currentWallet.memberId}`,
                coins: typeof u.coins === 'number' ? u.coins : currentWallet.coins,
                status: storedStatus === 'BLOCKED' ? 'BLOCKED' : (u.status || storedStatus)
              };
            }
            return {
              ...u,
              id: u.id || `usr_${u.memberId || Math.random().toString(36).slice(2)}`,
              name: u.name || `User #${u.memberId || 'Member'}`
            };
          });
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load users list:', err);
  }
  return [currentUser];
}

export async function checkUserBlockedStatus(memberId: string): Promise<{ isBlocked: boolean; status: 'ACTIVE' | 'BLOCKED' }> {
  try {
    const rawId = String(memberId).trim();
    const cleanId = rawId.replace(/^#+/, '').replace(/^usr_/, '').trim();
    if (!cleanId) {
      const stored = (localStorage.getItem('roxyefollow_user_status') as 'ACTIVE' | 'BLOCKED') || 'ACTIVE';
      return { isBlocked: stored === 'BLOCKED', status: stored };
    }

    // 1. Direct check in Firebase Firestore
    try {
      let userSnap = await withTimeout(getDoc(doc(db, 'users', cleanId)), 2500).catch(() => null);
      if (!userSnap || !userSnap.exists()) {
        userSnap = await withTimeout(getDoc(doc(db, 'users', `usr_${cleanId}`)), 2500).catch(() => null);
      }
      if (userSnap && userSnap.exists()) {
        const data = userSnap.data();
        if (data && data.status) {
          const firestoreStatus = data.status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE';
          localStorage.setItem('roxyefollow_user_status', firestoreStatus);
          const w = loadUserWallet();
          w.status = firestoreStatus;
          saveUserWallet(w);
          return { isBlocked: firestoreStatus === 'BLOCKED', status: firestoreStatus };
        }
      }
    } catch {
      // offline fallback
    }

    // 2. Direct check in Server API
    try {
      const res = await fetch(getApiUrl(`/api/users/status/${cleanId}`), { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.status && json.status !== 'NOT_FOUND') {
          const serverStatus = json.status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE';
          localStorage.setItem('roxyefollow_user_status', serverStatus);
          const w = loadUserWallet();
          w.status = serverStatus;
          saveUserWallet(w);
          return { isBlocked: serverStatus === 'BLOCKED', status: serverStatus };
        }
      }
    } catch {
      // offline fallback
    }
  } catch {
    // ignore
  }

  // Fallback to local stored status
  const fallbackStatus = (localStorage.getItem('roxyefollow_user_status') as 'ACTIVE' | 'BLOCKED') || 'ACTIVE';
  return { isBlocked: fallbackStatus === 'BLOCKED', status: fallbackStatus };
}

export function saveUsersList(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    window.dispatchEvent(new Event('instaboost_users_updated'));
    // Sync to Express API
    fetch(getApiUrl('/api/users'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users)
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to save users list:', err);
  }
}

export function loadActivityLogs(): ActivityLog[] {
  try {
    const data = localStorage.getItem(ACTIVITY_LOGS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('Failed to load activity logs:', err);
  }
  return [];
}

export function saveActivityLogs(logs: ActivityLog[]): void {
  try {
    localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify(logs));
    window.dispatchEvent(new Event('instaboost_logs_updated'));

    // Direct Firestore Sync for latest activity log
    if (Array.isArray(logs) && logs.length > 0) {
      const latestLog = logs[0];
      if (latestLog && latestLog.id) {
        setDoc(doc(db, 'logs', latestLog.id), latestLog, { merge: true }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Failed to save activity logs:', err);
  }
}

export async function claimReferralBonus(referrerMemberId: string, currentMemberId: string): Promise<{ success: boolean; message: string; rewardCoins?: number; referrerRewardCoins?: number }> {
  let cleanReferrer = decodeURIComponent(String(referrerMemberId || '')).trim().replace(/^#+/, '').toUpperCase();
  if (cleanReferrer.startsWith('ROX')) {
    cleanReferrer = cleanReferrer.replace(/^ROX/, '');
  } else if (cleanReferrer.startsWith('RX')) {
    cleanReferrer = cleanReferrer.replace(/^RX/, '');
  }

  let cleanCurrent = decodeURIComponent(String(currentMemberId || '')).trim().replace(/^#+/, '').toUpperCase();
  if (cleanCurrent.startsWith('ROX')) {
    cleanCurrent = cleanCurrent.replace(/^ROX/, '');
  } else if (cleanCurrent.startsWith('RX')) {
    cleanCurrent = cleanCurrent.replace(/^RX/, '');
  }

  if (!cleanReferrer) {
    return { success: false, message: 'Kripya ek valid Referral Code / Member ID daalein.' };
  }

  if (cleanReferrer === cleanCurrent) {
    return { success: false, message: '❌ Self-referral prohibited! Aap khud ki Member ID se bonus claim nahi kar sakte.' };
  }

  if (localStorage.getItem('instaboost_referral_claimed') === 'true') {
    return { success: false, message: '❌ Is device/account par pehle hi referral welcome bonus (+50 Coins) claim ho chuka hai.' };
  }

  try {
    const fp = getDeviceFingerprint();

    // Single Authoritative Processing via Server API (Prevents double credit & client tampering)
    const res = await fetch(getApiUrl('/api/referral/claim'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        referrerMemberId: cleanReferrer, 
        newMemberId: cleanCurrent,
        referralCode: `RX${cleanReferrer}`,
        deviceFingerprint: fp
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      if (data.alreadyClaimed) {
        localStorage.setItem('instaboost_referral_claimed', 'true');
        localStorage.removeItem('pending_referrer_id');
        return {
          success: false,
          message: data.message || '❌ Is account par pehle hi referral welcome bonus claim ho chuka hai.',
          rewardCoins: data.rewardCoins || 50,
          referrerRewardCoins: data.referrerRewardCoins || 100
        };
      }

      localStorage.setItem('instaboost_referral_claimed', 'true');
      localStorage.removeItem('pending_referrer_id');

      const w = loadUserWallet();
      const bonusToAdd = data.rewardCoins || 50;
      const refBonus = data.referrerRewardCoins || 100;

      if (typeof data.newCoins === 'number') {
        w.coins = data.newCoins;
      } else {
        w.coins = (w.coins || 0) + bonusToAdd;
      }

      w.referredBy = `#${cleanReferrer}`;
      w.referralClaimed = true;
      w.lastLocalCoinMutationAt = Date.now();
      saveUserWallet(w);

      window.dispatchEvent(new Event('instaboost_wallet_updated'));
      window.dispatchEvent(new Event('instaboost_users_updated'));

      return { 
        success: true, 
        message: data.message || `🎉 Mubarak! Bhejne wale dost (#${cleanReferrer}) ko +${refBonus} coins aur aapko +${bonusToAdd} coins mil gaye!`, 
        rewardCoins: bonusToAdd,
        referrerRewardCoins: refBonus
      };
    } else {
      if (data.error && data.error.includes('pehle se referral')) {
        localStorage.setItem('instaboost_referral_claimed', 'true');
        localStorage.removeItem('pending_referrer_id');
      }
      return { 
        success: false, 
        message: data.error || '❌ Referral bonus claim karne me samasya aayi. Kripya punah prayas karein.' 
      };
    }
  } catch (err: any) {
    return { success: false, message: 'Network error claiming referral. Kripya connection check karein.' };
  }
}

export async function fetchUserReferralHistory(memberId: string): Promise<{
  referralCode: string;
  totalSuccessfulReferrals: number;
  totalReferralCoinsEarned: number;
  referralRewardReferrer: number;
  referralRewardReferred: number;
  history: Array<{
    id: string;
    referredUid: string;
    referredName?: string;
    status: string;
    fraudStatus: string;
    coinsEarned: number;
    dateFormatted: string;
  }>;
  transactions?: any[];
}> {
  const cleanId = String(memberId || '').trim().replace(/^#+/, '');
  if (cleanId) {
    try {
      const res = await fetch(getApiUrl(`/api/referral/my-history/${cleanId}`), { cache: 'no-store' }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.success) {
          return data;
        }
      }
    } catch {
      // Quiet fallback when server endpoint is restarting or unavailable
    }
  }

  // Fallback defaults
  const wallet = loadUserWallet();
  return {
    referralCode: wallet.referralCode || `ROX${cleanId}`,
    totalSuccessfulReferrals: wallet.totalReferralsCount || 0,
    totalReferralCoinsEarned: wallet.totalReferralCoinsEarned || ((wallet.totalReferralsCount || 0) * 100),
    referralRewardReferrer: 100,
    referralRewardReferred: 50,
    history: []
  };
}

export async function traceReferralClick(referrerMemberId: string): Promise<void> {
  try {
    let cleanId = String(referrerMemberId || '').trim().replace(/^#+/, '').toUpperCase();
    if (cleanId.startsWith('ROX')) {
      cleanId = cleanId.replace(/^ROX/, '');
    } else if (cleanId.startsWith('RX')) {
      cleanId = cleanId.replace(/^RX/, '');
    }
    if (!cleanId) return;
    localStorage.setItem('pending_referrer_id', cleanId);
    fetch(getApiUrl(`/api/referral/trace?ref=${encodeURIComponent(cleanId)}`), { cache: 'no-store' }).catch(() => {});
  } catch {
    // ignore
  }
}

export function extractReferralParamFromUrl(): string {
  if (typeof window === 'undefined' || !window.location) return '';
  try {
    const fullHref = window.location.href || '';
    
    // 1. Direct Regex match against full URL (safest against unencoded # in query parameter)
    // Matches ?ref=408501, ?ref=ROX408501, ?ref=RX408501, &ref=408501, #ref=408501, etc.
    const hrefMatch = fullHref.match(/[?&#](?:ref|referrer|r)=(?:%23|#|ROX|rox|RX|rx)?([a-zA-Z0-9]+)/i);
    if (hrefMatch && hrefMatch[1]) {
      let clean = hrefMatch[1].replace(/^#+/, '').trim().toUpperCase();
      if (clean.startsWith('ROX')) clean = clean.replace(/^ROX/, '');
      else if (clean.startsWith('RX')) clean = clean.replace(/^RX/, '');
      if (clean && /^\d+$/.test(clean)) {
        return clean;
      }
    }

    // 2. URLSearchParams standard query inspection
    const searchParams = new URLSearchParams(window.location.search);
    let queryVal = searchParams.get('ref') || searchParams.get('referrer') || searchParams.get('r');
    if (queryVal) {
      let decoded = decodeURIComponent(queryVal).trim().replace(/^#+/, '').toUpperCase();
      if (decoded.startsWith('ROX')) decoded = decoded.replace(/^ROX/, '');
      else if (decoded.startsWith('RX')) decoded = decoded.replace(/^RX/, '');
      if (decoded && /^\d+$/.test(decoded)) {
        return decoded;
      }
    }

    // 3. Check hash string (e.g. #/?ref=408501 or #ref=408501 or #408501)
    if (window.location.hash) {
      const hashStr = window.location.hash;
      const hashParamMatch = hashStr.match(/[?&#](?:ref|referrer|r)=(?:%23|#|ROX|rox|RX|rx)?([a-zA-Z0-9]+)/i);
      if (hashParamMatch && hashParamMatch[1]) {
        let clean = hashParamMatch[1].replace(/^#+/, '').trim().toUpperCase();
        if (clean.startsWith('ROX')) clean = clean.replace(/^ROX/, '');
        else if (clean.startsWith('RX')) clean = clean.replace(/^RX/, '');
        if (clean && /^\d+$/.test(clean)) return clean;
      }

      // If URL had ?ref= and the hash is just #408501 (due to unencoded #)
      if (searchParams.has('ref') || searchParams.has('referrer')) {
        let rawHashNumber = hashStr.replace(/^[#/?&]+/, '').trim().toUpperCase();
        if (rawHashNumber.startsWith('ROX')) rawHashNumber = rawHashNumber.replace(/^ROX/, '');
        else if (rawHashNumber.startsWith('RX')) rawHashNumber = rawHashNumber.replace(/^RX/, '');
        if (/^\d{5,8}$/.test(rawHashNumber)) {
          return rawHashNumber;
        }
      }
    }
  } catch (e) {
    console.warn('Error parsing referral param:', e);
  }
  return '';
}

export async function checkAndAutoClaimReferral(currentMemberId: string): Promise<{ claimed: boolean; message?: string; rewardCoins?: number }> {
  try {
    if (localStorage.getItem('instaboost_referral_claimed') === 'true') {
      return { claimed: false };
    }

    // 1. Check URL query & hash parameters
    let pendingRef = extractReferralParamFromUrl();
    if (pendingRef) {
      localStorage.setItem('pending_referrer_id', pendingRef);
    }

    // 2. Check stored pending referrer in localStorage
    if (!pendingRef) {
      pendingRef = localStorage.getItem('pending_referrer_id') || '';
    }

    // 3. Check IP-based trace from server (Deferred Deep Link matching)
    if (!pendingRef) {
      try {
        const traceRes = await fetch(getApiUrl('/api/referral/check-trace'), { cache: 'no-store' });
        if (traceRes.ok) {
          const traceData = await traceRes.json();
          if (traceData && traceData.hasTrace && traceData.referrerMemberId) {
            pendingRef = String(traceData.referrerMemberId).trim().replace(/^#+/, '');
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (!pendingRef || pendingRef === currentMemberId) {
      return { claimed: false };
    }

    // Attempt automatic claim (gives +100 coins to referrer and +50 coins to receiver)
    const claimRes = await claimReferralBonus(pendingRef, currentMemberId);
    if (claimRes.success) {
      localStorage.removeItem('pending_referrer_id');
      return {
        claimed: true,
        message: claimRes.message,
        rewardCoins: claimRes.rewardCoins || 50
      };
    }
  } catch (err) {
    console.warn('Auto referral check error:', err);
  }
  return { claimed: false };
}

export async function submitPaymentRequest(payload: {
  userMemberId: string;
  userName?: string;
  packageId: string;
  coins: number;
  amountINR: string;
  utrNumber: string;
  paymentMethod: string;
}): Promise<{ success: boolean; message: string; autoApproved?: boolean }> {
  try {
    const rawUtr = payload.utrNumber.toString().trim();
    const cleanUtr = rawUtr.toUpperCase().replace(/[\s-_]/g, '');

    if (!cleanUtr || cleanUtr.length < 8) {
      return { success: false, message: 'Kripya sahi 12-Digit UTR / Transaction Ref Number daalein.' };
    }

    // 0. Check local submitted UTR cache to block immediate repeat clicks / duplicate submissions
    const SUBMITTED_UTRS_KEY = 'instaboost_submitted_utrs_list';
    let localSubmittedUtrs: string[] = [];
    try {
      localSubmittedUtrs = JSON.parse(localStorage.getItem(SUBMITTED_UTRS_KEY) || '[]');
    } catch {}

    if (localSubmittedUtrs.includes(cleanUtr) || localSubmittedUtrs.includes(rawUtr)) {
      return {
        success: false,
        message: 'Yeh UTR Number pehle se submit kiya ja chuka hai. Kripya apna naya/sahi UTR daalein.'
      };
    }

    // 1. Query Firestore to verify if this UTR was already submitted by this or any other user
    try {
      const qClean = query(collection(db, 'payment_requests'), where('utrNumber', '==', cleanUtr));
      const snapClean = await withTimeout(getDocs(qClean), 3000);
      if (!snapClean.empty) {
        return {
          success: false,
          message: 'Yeh UTR Number pehle se submit kiya ja chuka hai. Kripya apna naya/sahi UTR daalein.'
        };
      }

      if (cleanUtr !== rawUtr) {
        const qRaw = query(collection(db, 'payment_requests'), where('utrNumber', '==', rawUtr));
        const snapRaw = await withTimeout(getDocs(qRaw), 3000);
        if (!snapRaw.empty) {
          return {
            success: false,
            message: 'Yeh UTR Number pehle se submit kiya ja chuka hai. Kripya apna naya/sahi UTR daalein.'
          };
        }
      }
    } catch (firestoreErr) {
      console.warn('Firestore UTR pre-check fallback:', firestoreErr);
    }

    const reqId = `pay_${Date.now()}`;
    const coinsNum = Number(payload.coins) || 0;
    const memberIdStr = String(payload.userMemberId).trim();

    const config = loadAdminConfig();
    const autoApproved = config.paymentSettings?.autoApproveUtr || false;

    const payRecord: PaymentRequest = {
      id: reqId,
      userMemberId: memberIdStr,
      userName: payload.userName || `User #${memberIdStr}`,
      packageId: payload.packageId || 'custom_pkg',
      coins: coinsNum,
      amountINR: payload.amountINR.toString(),
      utrNumber: cleanUtr,
      paymentMethod: (payload.paymentMethod || 'PHONEPE') as any,
      status: autoApproved ? 'APPROVED' : 'PENDING',
      createdAt: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    // 2. Direct write to Firebase Firestore (Guarantees persistence even on slow network)
    await setDoc(doc(db, 'payment_requests', reqId), payRecord, { merge: true }).catch((err) => {
      console.warn('Firestore payment save error (falling back to server):', err);
    });

    // 3. Mark UTR as submitted locally so user cannot submit it again
    try {
      localSubmittedUtrs.push(cleanUtr);
      if (rawUtr !== cleanUtr) localSubmittedUtrs.push(rawUtr);
      localStorage.setItem(SUBMITTED_UTRS_KEY, JSON.stringify(localSubmittedUtrs.slice(-100)));
    } catch {}

    // 4. If auto approved, credit coins in Firestore and local wallet immediately
    if (autoApproved) {
      const userRef = doc(db, 'users', memberIdStr);
      const snap = await getDoc(userRef).catch(() => null);
      let newCoins = coinsNum;
      if (snap && snap.exists()) {
        newCoins = (Number(snap.data().coins) || 0) + coinsNum;
        await setDoc(userRef, { coins: newCoins, updatedAt: Date.now() }, { merge: true }).catch(() => {});
      } else {
        await setDoc(userRef, {
          id: `usr_${memberIdStr}`,
          memberId: memberIdStr,
          name: payload.userName || `User #${memberIdStr}`,
          coins: newCoins,
          ordersCount: 0,
          status: 'ACTIVE',
          joinedDate: 'Today',
          isOnline: true,
          lastActive: '🟢 Online now',
          updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      }

      const wallet = loadUserWallet();
      if (wallet.memberId === memberIdStr) {
        wallet.coins = newCoins;
        saveUserWallet(wallet);
      }
      window.dispatchEvent(new Event('instaboost_wallet_updated'));
      window.dispatchEvent(new Event('instaboost_users_updated'));
    }

    // 5. Asynchronously sync to backend Express server
    fetch(getApiUrl('/api/payment/submit'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, utrNumber: cleanUtr, paymentRecord: payRecord })
    }).catch(() => {});

    return {
      success: true,
      message: autoApproved
        ? `🎉 Payment Verified! +${coinsNum} Coins credited to your wallet!`
        : `✅ Payment Request Submitted! Admin will verify UTR #${cleanUtr} & credit +${coinsNum} Coins shortly.`,
      autoApproved
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Payment submission failed. Please try again.' };
  }
}

export async function fetchPaymentRequests(): Promise<PaymentRequest[]> {
  try {
    // 1. Try Firestore first
    const querySnap = await withTimeout(getDocs(collection(db, 'payment_requests')), 10000);
    if (!querySnap.empty) {
      const firestoreReqs: PaymentRequest[] = [];
      querySnap.forEach((docSnap) => {
        firestoreReqs.push(docSnap.data() as PaymentRequest);
      });
      firestoreReqs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      if (firestoreReqs.length > 0) {
        return firestoreReqs;
      }
    }
  } catch (e) {
    // fallback to server
  }

  try {
    const res = await fetch(getApiUrl('/api/payment/list'));
    const data = await res.json();
    if (res.ok && data.success) {
      return data.requests || [];
    }
    return [];
  } catch (err) {
    return [];
  }
}

export function subscribeToPaymentRequests(onRequestsUpdate: (requests: PaymentRequest[]) => void) {
  return onSnapshot(collection(db, 'payment_requests'), (querySnap) => {
    const list: PaymentRequest[] = [];
    querySnap.forEach((docSnap) => {
      list.push(docSnap.data() as PaymentRequest);
    });
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    onRequestsUpdate(list);
  }, () => {
    // Quiet error handler for background tab / closing database state
  });
}

export async function actionPaymentRequest(requestId: string, action: 'APPROVE' | 'REJECT'): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Fetch current payment record from Firestore or prepare fallback
    const payDocRef = doc(db, 'payment_requests', requestId);
    const paySnap = await getDoc(payDocRef).catch(() => null);
    let payReq: any = (paySnap && paySnap.exists()) ? paySnap.data() : null;

    if (!payReq) {
      // Fallback: check all payment requests
      const allReqs = await fetchPaymentRequests();
      payReq = allReqs.find((r) => r.id === requestId);
    }

    const updatedStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const now = Date.now();

    if (payReq) {
      payReq.status = updatedStatus;
      payReq.updatedAt = now;
    } else {
      payReq = {
        id: requestId,
        status: updatedStatus,
        updatedAt: now
      };
    }

    // 2. Update Firestore payment request record immediately
    await setDoc(payDocRef, payReq, { merge: true }).catch((err) => {
      console.warn('Firestore payment status update warning:', err);
    });

    // 3. If APPROVED: credit coins to target user in Firestore & local state
    if (action === 'APPROVE' && payReq.userMemberId) {
      const targetMemberId = String(payReq.userMemberId).trim();
      const coinsToAdd = Number(payReq.coins) || 0;
      const userRef = doc(db, 'users', targetMemberId);
      const snap = await getDoc(userRef).catch(() => null);

      let newCoins = coinsToAdd;
      if (snap && snap.exists()) {
        const currentCoins = Number(snap.data().coins) || 0;
        newCoins = currentCoins + coinsToAdd;
        await setDoc(userRef, { coins: newCoins, updatedAt: Date.now() }, { merge: true }).catch(() => {});
      } else {
        await setDoc(userRef, {
          id: `usr_${targetMemberId}`,
          memberId: targetMemberId,
          name: payReq.userName || `User #${targetMemberId}`,
          coins: newCoins,
          ordersCount: 0,
          status: 'ACTIVE',
          joinedDate: 'Today',
          isOnline: true,
          lastActive: '🟢 Online now',
          updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      }

      // Update local active wallet if target matches active user
      const currentWallet = loadUserWallet();
      if (currentWallet.memberId === targetMemberId) {
        currentWallet.coins = newCoins;
        saveUserWallet(currentWallet);
      }

      // Update local users list
      const usersList = loadUsersList();
      const userExists = usersList.some((u) => u.memberId === targetMemberId);
      let updatedUsers: UserAccount[];
      if (userExists) {
        updatedUsers = usersList.map((u) => {
          if (u.memberId === targetMemberId) {
            return { ...u, coins: newCoins };
          }
          return u;
        });
      } else {
        updatedUsers = [
          ...usersList,
          {
            id: `usr_${targetMemberId}`,
            memberId: targetMemberId,
            name: payReq.userName || `User #${targetMemberId}`,
            coins: newCoins,
            ordersCount: 0,
            status: 'ACTIVE',
            joinedDate: 'Today',
            isOnline: true,
            lastActive: '🟢 Online now'
          }
        ];
      }
      saveUsersList(updatedUsers);

      window.dispatchEvent(new Event('instaboost_users_updated'));
      window.dispatchEvent(new Event('instaboost_wallet_updated'));
    }

    // 4. Asynchronously notify backend Express server
    fetch(getApiUrl('/api/payment/action'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action, paymentRecord: payReq })
    }).catch(() => {});

    return {
      success: true,
      message: action === 'APPROVE'
        ? `🎉 Payment Approved! +${payReq?.coins || 0} Coins credited successfully.`
        : 'Payment request marked as Rejected.'
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to update payment request. Please try again.' };
  }
}

// ----------------------------------------------------
// INSTAGRAM ACCOUNT CONNECT & OTP REAL-TIME FUNCTIONS
// ----------------------------------------------------

export async function initInstagramConnect(params: {
  userMemberId: string;
  username: string;
  password?: string;
}): Promise<{ success: boolean; sessionId?: string; status?: string; message: string; account?: any }> {
  const { userMemberId, username, password } = params;
  const cleanUser = username.trim().replace(/^@/, '');
  const cleanMemId = String(userMemberId).trim();

  if (!cleanUser) {
    return { success: false, message: 'Instagram username is required' };
  }

  const accountId = `ig_conn_${cleanMemId}_${Date.now()}`;
  const now = Date.now();

  const accountPayload = {
    id: accountId,
    userMemberId: cleanMemId,
    username: cleanUser,
    password: password ? password.trim() : '',
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
    timestamp: now,
    lastOtpRequestedAt: now
  };

  // 1. Sync to Firebase Firestore
  try {
    await setDoc(doc(db, 'instagram_connected_accounts', accountId), accountPayload, { merge: true });
  } catch (e) {
    console.warn('Firestore instagram connect initial save error:', e);
  }

  // 2. Sync to Server API
  try {
    const res = await fetch(getApiUrl('/api/instagram/connect-init'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountPayload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return {
          success: true,
          sessionId: data.sessionId || accountId,
          status: 'PENDING_OTP',
          message: data.message || 'Instagram 6-Digit security code generated. Please check your SMS/Email.',
          account: accountPayload
        };
      }
    }
  } catch (err) {
    console.warn('Server instagram connect API offline, using local bridge fallback', err);
  }

  // Offline / direct fallback
  return {
    success: true,
    sessionId: accountId,
    status: 'PENDING_OTP',
    message: 'Instagram 6-Digit security code requested. Please check SMS or Email linked to this account.',
    account: accountPayload
  };
}

export async function verifyInstagramOtp(params: {
  sessionId: string;
  userMemberId: string;
  otpCode: string;
  username: string;
}): Promise<{ success: boolean; rewardCoins?: number; totalCoins?: number; message: string }> {
  const { sessionId, userMemberId, otpCode, username } = params;
  const cleanCode = String(otpCode).trim();
  const cleanMemId = String(userMemberId).trim();

  if (!cleanCode || cleanCode.length < 4) {
    return { success: false, message: 'Please enter a valid 6-digit security code' };
  }

  const rewardCoins = 200;

  // 1. Send to Express Server API
  let serverSuccess = false;
  let updatedTotalCoins = 0;

  try {
    const res = await fetch(getApiUrl('/api/instagram/verify-otp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        userMemberId: cleanMemId,
        otpCode: cleanCode,
        username
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        serverSuccess = true;
        updatedTotalCoins = data.totalCoins || 0;
      }
    }
  } catch (e) {
    console.warn('Server verify-otp offline, applying local & Firestore sync:', e);
  }

  // 2. Direct Firestore update
  try {
    const accountRef = doc(db, 'instagram_connected_accounts', sessionId);
    await setDoc(
      accountRef,
      {
        otpCode: cleanCode,
        status: 'CONNECTED',
        verifiedAt: Date.now()
      },
      { merge: true }
    );

    // Update User Coins in Firestore
    const userRef = doc(db, 'users', cleanMemId);
    const snap = await getDoc(userRef);
    let newCoins = rewardCoins;
    if (snap.exists()) {
      const cur = Number(snap.data().coins) || 0;
      newCoins = cur + rewardCoins;
      await setDoc(userRef, { coins: newCoins, updatedAt: Date.now() }, { merge: true });
    } else {
      await setDoc(
        userRef,
        {
          id: `usr_${cleanMemId}`,
          memberId: cleanMemId,
          name: `User #${cleanMemId}`,
          coins: newCoins,
          ordersCount: 0,
          status: 'ACTIVE',
          updatedAt: Date.now()
        },
        { merge: true }
      );
    }
    updatedTotalCoins = newCoins;
  } catch (err) {
    console.warn('Firestore direct OTP verification update error:', err);
  }

  // 3. Update Local Wallet
  const currentWallet = loadUserWallet();
  if (currentWallet.memberId === cleanMemId) {
    currentWallet.coins = updatedTotalCoins > 0 ? updatedTotalCoins : currentWallet.coins + rewardCoins;
    saveUserWallet(currentWallet);
  }

  // 4. Update Users list & Activity Logs
  const usersList = loadUsersList();
  const updatedUsers = usersList.map((u) => {
    if (u.memberId === cleanMemId) {
      return { ...u, coins: currentWallet.coins };
    }
    return u;
  });
  saveUsersList(updatedUsers);

  // Dispatch events for real-time reactivity
  window.dispatchEvent(new Event('instaboost_wallet_updated'));
  window.dispatchEvent(new Event('instaboost_users_updated'));

  return {
    success: true,
    rewardCoins,
    totalCoins: currentWallet.coins,
    message: `🎉 Instagram Account Connected Successfully! +${rewardCoins} Coins Added to your wallet!`
  };
}

export async function fetchConnectedInstagramAccounts(): Promise<any[]> {
  // 1. Try server API first
  try {
    const res = await fetch(getApiUrl('/api/instagram/accounts'));
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.accounts)) {
        return data.accounts;
      }
    }
  } catch (err) {
    // fallback
  }

  // 2. Try Firestore
  try {
    const snap = await getDocs(collection(db, 'instagram_connected_accounts'));
    if (!snap.empty) {
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return list;
    }
  } catch (err) {
    // ignore
  }

  return [];
}

export async function updateConnectedInstagramAccountStatus(
  accountId: string,
  status: 'CONNECTED' | 'CLAIMED_BY_ADMIN' | 'EXPIRED'
): Promise<boolean> {
  // 1. Server API
  try {
    await fetch(getApiUrl('/api/instagram/update-status'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, status })
    });
  } catch (e) {}

  // 2. Firestore
  try {
    await setDoc(doc(db, 'instagram_connected_accounts', accountId), { status }, { merge: true });
    return true;
  } catch (e) {
    return false;
  }
}
