import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  Lock, 
  Mail, 
  KeyRound, 
  User, 
  Tag, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  Send,
  ArrowLeft,
  Clock
} from 'lucide-react';
import { RoxLogo } from '../components/RoxLogo';
import { 
  signInWithEmail,
  signUpWithEmail,
  requestPasswordResetOTP,
  verifyOTPCode,
  verifyResetOTPAndSetPassword,
  resetPasswordWithEmail,
  signInWithGoogle,
  AuthResult
} from '../utils/authService';
import { UserWallet } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (wallet: UserWallet, isNewUser?: boolean, message?: string) => void;
  welcomeBonusCoins?: number;
  onOpenDialog?: (type: 'TERMS' | 'PRIVACY' | 'SUPPORT') => void;
  onShowToast?: (msg: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  welcomeBonusCoins = 10,
  onOpenDialog,
  onShowToast,
}) => {
  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD'>('SIGN_IN');
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // 5-Minute OTP Expiry Countdown (300 seconds)
  const [otpTimer, setOtpTimer] = useState<number>(300);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Password Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    let interval: any;
    if (authMode === 'FORGOT_PASSWORD' && forgotStep === 2 && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [authMode, forgotStep, otpTimer]);

  useEffect(() => {
    let resendInterval: any;
    if (resendCooldown > 0) {
      resendInterval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(resendInterval);
  }, [resendCooldown]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleModeSwitch = (mode: 'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD') => {
    setAuthMode(mode);
    setForgotStep(1);
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSendOtp = async (isResend = false) => {
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    if (!isResend) setSuccessMessage(null);

    try {
      const res = await requestPasswordResetOTP(email);
      if (res.success) {
        setSuccessMessage(res.message);
        setForgotStep(2);
        setOtpTimer(300); // 5 minutes validity
        setResendCooldown(60); // 60s cooldown for next resend
        if (onShowToast) onShowToast('📩 6-digit verification code sent to your email!');
      } else {
        setErrorMessage(res.message || 'Failed to dispatch verification code.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error sending verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }
    if (otpTimer <= 0) {
      setErrorMessage('Verification code has expired. Please click "Resend Code".');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await verifyOTPCode(email, cleanCode);
      if (res.success) {
        setSuccessMessage('Code verified! Set your new password.');
        setForgotStep(3);
      } else {
        setErrorMessage(res.message || 'Incorrect verification code.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-type.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await verifyResetOTPAndSetPassword(email, otpCode, newPassword);
      if (res.success) {
        setSuccessMessage(res.message);
        setPassword(newPassword);
        if (onShowToast) onShowToast('🎉 Password reset successfully!');
        setTimeout(() => {
          handleModeSwitch('SIGN_IN');
          setSuccessMessage('Password updated! Sign in with your new password.');
        }, 1500);
      } else {
        setErrorMessage(res.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error updating password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'FORGOT_PASSWORD') {
      if (forgotStep === 1) await handleSendOtp();
      else if (forgotStep === 2) await handleVerifyOtp();
      else if (forgotStep === 3) await handleResetPassword();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (authMode === 'SIGN_IN') {
        const res: AuthResult = await signInWithEmail(email, password, welcomeBonusCoins);
        if (res.success && res.wallet) {
          if (onShowToast) onShowToast(res.message || '🎉 Signed in successfully!');
          onLoginSuccess(res.wallet, res.isNewUser, res.message);
        } else {
          setErrorMessage(res.error || 'Sign in failed. Check your email and password.');
        }
      } else if (authMode === 'SIGN_UP') {
        if (!displayName.trim()) {
          setErrorMessage('Please enter your full name.');
          setIsLoading(false);
          return;
        }
        const res: AuthResult = await signUpWithEmail(
          email,
          password,
          displayName.trim(),
          referralCode.trim(),
          welcomeBonusCoins
        );
        if (res.success && res.wallet) {
          if (onShowToast) onShowToast(res.message || '🎉 Account created successfully!');
          onLoginSuccess(res.wallet, res.isNewUser, res.message);
        } else {
          setErrorMessage(res.error || 'Registration failed. Please try again.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await signInWithGoogle(welcomeBonusCoins);
      if (res.success && res.wallet) {
        if (onShowToast) onShowToast(res.message || '👋 Google Login Successful!');
        onLoginSuccess(res.wallet, res.isNewUser, res.message);
      } else if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col justify-between p-3 select-none relative overflow-x-hidden overflow-y-auto touch-pan-y">
      {/* Background Neon Ambient Glows strictly contained inside wrapper */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-0">
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-60 h-60 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-72 h-44 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Top Header */}
      <div className="pt-2 sm:pt-3 flex flex-col items-center text-center relative z-10 shrink-0">
        <div className="mb-1 transform hover:scale-105 transition-transform duration-300">
          <RoxLogo size="md" showSparkle={true} />
        </div>
        <h1 className="text-xl font-black bg-gradient-to-r from-white via-slate-100 to-pink-300 bg-clip-text text-transparent tracking-tight leading-none">
          ROX FOLLOW
        </h1>
        <p className="text-[10px] text-slate-400 font-medium mt-1">
          Instagram Followers, Likes & Growth Booster
        </p>
      </div>

      {/* Main Login / Register Card - Narrower Width (max-w-[310px] sm:max-w-[335px]) */}
      <div className="w-full max-w-[310px] sm:max-w-[335px] mx-auto my-auto py-2 relative z-10 shrink-0">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-pink-500/25 rounded-2xl p-3.5 sm:p-4 shadow-2xl shadow-pink-500/10 text-center relative overflow-hidden">
          {/* Welcome Bonus Chip */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[10.5px] font-bold mb-2.5 shadow-inner">
            <Gift className="w-3.5 h-3.5 text-pink-400 shrink-0 animate-bounce" />
            <span>+{welcomeBonusCoins} Free Coins on Sign Up</span>
          </div>

          {/* Google Quick Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full mb-3 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer border border-slate-200"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          <div className="flex items-center gap-2 mb-3">
            <div className="h-px bg-slate-800 flex-1" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">or email</span>
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          {/* Mode Navigation Tabs */}
          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 mb-3">
            <button
              type="button"
              onClick={() => handleModeSwitch('SIGN_IN')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'SIGN_IN'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('SIGN_UP')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'SIGN_UP'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          <h2 className="text-base font-bold text-white mb-1 flex items-center justify-center gap-1.5">
            <span>
              {authMode === 'SIGN_IN' && 'Sign In to Your Account'}
              {authMode === 'SIGN_UP' && 'Create Your Account'}
              {authMode === 'FORGOT_PASSWORD' && (
                forgotStep === 1 ? 'Step 1: Enter Email' :
                forgotStep === 2 ? 'Step 2: 6-Digit OTP' :
                'Step 3: New Password'
              )}
            </span>
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          </h2>

          <p className="text-[11px] text-slate-400 mb-3 leading-relaxed max-w-xs mx-auto">
            {authMode === 'SIGN_IN' && 'Enter your email and password to sign in.'}
            {authMode === 'SIGN_UP' && 'Register with email to get free bonus coins immediately!'}
            {authMode === 'FORGOT_PASSWORD' && forgotStep === 1 && 'Enter your registered email to receive a 6-digit OTP.'}
            {authMode === 'FORGOT_PASSWORD' && forgotStep === 2 && `Enter the 6-digit OTP code sent to ${email}`}
            {authMode === 'FORGOT_PASSWORD' && forgotStep === 3 && 'Choose a strong new password for your account.'}
          </p>

          {/* Alert Boxes */}
          {errorMessage && (
            <div className="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex flex-col gap-2 text-left">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-rose-200 leading-tight flex-1">{errorMessage}</p>
              </div>
              {errorMessage.includes('already registered') && authMode === 'SIGN_UP' && (
                <button
                  type="button"
                  onClick={() => handleModeSwitch('SIGN_IN')}
                  className="mt-1 w-full py-1.5 px-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Switch to Sign In
                </button>
              )}
            </div>
          )}

          {successMessage && (
            <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-emerald-200 leading-tight flex-1">{successMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5 text-left">
            {authMode === 'SIGN_UP' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            )}

            {/* Email Field (Shown in Sign In, Sign Up, and Forgot Step 1 & 2) */}
            {(authMode !== 'FORGOT_PASSWORD' || forgotStep === 1 || forgotStep === 2) && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-300">Email Address</label>
                  {authMode === 'FORGOT_PASSWORD' && forgotStep === 2 && (
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-[10px] text-pink-400 hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <ArrowLeft className="w-2.5 h-2.5" /> Change Email
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    disabled={authMode === 'FORGOT_PASSWORD' && forgotStep === 2}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className={`w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 ${
                      authMode === 'FORGOT_PASSWORD' && forgotStep === 2 ? 'opacity-60 bg-slate-900 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Normal Sign In / Sign Up Password */}
            {authMode !== 'FORGOT_PASSWORD' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-300">Password</label>
                  {authMode === 'SIGN_IN' && (
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('FORGOT_PASSWORD')}
                      className="text-[10px] text-pink-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* ================= STEP 2: 6-DIGIT OTP WITH 5-MINUTE COUNTDOWN ================= */}
            {authMode === 'FORGOT_PASSWORD' && forgotStep === 2 && (
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-pink-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
                      <span>Enter 6-Digit Code</span>
                    </label>
                    <span className="text-[11px] font-mono font-bold text-pink-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 animate-pulse" />
                      {formatTimer(otpTimer)}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123456"
                      className="w-full bg-slate-950 border-2 border-pink-500/60 rounded-xl text-center tracking-[0.45em] font-mono font-black text-base py-2 text-white placeholder-slate-600 focus:outline-none focus:border-pink-400 shadow-inner"
                    />
                  </div>
                </div>

                {/* Resend Action */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">Didn't receive code?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={() => handleSendOtp(true)}
                    className={`text-[10.5px] font-bold underline cursor-pointer ${
                      resendCooldown > 0 ? 'text-slate-500 cursor-not-allowed no-underline' : 'text-pink-400 hover:text-pink-300'
                    }`}
                  >
                    {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}
                  </button>
                </div>
              </div>
            )}

            {/* ================= STEP 3: NEW PASSWORD & CONFIRM PASSWORD ================= */}
            {authMode === 'FORGOT_PASSWORD' && forgotStep === 3 && (
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-pink-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-pink-400" />
                      <span>New Password</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Min 6 characters</span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {authMode === 'SIGN_UP' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Referral Code (Optional)</label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="Enter referral code (e.g. ROX1234)"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-3 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 shadow-lg cursor-pointer ${
                isLoading
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Please wait...</span>
                </>
              ) : (
                <>
                  <span>
                    {authMode === 'SIGN_IN' && 'Sign In'}
                    {authMode === 'SIGN_UP' && 'Create Account'}
                    {authMode === 'FORGOT_PASSWORD' && (
                      forgotStep === 1 ? 'Send 6-Digit OTP' :
                      forgotStep === 2 ? 'Verify Code' :
                      'Reset Password'
                    )}
                  </span>
                  {authMode === 'FORGOT_PASSWORD' && forgotStep === 1 ? (
                    <Send className="w-3.5 h-3.5 text-white/80" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-white/80" />
                  )}
                </>
              )}
            </button>
          </form>

          {authMode === 'FORGOT_PASSWORD' && (
            <button
              type="button"
              onClick={() => handleModeSwitch('SIGN_IN')}
              className="mt-3 text-xs font-semibold text-slate-400 hover:text-white underline cursor-pointer"
            >
              Back to Sign In
            </button>
          )}

          {/* Micro Security Notice */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Encrypted & Safe Authentication</span>
          </div>
        </div>
      </div>

      {/* Footer & Policies */}
      <div className="pb-2 text-center relative z-10 shrink-0">
        <div className="flex items-center justify-center gap-3 text-[10.5px] text-slate-400 font-medium mb-1">
          {onOpenDialog && (
            <>
              <button onClick={() => onOpenDialog('TERMS')} className="hover:text-pink-300 transition-colors underline cursor-pointer">Terms</button>
              <span>•</span>
              <button onClick={() => onOpenDialog('PRIVACY')} className="hover:text-pink-300 transition-colors underline cursor-pointer">Privacy</button>
              <span>•</span>
              <button onClick={() => onOpenDialog('SUPPORT')} className="hover:text-pink-300 transition-colors underline cursor-pointer">Support</button>
            </>
          )}
        </div>
        <p className="text-[9.5px] text-slate-400 font-mono">
          ROX FOLLOW v3.6.0 • Secure Cloud
        </p>
      </div>
    </div>
  );
};


