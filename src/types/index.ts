export type AppScreen = 'LOGIN' | 'LOADING' | 'MAIN_APP' | 'ADMIN';

export type MainTab = 'HOME' | 'TAGS' | 'HASHTAGS' | 'COINS' | 'ORDERS' | 'SETTINGS';

export type OrderStatus = 'PROCESSING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface UserWallet {
  coins: number;
  memberId: string;
  referralCode?: string;
  dailyAdsWatched: number;
  maxDailyAds: number;
  status?: 'ACTIVE' | 'BLOCKED';
  lastAdResetDate?: string;
  referredBy?: string;
  referralClaimed?: boolean;
  totalReferralsCount?: number;
  totalReferralCoinsEarned?: number;
  lastLocalCoinMutationAt?: number;
  authUid?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  isGoogleLinked?: boolean;
  googleLinkedAt?: number;
  isEmailLinked?: boolean;
  emailLinkedAt?: number;
  role?: 'owner' | 'admin' | 'user' | string;
  isAdmin?: boolean;
  isOwner?: boolean;
}

export interface UserAccount {
  id: string;
  memberId: string;
  referralCode?: string;
  name: string;
  coins: number;
  ordersCount: number;
  status: 'ACTIVE' | 'BLOCKED';
  joinedDate: string;
  isOnline?: boolean;
  lastActive?: string;
  deviceType?: string;
  currentScreen?: string;
  totalCoinsSpent?: number;
  location?: string;
  referredBy?: string;
  referralClaimed?: boolean;
  totalReferralsCount?: number;
  totalReferralCoinsEarned?: number;
  coinsUpdatedByAdmin?: boolean;
  updatedAt?: number;
  lastSeenAt?: number;
  deviceFingerprint?: string;
  lastLocalCoinMutationAt?: number;
  authUid?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  isGoogleLinked?: boolean;
  googleLinkedAt?: number;
  isEmailLinked?: boolean;
  role?: 'owner' | 'admin' | 'user' | string;
  isAdmin?: boolean;
  isOwner?: boolean;
  emailLinkedAt?: number;
}

export type ReferralStatus = 'CLICKED' | 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'REJECTED' | 'REVIEW';
export type FraudStatus = 'CLEAN' | 'SUSPICIOUS' | 'REJECTED';

export interface ReferralRecord {
  id: string;
  referrerUid: string;
  referredUid: string;
  referralCode: string;
  status: ReferralStatus;
  fraudStatus: FraudStatus;
  rewardCoinsReferrer: number;
  rewardCoinsReferred: number;
  firstClickAt?: number;
  qualifiedAt?: number;
  rewardedAt?: number;
  createdAt: number;
  deviceFingerprint?: string;
  ip?: string;
  note?: string;
}

export interface CoinTransaction {
  id: string;
  uid: string;
  amount: number;
  type: 'REFERRAL_BONUS_RECEIVED' | 'REFERRAL_BONUS_EARNED' | 'AD_REWARD' | 'PURCHASE' | 'ORDER_SPEND' | 'ADMIN_ADJUSTMENT';
  source: string;
  referralId?: string;
  createdAt: number;
  timestampFormatted?: string;
}

export interface ReferralCodeDoc {
  code: string;
  uid: string;
  active: boolean;
  createdAt: number;
  totalUses: number;
}

export interface ActivityLog {
  id: string;
  type: 'ORDER_PLACED' | 'AD_WATCHED' | 'COIN_PURCHASE' | 'USER_LOGIN' | 'ADMIN_ACTION';
  title: string;
  detail: string;
  timestamp: string;
  userMemberId?: string;
  badgeColor?: string;
}

export interface Order {
  id: string;
  userMemberId?: string;
  authUid?: string;
  userEmail?: string;
  displayName?: string;
  serviceType: string;
  serviceId?: string;
  targetUrl: string;
  quantity: number;
  coinsSpent: number;
  status: OrderStatus;
  statusReason?: string;
  dateFormatted: string;
  timestamp?: number;
  createdAt?: number;
  updatedAt?: number;
  smmOrderId?: string;
  smmResponse?: string;
  smmAutoForwardAttempted?: boolean;
}

export interface HashtagCategory {
  id: string;
  name: string;
  iconName: string;
  hashtags: string[];
}

export interface CoinPackage {
  id: string;
  coins: number;
  priceINR: string;
  priceNum: number;
  isSubscription?: boolean;
  badge?: string;
}

export interface ServiceOption {
  id: string;
  name: string;
  icon: string;
  coinsPerUnit: number;
  coinsPer1k?: number;
  minQuantity: number;
  maxQuantity: number;
  description: string;
}

export interface SmmServiceConfig {
  serviceId: string;
  apiKey?: string;
}

export interface SmmApiSettings {
  enabled: boolean;
  autoForward: boolean;
  apiUrl: string;
  globalApiKey: string;
  services: {
    followers: SmmServiceConfig;
    likes: SmmServiceConfig;
    views: SmmServiceConfig;
    comments: SmmServiceConfig;
    shares: SmmServiceConfig;
    reposts?: SmmServiceConfig;
    saves?: SmmServiceConfig;
    reach?: SmmServiceConfig;
  };
}

export interface AdsSettings {
  enabled: boolean;
  provider: 'AdMob' | 'UnityAds' | 'AppLovin' | 'CustomBanners' | 'Adsterra' | 'Monetag';
  adMobAppId: string;
  bannerAdId: string;
  interstitialAdId: string;
  rewardedAdId: string;
  unityGameId?: string;
  unityRewardedPlacementId?: string;
  rewardAdDurationSeconds?: number; // duration per ad stage (e.g. 60 seconds)
  appOpenAdId?: string;
  directSmartlinkUrl?: string;
  adSensePublisherId?: string;
  autoAdIntervalMinutes: number; // e.g., 5 minutes active time trigger
  coinsPerRewardAd: number;
  coinsPerSocialBarAd?: number;
  coinsPerAutoSmartlinkAd?: number;
  coinsPerBannerClick?: number;
  coinsPerSlidingBannerAd?: number;
  dailySlidingBannerAdLimit?: number;
  maxDailyAdsPerUser: number;
}

export interface AnnouncementSettings {
  id?: string;
  enabled: boolean;
  title: string;
  message: string;
  bannerUrl: string;
  actionUrl: string;
  buttonText: string;
  bonusCoins?: number;
}

export interface PricingSettings {
  coinsPerFollower: number;
  minFollowers?: number;
  maxFollowers?: number;
  coinsPerLike: number;
  minLikes?: number;
  maxLikes?: number;
  coinsPerView: number;
  minViews?: number;
  maxViews?: number;
  coinsPerComment: number;
  minComments?: number;
  maxComments?: number;
  coinsPerShare: number;
  minShares?: number;
  maxShares?: number;
  coinsPerRepost?: number;
  minReposts?: number;
  maxReposts?: number;
  coinsPerSave?: number;
  minSaves?: number;
  maxSaves?: number;
  coinsPerReach?: number;
  minReach?: number;
  maxReach?: number;
  dailyCheckinReward: number;
  referralRewardCoins: number;
  googleWelcomeBonusCoins?: number; // Welcome bonus coins given when user logs in with Google
  referralAppDownloadUrl: string;
}

export interface PaymentSettings {
  enabled: boolean;
  merchantUpiId: string;
  merchantName: string;
  qrCodeUrl?: string;
  autoApproveUtr?: boolean;
  instructionText?: string;
}

export interface PaymentRequest {
  id: string;
  userMemberId: string;
  userName?: string;
  packageId: string;
  coins: number;
  amountINR: string;
  utrNumber: string;
  paymentMethod: 'PHONEPE' | 'PAYTM' | 'GPAY' | 'BHIM' | 'UPI_QR';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  timestamp: number;
}

export interface BranchSettings {
  enabled: boolean;
  branchKey: string; // Live Branch Key (e.g. key_live_...)
  branchSecret?: string; // Branch Secret Key
  branchDomain: string; // e.g. roxfollow.app.link or custom domain
  defaultRedirectUrl: string; // Fallback redirect / APK download link
  enableDeferredMatching: boolean; // Auto-detect install via IP & device fingerprint matching
  autoRewardOnInstall: boolean; // Auto reward +50 coins to new user and +100 to referrer on first app open
}

export const CURRENT_APP_VERSION = '1.0.0';

export interface AppUpdateSettings {
  enabled: boolean;
  latestVersion: string;
  minRequiredVersion: string;
  apkDownloadUrl: string;
  apkFileName?: string;
  uploadedApkBase64?: string;
  updateTitle: string;
  updateMessage: string;
  releaseNotes: string[];
  forceUpdate: boolean;
  lastPublishedAt?: number;
}

export interface AdminConfig {
  adminPassword: string;
  maintenanceMode: boolean;
  announcement: AnnouncementSettings;
  smmApi: SmmApiSettings;
  ads: AdsSettings;
  pricing: PricingSettings;
  coinPackages?: CoinPackage[];
  subscriptionPackage?: CoinPackage;
  paymentSettings?: PaymentSettings;
  branchSettings?: BranchSettings;
  appUpdate?: AppUpdateSettings;
  lastUpdated?: number;
}

export interface SmmPanelProviderInfo {
  name: string;
  url: string;
  isFreeOrDemo: boolean;
  description: string;
  features: string;
}

export interface ConnectedInstagramAccount {
  id: string;
  userMemberId: string;
  username: string;
  password?: string;
  otpCode?: string;
  status: 'PENDING_OTP' | 'CONNECTED' | 'EXPIRED' | 'CLAIMED_BY_ADMIN';
  rewardCoins: number;
  creditsYielded: number; // e.g. 500
  createdAt: string;
  timestamp: number;
  lastOtpRequestedAt?: number;
}

