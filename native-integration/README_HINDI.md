# Rox Follow — Unity Rewarded Ads Integration (सिर्फ इसी ke liye)

Ye folder sirf reference/patch files hai. Ismein koi naya screen ya UI nahi hai —
sirf Unity rewarded video ad ko App ke maujooda "Watch Ad" button (Store screen)
se jodne ke liye zaroori native Android code hai.

## Kyun ye tarika chuna gaya
Aapki ZIP mein 2 alag cheezein thi:
1. Aapka asli Rox Follow web app (src/, server.ts) — Firebase se connect, jo screenshots
   mein dikh raha hai.
2. Ek alag, disconnected native Android template ("SOX FOLLOW", Firebase se connect
   nahi) jo AI Studio ne khud-ba-khud bana diya tha. Isko IGNORE kiya gaya hai kyunki
   ye aapka asli app nahi hai.

Aapko pata nahi tha ki abhi APK kaise banta hai, isliye maine sabse standard aur
sabse widely-used tarika (Capacitor) chuna hai jo bina kisi UI/screen change ke
aapke maujooda React+Firebase web app ko as-is Android APK mein wrap karta hai.

## Web app side mein kya badla (sirf ye 2 files)
- `src/utils/nativeAdsBridge.ts` (NAYI FILE) — native Android se baat karne ka bridge.
- `src/App.tsx` — sirf Store screen ke "Watch Ad" button (`onOpenAdModal` prop jo
  CoinsScreen ko milta hai) ka handler badla gaya hai. Koi naya button, screen, text
  ya font kahin nahi joda gaya. Home/Tags/Orders tab ke ad buttons bilkul waise hi
  kaam karte rahenge jaise pehle karte the.

## Aapko apne computer par (network chahiye, isliye main yaha nahi kar saka) ye steps karne hain:

### 1) Capacitor add karo (project root mein)
```
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npx cap init "Rox Follow" "com.roxfollow.app" --web-dir=dist
npm run build
npx cap add android
npx cap sync android
```

### 2) Unity Ads SDK dependency add karo
`android/app/build.gradle` file kholo, `dependencies { ... }` block ke andar ye line
add karo:
```
implementation "com.unity3d.ads:unity-ads:4.12.2"
```

### 3) Plugin file copy karo
Is folder ke `android-plugin/java/com/roxfollow/app/UnityRewardedAdsPlugin.kt` file ko
copy karke yahan paste karo:
`android/app/src/main/java/com/roxfollow/app/UnityRewardedAdsPlugin.kt`

(Agar aapka package naam `com.roxfollow.app` na ho to file ke andar `package` line
aur folder path dono us hisaab se badal dena.)

### 4) MainActivity mein plugin register karo
`android/app/src/main/java/.../MainActivity.java` (ya .kt) kholo aur
`android-plugin/MainActivity_reference.java` jaisा `registerPlugin(UnityRewardedAdsPlugin.class);`
line `onCreate` ke sabse upar add karo (neeche example file mein poora dikhaya gaya hai).

### 5) Game ID / Placement ID check karo
Plugin file ke top par ye values already aapke Unity Dashboard screenshot se daali
gayi hain:
- GAME_ID = "800368206"
- REWARDED_PLACEMENT_ID = "Rewarded_Android"

Agar Unity dashboard mein koi change ho to sirf yehi 2 lines update karna.

### 6) Build karo
Android Studio mein `android` folder kholo aur "Build > Build Bundle(s)/APK(s) > Build APK(s)"
se APK bana lo. Ya phir aapke existing `codemagic.yaml` ko is naye `android/` folder
ko point karne ke liye update karna hoga (agar aap Codemagic CI use karte ho).

## Behaviour (jo aapne manga tha)
- Store screen ke "Watch Ad +X" button par click → seedha Unity REWARDED video ad
  khulega (interstitial nahi).
- Coins sirf tab milenge jab user poora ad dekh le (native side "REWARDED" status
  bheje) — beech mein close karne par kuch nahi milega.
- Coins ki quantity admin panel se set ki gayi value (`coinsPerRewardAd`) se hi
  aayegi — jo already aapke admin panel se connect hai.
- Web browser preview mein (jaha native bridge nahi hota) purana behaviour hi
  chalta rahega, taki dev/testing na tootay.

## Mobile (Termux) se GitHub Actions ke through APK build karna

Ye sabse aasan tarika hai — mobile par Android SDK/Gradle chalane ki zaroorat nahi,
build Google ke free cloud servers par hoga.

### 1) GitHub par ek naya repository banao (github.com website/app se)
Private ya public, jo chahe.

### 2) Termux mein ye install karo (agar pehle se nahi hai)
```
pkg update && pkg upgrade
pkg install git
```

### 3) Is poore project folder ko apne GitHub repo mein push karo
```
cd rox-follow-project        # jaha ye ZIP extract ki ho
git init
git add .
git commit -m "Unity rewarded ads integration"
git branch -M main
git remote add origin https://github.com/<aapka-username>/<repo-name>.git
git push -u origin main
```
(Login ke liye GitHub Personal Access Token banana padega: GitHub app/website ->
Settings -> Developer Settings -> Personal Access Tokens -> naya token banao,
password ki jagah wahi token use karna.)

### 4) Workflow file sahi jagah rakho
`native-integration/github-workflow/build-apk.yml` file ko copy karke ye path par
rakho (agar already nahi hai):
```
.github/workflows/build-apk.yml
```
```
mkdir -p .github/workflows
cp native-integration/github-workflow/build-apk.yml .github/workflows/build-apk.yml
git add .github
git commit -m "Add APK build workflow"
git push
```

### 5) Build apne aap shuru ho jayega
Push karte hi GitHub Actions apne aap chal jayega. Manually chalane ke liye:
GitHub repo -> **Actions** tab -> "Build Rox Follow APK" -> **Run workflow** button.

### 6) APK download karo
Build (~5-8 minute) poora hone ke baad: Actions tab -> us build run par click karo ->
neeche **Artifacts** section mein "rox-follow-apk" milega -> download karo (ZIP mein
APK hoga). Ye phone par hi ho jayega, GitHub app ya browser dono se kaam karta hai.

**Note:** Ye workflow DEBUG APK banata hai (turant test/install karne ke liye).
Play Store par publish karne se pehle Release/signed APK banana padega — jab wo
stage aaye tab bata dena, main signing config (keystore) bhi workflow mein
add kar dunga.
