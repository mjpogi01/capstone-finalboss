import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './OwnerDashboard.css';
import '../admin/admin-shared.css';
import Sidebar from '../../components/admin/Sidebar';
import Orders from '../../components/admin/Orders';
import Analytics from '../admin/Analytics';
import Dashboard1 from '../admin/Dashboard1';
import EmailMarketing from '../../components/admin/EmailMarketing';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import logo from '../../images/yohanns_logo-removebg-preview 3.png';

const OwnerDashboard = () => {
  const location = useLocation();
  const [activePage, setActivePage] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync activePage with URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/owner' || path === '/owner/') {
      setActivePage('home');
    } else if (path === '/owner/orders') {
      setActivePage('orders');
    } else if (path === '/owner/analytics') {
      setActivePage('analytics');
    } else if (path === '/owner/email-marketing') {
      setActivePage('email-marketing');
    }
  }, [location]);

  const getPageTitle = () => {
    switch (activePage) {
      case 'home':
        return 'Owner Dashboard';
      case 'orders':
        return 'Orders';
      case 'analytics':
        return 'Analytics';
      case 'email-marketing':
        return 'Email Marketing';
      default:
        return 'Owner Dashboard';
    }
  };

  const renderContent = () => {
    switch (activePage) {
      case 'home':
        return <Dashboard1 />;
      case 'orders':
        return <Orders />;
      case 'analytics':
        return <Analytics />;
      case 'email-marketing':
        return <EmailMarketing />;
      default:
        return <Dashboard1 />;
    }
  };

  return (
    <div className="owner-dashboard">
      {/* Mobile Header with Burger Menu */}
      <header className="owner-mobile-header">
        <button 
          className="mobile-burger-btn"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
        <div className="mobile-header-logo">
          <img src={logo} alt="YOHANNS" />
        </div>
        <div className="mobile-header-title">{getPageTitle()}</div>
      </header>

      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <div className="owner-main-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default OwnerDashboard;
