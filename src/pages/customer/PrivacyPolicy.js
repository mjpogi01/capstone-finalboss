import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="privacy-container">
      <div className="privacy-wrapper">
        {/* Hero Section */}
        <div className="privacy-hero">
          <h1 className="privacy-title page-title">
            Privacy Policy
          </h1>
          <p className="privacy-subtitle">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </p>
          <p className="privacy-effective-date">
            Last Updated: January 2025
          </p>
        </div>

        {/* Privacy Policy Content */}
        <div className="privacy-content">
          <section className="privacy-section">
            <h2 className="privacy-section-title">1. Information We Collect</h2>
            <p className="privacy-text">
              We collect information that you provide directly to us when you:
            </p>
            <ul className="privacy-list">
              <li>Create an account or profile</li>
              <li>Place an order for products or services</li>
              <li>Contact us for customer support</li>
            </ul>
            <p className="privacy-text">
              The information we collect may include your name, email address, phone number, shipping address, billing information, and any other information you choose to provide.
            </p>
          </section>

          <section className="privacy-section">
            <h2 className="privacy-section-title">2. How We Use Your Information</h2>
            <p className="privacy-text">
              We use the information we collect to:
            </p>
            <ul className="privacy-list">
              <li>Process and fulfill your orders</li>
              <li>Communicate with you about your orders, products, services, and promotional offers</li>
              <li>Provide customer support and respond to your inquiries</li>
              <li>Improve our products, services, and customer experience</li>
              <li>Detect, prevent, and address technical issues and security concerns</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2 className="privacy-section-title">3. Information Sharing and Disclosure</h2>
            <p className="privacy-text">
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </p>
            <ul className="privacy-list">
              <li><strong>Service Providers:</strong> We may share information with third-party service providers who perform services on our behalf, such as payment processing, shipping, and data analysis.</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid requests by public authorities.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2 className="privacy-section-title">4. Data Security</h2>
            <p className="privacy-text">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="privacy-section">
            <h2 className="privacy-section-title">5. Cookies and Tracking Technologies</h2>
            <p className="privacy-text">
              We use cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, and understand where our visitors are coming from. You can control cookies through your browser settings, but note that disabling cookies may affect the functionality of our website.
            </p>
          </section>

          <section className="privacy-section">
            <h2 className="privacy-section-title">6. Third-Party Links</h2>
            <p className="privacy-text">
              Our website may contain links to third-party websites or services. We are not responsible for the privacy practices or content of these third-party sites. We encourage you to review the privacy policies of any third-party sites you visit.
            </p>
          </section>

          <section className="privacy-section">
            <h2 className="privacy-section-title">7. Children's Privacy</h2>
            <p className="privacy-text">
              Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          <section className="privacy-section">
            <h2 className="privacy-section-title">8. Changes to This Privacy Policy</h2>
            <p className="privacy-text">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section className="privacy-section">
            <h2 className="privacy-section-title">9. Contact Us</h2>
            <p className="privacy-text">
              If you have any questions or concerns about this Privacy Policy or our privacy practices, please contact us:
            </p>
            <div className="privacy-contact-info">
              <p><strong>Email:</strong> yohanns.sportswear@gmail.com</p>
              <p><strong>Phone:</strong> (043) 300-1633 / 0917 139 5661</p>
              <p><strong>Address:</strong> Villa Maria Subdivision Sambat, San Pascual, 4204 Batangas</p>
            </div>
          </section>
        </div>

        {/* Contact Section */}
        <div className="privacy-contact">
          <h2 className="privacy-contact-title">
            Have Questions About Our Privacy Policy?
          </h2>
          <p className="privacy-contact-description">
            Contact us directly for more information
          </p>
          <div className="privacy-contact-buttons">
            <a href="/branches" className="privacy-contact-button primary">
              Visit Our Branches
            </a>
            <button 
              onClick={() => navigate('/contacts')} 
              className="privacy-contact-button secondary"
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

