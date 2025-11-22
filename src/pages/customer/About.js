import React, { useEffect } from 'react';
import './About.css';

const About = () => {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = document.querySelectorAll('.reveal');

    if (prefersReducedMotion) {
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
      {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.2
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="about-page" role="main" aria-labelledby="about-title">
      <div className="container">
        {/* Hero Section */}
        <div className="about-hero">
          <h1 className="about-title page-title reveal" id="about-title">About Us</h1>
          
          {/* Tagline */}
          <p className="about-tagline reveal reveal-delay-1" aria-describedby="about-title">
            Your Sportswear Game Masters — Yohann's Has You Covered
          </p>

          {/* Subtitle */}
          <p className="about-subtitle reveal reveal-delay-2">
            Step into the world of performance and style with YOHANN'S SPORTSWEAR HOUSE
          </p>
        </div>

        {/* Why Yohann's Section */}
        <section className="why-section" aria-labelledby="why-title">
          <h2 className="why-title reveal" id="why-title">Why Yohann's Sportswear House?</h2>
          <div className="features-grid">
            <article className="feature-card reveal reveal-delay-1">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3 className="feature-title">Quality</h3>
              <p className="feature-description">
                Yohann's Sportswear House uses high-graded fabric for the best quality items.
              </p>
            </article>

            <article className="feature-card reveal reveal-delay-2">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </div>
              <h3 className="feature-title">Clarity</h3>
              <p className="feature-description">
                Yohann's Sportswear House uses high-definition and vibrant printing by EPSON.
              </p>
            </article>

            <article className="feature-card reveal reveal-delay-3">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                </svg>
              </div>
              <h3 className="feature-title">Technology</h3>
              <p className="feature-description">
                Yohann's Sportswear House uses the most advanced & fastest sublimation printer.
              </p>
            </article>

            <article className="feature-card reveal reveal-delay-2">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <h3 className="feature-title">Professionals</h3>
              <p className="feature-description">
                Yohann's Sportswear House has the best team of professional graphic designers, tailors & machine operators.
              </p>
            </article>

            <article className="feature-card reveal reveal-delay-3">
              <div className="feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.81 14.126l5.901 3.619-2.067-6.3L2.81 14.126zm7.189-7.189L9.74 1.5 6.44 7.5l3.56-5.563zm5.657 0L21.26 1.5 17.96 7.5l3.56-5.563zm-5.657 7.189l5.901-3.619-2.067 6.3-3.834-2.681zm0-2.681l3.56-5.563L12 1.5 8.7 7.5l3.56-5.563z"/>
                </svg>
              </div>
              <h3 className="feature-title">Efficiency</h3>
              <p className="feature-description">
                Yohann's Sportswear has faster lead time without compromising quality.
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
