'use client'
import React, { useState, useEffect, useRef } from "react";
import Image from 'next/image';
import logo from '../public/img/logo.jpg';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function Home(){
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
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
  
  const timerRef = useRef(null);
  // Use environment variable for API URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  
  // API URL configuration

  // Get redirect URL from query params
  const [redirectUrl, setRedirectUrl] = useState('/admin');

  // Redirect to admin page (dashboard) if user is already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Use window.location for immediate redirect
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

    try {
      const url = `${API_BASE_URL}/api/2factor/send-otp`;
      console.log('Sending OTP request to:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: phone }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('OTP sent successfully, sessionId:', data.sessionId);
        setSessionId(data.sessionId);
        setOtpExpiresAt(data.expiresAt);
        setTimeLeft(data.expiresIn);
        setOtpType(data.otpType);
        setIsFallback(data.isFallback);
        setStep('otp');
        setSuccess(data.message);
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
        {/* Login Card */}
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
                
                <button 
                  type="submit" 
                  className="btn btn-lg w-100 btn-login"
                  disabled={loading || phone.length !== 10}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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

            {/* OTP Verification Step */}
            {step === 'otp' && !ipBlocked && (
              <form onSubmit={verifyOTP}>
                <div className="text-center mb-3">
                  <h5>Enter OTP</h5>
                  <p className="text-muted">
                    {otpType === 'voice' ? 'Voice call' : 'SMS'} sent to {phone}
                    {isFallback && <span className="badge bg-warning ms-2">Fallback</span>}
                  </p>
                </div>

                <div className="input-group mb-3">
                  <label htmlFor="otp" className="form-label">
                    <i className="bi bi-key me-2"></i>
                    OTP Code
                  </label>
                  <input 
                    type="text" 
                    className="form-control form-control-lg text-center" 
                    id="otp" 
                    placeholder="Enter OTP" 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength="6"
                    required
                    disabled={loading}
                  />
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
                    disabled={loading || otp.length < 4 || timeLeft === 0}
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
      </div>
    </>
  )
}