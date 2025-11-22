import React, { useEffect } from 'react';
import './TermsAndConditionsModal.css';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabase';

const TermsAndConditionsModal = ({ isOpen, onAgree, onDisagree }) => {
  const { showError } = useNotification();

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('termsModalOpen');
      return () => {
        document.body.classList.remove('termsModalOpen');
      };
    }
  }, [isOpen]);

  const handleAgree = () => {
    onAgree();
  };

  const handleDisagree = async () => {
    try {
      // Set flag to suppress logout notification BEFORE signOut
      // Use explicit 'true' value for reliable checking
      localStorage.setItem('silentLogout', 'true');
      // Remove new signup flag since account creation is being cancelled
      localStorage.removeItem('isNewSignup');
      
      // Verify flag is set before proceeding
      if (localStorage.getItem('silentLogout') !== 'true') {
        // If flag didn't set, try again
        localStorage.setItem('silentLogout', 'true');
      }
      
      // Longer delay to ensure flag is definitely persisted before signOut triggers the event
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Sign out silently without triggering logout notification
      await supabase.auth.signOut();
      
      showError(
        'Account Creation Unsuccessful',
        'You must agree to the Terms and Conditions to create an account. Please try again.',
        { duration: 3000 }
      );
      
      // Small delay to ensure notification is shown before closing modal
      setTimeout(() => {
        onDisagree();
      }, 100);
    } catch (error) {
      console.error('Error signing out:', error);
      // Remove flags if error occurs
      localStorage.removeItem('silentLogout');
      localStorage.removeItem('isNewSignup');
      showError(
        'Account Creation Unsuccessful',
        'You must agree to the Terms and Conditions to create an account. Please try again.',
        { duration: 3000 }
      );
      setTimeout(() => {
        onDisagree();
      }, 100);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="terms-modal-overlay">
      <div className="terms-modal-container">
        <div className="terms-modal-header">
          <h2 className="terms-modal-title">Terms and Conditions</h2>
          <p className="terms-modal-subtitle">
            Please read and accept our Terms and Conditions to continue
          </p>
        </div>

        <div className="terms-modal-content">
          <div className="terms-modal-scrollable">
            <section className="terms-modal-section">
              <p className="terms-modal-text">
                By creating an account with Yohann's Sportswear House, you agree to use our services in accordance with our terms and conditions. You are responsible for maintaining the security and confidentiality of your account credentials, and you must provide accurate information when using our services.
              </p>
              <p className="terms-modal-text">
                When placing orders, you agree to provide complete and accurate information. We accept cash payments upon pickup at our branches or cash on delivery for orders shipped to your address. Production times may vary depending on the complexity of your order, and we will notify you when your order is ready.
              </p>
              <p className="terms-modal-text">
                If you provide custom designs or artwork, you must own or have the legal right to use such content. You are responsible for ensuring that your designs do not infringe on any third-party rights, and we reserve the right to refuse any designs that violate intellectual property rights or are deemed inappropriate.
              </p>
              <p className="terms-modal-text">
                You are responsible for all activities that occur under your account. We reserve the right to suspend or terminate accounts that violate our terms or engage in fraudulent activities. We may modify these terms at any time, and your continued use of our services constitutes acceptance of any changes.
              </p>
              <p className="terms-modal-text">
                For complete details, please visit our full Terms and Conditions page. By clicking "I Agree", you acknowledge that you have read, understood, and agree to be bound by these terms.
              </p>
            </section>
          </div>
        </div>

        <div className="terms-modal-footer">
          <p className="terms-modal-acceptance-text">
            By clicking "I Agree", you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
          </p>
          <div className="terms-modal-buttons">
            <button
              type="button"
              className="terms-modal-btn terms-modal-btn-disagree"
              onClick={handleDisagree}
            >
              I Disagree
            </button>
            <button
              type="button"
              className="terms-modal-btn terms-modal-btn-agree"
              onClick={handleAgree}
            >
              I Agree and Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsModal;

