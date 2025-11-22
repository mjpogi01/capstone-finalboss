import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RoleRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      const currentPath = location.pathname;
      
      // Define admin/owner/artist protected routes
      const isOnAdminPage = currentPath.startsWith('/admin') || 
                           currentPath.startsWith('/owner') || 
                           currentPath.startsWith('/inventory');
      const isOnArtistPage = currentPath.startsWith('/artist');
      
      // Define customer pages that should be accessible
      // const customerPages = ['/', '/about', '/highlights', '/branches', '/faqs', '/contacts'];
      
      // Get user role from metadata
      const role = user.user_metadata?.role || 'customer';
      
      // Only redirect if:
      // 1. User is on home page (/) and has admin/owner/artist role
      // 2. User is trying to access protected pages without proper role
      if (currentPath === '/' && (role === 'owner' || role === 'admin' || role === 'artist')) {
        // Redirect users from home to their dashboard
        if (role === 'owner') {
          navigate('/owner', { replace: true });
        } else if (role === 'admin') {
          navigate('/admin', { replace: true });
        } else if (role === 'artist') {
          navigate('/artist', { replace: true });
        }
      } else if (isOnAdminPage && (role === 'customer' || role === 'artist')) {
        // Redirect customers and artists away from admin pages
        navigate('/', { replace: true });
      } else if (isOnArtistPage && (role === 'customer' || role === 'admin' || role === 'owner')) {
        // Redirect non-artists away from artist pages
        navigate('/', { replace: true });
      }
      // Allow customers to access all customer pages without redirect
    }
  }, [user, isAuthenticated, navigate, location.pathname]);

  return null; // This component doesn't render anything
};

export default RoleRedirect;
