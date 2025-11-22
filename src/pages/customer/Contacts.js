import React, { useEffect } from 'react';
import './Contacts.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMapMarkerAlt, 
  faPhone, 
  faClock, 
  faEnvelope,
  faUser,
  faPaperPlane,
  faMap
} from '@fortawesome/free-solid-svg-icons';

const Contacts = () => {
  const branches = [
    {
      name: 'SAN PASCUAL (MAIN BRANCH)',
      address: 'Villa Maria Subdivision Sambat, San Pascual, 4204 Batangas',
      phone: '(043) 738-9635 or 0917 139 5661',
      hours: 'Mon-Sat: 8:30 AM - 5:30 PM'
    },
    {
      name: 'CALAPAN BRANCH',
      address: 'Unit 2, Ground Floor Basa Bldg., Infantado Street, Brgy. San Vicente West Calapan City, 5200 Oriental Mindoro',
      phone: '(043) 738-9635',
      hours: 'Mon-Sat: 8:30 AM - 5:30 PM'
    },
    {
      name: 'MUZON BRANCH',
      address: 'Barangay Muzon, San Luis, 4226 Batangas',
      phone: '(043) 300 1633 or 0935 332 4852',
      hours: 'Mon-Sat: 8:30 AM - 5:30 PM'
    },
    {
      name: 'LEMERY BRANCH',
      address: 'Miranda Bldg, Illustre Ave., Brgy. District III 4209 Lemery Batangas',
      phone: '(043) 741 7682',
      hours: 'Mon-Sat: 8:30 AM - 5:30 PM'
    },
    {
      name: 'BATANGAS CITY BRANCH',
      address: 'Unit 1 Casa Buena Building, P.Burgos ST. EXT Calicanto, 4200 Batangas',
      phone: '(043) 300-1633 or 0935 332 4852',
      hours: 'Mon-Sat: 8:30 AM - 5:30 PM'
    },
    {
      name: 'BAUAN BRANCH',
      address: 'J.P Rizal St. Poblacion, Bauan Batangas',
      phone: '(043) 300-2297',
      hours: 'Mon-Sat: 8:30 AM - 5:30 PM'
    },
    {
      name: 'CALACA BRANCH',
      address: 'Block D-8 Calaca Public Market, Poblacion 4, Calaca City, Philippines',
      phone: '(043) 784-2891 or 0917 139 5661',
      hours: 'Mon-Sat: 8:30 AM - 5:30 PM'
    },
    {
      name: 'PINAMALAYAN BRANCH',
      address: 'Mabini St. Brgy. Marfrancisco, Pinamalayan, Oriental Mindoro, Philippines',
      phone: '0917 139 5661',
      hours: 'Mon-Sat: 8:30 AM - 5:30 PM'
    },
    {
      name: 'ROSARIO BRANCH',
      address: 'Brgy. D, Rosario, Batangas, Rosario, Philippines',
      phone: '(043) 321 6498',
      hours: 'Mon-Sat: 8:30 AM - 5:30 PM'
    }
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = document.querySelectorAll('.contacts-container .reveal:not(.is-visible)');

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
    <div className="contacts-container">
      <div className="contacts-wrapper">
        {/* Hero Section */}
        <div className="contacts-hero reveal">
          <h1 className="contacts-title page-title reveal">
            Contact Us
          </h1>
          <p className="contacts-subtitle reveal reveal-delay-1">
            Get in touch with us at any of our convenient locations
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="contacts-branches-grid">
          {branches.map((branch, index) => (
            <div key={index} className={`contacts-branch-card reveal reveal-delay-${(index % 5) + 1}`}>
              <h3 className="contacts-branch-name">
                {branch.name}
              </h3>
              <div className="contacts-branch-details">
                <div className="contacts-branch-detail-row">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="contacts-branch-icon" />
                  <span className="contacts-branch-text">
                    {branch.address}
                  </span>
                </div>
                <div className="contacts-branch-detail-row">
                  <FontAwesomeIcon icon={faPhone} className="contacts-branch-icon" />
                  <span className="contacts-branch-text">{branch.phone}</span>
                </div>
                <div className="contacts-branch-detail-row">
                  <FontAwesomeIcon icon={faClock} className="contacts-branch-icon" />
                  <span className="contacts-branch-text">{branch.hours}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Map Link */}
        <div className="contacts-map-link-section reveal reveal-delay-1">
          <a href="/branches" className="contacts-map-link reveal reveal-delay-2">
            <FontAwesomeIcon icon={faMap} className="contacts-map-icon" />
            View All Branches on Map
          </a>
        </div>
      </div>
    </div>
  );
};

export default Contacts; 