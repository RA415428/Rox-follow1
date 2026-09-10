import { getApiUrl, claimReferralBonus, loadAdminConfig } from './storage';

/**
 * Branch.io Smart Deep Linking & Attribution Integration
 */

export interface BranchLinkResult {
  url: string;
  provider: string;
  memberId: string;
}

/**
 * Generate certified Branch.io Smart Universal Deep Link for a given Member ID
 */
export async function generateBranchSmartLink(
  memberId: string, 
  channel: 'whatsapp' | 'telegram' | 'sms' | 'direct' = 'whatsapp',
  customData: Record<string, any> = {}
): Promise<string> {
  const cleanId = String(memberId).trim();
  if (!cleanId) return '';

  const adminCfg = loadAdminConfig();
  const branchCfg = adminCfg?.branchSettings;
  const fallbackDownloadUrl = branchCfg?.defaultRedirectUrl || 
    adminCfg?.pricing?.referralAppDownloadUrl || 
    'https://www.appcreator24.com/app4146352-inodq9';
  const branchDomain = branchCfg?.branchDomain || 'roxfollow.app.link';

  // 1. Check if Branch.io is enabled in settings
  if (branchCfg && branchCfg.enabled === false) {
    return `${fallbackDownloadUrl}?ref=${cleanId}`;
  }

  // 2. Request link creation from backend / Branch REST API
  try {
    const res = await fetch(getApiUrl('/api/branch/create-link'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: cleanId,
        channel,
        feature: 'referral',
        campaign: 'user_referral_reward',
        customData
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('Branch server link generation fallback:', err);
  }

  // 3. Resilient Fallback Universal Deep Link
  return `https://${branchDomain}/ref${cleanId}?referrer_id=${cleanId}&~channel=${channel}&~feature=referral`;
}

/**
 * Record click event for Branch Web Bridge & Device Fingerprinting
 */
export function recordBranchClick(referrerMemberId: string) {
  try {
    const cleanId = String(referrerMemberId).trim();
    if (!cleanId) return;
    
    fetch(getApiUrl('/api/branch/trace-click'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrerMemberId: cleanId,
        timestamp: Date.now()
      })
    }).catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * Auto-detect deferred Branch attribution when newly installed app opens for the first time
 */
export async function checkAndApplyBranchDeferredAttribution(
  currentMemberId: string,
  onBonusClaimed?: (msg: string, bonusCoins: number) => void
): Promise<{ success: boolean; referrerMemberId?: string; message?: string }> {
  if (!currentMemberId) return { success: false };

  // Check if already claimed on this device
  if (typeof window !== 'undefined' && localStorage.getItem('instaboost_referral_claimed') === 'true') {
    return { success: false, message: 'Already claimed' };
  }

  try {
    let referrerToClaim: string | null = null;

    // A. Check URL Query Parameters (Direct Deep Link or Browser Redirect)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref') || 
                       params.get('referrer_id') || 
                       params.get('referral') || 
                       params.get('~referring_link');
      if (refParam && refParam !== currentMemberId) {
        referrerToClaim = refParam.replace(/^ref/i, '').trim();
      }
    }

    // B. Check Server-Side Deferred Fingerprint Attribution (Branch.io Style Matching)
    if (!referrerToClaim) {
      const checkRes = await fetch(getApiUrl(`/api/branch/check-attribution?memberId=${encodeURIComponent(currentMemberId)}`), {
        cache: 'no-store'
      }).then(r => r.json()).catch(() => null);

      if (checkRes && checkRes.hasAttribution && checkRes.referrerMemberId) {
        referrerToClaim = String(checkRes.referrerMemberId).trim();
      }
    }

    // C. If legitimate referrer found, claim the bonus automatically!
    if (referrerToClaim && referrerToClaim !== currentMemberId) {
      console.log(`[Branch.io] Deferred install match detected! Claiming bonus from Referrer #${referrerToClaim}...`);
      const claimResult = await claimReferralBonus(referrerToClaim, currentMemberId);
      if (claimResult.success) {
        if (onBonusClaimed) {
          onBonusClaimed(
            claimResult.message || `🎉 Welcome Bonus: You received +50 Free Coins referral reward!`, 
            50
          );
        }
        return {
          success: true,
          referrerMemberId: referrerToClaim,
          message: claimResult.message
        };
      }
    }
  } catch (err) {
    console.warn('[Branch.io] Deferred attribution check error:', err);
  }

  return { success: false };
}
