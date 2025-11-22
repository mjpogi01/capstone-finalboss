import React, { useState } from 'react';
import Sidebar from '../../components/admin/Sidebar';
import '../admin/AdminDashboard.css';
import Orders from '../../components/admin/Orders';

const OrdersPage = () => {
  return (
    <div className="admin-dashboard">
      <Sidebar
        activePage={'orders'}
        setActivePage={() => {}}
      />
      <div className="admin-main-content">
        <Orders />
      </div>
    </div>
  );
};

export default OrdersPage;
