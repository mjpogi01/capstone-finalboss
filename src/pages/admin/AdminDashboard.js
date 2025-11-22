import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './AdminDashboard.css';
import './admin-shared.css';
import Sidebar from '../../components/admin/Sidebar';
import Orders from '../../components/admin/Orders';
import Analytics from './Analytics';
import Dashboard1 from './Dashboard1';
import EmailMarketing from '../../components/admin/EmailMarketing';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import logo from '../../images/yohanns_logo-removebg-preview 3.png';

const AdminDashboard = () => {
  const location = useLocation();
  const [activePage, setActivePage] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync activePage with URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') {
      setActivePage('home');
    } else if (path === '/admin/orders') {
      setActivePage('orders');
    } else if (path === '/admin/analytics') {
      setActivePage('analytics');
    } else if (path === '/admin/email-marketing') {
      setActivePage('email-marketing');
    }
  }, [location]);

  const getPageTitle = () => {
    switch (activePage) {
      case 'home':
        return 'Dashboard';
      case 'orders':
        return 'Orders';
      case 'analytics':
        return 'Analytics';
      case 'email-marketing':
        return 'Email Marketing';
      default:
        return 'Dashboard';
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
    <div className="admin-dashboard">
      {/* Mobile Header with Burger Menu */}
      <header className="admin-mobile-header">
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
      <div className="admin-main-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
