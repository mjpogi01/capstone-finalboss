import React, { createContext, useContext, useState } from 'react';

const ModalContext = createContext();

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  const openSignIn = () => setShowSignInModal(true);
  const closeSignIn = () => setShowSignInModal(false);
  
  const openSignUp = () => setShowSignUpModal(true);
  const closeSignUp = () => setShowSignUpModal(false);

  const value = {
    showSignInModal,
    showSignUpModal,
    openSignIn,
    closeSignIn,
    openSignUp,
    closeSignUp
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};
