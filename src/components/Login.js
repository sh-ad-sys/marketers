import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState(null); // 'admin' or 'marketer' - detected after email
  const [otpSent, setOtpSent] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    phone: '',
    otp: ''
  });

  const navigate = useNavigate();

  // First step: detect user type by email
  const handleDetectUserType = async (e) => {
    e.preventDefault();
    if (!loginData.email) {
      setError('Please enter your email address');
      return;
    }

    // For admin, check against admin email
    if (loginData.email === 'admin@plotconnectmarketers.com') {
      setUserType('admin');
      setError('');
      return;
    }

    // For marketer, just show the phone/OTP fields
    // The actual verification happens when they submit
    setUserType('marketer');
    setDetecting(false);
  };

  const handleRequestOtp = async () => {
    if (!loginData.email || !loginData.phone) {
      setError('Please enter email and phone number to request OTP');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const result = await api.login('request_otp', {
        email: loginData.email,
        phone: loginData.phone
      });
      
      if (result.success) {
        setSuccessMessage('OTP sent to your email!');
        setOtpSent(true);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.message || 'Failed to send OTP');
      }
    } catch (err) {
      console.error('Request OTP error:', err);
      setError('Failed to request OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    let result;
    try {
      if (userType === 'admin') {
        // Admin login with email and password
        result = await api.login('admin', {
          email: loginData.email,
          password: loginData.password
        });

        if (result.success) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('role', 'admin');
          localStorage.setItem('username', result.data?.email || result.username || 'admin');
          localStorage.setItem('name', result.data?.name || 'Admin');
          if (result.token) {
            localStorage.setItem('token', result.token);
          }
          setSuccessMessage('Login successful!');
          setTimeout(() => {
            setSuccessMessage(null);
            navigate('/admin');
          }, 1500);
          return;
        }
      } else {
        // Marketer login with email, phone, and OTP
        if (!otpSent) {
          await handleRequestOtp();
          return;
        }
        
        result = await api.login('marketer', {
          email: loginData.email,
          phone: loginData.phone,
          otp: loginData.otp
        });

        if (result.success) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('role', 'marketer');
          localStorage.setItem('name', result.data?.name || result.name || loginData.email);
          if (result.data?.marketer_id) {
            localStorage.setItem('marketerId', result.data.marketer_id);
          }
          if (result.token) {
            localStorage.setItem('token', result.token);
          }
          setSuccessMessage('Login successful!');
          setTimeout(() => {
            setSuccessMessage(null);
            navigate('/dashboard');
          }, 1500);
          return;
        }
      }

      setError(result?.message || 'Invalid credentials. Please check your information.');
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setUserType(null);
    setOtpSent(false);
    setLoginData({ ...loginData, password: '', phone: '', otp: '' });
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="user-dashboard">
      <div className="user-dashboard-header" style={{ justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>PlotConnect</h1>
          <p className="user-subtitle">Sign in to manage your properties</p>
        </div>
      </div>

      <div className="user-card" style={{ maxWidth: '450px', margin: '0 auto', width: '90%' }}>
        <h2 className="user-card-title" style={{ textAlign: 'center' }}>
          {userType === 'admin' ? 'Admin Login' : userType === 'marketer' ? 'Marketer Login' : 'Login'}
        </h2>

        {error && (
          <div className="user-alert user-alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{ 
            marginBottom: '1rem', 
            background: '#d1fae5', 
            color: '#065f46',
            padding: '1rem',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            margin: '0 auto 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 1s ease-in-out',
          }}>
            <svg 
              width="40" 
              height="40" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: 'draw 0.5s ease-out forwards' }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <style>{`
              @keyframes draw {
                0% { stroke-dasharray: 100; stroke-dashoffset: 100; }
                100% { stroke-dasharray: 100; stroke-dashoffset: 0; }
              }
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
              }
            `}</style>
          </div>
        )}

        {!userType ? (
          // Step 1: Enter email to detect user type
          <form onSubmit={handleDetectUserType}>
            <div className="user-form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="input"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                placeholder="Enter your email"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={detecting} 
              style={{ 
                width: '100%', 
                marginTop: '1.5rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center'
              }} 
            >
              {detecting ? 'Detecting...' : 'Continue'}
            </button>
          </form>
        ) : (
          // Step 2: Show password for admin or phone+OTP for marketer
          <form onSubmit={handleLogin}>
            {/* Show email as read-only */}
            <div className="user-form-group">
              <label>Email</label>
              <input
                type="email"
                className="input"
                value={loginData.email}
                disabled
                style={{ background: '#f3f4f6' }}
              />
            </div>

            {/* Admin: Password field */}
            {userType === 'admin' && (
              <div className="user-form-group">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    placeholder="Enter your password"
                    required
                    style={{ paddingRight: '4rem' }}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      cursor: 'pointer',
                      color: '#6366f1'
                    }}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Marketer: Phone field (first time) */}
            {userType === 'marketer' && !otpSent && (
              <div className="user-form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  className="input"
                  value={loginData.phone}
                  onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                  required
                />
              </div>
            )}

            {/* Marketer: OTP field (after OTP sent) */}
            {userType === 'marketer' && otpSent && (
              <div className="user-form-group">
                <label>One-Time Password (OTP)</label>
                <input
                  type="text"
                  className="input"
                  value={loginData.otp}
                  onChange={(e) => setLoginData({ ...loginData, otp: e.target.value })}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  required
                  style={{ letterSpacing: '3px', textAlign: 'center', fontSize: '1.2rem' }}
                />
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                  OTP sent to your email. Valid for 30 seconds.
                </p>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading} 
              style={{ 
                width: '100%', 
                marginTop: '1.5rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }} 
            >
              {loading 
                ? (userType === 'marketer' && !otpSent ? 'Sending OTP...' : 'Logging in...') 
                : (userType === 'marketer' && !otpSent ? 'Send OTP' : 'Login')}
            </button>

            {/* Back button */}
            <button 
              type="button"
              onClick={handleBack}
              disabled={loading}
              style={{ 
                width: '100%', 
                marginTop: '0.75rem',
                background: 'none',
                border: 'none',
                color: '#6366f1',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }} 
            >
              ← Back
            </button>

            {/* Resend OTP link */}
            {userType === 'marketer' && otpSent && (
              <button 
                type="button"
                onClick={handleRequestOtp}
                disabled={loading}
                style={{ 
                  width: '100%', 
                  marginTop: '0.5rem',
                  background: 'none',
                  border: 'none',
                  color: '#6366f1',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }} 
              >
                Didn't receive OTP? Resend
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
