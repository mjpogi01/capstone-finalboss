import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import wishlistService from '../services/wishlistService';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load wishlist from database when user changes
  useEffect(() => {
    const loadWishlist = async () => {
      if (!user) {
        setWishlistItems([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const dbWishlistItems = await wishlistService.getUserWishlist(user.id);
        setWishlistItems(dbWishlistItems);
      } catch (error) {
        console.error('Error loading wishlist from database:', error);
        setWishlistItems([]);
        setError('Failed to load wishlist from database');
      } finally {
        setIsLoading(false);
      }
    };

    loadWishlist();
  }, [user]);

  // Function to reload wishlist from database
  const reloadWishlist = async (forceRefresh = true) => {
    if (!user) return;
    
    try {
      const dbWishlistItems = await wishlistService.getUserWishlist(user.id, forceRefresh);
      setWishlistItems(dbWishlistItems);
    } catch (error) {
      console.error('Error reloading wishlist:', error);
    }
  };

  const addToWishlist = async (product) => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newWishlistItem = await wishlistService.addToWishlist(user.id, product);
      setWishlistItems(prevItems => {
        // Check if item already exists
        const existingItem = prevItems.find(item => item.id === product.id);
        if (existingItem) {
          return prevItems; // Don't add duplicates
        }
        return [...prevItems, newWishlistItem];
      });
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      setError('Failed to add item to wishlist');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      await wishlistService.removeFromWishlist(user.id, productId);
      setWishlistItems(prevItems => 
        prevItems.filter(item => item.id !== productId)
      );
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      setError('Failed to remove item from wishlist');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWishlist = async (product) => {
    if (!user) return;

    const isInWishlist = wishlistItems.some(item => item.id === product.id);
    
    if (isInWishlist) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product);
    }
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some(item => item.id === productId);
  };

  const openWishlist = () => setIsWishlistOpen(true);
  const closeWishlist = () => setIsWishlistOpen(false);

  const value = {
    wishlistItems,
    isWishlistOpen,
    isLoading,
    error,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    openWishlist,
    closeWishlist,
    reloadWishlist
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};
