import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTrash, faUsers, faUserShield, faPalette, faEdit, faSave, faTimes, faToggleOn, faToggleOff } from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Sidebar from '../../components/admin/Sidebar';
import '../admin/AdminDashboard.css';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import './Accounts.css';
import './admin-shared.css';

const Accounts = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [customerAccounts, setCustomerAccounts] = useState([]);
  const [artistAccounts, setArtistAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [artistSearchTerm, setArtistSearchTerm] = useState('');
  const [forceUpdate, setForceUpdate] = useState(0);
  const [feedbackNotice, setFeedbackNotice] = useState(null);
  // Customer pagination state
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPerPage, setCustomerPerPage] = useState(50);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [customerTotalPages, setCustomerTotalPages] = useState(0);
  const [editingArtist, setEditingArtist] = useState(null);
  const [editFormData, setEditFormData] = useState({
    artist_name: '',
    email: ''
  });
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [pendingArtist, setPendingArtist] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);

  const showFeedback = (message, type = 'info', duration = 4000) => {
    setFeedbackNotice({ message, type });
    if (duration > 0) {
      setTimeout(() => setFeedbackNotice(null), duration);
    }
  };

  // Make isOwner reactive to user changes
  const isOwner = useMemo(() => user?.user_metadata?.role === 'owner', [user?.user_metadata?.role]);
  
  // Initialize activeTab from location state if available, otherwise default
  const [activeTab, setActiveTab] = useState(() => {
    if (location.state?.activeTab) {
      return location.state.activeTab;
    }
    return isOwner ? 'admin' : 'artist';
  });

  // Update activeTab when isOwner changes (only on initial load)
  // Also handle location state for navigation from dashboard
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear the state to prevent it from persisting
      window.history.replaceState({}, document.title);
    } else if (isOwner && !location.state?.activeTab) {
      setActiveTab('admin');
    }
  }, [isOwner, location.state]);

  // Fetch all accounts
  const fetchAccounts = useCallback(async () => {
    const isInitialLoad = adminAccounts.length === 0 && customerAccounts.length === 0 && artistAccounts.length === 0;
    
    try {
      // Only show loading on initial load, not on pagination/search changes
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session');
        if (isInitialLoad) {
          setLoading(false);
        }
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Check if user is owner (recalculate inside callback to ensure it's current)
      const currentIsOwner = user?.user_metadata?.role === 'owner';
      console.log('🔍 Fetching accounts - isOwner:', currentIsOwner, 'user role:', user?.user_metadata?.role);

      // Fetch admin accounts (only if owner)
      if (currentIsOwner) {
        try {
          console.log('🔵 Attempting to fetch admin accounts...');
          const adminResponse = await fetch(`http://localhost:4000/api/admin/users?t=${Date.now()}`, {
            headers: {
              ...headers,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          console.log('📡 Admin accounts response status:', adminResponse.status, adminResponse.statusText);
          
          if (adminResponse.ok) {
            const adminData = await adminResponse.json();
            console.log('✅ FETCHED ADMIN ACCOUNTS:', adminData.length, 'accounts');
            console.log('📋 Admin accounts details:', adminData.map(acc => ({ id: acc.id, email: acc.email, name: acc.name, role: acc.role })));
            setAdminAccounts(adminData);
          } else {
            const errorText = await adminResponse.text();
            console.error('❌ Failed to fetch admin accounts:', adminResponse.status, errorText);
          }
        } catch (error) {
          console.error('❌ Error fetching admin accounts:', error);
        }
      } else {
        console.log('⚠️ Skipping admin accounts fetch - user is not owner');
      }

      // Fetch customer accounts with pagination
      try {
        // If searching, fetch all customers; otherwise use pagination
        const searchParams = new URLSearchParams({
          t: Date.now().toString(),
          page: customerPage.toString(),
          perPage: customerPerPage.toString()
        });
        
        if (customerSearchTerm) {
          searchParams.append('search', customerSearchTerm);
        }
        
        const customerResponse = await fetch(`http://localhost:4000/api/admin/customers?${searchParams.toString()}`, {
          headers: {
            ...headers,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (customerResponse.ok) {
          const responseData = await customerResponse.json();
          
          // Handle both old format (array) and new format (object with pagination)
          if (Array.isArray(responseData)) {
            // Old format - backward compatibility
            console.log('📋 FETCHED CUSTOMER ACCOUNTS (old format):', responseData.length);
            setCustomerAccounts(responseData);
            setCustomerTotal(responseData.length);
            setCustomerTotalPages(1);
          } else {
            // New format with pagination
            const { customers, pagination } = responseData;
            console.log('📋 FETCHED CUSTOMER ACCOUNTS:', {
              count: customers.length,
              page: pagination.page,
              total: pagination.total,
              totalPages: pagination.totalPages
            });
            setCustomerAccounts(customers);
            setCustomerTotal(pagination.total);
            setCustomerTotalPages(pagination.totalPages);
          }
        } else {
          const errorText = await customerResponse.text();
          console.error('❌ Failed to fetch customer accounts:', customerResponse.status, errorText);
        }
      } catch (error) {
        console.error('❌ Error fetching customer accounts:', error);
      }

      // Fetch artist accounts
      try {
        console.log('🎨 Attempting to fetch artist accounts...');
        const artistResponse = await fetch(`http://localhost:4000/api/admin/artists?t=${Date.now()}`, {
          headers: {
            ...headers,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        console.log('📡 Artist accounts response status:', artistResponse.status, artistResponse.statusText);
        
        if (artistResponse.ok) {
          const artistData = await artistResponse.json();
          console.log('✅ FETCHED ARTIST ACCOUNTS:', artistData.length, 'accounts');
          console.log('📋 Artist accounts details:', artistData.map(acc => ({ id: acc.id, email: acc.email, artist_name: acc.artist_name })));
          setArtistAccounts(artistData);
        } else {
          const errorText = await artistResponse.text();
          console.error('❌ Failed to fetch artist accounts:', artistResponse.status, errorText);
        }
      } catch (error) {
        console.error('❌ Error fetching artist accounts:', error);
      }

    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      // Only set loading to false if this was the initial load
      const isInitialLoad = adminAccounts.length === 0 && customerAccounts.length === 0 && artistAccounts.length === 0;
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [user, adminAccounts.length, customerAccounts.length, artistAccounts.length]);

  // Delete admin account
  const handleDeleteAdmin = async (adminId) => {
    // Find the account being deleted for logging
    const accountToDelete = adminAccounts.find(acc => acc.id === adminId);
    console.log('🗑️ DELETING ADMIN ACCOUNT:', {
      id: adminId,
      name: accountToDelete?.name,
      email: accountToDelete?.email,
      role: accountToDelete?.role
    });
    
    if (window.confirm('Are you sure you want to delete this admin account?')) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          showFeedback('No active session. Please log in again.', 'error');
          return;
        }

        console.log('📤 Sending delete request for admin ID:', adminId);
        const response = await fetch(`http://localhost:4000/api/delete/user/${adminId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📥 Delete response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Delete successful:', result);
          showFeedback('Admin account deleted successfully!', 'success');
          
          console.log('🔄 BEFORE REFRESH - Current admin accounts:', adminAccounts.map(acc => ({ id: acc.id, email: acc.email, name: acc.name })));
          
          // Wait longer for Supabase to propagate changes
          console.log('⏳ Waiting for Supabase propagation (5 seconds)...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Simple refresh - just fetch again
          await fetchAccounts();
          
          // Force React to re-render the table
          setForceUpdate(prev => prev + 1);
          
          console.log('🔄 AFTER REFRESH - New admin accounts:', adminAccounts.map(acc => ({ id: acc.id, email: acc.email, name: acc.name })));
        } else {
          const errorData = await response.json();
          console.log('❌ Delete failed:', errorData);
          showFeedback(errorData.error || 'Failed to delete admin account', 'error');
        }
      } catch (error) {
        console.error('❌ Error deleting admin:', error);
        showFeedback(`Error deleting admin account: ${error.message}`, 'error');
      }
    }
  };

  // Delete customer account
  const handleDeleteCustomer = async (customerId) => {
    // Find the account being deleted for logging
    const accountToDelete = customerAccounts.find(acc => acc.id === customerId);
    console.log('🗑️ DELETING CUSTOMER ACCOUNT:', {
      id: customerId,
      name: accountToDelete?.name,
      email: accountToDelete?.email
    });
    
    if (window.confirm('Are you sure you want to delete this customer account?')) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          showFeedback('No active session. Please log in again.', 'error');
          return;
        }

        console.log('📤 Sending delete request for customer ID:', customerId);
        const response = await fetch(`http://localhost:4000/api/delete/user/${customerId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📥 Delete response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Delete successful:', result);
          showFeedback('Customer account deleted successfully!', 'success');
          
          console.log('🔄 BEFORE REFRESH - Current customer accounts:', customerAccounts.map(acc => ({ id: acc.id, email: acc.email, name: acc.name })));
          
          // Wait longer for Supabase to propagate changes
          console.log('⏳ Waiting for Supabase propagation (5 seconds)...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Simple refresh - just fetch again
          await fetchAccounts();
          
          // Force React to re-render the table
          setForceUpdate(prev => prev + 1);
          
          console.log('🔄 AFTER REFRESH - New customer accounts:', customerAccounts.map(acc => ({ id: acc.id, email: acc.email, name: acc.name })));
        } else {
          const errorData = await response.json();
          console.log('❌ Delete failed:', errorData);
          showFeedback(errorData.error || 'Failed to delete customer account', 'error');
        }
      } catch (error) {
        console.error('❌ Error deleting customer:', error);
        showFeedback(`Error deleting customer account: ${error.message}`, 'error');
      }
    }
  };

  // Delete artist account
  const handleDeleteArtist = async (artistId) => {
    // Find the account being deleted for logging
    const accountToDelete = artistAccounts.find(acc => acc.id === artistId);
    console.log('🗑️ DELETING ARTIST ACCOUNT:', {
      id: artistId,
      artist_name: accountToDelete?.artist_name,
      email: accountToDelete?.email
    });
    
    if (window.confirm('Are you sure you want to delete this artist account?')) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          showFeedback('No active session. Please log in again.', 'error');
          return;
        }

        console.log('📤 Sending delete request for artist ID:', artistId);
        const response = await fetch(`http://localhost:4000/api/admin/artists/${artistId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📥 Delete response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Delete successful:', result);
          showFeedback('Artist account deleted successfully!', 'success');
          
          console.log('🔄 BEFORE REFRESH - Current artist accounts:', artistAccounts.map(acc => ({ id: acc.id, email: acc.email, artist_name: acc.artist_name })));
          
          // Wait longer for Supabase to propagate changes
          console.log('⏳ Waiting for Supabase propagation (5 seconds)...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Simple refresh - just fetch again
          await fetchAccounts();
          
          // Force React to re-render the table
          setForceUpdate(prev => prev + 1);
          
          console.log('🔄 AFTER REFRESH - New artist accounts:', artistAccounts.map(acc => ({ id: acc.id, email: acc.email, artist_name: acc.artist_name })));
        } else {
          const errorData = await response.json();
          console.log('❌ Delete failed:', errorData);
          showFeedback(errorData.error || 'Failed to delete artist account', 'error');
        }
      } catch (error) {
        console.error('❌ Error deleting artist:', error);
        showFeedback(`Error deleting artist account: ${error.message}`, 'error');
      }
    }
  };

  // Handle artist edit
  const handleEditArtist = (artist) => {
    setEditingArtist(artist);
    setEditFormData({
      artist_name: artist.artist_name || '',
      email: artist.email || ''
    });
  };

  // Handle edit form changes
  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save artist edits
  const handleSaveArtist = async () => {
    if (!editingArtist) return;

    try {
      console.log('🔄 Starting artist update process...');
      console.log('👤 Current user role:', user?.user_metadata?.role);
      console.log('🎯 Is owner:', isOwner);
      console.log('📝 Edit form data:', editFormData);
      console.log('🎨 Editing artist:', editingArtist);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('No active session. Please log in again.');
        return;
      }

      console.log('🔑 Session found, access token length:', session.access_token?.length);

      const response = await fetch(`http://localhost:4000/api/admin/artists/${editingArtist.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Update successful:', result);
        alert('Artist information updated successfully!');
        setEditingArtist(null);
        setEditFormData({ artist_name: '', email: '' });
        await fetchAccounts();
        setForceUpdate(prev => prev + 1);
      } else {
        const errorText = await response.text();
        console.error('❌ Update failed:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          alert(`Error: ${errorData.error || 'Failed to update artist information'}`);
        } catch (parseError) {
          alert(`Error: ${response.status} - ${errorText}`);
        }
      }
    } catch (error) {
      console.error('❌ Error updating artist:', error);
      alert(`Error updating artist: ${error.message}`);
    }
  };

  // Cancel artist edit
  const handleCancelEdit = () => {
    setEditingArtist(null);
    setEditFormData({ artist_name: '', email: '' });
  };

  // Toggle artist active status - show confirmation modal
  const handleToggleArtistStatus = (artist) => {
    if (!isOwner) {
      alert('Only owners can change artist status');
      return;
    }

    const newStatus = !artist.is_active;
    setPendingArtist(artist);
    setPendingStatus(newStatus);
    setIsStatusConfirmOpen(true);
  };

  // Confirm status change
  const handleConfirmStatusChange = async () => {
    setIsStatusConfirmOpen(false);
    const artist = pendingArtist;
    const newStatus = pendingStatus;

    if (!artist) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('No active session. Please log in again.');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/admin/artists/${artist.id}/toggle-status`, {
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
        await fetchAccounts();
        setForceUpdate(prev => prev + 1);
      } else {
        const errorText = await response.text();
        console.error('❌ Status toggle failed:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          alert(`Error: ${errorData.error || 'Failed to update artist status'}`);
        } catch (parseError) {
          alert(`Error: ${response.status} - ${errorText}`);
        }
      }
    } catch (error) {
      console.error('❌ Error toggling artist status:', error);
      alert(`Error updating artist status: ${error.message}`);
    } finally {
      setPendingArtist(null);
      setPendingStatus(null);
    }
  };

  // Track if we've already fetched accounts to prevent refetching on focus
  const hasFetchedRef = React.useRef(false);
  const userIdRef = React.useRef(null);

  useEffect(() => {
    // Only fetch accounts when user is available and hasn't been fetched yet
    // or if the user ID has changed (different user logged in)
    const currentUserId = user?.id;
    
    if (user && (!hasFetchedRef.current || userIdRef.current !== currentUserId)) {
      hasFetchedRef.current = true;
      userIdRef.current = currentUserId;
      fetchAccounts();
    }
  }, [fetchAccounts, user?.id]); // Only depend on user ID, not the whole user object

  // Refetch customers when pagination or search changes (without showing loading spinner)
  useEffect(() => {
    if (user && activeTab === 'customer' && hasFetchedRef.current) {
      // Extract customer fetching logic to avoid dependency on fetchAccounts
      const fetchCustomers = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const headers = {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          };

          const searchParams = new URLSearchParams({
            t: Date.now().toString(),
            page: customerPage.toString(),
            perPage: customerPerPage.toString()
          });
          
          if (customerSearchTerm) {
            searchParams.append('search', customerSearchTerm);
          }
          
          const customerResponse = await fetch(`http://localhost:4000/api/admin/customers?${searchParams.toString()}`, {
            headers: {
              ...headers,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (customerResponse.ok) {
            const responseData = await customerResponse.json();
            
            if (Array.isArray(responseData)) {
              setCustomerAccounts(responseData);
              setCustomerTotal(responseData.length);
              setCustomerTotalPages(1);
            } else {
              const { customers, pagination } = responseData;
              setCustomerAccounts(customers);
              setCustomerTotal(pagination.total);
              setCustomerTotalPages(pagination.totalPages);
            }
          }
        } catch (error) {
          console.error('❌ Error fetching customer accounts:', error);
        }
      };

      // Debounce search to avoid too many requests
      const timeoutId = setTimeout(() => {
        fetchCustomers();
      }, customerSearchTerm ? 300 : 0); // 300ms debounce for search

      return () => clearTimeout(timeoutId);
    }
  }, [customerPage, customerPerPage, customerSearchTerm, activeTab, user]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    if (customerPage !== 1) {
      setCustomerPage(1);
    }
  }, [customerSearchTerm]);

  // Filter accounts based on search terms (only for admin and artist, customer search is server-side)
  const filteredAdminAccounts = adminAccounts.filter(admin =>
    admin.name?.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
    admin.role?.toLowerCase().includes(adminSearchTerm.toLowerCase())
  );

  // Customer accounts are already filtered server-side, so use them directly
  const getCustomerDisplayName = (customer) => {
    if (!customer) return 'N/A';
    
    const profileName = customer.profile?.full_name;
    const legacyName = customer.full_name || customer.name;
    const composedName = `${customer.profile?.first_name || customer.first_name || ''} ${customer.profile?.last_name || customer.last_name || ''}`.trim();
    
    const orderName = customer.orders?.[0]?.customer_name;
    
    const candidateNames = [
      profileName,
      legacyName,
      composedName && composedName.length > 0 ? composedName : null,
      orderName
    ];
    
    const name = candidateNames.find(n => typeof n === 'string' && n.trim().length > 0);
    
    return name?.trim() || 'N/A';
  };

  const filteredCustomerAccounts = customerAccounts;

  const filteredArtistAccounts = artistAccounts.filter(artist =>
    artist.artist_name?.toLowerCase().includes(artistSearchTerm.toLowerCase()) ||
    artist.email?.toLowerCase().includes(artistSearchTerm.toLowerCase()) ||
    artist.full_name?.toLowerCase().includes(artistSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="admin-dashboard">
        <Sidebar 
          activePage={'accounts'} 
          setActivePage={() => {}} 
        />
        <div className="admin-main-content">
          <div className="accounts-container">
            <div className="loading">Loading accounts...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <Sidebar 
        activePage={'accounts'} 
        setActivePage={() => {}} 
      />
      <div className="admin-main-content">
    <div className="accounts-container">
      <div className="accounts-header">
        <h1>Account Management</h1>
      </div>

      {/* Accounts Tabs */}
      <div className="accounts-tabs">
        {isOwner && (
          <button
            className={`accounts-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <FontAwesomeIcon icon={faUserShield} className="tab-icon" />
            Admin Accounts
          </button>
        )}
        <button
          className={`accounts-tab ${activeTab === 'artist' ? 'active' : ''}`}
          onClick={() => setActiveTab('artist')}
        >
          <FontAwesomeIcon icon={faPalette} className="tab-icon" />
          Artist Accounts
        </button>
        <button
          className={`accounts-tab ${activeTab === 'customer' ? 'active' : ''}`}
          onClick={() => setActiveTab('customer')}
        >
          <FontAwesomeIcon icon={faUsers} className="tab-icon" />
          Customer Accounts
        </button>
      </div>

      {/* Admin Accounts Section - Only for Owners */}
      {isOwner && activeTab === 'admin' && (
        <div className="accounts-section">
          <div className="section-header">
            <h2>
              <FontAwesomeIcon icon={faUserShield} />
              Admin Accounts ({filteredAdminAccounts.length})
            </h2>
            <div className="accounts-search-container">
              <input
                type="text"
                placeholder="Search admin accounts..."
                value={adminSearchTerm}
                onChange={(e) => setAdminSearchTerm(e.target.value)}
                className="accounts-search-input"
              />
              <FontAwesomeIcon icon={faSearch} className="accounts-search-icon" />
            </div>
          </div>

          <div className="accounts-table-container">
            <table className="accounts-table admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email Address</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdminAccounts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="no-data">
                      {adminSearchTerm ? 'No admin accounts match your search.' : 'No admin accounts found.'}
                    </td>
                  </tr>
                ) : (
                  filteredAdminAccounts.map((admin) => (
                    <tr key={`admin-${admin.id}-${forceUpdate}`}>
                      <td>{admin.name || 'N/A'}</td>
                      <td>{admin.email || 'N/A'}</td>
                      <td>
                        <span className={`role-badge ${admin.role}`}>
                          {admin.role || 'customer'}
                        </span>
                      </td>
                      <td>{admin.branch_name || 'N/A'}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteAdmin(admin.id)}
                          className="delete-btn"
                          title="Delete Admin Account"
                          aria-label="Delete Admin Account"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Artist Accounts Section */}
      {activeTab === 'artist' && (
        <div className="accounts-section">
        <div className="section-header">
          <h2>
            <FontAwesomeIcon icon={faPalette} />
            Artist Accounts ({filteredArtistAccounts.length})
            {isOwner && (
              <span className="owner-badge">Owner Only: Can Edit</span>
            )}
          </h2>
          <div className="accounts-search-container">
            <input
              type="text"
              placeholder="Search artist accounts..."
              value={artistSearchTerm}
              onChange={(e) => setArtistSearchTerm(e.target.value)}
              className="accounts-search-input"
            />
            <FontAwesomeIcon icon={faSearch} className="accounts-search-icon" />
          </div>
        </div>

        <div className="accounts-table-container">
          <table className="accounts-table artist-table">
            <thead>
              <tr>
                <th>Artist Name</th>
                <th>Email</th>
                <th>Tasks Assigned</th>
                <th>Tasks Completed</th>
                <th>Status</th>
                <th>Verified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredArtistAccounts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data">
                    {artistSearchTerm ? 'No artist accounts match your search.' : 'No artist accounts found.'}
                  </td>
                </tr>
              ) : (
                filteredArtistAccounts.map((artist) => (
                  <tr key={`artist-${artist.id}-${forceUpdate}`}>
                    <td>
                      {editingArtist?.id === artist.id ? (
                        <input
                          type="text"
                          value={editFormData.artist_name}
                          onChange={(e) => handleEditFormChange('artist_name', e.target.value)}
                          className="edit-input"
                          placeholder="Artist Name"
                        />
                      ) : (
                        artist.artist_name || 'N/A'
                      )}
                    </td>
                    <td>
                      {editingArtist?.id === artist.id ? (
                        <input
                          type="email"
                          value={editFormData.email}
                          onChange={(e) => handleEditFormChange('email', e.target.value)}
                          className="edit-input"
                          placeholder="Email Address"
                        />
                      ) : (
                        artist.email || 'N/A'
                      )}
                    </td>
                    <td>{artist.total_tasks_assigned || 0}</td>
                    <td>{artist.total_tasks_completed || 0}</td>
                    <td>
                      {isOwner ? (
                        <button
                          onClick={() => handleToggleArtistStatus(artist)}
                          className={`status-toggle-btn ${artist.is_active ? 'active' : 'inactive'}`}
                          title={artist.is_active ? 'Click to set inactive' : 'Click to activate'}
                          aria-label={artist.is_active ? 'Set artist inactive' : 'Activate artist'}
                        >
                          <FontAwesomeIcon 
                            icon={artist.is_active ? faToggleOn : faToggleOff} 
                            className="toggle-icon"
                          />
                          <span className="toggle-label">
                            {artist.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      ) : (
                      <span className={`status-badge ${artist.is_active ? 'active' : 'inactive'}`}>
                        {artist.is_active ? 'Active' : 'Inactive'}
                      </span>
                      )}
                    </td>
                    <td>
                      <span className={`verification-badge ${artist.is_verified ? 'verified' : 'unverified'}`}>
                        {artist.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {editingArtist?.id === artist.id ? (
                          <>
                            <button
                              onClick={handleSaveArtist}
                              className="save-btn"
                              title="Save Changes"
                              aria-label="Save Changes"
                            >
                              <FontAwesomeIcon icon={faSave} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="cancel-btn"
                              title="Cancel Edit"
                              aria-label="Cancel Edit"
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </button>
                          </>
                        ) : (
                          <>
                            {isOwner && (
                              <button
                                onClick={() => handleEditArtist(artist)}
                                className="edit-btn"
                                title="Edit Artist Information"
                                aria-label="Edit Artist Information"
                              >
                                <FontAwesomeIcon icon={faEdit} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteArtist(artist.id)}
                              className="delete-btn"
                              title="Delete Artist Account"
                              aria-label="Delete Artist Account"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Accounts Section */}
      {activeTab === 'customer' && (
        <div className="accounts-section">
        <div className="section-header">
          <h2>
            <FontAwesomeIcon icon={faUsers} />
            Customer Accounts ({customerTotal > 0 ? customerTotal : filteredCustomerAccounts.length})
          </h2>
          <div className="accounts-search-container">
            <input
              type="text"
              placeholder="Search customer accounts..."
              value={customerSearchTerm}
              onChange={(e) => setCustomerSearchTerm(e.target.value)}
              className="accounts-search-input"
            />
            <FontAwesomeIcon icon={faSearch} className="accounts-search-icon" />
          </div>
        </div>

        <div className="accounts-table-container">
          <table className="accounts-table customer-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Contact Number</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomerAccounts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">
                    {customerSearchTerm ? 'No customer accounts match your search.' : 'No customer accounts found.'}
                  </td>
                </tr>
              ) : (
                filteredCustomerAccounts.map((customer) => (
                  <tr key={`customer-${customer.id}-${forceUpdate}`}>
                    <td>{getCustomerDisplayName(customer)}</td>
                    <td>{customer.email || 'N/A'}</td>
                    <td>{customer.contact_number || 'N/A'}</td>
                    <td>{customer.address || 'N/A'}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteCustomer(customer.id)}
                        className="delete-btn"
                        title="Delete Customer Account"
                        aria-label="Delete Customer Account"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {customerTotalPages > 1 && (
            <div className="accounts-pagination">
              <div className="pagination-info">
                Showing page {customerPage} of {customerTotalPages} ({customerTotal} total customers)
              </div>
              <div className="pagination-buttons">
                <button
                  className="pagination-btn prev-btn"
                  onClick={() => setCustomerPage(prev => Math.max(1, prev - 1))}
                  disabled={customerPage === 1}
                >
                  <FaChevronLeft /> Previous
                </button>
                
                <div className="page-numbers">
                  {Array.from({length: Math.min(5, customerTotalPages)}, (_, i) => {
                    let pageNum;
                    if (customerTotalPages <= 5) {
                      pageNum = i + 1;
                    } else if (customerPage <= 3) {
                      pageNum = i + 1;
                    } else if (customerPage >= customerTotalPages - 2) {
                      pageNum = customerTotalPages - 4 + i;
                    } else {
                      pageNum = customerPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`page-number ${customerPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCustomerPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  className="pagination-btn next-btn"
                  onClick={() => setCustomerPage(prev => Math.min(customerTotalPages, prev + 1))}
                  disabled={customerPage === customerTotalPages}
                >
                  Next <FaChevronRight />
                </button>
              </div>
              <div className="pagination-per-page">
                <label>Per page:</label>
                <select
                  value={customerPerPage}
                  onChange={(e) => {
                    setCustomerPerPage(Number(e.target.value));
                    setCustomerPage(1);
                  }}
                  className="pagination-select"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Toggle Confirmation Modal */}
      <ConfirmModal
        isOpen={isStatusConfirmOpen}
        onClose={() => {
          setIsStatusConfirmOpen(false);
          setPendingArtist(null);
          setPendingStatus(null);
        }}
        onConfirm={handleConfirmStatusChange}
        title={pendingStatus ? 'Activate Artist' : 'Set Artist Inactive'}
        message={
          pendingArtist
            ? pendingStatus
              ? `Are you sure you want to activate ${pendingArtist.artist_name || pendingArtist.email}? They will be eligible to receive new task assignments from orders.`
              : `Are you sure you want to set ${pendingArtist.artist_name || pendingArtist.email} to inactive? They will be excluded from receiving new task assignments. Existing tasks will not be affected.`
            : ''
        }
        confirmText={pendingStatus ? 'Activate' : 'Set Inactive'}
        cancelText="Cancel"
        type={pendingStatus ? 'success' : 'warning'}
      />
    </div>
    </div>
    </div>
  );
};

export default Accounts;