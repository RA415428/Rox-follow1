import { AdminConfig, SmmPanelProviderInfo } from '../types';
import { coinPackages, subscriptionPackage } from '../data/appData';

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  adminPassword: 'admin123',
  maintenanceMode: false,
  announcement: {
    enabled: false,
    title: '🚀 Special 2x Bonus Active!',
    message: 'Get double coins on every video watch and daily reward claim today!',
    bannerUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80',
    actionUrl: '',
    buttonText: 'Claim Bonus',
    bonusCoins: 10
  },
  smmApi: {
    enabled: true,
    autoForward: true,
    apiUrl: 'https://demo-smm-panel.com/api/v2',
    globalApiKey: 'demo_key_982347101928374',
    services: {
      followers: { serviceId: '101', apiKey: '' },
      likes: { serviceId: '102', apiKey: '' },
      views: { serviceId: '103', apiKey: '' },
      comments: { serviceId: '104', apiKey: '' },
      shares: { serviceId: '105', apiKey: '' },
      reposts: { serviceId: '106', apiKey: '' },
      saves: { serviceId: '107', apiKey: '' },
      reach: { serviceId: '108', apiKey: '' }
    }
  },
  ads: {
    enabled: true,
    provider: 'Adsterra',
    adMobAppId: 'ca-app-pub-7534769036423854~9595348595',
    bannerAdId: 'ca-app-pub-7534769036423854/9072604412',
    interstitialAdId: 'ca-app-pub-7534769036423854/3078307632',
    rewardedAdId: 'ca-app-pub-7534769036423854/5224354917',
    unityGameId: '800274636',
    unityRewardedPlacementId: 'Rewarded_Android',
    rewardAdDurationSeconds: 30,
    appOpenAdId: 'ca-app-pub-7534769036423854/5377167919',
    directSmartlinkUrl: 'https://doubtfulimpatient.com/bhetpw4me?key=b10856b9df41e998764e3e76a118f915',
    adSensePublisherId: 'ca-pub-5869373074081897',
    autoAdIntervalMinutes: 4, // 4 minutes auto popunder SmartLink (No coins)
    coinsPerRewardAd: 50,
    coinsPerSocialBarAd: 10,
    coinsPerAutoSmartlinkAd: 5,
    coinsPerBannerClick: 5,
    coinsPerSlidingBannerAd: 5,
    dailySlidingBannerAdLimit: 10,
    maxDailyAdsPerUser: 10
  },
  pricing: {
    coinsPerFollower: 200,
    minFollowers: 50,
    maxFollowers: 10000,
    coinsPerLike: 100,
    minLikes: 100,
    maxLikes: 50000,
    coinsPerView: 20,
    minViews: 500,
    maxViews: 100000,
    coinsPerComment: 200,
    minComments: 10,
    maxComments: 500,
    coinsPerShare: 150,
    minShares: 20,
    maxShares: 5000,
    coinsPerRepost: 250,
    minReposts: 10,
    maxReposts: 2000,
    coinsPerSave: 100,
    minSaves: 20,
    maxSaves: 10000,
    coinsPerReach: 180,
    minReach: 100,
    maxReach: 50000,
    dailyCheckinReward: 20,
    referralRewardCoins: 10,
    googleWelcomeBonusCoins: 10,
    referralAppDownloadUrl: 'https://www.appcreator24.com/app4146352-inodq9'
  },
  coinPackages: coinPackages,
  subscriptionPackage: subscriptionPackage,
  paymentSettings: {
    enabled: true,
    merchantUpiId: 'roxyefollow@upi',
    merchantName: 'Roxyefollow SMM',
    qrCodeUrl: '',
    autoApproveUtr: false,
    instructionText: 'PhonePe, Paytm, Google Pay ya QR Code dwara payment karein. Uske baad 12-Digit UTR Number daalkar Submit karein.'
  },
  branchSettings: {
    enabled: true,
    branchKey: 'key_live_ka8ZqM28q4mH7xP8jB8x7g', // Default Branch.io Test/Demo Key
    branchDomain: 'roxfollow.app.link',
    defaultRedirectUrl: 'https://www.appcreator24.com/app4146352-inodq9',
    enableDeferredMatching: true,
    autoRewardOnInstall: true
  },
  appUpdate: {
    enabled: false,
    latestVersion: '1.1.0',
    minRequiredVersion: '1.1.0',
    apkDownloadUrl: 'https://www.appcreator24.com/app4146352-inodq9',
    apkFileName: 'roxfollow-v1.1.0.apk',
    updateTitle: '🚀 Important App Update Available!',
    updateMessage: 'Naya version update aa gaya hai! Super fast orders, zero drop SMM servers aur naye earning features ke liye kripya abhi update karein.',
    releaseNotes: [
      '⚡ 10x Fast SMM Instagram Orders processing',
      '💰 High earning coins per sponsored ad stream',
      '🛠️ Super Smooth Android WebView & Performance',
      '🔒 Enhanced Wallet Security & Fast Coin Credit'
    ],
    forceUpdate: true,
    lastPublishedAt: 0
  },
  lastUpdated: 0
};

export const POPULAR_SMM_PROVIDERS: SmmPanelProviderInfo[] = [
  {
    name: 'SMM Main (Free Test Panel)',
    url: 'https://smmmain.com',
    isFreeOrDemo: true,
    description: 'Popular SMM panel with free trial API keys & low cost Instagram followers & likes.',
    features: 'API v2 compatible, instant start, auto refill.'
  },
  {
    name: 'SMM Rush API',
    url: 'https://smmrush.net',
    isFreeOrDemo: true,
    description: 'Offers demo API endpoint for testing Reels views & Likes integration.',
    features: 'Fast response, detailed JSON status API, low drop rates.'
  },
  {
    name: 'SMM Follower Hub',
    url: 'https://smmfollowerhub.com',
    isFreeOrDemo: false,
    description: 'High speed real looking Instagram engagement panel with full API support.',
    features: 'Supports custom comments, targeted locations, instant order status.'
  },
  {
    name: 'JustAnotherPanel (JAP)',
    url: 'https://justanotherpanel.com',
    isFreeOrDemo: false,
    description: 'One of the largest global SMM API providers for all social platforms.',
    features: 'Cheapest API rates, automated balance topup, standard API v2.'
  }
];
