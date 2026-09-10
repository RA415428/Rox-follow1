import { CoinPackage, HashtagCategory, Order, ServiceOption } from '../types';

export const serviceOptions: ServiceOption[] = [
  {
    id: 'followers',
    name: 'Instagram Followers',
    icon: 'followers',
    coinsPerUnit: 0.1,
    minQuantity: 50,
    maxQuantity: 10000,
    description: 'High quality real-looking Instagram profiles with profile photos.'
  },
  {
    id: 'likes',
    name: 'Instagram Likes',
    icon: 'likes',
    coinsPerUnit: 0.05,
    minQuantity: 100,
    maxQuantity: 50000,
    description: 'Instant engagement boost for your posts and reels.'
  },
  {
    id: 'views',
    name: 'Reels Views',
    icon: 'views',
    coinsPerUnit: 0.02,
    minQuantity: 500,
    maxQuantity: 100000,
    description: 'Help your Reels reach the Explore Page algorithm.'
  },
  {
    id: 'comments',
    name: 'Custom Comments',
    icon: 'comments',
    coinsPerUnit: 0.2,
    minQuantity: 10,
    maxQuantity: 500,
    description: 'Relevant custom comments from targeted accounts.'
  },
  {
    id: 'shares',
    name: 'Reels Shares & Boost',
    icon: 'shares',
    coinsPerUnit: 0.15,
    minQuantity: 20,
    maxQuantity: 5000,
    description: 'Virality trigger shares and direct save boosts.'
  },
  {
    id: 'reposts',
    name: 'Instagram Repost',
    icon: 'reposts',
    coinsPerUnit: 0.25,
    minQuantity: 10,
    maxQuantity: 2000,
    description: 'High-reach creator account reposts to multiply views and virality.'
  },
  {
    id: 'saves',
    name: 'Instagram Saves',
    icon: 'saves',
    coinsPerUnit: 0.10,
    minQuantity: 20,
    maxQuantity: 10000,
    description: 'Direct bookmark saves to trigger Instagram algorithmic discovery.'
  },
  {
    id: 'reach',
    name: 'Instagram Reach + Impressions + Profile visits (≈10%)',
    icon: 'reach',
    coinsPerUnit: 0.18,
    minQuantity: 100,
    maxQuantity: 50000,
    description: 'Organic algorithm booster with reach, impressions & profile visits.'
  }
];

export const hashtagCategories: HashtagCategory[] = [
  {
    id: 'reels_viral',
    name: 'Reels & Viral',
    iconName: 'video',
    hashtags: [
      '#reels', '#reelsinstagram', '#viral', '#trending',
      '#reelsvideo', '#explore', '#explorepage', '#instareels', '#foryou',
      '#trendingaudio', '#reelsindia', '#viralreels', '#fyp', '#reellitfeelit'
    ]
  },
  {
    id: 'instagram_growth',
    name: 'Instagram Growth',
    iconName: 'rocket',
    hashtags: [
      '#instagramgrowth', '#socialmediamarketing', '#contentcreator', '#digitalmarketing',
      '#branding', '#followers', '#growth', '#reels', '#explorepage',
      '#viral', '#instagramstrategy', '#influencer', '#engagement'
    ]
  },
  {
    id: 'fashion',
    name: 'Fashion & Style',
    iconName: 'shirt',
    hashtags: [
      '#fashion', '#style', '#ootd', '#fashionblogger', '#instafashion',
      '#streetwear', '#model', '#outfit', '#shopping', '#stylish',
      '#fashionista', '#mensfashion', '#womensfashion', '#lookbook'
    ]
  },
  {
    id: 'fitness',
    name: 'Fitness & Gym',
    iconName: 'dumbbell',
    hashtags: [
      '#fitness', '#gym', '#workout', '#fit', '#fitnessmotivation',
      '#bodybuilding', '#training', '#health', '#lifestyle', '#fitfam',
      '#muscle', '#crossfit', '#gymlife', '#cardio'
    ]
  },
  {
    id: 'food',
    name: 'Food & Cooking',
    iconName: 'utensils',
    hashtags: [
      '#food', '#foodie', '#instafood', '#foodporn', '#yummy',
      '#delicious', '#foodstagram', '#foodphotography', '#dinner', '#homemade',
      '#chef', '#tasty', '#foodlover', '#healthyfood'
    ]
  },
  {
    id: 'art',
    name: 'Art & Design',
    iconName: 'brush',
    hashtags: [
      '#art', '#artist', '#drawing', '#illustration', '#digitalart',
      '#artwork', '#sketch', '#instaart', '#painting', '#creative',
      '#artoftheday', '#design', '#draw', '#contemporaryart'
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing & Biz',
    iconName: 'target',
    hashtags: [
      '#marketing', '#business', '#digitalmarketing', '#entrepreneur',
      '#branding', '#socialmedia', '#marketingdigital', '#smallbusiness',
      '#sales', '#advertising', '#seo', '#onlinebusiness'
    ]
  },
  {
    id: 'motivation',
    name: 'Motivation',
    iconName: 'zap',
    hashtags: [
      '#motivation', '#mindset', '#inspiration', '#quotes',
      '#success', '#goals', '#lifestyle', '#motivationalquotes',
      '#positivity', '#hardwork', '#believe', '#hustle'
    ]
  },
  {
    id: 'photography',
    name: 'Photography',
    iconName: 'camera',
    hashtags: [
      '#photography', '#photooftheday', '#nature', '#photographer',
      '#picoftheday', '#photo', '#love', '#portrait', '#landscape',
      '#travelphotography', '#canon', '#nikon', '#artistic'
    ]
  },
  {
    id: 'travel',
    name: 'Travel & Explore',
    iconName: 'plane',
    hashtags: [
      '#travel', '#travelgram', '#instatravel', '#wanderlust',
      '#adventure', '#explore', '#nature', '#travelphotography', '#vacation',
      '#landscape', '#trip', '#tourist', '#holiday'
    ]
  }
];

export const coinPackages: CoinPackage[] = [
  { id: 'pkg_100', coins: 100, priceINR: '₹30.00', priceNum: 30.00 },
  { id: 'pkg_500', coins: 500, priceINR: '₹130.00', priceNum: 130.00, badge: 'Popular' },
  { id: 'pkg_1000', coins: 1000, priceINR: '₹290.00', priceNum: 290.00 },
  { id: 'pkg_2000', coins: 2000, priceINR: '₹590.00', priceNum: 590.00, badge: 'Best Value' },
  { id: 'pkg_5000', coins: 5000, priceINR: '₹1,500.00', priceNum: 1500.00 },
  { id: 'pkg_10000', coins: 10000, priceINR: '₹3,000.00', priceNum: 3000.00 }
];

export const subscriptionPackage: CoinPackage = {
  id: 'sub_100_monthly',
  coins: 100,
  priceINR: '₹30.00 / Month',
  priceNum: 30.00,
  isSubscription: true
};

export const initialOrders: Order[] = [];
