import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import cartService from '../services/cartService';
import wishlistService from '../services/wishlistService';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const { showCartUpdate, showError } = useNotification();
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load cart from database when user changes
  useEffect(() => {
    const loadCart = async () => {
      if (!user) {
        setCartItems([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Load from database only
        console.log('🛒 Loading cart for user:', user.id, user.email);
        const dbCartItems = await cartService.getUserCart(user.id);
        console.log('🛒 Cart items loaded:', dbCartItems.length, 'items');
        setCartItems(dbCartItems);
      } catch (error) {
        console.error('Error loading cart from database:', error);
        setCartItems([]);
        setError('Failed to load cart from database');
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, [user]);

  // Cart is database-only - no localStorage needed

  // Function to reload cart from database
  const reloadCart = async (forceRefresh = true) => {
    if (!user) return;
    
    try {
      const dbCartItems = await cartService.getUserCart(user.id, forceRefresh);
      setCartItems(dbCartItems);
    } catch (error) {
      console.error('Error reloading cart:', error);
    }
  };

  const addToCart = async (product, options = {}) => {
    const {
      size = 'M',
      quantity = 1,
      isTeamOrder = false,
      teamMembers = null,
      teamName = null,
      singleOrderDetails = null,
      sizeType = null,
      jerseyType = null,
      ballDetails = null,
      trophyDetails = null,
      isReplacement = false // New flag to indicate if this is replacing an existing item
    } = options;

    // Get teamName from options, or from first team member, or from main teamName state
    const finalTeamName = teamName || (teamMembers && teamMembers.length > 0 ? (teamMembers[0]?.teamName || teamMembers[0]?.team_name) : null);

    const cartItem = {
      id: product.id,
      name: product.name,
      price: parseFloat(options.price ?? product.price), // Use custom price if provided
      image: product.main_image || product.image || '/images/placeholder-jersey.png',
      size,
      quantity,
      isTeamOrder,
      teamMembers: isTeamOrder ? teamMembers : null,
      teamName: isTeamOrder ? finalTeamName : null,
      singleOrderDetails: !isTeamOrder ? singleOrderDetails : null,
      sizeType,
      jerseyType,
      ballDetails: ballDetails,
      trophyDetails: trophyDetails,
      basePrice: parseFloat(options.basePrice ?? product.price) || parseFloat(product.price) || 0,
      fabricOption: options.fabricOption || null,
      fabricSurcharge: parseFloat(options.fabricSurcharge ?? 0) || 0,
      sizeSurcharge: parseFloat(options.sizeSurcharge ?? 0) || 0,
      sizeSurchargeTotal: parseFloat(options.sizeSurchargeTotal ?? options.sizeSurcharge ?? 0) || 0,
      surchargeDetails: options.surchargeDetails || null,
      addedAt: new Date().toISOString(),
      uniqueId: Date.now() + Math.random() // Generate a simple unique ID
    };

    if (!user) {
      // No user - cart is empty
      return;
    }

    // Handle database for logged-in users
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields before making API call
      if (!product.id || !product.name) {
        throw new Error('Invalid product data');
      }

      if (!user.id) {
        throw new Error('User not authenticated');
      }

      const newCartItem = await cartService.addToCart(user.id, cartItem);
      
      // Reload cart from database to get correct order (latest first) and updated quantities
      await reloadCart();

      // Remove from wishlist when added to cart
      try {
        await wishlistService.removeFromWishlist(user.id, product.id);
        console.log('✅ Item removed from wishlist after adding to cart:', product.name);
      } catch (wishlistError) {
        // Silently fail if item wasn't in wishlist or removal failed
        console.log('ℹ️ Item was not in wishlist or removal failed:', wishlistError.message);
      }

      // Show success notification
      showCartUpdate('added', product.name);

      // Auto-select the newly added item for Buy Now functionality
      if (options.isBuyNow) {
        console.log('🛒 Auto-selecting item for Buy Now:', newCartItem.uniqueId || newCartItem.id);
        // Use setTimeout to ensure cart items are updated first
        setTimeout(() => {
          // For Buy Now, clear existing selections and only select the new item
          const newItemId = newCartItem.uniqueId || newCartItem.id;
          setSelectedItems(new Set([newItemId]));
          console.log('🛒 Buy Now: Cleared existing selections, only selected new item:', newItemId);
          
          // Double-check that the item is in the cart
          setCartItems(currentItems => {
            const itemExists = currentItems.some(item => (item.uniqueId || item.id) === newItemId);
            console.log('🛒 Buy Now: Item exists in cart:', itemExists);
            console.log('🛒 Buy Now: Current cart items:', currentItems.map(item => ({ id: item.uniqueId || item.id, name: item.name })));
            return currentItems;
          });
        }, 200); // Increased timeout to ensure proper sequencing
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError('Failed to add item to cart');
      
      // Show specific error message based on error type
      if (error.message.includes('Invalid product data')) {
        showError('Invalid Product', 'Product information is missing. Please try again.');
      } else if (error.message.includes('User not authenticated')) {
        showError('Login Required', 'Please log in to add items to cart.');
      } else if (error.message.includes('Invalid product ID')) {
        showError('Product Error', 'Invalid product. Please refresh and try again.');
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        showError('Network Error', 'Please check your internet connection and try again.');
      } else {
        showError('Cart Error', 'Failed to add item to cart. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (uniqueId) => {
    if (!user) {
      // No user - nothing to remove
      return;
    }

    // Handle database for logged-in users
    setIsLoading(true);
    setError(null);

    try {
      await cartService.removeFromCart(user.id, uniqueId);
      
      // Immediately update the cart state by filtering out the removed item
      setCartItems(prevItems => {
        const filteredItems = prevItems.filter(item => {
          return item.uniqueId !== uniqueId;
        });
        return filteredItems;
      });
      
      // Also reload from database as backup to ensure consistency
      setTimeout(async () => {
        try {
          await reloadCart();
        } catch (reloadError) {
          console.error('Error in backup reload:', reloadError);
        }
      }, 1000);
    } catch (error) {
      console.error('Error removing from cart:', error);
      setError('Failed to remove item from cart');
      showError('Cart Error', 'Failed to remove item from cart. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (uniqueId, newQuantity) => {
    if (newQuantity <= 0) {
      await removeFromCart(uniqueId);
      return;
    }

    if (!user) {
      // No user - nothing to update
      return;
    }

    // Handle database for logged-in users
    setIsLoading(true);
    setError(null);

    try {
      await cartService.updateCartItem(user.id, uniqueId, newQuantity);
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.uniqueId === uniqueId ? { ...item, quantity: newQuantity } : item
        )
      );
    } catch (error) {
      console.error('Error updating cart item:', error);
      setError('Failed to update cart item');
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    if (!user) {
      // No user - nothing to clear
      return;
    }

    // Handle database for logged-in users
    setIsLoading(true);
    setError(null);

    try {
      await cartService.clearCart(user.id);
      setCartItems([]);
      setSelectedItems(new Set()); // Clear selected items as well
    } catch (error) {
      console.error('Error clearing cart:', error);
      setError('Failed to clear cart');
    } finally {
      setIsLoading(false);
    }
  };

  const getCartTotal = () => {
    return cartItems
      .filter(item => selectedItems.has(item.uniqueId || item.id))
      .reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cartItems
      .filter(item => selectedItems.has(item.uniqueId || item.id))
      .reduce((total, item) => total + item.quantity, 0);
  };

  const getCartItemsCount = () => {
    return cartItems.length;
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
        console.log('🛒 Item deselected:', itemId);
      } else {
        newSet.add(itemId);
        console.log('🛒 Item selected:', itemId);
      }
      console.log('🛒 Selected items:', Array.from(newSet));
      return newSet;
    });
  };

  const selectAllItems = () => {
    const allItemIds = cartItems.map(item => item.uniqueId || item.id);
    setSelectedItems(new Set(allItemIds));
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  const isAllSelected = () => {
    return cartItems.length > 0 && selectedItems.size === cartItems.length;
  };

  const isItemSelected = (itemId) => {
    return selectedItems.has(itemId);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const value = {
    cartItems,
    selectedItems,
    isCartOpen,
    isLoading,
    error,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartItemCount,
    getCartItemsCount,
    toggleItemSelection,
    selectAllItems,
    deselectAllItems,
    isAllSelected,
    isItemSelected,
    openCart,
    closeCart,
    reloadCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};