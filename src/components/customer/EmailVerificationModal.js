import React, { useState, useEffect, useRef } from 'react';
import './EmailVerificationModal.css';
import { API_URL } from '../../config/api';

const EmailVerificationModal = ({ isOpen, onClose, email, onVerified, userName = null }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const inputRefs = useRef([]);

  const hasSentCodeRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Auto-send code when modal opens (only once)
      if (!hasSentCodeRef.current) {
        hasSentCodeRef.current = true;
        sendCode();
      }
      // Reset code inputs
      setCode(['', '', '', '', '', '']);
      setError('');
      setTimeLeft(600);
      setCountdown(60); // Can resend after 60 seconds
      // Focus first input
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
    } else {
      // Reset flag when modal closes so it can send again if reopened
      hasSentCodeRef.current = false;
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (isOpen && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, isOpen]);

  // Time left timer
  useEffect(() => {
    if (isOpen && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isOpen && timeLeft === 0) {
      setError('Verification code has expired. Please request a new code.');
    }
  }, [timeLeft, isOpen]);

  const sendCode = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verification/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, userName }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Don't show error if email service is not configured (for development)
        if (data.warning) {
          console.warn('Email service not configured:', data.warning);
          return;
        }
        throw new Error(data.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      // Don't set error - allow user to resend
    }
  };

  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value && newCode.every(digit => digit !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newCode = [...code];
        digits.forEach((digit, i) => {
          if (i < 6) {
            newCode[i] = digit;
          }
        });
        setCode(newCode);
        if (digits.length === 6) {
          handleVerify(digits.join(''));
        } else {
          inputRefs.current[Math.min(digits.length, 5)]?.focus();
        }
      });
    }
  };

  const handleVerify = async (codeToVerify = null) => {
    const codeString = codeToVerify || code.join('');
    
    if (codeString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/verification/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code: codeString }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      // Code verified successfully
      if (onVerified) {
        onVerified(data);
      }

    } catch (error) {
      console.error('Error verifying code:', error);
      setError(error.message || 'Invalid verification code');
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) {
      return;
    }

    setIsResending(true);
    setError('');
    setCode(['', '', '', '', '', '']);
    setTimeLeft(600); // Reset timer
    setCountdown(60); // Can resend again after 60 seconds

    try {
      const response = await fetch(`${API_URL}/api/auth/verification/resend-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, userName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification code');
      }

      // Reset the sent flag when manually resending
      hasSentCodeRef.current = true;

      // Focus first input
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
    } catch (error) {
      console.error('Error resending code:', error);
      setError(error.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="email-verification-overlay" onClick={onClose}>
      <div className="email-verification-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="email-verification-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>

        <div className="email-verification-content">
          <div className="email-verification-header">
            <div className="email-verification-icon">✉️</div>
            <h2>Verify Your Email</h2>
            <p>We've sent a verification code to</p>
            <p className="email-verification-email">{email}</p>
          </div>

          {error && (
            <div className="email-verification-error">
              <span className="email-verification-error-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="email-verification-code-container">
            <label className="email-verification-label">Enter Verification Code</label>
            <div className="email-verification-inputs">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="email-verification-input"
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isLoading}
                  autoFocus={index === 0}
                />
              ))}
            </div>
            {timeLeft > 0 && (
              <p className="email-verification-timer">
                Code expires in: <strong>{formatTime(timeLeft)}</strong>
              </p>
            )}
          </div>

          <div className="email-verification-actions">
            <button
              type="button"
              className="email-verification-verify-btn"
              onClick={() => handleVerify()}
              disabled={isLoading || code.some(digit => !digit)}
            >
              {isLoading ? (
                <>
                  <span className="email-verification-spinner"></span>
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </button>

            <button
              type="button"
              className="email-verification-resend-btn"
              onClick={handleResend}
              disabled={isResending || countdown > 0}
            >
              {isResending ? (
                'Sending...'
              ) : countdown > 0 ? (
                `Resend Code (${countdown}s)`
              ) : (
                'Resend Code'
              )}
            </button>
          </div>

          <p className="email-verification-help">
            Didn't receive the code? Check your spam folder or click "Resend Code".
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationModal;
