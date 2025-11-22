import React from 'react';
import Sidebar from '../../components/admin/Sidebar';
import '../admin/AdminDashboard.css';
import BranchSupportChat from '../../components/admin/BranchSupportChat';

const BranchSupportPage = () => {
  return (
    <div className="admin-dashboard">
      <Sidebar
        activePage={'support'}
        setActivePage={() => {}}
      />
      <div className="admin-main-content">
        <BranchSupportChat />
      </div>
    </div>
  );
};

export default BranchSupportPage;


