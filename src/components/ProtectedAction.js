import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const ProtectedAction = ({ 
  children, 
  onAuthenticated, 
  onUnauthenticated, 
  className = "",
  ...props 
}) => {
  const { isAuthenticated } = useAuth();

  const handleClick = () => {
    if (isAuthenticated) {
      onAuthenticated?.();
    } else {
      onUnauthenticated?.();
    }
  };

  return (
    <div 
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default ProtectedAction;
