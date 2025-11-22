import React from 'react';
import { useNavigate } from 'react-router-dom';
import './DataDeletion.css';

const DataDeletion = () => {
  const navigate = useNavigate();

  return (
    <div className="data-deletion-container">
      <div className="data-deletion-wrapper">
        {/* Hero Section */}
        <div className="data-deletion-hero">
          <h1 className="data-deletion-title page-title">
            Data Deletion Instructions
          </h1>
          <p className="data-deletion-subtitle">
            Learn how to request deletion of your personal data from our platform.
          </p>
          <p className="data-deletion-effective-date">
            Last Updated: January 2025
          </p>
        </div>

        {/* Data Deletion Content */}
        <div className="data-deletion-content">
          <section className="data-deletion-section">
            <h2 className="data-deletion-section-title">How to Request Data Deletion</h2>
            <p className="data-deletion-text">
              If you wish to delete your account and all associated data from Yohanns, you can do so through the following methods:
            </p>
            <ol className="data-deletion-list">
              <li>
                <strong>Through Your Account Settings:</strong>
                <ul>
                  <li>Log in to your account</li>
                  <li>Go to your Profile page</li>
                  <li>Navigate to the "Account Actions" section</li>
                  <li>Click on "Delete Account" and follow the instructions</li>
                </ul>
              </li>
              <li>
                <strong>By Contacting Us Directly:</strong>
                <ul>
                  <li>Send an email to our support team requesting account deletion</li>
                  <li>Include your registered email address for verification</li>
                  <li>We will process your request within 30 days</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="data-deletion-section">
            <h2 className="data-deletion-section-title">What Data Will Be Deleted</h2>
            <p className="data-deletion-text">
              When you request account deletion, the following data will be permanently removed:
            </p>
            <ul className="data-deletion-list">
              <li>Your user account and profile information</li>
              <li>Personal information (name, email, phone number, address)</li>
              <li>Order history and transaction records</li>
              <li>Shopping cart and wishlist data</li>
              <li>Chat messages and communication history</li>
              <li>Design preferences and customizations</li>
              <li>All other data associated with your account</li>
            </ul>
          </section>

          <section className="data-deletion-section">
            <h2 className="data-deletion-section-title">Processing Time</h2>
            <p className="data-deletion-text">
              Once you submit a data deletion request:
            </p>
            <ul className="data-deletion-list">
              <li>We will acknowledge your request within 24 hours</li>
              <li>We will process and complete the deletion within 30 days</li>
              <li>You will receive a confirmation email once the deletion is complete</li>
              <li>After deletion, your account cannot be recovered</li>
            </ul>
          </section>

          <section className="data-deletion-section">
            <h2 className="data-deletion-section-title">Important Notes</h2>
            <ul className="data-deletion-list">
              <li><strong>Irreversible Action:</strong> Account deletion is permanent and cannot be undone. Please ensure you want to proceed before confirming.</li>
              <li><strong>Active Orders:</strong> If you have pending orders, please allow them to be completed or cancelled before requesting deletion.</li>
              <li><strong>Legal Requirements:</strong> Some data may be retained as required by law or for legitimate business purposes (e.g., financial transaction records).</li>
              <li><strong>Third-Party Services:</strong> If you signed in using third-party services (Google), you may need to revoke access separately from those services.</li>
            </ul>
          </section>

          <section className="data-deletion-section">
            <h2 className="data-deletion-section-title">Contact Information</h2>
            <p className="data-deletion-text">
              If you have questions about data deletion or need assistance, please contact us:
            </p>
            <div className="data-deletion-contact-info">
              <p>
                <strong>Email:</strong> support@yohanns.com
              </p>
              <p>
                <strong>Response Time:</strong> We typically respond within 24-48 hours
              </p>
            </div>
          </section>
        </div>

        {/* Contact Section */}
        <div className="data-deletion-contact">
          <h2 className="data-deletion-contact-title">
            Need Help with Data Deletion?
          </h2>
          <p className="data-deletion-contact-description">
            Contact us directly for assistance
          </p>
          <div className="data-deletion-contact-buttons">
            <button 
              onClick={() => navigate('/contacts')} 
              className="data-deletion-contact-button primary"
            >
              Contact Us
            </button>
            <button 
              onClick={() => navigate('/privacy')} 
              className="data-deletion-contact-button secondary"
            >
              View Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataDeletion;

