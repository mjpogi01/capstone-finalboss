import React, { useState, useEffect } from 'react';
import './ArtistDashboard.css';
import '../admin/admin-shared.css';
import ArtistSidebar from '../../components/artist/ArtistSidebar';
import ArtistMetricsCards from '../../components/artist/ArtistMetricsCards';
import ArtistTasksTable from '../../components/artist/ArtistTasksTable';
import ArtistWorkloadChart from '../../components/artist/ArtistWorkloadChart';
import ArtistProfile from '../../components/artist/ArtistProfile';
import ArtistChatList from '../../components/artist/ArtistChatList';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faToggleOn, faToggleOff } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import artistDashboardService from '../../services/artistDashboardService';

const ArtistDashboard = () => {
  const [activePage, setActivePage] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [isActive, setIsActive] = useState(true);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [dataRefreshToken, setDataRefreshToken] = useState(0);

  const handleArtistDataRefresh = () => {
    setDataRefreshToken((prev) => prev + 1);
  };

  // Fetch artist profile to get is_active status
  useEffect(() => {
    const fetchArtistStatus = async () => {
      if (!user?.id) return;
      
      try {
        const profile = await artistDashboardService.getArtistProfile();
        if (profile && profile.is_active !== undefined) {
          setIsActive(profile.is_active);
        }
      } catch (error) {
        console.error('Error fetching artist status:', error);
      }
    };

    fetchArtistStatus();
  }, [user?.id]);

  // Toggle artist active status - show confirmation modal
  const handleToggleStatus = () => {
    const newStatus = !isActive;
    setPendingStatus(newStatus);
    setIsStatusConfirmOpen(true);
  };

  // Confirm status change
  const handleConfirmStatusChange = async () => {
    setIsStatusConfirmOpen(false);
    const newStatus = pendingStatus;
    setLoadingStatus(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showNotification('No active session. Please log in again.', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/admin/artists/${user.id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: newStatus })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Status toggle successful:', result);
        setIsActive(newStatus);
        showNotification(`Your status has been updated to ${newStatus ? 'Active' : 'Inactive'}`, 'success');
      } else {
        let errorMessage = 'Failed to update status';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const fallbackText = await response.text();
          errorMessage = fallbackText || errorMessage;
        }
        showNotification(errorMessage, 'error');
      }
    } catch (error) {
      console.error('❌ Error toggling status:', error);
      showNotification(`Error updating status: ${error.message}`, 'error');
    } finally {
      setLoadingStatus(false);
      setPendingStatus(null);
    }
  };

  const getPageTitle = () => {
    switch (activePage) {
      case 'home':
        return 'Artist Dashboard';
      case 'tasks':
        return 'My Tasks';
      case 'profile':
        return 'My Profile';
      case 'workload':
        return 'Workload Overview';
      case 'chats':
        return 'Customer Chats';
      default:
        return 'Artist Dashboard';
    }
  };

  const renderContent = () => {
    switch (activePage) {
      case 'home':
        return (
          <div className="dashboard-content">
            {/* Metrics row */}
            <div className="artist-panels-row">
              <div className="artist-panel artist-panel-full">
                <ArtistMetricsCards refreshToken={dataRefreshToken} />
              </div>
            </div>

            {/* Two-column main panels */}
            <div className="artist-panels-grid">
              <div className="artist-panel">
                <div className="artist-panel-header">
                  <h3>Workload Overview</h3>
                  <div className="chart-controls">
                    <select 
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="period-select"
                    >
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="quarter">This Quarter</option>
                    </select>
                  </div>
                </div>
                <div className="artist-panel-body artist-hide-chart-title">
                  <ArtistWorkloadChart
                    showHeader={false}
                    period={selectedPeriod}
                    onPeriodChange={setSelectedPeriod}
                    dataRefreshToken={dataRefreshToken}
                  />
                </div>
              </div>

              <div className="artist-panel">
                <div className="artist-panel-header">
                  <h3>Recent Tasks</h3>
                  <button
                    className="artist-panel-action"
                    onClick={() => setActivePage('tasks')}
                  >
                    View All
                  </button>
                </div>
                <div className="artist-panel-body">
                  <ArtistTasksTable limit={5} showHeader={false} onTasksUpdated={handleArtistDataRefresh} />
                </div>
              </div>
            </div>
          </div>
        );
      case 'tasks':
        return <ArtistTasksTable enableTabs={true} onTasksUpdated={handleArtistDataRefresh} />;
      case 'profile':
        return <ArtistProfile />;
      case 'workload':
        return <ArtistWorkloadChart fullWidth={true} dataRefreshToken={dataRefreshToken} />;
      case 'chats':
        return <ArtistChatList />;
      default:
        return (
          <div className="dashboard-content">
            <ArtistMetricsCards />
            <div className="dashboard-grid">
              <div className="dashboard-left">
                <ArtistWorkloadChart />
              </div>
              <div className="dashboard-right">
                <ArtistTasksTable limit={5} showHeader={true} />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="artist-dashboard">
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <FontAwesomeIcon icon={faBars} />
      </button>

      {/* Sidebar */}
      <ArtistSidebar 
        activePage={activePage}
        setActivePage={setActivePage}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main Content */}
      <div className="main-content">
        <div className="content-header">
          <h1>{getPageTitle()}</h1>
          <div className="user-info">
            <span className="welcome-text">Welcome, {user?.user_metadata?.full_name || 'Artist'}!</span>
            <button
              onClick={handleToggleStatus}
              className={`artist-dashboard-status-toggle ${isActive ? 'active' : 'inactive'}`}
              title={isActive ? 'Click to set inactive' : 'Click to activate'}
              aria-label={isActive ? 'Set account inactive' : 'Activate account'}
              disabled={loadingStatus}
            >
              <FontAwesomeIcon 
                icon={isActive ? faToggleOn : faToggleOff} 
                className="toggle-icon"
              />
              <span className="toggle-label">
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </button>
          </div>
        </div>

        <div className="content-body artist-content-scrollable">
          {renderContent()}
        </div>
      </div>

      {/* Status Toggle Confirmation Modal */}
      <ConfirmModal
        isOpen={isStatusConfirmOpen}
        onClose={() => {
          setIsStatusConfirmOpen(false);
          setPendingStatus(null);
        }}
        onConfirm={handleConfirmStatusChange}
        title={pendingStatus ? 'Activate Account' : 'Set Account Inactive'}
        message={
          pendingStatus
            ? 'Are you sure you want to activate your account? You will be eligible to receive new task assignments from orders.'
            : 'Are you sure you want to set your account to inactive? You will be excluded from receiving new task assignments. Existing tasks will not be affected.'
        }
        confirmText={pendingStatus ? 'Activate' : 'Set Inactive'}
        cancelText="Cancel"
        type={pendingStatus ? 'success' : 'warning'}
      />
    </div>
  );
};

export default ArtistDashboard;
