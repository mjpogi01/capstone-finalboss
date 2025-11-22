import React, { useState } from 'react';
import EmailMarketing from '../../components/admin/EmailMarketing';
import Sidebar from '../../components/admin/Sidebar';
import './admin-shared.css';
import './AdminDashboard.css';

const EmailMarketingPage = () => {
  const [activePage, setActivePage] = useState('email-marketing');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="admin-dashboard">
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <div className="admin-main-content">
        <EmailMarketing />
      </div>
    </div>
  );
};

export default EmailMarketingPage;

