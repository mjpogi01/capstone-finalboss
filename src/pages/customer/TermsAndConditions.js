import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TermsAndConditions.css';

const TermsAndConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="terms-container">
      <div className="terms-wrapper">
        {/* Hero Section */}
        <div className="terms-hero">
          <h1 className="terms-title page-title">
            Terms and Conditions
          </h1>
          <p className="terms-subtitle">
            Please read these terms carefully before using our services or making a purchase.
          </p>
          <p className="terms-effective-date">
            Last Updated: January 2025
          </p>
        </div>

        {/* Terms Content */}
        <div className="terms-content">
          <section className="terms-section">
            <h2 className="terms-section-title">1. Acceptance of Terms</h2>
            <p className="terms-text">
              By accessing and using Yohann's Sportswear House website and services, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="terms-section">
            <h2 className="terms-section-title">2. Products and Services</h2>
            <p className="terms-text">
              We offer custom sportswear including jerseys, t-shirts, uniforms, and accessories. Product descriptions, images, and prices are subject to change without notice. We reserve the right to limit quantities and refuse orders.
            </p>
            <ul className="terms-list">
              <li>All products are subject to availability</li>
              <li>We reserve the right to modify or discontinue products at any time</li>
              <li>Prices are subject to change without prior notice</li>
              <li>Custom designs may require additional time for production</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2 className="terms-section-title">3. Orders and Payment</h2>
            <p className="terms-text">
              By placing an order, you agree to provide accurate and complete information. We reserve the right to refuse or cancel any order for any reason.
            </p>
            <ul className="terms-list">
              <li><strong>Payment Methods:</strong> We only accept Cash on Delivery (COD) for delivery orders and payment upon pickup at our branches.</li>
              <li><strong>Pick Up Orders:</strong> Payment must be made in full when you pick up your order at the selected branch location. No advance payment is required.</li>
              <li><strong>Cash on Delivery (COD):</strong> For delivery orders, payment is made in cash when the order is delivered to your specified address. A delivery fee of ₱50.00 applies to COD orders.</li>
              <li><strong>Order Confirmation:</strong> You will receive an order confirmation via email. This does not guarantee acceptance of your order.</li>
              <li><strong>Pricing Errors:</strong> We reserve the right to correct any pricing errors, even after an order has been placed.</li>
              <li><strong>No Online Payment:</strong> We do not accept online payments, credit cards, or bank transfers. All payments are made in cash either at pickup or upon delivery.</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2 className="terms-section-title">4. Custom Designs and Intellectual Property</h2>
            <p className="terms-text">
              When you provide custom designs or artwork:
            </p>
            <ul className="terms-list">
              <li>You represent and warrant that you own or have the right to use all designs, artwork, and content you provide</li>
              <li>You grant us a license to use your designs for the purpose of fulfilling your order</li>
              <li>You are responsible for ensuring your designs do not infringe on any third-party rights</li>
              <li>We reserve the right to refuse to produce designs that violate intellectual property rights or are inappropriate</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2 className="terms-section-title">5. Production and Delivery</h2>
            <p className="terms-text">
              Production times vary based on order complexity and current workload:
            </p>
            <ul className="terms-list">
              <li><strong>Standard Orders:</strong> 3-5 business days</li>
              <li><strong>Custom Designs:</strong> 7-10 business days</li>
              <li><strong>Pick Up:</strong> Free pickup available at all our branch locations. You will be notified when your order is ready for pickup.</li>
              <li><strong>Cash on Delivery (COD):</strong> Delivery to your specified address is available for ₱50.00 delivery fee. Payment is made in cash upon delivery.</li>
              <li><strong>Delivery Areas:</strong> COD delivery is available in select areas. Please check with our branches for delivery availability in your location.</li>
            </ul>
            <p className="terms-text">
              We are not responsible for delays caused by factors beyond our control, including weather, carrier delays, or incorrect address information. For COD orders, please ensure someone is available to receive the order and make payment at the delivery address.
            </p>
          </section>

          <section className="terms-section">
            <h2 className="terms-section-title">6. Size and Fit</h2>
            <p className="terms-text">
              We provide size charts to help you select the correct size. However:
            </p>
            <ul className="terms-list">
              <li>Customers are responsible for selecting the correct size</li>
              <li>We recommend trying on items or consulting our staff for sizing advice</li>
              <li>Size exchanges may be available subject to availability and product condition</li>
              <li>Custom sizing may be available for an additional fee</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2 className="terms-section-title">7. User Accounts</h2>
            <p className="terms-text">
              If you create an account with us:
            </p>
            <ul className="terms-list">
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You agree to notify us immediately of any unauthorized use</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2 className="terms-section-title">8. Limitation of Liability</h2>
            <p className="terms-text">
              To the maximum extent permitted by law:
            </p>
            <ul className="terms-list">
              <li>Yohann's Sportswear House shall not be liable for any indirect, incidental, or consequential damages</li>
              <li>Our total liability shall not exceed the amount you paid for the product or service</li>
              <li>We are not responsible for damages resulting from misuse of products</li>
              <li>We do not warrant that our website will be error-free or uninterrupted</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2 className="terms-section-title">9. Indemnification</h2>
            <p className="terms-text">
              You agree to indemnify and hold harmless Yohann's Sportswear House, its employees, and affiliates from any claims, damages, losses, or expenses arising from your use of our services, violation of these terms, or infringement of any rights.
            </p>
          </section>

          <section className="terms-section">
            <h2 className="terms-section-title">10. Changes to Terms</h2>
            <p className="terms-text">
              We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting on this page. Your continued use of our services after changes are posted constitutes acceptance of the modified terms.
            </p>
          </section>

          <section className="terms-section">
            <h2 className="terms-section-title">11. Governing Law</h2>
            <p className="terms-text">
              These Terms and Conditions shall be governed by and construed in accordance with the laws of the Philippines. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Batangas, Philippines.
            </p>
          </section>

          <section className="terms-section">
            <h2 className="terms-section-title">12. Contact Information</h2>
            <p className="terms-text">
              If you have any questions about these Terms and Conditions, please contact us:
            </p>
            <div className="terms-contact-info">
              <p><strong>Email:</strong> yohanns.sportswear@gmail.com</p>
              <p><strong>Phone:</strong> (043) 300-1633 / 0917 139 5661</p>
              <p><strong>Address:</strong> Villa Maria Subdivision Sambat, San Pascual, 4204 Batangas</p>
              <p><strong>Business Hours:</strong> Monday - Saturday, 8:00 AM - 6:00 PM</p>
            </div>
          </section>
        </div>

        {/* Contact Section */}
        <div className="terms-contact">
          <h2 className="terms-contact-title">
            Have Questions About Our Terms?
          </h2>
          <p className="terms-contact-description">
            Contact us directly for clarification
          </p>
          <div className="terms-contact-buttons">
            <a href="/branches" className="terms-contact-button primary">
              Visit Our Branches
            </a>
            <button 
              onClick={() => navigate('/contacts')} 
              className="terms-contact-button secondary"
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;

