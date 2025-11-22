import React from 'react';
import './App.css';
import './styles/responsive-global.css';
import Header from './components/customer/Header';
import Footer from './components/customer/Footer';
import Branches from './pages/customer/Branches';
import Home from './pages/customer/Home';
import About from './pages/customer/About';
import Highlights from './pages/customer/Highlights';
import FAQs from './pages/customer/FAQs';
import Contacts from './pages/customer/Contacts';
import PrivacyPolicy from './pages/customer/PrivacyPolicy';
import TermsAndConditions from './pages/customer/TermsAndConditions';
import DataDeletion from './pages/customer/DataDeletion';
import Profile from './pages/customer/Profile';
import LogoutPage from './pages/customer/LogoutPage';
import Unsubscribe from './pages/customer/Unsubscribe';
import AuthCallback from './pages/customer/AuthCallback';
import ResetPassword from './pages/customer/ResetPassword';
import AdminDashboard from './pages/admin/AdminDashboard';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import ArtistDashboard from './pages/artist/ArtistDashboard';
import Inventory from './pages/admin/Inventory';
import Accounts from './pages/admin/Accounts';
import Orders from './pages/admin/Orders';
import WalkInOrders from './pages/admin/WalkInOrders';
import Analytics from './pages/admin/Analytics';
import BranchSupport from './pages/admin/BranchSupport';
import EmailMarketingPage from './pages/admin/EmailMarketing';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRedirect from './components/RoleRedirect';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { NotificationProvider } from './contexts/NotificationContext';
import NotificationContainer from './components/NotificationContainer';

const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/inventory');
  const isOwnerRoute = location.pathname.startsWith('/owner');
  const isArtistRoute = location.pathname.startsWith('/artist');
  const isLogoutPage = location.pathname === '/logout';

  // Handle OAuth callback on any route - check for tokens in hash
  React.useEffect(() => {
    const hashParams = window.location.hash.substring(1);
    const hasAuthTokens = hashParams.includes('access_token') || hashParams.includes('error');
    
    // If we have OAuth tokens and we're not already on the callback route, redirect there
    if (hasAuthTokens && !location.pathname.includes('/auth/callback')) {
      // Preserve the hash when redirecting
      window.location.replace(`/auth/callback${window.location.hash}`);
    }
  }, [location.pathname]);

  return (
    <>
      <RoleRedirect />
      {!isAdminRoute && !isOwnerRoute && !isArtistRoute && !isLogoutPage && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/highlights" element={<Highlights />} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/faqs" element={<FAQs />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/data-deletion" element={<DataDeletion />} />
        <Route path="/logout" element={<LogoutPage />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/owner" 
          element={
            <ProtectedRoute requireOwner={true}>
              <OwnerDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/artist" 
          element={
            <ProtectedRoute requireArtist={true}>
              <ArtistDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/inventory" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <Inventory />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/accounts" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <Accounts />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/owner/accounts" 
          element={
            <ProtectedRoute requireOwner={true}>
              <Accounts />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/orders"
          element={
            <ProtectedRoute requireAdmin={true}>
              <Orders />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/admin/support"
          element={
            <ProtectedRoute requireAdmin={true}>
              <BranchSupport />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/admin/walk-in-orders"
          element={
            <ProtectedRoute requireAdmin={true}>
              <WalkInOrders />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/owner/orders" 
          element={
            <ProtectedRoute requireOwner={true}>
              <Orders />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/owner/support"
          element={
            <ProtectedRoute requireOwner={true}>
              <BranchSupport />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/owner/walk-in-orders"
          element={
            <ProtectedRoute requireOwner={true}>
              <WalkInOrders />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/analytics"
          element={
            <ProtectedRoute requireAdmin={true}>
              <Analytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/owner/analytics" 
          element={
            <ProtectedRoute requireOwner={true}>
              <Analytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/email-marketing"
          element={
            <ProtectedRoute requireAdmin={true}>
              <EmailMarketingPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/owner/email-marketing" 
          element={
            <ProtectedRoute requireOwner={true}>
              <EmailMarketingPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
      {!isAdminRoute && !isOwnerRoute && !isArtistRoute && !isLogoutPage && <Footer />}
    </>
  );
};

function App() {
  return (
    <div className="App">
      <NotificationProvider>
        <AuthProvider>
          <ModalProvider>
            <CartProvider>
              <WishlistProvider>
                <Router>
                  <AppContent />
                  <NotificationContainer />
                </Router>
              </WishlistProvider>
            </CartProvider>
          </ModalProvider>
        </AuthProvider>
      </NotificationProvider>
    </div>
  );
}

export default App;
