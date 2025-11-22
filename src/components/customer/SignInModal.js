import React, { useState, useEffect, useRef } from "react";
import { FcGoogle } from "react-icons/fc";
import { AiOutlineMail, AiOutlineLock } from "react-icons/ai";
import ReCAPTCHA from "react-google-recaptcha";
import styles from "./SignInModal.module.css";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "../../images/yohanns_logo-removebg-preview 3.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { API_URL, getAPI_URL } from "../../config/api";

const SignInModal = ({ isOpen, onClose, onOpenSignUp }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaError, setCaptchaError] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const errorShownRef = useRef(false);
  const { login, signInWithProvider } = useAuth();
  const navigate = useNavigate();

  // reCAPTCHA site key from environment variables
  const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || "6LdUzg8sAAAAAM-2lXxMP1LeK8hYonnF0qC1CF1u";

  // Check if reCAPTCHA script is loaded
  useEffect(() => {
    const checkRecaptchaLoaded = () => {
      return typeof window.grecaptcha !== 'undefined' && 
             typeof window.grecaptcha.render !== 'undefined';
    };

    // Function to load reCAPTCHA script if not already loaded
    const loadRecaptchaScript = () => {
      if (checkRecaptchaLoaded()) {
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        // Check if script is already in the DOM
        const existingScript = document.querySelector('script[src*="recaptcha/api.js"]');
        if (existingScript) {
          // Script exists, wait for it to load
          existingScript.onload = () => {
            if (checkRecaptchaLoaded()) {
              resolve();
            } else {
              reject(new Error('reCAPTCHA script loaded but API not available'));
            }
          };
          existingScript.onerror = () => reject(new Error('reCAPTCHA script failed to load'));
          return;
        }

        // Create and load script
        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          // Wait a bit for grecaptcha to initialize
          setTimeout(() => {
            if (checkRecaptchaLoaded()) {
              resolve();
            } else {
              reject(new Error('reCAPTCHA script loaded but API not available'));
            }
          }, 1000);
        };
        script.onerror = () => reject(new Error('reCAPTCHA script failed to load'));
        document.head.appendChild(script);
      });
    };

    // Wait for reCAPTCHA to load with timeout
    if (isOpen) {
      let timeoutId;
      let mounted = true;

      loadRecaptchaScript()
        .then(() => {
          if (mounted) {
            setCaptchaError(false);
            if (error && error.includes("reCAPTCHA")) {
              setError("");
            }
          }
        })
        .catch((err) => {
          console.warn('reCAPTCHA loading issue:', err);
          if (mounted) {
            setCaptchaError(true);
            // Don't show error immediately - allow user to still sign in
            // Only show warning after delay
            timeoutId = setTimeout(() => {
              if (mounted && !checkRecaptchaLoaded()) {
                setError("reCAPTCHA is unavailable. You can still sign in, but please verify your domain is added in Google reCAPTCHA console.");
              }
            }, 8000); // 8 second timeout - give it more time
          }
        });

      return () => {
        mounted = false;
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [isOpen, error]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("yohannModalOpen");
      // Reset CAPTCHA when modal opens
      setCaptchaVerified(false);
      setCaptchaToken(null);
      errorShownRef.current = false;
      // Don't reset captchaError here - let the check above handle it
      setError("");
      if (captchaRef.current) {
        try {
          captchaRef.current.reset();
        } catch (err) {
          console.warn('reCAPTCHA reset error:', err);
        }
      }
      return () => {
        document.body.classList.remove("yohannModalOpen");
      };
    }
  }, [isOpen]);

  const handleCaptchaChange = async (value) => {
    if (value) {
      // Store the token
      setCaptchaToken(value);
      
      // Verify the token with the backend
      try {
        // Use getAPI_URL() to get the URL dynamically at runtime
        const apiUrl = getAPI_URL();
        const verifyUrl = `${apiUrl}/api/auth/verify-recaptcha`;
        console.log('🔐 Verifying reCAPTCHA at:', verifyUrl);
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
        });
        
        // Create the fetch request
        const fetchPromise = fetch(verifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: value }),
        });

        // Race between fetch and timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          // Server-side verification successful
          setCaptchaVerified(true);
          errorShownRef.current = false;
          if (error && error.includes("CAPTCHA")) {
            setError("");
          }
          setCaptchaError(false);
        } else {
          // Server-side verification failed
          console.error('reCAPTCHA verification failed:', data.error);
          setCaptchaVerified(false);
          setCaptchaError(true);
          setError("reCAPTCHA verification failed. Please try again.");
          // Reset the captcha widget
          if (captchaRef.current) {
            try {
              captchaRef.current.reset();
            } catch (resetError) {
              console.warn('Error resetting reCAPTCHA:', resetError);
            }
          }
        }
      } catch (verifyError) {
        // Network or server error during verification
        console.error('Error verifying reCAPTCHA:', verifyError);
        setCaptchaVerified(false);
        setCaptchaError(true);
        
        // More specific error messages
        if (verifyError.message === 'Request timeout') {
          setError("reCAPTCHA verification timed out. Please try again.");
        } else if (verifyError.message?.includes('Failed to fetch') || verifyError.message?.includes('Connection refused')) {
          setError("Unable to connect to server. Please check your connection and try again.");
        } else {
          setError("Failed to verify reCAPTCHA. Please try again.");
        }
        
        // Reset the captcha widget
        if (captchaRef.current) {
          try {
            captchaRef.current.reset();
          } catch (resetError) {
            console.warn('Error resetting reCAPTCHA:', resetError);
          }
        }
      }
    } else {
      // Token is null (captcha reset)
      setCaptchaToken(null);
      setCaptchaVerified(false);
    }
  };

  const handleCaptchaError = () => {
    // Only show error once to prevent blinking
    if (!errorShownRef.current) {
      errorShownRef.current = true;
      setCaptchaError(true);
      // Don't set error message - allow user to proceed
      // The visual indicator in the UI is enough
      setCaptchaVerified(false);
    }
  };

  const handleCaptchaExpired = () => {
    setCaptchaVerified(false);
    setCaptchaToken(null);
    setError("reCAPTCHA expired. Please verify again.");
  };

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

      const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Validate CAPTCHA (only if not in error state)
        if (!captchaError && !captchaVerified) {
          setError("Please complete the CAPTCHA verification");
          setIsLoading(false);
          return;
        }

        // Require reCAPTCHA verification for login
        if (!captchaVerified) {
          setError("Please complete the reCAPTCHA verification to continue");
          setIsLoading(false);
          return;
        }

        // If CAPTCHA verification failed, don't allow login
        if (captchaError) {
          setError("reCAPTCHA verification is required. Please complete the verification.");
          setIsLoading(false);
          return;
        }

    try {
      const result = await login(formData);
      onClose();

      const user = result.user;
      const role = user.user_metadata?.role || "customer";
      if (role === "owner") {
        navigate("/owner");
      } else if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (error) {
      setError(error.message);
      // Reset CAPTCHA on error
      if (captchaRef.current) {
        captchaRef.current.reset();
        setCaptchaVerified(false);
        setCaptchaToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocial = async (provider) => {
    setIsLoading(true);
    setError("");
    try {
      await signInWithProvider(provider); // Will redirect for OAuth
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.signinModalOverlay} onClick={onClose}>
      <div className={styles.signinModal} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          className={styles.signinCloseBtn}
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Modal Content Wrapper */}
        <div className={styles.signinModalContent}>
          {/* Header - Logo & Title */}
          <div className={styles.signinHeader}>
            <img
              src={logo}
              alt="Yohann's Sportswear House"
              className={styles.signinLogo}
            />
            <div>
              <h1 className={styles.signinTitle}>Welcome Back!</h1>
              <p className={styles.signinSubtitle}>Sign in to continue your journey.</p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className={styles.signinErrorAlert}>
              <span className={styles.signinErrorIcon}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form - Primary */}
          <form className={styles.signinForm} onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className={styles.signinFormGroup}>
              <label className={styles.signinLabel}>Email</label>
              <div className={styles.signinInputWrapper}>
                <AiOutlineMail className={styles.signinInputIcon} />
                <input
                  type="email"
                  name="email"
                  className={styles.signinInput}
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className={styles.signinFormGroup}>
              <div className={styles.signinPasswordHeader}>
                <label className={styles.signinLabel}>Password</label>
                <button
                  type="button"
                  className={styles.signinForgotLink}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowForgotPassword(true);
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className={styles.signinInputWrapper}>
                <AiOutlineLock className={styles.signinInputIcon} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className={styles.signinInput}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className={styles.signinPasswordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            {/* reCAPTCHA */}
            <div className={styles.signinCaptchaContainer}>
              {!captchaError && typeof window.grecaptcha !== 'undefined' && typeof window.grecaptcha.render !== 'undefined' ? (
                <ReCAPTCHA
                  ref={captchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={handleCaptchaChange}
                  onErrored={handleCaptchaError}
                  onExpired={handleCaptchaExpired}
                  theme="dark"
                />
              ) : (
                <div style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  color: '#ffa500',
                  fontSize: '0.85rem',
                  backgroundColor: 'rgba(255, 165, 0, 0.1)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 165, 0, 0.3)',
                  margin: '10px 0'
                }}>
                  ⚠️ reCAPTCHA unavailable. You can still sign in.
                  <br />
                  <small style={{ fontSize: '0.75rem', opacity: 0.8, display: 'block', marginTop: '4px' }}>
                    Domain configuration: Ensure <code style={{ fontSize: '0.7rem', backgroundColor: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: '3px' }}>{typeof window !== 'undefined' ? window.location.hostname : 'your-domain.com'}</code> is added to Google reCAPTCHA domains.
                  </small>
                </div>
              )}
            </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  className={styles.signinSignInBtn}
                  disabled={isLoading || (!captchaError && !captchaVerified)}
                >
              {isLoading ? (
                <>
                  <span className={styles.signinSpinner}></span>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className={styles.signinDivider}>
            <span>OR</span>
          </div>

          {/* Social Buttons - Secondary */}
          <div className={styles.signinSocialButtons}>
            <button
              type="button"
              className={styles.signinSocialBtn}
              onClick={() => handleSocial("Google")}
              aria-label="Sign in with Google"
            >
              <FcGoogle />
              <span>Sign in with Google</span>
            </button>
          </div>

          {/* Sign Up Prompt */}
          <div className={styles.signinSignUpPrompt}>
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                className={styles.signinSignUpLink}
                onClick={onOpenSignUp}
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        initialEmail={formData.email}
      />
    </div>
  );
};

export default SignInModal;

