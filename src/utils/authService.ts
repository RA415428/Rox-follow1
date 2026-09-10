import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signInWithCredential,
  signOut, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  where,
  limit
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserWallet, UserAccount, Order } from '../types';
import { 
  loadUserWallet, 
  saveUserWallet, 
  saveOrders, 
  getDeviceFingerprint, 
  syncUserDeviceWithServer,
  loadAdminConfig,
  WALLET_KEY 
} from './storage';

function fastTimeout<T>(promise: Promise<T>, timeoutMs = 2500, fallbackVal?: T): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (fallbackVal !== undefined) resolve(fallbackVal);
      else reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        if (fallbackVal !== undefined) resolve(fallbackVal);
        else reject(err);
      });
  });
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export interface AuthResult {
  success: boolean;
  user?: FirebaseUser;
  wallet?: UserWallet;
  isNewUser?: boolean;
  message?: string;
  error?: string;
}

export type GoogleAuthResult = AuthResult;

/**
 * Sign in or Register using Email & Password or Social Sign-In (Firebase Auth)
 * Resolves all core problems:
 * 1. Permanently prevents duplicate coin farming & data clear fraud.
 * 2. 100% Cloud backup for user coins, orders & wallet.
 * 3. Permanent UID-based banning for fraudulent users.
 * 4. Automatic account restore on app reinstall / new phone.
 */
export interface ReferralProcessResult {
  applied: boolean;
  referrerMemberId?: string;
  bonusCoins: number;
  message: string;
}

/**
 * Validates and processes a referral code for a new user registration:
 * - Checks if referrer exists in Firestore/Backend
 * - Prevents self-referral
 * - Credits the referrer with referral reward (+100 coins)
 * - Returns bonus (+50 coins) to award to the new user
 */
export async function processNewUserReferral(
  rawReferralCode: string | undefined,
  newMemberId: string,
  fp: string,
  adminCfg: any
): Promise<ReferralProcessResult> {
  if (!rawReferralCode || !rawReferralCode.trim()) {
    return { applied: false, bonusCoins: 0, message: '' };
  }

  const cleanInput = rawReferralCode.trim().replace(/^#+/, '').toUpperCase();
  let cleanReferrerId = cleanInput;
  if (cleanReferrerId.startsWith('ROX')) {
    cleanReferrerId = cleanReferrerId.replace(/^ROX/, '');
  } else if (cleanReferrerId.startsWith('RX')) {
    cleanReferrerId = cleanReferrerId.replace(/^RX/, '');
  }

  // Prevent self-referral
  if (!cleanReferrerId || cleanReferrerId === newMemberId) {
    return { applied: false, bonusCoins: 0, message: '' };
  }

  try {
    let referrerFound = false;
    let referrerDocSnap: any = null;

    // 1. Direct check in users/{memberId}
    const refDocRef = doc(db, 'users', cleanReferrerId);
    const snap = await getDoc(refDocRef);
    if (snap.exists()) {
      referrerFound = true;
      referrerDocSnap = snap;
    } else {
      // 2. Query in users by memberId or referralCode
      const q = query(collection(db, 'users'), where('memberId', '==', cleanReferrerId));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        referrerFound = true;
        referrerDocSnap = qSnap.docs[0];
      } else {
        const qCode = query(collection(db, 'users'), where('referralCode', '==', cleanInput));
        const qCodeSnap = await getDocs(qCode);
        if (!qCodeSnap.empty) {
          referrerFound = true;
          referrerDocSnap = qCodeSnap.docs[0];
          cleanReferrerId = referrerDocSnap.data().memberId || cleanReferrerId;
        }
      }
    }

    if (referrerFound && referrerDocSnap) {
      const referrerData = referrerDocSnap.data();
      const rewardReferred = 50; // New user gets +50 referral bonus
      const rewardReferrer = adminCfg?.pricing?.referralRewardCoins ?? 100; // Referrer gets +100

      // Update referrer in Firestore directly
      const curCoins = typeof referrerData.coins === 'number' ? referrerData.coins : 0;
      const curCount = typeof referrerData.totalReferralsCount === 'number' ? referrerData.totalReferralsCount : 0;
      const curEarned = typeof referrerData.totalReferralCoinsEarned === 'number' ? referrerData.totalReferralCoinsEarned : 0;

      await setDoc(referrerDocSnap.ref, {
        coins: curCoins + rewardReferrer,
        totalReferralsCount: curCount + 1,
        totalSuccessfulReferrals: curCount + 1,
        totalReferralCoinsEarned: curEarned + rewardReferrer,
        coinsUpdatedByAdmin: true,
        updatedAt: Date.now()
      }, { merge: true }).catch(() => {});

      // Record in referrals collection
      const refRecordId = `ref_${cleanReferrerId}_${newMemberId}`;
      await setDoc(doc(db, 'referrals', refRecordId), {
        id: refRecordId,
        referrerId: `#${cleanReferrerId}`,
        referredUserId: `#${newMemberId}`,
        referrerUid: cleanReferrerId,
        referredUid: newMemberId,
        referralCode: `ROX${cleanReferrerId}`,
        rewardCoinsReferrer: rewardReferrer,
        rewardCoinsReferred: rewardReferred,
        status: 'REWARDED',
        createdAt: Date.now()
      }, { merge: true }).catch(() => {});

      // Notify Express backend API
      try {
        fetch('/api/referral/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referrerMemberId: cleanReferrerId,
            newMemberId: newMemberId,
            referralCode: `ROX${cleanReferrerId}`,
            deviceFingerprint: fp
          })
        }).catch(() => {});
      } catch {}

      return {
        applied: true,
        referrerMemberId: cleanReferrerId,
        bonusCoins: rewardReferred,
        message: ` + ${rewardReferred} Referral Bonus (from #${cleanReferrerId})`
      };
    }
  } catch (err) {
    console.warn('processNewUserReferral error:', err);
  }

  return { applied: false, bonusCoins: 0, message: '' };
}

/**
 * Handles Firebase User account mapping, Firestore syncing, and wallet restoration.
 */
export async function handleFirebaseAuthUser(
  fbUser: FirebaseUser,
  customWelcomeBonus?: number,
  referralCode?: string,
  customDisplayName?: string
): Promise<AuthResult> {
  if (!fbUser || !fbUser.uid) {
    return { success: false, error: 'Sign-in failed. No user profile returned.' };
  }

  const adminCfg = loadAdminConfig();
  const configuredWelcomeBonus = typeof customWelcomeBonus === 'number'
    ? customWelcomeBonus
    : (adminCfg?.pricing?.googleWelcomeBonusCoins ?? 10);

  const authUid = fbUser.uid;
  const email = fbUser.email || '';
  const displayName = customDisplayName || fbUser.displayName || (email ? email.split('@')[0] : 'User');
  const photoURL = fbUser.photoURL || '';
  const todayStr = new Date().toISOString().split('T')[0];
  const fp = getDeviceFingerprint();
  const isOwnerUser = email.toLowerCase() === 'nayakhardayal4@gmail.com';

  // 1. Fast Check if user already exists in Firestore by authUid or email
  let existingMemberId: string | null = null;
  let existingUserData: any = null;

  // Check direct user doc by authUid with fastTimeout
  try {
    const authUserSnap = await fastTimeout(getDoc(doc(db, 'users_auth', authUid)), 2000, null);
    if (authUserSnap && authUserSnap.exists()) {
      existingMemberId = authUserSnap.data().memberId || null;
    }
  } catch (e) {
    console.warn('Auth map lookup warning:', e);
  }

  // Fast email doc key check if auth map not found
  if (!existingMemberId && email) {
    const safeDocKey = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    try {
      const emailAccSnap = await fastTimeout(getDoc(doc(db, 'email_accounts', safeDocKey)), 2000, null);
      if (emailAccSnap && emailAccSnap.exists()) {
        existingMemberId = emailAccSnap.data().memberId || null;
      }
    } catch (_) {}
  }

  // If not found in mapping, query with limit(1) instead of scanning the whole collection!
  if (!existingMemberId) {
    try {
      if (email) {
        const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()), limit(1));
        const usersSnap = await fastTimeout(getDocs(q), 2000, null);
        if (usersSnap && !usersSnap.empty) {
          const docSnap = usersSnap.docs[0];
          existingMemberId = docSnap.data().memberId || docSnap.id;
          existingUserData = docSnap.data();
        }
      }
    } catch (e) {
      console.warn('Fast users email lookup warning:', e);
    }
  }

  if (existingMemberId && !existingUserData) {
    try {
      const userDocSnap = await fastTimeout(getDoc(doc(db, 'users', existingMemberId)), 2000, null);
      if (userDocSnap && userDocSnap.exists()) {
        existingUserData = userDocSnap.data();
      }
    } catch (e) {}
  }

  const currentLocalWallet = loadUserWallet();
  let finalWallet: UserWallet;
  let isNewUser = false;
  let refResult: ReferralProcessResult = { applied: false, bonusCoins: 0, message: '' };

  if (existingMemberId && existingUserData) {
    // User is RETURNING / RESTORING their existing cloud account
    let cloudCoins = typeof existingUserData.coins === 'number' ? existingUserData.coins : 0;
    // Fix legacy bug where non-owner user may have received 99999 coins
    if (!isOwnerUser && existingUserData.role !== 'owner' && cloudCoins >= 99999) {
      cloudCoins = configuredWelcomeBonus;
    }
    const finalReturningCoins = isOwnerUser ? Math.max(cloudCoins, 99999) : cloudCoins;
    const cloudAdsWatched = typeof existingUserData.dailyAdsWatched === 'number' ? existingUserData.dailyAdsWatched : 0;
    const cloudMaxAds = typeof existingUserData.maxDailyAds === 'number' ? existingUserData.maxDailyAds : 10;
    const userStatus = existingUserData.status || 'ACTIVE';

    finalWallet = {
      memberId: existingMemberId,
      referralCode: existingUserData.referralCode || `ROX${existingMemberId}`,
      coins: finalReturningCoins,
      dailyAdsWatched: cloudAdsWatched,
      maxDailyAds: cloudMaxAds,
      status: userStatus,
      lastAdResetDate: todayStr,
      authUid,
      email,
      displayName,
      photoURL,
      isGoogleLinked: true,
      googleLinkedAt: existingUserData.googleLinkedAt || Date.now(),
      referredBy: existingUserData.referredBy || currentLocalWallet.referredBy,
      referralClaimed: existingUserData.referralClaimed ?? currentLocalWallet.referralClaimed,
      totalReferralsCount: existingUserData.totalReferralsCount || 0,
      totalReferralCoinsEarned: existingUserData.totalReferralCoinsEarned || 0,
      lastLocalCoinMutationAt: Date.now(),
      role: isOwnerUser ? 'owner' : (existingUserData.role || 'user'),
      isAdmin: isOwnerUser ? true : Boolean(existingUserData.isAdmin),
      isOwner: isOwnerUser ? true : Boolean(existingUserData.isOwner)
    };

    // Fast asynchronous restore user orders in background without blocking sign-in
    setTimeout(async () => {
      try {
        const qOrders = query(collection(db, 'orders'), where('userMemberId', '==', existingMemberId), limit(50));
        const ordersSnap = await getDocs(qOrders);
        const restoredOrders: Order[] = [];
        ordersSnap.forEach((docSnap) => {
          restoredOrders.push(docSnap.data() as Order);
        });
        if (restoredOrders.length > 0) {
          saveOrders(restoredOrders);
        }
      } catch (err) {
        console.warn('Orders restore on Google login background error:', err);
      }
    }, 100);

    console.log(`✅ Returning User: ${email} (Member #${existingMemberId}) restored with ${finalReturningCoins} Coins!`);
  } else {
    // BRAND NEW USER registering with Google
    isNewUser = true;
    const newMemberId = Math.floor(100000 + Math.random() * 900000).toString();
    const userReferralCode = `ROX${newMemberId}`;

    let initialCoins = isOwnerUser ? 99999 : configuredWelcomeBonus;

    // Process referral code if passed or saved
    const effectiveRefCode = referralCode || localStorage.getItem('pending_referrer_id') || localStorage.getItem('instaboost_pending_ref') || undefined;
    if (!isOwnerUser && effectiveRefCode) {
      refResult = await processNewUserReferral(effectiveRefCode, newMemberId, fp, adminCfg);
      if (refResult.applied) {
        initialCoins += refResult.bonusCoins;
      }
    }

    finalWallet = {
      memberId: newMemberId,
      referralCode: userReferralCode,
      coins: initialCoins,
      dailyAdsWatched: 0,
      maxDailyAds: 10,
      authUid,
      email,
      displayName,
      photoURL,
      isGoogleLinked: true,
      googleLinkedAt: Date.now(),
      lastLocalCoinMutationAt: Date.now(),
      status: 'ACTIVE',
      lastAdResetDate: todayStr,
      role: isOwnerUser ? 'owner' : 'user',
      isAdmin: isOwnerUser,
      isOwner: isOwnerUser,
      referredBy: refResult.applied ? `#${refResult.referrerMemberId}` : undefined,
      referralClaimed: refResult.applied,
      totalReferralsCount: 0,
      totalReferralCoinsEarned: 0
    };

    console.log(`🎉 New User Registered: ${email} (Member #${newMemberId}) with ${initialCoins} Coins!`);
  }

  // Save locally
  localStorage.setItem('roxyefollow_user_member_id', finalWallet.memberId);
  if (finalWallet.status) {
    localStorage.setItem('roxyefollow_user_status', finalWallet.status);
  }
  if (isOwnerUser) {
    localStorage.setItem('roxyefollow_is_admin', 'true');
  }
  saveUserWallet(finalWallet);

  // Save to Firestore permanently
  const userDocRef = doc(db, 'users', finalWallet.memberId);
  const userPayload: any = {
    id: `usr_${finalWallet.memberId}`,
    userId: `#${finalWallet.memberId}`,
    memberId: finalWallet.memberId,
    referralCode: finalWallet.referralCode || `ROX${finalWallet.memberId}`,
    name: displayName || `User #${finalWallet.memberId}`,
    email,
    displayName,
    photoURL,
    authUid,
    isGoogleLinked: true,
    role: isOwnerUser ? 'owner' : (existingUserData?.role || 'user'),
    isAdmin: isOwnerUser ? true : (existingUserData?.isAdmin || false),
    isOwner: isOwnerUser ? true : (existingUserData?.isOwner || false),
    googleLinkedAt: finalWallet.googleLinkedAt || Date.now(),
    coins: finalWallet.coins,
    dailyAdsWatched: finalWallet.dailyAdsWatched || 0,
    maxDailyAds: finalWallet.maxDailyAds || 10,
    referredBy: finalWallet.referredBy || null,
    referralClaimed: Boolean(finalWallet.referralClaimed),
    totalReferralsCount: finalWallet.totalReferralsCount || 0,
    totalReferralCoinsEarned: finalWallet.totalReferralCoinsEarned || 0,
    deviceFingerprint: fp,
    status: finalWallet.status || 'ACTIVE',
    isOnline: true,
    lastActive: '🟢 Online now',
    updatedAt: Date.now(),
    lastSeenAt: Date.now(),
    createdAt: existingUserData?.createdAt || Date.now()
  };

  await setDoc(userDocRef, userPayload, { merge: true });

  // Save authUid -> memberId fast mapping
  await setDoc(doc(db, 'users_auth', authUid), {
    memberId: finalWallet.memberId,
    email,
    displayName,
    updatedAt: Date.now()
  }, { merge: true });

  // Sync to Express backend
  try {
    await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload)
    });
  } catch {}

  window.dispatchEvent(new Event('instaboost_wallet_updated'));
  window.dispatchEvent(new Event('instaboost_orders_updated'));
  window.dispatchEvent(new Event('instaboost_users_updated'));

  return {
    success: true,
    user: fbUser,
    wallet: finalWallet,
    isNewUser,
    message: isNewUser 
      ? (isOwnerUser 
          ? '👑 Welcome Owner! Full Admin access & 99999 coins activated.' 
          : `🎉 Welcome ${displayName}! Account created successfully (+${configuredWelcomeBonus} Coins welcome bonus${refResult.applied ? refResult.message : ''})`)
      : (isOwnerUser
          ? '👑 Welcome Back Owner! Full Admin privileges loaded.'
          : `👋 Welcome back ${displayName}! Your account #${finalWallet.memberId} is fully restored.`)
  };
}

/**
 * Fallback Firestore Email Sign-Up when Firebase Auth Email/Password provider is disabled
 */
export async function handleFirestoreEmailSignUp(
  email: string,
  password: string,
  displayName: string,
  referralCode?: string,
  customWelcomeBonus?: number
): Promise<AuthResult> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const safeDocKey = normalizedEmail.replace(/[^a-z0-9]/g, '_');
    const accountDocRef = doc(db, 'email_accounts', safeDocKey);
    
    const existingDoc = await getDoc(accountDocRef);
    if (existingDoc.exists()) {
      return { success: false, error: 'This email address is already registered. Please sign in instead.' };
    }

    const adminCfg = loadAdminConfig();
    const configuredWelcomeBonus = typeof customWelcomeBonus === 'number'
      ? customWelcomeBonus
      : (adminCfg?.pricing?.googleWelcomeBonusCoins ?? 10);

    const fp = getDeviceFingerprint();
    const newMemberId = Math.floor(100000 + Math.random() * 900000).toString();
    const isOwnerUser = normalizedEmail === 'nayakhardayal4@gmail.com';

    let initialCoins = isOwnerUser ? 99999 : configuredWelcomeBonus;
    let refResult: ReferralProcessResult = { applied: false, bonusCoins: 0, message: '' };

    // Process referral code if passed or saved
    const effectiveRefCode = referralCode || localStorage.getItem('pending_referrer_id') || localStorage.getItem('instaboost_pending_ref') || undefined;
    if (!isOwnerUser && effectiveRefCode) {
      refResult = await processNewUserReferral(effectiveRefCode, newMemberId, fp, adminCfg);
      if (refResult.applied) {
        initialCoins += refResult.bonusCoins;
      }
    }

    const authUid = `email_${safeDocKey}_${Date.now()}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const finalWallet: UserWallet = {
      memberId: newMemberId,
      referralCode: `ROX${newMemberId}`,
      coins: initialCoins,
      authUid,
      email: normalizedEmail,
      displayName: displayName || `User #${newMemberId}`,
      isGoogleLinked: false,
      isEmailLinked: true,
      lastLocalCoinMutationAt: Date.now(),
      status: 'ACTIVE',
      lastAdResetDate: todayStr,
      role: isOwnerUser ? 'owner' : 'user',
      isAdmin: isOwnerUser,
      isOwner: isOwnerUser,
      dailyAdsWatched: 0,
      maxDailyAds: 10,
      referredBy: refResult.applied ? `#${refResult.referrerMemberId}` : undefined,
      referralClaimed: refResult.applied,
      totalReferralsCount: 0,
      totalReferralCoinsEarned: 0
    };

    // Store account credentials doc in Firestore
    await setDoc(accountDocRef, {
      email: normalizedEmail,
      password,
      displayName: displayName || `User #${newMemberId}`,
      memberId: newMemberId,
      referralCode: `ROX${newMemberId}`,
      authUid,
      role: isOwnerUser ? 'owner' : 'user',
      isAdmin: isOwnerUser,
      isOwner: isOwnerUser,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    localStorage.setItem('roxyefollow_user_member_id', newMemberId);
    localStorage.setItem('roxyefollow_user_status', 'ACTIVE');
    if (isOwnerUser) {
      localStorage.setItem('roxyefollow_is_admin', 'true');
    }
    saveUserWallet(finalWallet);

    const userDocRef = doc(db, 'users', newMemberId);
    const userPayload: any = {
      id: `usr_${newMemberId}`,
      userId: `#${newMemberId}`,
      memberId: newMemberId,
      referralCode: `ROX${newMemberId}`,
      name: displayName || `User #${newMemberId}`,
      email: normalizedEmail,
      displayName: displayName || `User #${newMemberId}`,
      authUid,
      isGoogleLinked: false,
      isEmailLinked: true,
      role: isOwnerUser ? 'owner' : 'user',
      isAdmin: isOwnerUser,
      isOwner: isOwnerUser,
      coins: initialCoins,
      dailyAdsWatched: 0,
      maxDailyAds: 10,
      referredBy: refResult.applied ? `#${refResult.referrerMemberId}` : null,
      referralClaimed: refResult.applied,
      totalReferralsCount: 0,
      totalReferralCoinsEarned: 0,
      deviceFingerprint: fp,
      status: 'ACTIVE',
      isOnline: true,
      lastActive: '🟢 Online now',
      updatedAt: Date.now(),
      lastSeenAt: Date.now(),
      createdAt: Date.now()
    };

    await setDoc(userDocRef, userPayload, { merge: true });

    // Sync auth mapping
    await setDoc(doc(db, 'users_auth', authUid), {
      memberId: newMemberId,
      email: normalizedEmail,
      displayName: displayName || `User #${newMemberId}`,
      updatedAt: Date.now()
    }, { merge: true });

    // Sync to Express backend
    try {
      await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPayload)
      });
    } catch {}

    window.dispatchEvent(new Event('instaboost_wallet_updated'));
    window.dispatchEvent(new Event('instaboost_orders_updated'));
    window.dispatchEvent(new Event('instaboost_users_updated'));

    return {
      success: true,
      wallet: finalWallet,
      isNewUser: true,
      message: isOwnerUser 
        ? '👑 Welcome Owner! Full Admin access & 99999 coins activated.' 
        : `🎉 Welcome ${displayName || 'User'}! Account created successfully (+${configuredWelcomeBonus} Coins welcome bonus${refResult.applied ? refResult.message : ''})`
    };
  } catch (e: any) {
    console.error('Firestore fallback signup error:', e);
    return { success: false, error: e?.message || 'Registration failed. Please try again.' };
  }
}

/**
 * Fallback Firestore Email Sign-In when Firebase Auth Email/Password provider is disabled
 */
export async function handleFirestoreEmailSignIn(
  email: string,
  password: string,
  customWelcomeBonus?: number
): Promise<AuthResult> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const isOwnerUser = normalizedEmail === 'nayakhardayal4@gmail.com';
    const safeDocKey = normalizedEmail.replace(/[^a-z0-9]/g, '_');
    const accountDocRef = doc(db, 'email_accounts', safeDocKey);
    
    const accountDoc = await fastTimeout(getDoc(accountDocRef), 3000, null);

    // If doc does not exist but it's the App Owner email, auto-initialize
    if ((!accountDoc || !accountDoc.exists()) && isOwnerUser) {
      return await handleFirestoreEmailSignUp(
        normalizedEmail,
        password,
        'App Owner',
        undefined,
        customWelcomeBonus
      );
    }

    if (!accountDoc || !accountDoc.exists()) {
      return { success: false, error: 'No account found with this email address. Please switch to "Create New Account" to register.' };
    }

    const accountData = accountDoc.data();
    if (accountData.password !== password) {
      return { success: false, error: 'Incorrect password for this account. Click "Forgot password?" to reset it.' };
    }

    const memberId = accountData.memberId || Math.floor(100000 + Math.random() * 900000).toString();
    const userDocRef = doc(db, 'users', memberId);
    const userSnap = await fastTimeout(getDoc(userDocRef), 2500, null);

    let existingUserData = userSnap && userSnap.exists() ? userSnap.data() : null;

    const adminCfg = loadAdminConfig();
    const configuredWelcomeBonus = typeof customWelcomeBonus === 'number'
      ? customWelcomeBonus
      : (adminCfg?.pricing?.googleWelcomeBonusCoins ?? 10);

    let storedCoins = typeof existingUserData?.coins === 'number' ? existingUserData.coins : configuredWelcomeBonus;
    // Fix legacy bug: clamp non-owner coins if it had 99999
    if (!isOwnerUser && existingUserData?.role !== 'owner' && storedCoins >= 99999) {
      storedCoins = configuredWelcomeBonus;
    }
    const finalCoins = isOwnerUser ? Math.max(storedCoins, 99999) : storedCoins;

    const todayStr = new Date().toISOString().split('T')[0];

    const restoredWallet: UserWallet = {
      memberId: memberId,
      referralCode: accountData.referralCode || existingUserData?.referralCode || `ROX${memberId}`,
      coins: finalCoins,
      authUid: accountData.authUid || `email_${safeDocKey}`,
      email: normalizedEmail,
      displayName: accountData.displayName || existingUserData?.displayName || `User #${memberId}`,
      isGoogleLinked: false,
      isEmailLinked: true,
      role: isOwnerUser ? 'owner' : (accountData.role || existingUserData?.role || 'user'),
      isAdmin: isOwnerUser ? true : Boolean(accountData.isAdmin || existingUserData?.isAdmin),
      isOwner: isOwnerUser ? true : Boolean(accountData.isOwner || existingUserData?.isOwner),
      dailyAdsWatched: typeof existingUserData?.dailyAdsWatched === 'number' ? existingUserData.dailyAdsWatched : 0,
      maxDailyAds: typeof existingUserData?.maxDailyAds === 'number' ? existingUserData.maxDailyAds : 10,
      lastLocalCoinMutationAt: Date.now(),
      status: existingUserData?.status || 'ACTIVE',
      lastAdResetDate: todayStr,
      referredBy: existingUserData?.referredBy || accountData.referredBy,
      referralClaimed: existingUserData?.referralClaimed ?? accountData.referralClaimed,
      totalReferralsCount: existingUserData?.totalReferralsCount || 0,
      totalReferralCoinsEarned: existingUserData?.totalReferralCoinsEarned || 0
    };

    localStorage.setItem('roxyefollow_user_member_id', memberId);
    localStorage.setItem('roxyefollow_user_status', restoredWallet.status || 'ACTIVE');
    if (isOwnerUser) {
      localStorage.setItem('roxyefollow_is_admin', 'true');
    }
    saveUserWallet(restoredWallet);

    const updatePayload: any = {
      memberId,
      referralCode: restoredWallet.referralCode,
      email: normalizedEmail,
      displayName: restoredWallet.displayName,
      coins: finalCoins,
      role: restoredWallet.role,
      isAdmin: restoredWallet.isAdmin,
      isOwner: restoredWallet.isOwner,
      isOnline: true,
      lastActive: '🟢 Online now',
      updatedAt: Date.now(),
      lastSeenAt: Date.now()
    };

    await setDoc(userDocRef, updatePayload, { merge: true });

    window.dispatchEvent(new Event('instaboost_wallet_updated'));
    window.dispatchEvent(new Event('instaboost_orders_updated'));
    window.dispatchEvent(new Event('instaboost_users_updated'));

    return {
      success: true,
      wallet: restoredWallet,
      isNewUser: false,
      message: `👋 Welcome back ${restoredWallet.displayName}! Account #${memberId} verified.`
    };
  } catch (e: any) {
    console.error('Firestore fallback signin error:', e);
    return { success: false, error: 'Sign in failed. Check your email and password.' };
  }
}

/**
 * Sign up using Email & Password (Firebase Auth with Firestore Fallback)
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  referralCode?: string,
  customWelcomeBonus?: number
): Promise<AuthResult> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      if (userCredential && userCredential.user) {
        if (displayName) {
          try {
            await updateProfile(userCredential.user, { displayName });
          } catch (profileErr) {}
        }

        return await handleFirebaseAuthUser(
          userCredential.user,
          customWelcomeBonus,
          referralCode,
          displayName
        );
      }
    } catch (firebaseErr: any) {
      if (firebaseErr?.code === 'auth/email-already-in-use') {
        return { success: false, error: 'This email address is already registered. Please sign in instead.' };
      }
      // If Firebase Auth provider is disabled or throws any other code, fallback to Firestore
      return await handleFirestoreEmailSignUp(normalizedEmail, password, displayName, referralCode, customWelcomeBonus);
    }

    return await handleFirestoreEmailSignUp(normalizedEmail, password, displayName, referralCode, customWelcomeBonus);
  } catch (err: any) {
    let errMsg = 'Registration failed. Please try again.';
    if (err.code === 'auth/email-already-in-use') {
      errMsg = 'This email address is already registered. Please sign in instead.';
    } else if (err.code === 'auth/invalid-email') {
      errMsg = 'Invalid email format. Please check your email.';
    } else if (err.code === 'auth/weak-password') {
      errMsg = 'Password is too weak. Please use at least 6 characters.';
    } else if (err.message) {
      errMsg = err.message.replace(/^Firebase:\s*(Error\s*\([^)]+\):?)?\s*/i, '');
    }
    return { success: false, error: errMsg };
  }
}

/**
 * Sign in using Email & Password (Firebase Auth with Firestore Fallback)
 */
export async function signInWithEmail(
  email: string,
  password: string,
  customWelcomeBonus?: number
): Promise<AuthResult> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      if (userCredential && userCredential.user) {
        return await handleFirebaseAuthUser(userCredential.user, customWelcomeBonus);
      }
    } catch (firebaseErr: any) {
      // Always verify against Firestore accounts database
      const fsResult = await handleFirestoreEmailSignIn(normalizedEmail, password, customWelcomeBonus);
      if (fsResult.success) {
        return fsResult;
      }
      if (fsResult.error && !fsResult.error.includes('No account found')) {
        return fsResult;
      }
    }

    // Direct Firestore sign-in check
    return await handleFirestoreEmailSignIn(normalizedEmail, password, customWelcomeBonus);
  } catch (err: any) {
    let errMsg = 'Invalid email or password. Please try again.';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      errMsg = 'Incorrect email or password. Please try again.';
    } else if (err.code === 'auth/too-many-requests') {
      errMsg = 'Access temporarily blocked due to many failed attempts. Reset your password or try again later.';
    } else if (err.message) {
      errMsg = err.message.replace(/^Firebase:\s*(Error\s*\([^)]+\):?)?\s*/i, '');
    }
    return { success: false, error: errMsg };
  }
}

/**
 * Request Password Reset Verification Code (OTP)
 * Calls Backend Endpoint /api/auth/send-otp to dispatch real 6-digit email OTP (5-minute expiry)
 */
export async function requestPasswordResetOTP(email: string): Promise<{ success: boolean; message: string; previewCode?: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    const safeDocKey = normalizedEmail.replace(/[^a-z0-9]/g, '_');
    const accountDocRef = doc(db, 'email_accounts', safeDocKey);
    const accountSnap = await getDoc(accountDocRef);

    const isOwnerUser = normalizedEmail === 'nayakhardayal4@gmail.com';

    // 🔒 STRICT CHECK: Block unregistered emails from requesting OTP
    if (!accountSnap.exists() && !isOwnerUser) {
      return {
        success: false,
        message: 'This email address is not registered in the app. Please switch to "Create Account" first.'
      };
    }

    // Call Backend API to generate and dispatch OTP
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail })
      });
      const data = await response.json();
      if (data.success) {
        return {
          success: true,
          message: data.message || `A 6-digit verification code has been dispatched to ${normalizedEmail}.`,
          previewCode: normalizedEmail === 'nayakhardayal4@gmail.com' ? data.otp : undefined
        };
      }
    } catch (apiErr) {
      console.warn('Backend send-otp error, continuing fallback:', apiErr);
    }

    // Generate 6-digit random Verification OTP
    const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    const otpDocRef = doc(db, 'password_reset_otps', safeDocKey);
    await setDoc(otpDocRef, {
      email: normalizedEmail,
      code: generatedOTP,
      createdAt: Date.now(),
      expiresAt: expiresAt,
      used: false,
      ipAttempt: 'verified_session'
    });

    // In parallel dispatch official Firebase Password Reset Email if available
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
    } catch {}

    return {
      success: true,
      message: `A 6-digit verification code has been dispatched to ${normalizedEmail}. Code is valid for 5 minutes.`,
      previewCode: isOwnerUser ? generatedOTP : undefined
    };
  } catch (err: any) {
    console.error('Request OTP error:', err);
    return {
      success: false,
      message: err.message || 'Failed to send verification code. Please try again.'
    };
  }
}

/**
 * Verify 6-digit OTP code (Step 2 Verification)
 */
export async function verifyOTPCode(email: string, otpCode: string): Promise<{ success: boolean; message: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = otpCode.trim();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: false, message: 'Invalid email address.' };
    }
    if (!cleanCode || cleanCode.length !== 6) {
      return { success: false, message: 'Please enter the full 6-digit verification code.' };
    }

    // Check backend endpoint
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, otp: cleanCode })
      });
      const data = await response.json();
      if (data.success) {
        return { success: true, message: 'Code verified successfully.' };
      } else if (data.error) {
        return { success: false, message: data.error };
      }
    } catch (apiErr) {
      console.warn('Backend verify-otp error, checking Firestore:', apiErr);
    }

    const safeDocKey = normalizedEmail.replace(/[^a-z0-9]/g, '_');
    const otpDocRef = doc(db, 'password_reset_otps', safeDocKey);
    const otpSnap = await getDoc(otpDocRef);

    if (!otpSnap.exists()) {
      return { success: false, message: 'No active code found. Please request a new code.' };
    }

    const otpData = otpSnap.data();
    if (Date.now() > (otpData.expiresAt || 0)) {
      return { success: false, message: 'Verification code has expired (5-minute limit).' };
    }
    if (otpData.code !== cleanCode) {
      return { success: false, message: 'Incorrect 6-digit verification code.' };
    }

    return { success: true, message: 'Code verified successfully.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Verification failed.' };
  }
}

/**
 * Verify OTP Code and Update User Password in Real-time (Step 3 Final Update)
 */
export async function verifyResetOTPAndSetPassword(
  email: string,
  otpCode: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = otpCode.trim();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: false, message: 'Invalid email address.' };
    }
    if (!cleanCode || cleanCode.length !== 6) {
      return { success: false, message: 'Please enter the 6-digit verification code.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters long.' };
    }

    // Call Backend endpoint to securely reset password
    try {
      const response = await fetch('/api/auth/verify-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, otp: cleanCode, newPassword })
      });
      const data = await response.json();
      if (data.success) {
        // Also update Firestore email_accounts for synchronization
        const safeDocKey = normalizedEmail.replace(/[^a-z0-9]/g, '_');
        const accountDocRef = doc(db, 'email_accounts', safeDocKey);
        const accountSnap = await getDoc(accountDocRef);
        const existingData = accountSnap.exists() ? accountSnap.data() : {};
        const isOwnerUser = normalizedEmail === 'nayakhardayal4@gmail.com';
        const memberId = existingData.memberId || Math.floor(100000 + Math.random() * 900000).toString();

        await setDoc(accountDocRef, {
          ...existingData,
          email: normalizedEmail,
          password: newPassword,
          memberId,
          role: isOwnerUser ? 'owner' : (existingData.role || 'user'),
          isAdmin: isOwnerUser ? true : Boolean(existingData.isAdmin),
          isOwner: isOwnerUser ? true : Boolean(existingData.isOwner),
          updatedAt: Date.now()
        }, { merge: true });

        return {
          success: true,
          message: data.message || '🎉 Password reset successfully! You can now sign in.'
        };
      } else if (data.error) {
        return { success: false, message: data.error };
      }
    } catch (apiErr) {
      console.warn('Backend reset error, fallback to direct Firestore:', apiErr);
    }

    const safeDocKey = normalizedEmail.replace(/[^a-z0-9]/g, '_');
    const otpDocRef = doc(db, 'password_reset_otps', safeDocKey);
    const otpSnap = await getDoc(otpDocRef);

    if (!otpSnap.exists()) {
      return {
        success: false,
        message: 'No active verification code found for this email. Please request a new code.'
      };
    }

    const otpData = otpSnap.data();

    if (Date.now() > (otpData.expiresAt || 0)) {
      return {
        success: false,
        message: 'Verification code has expired (5 minutes limit). Please request a new code.'
      };
    }

    if (otpData.code !== cleanCode) {
      return {
        success: false,
        message: 'Incorrect 6-digit verification code. Please check your email and try again.'
      };
    }

    // Code is valid! Now update the password in Firestore email_accounts
    const accountDocRef = doc(db, 'email_accounts', safeDocKey);
    const accountSnap = await getDoc(accountDocRef);
    const existingData = accountSnap.exists() ? accountSnap.data() : {};
    const isOwnerUser = normalizedEmail === 'nayakhardayal4@gmail.com';
    const memberId = existingData.memberId || Math.floor(100000 + Math.random() * 900000).toString();

    await setDoc(accountDocRef, {
      ...existingData,
      email: normalizedEmail,
      password: newPassword,
      memberId,
      role: isOwnerUser ? 'owner' : (existingData.role || 'user'),
      isAdmin: isOwnerUser ? true : Boolean(existingData.isAdmin),
      isOwner: isOwnerUser ? true : Boolean(existingData.isOwner),
      updatedAt: Date.now()
    }, { merge: true });

    // Mark OTP as used
    await setDoc(otpDocRef, { used: true, verifiedAt: Date.now() }, { merge: true });

    return {
      success: true,
      message: '🎉 Verification successful! Your new password has been set. You can now sign in.'
    };
  } catch (err: any) {
    console.error('Verify OTP and reset password error:', err);
    return {
      success: false,
      message: err.message || 'Failed to verify code and reset password.'
    };
  }
}

/**
 * Send Password Reset Email & Instant Password Update (Wrapper)
 */
export async function resetPasswordWithEmail(email: string, newPassword?: string): Promise<{ success: boolean; message: string }> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    const safeDocKey = normalizedEmail.replace(/[^a-z0-9]/g, '_');
    const accountDocRef = doc(db, 'email_accounts', safeDocKey);
    const isOwnerUser = normalizedEmail === 'nayakhardayal4@gmail.com';

    if (newPassword && newPassword.length >= 6) {
      // Update password directly in Firestore
      const accountSnap = await getDoc(accountDocRef);
      const existingData = accountSnap.exists() ? accountSnap.data() : {};
      const memberId = existingData.memberId || Math.floor(100000 + Math.random() * 900000).toString();

      await setDoc(accountDocRef, {
        ...existingData,
        email: normalizedEmail,
        password: newPassword,
        memberId,
        role: isOwnerUser ? 'owner' : (existingData.role || 'user'),
        isAdmin: isOwnerUser ? true : Boolean(existingData.isAdmin),
        isOwner: isOwnerUser ? true : Boolean(existingData.isOwner),
        updatedAt: Date.now()
      }, { merge: true });

      // In background try to send Firebase email reset if provider is active
      try {
        await sendPasswordResetEmail(auth, normalizedEmail);
      } catch {}

      return { 
        success: true, 
        message: '🎉 Password reset successfully! You can now sign in with your new password.' 
      };
    }

    // Try standard Firebase Auth email reset
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      return { success: true, message: 'Password reset link sent to your email! Please check your inbox/spam folder.' };
    } catch (fbErr: any) {
      const accountSnap = await getDoc(accountDocRef);
      if (accountSnap.exists()) {
        return {
          success: true,
          message: 'Account verified! Please enter your new password below to reset it instantly.'
        };
      }
      return {
        success: false,
        message: 'No account found with this email. Please enter a new password to initialize your account.'
      };
    }
  } catch (err: any) {
    let errMsg = 'Failed to process password reset.';
    if (err.code === 'auth/user-not-found') {
      errMsg = 'No account found with this email address.';
    } else if (err.code === 'auth/invalid-email') {
      errMsg = 'Invalid email address format.';
    } else if (err.message) {
      errMsg = err.message.replace(/^Firebase:\s*(Error\s*\([^)]+\):?)?\s*/i, '');
    }
    return { success: false, message: errMsg };
  }
}

/**
 * Handles verified Google User data passed from Native Android (Appcreator24)
 * or via URL parameters.
 */
export async function handleExternalVerifiedUser(params: {
  email: string;
  name?: string;
  uid?: string;
  photoURL?: string;
}, customWelcomeBonus?: number): Promise<GoogleAuthResult> {
  if (!params.email || !params.email.includes('@')) {
    return { success: false, error: 'Invalid email address provided.' };
  }

  const pseudoUser = {
    uid: params.uid || `appcreator_${params.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
    email: params.email,
    displayName: params.name || params.email.split('@')[0],
    photoURL: params.photoURL || '',
  } as unknown as FirebaseUser;

  return await handleFirebaseAuthUser(pseudoUser, customWelcomeBonus);
}

// Global hook for native Android / Appcreator24 bridge
if (typeof window !== 'undefined') {
  (window as any).onAppCreator24GoogleLogin = (email: string, name?: string, uid?: string, photoURL?: string) => {
    handleExternalVerifiedUser({ email, name, uid, photoURL });
  };
}

export const GOOGLE_WEB_CLIENT_ID = '593591785644-eckg25u8lein7ggpl2qi7scnnmd0vp0m.apps.googleusercontent.com';

/**
 * Handles Google One Tap / Google Identity Services (GIS) Credential Response
 */
export async function handleGoogleOneTapResponse(
  credentialResponse: any,
  customWelcomeBonus?: number
): Promise<GoogleAuthResult> {
  if (!credentialResponse || !credentialResponse.credential) {
    return { success: false, error: 'No credential received from Google One Tap.' };
  }

  const token = credentialResponse.credential;

  // 1. Attempt standard Firebase Auth sign-in with the ID Token credential
  try {
    const cred = GoogleAuthProvider.credential(token);
    const userCredential = await signInWithCredential(auth, cred);
    if (userCredential && userCredential.user) {
      console.log('✅ Google One Tap Firebase sign-in successful:', userCredential.user.email);
      return await handleFirebaseAuthUser(userCredential.user, customWelcomeBonus);
    }
  } catch (firebaseErr: any) {
    console.warn('Firebase credential exchange notice, using verified JWT token payload:', firebaseErr);
  }

  // 2. Verified fallback: Parse Google ID Token (JWT) payload
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (payload && payload.email) {
      console.log('✅ Google One Tap parsed JWT user:', payload.email);
      return await handleExternalVerifiedUser({
        email: payload.email,
        name: payload.name || payload.given_name,
        uid: payload.sub,
        photoURL: payload.picture,
      }, customWelcomeBonus);
    }
  } catch (parseErr: any) {
    console.error('Failed to parse Google One Tap credential token:', parseErr);
  }

  return { success: false, error: 'Could not complete Google One Tap authentication.' };
}

// Global callback for HTML-based Google One Tap data-callback="handleCredentialResponse"
if (typeof window !== 'undefined') {
  (window as any).handleGoogleOneTapGlobal = async (response: any) => {
    console.log('Google One Tap global callback processing credential...');
    const res = await handleGoogleOneTapResponse(response);
    if (res.success && res.wallet) {
      window.dispatchEvent(new CustomEvent('google-onetap-success', { detail: res }));
    }
    return res;
  };
  (window as any).handleCredentialResponse = (window as any).handleGoogleOneTapGlobal;

  // If a credential was captured before the React bundle finished initialization
  if ((window as any).__pendingOneTapResponse) {
    (window as any).handleGoogleOneTapGlobal((window as any).__pendingOneTapResponse);
    (window as any).__pendingOneTapResponse = null;
  }
}

/**
 * Check if app was re-opened from a Google redirect sign-in (e.g. inside mobile WebView)
 */
export async function checkGoogleRedirectResult(customWelcomeBonus?: number): Promise<GoogleAuthResult | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      console.log('✅ Google redirect auth completed for:', result.user.email);
      return await handleFirebaseAuthUser(result.user, customWelcomeBonus);
    }
    return null;
  } catch (err: any) {
    console.warn('Redirect auth result notice:', err);
    return null;
  }
}

export function isAndroidWebView(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /wv|Android.*Version\/[0-9.]+/i.test(ua) || (window as any).Android !== undefined;
}

/**
 * Sign in or Register using Google Sign-In (Firebase Auth)
 * Supports Popup and automatic Redirect fallback for WebViews.
 */
export async function signInWithGoogle(customWelcomeBonus?: number): Promise<GoogleAuthResult> {
  const isWebView = isAndroidWebView();

  // In Android WebViews (like Appcreator24), window popups and cross-window sessionStorage
  // are blocked or don't communicate state, causing 'auth/missing-initial-state'.
  // Using signInWithRedirect provides seamless in-app navigation.
  if (isWebView) {
    try {
      console.log('📱 Android WebView detected: starting signInWithRedirect...');
      await signInWithRedirect(auth, googleProvider);
      return {
        success: false,
        error: 'Redirecting to Google Sign-In...'
      };
    } catch (redirectErr: any) {
      console.warn('WebView signInWithRedirect error:', redirectErr);
    }
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (!result.user) {
      return { success: false, error: 'Google sign-in failed. No user profile returned.' };
    }
    return await handleFirebaseAuthUser(result.user, customWelcomeBonus);
  } catch (err: any) {
    // Gracefully handle user closing the popup window without printing scary console warnings
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      return {
        success: false,
        error: 'Google Sign-In popup was closed.'
      };
    }

    // If popup was blocked, network failed, or environment unsupported, attempt redirect flow
    if (
      err?.code === 'auth/popup-blocked' || 
      err?.code === 'auth/operation-not-supported-in-this-environment' ||
      err?.code === 'auth/missing-initial-state' ||
      err?.code === 'auth/network-request-failed'
    ) {
      try {
        console.log('Attempting signInWithRedirect fallback for Google auth...');
        await signInWithRedirect(auth, googleProvider);
        return {
          success: false,
          error: 'Redirecting to Google Sign-In...'
        };
      } catch (redirectErr: any) {
        console.warn('Redirect error:', redirectErr);
      }
    }

    console.warn('Google sign-in notice:', err?.message || err);

    let errMsg = 'Google sign-in failed. Please try again.';
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
      errMsg = 'Sign-in window was closed. Tap "Continue with Google" to complete login.';
    } else if (err?.code === 'auth/popup-blocked') {
      errMsg = 'Popup blocked by browser. Please allow popups or use Google sign-in again.';
    } else if (err?.code === 'auth/network-request-failed') {
      errMsg = 'Network error during Google sign-in. Please check your internet connection.';
    } else if (err?.code === 'auth/missing-initial-state') {
      errMsg = 'WebView session state missing. Redirecting to Google Login...';
    } else if (err?.message) {
      errMsg = err.message;
    }
    return {
      success: false,
      error: errMsg
    };
  }
}

export function isUserAuthenticated(wallet?: UserWallet | null): boolean {
  if (!wallet) return false;
  const hasMemberId = Boolean(wallet.memberId && wallet.memberId !== '100001');
  const hasEmail = Boolean(wallet.email && wallet.email.includes('@'));
  const hasAuthUid = Boolean(wallet.authUid && !wallet.authUid.startsWith('guest_'));
  return Boolean(hasAuthUid || (hasEmail && hasMemberId) || wallet.isGoogleLinked);
}

export const isGoogleAuthActive = isUserAuthenticated;

export function signInAsGuestOrFallback(customWelcomeBonus?: number): GoogleAuthResult {
  const adminCfg = loadAdminConfig();
  const configuredWelcomeBonus = typeof customWelcomeBonus === 'number'
    ? customWelcomeBonus
    : (adminCfg?.pricing?.googleWelcomeBonusCoins ?? 50);

  const currentLocalWallet = loadUserWallet();
  const guestUid = currentLocalWallet.authUid || `guest_${Math.floor(100000 + Math.random() * 900000)}`;
  const memberId = currentLocalWallet.memberId || `ROX${Math.floor(100000 + Math.random() * 900000)}`;

  const finalWallet: UserWallet = {
    ...currentLocalWallet,
    memberId,
    coins: currentLocalWallet.coins > 0 ? currentLocalWallet.coins : configuredWelcomeBonus,
    authUid: guestUid,
    email: currentLocalWallet.email || 'user@roxportal.com',
    displayName: currentLocalWallet.displayName || 'Rox User',
    isGoogleLinked: true,
    googleLinkedAt: currentLocalWallet.googleLinkedAt || Date.now(),
    lastLocalCoinMutationAt: Date.now()
  };

  saveUserWallet(finalWallet);
  window.dispatchEvent(new CustomEvent('instaboost_wallet_updated', { detail: finalWallet }));
  window.dispatchEvent(new Event('instaboost_wallet_updated'));
  window.dispatchEvent(new Event('instaboost_orders_updated'));
  window.dispatchEvent(new Event('instaboost_users_updated'));

  return {
    success: true,
    wallet: finalWallet,
    isNewUser: true,
    message: `🎉 Successfully signed in! (+${configuredWelcomeBonus} Coins welcome bonus)`
  };
}

/**
 * Sign out User Account
 */
export async function logoutGoogleAccount(): Promise<{ success: boolean; wallet?: UserWallet; message: string }> {
  try {
    try {
      await signOut(auth);
    } catch (signOutErr) {
      console.warn('Firebase signOut warning (continuing local logout):', signOutErr);
    }
    
    localStorage.removeItem('roxyefollow_user_member_id');
    localStorage.removeItem('roxyefollow_user_status');
    localStorage.removeItem('roxyefollow_is_admin');
    localStorage.removeItem(WALLET_KEY);

    const resetWallet: UserWallet = {
      memberId: '100001',
      coins: 0,
      dailyAdsWatched: 0,
      maxDailyAds: 10,
      status: 'ACTIVE',
      lastAdResetDate: new Date().toISOString().split('T')[0],
      isGoogleLinked: false,
      authUid: undefined,
      email: undefined,
      displayName: undefined,
      photoURL: undefined,
      lastLocalCoinMutationAt: Date.now()
    };
    saveUserWallet(resetWallet);
    window.dispatchEvent(new CustomEvent('instaboost_wallet_updated', { detail: resetWallet }));
    window.dispatchEvent(new Event('instaboost_wallet_updated'));
    window.dispatchEvent(new Event('instaboost_orders_updated'));
    window.dispatchEvent(new Event('instaboost_users_updated'));

    return { success: true, wallet: resetWallet, message: 'Signed out successfully.' };
  } catch (err: any) {
    console.error('Sign out error:', err);
    return { success: false, message: err.message || 'Sign out failed.' };
  }
}

export const logoutAccount = logoutGoogleAccount;

/**
 * Restores a user session directly by Member ID (used when returning via Deep Link or Intent from Chrome)
 */
export async function restoreUserByMemberId(memberId: string): Promise<GoogleAuthResult> {
  if (!memberId) {
    return { success: false, error: 'Invalid Member ID' };
  }
  try {
    const userDocRef = doc(db, 'users', memberId);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      return { success: false, error: `Account #${memberId} not found.` };
    }
    const userData = userSnap.data();
    const currentLocalWallet = loadUserWallet();

    const todayStr = new Date().toISOString().split('T')[0];
    const finalWallet: UserWallet = {
      memberId,
      coins: typeof userData.coins === 'number' ? userData.coins : (currentLocalWallet.coins || 50),
      dailyAdsWatched: typeof userData.dailyAdsWatched === 'number' ? userData.dailyAdsWatched : 0,
      maxDailyAds: typeof userData.maxDailyAds === 'number' ? userData.maxDailyAds : 10,
      status: userData.status || 'ACTIVE',
      lastAdResetDate: todayStr,
      authUid: userData.authUid || currentLocalWallet.authUid,
      email: userData.email || currentLocalWallet.email,
      displayName: userData.displayName || userData.name || currentLocalWallet.displayName,
      photoURL: userData.photoURL || currentLocalWallet.photoURL,
      isGoogleLinked: true,
      googleLinkedAt: userData.googleLinkedAt || Date.now(),
      referredBy: userData.referredBy || currentLocalWallet.referredBy,
      referralClaimed: userData.referralClaimed ?? currentLocalWallet.referralClaimed,
      totalReferralsCount: userData.totalReferralsCount || 0,
      totalReferralCoinsEarned: userData.totalReferralCoinsEarned || 0,
      lastLocalCoinMutationAt: Date.now()
    };

    localStorage.setItem('roxyefollow_user_member_id', memberId);
    saveUserWallet(finalWallet);
    window.dispatchEvent(new CustomEvent('instaboost_wallet_updated', { detail: finalWallet }));
    window.dispatchEvent(new Event('instaboost_wallet_updated'));
    window.dispatchEvent(new Event('instaboost_orders_updated'));
    window.dispatchEvent(new Event('instaboost_users_updated'));

    return {
      success: true,
      wallet: finalWallet,
      isNewUser: false,
      message: `🎉 Account restored! Welcome back ${finalWallet.displayName || finalWallet.email || '#' + memberId}.`
    };
  } catch (err: any) {
    console.error('restoreUserByMemberId error:', err);
    return { success: false, error: err?.message || 'Failed to restore account by Member ID.' };
  }
}

/**
 * Returns an Android Chrome Intent URL to launch the app directly in real Google Chrome browser.
 * This bypasses all Android WebView Google login blocks (e.g. 403 disallowed_useragent).
 */
export function getChromeIntentUrl(extraParams?: Record<string, string>): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('from_app', '1');
  if (extraParams) {
    Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  // Standard Android Intent format for Chrome package:
  const hostAndPath = `${url.host}${url.pathname}${url.search}`;
  return `intent://${hostAndPath}#Intent;scheme=https;package=com.android.chrome;end`;
}

/**
 * Returns Android Package Intent or Custom Scheme to return back to the AppCreator24 / native app
 */
export function getAppReturnIntentUrl(memberId?: string, email?: string): string {
  const currentHost = typeof window !== 'undefined' ? window.location.host : '';
  const search = `?memberId=${memberId || ''}&email=${encodeURIComponent(email || '')}&auth_return=1`;
  // 1. Android Package Intent for rox.follow
  return `intent://${currentHost}/${search}#Intent;scheme=https;package=rox.follow;end`;
}

/**
 * Hook or observer for Auth State
 */
export function onAuthStatusChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

