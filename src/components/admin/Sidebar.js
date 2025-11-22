import React from 'react';
import './Sidebar.css';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../images/yohanns_logo-removebg-preview 3.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHouse, 
  faChartLine, 
  faClipboardList, 
  faBoxesStacked, 
  faUsers, 
  faSignOutAlt, 
  faComments,
  faEnvelope
} from '@fortawesome/free-solid-svg-icons';

const Sidebar = ({ activePage, setActivePage, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { logout, user, hasAdminAccess } = useAuth();
  const navigate = useNavigate();
  
  // Get user role to determine correct paths
  const userRole = user?.user_metadata?.role || 'customer';
  const basePath = userRole === 'owner' ? '/owner' : '/admin';
  const canAccessEmailMarketing = hasAdminAccess();
  
  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: faHouse, path: basePath },
    { id: 'analytics', label: 'Analytics', icon: faChartLine, path: `${basePath}/analytics` },
    { id: 'orders', label: 'Orders', icon: faClipboardList, path: `${basePath}/orders` },
    { id: 'support', label: 'Support Chats', icon: faComments, path: `${basePath}/support` },
    { id: 'inventory', label: 'Inventory', icon: faBoxesStacked, path: '/inventory' },
    { id: 'accounts', label: 'Accounts', icon: faUsers, path: `${basePath}/accounts` },
  ];

  // Add Email Marketing menu item if user has access
  if (canAccessEmailMarketing) {
    menuItems.push({
      id: 'email-marketing',
      label: 'Email Marketing',
      icon: faEnvelope,
      path: `${basePath}/email-marketing`
    });
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleMenuItemClick = (itemId) => {
    setActivePage(itemId);
    if (setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleCloseMobileMenu = () => {
    if (setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={handleCloseMobileMenu}></div>
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">
            <img src={logo} alt="YOHANNS" className="sidebar-logo-img" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {menuItems.map((item) => (
              <li key={item.id} className="nav-item">
                <Link
                  to={item.path}
                  state={item.state || {}}
                  className={`admin-nav-link ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => handleMenuItemClick(item.id)}
                  data-tooltip={item.label}
                >
                  <FontAwesomeIcon icon={item.icon} className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            className="admin-logout-button"
            onClick={handleLogout}
            data-tooltip="Logout"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="admin-logout-icon" />
            <span className="admin-logout-text">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
