'use client'
import React, { useState, useEffect, useRef } from "react";
import Image from 'next/image';
import logo from '../public/img/logo.jpg';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';

export default function Home(){
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [showPassword, setShowPassword] = useState(false);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [otpType, setOtpType] = useState('sms');
  const [isFallback, setIsFallback] = useState(false);
  const [ipBlocked, setIpBlocked] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState(null);
  
  // Forgot Password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState('phone'); // 'phone', 'otp', 'password'
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotSessionId, setForgotSessionId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [resetBlockedUntil, setResetBlockedUntil] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const timerRef = useRef(null);
  const otpInputRefs = useRef([]);
  const forgotOtpInputRefs = useRef([]);
  // API_BASE_URL is imported from config, which handles /api stripping
  
  // API URL configuration

  // Get redirect URL from query params
  const [redirectUrl, setRedirectUrl] = useState('/admin');

  // Redirect to admin page (dashboard) if user is already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Check if we just got redirected here due to auth failure
      const urlParams = new URLSearchParams(window.location.search);
      const hasRedirectParam = urlParams.has('redirect');
      const authRedirectTime = sessionStorage.getItem('auth_redirect');
      const isRecentAuthRedirect = authRedirectTime && (Date.now() - parseInt(authRedirectTime)) < 5000; // Within 5 seconds
      
      if (hasRedirectParam || isRecentAuthRedirect) {
        // User was redirected here due to auth failure
        // Force logout to clear stale auth state
        console.log('🔴 Detected auth redirect - clearing stale auth');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        document.cookie = 'urbanesta_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'urbanesta_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        sessionStorage.removeItem('auth_redirect');
        
        // Force reload to ensure clean state
        if (hasRedirectParam) {
          window.history.replaceState({}, '', '/');
        }
        return;
      }
      
      // Normal case: user is authenticated and no recent redirect
      console.log('✅ User authenticated, redirecting to admin');
      window.location.href = '/admin';
    }
  }, [authLoading, isAuthenticated]);

  // Get redirect URL from query params on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      if (redirect) {
        setRedirectUrl(redirect);
      }
    }
  }, []);

  // Timer effect
  useEffect(() => {
    if (otpExpiresAt && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(otpExpiresAt).getTime();
        const remaining = Math.max(0, Math.ceil((expiry - now) / 1000));
        
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          clearInterval(timerRef.current);
          setError('OTP expired. Please request a new one.');
        }
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [otpExpiresAt, timeLeft]);

  // Auto-focus first OTP input when OTP step is shown
  useEffect(() => {
    if (step === 'otp' && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Auto-focus first forgot OTP input when forgot OTP step is shown
  useEffect(() => {
    if (forgotStep === 'otp' && forgotOtpInputRefs.current[0]) {
      setTimeout(() => {
        forgotOtpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [forgotStep]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Validate phone number
  const validatePhone = (phoneNumber) => {
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    return phoneRegex.test(cleanPhone);
  };

  // Send OTP
  const sendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!validatePhone(phone)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Please enter your password');
      setLoading(false);
      return;
    }

    try {
      const url = `${API_BASE_URL}/api/2factor/send-otp`;
      console.log('Sending OTP request to:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: phone, password: password }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('OTP sent successfully, sessionId:', data.sessionId);
        setSessionId(data.sessionId);
        setOtpExpiresAt(data.expiresAt);
        setTimeLeft(data.expiresIn);
        setOtpType(data.otpType);
        setIsFallback(data.isFallback);
        setUserName(data.userName || '');
        setStep('otp');
        setSuccess(`OTP sent to ${data.userName || 'your phone'}`);
      } else {
        if (data.code === 'UNAUTHORIZED_PHONE') {
          setError('Access denied. Your phone number is not registered in our system. Do not try to access otherwise we will block you.');
        } else if (data.code === 'ACCOUNT_DEACTIVATED') {
          setError('Your account has been deactivated. Please contact administrator.');
        } else if (response.status === 429) {
          setIpBlocked(true);
          setBlockedUntil(data.blockedUntil);
          setError(data.error);
        } else {
          setError(data.error || 'Failed to send OTP');
        }
      }
    } catch (error) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!otp || otp.length < 4) {
      setError('Please enter a valid OTP');
      setLoading(false);
      return;
    }

    try {
      console.log('Verifying OTP with sessionId:', sessionId, 'otp:', otp);
      const response = await fetch(`${API_BASE_URL}/api/2factor/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionId: sessionId, 
          otp: otp 
        }),
      });

      const data = await response.json();
      console.log('OTP verification response:', data);

      if (data.success) {
        setSuccess('Login successful! Redirecting...');
        
        // Clear any auth redirect flags
        sessionStorage.removeItem('auth_redirect');
        
        // Store user data and JWT token
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token); // Use the actual JWT token
        console.log('Login - Token received from server:', data.token);
        console.log('Login - Token stored in localStorage:', localStorage.getItem('token'));
        
        // Set cookie for middleware (the backend already sets this, but we'll set it here too for consistency)
        document.cookie = `urbanesta_token=${data.token}; path=/; max-age=${30 * 60}`; // 30 minutes
        
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1500);
      } else {
        if (data.code === 'OTP_EXPIRED') {
          setError('OTP expired. Please request a new one.');
          setStep('phone');
        } else if (data.code === 'UNAUTHORIZED_USER') {
          setError('Unauthorized access. Your phone number is not registered in our system.');
          setStep('phone');
        } else if (data.code === 'ACCOUNT_DEACTIVATED') {
          setError('Your account has been deactivated. Please contact administrator.');
          setStep('phone');
        } else {
          setError(data.error || 'Invalid OTP');
        }
      }
    } catch (error) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const resendOTP = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/2factor/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: phone }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setOtpExpiresAt(data.expiresAt);
        setTimeLeft(data.expiresIn);
        setOtpType(data.otpType);
        setIsFallback(data.isFallback);
        setSuccess('OTP resent successfully');
      } else {
        setError(data.error || 'Failed to resend OTP');
      }
    } catch (error) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Go back to phone step
  const goBack = () => {
    setStep('phone');
    setOtp('');
    setError('');
    setSuccess('');
    setTimeLeft(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // Forgot Password: Send OTP
  const handleForgotPasswordSendOTP = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/forgot-password/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: forgotPhone }),
      });

      const data = await response.json();

      if (data.success) {
        setForgotSessionId(data.sessionId);
        setAttemptsLeft(data.attemptsLeft || 3);
        setForgotSuccess(`OTP sent successfully to +91${forgotPhone}. Attempts left: ${data.attemptsLeft || 3}/3`);
        setForgotStep('otp');
      } else {
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
          setResetBlockedUntil(data.blockedUntil);
          setForgotError(`Too many attempts! You can try again after ${new Date(data.blockedUntil).toLocaleTimeString()}`);
        } else {
          setForgotError(data.error || 'Failed to send OTP');
        }
      }
    } catch (error) {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password: Verify OTP
  const handleForgotPasswordVerifyOTP = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');

    console.log('Verifying OTP with:', { sessionId: forgotSessionId, otp: forgotOtp });

    try {
      const response = await fetch(`${API_BASE_URL}/api/forgot-password/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionId: forgotSessionId,
          otp: forgotOtp 
        }),
      });

      const data = await response.json();
      console.log('Verify OTP response:', data);

      if (data.success) {
        setForgotSuccess('OTP verified! Please set your new password.');
        setForgotStep('password');
      } else {
        setAttemptsLeft(data.attemptsLeft || 0);
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
          setResetBlockedUntil(data.blockedUntil);
          setForgotError(`Too many attempts! Blocked until ${new Date(data.blockedUntil).toLocaleTimeString()}`);
        } else if (data.code === 'INVALID_SESSION') {
          setForgotError('Session expired. Please request a new OTP.');
          // Reset to phone step
          setTimeout(() => {
            setForgotStep('phone');
            setForgotSessionId('');
            setForgotOtp('');
          }, 2000);
        } else if (data.code === 'OTP_EXPIRED') {
          setForgotError('OTP has expired. Please request a new one.');
          setTimeout(() => {
            setForgotStep('phone');
            setForgotSessionId('');
            setForgotOtp('');
          }, 2000);
        } else {
          setForgotError(data.error || 'Invalid OTP');
        }
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match!');
      return;
    }

    // Validate password strength (must match backend requirements)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setForgotError('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character (!@#$...)');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/forgot-password/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionId: forgotSessionId,
          otp: forgotOtp,
          newPassword: newPassword
        }),
      });

      const data = await response.json();

      if (data.success) {
        setForgotSuccess('✅ Password reset successfully! Redirecting to login...');
        // Clear form data
        setNewPassword('');
        setConfirmPassword('');
        // Close modal and show login after 2 seconds
        setTimeout(() => {
          closeForgotPasswordModal();
          setSuccess('Password reset successfully! You can now login with your new password.');
        }, 2000);
      } else {
        setForgotError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Close Forgot Password Modal
  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setForgotStep('phone');
    setForgotPhone('');
    setForgotOtp('');
    setForgotSessionId('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotSuccess('');
    setAttemptsLeft(3);
    setResetBlockedUntil(null);
  };

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render login form if user is authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      <div className="d-flex flex-column justify-content-center align-items-center login-container">
        {/* Login Card - Hidden when Forgot Password modal is open */}
        {!showForgotPassword && (
          <div className="card shadow-lg border-0 login-card">
          <div className="card-body p-5">
            {/* Logo Section */}
            <div className="text-center mb-4">
              <div className="logo-container">
                <Image 
                  src={logo} 
                  alt="Urbanesta Realtors Logo" 
                  height={80} 
                  width={80} 
                  className="rounded-circle"
                />
              </div>
              <h1 className="company-title">
                Urbanesta Realtors
              </h1>
              <p className="company-subtitle">
                Admin Panel - Secure Access
              </p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
                <button type="button" className="btn-close" onClick={() => setError('')}></button>
              </div>
            )}

            {success && (
              <div className="alert alert-success alert-dismissible fade show" role="alert">
                <i className="bi bi-check-circle-fill me-2"></i>
                {success}
                <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
              </div>
            )}

            {/* IP Blocked Message */}
            {ipBlocked && (
              <div className="alert alert-warning" role="alert">
                <i className="bi bi-shield-exclamation me-2"></i>
                <strong>Access Blocked</strong><br />
                Too many failed attempts from this IP address.
                {blockedUntil && (
                  <small className="d-block mt-2">
                    Try again after: {new Date(blockedUntil).toLocaleString()}
                  </small>
                )}
              </div>
            )}

            {/* Phone Number Step */}
            {step === 'phone' && !ipBlocked && (
              <form onSubmit={sendOTP}>
                <div className="input-group mb-3">
                  <label htmlFor="phone" className="form-label">
                    <i className="bi bi-phone me-2"></i>
                    Phone Number
                  </label>
                  <input 
                    type="tel" 
                    className="form-control form-control-lg" 
                    id="phone" 
                    placeholder="Enter 10-digit mobile number" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength="10"
                    required
                    disabled={loading}
                  />
                  <div className="form-text">
                    Enter your 10-digit Indian mobile number
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    <i className="bi bi-lock me-2"></i>
                    Password
                  </label>
                  <div className="position-relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      className="form-control form-control-lg pe-5" 
                      id="password" 
                      placeholder="Enter your password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      style={{ paddingRight: '45px' }}
                    />
                    <button
                      className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      style={{ 
                        border: 'none',
                        background: 'transparent',
                        padding: '0.375rem 0.75rem',
                        fontSize: '1rem',
                        zIndex: 10
                      }}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '1.1rem' }}></i>
                    </button>
                  </div>
                  <div className="form-text">
                    Enter your password to verify identity
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-lg w-100 btn-login"
                  disabled={loading || phone.length !== 10 || !password}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>
                      Verify & Send OTP
                    </>
                  )}
                </button>

                <div className="text-center mt-3">
                  <button 
                    type="button"
                    className="btn btn-link text-decoration-none"
                    onClick={() => setShowForgotPassword(true)}
                    disabled={loading}
                  >
                    <i className="bi bi-key me-1"></i>
                    Forgot Password?
                  </button>
                </div>
              </form>
            )}

            {/* OTP Verification Step */}
            {step === 'otp' && !ipBlocked && (
              <form onSubmit={verifyOTP}>
                <div className="text-center mb-3">
                  <h5>Enter OTP</h5>
                  <p className="text-muted">
                    {otpType === 'voice' ? 'Voice call' : 'SMS'} sent to {userName ? `${userName} (${phone})` : phone}
                    {isFallback && <span className="badge bg-warning ms-2">Fallback</span>}
                  </p>
                </div>

                {/* 4-Box OTP Input */}
                <div className="mb-4">
                  <label htmlFor="otp" className="form-label text-center d-block mb-3">
                    <i className="bi bi-key me-2"></i>
                    OTP Code
                  </label>
                  <div className="d-flex justify-content-center gap-2" style={{ gap: '0.75rem' }}>
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        type="text"
                        inputMode="numeric"
                        className="form-control form-control-lg text-center"
                        id={`otp-${index}`}
                        maxLength="1"
                        value={otp[index] || ''}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 1);
                          const newOtp = otp.split('');
                          newOtp[index] = value;
                          const updatedOtp = newOtp.join('').slice(0, 4);
                          setOtp(updatedOtp);
                          
                          // Auto-focus next input
                          if (value && index < 3) {
                            otpInputRefs.current[index + 1]?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          // Handle backspace
                          if (e.key === 'Backspace' && !otp[index] && index > 0) {
                            otpInputRefs.current[index - 1]?.focus();
                          }
                          // Handle arrow keys
                          if (e.key === 'ArrowLeft' && index > 0) {
                            otpInputRefs.current[index - 1]?.focus();
                          }
                          if (e.key === 'ArrowRight' && index < 3) {
                            otpInputRefs.current[index + 1]?.focus();
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
                          setOtp(pastedData);
                          // Focus last input if all 4 digits pasted
                          if (pastedData.length === 4) {
                            otpInputRefs.current[3]?.focus();
                          } else if (pastedData.length > 0) {
                            otpInputRefs.current[pastedData.length - 1]?.focus();
                          }
                        }}
                        required
                        disabled={loading}
                        style={{
                          width: '60px',
                          height: '60px',
                          fontSize: '1.5rem',
                          fontWeight: '600',
                          border: '2px solid #dee2e6',
                          borderRadius: '8px'
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Timer Display */}
                {timeLeft > 0 && (
                  <div className="text-center mb-3">
                    <div className="otp-timer">
                      <i className="bi bi-clock me-2"></i>
                      OTP expires in: <strong className="text-danger">{formatTime(timeLeft)}</strong>
                    </div>
                  </div>
                )}

                <div className="d-grid gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-lg btn-login"
                    disabled={loading || otp.length !== 4 || timeLeft === 0}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Verifying...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Verify OTP
                      </>
                    )}
                  </button>

                  <div className="row">
                    <div className="col-6">
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary w-100"
                        onClick={goBack}
                        disabled={loading}
                      >
                        <i className="bi bi-arrow-left me-2"></i>
                        Back
                      </button>
                    </div>
                    <div className="col-6">
                      <button 
                        type="button" 
                        className="btn btn-outline-primary w-100"
                        onClick={resendOTP}
                        disabled={loading || timeLeft > 0}
                      >
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        Resend
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
            <div className="modal-content shadow-lg" style={{ borderRadius: '12px', border: 'none' }}>
              <div className="modal-header text-white" style={{ 
                background: 'linear-gradient(135deg, #2c5282 0%, #1a365d 100%)',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px',
                padding: '1.5rem'
              }}>
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-key me-2"></i>
                  Reset Password
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={closeForgotPasswordModal}
                  disabled={forgotLoading}
                ></button>
              </div>
              <div className="modal-body" style={{ padding: '2rem' }}>
                {/* Success Message */}
                {forgotSuccess && (
                  <div className="alert alert-success alert-dismissible fade show" role="alert">
                    <i className="bi bi-check-circle me-2"></i>
                    {forgotSuccess}
                    <button type="button" className="btn-close" onClick={() => setForgotSuccess('')}></button>
                  </div>
                )}

                {/* Error Message */}
                {forgotError && (
                  <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {forgotError}
                    <button type="button" className="btn-close" onClick={() => setForgotError('')}></button>
                  </div>
                )}

                {/* Rate Limit Warning */}
                {attemptsLeft < 3 && attemptsLeft > 0 && (
                  <div className="alert alert-warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    <strong>Warning:</strong> {attemptsLeft} attempt(s) remaining (3 max per hour)
                  </div>
                )}

                {/* Step 1: Enter Phone Number */}
                {forgotStep === 'phone' && (
                  <form onSubmit={handleForgotPasswordSendOTP}>
                    <div className="mb-4">
                      <label className="form-label fw-bold text-uppercase" style={{ fontSize: '0.875rem', color: '#2c5282' }}>
                        <i className="bi bi-phone me-2"></i>
                        Phone Number
                      </label>
                      <input 
                        type="tel" 
                        className="form-control form-control-lg" 
                        placeholder="Enter your 10-digit Indian mobile number" 
                        value={forgotPhone} 
                        onChange={(e) => setForgotPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        maxLength="10"
                        required
                        disabled={forgotLoading}
                        style={{ fontSize: '1.1rem', padding: '0.75rem' }}
                      />
                      <div className="form-text" style={{ fontSize: '0.875rem' }}>
                        Enter your registered phone number to reset your password
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-lg w-100"
                      disabled={forgotLoading || forgotPhone.length !== 10}
                      style={{
                        background: forgotPhone.length === 10 && !forgotLoading ? 'linear-gradient(135deg, #2c5282 0%, #1a365d 100%)' : '#6c757d',
                        border: 'none',
                        color: 'white',
                        fontSize: '1.1rem',
                        padding: '0.75rem',
                        fontWeight: '600'
                      }}
                    >
                      {forgotLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Sending OTP...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-send me-2"></i>
                          Send OTP
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Step 2: Enter OTP */}
                {forgotStep === 'otp' && (
                  <form onSubmit={handleForgotPasswordVerifyOTP}>
                    <div className="mb-4">
                      <label className="form-label fw-bold text-uppercase text-center d-block mb-3" style={{ fontSize: '0.875rem', color: '#2c5282' }}>
                        <i className="bi bi-shield-lock me-2"></i>
                        Enter OTP
                      </label>
                      <div className="d-flex justify-content-center gap-2" style={{ gap: '0.75rem' }}>
                        {[0, 1, 2, 3].map((index) => (
                          <input
                            key={index}
                            type="text"
                            inputMode="numeric"
                            className="form-control form-control-lg text-center"
                            id={`forgot-otp-${index}`}
                            maxLength="1"
                            value={forgotOtp[index] || ''}
                            ref={(el) => (forgotOtpInputRefs.current[index] = el)}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 1);
                              const newOtp = forgotOtp.split('');
                              newOtp[index] = value;
                              const updatedOtp = newOtp.join('').slice(0, 4);
                              setForgotOtp(updatedOtp);
                              
                              // Auto-focus next input
                              if (value && index < 3) {
                                forgotOtpInputRefs.current[index + 1]?.focus();
                              }
                            }}
                            onKeyDown={(e) => {
                              // Handle backspace
                              if (e.key === 'Backspace' && !forgotOtp[index] && index > 0) {
                                forgotOtpInputRefs.current[index - 1]?.focus();
                              }
                              // Handle arrow keys
                              if (e.key === 'ArrowLeft' && index > 0) {
                                forgotOtpInputRefs.current[index - 1]?.focus();
                              }
                              if (e.key === 'ArrowRight' && index < 3) {
                                forgotOtpInputRefs.current[index + 1]?.focus();
                              }
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
                              setForgotOtp(pastedData);
                              // Focus last input if all 4 digits pasted
                              if (pastedData.length === 4) {
                                forgotOtpInputRefs.current[3]?.focus();
                              } else if (pastedData.length > 0) {
                                forgotOtpInputRefs.current[pastedData.length - 1]?.focus();
                              }
                            }}
                            required
                            disabled={forgotLoading}
                            style={{
                              width: '60px',
                              height: '60px',
                              fontSize: '1.5rem',
                              fontWeight: '600',
                              border: '2px solid #dee2e6',
                              borderRadius: '8px'
                            }}
                          />
                        ))}
                      </div>
                      <div className="form-text text-center mt-2" style={{ fontSize: '0.875rem' }}>
                        <i className="bi bi-phone-vibrate me-1"></i>
                        OTP sent to +91{forgotPhone}
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-lg w-100"
                      disabled={forgotLoading || forgotOtp.length !== 4}
                      style={{
                        background: forgotOtp.length === 4 && !forgotLoading ? 'linear-gradient(135deg, #2c5282 0%, #1a365d 100%)' : '#6c757d',
                        border: 'none',
                        color: 'white',
                        fontSize: '1.1rem',
                        padding: '0.75rem',
                        fontWeight: '600'
                      }}
                    >
                      {forgotLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Verifying...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          Verify OTP
                        </>
                      )}
                    </button>

                    <button 
                      type="button" 
                      className="btn btn-outline-secondary btn-lg w-100 mt-3"
                      onClick={() => setForgotStep('phone')}
                      disabled={forgotLoading}
                      style={{ fontWeight: '500' }}
                    >
                      <i className="bi bi-arrow-left me-2"></i>
                      Change Phone Number
                    </button>
                  </form>
                )}

                {/* Step 3: Set New Password */}
                {forgotStep === 'password' && (
                  <form onSubmit={handleResetPassword}>
                    <div className="mb-3">
                      <label className="form-label fw-bold text-uppercase" style={{ fontSize: '0.875rem', color: '#2c5282' }}>
                        <i className="bi bi-lock me-2"></i>
                        New Password
                      </label>
                      <div className="position-relative">
                        <input 
                          type={showNewPassword ? "text" : "password"}
                          className="form-control form-control-lg" 
                          placeholder="Enter new password" 
                          value={newPassword} 
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          disabled={forgotLoading}
                          minLength="8"
                          style={{ paddingRight: '45px' }}
                        />
                        <button
                          type="button"
                          className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          tabIndex="-1"
                          style={{ 
                            border: 'none', 
                            background: 'transparent',
                            padding: '0.5rem',
                            textDecoration: 'none'
                          }}
                        >
                          <i className={`bi ${showNewPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '1.2rem' }}></i>
                        </button>
                      </div>
                      <div className="form-text">
                        Password must be at least 8 characters and contain uppercase, lowercase, number, and special character
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold text-uppercase" style={{ fontSize: '0.875rem', color: '#2c5282' }}>
                        <i className="bi bi-lock-fill me-2"></i>
                        Confirm Password
                      </label>
                      <div className="position-relative">
                        <input 
                          type={showConfirmPassword ? "text" : "password"}
                          className="form-control form-control-lg" 
                          placeholder="Confirm new password" 
                          value={confirmPassword} 
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          disabled={forgotLoading}
                          minLength="8"
                          style={{ paddingRight: '45px' }}
                        />
                        <button
                          type="button"
                          className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          tabIndex="-1"
                          style={{ 
                            border: 'none', 
                            background: 'transparent',
                            padding: '0.5rem',
                            textDecoration: 'none'
                          }}
                        >
                          <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '1.2rem' }}></i>
                        </button>
                      </div>
                    </div>

                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                      <div className="alert alert-warning d-flex align-items-center" role="alert">
                        <i className="bi bi-exclamation-triangle-fill me-2" style={{ fontSize: '1.2rem' }}></i>
                        <div>Passwords do not match!</div>
                      </div>
                    )}

                    {newPassword && confirmPassword && newPassword === confirmPassword && (
                      <div className="alert alert-success d-flex align-items-center" role="alert">
                        <i className="bi bi-check-circle-fill me-2" style={{ fontSize: '1.2rem' }}></i>
                        <div>Passwords match!</div>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      className="btn btn-lg w-100 mt-4"
                      disabled={forgotLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                      style={{
                        background: newPassword && confirmPassword && newPassword === confirmPassword && !forgotLoading ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#6c757d',
                        border: 'none',
                        color: 'white',
                        fontSize: '1.1rem',
                        padding: '0.85rem',
                        fontWeight: '600'
                      }}
                    >
                      {forgotLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Resetting Password...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          Reset Password
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}