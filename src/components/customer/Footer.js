import React, { useState } from 'react';
import './Footer.css';
import logo from '../../images/yohanns_logo-removebg-preview 3.png';
import CustomerChatModal from './CustomerChatModal';

const Footer = () => {
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  const handleCustomerServiceClick = (event) => {
    event.preventDefault();
    setIsChatModalOpen(true);
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <div className="footer-logo">
            <img 
              src={logo} 
              alt="YOHANNS Sportswear House" 
              className="footer-logo-image"
            />
          </div>
          <p className="footer-tagline">Suit Up. Show Out. Yohann's Style.</p>
        </div>
        
        <div className="footer-section">
          <div className="footer-nav">
            <div className="nav-column">
              <a href="/" className="footer-link">HOME</a>
              <a href="/about" className="footer-link">ABOUT US</a>
              <a href="/branches" className="footer-link">BRANCHES</a>
              <a href="/highlights" className="footer-link">HIGHLIGHTS</a>
            </div>
            <div className="nav-column">
              <a href="/faqs" className="footer-link">FAQs</a>
              <a 
                href="#customer-service" 
                className="footer-link"
                onClick={handleCustomerServiceClick}
              >
                CUSTOMER SERVICE
              </a>
              <a href="/privacy" className="footer-link">PRIVACY POLICY</a>
              <a href="/terms" className="footer-link">TERMS AND CONDITIONS</a>
            </div>
          </div>
        </div>
        
        <div className="footer-section">
          <h3 className="contact-title">CONTACT US</h3>
          <div className="contact-info">
            <div className="contact-item">
              <span className="contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="currentColor"/>
                </svg>
              </span>
              <a 
                href="https://www.facebook.com/princeyohannsportswear" 
                target="_blank" 
                rel="noopener noreferrer"
                className="contact-link"
              >
                Yohann's Sportswear House
              </a>
            </div>
            <div className="contact-item">
              <span className="contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <path d="M22 8l-10 6L2 8" fill="none" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </span>
              <a 
                href="mailto:yohanns.sportswear@gmail.com"
                className="contact-link"
              >
                yohanns.sportswear@gmail.com
              </a>
            </div>
            <div className="contact-item">
              <span className="contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M6.6 10.8a15.8 15.8 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.5.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 7a1 1 0 0 1 1-1h3.4a1 1 0 0 1 1 1 11 11 0 0 0 .6 3.5 1 1 0 0 1-.25 1z" fill="currentColor"/>
                </svg>
              </span>
              <a 
                href="tel:+63433001633"
                className="contact-link"
              >
                (043) 300-1633 / 0917 139 5661
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p className="copyright">
          © 2025 Yohann's Sportswear House | All Rights Reserved
        </p>
      </div>

      <CustomerChatModal 
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
      />
    </footer>
  );
};

export default Footer; 