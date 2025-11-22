import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './FAQs.css';

const FAQs = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "What types of sportswear do you offer?",
      answer: "We offer a wide range of sportswear including custom jerseys, t-shirts, long sleeves, uniforms, and accessories. We specialize in custom designs for teams, schools, and organizations."
    },
    {
      question: "Do you provide custom design services?",
      answer: "Yes! We have professional designers who can help create custom designs for your sportswear. You can bring your own design or work with our team to create something unique."
    },
    {
      question: "What are your pricing ranges?",
      answer: "Our prices vary depending on the product and customization level. We offer options from under P500 to above P1500, with competitive pricing for bulk orders."
    },
    {
      question: "How long does it take to complete an order?",
      answer: "Standard orders typically take 3-5 business days, while custom designs may take 7-10 business days."
    },
    {
      question: "Do you have multiple branch locations?",
      answer: "Yes! We have 9 branches across Batangas and Oriental Mindoro, including our main branch in San Pascual, Batangas."
    },
    {
      question: "What sizes are available?",
      answer: "We carry sizes from XS to XXL, and we also offer custom sizing for special requirements. Our staff can help you find the perfect fit."
    },
    {
      question: "Do you offer bulk discounts?",
      answer: "Yes, we offer special pricing for bulk orders. Contact us for a quote based on your quantity requirements."
    },
    {
      question: "Can I visit your branches to see products?",
      answer: "Absolutely! We encourage customers to visit our branches to see our products in person and get personalized assistance."
    }
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = document.querySelectorAll('.faqs-container .reveal:not(.is-visible)');

    if (!elements.length) return;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.2 }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="faqs-container">
      <div className="faqs-wrapper">
        {/* Hero Section */}
        <div className="faqs-hero reveal">
          <h1 className="faqs-title page-title reveal">
            FAQs
          </h1>
          <p className="faqs-subtitle reveal reveal-delay-1">
            Find answers to common questions about our products and services
          </p>
        </div>

        {/* FAQs Section - Two Columns */}
        <div className="faqs-section">
          <div className="faqs-grid">
            {faqs.map((faq, index) => (
              <div key={index} className={`faq-item reveal reveal-delay-${(index % 5) + 1}`}>
                <div className="faq-question">
                  <span className="faq-question-text">{faq.question}</span>
                </div>
                <div className="faq-answer">
                  {faq.answer}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="faqs-contact reveal reveal-delay-2">
          <h2 className="faqs-contact-title">
            Still Have Questions?
          </h2>
          <p className="faqs-contact-description">
            Contact us directly for personalized assistance
          </p>
          <div className="faqs-contact-buttons">
            <a href="/branches" className="faqs-contact-button primary">
              Visit Our Branches
            </a>
            <button 
              onClick={() => navigate('/contacts')} 
              className="faqs-contact-button secondary"
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQs; 