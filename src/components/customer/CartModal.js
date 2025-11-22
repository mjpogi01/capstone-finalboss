import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faTrash, faMinus, faPlus, faShoppingBag, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import orderService from '../../services/orderService';
import CheckoutModal from './CheckoutModal';
import ProductModal from './ProductModal';
import OrderProcessingModal from './OrderProcessingModal';
import productService from '../../services/productService';
import './CartModal.css';

const CartModal = () => {
  const {
    cartItems,
    selectedItems,
    isCartOpen,
    isLoading,
    error,
    closeCart,
    removeFromCart,
    updateQuantity,
    getCartTotal,
    getCartItemCount,
    toggleItemSelection,
    selectAllItems,
    deselectAllItems,
    isAllSelected,
    isItemSelected,
    clearCart
  } = useCart();
  const { user } = useAuth();
  const { showOrderConfirmation, showError } = useNotification();

  const [showCheckout, setShowCheckout] = useState(false);
  const [expandedOrderIndex, setExpandedOrderIndex] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  const toggleItemExpansion = (index) => {
    setExpandedOrderIndex((prev) => (prev === index ? null : index));
  };

  const handleQuantityChange = async (itemId, newQuantity, isTeamOrder) => {
    if (isTeamOrder) {
      // For team orders, redirect to product modal for customization
      const cartItem = cartItems.find(item => (item.uniqueId || item.id) === itemId);
      if (cartItem) {
        // Create a product object from the cart item

        const baseCartData = {
          size: cartItem.size,
          quantity: cartItem.quantity,
          isTeamOrder: cartItem.isTeamOrder,
          teamMembers: cartItem.teamMembers,
          singleOrderDetails: cartItem.singleOrderDetails,
          sizeType: cartItem.sizeType,
          fabricOption: cartItem.fabricOption,
          fabricSurcharge: cartItem.fabricSurcharge,
          sizeSurcharge: cartItem.sizeSurcharge,
          sizeSurchargeTotal: cartItem.sizeSurchargeTotal,
          basePrice: cartItem.basePrice,
          price: cartItem.price,
          surchargeDetails: cartItem.surchargeDetails
        };

        let product = {
          id: cartItem.id,
          name: cartItem.name,
          price: cartItem.price,
          base_price: cartItem.basePrice ?? cartItem.price,
          main_image: cartItem.image,
          category: cartItem.category || (cartItem.isTeamOrder ? 'team' : 'single'),
          uniqueId: cartItem.uniqueId,
          fabric_surcharges: null,
          size_surcharges: null,
          jersey_prices: cartItem.jersey_prices || null,
          size: cartItem.size || null,
          cartItemData: baseCartData
        };

        if (cartItem.id) {
          try {
            const fullProduct = await productService.getProductById(cartItem.id);
            if (fullProduct) {
              product = {
                ...fullProduct,
                ...product,
                price: fullProduct.price ?? product.price,
                base_price: fullProduct.base_price ?? product.base_price,
                main_image: fullProduct.main_image || product.main_image,
                category: fullProduct.category || product.category,
                fabric_surcharges: fullProduct.fabric_surcharges ?? product.fabric_surcharges,
                size_surcharges: fullProduct.size_surcharges ?? product.size_surcharges,
                jersey_prices: fullProduct.jersey_prices ?? product.jersey_prices,
                size: fullProduct.size ?? product.size
              };
              product.cartItemData = baseCartData;
            }
          } catch (error) {
            console.error('Failed to load latest product details for cart item:', error);
          }
        }

        setSelectedProduct(product);
        setShowProductModal(true);
      }
    } else {
      // For single orders, just update quantity
      if (newQuantity < 1) {
        removeFromCart(itemId);
      } else {
        updateQuantity(itemId, newQuantity);
      }
    }
  };

  const handleCheckout = () => {
    const selectedItemsList = cartItems.filter(item => selectedItems.has(item.uniqueId || item.id));
    console.log('🛒 Proceeding to checkout with items:', selectedItemsList.length);
    console.log('🛒 Selected items:', selectedItemsList.map(item => ({ id: item.uniqueId || item.id, name: item.name })));
    setShowCheckout(true);
    closeCart(); // Close cart modal when opening checkout
  };

  const handlePlaceOrder = async (orderData) => {
    try {
      if (!user) {
        showError('Login Required', 'Please log in to place an order.');
        return;
      }

      // Note: Processing modal is now handled by CheckoutModal
      // Only show processing modal if not coming from checkout
      const isFromCheckout = orderData._fromCheckout;
      if (!isFromCheckout) {
        setIsProcessingOrder(true);
      }

      console.log('🛒 Creating order from cart with data:', orderData);

      // Format order data for database
      const formattedOrderData = {
        user_id: user.id,
        order_number: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        shipping_method: orderData.shippingMethod,
        pickup_location: orderData.selectedLocation || null,
        pickup_branch_id: orderData.selectedBranchId || null,
        delivery_address: orderData.deliveryAddress,
        order_notes: orderData.orderNotes || null,
        subtotal_amount: orderData.subtotalAmount,
        shipping_cost: orderData.shippingCost,
        total_amount: orderData.totalAmount,
        total_items: orderData.totalItems,
        order_items: orderData.items
      };

      console.log('🛒 Formatted order data:', formattedOrderData);

      // Create order in database
      const createdOrder = await orderService.createOrder(formattedOrderData);
      
      console.log('✅ Order created successfully:', createdOrder);
      
      // Hide processing modal (if we showed it)
      if (!isFromCheckout) {
        setIsProcessingOrder(false);
      }
      
      // Show success notification
      showOrderConfirmation(createdOrder.order_number, orderData.totalAmount);
      
      // Remove only the checked out items from cart
      const checkedOutItemIds = orderData.items.map(item => item.uniqueId || item.id);
      console.log('🛒 Removing checked out items from cart:', checkedOutItemIds);
      
      for (const itemId of checkedOutItemIds) {
        await removeFromCart(itemId);
      }
      
      // Trigger a custom event to refresh orders count in header
      window.dispatchEvent(new CustomEvent('orderPlaced'));
      
      // Close modals
      setShowCheckout(false);
      closeCart();
      
    } catch (error) {
      console.error('❌ Error creating order:', error);
      
      // Hide processing modal (if we showed it)
      const isFromCheckout = orderData?._fromCheckout;
      if (!isFromCheckout) {
        setIsProcessingOrder(false);
      }
      
      // Check if it's a network error (backend not running)
      if (error.isNetworkError || error.message?.includes('backend server')) {
        showError('Backend Server Not Running', error.message || 'Please ensure the backend server is running on port 4000. Start it with: npm run server:dev or double-click start-backend.bat');
      } else {
        showError('Order Failed', `Failed to place order: ${error.message}. Please try again.`);
      }
    }
  };

  const handleCloseProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
  };

  return (
    <>
      {isCartOpen && (
        <div className="mycart-overlay-clean" onClick={closeCart}>
          <div className="mycart-container-clean" onClick={(e) => e.stopPropagation()}>
            <div className="mycart-header-clean">
              <h2>MY CART</h2>
              <button className="mycart-close-btn-clean" onClick={closeCart}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="mycart-content-clean">
            {isLoading ? (
              <div className="mycart-loading-state">
                <div className="mycart-loading-spinner"></div>
                <p>Loading cart...</p>
              </div>
            ) : error ? (
              <div className="mycart-error-state">
                <p>Error: {error}</p>
                <button onClick={() => window.location.reload()}>Retry</button>
              </div>
            ) : cartItems.length === 0 ? (
              <div className="mycart-empty-state">
                <FontAwesomeIcon icon={faShoppingBag} className="mycart-empty-icon" />
                <h3>Your cart is empty</h3>
                <p>Add some items to get started!</p>
              </div>
            ) : (
              <>
                <div className="mycart-items-list-clean">
                  {cartItems.map((item, index) => {
                    const uniqueKey = item.uniqueId || item.id;
                    const baseUnitPrice = Number(item.basePrice ?? item.price ?? 0);
                    const fabricOption = item.fabricOption || null;
                    const fabricSurcharge = Number(item.fabricSurcharge ?? 0);
                    const cutType = item.cutType || null;
                    const cutTypeSurcharge = Number(item.cutTypeSurcharge ?? 0);
                    // Determine category for hiding fields
                    const categoryLower = item.category?.toLowerCase() || '';
                    const isUniformsCategory = categoryLower === 'uniforms';
                    const isHoodieCategory = categoryLower === 'hoodies';
                    const isLongSleevesCategory = categoryLower === 'long sleeves';
                    const isTShirtCategory = categoryLower === 't-shirts' || categoryLower === 't-shirt';
                    const shouldHideJerseyType = isUniformsCategory || isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
                    const shouldHideCutType = isUniformsCategory || isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
                    const sizeSurchargePerUnit = Number(item.sizeSurcharge ?? 0);
                    const sizeSurchargeTotal = Number(
                      item.sizeSurchargeTotal ??
                        (item.isTeamOrder
                          ? sizeSurchargePerUnit *
                            (Array.isArray(item.teamMembers) && item.teamMembers.length > 0
                              ? item.teamMembers.length
                              : Number(item.quantity || 1))
                          : sizeSurchargePerUnit * Number(item.quantity || 1))
                    );
                    const perUnitTotal = Number(item.price ?? 0);
                    const hasFabricSurcharge =
                      fabricOption || fabricSurcharge > 0;
                    const hasCutTypeSurcharge =
                      cutType || cutTypeSurcharge > 0;
                    const hasSizeSurcharge =
                      sizeSurchargePerUnit > 0 || sizeSurchargeTotal > 0;
                    const hasSurcharges = hasFabricSurcharge || hasCutTypeSurcharge || hasSizeSurcharge;
                    const lineTotal = perUnitTotal * Number(item.quantity || 1);

                    return (
                    <div
                      key={uniqueKey}
                      className={`mycart-item-box ${expandedOrderIndex === index ? 'expanded' : ''}`}
                      onClick={(e) => {
                        if (
                          e.target.closest('.mycart-checkbox-wrapper') ||
                          e.target.closest('.mycart-remove-btn-clean') ||
                          e.target.closest('.mycart-quantity-controls')
                        ) {
                          return;
                        }
                        toggleItemExpansion(index);
                      }}
                    >
                      <div className="mycart-checkbox-wrapper">
                        <input 
                          type="checkbox" 
                          checked={isItemSelected(item.uniqueId || item.id)}
                          onChange={() => toggleItemSelection(item.uniqueId || item.id)}
                        />
                      </div>
                
                      <div className="mycart-product-image-wrapper">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          onError={(e) => {
                            e.target.src = '/images/placeholder-jersey.png';
                          }}
                        />
                      </div>
                      
                      <div
                        className="mycart-product-info-section"
                      >
                        <div className="mycart-product-header-line">
                          <h3 className="mycart-product-name">{item.name}</h3>
                          <button 
                            className="mycart-remove-btn-clean"
                            onClick={() => removeFromCart(item.uniqueId || item.id)}
                            title="Remove item"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                        
                        <div className="mycart-order-type-container">
                          {(() => {
                            const isBall = item.category?.toLowerCase() === 'balls';
                            const isTrophy = item.category?.toLowerCase() === 'trophies';
                            const isApparel = !isBall && !isTrophy;

                            return (
                              <>
                                {!isBall && (
                                  <>
                                    <div 
                                      className={`mycart-order-type-header ${expandedOrderIndex === index ? 'expanded' : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleItemExpansion(index);
                                      }}
                                    >
                                      <span className="mycart-order-type-label">
                                        {isTrophy ? 'Trophy Details' : (item.isTeamOrder ? 'Team Order' : 'Single Order')}
                                      </span>
                                      <span className="mycart-dropdown-arrow">
                                        <FontAwesomeIcon icon={faChevronDown} />
                                      </span>
                                    </div>
                                    
                                    {expandedOrderIndex === index && (
                                  <div className="mycart-order-details-section">
                                    {/* For Apparel - Team Orders */}
                                    {isApparel && item.isTeamOrder && item.teamMembers && item.teamMembers.length > 0 ? (
                                      <div>
                                        <div className="mycart-detail-line">
                                          <span className="mycart-detail-label">Team:</span>
                                          <span className="mycart-detail-value">{item.teamMembers[0]?.teamName || 'N/A'}</span>
                                        </div>
                                        <div className="mycart-team-members-list">
                                          {item.teamMembers.map((member, memberIndex) => {
                                            const memberJerseyType = member.jerseyType || member.jersey_type || 'full';
                                            const memberFabricOption = member.fabricOption || member.fabric_option || '';
                                            const memberCutType = member.cutType || member.cut_type || '';
                                            const memberSizingType = member.sizingType || member.sizing_type || item.sizeType || 'adult';
                                            const jerseyTypeLabel = memberJerseyType === 'shirt' ? 'Shirt Only' : memberJerseyType === 'shorts' ? 'Shorts Only' : 'Full Set';
                                            
                                            // Calculate member price - prioritize stored totalPrice, then calculate from components
                                            let memberPrice = 0;
                                            if (member.totalPrice && member.totalPrice > 0) {
                                              memberPrice = member.totalPrice;
                                            } else if (member.basePrice !== undefined || member.fabricSurcharge !== undefined || member.cutTypeSurcharge !== undefined || member.sizeSurcharge !== undefined) {
                                              memberPrice = (member.basePrice || 0) + (member.fabricSurcharge || 0) + (member.cutTypeSurcharge || 0) + (member.sizeSurcharge || 0);
                                            } else {
                                              // Fallback: divide total by number of members
                                              memberPrice = perUnitTotal / Math.max(1, item.teamMembers?.length || 1);
                                            }
                                            
                                            return (
                                            <div key={memberIndex} className="mycart-team-member-item">
                                              <div className="mycart-detail-line">
                                                <span className="mycart-detail-label">Surname:</span>
                                                <span className="mycart-detail-value">{(member.surname || 'N/A').toUpperCase()}</span>
                                              </div>
                                              <div className="mycart-detail-line">
                                                <span className="mycart-detail-label">Jersey:</span>
                                                <span className="mycart-detail-value">{member.number || member.jerseyNo || member.jerseyNumber || 'N/A'}</span>
                                              </div>
                                              {/* Jersey Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                              {!shouldHideJerseyType && (
                                                <div className="mycart-detail-line">
                                                  <span className="mycart-detail-label">Jersey Type:</span>
                                                  <span className="mycart-detail-value">{jerseyTypeLabel}</span>
                                                </div>
                                              )}
                                              {memberFabricOption && (
                                                <div className="mycart-detail-line">
                                                  <span className="mycart-detail-label">Fabric:</span>
                                                  <span className="mycart-detail-value">{memberFabricOption}</span>
                                                </div>
                                              )}
                                              {/* Cut Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                              {memberCutType && !shouldHideCutType && (
                                                <div className="mycart-detail-line">
                                                  <span className="mycart-detail-label">Cut Type:</span>
                                                  <span className="mycart-detail-value">{memberCutType}</span>
                                                </div>
                                              )}
                                              <div className="mycart-detail-line">
                                                <span className="mycart-detail-label">Size Type:</span>
                                                <span className="mycart-detail-value">{memberSizingType === 'kids' ? 'Kids' : 'Adult'}</span>
                                              </div>
                                              {/* Jersey/Shirt Size - Show for full set, shirt only, or hoodies/long sleeves/T-shirts (treated as shirt-only) */}
                                              {(((memberJerseyType === 'full' || memberJerseyType === 'shirt') || (shouldHideJerseyType && (member.size || member.jerseySize))) && (
                                                <div className="mycart-detail-line">
                                                  <span className="mycart-detail-label">{shouldHideJerseyType ? 'Size:' : 'Jersey Size:'}</span>
                                                  <span className="mycart-detail-value">{member.jerseySize || member.size || 'N/A'}</span>
                                                </div>
                                              ))}
                                              {/* Shorts Size - Hide for hoodies, long sleeves, and T-shirts */}
                                              {(memberJerseyType === 'full' || memberJerseyType === 'shorts') && !shouldHideJerseyType && (
                                                <div className="mycart-detail-line">
                                                  <span className="mycart-detail-label">Shorts Size:</span>
                                                  <span className="mycart-detail-value">{member.shortsSize || 'N/A'}</span>
                                                </div>
                                              )}
                                              <div className="mycart-member-price">
                                                <span className="mycart-member-price-label">Price:</span>
                                                <span className="mycart-member-price-value">₱{memberPrice.toFixed(2)}</span>
                                              </div>
                                            </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ) : isApparel ? (
                                      /* For Apparel - Single Orders */
                                      <div>
                                        <div className="mycart-detail-line">
                                          <span className="mycart-detail-label">Team:</span>
                                          <span className="mycart-detail-value">{item.singleOrderDetails?.teamName || 'N/A'}</span>
                                        </div>
                                        <div className="mycart-detail-line">
                                          <span className="mycart-detail-label">Surname:</span>
                                          <span className="mycart-detail-value">{(item.singleOrderDetails?.surname || 'N/A').toUpperCase()}</span>
                                        </div>
                                        <div className="mycart-detail-line">
                                          <span className="mycart-detail-label">Jersey:</span>
                                          <span className="mycart-detail-value">{item.singleOrderDetails?.number || item.singleOrderDetails?.jerseyNo || item.singleOrderDetails?.jerseyNumber || 'N/A'}</span>
                                        </div>
                                        {(item.fabricOption || item.singleOrderDetails?.fabricOption) && (
                                          <div className="mycart-detail-line">
                                            <span className="mycart-detail-label">Fabric:</span>
                                            <span className="mycart-detail-value">{item.fabricOption || item.singleOrderDetails?.fabricOption}</span>
                                          </div>
                                        )}
                                        {/* Cut Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                        {(item.cutType || item.singleOrderDetails?.cutType) && !shouldHideCutType && (
                                          <div className="mycart-detail-line">
                                            <span className="mycart-detail-label">Cut Type:</span>
                                            <span className="mycart-detail-value">{item.cutType || item.singleOrderDetails?.cutType}</span>
                                          </div>
                                        )}
                                        {/* Jersey/Shirt Size - For non-jersey apparel, show as "Size" */}
                                        <div className="mycart-detail-line">
                                          <span className="mycart-detail-label">{shouldHideJerseyType ? 'Size:' : 'Jersey Size:'}</span>
                                          <span className="mycart-detail-value">{item.singleOrderDetails?.jerseySize || item.singleOrderDetails?.size || 'N/A'} ({item.sizeType || 'Adult'})</span>
                                        </div>
                                        {/* Shorts Size - Hide for hoodies, long sleeves, and T-shirts */}
                                        {!shouldHideJerseyType && (
                                          <div className="mycart-detail-line">
                                            <span className="mycart-detail-label">Shorts Size:</span>
                                            <span className="mycart-detail-value">{item.singleOrderDetails?.shortsSize || item.singleOrderDetails?.size || 'N/A'} ({item.sizeType || 'Adult'})</span>
                                          </div>
                                        )}
                                      </div>
                                    ) : isTrophy ? (
                                      /* For Trophies */
                                      <div>
                                        <div className="mycart-detail-line">
                                          <span className="mycart-detail-label">Size:</span>
                                          <span className="mycart-detail-value">{item.trophyDetails?.size || 'N/A'}</span>
                                        </div>
                                        <div className="mycart-detail-line">
                                          <span className="mycart-detail-label">Engraving:</span>
                                          <span className="mycart-detail-value">{item.trophyDetails?.engravingText || 'N/A'}</span>
                                        </div>
                                        <div className="mycart-detail-line">
                                          <span className="mycart-detail-label">Occasion:</span>
                                          <span className="mycart-detail-value">{item.trophyDetails?.occasion || 'N/A'}</span>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                    )}
                                  </>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        
                        {expandedOrderIndex === index && (
                        <div className="mycart-quantity-controls" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="mycart-quantity-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuantityChange(item.uniqueId || item.id, item.quantity - 1, item.isTeamOrder);
                            }}
                            disabled={item.quantity <= 1}
                            title={item.quantity <= 1 ? "Minimum quantity reached" : "Decrease quantity"}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <FontAwesomeIcon icon={faMinus} />
                          </button>
                          <span className="mycart-quantity-display" aria-live="polite">{item.quantity}</span>
                          <button 
                            className="mycart-quantity-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuantityChange(item.uniqueId || item.id, item.quantity + 1, item.isTeamOrder);
                            }}
                            title="Increase quantity"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <FontAwesomeIcon icon={faPlus} />
                          </button>
                        </div>
                        )}
                        
                        <div className="mycart-price-display">
                          <span className="mycart-item-price">
                            ₱{perUnitTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>

                <div className="mycart-footer-section">
                  <div className="mycart-select-all-row">
                    <input 
                      type="checkbox" 
                      id="select-all" 
                      checked={isAllSelected()}
                      onChange={() => isAllSelected() ? deselectAllItems() : selectAllItems()}
                    />
                    <label htmlFor="select-all">Select All ({cartItems.length})</label>
                  </div>
                  
                  <div className="mycart-total-section">
                    <span className="mycart-total-label">Total ({getCartItemCount()} Item):</span>
                    <span className="mycart-total-amount">₱{getCartTotal().toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                  
                  <button 
                    className="mycart-checkout-btn-clean" 
                    onClick={handleCheckout}
                    disabled={selectedItems.size === 0}
                  >
                    CHECK OUT ({selectedItems.size} items)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      )}

      {showCheckout && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          cartItems={cartItems.filter(item => selectedItems.has(item.uniqueId || item.id))}
          onPlaceOrder={handlePlaceOrder}
          onBack={async () => {
            const selectedCartItems = cartItems.filter(item => selectedItems.has(item.uniqueId || item.id));
            if (selectedCartItems.length > 0) {
              // Close checkout modal
              setShowCheckout(false);
              // Open product modal for the first selected item
              const firstItem = selectedCartItems[0];
              
              // Fetch latest product details
              try {
                const product = await productService.getProductById(firstItem.id || firstItem.product_id);
                const cartItemData = {
                  size: firstItem.size || firstItem.selectedSize,
                  quantity: firstItem.quantity,
                  isTeamOrder: firstItem.isTeamOrder,
                  teamMembers: firstItem.teamMembers,
                  singleOrderDetails: firstItem.singleOrderDetails,
                  sizeType: firstItem.sizeType,
                  jerseyType: firstItem.jerseyType,
                  fabricOption: firstItem.fabricOption,
                  ballDetails: firstItem.ballDetails,
                  trophyDetails: firstItem.trophyDetails
                };
                setSelectedProduct({
                  ...product,
                  uniqueId: firstItem.uniqueId,
                  cartItemData: cartItemData
                });
                setShowProductModal(true);
              } catch (error) {
                console.error('Failed to load product details:', error);
                // Fallback: use cart item data directly
                const cartItemData = {
                  size: firstItem.size || firstItem.selectedSize,
                  quantity: firstItem.quantity,
                  isTeamOrder: firstItem.isTeamOrder,
                  teamMembers: firstItem.teamMembers,
                  singleOrderDetails: firstItem.singleOrderDetails,
                  sizeType: firstItem.sizeType,
                  jerseyType: firstItem.jerseyType,
                  fabricOption: firstItem.fabricOption,
                  ballDetails: firstItem.ballDetails,
                  trophyDetails: firstItem.trophyDetails
                };
                setSelectedProduct({
                  ...firstItem,
                  cartItemData: cartItemData
                });
                setShowProductModal(true);
              }
            } else {
              setShowCheckout(false);
            }
          }}
        />
      )}

      <OrderProcessingModal 
        isOpen={isProcessingOrder}
        onClose={() => setIsProcessingOrder(false)}
        onError={(error) => {
          setIsProcessingOrder(false);
          showError('Order Failed', error.message);
        }}
      />

      {showProductModal && selectedProduct && (
        <>
          <ProductModal
            isOpen={showProductModal}
            onClose={handleCloseProductModal}
            product={selectedProduct}
            isFromCart={true}
            existingCartItemId={selectedProduct.uniqueId}
            existingCartItemData={selectedProduct.cartItemData}
          />
        </>
      )}
    </>
  );
};

export default CartModal;