import React, { useState, useEffect, useMemo } from 'react';
import { FaTimes, FaTruck, FaUsers, FaChevronDown, FaBasketballBall, FaTrophy, FaUserFriends, FaUser, FaMapMarkerAlt, FaChevronUp, FaTshirt, FaArrowLeft } from 'react-icons/fa';
import userService from '../../services/userService';
import branchService from '../../services/branchService';
import OrderProcessingModal from './OrderProcessingModal';
import './CheckoutModal.css';
import { getApparelSizeVisibility } from '../../utils/orderSizing';
import { getProvinces, getCitiesByProvince, getBarangaysByCity } from '../../utils/locationData';
import SearchableSelect from '../common/SearchableSelect';

const FALLBACK_BRANCHES = [
  { id: 1, name: 'SAN PASCUAL (MAIN BRANCH)' },
  { id: 2, name: 'CALAPAN BRANCH' },
  { id: 3, name: 'MUZON BRANCH' },
  { id: 4, name: 'LEMERY BRANCH' },
  { id: 5, name: 'BATANGAS CITY BRANCH' },
  { id: 6, name: 'BAUAN BRANCH' },
  { id: 7, name: 'CALACA BRANCH' },
  { id: 8, name: 'PINAMALAYAN BRANCH' },
  { id: 9, name: 'ROSARIO BRANCH' }
];

const CheckoutModal = ({ isOpen, onClose, onPlaceOrder, cartItems: selectedCartItems, onBack }) => {
  // Use the filtered cart items passed as props, not all cart items from context
  const cartItems = selectedCartItems || [];
  
  // Debug logging
  console.log('🛒 CheckoutModal received cart items:', cartItems.length);
  console.log('🛒 CheckoutModal cart items:', cartItems.map(item => ({ id: item.uniqueId || item.id, name: item.name })));
  
  // Log when cart items change
  useEffect(() => {
    console.log('🛒 CheckoutModal: Cart items updated:', cartItems.length);
    if (cartItems.length === 0) {
      console.log('⚠️ CheckoutModal: No items received - this might be the issue!');
    }
  }, [cartItems.length]);
  const [deliveryAddress, setDeliveryAddress] = useState({
    address: '',
    receiver: '',
    phone: '',
    province: '',
    city: '',
    barangay: '',
    postalCode: '',
    streetAddress: ''
  });
  
  const [hasAddress, setHasAddress] = useState(false); // Check if user has address in database
  const [allAddresses, setAllAddresses] = useState([]); // All user addresses
  const [selectedAddressId, setSelectedAddressId] = useState(null); // Currently selected address
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null); // ID of address being edited
  const [newAddress, setNewAddress] = useState({
    fullName: '',
    phone: '',
    province: '',
    city: '',
    barangay: '',
    barangay_code: '', // Store barangay PSGC code for coordinate lookup
    postalCode: '',
    streetAddress: ''
  });
  const [addressErrors, setAddressErrors] = useState({});
  const [orderErrors, setOrderErrors] = useState({}); // For order validation
  
  // Location data state
  const [provinces, setProvinces] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [availableBarangays, setAvailableBarangays] = useState([]);
  
  const [shippingMethod, setShippingMethod] = useState('pickup');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [expandedOrderIndex, setExpandedOrderIndex] = useState(null);

  const branchOptions = useMemo(
    () => (branches.length > 0 ? branches : FALLBACK_BRANCHES),
    [branches]
  );

  const [showConfirmation, setShowConfirmation] = useState(false); // Confirmation dialog
  const [showOrderComplete, setShowOrderComplete] = useState(false); // Order complete message
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Delete address confirmation
  const [addressToDelete, setAddressToDelete] = useState(null); // Address ID to delete
  const [showCancelReason, setShowCancelReason] = useState(false); // Cancel reason dialog
  const [cancelReason, setCancelReason] = useState(''); // Selected cancellation reason
  const [isProcessingOrder, setIsProcessingOrder] = useState(false); // Order processing modal

  // Check for user address when modal opens
  useEffect(() => {
    if (isOpen) {
      checkUserAddress();
      // Scroll modal to top when it opens to ensure order details are visible
      setTimeout(() => {
        const modalElement = document.querySelector('.checkout-modal');
        if (modalElement) {
          modalElement.scrollTop = 0;
        }
      }, 100);
      // Add class to body to hide floating buttons
      document.body.classList.add('checkout-modal-open');
    } else {
      // Remove class when modal closes
      document.body.classList.remove('checkout-modal-open');
    }
    
    // Cleanup: remove class on unmount
    return () => {
      document.body.classList.remove('checkout-modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
     if (!isOpen) {
       return;
     }
 
     let isCancelled = false;
 
     const loadBranches = async () => {
       try {
         const branchData = await branchService.getBranches();
         if (isCancelled) return;
 
         setBranches(branchData);
 
         if (branchData.length > 0) {
           setSelectedBranchId(prev => (prev ?? branchData[0].id));
           setSelectedLocation(prev => (prev && prev.trim() !== '' ? prev : branchData[0].name));
         }
       } catch (error) {
         if (!isCancelled) {
           console.error('Failed to load branches for checkout:', error);
         }
       }
     };
 
     loadBranches();
 
     return () => {
       isCancelled = true;
     };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || branchOptions.length === 0) {
      return;
    }

    setSelectedBranchId(prev => prev ?? branchOptions[0].id);
    setSelectedLocation(prev => (prev && prev.trim() !== '' ? prev : branchOptions[0].name));
  }, [isOpen, branchOptions]);

  // Load provinces on mount
  useEffect(() => {
    const provincesList = getProvinces();
    setProvinces(provincesList);
  }, []);

  // Update cities when province changes
  useEffect(() => {
    if (newAddress.province) {
      const cities = getCitiesByProvince(newAddress.province);
      setAvailableCities(cities);
      // Reset city and barangay when province changes (only if city was previously set)
      setNewAddress(prev => {
        if (prev.city || prev.barangay) {
          return { ...prev, city: '', barangay: '' };
        }
        return prev;
      });
    } else {
      setAvailableCities([]);
      setAvailableBarangays([]);
    }
  }, [newAddress.province]);

  // Update barangays when city changes
  useEffect(() => {
    if (newAddress.province && newAddress.city) {
      const barangays = getBarangaysByCity(newAddress.province, newAddress.city);
      setAvailableBarangays(barangays);
      // Reset barangay when city changes (only if barangay was previously set)
      setNewAddress(prev => {
        if (prev.barangay) {
          return { ...prev, barangay: '', barangay_code: '' };
        }
        return prev;
      });
    } else {
      setAvailableBarangays([]);
    }
  }, [newAddress.province, newAddress.city]);

  if (!isOpen) return null;

  const subtotalAmount = cartItems.reduce((total, item) => {
    const price = parseFloat(item.price || item.product_price || item.productPrice || 0);
    const quantity = parseInt(item.quantity || 1);
    console.log('Cart item price calculation:', {
      itemName: item.name,
      rawPrice: item.price,
      parsedPrice: price,
      quantity: quantity,
      itemTotal: price * quantity
    });
    return total + (price * quantity);
  }, 0);

  const shippingCost = shippingMethod === 'cod' ? 50.00 : 0.00;
  const totalAmount = subtotalAmount + shippingCost;
  
  console.log('Order Summary:', {
    subtotal: subtotalAmount,
    shipping: shippingCost,
    total: totalAmount,
    itemCount: cartItems.length
  });

  const totalItems = cartItems.reduce((total, item) => {
    return total + parseInt(item.quantity || 1);
  }, 0);

  const validateOrder = () => {
    const errors = {};
    
    // Validate based on shipping method
    if (shippingMethod === 'cod') {
      // For COD (delivery), check if user has selected an address
      if (!deliveryAddress.receiver || !deliveryAddress.phone || !deliveryAddress.address) {
        errors.address = 'Please add or select a delivery address';
      }
    }
    
    // Always require location selection
    if (!selectedLocation || selectedLocation.trim() === '') {
      errors.location = 'Please select a branch location';
    }

    if (!selectedBranchId && branches.length > 0) {
      errors.location = 'Please select a branch location';
    }
    
    setOrderErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlaceOrder = () => {
    // Validate order before placing
    if (!validateOrder()) {
      // Scroll to top to show errors
      const modal = document.querySelector('.checkout-modal');
      if (modal) {
        modal.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
      
      // Show alert on mobile for better visibility
      if (window.innerWidth <= 768) {
        const errors = [];
        if (shippingMethod === 'cod' && (!deliveryAddress.receiver || !deliveryAddress.phone || !deliveryAddress.address)) {
          errors.push('Please add or select a delivery address');
        }
        if (!selectedLocation || selectedLocation.trim() === '') {
          errors.push('Please select a branch location');
        }
        
        if (errors.length > 0) {
          alert('Please complete the following:\n\n• ' + errors.join('\n• '));
        }
      }
      return;
    }
    
    // Show confirmation dialog
    setShowConfirmation(true);
  };

  const handleConfirmOrder = async () => {
    // Close confirmation dialog immediately for faster UI response
    setShowConfirmation(false);
    
    // Show processing modal immediately
    setIsProcessingOrder(true);
    
    // Get full address details if an address is selected
    let fullDeliveryAddress = deliveryAddress;
    if (shippingMethod === 'cod' && selectedAddressId) {
      const selectedAddress = allAddresses.find(addr => addr.id === selectedAddressId);
      if (selectedAddress) {
        fullDeliveryAddress = {
          address: selectedAddress.address,
          receiver: selectedAddress.full_name,
          phone: selectedAddress.phone,
          province: selectedAddress.province,
          city: selectedAddress.city,
          barangay: selectedAddress.barangay,
          barangay_code: selectedAddress.barangay_code || selectedAddress.barangayCode, // Include barangay code
          postalCode: selectedAddress.postal_code,
          streetAddress: selectedAddress.street_address
        };
      }
    } else if (shippingMethod === 'cod' && newAddress.province && newAddress.city) {
      // If using a new address from the form
      fullDeliveryAddress = {
        address: `${newAddress.streetAddress}, ${newAddress.barangay}, ${newAddress.city}, ${newAddress.province} ${newAddress.postalCode}`,
        receiver: newAddress.fullName,
        phone: newAddress.phone,
        province: newAddress.province,
        city: newAddress.city,
        barangay: newAddress.barangay,
        barangay_code: newAddress.barangay_code, // Include barangay code for coordinate lookup
        postalCode: newAddress.postalCode,
        streetAddress: newAddress.streetAddress
      };
    }
    
    const orderData = {
      deliveryAddress: fullDeliveryAddress,
      shippingMethod,
      selectedLocation,
      selectedBranchId,
      orderNotes,
      items: cartItems,
      subtotalAmount,
      shippingCost,
      totalAmount,
      totalItems,
      orderDate: new Date().toISOString(),
      _fromCheckout: true // Flag to indicate this is coming from CheckoutModal
    };
    
    try {
      // Proceed with order placement - processing modal is handled here in CheckoutModal
      await onPlaceOrder(orderData);
      
      // Hide processing modal on success
      setIsProcessingOrder(false);
      setShowOrderComplete(true);
    } catch (error) {
      // Hide processing modal on error
      setIsProcessingOrder(false);
      // Error is already handled by onPlaceOrder (CartModal)
      console.error('Order placement failed:', error);
      // Don't show success if order failed
    }
  };

  const handleCancelOrder = () => {
    // Use requestAnimationFrame for instant UI update
    requestAnimationFrame(() => {
      setShowConfirmation(false);
      setCancelReason(''); // Reset reason
      requestAnimationFrame(() => {
        setShowCancelReason(true);
      });
    });
  };

  const handleSubmitCancellation = () => {
    if (!cancelReason) {
      alert('Please select a cancellation reason');
      return;
    }
    
    console.log('Order cancelled. Reason:', cancelReason);
    // You can send the cancellation reason to backend here if needed
    
    setShowCancelReason(false);
    setCancelReason('');
  };

  const handleBackToOrder = () => {
    setShowCancelReason(false);
    setShowConfirmation(true);
    setCancelReason('');
  };

  const handleCloseComplete = () => {
    // Close immediately for faster response
    setShowOrderComplete(false);
    requestAnimationFrame(() => {
      onClose();
    });
  };

  // Check if user has addresses from database
  const checkUserAddress = async () => {
    try {
      const addresses = await userService.getUserAddresses();
      
      if (addresses && addresses.length > 0) {
        setAllAddresses(addresses);
        setHasAddress(true);
        setShowAddressForm(false);
        
        // Set the default address as selected
        const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
          setDeliveryAddress({
            address: defaultAddress.address,
            receiver: defaultAddress.full_name,
            phone: defaultAddress.phone,
            province: defaultAddress.province,
            city: defaultAddress.city,
            barangay: defaultAddress.barangay,
            postalCode: defaultAddress.postal_code,
            streetAddress: defaultAddress.street_address
          });
        }
      } else {
        setAllAddresses([]);
        setHasAddress(false);
        setShowAddressForm(false);
      }
    } catch (error) {
      setAllAddresses([]);
      setHasAddress(false);
      setShowAddressForm(false);
    }
  };

  const handleAddressInputChange = (e) => {
    const { name, value } = e.target;
    
    // For postal code, only allow numeric characters
    let processedValue = value;
    if (name === 'postalCode') {
      processedValue = value.replace(/[^0-9]/g, '');
    }
    
    // Special handling for barangay selection - store both name and code
    if (name === 'barangay' && value) {
      const selectedBarangay = availableBarangays.find(b => b.name === value);
      setNewAddress(prev => ({
        ...prev,
        barangay: value,
        barangay_code: selectedBarangay?.code || ''
      }));
    } else {
      setNewAddress(prev => ({
        ...prev,
        [name]: processedValue
      }));
    }
    
    // Clear error when user starts typing
    if (addressErrors[name]) {
      setAddressErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateAddressForm = () => {
    const errors = {};
    const requiredFields = ['fullName', 'phone', 'streetAddress', 'province', 'city', 'barangay', 'postalCode'];
    
    requiredFields.forEach(field => {
      if (!newAddress[field] || newAddress[field].trim() === '') {
        errors[field] = 'This field is required';
      }
    });
    
    // Phone validation
    if (newAddress.phone && !/^[\d\s\-+()]+$/.test(newAddress.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    // Postal code validation - only numbers
    if (newAddress.postalCode && !/^\d+$/.test(newAddress.postalCode)) {
      errors.postalCode = 'Postal code must contain only numbers';
    }
    
    // Length validation
    if (newAddress.fullName && newAddress.fullName.length > 255) {
      errors.fullName = 'Full name must be 255 characters or less';
    }
    if (newAddress.phone && newAddress.phone.length > 30) {
      errors.phone = 'Phone number must be 30 characters or less';
    }
    if (newAddress.streetAddress && newAddress.streetAddress.length > 500) {
      errors.streetAddress = 'Street address must be 500 characters or less';
    }
    if (newAddress.barangay && newAddress.barangay.length > 100) {
      errors.barangay = 'Barangay must be 100 characters or less';
    }
    if (newAddress.city && newAddress.city.length > 100) {
      errors.city = 'City must be 100 characters or less';
    }
    if (newAddress.province && newAddress.province.length > 100) {
      errors.province = 'Province must be 100 characters or less';
    }
    if (newAddress.postalCode && newAddress.postalCode.length > 20) {
      errors.postalCode = 'Postal code must be 20 characters or less';
    }
    
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAddress = async () => {
    if (validateAddressForm()) {
      try {
        const addressData = {
          fullName: newAddress.fullName,
          phone: newAddress.phone,
          streetAddress: newAddress.streetAddress,
          barangay: newAddress.barangay,
          barangay_code: newAddress.barangay_code, // Include barangay code for coordinate lookup
          city: newAddress.city,
          province: newAddress.province,
          postalCode: newAddress.postalCode,
          address: `${newAddress.streetAddress}, ${newAddress.barangay}, ${newAddress.city}, ${newAddress.province} ${newAddress.postalCode}`
        };

        // Check if we're editing an existing address or adding a new one
        if (editingAddressId) {
          // We're editing an existing address
          await userService.updateUserAddress(editingAddressId, addressData);
        } else {
          // We're adding a new address
          await userService.saveUserAddress(addressData);
        }
        
        // Refresh addresses list
        await checkUserAddress();
        setShowAddressForm(false);
        setEditingAddressId(null);
      } catch (error) {
        console.error('Failed to save address:', error.message);
        alert('Failed to save address. Please try again.');
      }
    }
  };

  const handleDeleteAddress = (addressId) => {
    setAddressToDelete(addressId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAddress = async () => {
    try {
      await userService.deleteUserAddress(addressToDelete);
      // Refresh addresses list
      await checkUserAddress();
      
      // If the deleted address was selected, clear the selection
      if (selectedAddressId === addressToDelete) {
        setSelectedAddressId(null);
        setDeliveryAddress({
          address: '',
          receiver: '',
          phone: '',
          province: '',
          city: '',
          barangay: '',
          postalCode: '',
          streetAddress: ''
        });
      }
      
      setShowDeleteConfirm(false);
      setAddressToDelete(null);
    } catch (error) {
      console.error('Failed to delete address:', error);
      alert('Failed to delete address. Please try again.');
      setShowDeleteConfirm(false);
      setAddressToDelete(null);
    }
  };

  const cancelDeleteAddress = () => {
    setShowDeleteConfirm(false);
    setAddressToDelete(null);
  };

  const handleChangeAddress = (address = null) => {
    console.log('handleChangeAddress called'); // Debug log
    setShowAddressForm(true);
    
    // Use the provided address or the current delivery address
    const addressToEdit = address || { address: deliveryAddress.address, full_name: deliveryAddress.receiver, phone: deliveryAddress.phone };
    
    // Prefer database fields if available, otherwise parse from address string
    let streetAddress = addressToEdit.street_address || '';
    let barangay = addressToEdit.barangay || '';
    let city = addressToEdit.city || '';
    let province = addressToEdit.province || '';
    let postalCode = addressToEdit.postal_code || '';
    
    // If database fields are not available, parse from address string
    if (!streetAddress && !barangay && !city && !province) {
      const addressString = addressToEdit.address || '';
      console.log('Address string:', addressString); // Debug log
      const addressParts = addressString.split(', ').map(part => part.trim());
      console.log('Address parts:', addressParts); // Debug log
      
      // Parse address parts more carefully
      if (addressParts.length >= 5) {
        streetAddress = addressParts[0] || '';
        barangay = addressParts[1] || '';
        city = addressParts[2] || '';
        // Province might contain postal code, so separate them
        const provincePart = addressParts[3] || '';
        const postalCodeMatch = provincePart.match(/(\d+)/);
        if (postalCodeMatch) {
          province = provincePart.replace(/\d+/g, '').trim();
          postalCode = postalCodeMatch[1];
        } else {
          province = provincePart;
          postalCode = addressParts[4] || '';
        }
      } else if (addressParts.length >= 4) {
        streetAddress = addressParts[0] || '';
        barangay = addressParts[1] || '';
        city = addressParts[2] || '';
        // Province might contain postal code, so separate them
        const provincePart = addressParts[3] || '';
        const postalCodeMatch = provincePart.match(/(\d+)/);
        if (postalCodeMatch) {
          province = provincePart.replace(/\d+/g, '').trim();
          postalCode = postalCodeMatch[1];
        } else {
          province = provincePart;
          postalCode = '';
        }
      }
    }
    
    setNewAddress({
      fullName: addressToEdit.full_name || '',
      phone: addressToEdit.phone || '',
      streetAddress: streetAddress,
      barangay: barangay,
      city: city,
      province: province,
      postalCode: postalCode
    });
  };


  return (
    <div className="checkout-modal-overlay" onClick={onClose}>
      <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button 
          className="checkout-back-button" 
          onClick={() => {
            if (onBack) {
              onBack();
            } else {
              onClose();
            }
          }}
          aria-label="Go back to product"
        >
          <FaArrowLeft />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="checkout-header">
          <h1>CHECKOUT</h1>
        </div>

        {/* Delivery Address Section */}
        <div className="checkout-section">
          <div className="section-header">
            <div className="section-header-left">
              <FaTruck className="section-icon" />
              <h2>DELIVERY ADDRESS</h2>
            </div>
            {hasAddress && !showAddressForm && (
              <button 
                className="add-address-header-btn"
                onClick={() => setShowAddressForm(true)}
              >
                Add Address
              </button>
            )}
          </div>
          
          {(!hasAddress || showAddressForm) ? (
            showAddressForm ? (
              /* Address Input Form */
              <div className="address-form">
                <div className="form-header">
                  <div className="form-header-top">
                    <div className="form-header-title">
                      <h3>{editingAddressId ? 'Edit Delivery Address' : 'Add Delivery Address'}</h3>
                      <p>Please provide your delivery information</p>
                    </div>
                    <button 
                      className="back-address-btn"
                      onClick={() => {
                        setShowAddressForm(false);
                        setEditingAddressId(null);
                        setNewAddress({
                          fullName: '',
                          phone: '',
                          province: '',
                          city: '',
                          barangay: '',
                          postalCode: '',
                          streetAddress: ''
                        });
                        setAddressErrors({});
                      }}
                      aria-label="Go back"
                    >
                      <FaArrowLeft />
                      <span>Back</span>
                    </button>
                  </div>
                </div>
                
                <div className="address-form-fields">
                  <div className="form-group">
                    <input
                      type="text"
                      name="fullName"
                      value={newAddress.fullName}
                      onChange={handleAddressInputChange}
                      className={addressErrors.fullName ? 'error' : ''}
                      placeholder="Full Name"
                      maxLength={255}
                    />
                    {addressErrors.fullName && (
                      <span className="error-message">{addressErrors.fullName}</span>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <input
                      type="tel"
                      name="phone"
                      value={newAddress.phone}
                      onChange={(e) => {
                        // Only allow numbers, spaces, dashes, and plus sign
                        const value = e.target.value.replace(/[^\d\s\-+]/g, '');
                        handleAddressInputChange({ target: { name: 'phone', value } });
                      }}
                      className={addressErrors.phone ? 'error' : ''}
                      placeholder="Phone Number"
                      maxLength={30}
                    />
                    {addressErrors.phone && (
                      <span className="error-message">{addressErrors.phone}</span>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <SearchableSelect
                      name="province"
                      value={newAddress.province}
                      onChange={handleAddressInputChange}
                      options={provinces.map(province => ({
                        value: province.name,
                        label: province.name
                      }))}
                      placeholder="Select Province"
                      error={!!addressErrors.province}
                      className={addressErrors.province ? 'error' : ''}
                    />
                    {addressErrors.province && (<span className="error-message">{addressErrors.province}</span>)}
                  </div>
                  <div className="form-group">
                    <SearchableSelect
                      name="city"
                      value={newAddress.city}
                      onChange={handleAddressInputChange}
                      options={availableCities.map(city => ({
                        value: city.name,
                        label: `${city.name} ${city.isCity ? '(City)' : '(Municipality)'}`
                      }))}
                      placeholder={newAddress.province ? 'Select City/Municipality' : 'Select Province First'}
                      disabled={!newAddress.province}
                      error={!!addressErrors.city}
                      className={addressErrors.city ? 'error' : ''}
                    />
                    {addressErrors.city && (<span className="error-message">{addressErrors.city}</span>)}
                  </div>
                  <div className="form-group">
                    <SearchableSelect
                      name="barangay"
                      value={newAddress.barangay}
                      onChange={handleAddressInputChange}
                      options={availableBarangays.map(barangay => ({
                        value: barangay.name,
                        label: barangay.name
                      }))}
                      placeholder={newAddress.city ? 'Select Barangay' : 'Select City/Municipality First'}
                      disabled={!newAddress.city}
                      error={!!addressErrors.barangay}
                      className={addressErrors.barangay ? 'error' : ''}
                    />
                    {addressErrors.barangay && (<span className="error-message">{addressErrors.barangay}</span>)}
                  </div>
                  
                  <div className="form-group">
                    <input
                      type="text"
                      name="postalCode"
                      value={newAddress.postalCode}
                      onChange={handleAddressInputChange}
                      className={addressErrors.postalCode ? 'error' : ''}
                      placeholder="Postal Code"
                      maxLength={20}
                      pattern="[0-9]*"
                      inputMode="numeric"
                    />
                    {addressErrors.postalCode && (
                      <span className="error-message">{addressErrors.postalCode}</span>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <input
                      type="text"
                      name="streetAddress"
                      value={newAddress.streetAddress}
                      onChange={handleAddressInputChange}
                      className={addressErrors.streetAddress ? 'error' : ''}
                      placeholder="Street Name, Building, House No."
                      maxLength={500}
                    />
                    {addressErrors.streetAddress && (
                      <span className="error-message">{addressErrors.streetAddress}</span>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    className="save-address-btn"
                    onClick={handleSaveAddress}
                  >
                    Save Address & Continue
                  </button>
                </div>
              </div>
            ) : (
              /* No Address Yet */
              <div className="no-address-section">
                <div className="no-address-content">
                  <div className="no-address-icon"><FaMapMarkerAlt /></div>
                  <div className="no-address-text">
                    <h3>No address yet</h3>
                    <p>Please add your delivery address to continue</p>
                  </div>
                  <button 
                    className="add-address-btn"
                    onClick={() => setShowAddressForm(true)}
                  >
                    Add Address
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Existing Addresses Display */
            <div className="addresses-list">
              {allAddresses.map((address) => (
                <div 
                  key={address.id} 
                  className={`address-card ${selectedAddressId === address.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedAddressId(address.id);
                    setDeliveryAddress({
                      address: address.address,
                      receiver: address.full_name,
                      phone: address.phone
                    });
                    setOrderErrors(prev => ({ ...prev, address: '' }));
                  }}
                >
                  <div className="address-card-content">
                    <div className="address-header">
                      <div className="location-icon">
                        <FaMapMarkerAlt />
                      </div>
                      <div className="receiver-info">
                        <div className="receiver-name">{address.full_name}</div>
                        <div className="receiver-phone">{address.phone}</div>
                      </div>
                      <div className="address-actions">
                        <button 
                          className="edit-address-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAddressId(address.id);
                            handleChangeAddress(address);
                          }}
                        >
                          Edit
                        </button>
                        <button 
                          className="delete-address-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAddress(address.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="address-details">
                      <div className="address-line">{address.address}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Show error if COD selected but no address */}
          {orderErrors.address && shippingMethod === 'cod' && (
            <div className="error-message" style={{ 
              display: 'block', 
              marginTop: '12px', 
              padding: '12px', 
              backgroundColor: 'rgba(255, 68, 68, 0.1)', 
              borderLeft: '4px solid #ff4444', 
              color: '#ff4444', 
              fontSize: '14px',
              borderRadius: '4px'
            }}>
              {orderErrors.address}
            </div>
          )}
        </div>

        {/* Products Ordered Section - ORDER DETAILS */}
        <div className="checkout-section products-section">
          <div className="section-header">
            <div className="section-header-left">
              <FaUsers className="section-icon" />
              <h2>ORDER DETAILS</h2>
            </div>
          </div>
          <div className="checkout-modal-perfect-table-container">
            <div className="checkout-modal-perfect-table">
              <div className="checkout-modal-perfect-header">
                <div className="checkout-modal-perfect-header-row">
                  <div className="checkout-modal-perfect-header-item">ITEM</div>
                  <div className="checkout-modal-perfect-header-order">ORDER</div>
                  <div className="checkout-modal-perfect-header-price">PRICE</div>
                  <div className="checkout-modal-perfect-header-qty">QTY</div>
                  <div className="checkout-modal-perfect-header-total">TOTAL</div>
                </div>
              </div>
              {cartItems.map((item, index) => {
                // Determine product category first
                const isBall = item.category?.toLowerCase() === 'balls';
                const isTrophy = item.category?.toLowerCase() === 'trophies';
                const isApparel = !isBall && !isTrophy;
                const categoryLower = item.category?.toLowerCase() || '';
                const isUniformsCategory = categoryLower === 'uniforms';
                const isHoodieCategory = categoryLower === 'hoodies';
                const isLongSleevesCategory = categoryLower === 'long sleeves';
                const isTShirtCategory = categoryLower === 't-shirts' || categoryLower === 't-shirt';
                const shouldHideJerseyType = isUniformsCategory || isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
                const shouldHideCutType = isUniformsCategory || isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
                const baseUnitPrice = Number(item.basePrice ?? item.price ?? 0);
                const fabricOption = item.fabricOption || null;
                const fabricSurcharge = Number(item.fabricSurcharge ?? 0);
                const cutType = item.cutType || null;
                const cutTypeSurcharge = Number(item.cutTypeSurcharge ?? 0);
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
                  Boolean(fabricOption) || fabricSurcharge > 0;
                const hasCutTypeSurcharge =
                  Boolean(cutType) || cutTypeSurcharge > 0;
                const hasSizeSurcharge =
                  sizeSurchargePerUnit > 0 || sizeSurchargeTotal > 0;
                const hasSurcharges = hasFabricSurcharge || hasCutTypeSurcharge || hasSizeSurcharge;
                const lineTotal = perUnitTotal * Number(item.quantity || 1);
                
                console.log('🛒 CheckoutModal Cart item:', item); // Debug log
                console.log('🛒 Team Members:', item.teamMembers);
                console.log('🛒 Team Members Length:', item.teamMembers?.length);
                console.log('🛒 Team Name (item.teamName):', item.teamName);
                console.log('🛒 First Team Member:', item.teamMembers?.[0]);
                console.log('🛒 First Team Member Team Name:', item.teamMembers?.[0]?.teamName);
                console.log('🛒 First Team Member Team Name (snake_case):', item.teamMembers?.[0]?.team_name);
                console.log('🛒 Single Order Details:', item.singleOrderDetails);
                console.log('🛒 Single Order Team Name:', item.singleOrderDetails?.teamName);
                console.log('🛒 Single Order Team Name (snake_case):', item.singleOrderDetails?.team_name);
                console.log('🛒 Ball Details:', item.ballDetails);
                console.log('🛒 Trophy Details:', item.trophyDetails);
                console.log('🛒 Is Team Order:', item.isTeamOrder);
                console.log('🛒 Is Apparel:', isApparel);
                console.log('🛒 Will show team details:', isApparel && item.isTeamOrder && item.teamMembers && item.teamMembers.length > 0);

                return (
                  <div key={index} className="checkout-modal-perfect-content-row">
                    <div className="checkout-modal-perfect-content-item">
                      <div className="checkout-modal-perfect-item-content">
                        <div className="checkout-modal-perfect-item-image">
                          <img 
                            src={item.main_image || item.image || item.imageUrl || item.photo || item.image_url || item.product_image || item.thumbnail || '/image_highlights/image.png'} 
                            alt={item.name}
                            onError={(e) => {
                              console.log('Image failed to load:', e.target.src);
                              e.target.src = '/image_highlights/image.png';
                            }}
                          />
                        </div>
                        <div className="checkout-modal-perfect-item-details">
                          <div className="checkout-modal-perfect-item-name">{item.name}</div>
                          <div className="checkout-modal-perfect-item-type">
                            {isBall ? (
                              <><FaBasketballBall /> Basketball</>
                            ) : isTrophy ? (
                              <><FaTrophy /> Trophy</>
                            ) : (
                              <><FaTshirt /> {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Apparel'}</>
                            )}
                          </div>
                        </div>
                      </div>
                  </div>
                    <div 
                      className="checkout-modal-perfect-content-order"
                      onClick={() => setExpandedOrderIndex(expandedOrderIndex === index ? null : index)}
                    >
                      <div className="checkout-modal-perfect-order-type">
                        {isBall ? (
                          <><FaBasketballBall /> Ball</>
                        ) : isTrophy ? (
                          <><FaTrophy /> Trophy</>
                        ) : item.isTeamOrder ? (
                          <><FaUserFriends /> Team Order</>
                        ) : (
                          <><FaUser /> Single Order</>
                        )}
                        <span className={`checkout-modal-perfect-dropdown-arrow ${expandedOrderIndex === index ? 'expanded' : ''}`}>
                          {expandedOrderIndex === index ? <FaChevronUp /> : <FaChevronDown />}
                        </span>
                      </div>
                    </div>
                    <div className="checkout-modal-perfect-content-price">
                      ₱{perUnitTotal.toFixed(2)}
                    </div>
                    <div className="checkout-modal-perfect-content-qty">
                      {item.quantity}
                    </div>
                    <div className="checkout-modal-perfect-content-total">
                      ₱{lineTotal.toFixed(2)}
                    </div>
                    {expandedOrderIndex === index && (
                      <div className="checkout-modal-perfect-dropdown-wrapper">
                        <div className="checkout-modal-perfect-dropdown">
                            {/* For Apparel - Team Orders */}
                            {isApparel && item.isTeamOrder && item.teamMembers && item.teamMembers.length > 0 ? (
                              <div className="checkout-modal-perfect-team-details">
                                <div className="checkout-modal-perfect-team-header">
                                  <div className="checkout-modal-perfect-detail-row">
                                    <span className="checkout-modal-perfect-detail-label">Team:</span>
                                    <span className="checkout-modal-perfect-detail-value checkout-modal-perfect-team-name-detail">{item.teamName || item.team_name || item.teamMembers?.[0]?.teamName || item.teamMembers?.[0]?.team_name || 'N/A'}</span>
                                  </div>
                                </div>
                                <div className="checkout-modal-perfect-team-divider"></div>
                                <div className="checkout-modal-perfect-members-list">
                                  {(() => {
                                    const fallbackVisibility = {
                                      jersey: item.teamMembers.some(member => Boolean(member?.jerseySize || member?.size)),
                                      shorts: item.teamMembers.some(member => Boolean(member?.shortsSize))
                                    };
                                    const { showJersey: showTeamJerseySize, showShorts: showTeamShortsSize } = getApparelSizeVisibility(item, fallbackVisibility);
                                    return item.teamMembers.map((member, memberIndex) => {
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
                                      <div key={memberIndex} className="checkout-modal-perfect-member-details">
                                        <div className="checkout-modal-perfect-detail-row">
                                          <span className="checkout-modal-perfect-detail-label">Surname:</span>
                                          <span className="checkout-modal-perfect-detail-value checkout-modal-perfect-surname-detail">{(member.surname || member.lastName || 'N/A').toUpperCase()}</span>
                                        </div>
                                        <div className="checkout-modal-perfect-detail-row">
                                          <span className="checkout-modal-perfect-detail-label">Jersey No:</span>
                                          <span className="checkout-modal-perfect-detail-value">{member.number || member.jerseyNo || member.jerseyNumber || 'N/A'}</span>
                                        </div>
                                        {/* Jersey Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                        {!shouldHideJerseyType && (
                                          <div className="checkout-modal-perfect-detail-row">
                                            <span className="checkout-modal-perfect-detail-label">Jersey Type:</span>
                                            <span className="checkout-modal-perfect-detail-value">{jerseyTypeLabel}</span>
                                          </div>
                                        )}
                                        {memberFabricOption && (
                                          <div className="checkout-modal-perfect-detail-row">
                                            <span className="checkout-modal-perfect-detail-label">Fabric:</span>
                                            <span className="checkout-modal-perfect-detail-value">{memberFabricOption}</span>
                                          </div>
                                        )}
                                        {/* Cut Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                        {memberCutType && !shouldHideCutType && (
                                          <div className="checkout-modal-perfect-detail-row">
                                            <span className="checkout-modal-perfect-detail-label">Cut Type:</span>
                                            <span className="checkout-modal-perfect-detail-value">{memberCutType}</span>
                                          </div>
                                        )}
                                        <div className="checkout-modal-perfect-detail-row">
                                          <span className="checkout-modal-perfect-detail-label">Size Type:</span>
                                          <span className="checkout-modal-perfect-detail-value">{memberSizingType === 'kids' ? 'Kids' : 'Adult'}</span>
                                        </div>
                                        {/* Jersey/Shirt Size - Show for full set, shirt only, or hoodies/long sleeves/T-shirts (treated as shirt-only) */}
                                        {(((memberJerseyType === 'full' || memberJerseyType === 'shirt') && showTeamJerseySize) || (shouldHideJerseyType && (member.size || member.jerseySize))) && (
                                          <div className="checkout-modal-perfect-detail-row">
                                            <span className="checkout-modal-perfect-detail-label">{shouldHideJerseyType ? 'Size:' : 'Jersey Size:'}</span>
                                            <span className="checkout-modal-perfect-detail-value">{member.jerseySize || member.size || 'N/A'}</span>
                                          </div>
                                        )}
                                        {/* Shorts Size - Hide for hoodies, long sleeves, and T-shirts */}
                                        {(memberJerseyType === 'full' || memberJerseyType === 'shorts') && showTeamShortsSize && !shouldHideJerseyType && (
                                          <div className="checkout-modal-perfect-detail-row">
                                            <span className="checkout-modal-perfect-detail-label">Shorts Size:</span>
                                            <span className="checkout-modal-perfect-detail-value">{member.shortsSize || 'N/A'}</span>
                                          </div>
                                        )}
                                        <div className="checkout-modal-perfect-member-price">
                                          <span className="checkout-modal-perfect-member-price-label">Price:</span>
                                          <span className="checkout-modal-perfect-member-price-value">₱{memberPrice.toFixed(2)}</span>
                                        </div>
                                      </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            ) : isApparel ? (
                              /* For Apparel - Single Orders */
                              <div className="checkout-modal-perfect-single-order-details">
                                <div className="checkout-modal-perfect-member-details">
                                  <div className="checkout-modal-perfect-detail-row">
                                    <span className="checkout-modal-perfect-detail-label">Team:</span>
                                    <span className="checkout-modal-perfect-detail-value checkout-modal-perfect-team-name-detail">{item.singleOrderDetails?.teamName || item.singleOrderDetails?.team_name || item.teamName || 'N/A'}</span>
                                  </div>
                                  <div className="checkout-modal-perfect-detail-row">
                                    <span className="checkout-modal-perfect-detail-label">Surname:</span>
                                    <span className="checkout-modal-perfect-detail-value checkout-modal-perfect-surname-detail">{(item.singleOrderDetails?.surname || item.singleOrderDetails?.lastName || 'N/A').toUpperCase()}</span>
                                  </div>
                                  <div className="checkout-modal-perfect-detail-row">
                                    <span className="checkout-modal-perfect-detail-label">Jersey No:</span>
                                    <span className="checkout-modal-perfect-detail-value">{item.singleOrderDetails?.number || item.singleOrderDetails?.jerseyNo || item.singleOrderDetails?.jerseyNumber || 'N/A'}</span>
                                  </div>
                                  {(item.fabricOption || item.singleOrderDetails?.fabricOption) && (
                                    <div className="checkout-modal-perfect-detail-row">
                                      <span className="checkout-modal-perfect-detail-label">Fabric:</span>
                                      <span className="checkout-modal-perfect-detail-value">{item.fabricOption || item.singleOrderDetails?.fabricOption}</span>
                                    </div>
                                  )}
                                  {/* Cut Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                  {(item.cutType || item.singleOrderDetails?.cutType) && !shouldHideCutType && (
                                    <div className="checkout-modal-perfect-detail-row">
                                      <span className="checkout-modal-perfect-detail-label">Cut Type:</span>
                                      <span className="checkout-modal-perfect-detail-value">{item.cutType || item.singleOrderDetails?.cutType}</span>
                                    </div>
                                  )}
                                  {(() => {
                                    const fallbackVisibility = {
                                      jersey: Boolean(item.singleOrderDetails?.jerseySize || item.singleOrderDetails?.size || item.size),
                                      shorts: Boolean(item.singleOrderDetails?.shortsSize)
                                    };
                                    const { showJersey: showSingleJerseySize, showShorts: showSingleShortsSize } = getApparelSizeVisibility(item, fallbackVisibility);
                                    return (
                                      <>
                                        {/* Jersey/Shirt Size - For non-jersey apparel, show as "Size" */}
                                        {(showSingleJerseySize || shouldHideJerseyType) && (
                                          <div className="checkout-modal-perfect-detail-row">
                                            <span className="checkout-modal-perfect-detail-label">{shouldHideJerseyType ? 'Size:' : 'Jersey Size:'}</span>
                                            <span className="checkout-modal-perfect-detail-value">{item.singleOrderDetails?.jerseySize || item.singleOrderDetails?.size || item.size || 'N/A'} ({item.singleOrderDetails?.sizingType || item.sizeType || 'Adult'})</span>
                                          </div>
                                        )}
                                        {/* Shorts Size - Hide for hoodies, long sleeves, and T-shirts */}
                                        {showSingleShortsSize && !shouldHideJerseyType && (
                                          <div className="checkout-modal-perfect-detail-row">
                                            <span className="checkout-modal-perfect-detail-label">Shorts Size:</span>
                                            <span className="checkout-modal-perfect-detail-value">{item.singleOrderDetails?.shortsSize || 'N/A'} ({item.singleOrderDetails?.sizingType || item.sizeType || 'Adult'})</span>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            ) : isBall ? (
                              /* For Balls */
                              <div className="checkout-modal-perfect-ball-details">
                                <div className="checkout-modal-perfect-member-details">
                                  {item.ballDetails?.sportType && (
                                    <div className="checkout-modal-perfect-detail-row">
                                      <span className="checkout-modal-perfect-detail-label">Sport:</span>
                                      <span className="checkout-modal-perfect-detail-value">{item.ballDetails.sportType}</span>
                                    </div>
                                  )}
                                  {item.ballDetails?.brand && (
                                    <div className="checkout-modal-perfect-detail-row">
                                      <span className="checkout-modal-perfect-detail-label">Brand:</span>
                                      <span className="checkout-modal-perfect-detail-value">{item.ballDetails.brand}</span>
                                    </div>
                                  )}
                                  {item.ballDetails?.size && (
                                    <div className="checkout-modal-perfect-detail-row">
                                      <span className="checkout-modal-perfect-detail-label">Size:</span>
                                      <span className="checkout-modal-perfect-detail-value">{item.ballDetails.size}</span>
                                    </div>
                                  )}
                                  {item.ballDetails?.material && (
                                    <div className="checkout-modal-perfect-detail-row">
                                      <span className="checkout-modal-perfect-detail-label">Material:</span>
                                      <span className="checkout-modal-perfect-detail-value">{item.ballDetails.material}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : isTrophy ? (
                              /* For Trophies */
                              <div className="checkout-modal-perfect-trophy-details">
                                <div className="checkout-modal-perfect-member-details">
                                  {item.trophyDetails?.type && (
                                    <div className="checkout-modal-perfect-detail-row">
                                      <span className="checkout-modal-perfect-detail-label">Type:</span>
                                      <span className="checkout-modal-perfect-detail-value">{item.trophyDetails.type}</span>
                                    </div>
                                  )}
                                  {item.trophyDetails?.size && (
                                    <div className="checkout-modal-perfect-detail-row">
                                      <span className="checkout-modal-perfect-detail-label">Size:</span>
                                      <span className="checkout-modal-perfect-detail-value">{item.trophyDetails.size}</span>
                                    </div>
                                  )}
                                  {item.trophyDetails?.material && (
                                    <div className="checkout-modal-perfect-detail-row">
                                      <span className="checkout-modal-perfect-detail-label">Material:</span>
                                      <span className="checkout-modal-perfect-detail-value">{item.trophyDetails.material}</span>
                                    </div>
                                  )}
                                  {item.trophyDetails?.engraving && (
                                    <div className="checkout-modal-perfect-detail-row">
                                      <span className="checkout-modal-perfect-detail-label">Engraving:</span>
                                      <span className="checkout-modal-perfect-detail-value checkout-modal-perfect-engraving-text">{item.trophyDetails.engraving}</span>
                                    </div>
                                  )}
                                  {item.trophyDetails?.occasion && (
                                    <div className="checkout-modal-perfect-detail-row">
                                      <span className="checkout-modal-perfect-detail-label">Occasion:</span>
                                      <span className="checkout-modal-perfect-detail-value">{item.trophyDetails.occasion}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : null}

                            {hasSurcharges && (
                              <div className="checkout-modal-surcharge-summary">
                                <div className="checkout-modal-surcharge-title">Pricing Breakdown</div>
                                <div className="checkout-modal-surcharge-line">
                                  <span>Base Unit Price</span>
                                  <span>₱{baseUnitPrice.toFixed(2)}</span>
                                </div>
                                {item.isTeamOrder ? (
                                  <>
                                    <div className="checkout-modal-surcharge-line">
                                      <span>Fabric Surcharge (Total)</span>
                                      <span>{fabricSurcharge > 0 ? `+₱${fabricSurcharge.toFixed(2)}` : '₱0.00'}</span>
                                    </div>
                                    <div className="checkout-modal-surcharge-line">
                                      <span>Cut Type Surcharge (Total)</span>
                                      <span>{cutTypeSurcharge > 0 ? `+₱${cutTypeSurcharge.toFixed(2)}` : '₱0.00'}</span>
                                    </div>
                                    <div className="checkout-modal-surcharge-line">
                                      <span>Size Surcharge (Total)</span>
                                      <span>{sizeSurchargeTotal > 0 ? `+₱${sizeSurchargeTotal.toFixed(2)}` : '₱0.00'}</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {fabricOption && (
                                      <div className="checkout-modal-surcharge-line">
                                        <span>Fabric · {fabricOption}</span>
                                        <span>{fabricSurcharge > 0 ? `+₱${fabricSurcharge.toFixed(2)}` : '₱0.00'}</span>
                                      </div>
                                    )}
                                    {cutType && (
                                      <div className="checkout-modal-surcharge-line">
                                        <span>Cut Type · {cutType}</span>
                                        <span>{cutTypeSurcharge > 0 ? `+₱${cutTypeSurcharge.toFixed(2)}` : '₱0.00'}</span>
                                      </div>
                                    )}
                                    {!fabricOption && (
                                      <div className="checkout-modal-surcharge-line">
                                        <span>Fabric Surcharge</span>
                                        <span>{fabricSurcharge > 0 ? `+₱${fabricSurcharge.toFixed(2)}` : '₱0.00'}</span>
                                      </div>
                                    )}
                                    <div className="checkout-modal-surcharge-line">
                                      <span>Size Surcharge</span>
                                      <span>{sizeSurchargePerUnit > 0 ? `+₱${sizeSurchargePerUnit.toFixed(2)}` : '₱0.00'}</span>
                                    </div>
                                  </>
                                )}
                                <div className="checkout-modal-surcharge-divider" />
                                <div className="checkout-modal-surcharge-line checkout-modal-surcharge-total">
                                  <span>Per Unit Total</span>
                                  <span>₱{perUnitTotal.toFixed(2)}</span>
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Shipping Options and Notes */}
        <div className="checkout-section">
          <div className="shipping-notes-container">
            {/* Shipping Options */}
            <div className="shipping-options">
              <div className="section-header">
                <div className="section-header-left">
                  <FaTruck className="section-icon" />
                  <h2>SHIPPING OPTIONS</h2>
                </div>
              </div>
              <div className="shipping-method">
                <label className={`shipping-option ${shippingMethod === 'pickup' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    value="pickup"
                    checked={shippingMethod === 'pickup'}
                    onChange={(e) => {
                      setShippingMethod(e.target.value);
                      setOrderErrors(prev => ({ ...prev, address: '' }));
                    }}
                  />
                  <div className="option-content">
                    <div className="option-title">Pick Up</div>
                    <div className="option-subtitle">Free</div>
                  </div>
                </label>
                
                <label className={`shipping-option ${shippingMethod === 'cod' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    value="cod"
                    checked={shippingMethod === 'cod'}
                    onChange={(e) => {
                      setShippingMethod(e.target.value);
                      setOrderErrors(prev => ({ ...prev, address: '' }));
                    }}
                  />
                  <div className="option-content">
                    <div className="option-title">Cash on Delivery</div>
                    <div className="option-subtitle">₱50.00</div>
                  </div>
                </label>
                
                {/* Location selector shown for both pickup and COD */}
                <div className="location-selector">
                  <label className="location-label">Select the Nearest Branch <span style={{color: '#ff4444'}}>*</span>:</label>
                  <div className="location-dropdown" onClick={() => setShowLocationDropdown(!showLocationDropdown)}>
                    <span className="location-text">{selectedLocation}</span>
                    <FaChevronDown className="dropdown-arrow" />
                  </div>
                  {showLocationDropdown && (
                    <div className="location-options">
                      {branchOptions.map((branch, index) => {
                        const branchName = branch?.name || '';
                        const branchId = branch?.id ?? null;

                        return (
                          <div
                            key={`${branchId ?? 'fallback'}-${index}`}
                            className={`location-option ${selectedLocation === branchName ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedLocation(branchName);
                              setSelectedBranchId(branchId);
                              setShowLocationDropdown(false);
                            }}
                          >
                            <div className="location-info">
                              <FaMapMarkerAlt className="location-icon" />
                              <span className="location-text">{branchName}</span>
                            </div>
                            {selectedLocation === branchName && (
                              <div className="location-selected-badge">Selected</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {orderErrors.location && (
                    <span className="error-message" style={{ display: 'block', marginTop: '8px', color: '#ff4444', fontSize: '14px' }}>
                      {orderErrors.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="notes-section">
              <div className="section-header">
                <h2>NOTES/MESSAGE TO YOHANNS</h2>
              </div>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Please Leave A Message ……"
                className="notes-textarea"
              />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="checkout-section">
          <div className="order-summary">
            <div className="summary-row">
              <span>Merchandise Subtotal:</span>
              <span>₱{subtotalAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div className="summary-row">
              <span>Shipping Subtotal:</span>
              <span>₱{shippingCost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div className="summary-row total-row">
              <span>Total Payment ({totalItems} items):</span>
              <span>₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          </div>
          
          <div className="place-order-container">
            <button className="place-order-btn" onClick={handlePlaceOrder}>
              PLACE ORDER
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="confirmation-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="confirmation-modal">
            <h3>Confirm Order</h3>
            <p>Are you sure you want to place this order?</p>
            <div className="confirmation-buttons">
              <button className="confirm-btn yes-btn" onClick={handleConfirmOrder}>
                Yes
              </button>
              <button className="confirm-btn no-btn" onClick={handleCancelOrder}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Complete Dialog */}
      {showOrderComplete && (
        <div className="confirmation-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="confirmation-modal order-complete-modal">
            <div className="success-icon">✓</div>
            <h3>Order Completed!</h3>
            <p>Your order has been successfully placed.</p>
            <button className="confirm-btn ok-btn" onClick={handleCloseComplete}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Delete Address Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="confirmation-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="confirmation-modal delete-confirm-modal">
            <h3>Delete Address</h3>
            <p>Are you sure you want to delete this address?</p>
            <div className="confirmation-buttons">
              <button className="confirm-btn yes-btn" onClick={confirmDeleteAddress}>
                Yes
              </button>
              <button className="confirm-btn no-btn" onClick={cancelDeleteAddress}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Reason Dialog */}
      {showCancelReason && (
        <div className="confirmation-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="confirmation-modal cancel-reason-modal">
            <h3>Cancel Order</h3>
            <p>Please select a reason for cancelling:</p>
            
            <div className="cancel-reasons">
              <label className="reason-option">
                <input
                  type="radio"
                  name="cancelReason"
                  value="Ordered by mistake"
                  checked={cancelReason === 'Ordered by mistake'}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <span>Ordered by mistake</span>
              </label>
              
              <label className="reason-option">
                <input
                  type="radio"
                  name="cancelReason"
                  value="Changed my mind"
                  checked={cancelReason === 'Changed my mind'}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <span>Changed my mind</span>
              </label>
              
              <label className="reason-option">
                <input
                  type="radio"
                  name="cancelReason"
                  value="Wrong product or size selected"
                  checked={cancelReason === 'Wrong product or size selected'}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <span>Wrong product or size selected</span>
              </label>
              
              <label className="reason-option">
                <input
                  type="radio"
                  name="cancelReason"
                  value="Payment or checkout issue"
                  checked={cancelReason === 'Payment or checkout issue'}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <span>Payment or checkout issue</span>
              </label>
              
              <label className="reason-option">
                <input
                  type="radio"
                  name="cancelReason"
                  value="Personal reasons (other)"
                  checked={cancelReason === 'Personal reasons (other)'}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <span>Personal reasons (other)</span>
              </label>
            </div>
            
            <div className="confirmation-buttons">
              <button className="confirm-btn submit-cancel-btn" onClick={handleSubmitCancellation}>
                Submit
              </button>
              <button className="confirm-btn back-btn" onClick={handleBackToOrder}>
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Processing Modal */}
      <OrderProcessingModal 
        isOpen={isProcessingOrder}
        onClose={() => setIsProcessingOrder(false)}
        onError={(error) => {
          setIsProcessingOrder(false);
          console.error('Order processing error:', error);
        }}
      />
    </div>
  );
};

export default CheckoutModal;
