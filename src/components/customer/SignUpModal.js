import React, { useState, useEffect } from "react";
import { FcGoogle } from "react-icons/fc";
import { AiOutlineMail, AiOutlineLock, AiOutlinePhone } from "react-icons/ai";
import styles from "./SignUpModal.module.css";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import { useModal } from "../../contexts/ModalContext";
import logo from "../../images/yohanns_logo-removebg-preview 3.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import TermsAndConditionsModal from "./TermsAndConditionsModal";
import EmailVerificationModal from "./EmailVerificationModal";
import authService from "../../services/authService";
import { quickValidateEmail, validateEmailWithBackend } from "../../utils/emailValidator";

const SignUpModal = ({ isOpen, onClose, onOpenSignIn }) => {
  const [formData, setFormData] = useState({
    email: "",
    contact: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingUserData, setPendingUserData] = useState(null);
  const { register, signInWithProvider } = useAuth();
  const { showSuccess, showError } = useNotification();
  const { openSignUp } = useModal();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("yohannModalOpen");
      return () => {
        document.body.classList.remove("yohannModalOpen");
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear email error when user types
    if (name === 'email' && emailError) {
      setEmailError("");
    }
  };

  const handleEmailBlur = async (e) => {
    const email = e.target.value.trim();
    
    if (!email) {
      setEmailError("");
      return;
    }

    // Quick format validation first
    const quickCheck = quickValidateEmail(email);
    if (!quickCheck.valid) {
      setEmailError(quickCheck.error);
      return;
    }

    // Backend validation (domain check)
    setIsValidatingEmail(true);
    try {
      const result = await validateEmailWithBackend(email);
      if (!result.valid) {
        setEmailError(result.errors.join('. '));
      } else {
        setEmailError("");
      }
    } catch (error) {
      console.error('Error validating email:', error);
      // Keep quick validation error if backend fails
      setEmailError("");
    } finally {
      setIsValidatingEmail(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setEmailError("");

    // Validate email format first
    const quickEmailCheck = quickValidateEmail(formData.email);
    if (!quickEmailCheck.valid) {
      setEmailError(quickEmailCheck.error);
      setIsLoading(false);
      return;
    }

    // Validate email with backend (includes format, disposable, and domain checks)
    // SMTP verification is attempted but won't block valid emails if verification is unavailable
    try {
      const emailValidation = await validateEmailWithBackend(formData.email);
      if (!emailValidation.valid) {
        // Email validation failed (format invalid, disposable, or domain doesn't exist) - reject signup
        setEmailError(emailValidation.errors.join('. '));
        setIsLoading(false);
        return;
      }
      
      // If validation passed, allow signup to proceed
      // Warnings don't block signup - user will verify via email code
      // If email is fake, they won't receive the code anyway
    } catch (validationError) {
      console.error('Email validation error:', validationError);
      // On validation error, still allow signup - they'll verify via code
      // Only reject if validation explicitly fails (format/disposable/domain errors)
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const userData = {
        email: formData.email,
        password: formData.password,
        phone: formData.contact,
      };

      // Set flag to suppress welcome back notification for new signup
      localStorage.setItem('isNewSignup', 'true');
      
      const result = await register(userData);
      console.log("Sign up successful:", result);
      
      // Store pending user data for verification
      if (result.needsVerification && result.userData) {
        const pendingData = {
          ...result.userData,
          email: formData.email,
          password: formData.password,
          phone: formData.contact,
        };
        setPendingUserData(pendingData);
        
        // Don't send code here - EmailVerificationModal will send it automatically when it opens
        // This prevents duplicate emails
        
        // Show verification modal instead of terms modal (it will auto-send code)
        setShowVerificationModal(true);
      } else {
        // Show terms and conditions modal after successful signup (fallback)
        setShowTermsModal(true);
      }
    } catch (error) {
      // Remove flag if signup fails
      localStorage.removeItem('isNewSignup');
      setError(error.message);
      console.error("Sign up error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSuccess = async (verificationResult) => {
    try {
      console.log("Verification successful:", verificationResult);
      
      // Complete signup after verification (create profile)
      if (pendingUserData && pendingUserData.userId) {
        await authService.completeSignupAfterVerification(
          pendingUserData.userId,
          pendingUserData
        );
      }

      // Close verification modal
      setShowVerificationModal(false);
      
      // Show terms and conditions modal
      setShowTermsModal(true);
    } catch (error) {
      console.error("Error completing signup:", error);
      showError('Error', 'Failed to complete registration. Please try signing in.');
      // Close verification modal on error
      setShowVerificationModal(false);
      // Reset form
      setFormData({
        email: "",
        contact: "",
        password: "",
        confirmPassword: "",
      });
    }
  };

  const handleVerificationClose = () => {
    setShowVerificationModal(false);
    // Reset form when verification modal is closed
    setFormData({
      email: "",
      contact: "",
      password: "",
      confirmPassword: "",
    });
    setPendingUserData(null);
    // Remove signup flag
    localStorage.removeItem('isNewSignup');
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

  const handleTermsAgree = () => {
    setShowTermsModal(false);
    showSuccess(
      'Account Created Successfully!',
      'Welcome to Yohann\'s Sportswear House! Your account has been created.'
    );
    // Reset form
    setFormData({
      email: "",
      contact: "",
      password: "",
      confirmPassword: "",
    });
    setError("");
    // Close signup modal and open sign-in modal
    onClose();
    // Small delay to ensure signup modal is closed before opening sign-in modal
    setTimeout(() => {
      onOpenSignIn();
    }, 100);
  };

  const handleTermsDisagree = () => {
    setShowTermsModal(false);
    // Close the signup modal
    onClose();
    // Reopen signup modal after a short delay to allow notification to show
    setTimeout(() => {
      // The notification will be shown by TermsAndConditionsModal
      // Reopen the signup modal so user can try again
      openSignUp();
    }, 800);
  };

  return (
    <div className={styles.signupModalOverlay} onClick={onClose}>
      <div className={styles.signupModal} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          className={styles.signupCloseBtn}
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Modal Content Wrapper */}
        <div className={styles.signupModalContent}>
          {/* Header - Logo & Title */}
          <div className={styles.signupHeader}>
            <img
              src={logo}
              alt="Yohann's Sportswear House"
              className={styles.signupLogo}
            />
            <div>
              <h1 className={styles.signupTitle}>Create Account</h1>
              <p className={styles.signupSubtitle}>Join us today and start shopping.</p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className={styles.signupErrorAlert}>
              <span className={styles.signupErrorIcon}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form - Primary */}
          <form className={styles.signupForm} onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className={styles.signupFormGroup}>
              <label className={styles.signupLabel}>Email</label>
              <div className={styles.signupInputWrapper}>
                <AiOutlineMail className={styles.signupInputIcon} />
                <input
                  type="email"
                  name="email"
                  className={`${styles.signupInput} ${emailError ? styles.signupInputError : ''}`}
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleEmailBlur}
                  required
                  disabled={isLoading || isValidatingEmail}
                />
                {isValidatingEmail && (
                  <span className={styles.signupValidating}>Validating...</span>
                )}
              </div>
              {emailError && (
                <div className={styles.signupFieldError}>
                  <span className={styles.signupErrorIcon}>!</span>
                  <span>{emailError}</span>
                </div>
              )}
            </div>

            {/* Phone Field */}
            <div className={styles.signupFormGroup}>
              <label className={styles.signupLabel}>Phone</label>
              <div className={styles.signupInputWrapper}>
                <AiOutlinePhone className={styles.signupInputIcon} />
                <input
                  type="tel"
                  name="contact"
                  className={styles.signupInput}
                  placeholder="Phone number"
                  value={formData.contact}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className={styles.signupFormGroup}>
              <label className={styles.signupLabel}>Password</label>
              <div className={styles.signupInputWrapper}>
                <AiOutlineLock className={styles.signupInputIcon} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className={styles.signupInput}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className={styles.signupPasswordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className={styles.signupFormGroup}>
              <label className={styles.signupLabel}>Confirm Password</label>
              <div className={styles.signupInputWrapper}>
                <AiOutlineLock className={styles.signupInputIcon} />
                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirmPassword"
                  className={styles.signupInput}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className={styles.signupPasswordToggle}
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label="Toggle confirm password visibility"
                  title={showConfirm ? "Hide password" : "Show password"}
                >
                  <FontAwesomeIcon icon={showConfirm ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              className={styles.signupSignUpBtn}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className={styles.signupSpinner}></span>
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className={styles.signupDivider}>
            <span>OR</span>
          </div>

          {/* Social Buttons - Secondary */}
          <div className={styles.signupSocialButtons}>
            <button
              type="button"
              className={styles.signupSocialBtn}
              onClick={() => handleSocial("Google")}
              aria-label="Sign up with Google"
            >
              <FcGoogle />
              <span>Sign up with Google</span>
            </button>
          </div>

          {/* Sign In Prompt */}
          <div className={styles.signupSignInPrompt}>
            <p>
              Already have an account?{" "}
              <button
                type="button"
                className={styles.signupSignInLink}
                onClick={onOpenSignIn}
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showVerificationModal}
        onClose={handleVerificationClose}
        email={formData.email}
        onVerified={handleVerificationSuccess}
        userName={null}
      />

      {/* Terms and Conditions Modal */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onAgree={handleTermsAgree}
        onDisagree={handleTermsDisagree}
      />
    </div>
  );
};

export default SignUpModal;
