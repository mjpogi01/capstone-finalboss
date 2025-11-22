import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket, faRightToBracket, faUserPlus, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import SignInModal from '../../components/customer/SignInModal';
import SignUpModal from '../../components/customer/SignUpModal';
import './LogoutPage.css';

const LogoutPage = () => {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const navigate = useNavigate();

  const handleLoginClick = () => {
    setShowSignInModal(true);
  };

  const handleSignUpClick = () => {
    setShowSignUpModal(true);
  };

  const handleLoginSuccess = () => {
    setShowSignInModal(false);
    navigate('/');
  };

  const handleSignUpSuccess = () => {
    setShowSignUpModal(false);
    navigate('/');
  };

  const handleOpenSignUp = () => {
    setShowSignInModal(false);
    setShowSignUpModal(true);
  };

  const handleOpenSignIn = () => {
    setShowSignUpModal(false);
    setShowSignInModal(true);
  };

  return (
    <div className="logout-page">
      <div className="logout-container">
        {/* Left Side - Message */}
        <div className="logout-message-section">
          <div className="logout-icon">
            <FontAwesomeIcon icon={faRightFromBracket} />
          </div>
          
          <h1 className="logout-title">Successfully Logged Out!</h1>
          
          <p className="logout-description">
            Thank you for visiting <span className="brand-highlight">Yohann's Sportswear House</span>. 
            You have been successfully logged out of your account.
          </p>
          
          <p className="logout-welcome">
            We'd love to see you again! Log in to continue shopping for premium sportswear, 
            custom jerseys, and exclusive deals. Don't have an account yet? 
            <span className="highlight-text"> Sign up now</span> and join our community!
          </p>

          <div className="logout-buttons">
            <button className="logout-btn logout-btn-login" onClick={handleLoginClick}>
              LOGIN
            </button>
            <button className="logout-btn logout-btn-signup" onClick={handleSignUpClick}>
              SIGN UP
            </button>
          </div>

          <button className="back-home-link" onClick={() => navigate('/')}>
            ← Back to Homepage
          </button>
        </div>

        {/* Right Side - Login/Signup Form Preview */}
        <div className="logout-form-section">
          <div className="form-preview-card">
            <div className="form-preview-header">
              <h3>Ready to Continue?</h3>
              <p>Choose an option to get started</p>
            </div>

            <div className="form-preview-buttons">
              <button className="preview-btn preview-btn-login" onClick={handleLoginClick}>
                <div className="preview-btn-icon">
                  <FontAwesomeIcon icon={faRightToBracket} />
                </div>
                <div className="preview-btn-content">
                  <span className="preview-btn-title">Login</span>
                  <span className="preview-btn-desc">Access your account</span>
                </div>
              </button>

              <button className="preview-btn preview-btn-signup" onClick={handleSignUpClick}>
                <div className="preview-btn-icon">
                  <FontAwesomeIcon icon={faUserPlus} />
                </div>
                <div className="preview-btn-content">
                  <span className="preview-btn-title">Sign Up</span>
                  <span className="preview-btn-desc">Create new account</span>
                </div>
              </button>
            </div>

            <div className="form-preview-features">
              <div className="feature-item">
                <FontAwesomeIcon icon={faCircleCheck} />
                <span>Premium Sportswear</span>
              </div>
              <div className="feature-item">
                <FontAwesomeIcon icon={faCircleCheck} />
                <span>Custom Jerseys</span>
              </div>
              <div className="feature-item">
                <FontAwesomeIcon icon={faCircleCheck} />
                <span>Fast Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSignInModal && (
        <SignInModal 
          isOpen={showSignInModal} 
          onClose={() => setShowSignInModal(false)}
          onSuccess={handleLoginSuccess}
          onOpenSignUp={handleOpenSignUp}
        />
      )}
      
      {showSignUpModal && (
        <SignUpModal 
          isOpen={showSignUpModal} 
          onClose={() => setShowSignUpModal(false)}
          onSuccess={handleSignUpSuccess}
          onOpenSignIn={handleOpenSignIn}
        />
      )}
    </div>
  );
};

export default LogoutPage;

