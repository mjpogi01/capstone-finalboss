import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AiOutlineStar, AiFillStar } from 'react-icons/ai';
import { FaShoppingCart, FaTimes, FaCreditCard, FaUsers, FaPlus, FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import CheckoutModal from './CheckoutModal';
import SizeChartModal from './SizeChartModal';
import OrderProcessingModal from './OrderProcessingModal';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import orderService from '../../services/orderService';
import { useAuth } from '../../contexts/AuthContext';
import productService from '../../services/productService';
import { loadProductModalPreferences, saveProductModalPreferences, updateProductModalPreferences } from '../../utils/userPreferences';
import './ProductModal.css';

const DEFAULT_TROPHY_SIZES = ['6" (Small)', '10" (Medium)', '14" (Large)', '18" (Extra Large)', '24" (Premium)'];

const parseTrophySizes = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string' && item.trim().length > 0).map(item => item.trim());
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(item => typeof item === 'string' && item.trim().length > 0)
        .map(item => item.trim());
    }
  } catch (error) {
    console.warn('Unable to parse trophy sizes:', error.message);
  }

  return [];
};

const parseJerseySizes = (sizeValue) => {
  const defaultSizes = {
    shirts: { adults: [], kids: [] },
    shorts: { adults: [], kids: [] }
  };

  if (!sizeValue) {
    return defaultSizes;
  }

  if (typeof sizeValue !== 'string') {
    return defaultSizes;
  }

  const trimmed = sizeValue.trim();
  if (!trimmed.startsWith('{')) {
    return defaultSizes;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        shirts: {
          adults: Array.isArray(parsed.shirts?.adults) ? parsed.shirts.adults : [],
          kids: Array.isArray(parsed.shirts?.kids) ? parsed.shirts.kids : []
        },
        shorts: {
          adults: Array.isArray(parsed.shorts?.adults) ? parsed.shorts.adults : [],
          kids: Array.isArray(parsed.shorts?.kids) ? parsed.shorts.kids : []
        }
      };
    }
  } catch (error) {
    console.warn('Failed to parse jersey sizes in ProductModal:', error.message);
  }

  return defaultSizes;
};

const sanitizeSingleOrderDetails = (details, variant) => {
  if (!details) return null;

  const sanitized = { ...details, jerseyType: variant || null };

  if (variant === 'shirt') {
    sanitized.shortsSize = null;
    sanitized.size = sanitized.jerseySize ?? sanitized.size ?? null;
  } else if (variant === 'shorts') {
    sanitized.jerseySize = null;
    sanitized.size = null;
  } else {
    sanitized.size = sanitized.jerseySize ?? sanitized.size ?? null;
  }

  return sanitized;
};

const sanitizeTeamMembers = (members, variant) => {
  if (!Array.isArray(members)) {
    return [];
  }

  // Now each member has their own jerseyType, but we still support legacy variant parameter
  return members.map(member => {
    const memberJerseyType = member.jerseyType || variant || 'full';
    const sanitized = { ...member, jerseyType: memberJerseyType };

    if (memberJerseyType === 'shirt') {
      sanitized.shortsSize = null;
      sanitized.size = sanitized.jerseySize ?? sanitized.size ?? null;
    } else if (memberJerseyType === 'shorts') {
      sanitized.jerseySize = null;
      sanitized.size = null;
    } else {
      sanitized.size = sanitized.jerseySize ?? sanitized.size ?? null;
    }

    return sanitized;
  });
};

const ProductModal = ({ isOpen, onClose, product, isFromCart = false, existingCartItemId = null, existingCartItemData = null, onAddToCart, onBuyNow, onConfirm }) => {
  // Always call hooks, but only use CartContext when in customer mode (no callbacks provided)
  const isAdminMode = !!(onAddToCart && onBuyNow);
  const cartContext = useCart();
  const { addToCart: contextAddToCart, removeFromCart: contextRemoveFromCart, cartItems, selectedItems, clearCart } = cartContext;
  
  // Use context functions only when NOT in admin mode
  const addToCart = isAdminMode ? null : contextAddToCart;
  const removeFromCart = isAdminMode ? null : contextRemoveFromCart;
  
  const { user } = useAuth();
  const { showOrderConfirmation, showError } = useNotification();
  const [selectedSize, setSelectedSize] = useState(existingCartItemData?.size || 'M');
  const [quantity, setQuantity] = useState(existingCartItemData?.quantity || 1);
  const [isTeamOrder, setIsTeamOrder] = useState(existingCartItemData?.isTeamOrder || false);
  const [teamMembers, setTeamMembers] = useState(
    existingCartItemData?.teamMembers && existingCartItemData.teamMembers.length > 0
      ? existingCartItemData.teamMembers.map(member => ({
          ...member,
          jerseyType: member.jerseyType || member.jersey_type || existingCartItemData?.jerseyType || 'full',
          fabricOption: member.fabricOption || member.fabric_option || existingCartItemData?.fabricOption || '',
          cutType: member.cutType || member.cut_type || existingCartItemData?.cutType || '',
          sizingType: member.sizingType || member.sizing_type || 'adult'
        }))
      : [{
          id: Date.now(),
          teamName: '',
          surname: '',
          number: '',
          jerseySize: 'M',
          shortsSize: 'M',
          jerseyType: existingCartItemData?.jerseyType || 'full',
          fabricOption: existingCartItemData?.fabricOption || '',
          cutType: existingCartItemData?.cutType || '',
          sizingType: 'adult'
        }]
  );
  const [teamName, setTeamName] = useState(existingCartItemData?.teamMembers?.[0]?.teamName || '');
  const [singleOrderDetails, setSingleOrderDetails] = useState(
    existingCartItemData?.singleOrderDetails
      ? { ...existingCartItemData.singleOrderDetails, jerseyType: existingCartItemData?.jerseyType || existingCartItemData.singleOrderDetails?.jerseyType || 'full' }
      : { teamName: '', surname: '', number: '', jerseySize: 'M', shortsSize: 'M', size: 'M', jerseyType: 'full' }
  );
  const [sizeType, setSizeType] = useState(() => {
    if (existingCartItemData?.sizeType) return existingCartItemData.sizeType;
    if (user && !existingCartItemData && !isFromCart) {
      const preferences = loadProductModalPreferences(user.id);
      if (preferences?.sizeType) return preferences.sizeType;
    }
    return 'adult';
  }); // 'adult' or 'kids'
  const [jerseyType, setJerseyType] = useState(() => {
    if (existingCartItemData?.jerseyType) return existingCartItemData.jerseyType;
    if (user && !existingCartItemData && !isFromCart) {
      const preferences = loadProductModalPreferences(user.id);
      if (preferences?.jerseyType) return preferences.jerseyType;
    }
    return 'full';
  }); // 'full', 'shirt', 'shorts'
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isReviewsExpanded, setIsReviewsExpanded] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState(new Set());
  const [showCheckout, setShowCheckout] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [buyNowItem, setBuyNowItem] = useState(null);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  
  // Ball and Trophy specific details
  const [ballDetails, setBallDetails] = useState(existingCartItemData?.ballDetails || {
    sportType: '',
    brand: '',
    ballSize: '',
    material: ''
  });
  const [trophyDetails, setTrophyDetails] = useState(existingCartItemData?.trophyDetails || {
    trophyType: '',
    size: '',
    material: '',
    engravingText: '',
    occasion: ''
  });
  const [selectedFabricOption, setSelectedFabricOption] = useState(existingCartItemData?.fabricOption || '');
  const [fabricData, setFabricData] = useState(product?.fabric_surcharges || null);
  const [selectedCutType, setSelectedCutType] = useState(existingCartItemData?.cutType || '');
  const [cutTypeData, setCutTypeData] = useState(product?.cut_type_surcharges || null);

  // Debug: Monitor Buy Now item changes
  useEffect(() => {
    if (buyNowItem) {
      console.log('≡ƒ¢Æ ProductModal: Buy Now item set:', buyNowItem.name);
    }
  }, [buyNowItem]);

  // Define loadProductReviews first (before useEffect that calls it)
  const loadProductReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      // Fetch reviews specifically for this product
      const productReviews = await orderService.getProductReviews(product.id);
      
      console.log('≡ƒôª Loaded reviews for product', product.id, ':', productReviews.length, 'reviews');
      
      // Format reviews to display properly
      const formattedReviews = productReviews.map(review => {
        const ratingValue = typeof review.rating === 'number' ? review.rating : Number(review.rating) || 0;
        const reviewerName = review.user_name || review.user_email || review.user_id || 'Anonymous';
        const reviewDate = review.created_at ? new Date(review.created_at).toLocaleDateString() : '';

        return {
          id: review.id,
          user: reviewerName,
          rating: ratingValue,
          comment: review.comment || '',
          date: reviewDate
        };
      });
      
      setReviews(formattedReviews);
    } catch (error) {
      console.error('Error loading product reviews:', error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [product?.id]);

  // Reset form when modal opens with existing cart data
  useEffect(() => {
    if (isOpen && existingCartItemData) {
      setSelectedSize(existingCartItemData.size || 'M');
      setQuantity(existingCartItemData.quantity || 1);
      setIsTeamOrder(existingCartItemData.isTeamOrder || false);
      const existingTeamMembers = existingCartItemData.teamMembers || [];
      if (existingTeamMembers.length > 0) {
        setTeamMembers(existingTeamMembers.map(member => ({
          ...member,
          jerseyType: member?.jerseyType || existingCartItemData.jerseyType || member?.jersey_type || null
        })));
      } else {
        setTeamMembers([]);
      }
      setTeamName(existingCartItemData.teamMembers?.[0]?.teamName || '');
      setSingleOrderDetails(
        existingCartItemData.singleOrderDetails
          ? {
              ...existingCartItemData.singleOrderDetails,
              jerseyType: existingCartItemData.jerseyType || existingCartItemData.singleOrderDetails?.jerseyType || 'full'
            }
          : { teamName: '', surname: '', number: '', jerseySize: 'M', shortsSize: 'M', size: 'M', jerseyType: existingCartItemData.jerseyType || 'full' }
      );
      setJerseyType(existingCartItemData.jerseyType || 'full');
    } else if (isOpen && !existingCartItemData) {
      // Reset to defaults when opening modal for a new product
      setSelectedSize('M');
      setQuantity(1);
      setIsTeamOrder(false);
      setTeamMembers([{
        id: Date.now(),
        teamName: '',
        surname: '',
        number: '',
        jerseySize: 'M',
        shortsSize: 'M',
        jerseyType: 'full'
      }]);
      setTeamName('');
      setSingleOrderDetails({ teamName: '', surname: '', number: '', jerseySize: 'M', shortsSize: 'M', size: 'M', jerseyType: 'full' });
      setJerseyType('full');
    }
  }, [isOpen, existingCartItemData]);

  // Load reviews for the product
  useEffect(() => {
    if (isOpen && product?.id) {
      loadProductReviews();
    }
  }, [isOpen, product?.id, loadProductReviews]);

  // Refresh reviews when modal opens (in case new reviews were added)
  useEffect(() => {
    if (isOpen && product?.id) {
      // Small delay to ensure any recent review submissions are processed
      const refreshTimer = setTimeout(() => {
        loadProductReviews();
      }, 1000);
      
      return () => clearTimeout(refreshTimer);
    }
  }, [isOpen, product?.id, loadProductReviews]);

  const trophySizeOptions = useMemo(() => {
    if (!product) {
      return DEFAULT_TROPHY_SIZES;
    }

    if (Array.isArray(product.available_sizes) && product.available_sizes.length > 0) {
      return product.available_sizes;
    }

    const parsed = parseTrophySizes(product.size);
    if (parsed.length > 0) {
      return parsed;
    }

    return DEFAULT_TROPHY_SIZES;
  }, [product]);

  // Determine product category (before early return to use in useMemo)
  const isBall = useMemo(() => product?.category?.toLowerCase() === 'balls', [product]);
  const isTrophy = useMemo(() => product?.category?.toLowerCase() === 'trophies', [product]);
  const isApparel = useMemo(() => !isBall && !isTrophy, [isBall, isTrophy]);
  const isJerseyCategory = useMemo(() => {
    if (!product || !isApparel) return false;
    const category = product.category?.toLowerCase();
    return category === 'jerseys';
  }, [product, isApparel]);

  // Check if product is uniforms category
  const isUniformsCategory = useMemo(() => {
    if (!product) return false;
    const category = product.category?.toLowerCase();
    return category === 'uniforms';
  }, [product]);

  // Check if product is hoodie category
  const isHoodieCategory = useMemo(() => {
    if (!product) return false;
    const category = product.category?.toLowerCase();
    return category === 'hoodies';
  }, [product]);

  // Check if product is long sleeves category
  const isLongSleevesCategory = useMemo(() => {
    if (!product) return false;
    const category = product.category?.toLowerCase();
    return category === 'long sleeves';
  }, [product]);

  // Check if product is T-shirt category
  const isTShirtCategory = useMemo(() => {
    if (!product) return false;
    const category = product.category?.toLowerCase();
    return category === 't-shirts' || category === 't-shirt';
  }, [product]);

  // Categories that don't have jersey type or cut type
  const shouldHideJerseyType = useMemo(() => {
    return isUniformsCategory || isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
  }, [isUniformsCategory, isHoodieCategory, isLongSleevesCategory, isTShirtCategory]);

  const shouldHideCutType = useMemo(() => {
    return isUniformsCategory || isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
  }, [isUniformsCategory, isHoodieCategory, isLongSleevesCategory, isTShirtCategory]);

  // Determine if shorts size should be shown (only for jerseys, and only when jerseyType is 'full' or 'shorts')
  // Hide for uniforms, hoodies, long sleeves, and T-shirts
  const shouldShowShorts = useMemo(() => {
    if (!isJerseyCategory) return false;
    if (shouldHideJerseyType) return false; // No shorts for uniforms, hoodies, long sleeves, T-shirts
    return jerseyType === 'full' || jerseyType === 'shorts';
  }, [isJerseyCategory, jerseyType, shouldHideJerseyType]);

  // Parse jersey sizes from product (must be before early return)
  const jerseySizes = useMemo(() => {
    if (isJerseyCategory && product?.size) {
      return parseJerseySizes(product.size);
    }
    return null;
  }, [product, isJerseyCategory]);

  // Parse jersey prices from product
  const jerseyPrices = useMemo(() => {
    if (!isJerseyCategory || !product) return null;
    
    console.log('🔍 [ProductModal] Parsing jersey prices for product:', product.name);
    console.log('🔍 [ProductModal] product.jersey_prices:', product.jersey_prices);
    
    if (product.jersey_prices) {
      try {
        // Parse if it's a string, otherwise use directly
        const prices = typeof product.jersey_prices === 'string' 
          ? JSON.parse(product.jersey_prices) 
          : product.jersey_prices;
        
        console.log('🔍 [ProductModal] Parsed prices:', prices);
        
        const parsedPrices = {
          fullSet: parseFloat(prices.fullSet || prices.full_set || product.price || 0),
          shirtOnly: parseFloat(prices.shirtOnly || prices.shirt_only || product.price || 0),
          shortsOnly: parseFloat(prices.shortsOnly || prices.shorts_only || product.price || 0),
          fullSetKids: prices.fullSetKids || prices.full_set_kids || null,
          shirtOnlyKids: prices.shirtOnlyKids || prices.shirt_only_kids || null,
          shortsOnlyKids: prices.shortsOnlyKids || prices.shorts_only_kids || null
        };
        
        // Convert kids prices to numbers if they exist
        if (parsedPrices.fullSetKids !== null) parsedPrices.fullSetKids = parseFloat(parsedPrices.fullSetKids);
        if (parsedPrices.shirtOnlyKids !== null) parsedPrices.shirtOnlyKids = parseFloat(parsedPrices.shirtOnlyKids);
        if (parsedPrices.shortsOnlyKids !== null) parsedPrices.shortsOnlyKids = parseFloat(parsedPrices.shortsOnlyKids);
        
        console.log('🔍 [ProductModal] Final parsed prices:', parsedPrices);
        return parsedPrices;
      } catch (error) {
        console.error('❌ [ProductModal] Error parsing jersey_prices:', error);
      }
    }
    
    // Fallback: use regular price for all types
    const fallbackPrice = parseFloat(product.price) || 0;
    console.log('⚠️ [ProductModal] No jersey_prices found, using fallback price:', fallbackPrice);
    return {
      fullSet: fallbackPrice,
      shirtOnly: fallbackPrice,
      shortsOnly: fallbackPrice
    };
  }, [product, isJerseyCategory]);

  // Parse trophy prices from product
  const trophyPrices = useMemo(() => {
    if (!isTrophy || !product) return null;
    
    console.log('🏆 [ProductModal] Parsing trophy prices for product:', product.name);
    console.log('🏆 [ProductModal] product.trophy_prices:', product.trophy_prices);
    
    if (product.trophy_prices) {
      try {
        // Parse if it's a string, otherwise use directly
        const prices = typeof product.trophy_prices === 'string' 
          ? JSON.parse(product.trophy_prices) 
          : product.trophy_prices;
        
        console.log('🏆 [ProductModal] Parsed trophy prices:', prices);
        
        // Convert all values to numbers
        const parsedPrices = {};
        Object.keys(prices).forEach(size => {
          parsedPrices[size] = parseFloat(prices[size]) || 0;
        });
        
        console.log('🏆 [ProductModal] Final parsed trophy prices:', parsedPrices);
        return parsedPrices;
      } catch (error) {
        console.error('❌ [ProductModal] Error parsing trophy_prices:', error);
      }
    }
    
    // Fallback: use regular price for all sizes
    const fallbackPrice = parseFloat(product.price) || 0;
    console.log('⚠️ [ProductModal] No trophy_prices found, using fallback price:', fallbackPrice);
    return null; // Return null so we can detect and use product.price
  }, [product, isTrophy]);

  const sizeSurchargeConfig = useMemo(() => {
    if (!product?.size_surcharges) return null;
    try {
      const raw =
        typeof product.size_surcharges === 'string'
          ? JSON.parse(product.size_surcharges)
          : product.size_surcharges;
      return raw && typeof raw === 'object' ? raw : null;
    } catch (error) {
      console.error('❌ [ProductModal] Error parsing size_surcharges:', error);
      return null;
    }
  }, [product]);

  useEffect(() => {
    if (product?.fabric_surcharges) {
      setFabricData(product.fabric_surcharges);
    } else {
      setFabricData(null);
    }
  }, [product?.fabric_surcharges, product?.id]);

  useEffect(() => {
    if (!isOpen || !product?.id) return;

    const hasFabricData = (() => {
      if (!fabricData) return false;
      if (typeof fabricData === 'string') {
        const trimmed = fabricData.trim();
        if (!trimmed || trimmed === '{}' || trimmed.toLowerCase() === 'null') {
          return false;
        }
        try {
          const parsed = JSON.parse(trimmed);
          return parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0;
        } catch (error) {
          return false;
        }
      }
      if (typeof fabricData === 'object') {
        return Object.keys(fabricData).length > 0;
      }
      return false;
    })();

    const hasCutTypeData = (() => {
      if (!cutTypeData) return false;
      if (typeof cutTypeData === 'string') {
        const trimmed = cutTypeData.trim();
        if (!trimmed || trimmed === '{}' || trimmed.toLowerCase() === 'null') {
          return false;
        }
        try {
          const parsed = JSON.parse(trimmed);
          return parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0;
        } catch (error) {
          return false;
        }
      }
      if (typeof cutTypeData === 'object') {
        return Object.keys(cutTypeData).length > 0;
      }
      return false;
    })();

    if (hasFabricData && hasCutTypeData) return;

    let isMounted = true;
    const loadSurcharges = async () => {
      try {
        const latestProduct = await productService.getProductById(product.id);
        if (isMounted && latestProduct?.fabric_surcharges && !hasFabricData) {
          setFabricData(latestProduct.fabric_surcharges);
        }
        if (isMounted && latestProduct?.cut_type_surcharges && !hasCutTypeData) {
          setCutTypeData(latestProduct.cut_type_surcharges);
        }
      } catch (error) {
        console.error('❌ [ProductModal] Failed to load surcharges:', error);
      }
    };

    loadSurcharges();

    return () => {
      isMounted = false;
    };
  }, [isOpen, product?.id, fabricData, cutTypeData]);

  const fabricOptions = useMemo(() => {
    if (!fabricData) return [];
    try {
      const raw =
        typeof fabricData === 'string'
          ? JSON.parse(fabricData)
          : fabricData;
      if (!raw || typeof raw !== 'object') return [];
      return Object.entries(raw).map(([name, amount]) => ({
        name,
        amount: Number.parseFloat(amount) || 0
      }));
    } catch (error) {
      console.error('❌ [ProductModal] Error parsing fabric_surcharges:', error);
      return [];
    }
  }, [fabricData]);

  const fabricSurchargeLookup = useMemo(() => {
    const lookup = {};
    fabricOptions.forEach(({ name, amount }) => {
      lookup[name] = amount;
    });
    return lookup;
  }, [fabricOptions]);

  const cutTypeOptions = useMemo(() => {
    if (!cutTypeData) return [];
    try {
      const raw =
        typeof cutTypeData === 'string'
          ? JSON.parse(cutTypeData)
          : cutTypeData;
      if (!raw || typeof raw !== 'object') return [];
      return Object.entries(raw).map(([name, amount]) => ({
        name,
        amount: Number.parseFloat(amount) || 0
      }));
    } catch (error) {
      console.error('❌ [ProductModal] Error parsing cut_type_surcharges:', error);
      return [];
    }
  }, [cutTypeData]);

  const cutTypeSurchargeLookup = useMemo(() => {
    const lookup = {};
    cutTypeOptions.forEach(({ name, amount }) => {
      lookup[name] = amount;
    });
    return lookup;
  }, [cutTypeOptions]);

  useEffect(() => {
    if (fabricOptions.length === 0) {
      setSelectedFabricOption('');
      // Clear fabric options for team members if no options available
      if (isTeamOrder) {
        setTeamMembers(prev => prev.map(member => ({ ...member, fabricOption: '' })));
      }
      return;
    }

    setSelectedFabricOption((prev) => {
      if (prev && fabricOptions.some((option) => option.name === prev)) {
        return prev;
      }

      if (
        isFromCart &&
        existingCartItemData?.fabricOption &&
        fabricOptions.some((option) => option.name === existingCartItemData.fabricOption)
      ) {
        return existingCartItemData.fabricOption;
      }

      // Load from user preferences if available and not from cart
      if (!isFromCart && !existingCartItemData && user) {
        const preferences = loadProductModalPreferences(user.id);
        if (preferences?.fabricOption && fabricOptions.some((option) => option.name === preferences.fabricOption)) {
          return preferences.fabricOption;
        }
      }

      return fabricOptions[0].name;
    });

    // Set default fabric option for team members that don't have one
    if (isTeamOrder && fabricOptions.length > 0) {
      setTeamMembers(prev => prev.map(member => ({
        ...member,
        fabricOption: member.fabricOption && fabricOptions.some(opt => opt.name === member.fabricOption)
          ? member.fabricOption
          : fabricOptions[0].name
      })));
    }
  }, [fabricOptions, isFromCart, existingCartItemData, isTeamOrder, user]);

  useEffect(() => {
    if (cutTypeOptions.length === 0) {
      setSelectedCutType('');
      // Clear cut type options for team members if no options available
      if (isTeamOrder) {
        setTeamMembers(prev => prev.map(member => ({ ...member, cutType: '' })));
      }
      return;
    }

    setSelectedCutType((prev) => {
      if (prev && cutTypeOptions.some((option) => option.name === prev)) {
        return prev;
      }

      if (
        isFromCart &&
        existingCartItemData?.cutType &&
        cutTypeOptions.some((option) => option.name === existingCartItemData.cutType)
      ) {
        return existingCartItemData.cutType;
      }

      // Load from user preferences if available and not from cart
      if (!isFromCart && !existingCartItemData && user) {
        const preferences = loadProductModalPreferences(user.id);
        if (preferences?.cutType && cutTypeOptions.some((option) => option.name === preferences.cutType)) {
          return preferences.cutType;
        }
      }

      return cutTypeOptions[0].name;
    });

    // Set default cut type option for team members that don't have one
    if (isTeamOrder && cutTypeOptions.length > 0) {
      setTeamMembers(prev => prev.map(member => ({
        ...member,
        cutType: member.cutType && cutTypeOptions.some(opt => opt.name === member.cutType)
          ? member.cutType
          : cutTypeOptions[0].name
      })));
    }
  }, [cutTypeOptions, isFromCart, existingCartItemData, isTeamOrder, user]);

  const resolveSizeSurcharge = useCallback(
    (sizeKey, groupHint) => {
      if (!sizeSurchargeConfig || !sizeKey) return 0;

      const key = String(sizeKey).trim();
      if (!key) return 0;

      const parseAmount = (value) => {
        const numeric = Number.parseFloat(value);
        return Number.isNaN(numeric) ? 0 : numeric;
      };

      const normalizedKey = key.replace(/\s+/g, '').toLowerCase();
      const findMatch = (obj) => {
        if (!obj || typeof obj !== 'object') return undefined;
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          return obj[key];
        }
        const entry = Object.entries(obj).find(([candidate]) =>
          typeof candidate === 'string' && candidate.replace(/\s+/g, '').toLowerCase() === normalizedKey
        );
        return entry ? entry[1] : undefined;
      };

      if (
        typeof sizeSurchargeConfig === 'object' &&
        (sizeSurchargeConfig.adults ||
          sizeSurchargeConfig.kids ||
          sizeSurchargeConfig.general)
      ) {
        if (
          groupHint === 'kids' &&
          sizeSurchargeConfig.kids
        ) {
          const match = findMatch(sizeSurchargeConfig.kids);
          if (match !== undefined) {
            return parseAmount(match);
          }
        }
        if (
          groupHint === 'adults' &&
          sizeSurchargeConfig.adults
        ) {
          const match = findMatch(sizeSurchargeConfig.adults);
          if (match !== undefined) {
            return parseAmount(match);
          }
        }
        if (
          sizeSurchargeConfig.general &&
          findMatch(sizeSurchargeConfig.general) !== undefined
        ) {
          const match = findMatch(sizeSurchargeConfig.general);
          if (match !== undefined) {
            return parseAmount(match);
          }
        }
        if (
          sizeSurchargeConfig.adults
        ) {
          const match = findMatch(sizeSurchargeConfig.adults);
          if (match !== undefined) {
            return parseAmount(match);
          }
        }
        if (
          sizeSurchargeConfig.kids
        ) {
          const match = findMatch(sizeSurchargeConfig.kids);
          if (match !== undefined) {
            return parseAmount(match);
          }
        }
        return 0;
      }

      if (
        typeof sizeSurchargeConfig === 'object' &&
        findMatch(sizeSurchargeConfig) !== undefined
      ) {
        const match = findMatch(sizeSurchargeConfig);
        if (match !== undefined) {
          return parseAmount(match);
        }
      }

      return 0;
    },
    [sizeSurchargeConfig]
  );

  const sizeGroupHint = useMemo(() => {
    if (isTrophy) return 'general';
    if (isJerseyCategory) return sizeType === 'kids' ? 'kids' : 'adults';
    if (isApparel) return 'general';
    return null;
  }, [isTrophy, isJerseyCategory, sizeType, isApparel]);

  const singleOrderSizeKey = useMemo(() => {
    if (isTeamOrder) return null;
    if (isTrophy) return trophyDetails.size || null;
    if (isJerseyCategory) {
      if (jerseyType === 'shorts') {
        return (
          singleOrderDetails?.shortsSize ||
          singleOrderDetails?.size ||
          null
        );
      }
      return (
        singleOrderDetails?.jerseySize ||
        singleOrderDetails?.size ||
        selectedSize ||
        null
      );
    }
    if (isApparel) {
      return singleOrderDetails?.size || selectedSize || null;
    }
    return null;
  }, [
    isTeamOrder,
    isTrophy,
    trophyDetails,
    isJerseyCategory,
    jerseyType,
    singleOrderDetails,
    selectedSize,
    isApparel
  ]);

  const fabricSurchargeAmount = useMemo(() => {
    if (!selectedFabricOption) return 0;
    const amount = fabricSurchargeLookup[selectedFabricOption];
    return Number.isFinite(amount) ? amount : 0;
  }, [selectedFabricOption, fabricSurchargeLookup]);

  const cutTypeSurchargeAmount = useMemo(() => {
    if (!selectedCutType) return 0;
    const amount = cutTypeSurchargeLookup[selectedCutType];
    return Number.isFinite(amount) ? amount : 0;
  }, [selectedCutType, cutTypeSurchargeLookup]);

  const sizeSurchargeAmount = useMemo(() => {
    if (isTeamOrder) return 0;
    return resolveSizeSurcharge(singleOrderSizeKey, sizeGroupHint);
  }, [isTeamOrder, singleOrderSizeKey, sizeGroupHint, resolveSizeSurcharge]);

  const teamSizeSurchargeInfo = useMemo(() => {
    if (!isTeamOrder || !sizeSurchargeConfig) {
      return { total: 0, perUnit: 0, members: null };
    }

    const updatedMembers = (teamMembers || []).map((member) => {
      const memberGroup =
        member?.sizingType === 'kids'
          ? 'kids'
          : isJerseyCategory
          ? 'adults'
          : 'general';

      // For hoodies, long sleeves, and T-shirts, treat as shirt-only (no jersey type, no shorts)
      const isHoodieOrLongSleevesOrTShirt = isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
      const memberJerseyType = member?.jerseyType || 'full';
      const effectiveMemberJerseyType = isHoodieOrLongSleevesOrTShirt ? 'shirt' : memberJerseyType;
      
      let sizeKey = null;
      if (isJerseyCategory) {
        if (effectiveMemberJerseyType === 'shorts') {
          sizeKey = member?.shortsSize || member?.size || member?.jerseySize || null;
        } else if (effectiveMemberJerseyType === 'shirt' || isHoodieOrLongSleevesOrTShirt) {
          sizeKey = member?.jerseySize || member?.size || null;
        } else {
          sizeKey = member?.jerseySize || member?.size || null;
        }
      } else {
        sizeKey = member?.size || member?.jerseySize || member?.shortsSize || null;
      }

      const surcharge = resolveSizeSurcharge(sizeKey, memberGroup);
      return {
        ...member,
        sizeSurcharge: surcharge,
        sizeSurchargeSize: sizeKey
      };
    });

    const total = updatedMembers.reduce(
      (sum, member) => sum + (member.sizeSurcharge || 0),
      0
    );
    const perUnit =
      total / Math.max(1, updatedMembers.length || 1);

    return { total, perUnit, members: updatedMembers };
  }, [
    isTeamOrder,
    sizeSurchargeConfig,
    teamMembers,
    isJerseyCategory,
    resolveSizeSurcharge
  ]);

  // Get current price based on jersey type, trophy size, and size type
  const baseUnitPrice = useMemo(() => {
    let basePrice = parseFloat(product?.price) || 0;
    
    console.log('💰 [ProductModal] Calculating price - isTrophy:', isTrophy, 'isJerseyCategory:', isJerseyCategory, 'trophyDetails.size:', trophyDetails?.size);
    
    // For trophies, use price based on selected size
    if (isTrophy && trophyPrices && trophyDetails.size) {
      const sizePrice = trophyPrices[trophyDetails.size];
      if (sizePrice !== undefined && sizePrice !== null) {
        basePrice = sizePrice;
        console.log('🏆 [ProductModal] Using trophy price for size', trophyDetails.size, ':', basePrice);
      } else {
        console.log('⚠️ [ProductModal] No price found for trophy size', trophyDetails.size, ', using product.price:', basePrice);
      }
    } else if (isJerseyCategory && jerseyPrices) {
      // For T-shirts, hoodies, long sleeves (shouldHideJerseyType), treat as shirt-only (no jersey type)
      const effectiveJerseyType = shouldHideJerseyType ? 'shirt' : jerseyType;
      
      // Use jersey-specific prices
      // Check if kids prices are available and sizeType is kids
      const useKidsPrices = sizeType === 'kids' && 
        (jerseyPrices.fullSetKids !== null && jerseyPrices.fullSetKids !== undefined) &&
        (jerseyPrices.shirtOnlyKids !== null && jerseyPrices.shirtOnlyKids !== undefined) &&
        (jerseyPrices.shortsOnlyKids !== null && jerseyPrices.shortsOnlyKids !== undefined);
      
      if (useKidsPrices) {
        // Use kids prices
        switch (effectiveJerseyType) {
          case 'full':
            basePrice = jerseyPrices.fullSetKids;
            console.log('💰 [ProductModal] Using fullSetKids price:', basePrice);
            break;
          case 'shirt':
            basePrice = jerseyPrices.shirtOnlyKids;
            console.log('💰 [ProductModal] Using shirtOnlyKids price:', basePrice);
            break;
          case 'shorts':
            basePrice = jerseyPrices.shortsOnlyKids;
            console.log('💰 [ProductModal] Using shortsOnlyKids price:', basePrice);
            break;
          default:
            basePrice = jerseyPrices.fullSetKids;
            console.log('💰 [ProductModal] Using default (fullSetKids) price:', basePrice);
        }
      } else {
        // Use adult prices
        switch (effectiveJerseyType) {
          case 'full':
            basePrice = jerseyPrices.fullSet;
            console.log('💰 [ProductModal] Using fullSet price:', basePrice);
            break;
          case 'shirt':
            basePrice = jerseyPrices.shirtOnly;
            console.log('💰 [ProductModal] Using shirtOnly price:', basePrice);
            break;
          case 'shorts':
            basePrice = jerseyPrices.shortsOnly;
            console.log('💰 [ProductModal] Using shortsOnly price:', basePrice);
            break;
          default:
            basePrice = jerseyPrices.fullSet;
            console.log('💰 [ProductModal] Using default (fullSet) price:', basePrice);
        }
        
        // Apply kids discount if kids prices are not available but sizeType is kids
        if (sizeType === 'kids' && !useKidsPrices) {
          basePrice = Math.max(0, basePrice - 200);
          console.log('💰 [ProductModal] Applied kids discount (fallback):', basePrice);
        }
      }
    } else {
      console.log('💰 [ProductModal] Using product.price:', basePrice);
    }
    
    console.log('💰 [ProductModal] Base unit price (before surcharges):', basePrice);
    return basePrice;
  }, [product, isTrophy, isJerseyCategory, jerseyPrices, trophyPrices, jerseyType, sizeType, trophyDetails, shouldHideJerseyType]);

  // Calculate per-member pricing for team orders
  const teamPricingInfo = useMemo(() => {
    if (!isTeamOrder || !isApparel) {
      return { total: 0, perUnit: 0, members: [] };
    }

    const memberPricing = (teamMembers || []).map((member) => {
      // For hoodies, long sleeves, and T-shirts, treat as shirt-only (no jersey type)
      const isHoodieOrLongSleevesOrTShirt = isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
      const memberJerseyType = member?.jerseyType || 'full';
      const effectiveMemberJerseyType = isHoodieOrLongSleevesOrTShirt ? 'shirt' : memberJerseyType;
      const memberSizingType = member?.sizingType || 'adult';
      const memberFabricOption = member?.fabricOption || '';
      
      // Calculate base price based on member's effective jersey type
      let memberBasePrice = baseUnitPrice;
      if (isJerseyCategory && jerseyPrices) {
        const useKidsPrices = memberSizingType === 'kids' && 
          (jerseyPrices.fullSetKids !== null && jerseyPrices.fullSetKids !== undefined);
        
        switch (effectiveMemberJerseyType) {
          case 'shirt':
            memberBasePrice = useKidsPrices ? jerseyPrices.shirtOnlyKids : jerseyPrices.shirtOnly;
            break;
          case 'shorts':
            memberBasePrice = useKidsPrices ? jerseyPrices.shortsOnlyKids : jerseyPrices.shortsOnly;
            break;
          default:
            memberBasePrice = useKidsPrices ? jerseyPrices.fullSetKids : jerseyPrices.fullSet;
        }
        
        // Apply kids discount if kids prices are not available but sizingType is kids
        if (memberSizingType === 'kids' && !useKidsPrices) {
          memberBasePrice = Math.max(0, memberBasePrice - 200);
        }
      }

      // Calculate fabric surcharge
      const memberFabricSurcharge = memberFabricOption && fabricSurchargeLookup[memberFabricOption]
        ? fabricSurchargeLookup[memberFabricOption]
        : 0;

      const memberCutType = member.cutType || '';
      const memberCutTypeSurcharge = memberCutType && cutTypeSurchargeLookup[memberCutType]
        ? cutTypeSurchargeLookup[memberCutType]
        : 0;

      // Get size surcharge from teamSizeSurchargeInfo
      const sizeSurchargeMember = teamSizeSurchargeInfo.members?.find(m => m.id === member.id);
      const memberSizeSurcharge = sizeSurchargeMember?.sizeSurcharge || 0;

      // Total price for this member
      const memberTotalPrice = memberBasePrice + memberFabricSurcharge + memberCutTypeSurcharge + memberSizeSurcharge;

      return {
        ...member,
        basePrice: memberBasePrice,
        fabricSurcharge: memberFabricSurcharge,
        cutTypeSurcharge: memberCutTypeSurcharge,
        sizeSurcharge: memberSizeSurcharge,
        totalPrice: memberTotalPrice
      };
    });

    const total = memberPricing.reduce((sum, member) => sum + (member.totalPrice || 0), 0);
    const perUnit = total / Math.max(1, memberPricing.length || 1);

    return { total, perUnit, members: memberPricing };
  }, [
    isTeamOrder,
    isApparel,
    teamMembers,
    baseUnitPrice,
    isJerseyCategory,
    jerseyPrices,
    fabricSurchargeLookup,
    teamSizeSurchargeInfo
  ]);

  const currentPrice = useMemo(() => {
    if (isTeamOrder && isApparel) {
      // For team orders, use the average per-unit price from teamPricingInfo
      const price = teamPricingInfo.perUnit;
      console.log('💰 [ProductModal] Team order average unit price:', price);
      return price;
    }
    
    // For single orders, calculate normally
    let price = baseUnitPrice;
    price += fabricSurchargeAmount;
    price += cutTypeSurchargeAmount;
      price += sizeSurchargeAmount;
    console.log('💰 [ProductModal] Final unit price (with surcharges):', price);
    return price;
  }, [baseUnitPrice, fabricSurchargeAmount, cutTypeSurchargeAmount, sizeSurchargeAmount, isTeamOrder, isApparel, teamPricingInfo.perUnit]);

  // Display price - shows total for team orders, unit price for single orders
  const displayPrice = useMemo(() => {
    if (isTeamOrder && isApparel) {
      // For team orders, show the total price
      return teamPricingInfo.total;
    }
    return currentPrice;
  }, [isTeamOrder, isApparel, teamPricingInfo.total, currentPrice]);

  // Display price label
  const displayPriceLabel = useMemo(() => {
    if (isTeamOrder && isApparel && teamMembers.length > 0) {
      return `Total (${teamMembers.length} ${teamMembers.length === 1 ? 'member' : 'members'})`;
    }
    return 'Price';
  }, [isTeamOrder, isApparel, teamMembers.length]);

  // Get available sizes for shirts and shorts based on size type
  const getShirtSizes = () => {
    if (jerseySizes) {
      return sizeType === 'adult' 
        ? (jerseySizes.shirts.adults.length > 0 ? jerseySizes.shirts.adults : ['S', 'M', 'L', 'XL', 'XXL'])
        : (jerseySizes.shirts.kids.length > 0 ? jerseySizes.shirts.kids : ['S6', 'S8', 'S10', 'S12', 'S14']);
    }
    // Fallback to default sizes
    return sizeType === 'adult' ? ['XS', 'S', 'M', 'L', 'XL', 'XXL'] : ['2XS', 'XS', 'S', 'M', 'L', 'XL'];
  };

  const getShortSizes = () => {
    if (jerseySizes) {
      return sizeType === 'adult'
        ? (jerseySizes.shorts.adults.length > 0 ? jerseySizes.shorts.adults : ['S', 'M', 'L', 'XL', 'XXL'])
        : (jerseySizes.shorts.kids.length > 0 ? jerseySizes.shorts.kids : ['S6', 'S8', 'S10', 'S12', 'S14']);
    }
    // Fallback to default sizes
    return sizeType === 'adult' ? ['XS', 'S', 'M', 'L', 'XL', 'XXL'] : ['2XS', 'XS', 'S', 'M', 'L', 'XL'];
  };

  // Helper function to get surcharge for a size
  const getSizeSurcharge = useCallback((size, groupHint) => {
    if (!size || !sizeSurchargeConfig) return 0;
    return resolveSizeSurcharge(size, groupHint);
  }, [sizeSurchargeConfig, resolveSizeSurcharge]);

  const shirtSizes = getShirtSizes();
  const shortSizes = getShortSizes();
  const sizes = sizeType === 'adult' ? ['XS', 'S', 'M', 'L', 'XL', 'XXL'] : ['2XS', 'XS', 'S', 'M', 'L', 'XL']; // Keep for backwards compatibility

  useEffect(() => {
    if (!isJerseyCategory) {
      return;
    }

    const shirtSizeList = getShirtSizes();
    const shortSizeList = getShortSizes();
    const defaultShirtSize = shirtSizeList[Math.floor(shirtSizeList.length / 2)] || (sizeType === 'kids' ? 'S10' : 'M');
    const defaultShortSize = shortSizeList[Math.floor(shortSizeList.length / 2)] || (sizeType === 'kids' ? 'S10' : 'M');

    // Note: Team members now have per-member jerseyType, so we don't sync them to global jerseyType
    // Only update single order details when not in team order mode
    if (!isTeamOrder && isApparel) {
      setSingleOrderDetails(prevDetails => {
        const next = { ...prevDetails };

        // For T-shirts, hoodies, long sleeves (shouldHideJerseyType), treat as shirt-only (no jersey type, no shorts)
        const effectiveJerseyType = shouldHideJerseyType ? 'shirt' : jerseyType;

        if (effectiveJerseyType === 'shirt' || shouldHideJerseyType) {
          next.jerseySize = prevDetails?.jerseySize || defaultShirtSize;
          next.shortsSize = null;
          next.size = next.jerseySize;
        } else if (effectiveJerseyType === 'shorts') {
          next.jerseySize = null;
          next.shortsSize = prevDetails?.shortsSize || defaultShortSize;
          next.size = null;
        } else {
          next.jerseySize = prevDetails?.jerseySize || defaultShirtSize;
          next.shortsSize = prevDetails?.shortsSize || defaultShortSize;
          next.size = next.jerseySize || null;
        }
        next.jerseyType = effectiveJerseyType;

        const changed =
          next.jerseySize !== prevDetails?.jerseySize ||
          next.shortsSize !== prevDetails?.shortsSize ||
          next.size !== prevDetails?.size;

        return changed ? next : prevDetails;
      });
    }
  }, [isJerseyCategory, isApparel, isTeamOrder, jerseyType, sizeType, jerseySizes, teamMembers, singleOrderDetails]);

  if (!isOpen || !product) return null;

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  const handleAddToCart = async () => {
    if (isAddingToCart) return; // Prevent multiple clicks
    
    try {
      setIsAddingToCart(true);
      
      // Validate required fields
      if (!product || !product.id || !product.name) {
        showError('Invalid Product', 'Product information is missing. Please try again.');
        return;
      }

      console.log('≡ƒ¢Æ handleAddToCart called for product:', product.name, 'ID:', product.id);

      // Clear previous errors
      const errors = {};

      // Validate order details before adding to cart
      if (isApparel && !isTeamOrder) {
        // Validate single order details
        if (!singleOrderDetails.teamName || !singleOrderDetails.teamName.trim()) {
          errors.singleTeamName = 'Required';
        }
        if (!singleOrderDetails.surname || !singleOrderDetails.surname.trim()) {
          errors.singleSurname = 'Required';
        }
        // Only require jersey number if not uniforms category
        if (!isUniformsCategory && (!singleOrderDetails.number || !singleOrderDetails.number.trim())) {
          errors.singleNumber = 'Required';
        }
        
        if (Object.keys(errors).length > 0) {
          setValidationErrors(errors);
          setIsAddingToCart(false);
          return;
        }
      }
      
      if (isApparel && isTeamOrder) {
        // Validate team name
        if (!teamName || !teamName.trim()) {
          errors.teamName = 'Required';
        }
        // Validate team members - check if all members have required fields
        teamMembers.forEach((member, index) => {
          if (!member.surname || !member.surname.trim()) {
            errors[`teamMember_${index}_surname`] = 'Required';
          }
          // Only require jersey number if not uniforms category
          if (!isUniformsCategory && (!member.number || !member.number.trim())) {
            errors[`teamMember_${index}_number`] = 'Required';
          }
        });
        
        if (Object.keys(errors).length > 0) {
          setValidationErrors(errors);
          setIsAddingToCart(false);
          return;
        }
      }
      
      // Removed ball size validation - balls can be added without size selection
      
      if (isTrophy) {
        // Validate trophy details
        console.log('🏆 [ProductModal] Validating trophy details:', trophyDetails);
        if (!trophyDetails.size || !trophyDetails.size.trim()) {
          errors.trophySize = 'Please select trophy size';
        }
        if (!trophyDetails.occasion || !trophyDetails.occasion.trim()) {
          errors.trophyOccasion = 'Please enter occasion';
        }
        
        if (Object.keys(errors).length > 0) {
          setValidationErrors(errors);
          setIsAddingToCart(false);
          return;
        }
        
        console.log('✅ [ProductModal] Trophy details validated successfully:', trophyDetails);
      }
      
      // Clear validation errors if all passed
      setValidationErrors({});

      // Use the current price (already calculated with jersey type and size type)
      const basePriceForCart = baseUnitPrice;
      const fabricOptionValue = selectedFabricOption || null;
      const fabricSurchargeValue = fabricSurchargeAmount;
      const cutTypeValue = selectedCutType || null;
      const cutTypeSurchargeValue = cutTypeSurchargeAmount;
      const sizeValue = isTrophy ? trophyDetails.size : selectedSize;
      const variantKey = isJerseyCategory ? jerseyType : null;
      
      let effectiveTeamMembers = null;
      let effectiveSingleDetails = null;
      let quantityValue = quantity;
      let sizeSurchargeTotal = sizeSurchargeAmount;
      let sizeSurchargePerUnit = sizeSurchargeAmount;
      let fabricSurchargeTotal = fabricSurchargeValue;
      let cutTypeSurchargeTotal = cutTypeSurchargeValue;
      let finalPrice = currentPrice;

      if (isTeamOrder) {
        // For team orders, use teamPricingInfo which has per-member pricing
        if (isApparel && teamPricingInfo.members.length > 0) {
          // Map team members with their per-member pricing and customization
          effectiveTeamMembers = teamPricingInfo.members.map((pricingMember) => {
            const baseMember = teamMembers.find(m => m.id === pricingMember.id) || pricingMember;
            const memberData = {
              ...baseMember,
              jerseyType: baseMember.jerseyType || 'full',
              fabricOption: baseMember.fabricOption || '',
              cutType: baseMember.cutType || '',
              sizingType: baseMember.sizingType || 'adult',
              basePrice: pricingMember.basePrice || 0,
              fabricSurcharge: pricingMember.fabricSurcharge || 0,
              cutTypeSurcharge: pricingMember.cutTypeSurcharge || 0,
              sizeSurcharge: pricingMember.sizeSurcharge || 0,
              totalPrice: pricingMember.totalPrice || 0,
              sizeSurchargeSize: pricingMember.sizeSurchargeSize || null
            };
            // Ensure all size fields are preserved
            if (baseMember.jerseySize) memberData.jerseySize = baseMember.jerseySize;
            if (baseMember.shortsSize) memberData.shortsSize = baseMember.shortsSize;
            if (baseMember.size) memberData.size = baseMember.size;
            console.log('📦 [ProductModal] Team member data for cart:', {
              id: memberData.id,
              surname: memberData.surname,
              jerseyType: memberData.jerseyType,
              fabricOption: memberData.fabricOption,
              cutType: memberData.cutType,
              sizingType: memberData.sizingType,
              jerseySize: memberData.jerseySize,
              shortsSize: memberData.shortsSize,
              size: memberData.size
            });
            return memberData;
          });
          
          sizeSurchargeTotal = teamSizeSurchargeInfo.total;
          sizeSurchargePerUnit = teamSizeSurchargeInfo.perUnit;
          fabricSurchargeTotal = teamPricingInfo.members.reduce((sum, m) => sum + (m.fabricSurcharge || 0), 0);
          cutTypeSurchargeTotal = teamPricingInfo.members.reduce((sum, m) => sum + (m.cutTypeSurcharge || 0), 0);
          finalPrice = teamPricingInfo.total; // Total price for all members
        } else {
          effectiveTeamMembers = teamMembers;
          quantityValue = teamMembers.length;
        }
      } else {
        effectiveSingleDetails = isApparel
          ? sanitizeSingleOrderDetails(singleOrderDetails, variantKey)
          : singleOrderDetails;
        
        if (effectiveSingleDetails && typeof effectiveSingleDetails === 'object') {
        effectiveSingleDetails.sizeSurcharge = sizeSurchargeAmount;
        effectiveSingleDetails.sizeKey = singleOrderSizeKey;
        effectiveSingleDetails.fabricOption = fabricOptionValue;
        effectiveSingleDetails.fabricSurcharge = fabricSurchargeValue;
          effectiveSingleDetails.cutType = cutTypeValue;
          effectiveSingleDetails.cutTypeSurcharge = cutTypeSurchargeValue;
        }
      }
      
      const cartOptions = {
        size: sizeValue,
        quantity: quantityValue,
        isTeamOrder: isTeamOrder,
        teamMembers: effectiveTeamMembers,
        teamName: isTeamOrder ? teamName : null, // Add teamName for team orders
        singleOrderDetails: !isTeamOrder && isApparel ? effectiveSingleDetails : null,
        sizeType: sizeType,
        jerseyType: variantKey, // Add jersey type for jersey products (legacy, per-member now stored in teamMembers)
        price: finalPrice,
        isReplacement: isFromCart, // Mark as replacement when coming from cart
        category: product.category, // Include category
        ballDetails: isBall ? ballDetails : null,
        trophyDetails: isTrophy ? trophyDetails : null,
        basePrice: isTeamOrder && isApparel 
          ? teamPricingInfo.members.reduce((sum, m) => sum + (m.basePrice || 0), 0)
          : basePriceForCart,
        fabricOption: fabricOptionValue, // Legacy - per-member fabric stored in teamMembers
        fabricSurcharge: isTeamOrder && isApparel ? fabricSurchargeTotal : fabricSurchargeValue,
        cutType: cutTypeValue, // Legacy - per-member cut type stored in teamMembers
        cutTypeSurcharge: isTeamOrder && isApparel ? cutTypeSurchargeTotal : cutTypeSurchargeValue,
        sizeSurcharge: sizeSurchargePerUnit,
        sizeSurchargeTotal,
        surchargeDetails: {
          size: isTeamOrder
            ? {
                total: sizeSurchargeTotal,
                perUnit: sizeSurchargePerUnit,
                members:
                  effectiveTeamMembers?.map((member) => ({
                    size: member.sizeSurchargeSize || member.size || null,
                    amount: member.sizeSurcharge || 0,
                    sizingType: member.sizingType || null,
                    surname: member.surname || null
                  })) || []
              }
            : {
                size: singleOrderSizeKey,
                group: sizeGroupHint,
                amount: sizeSurchargeAmount
              },
          fabric: isTeamOrder && isApparel
            ? {
                total: fabricSurchargeTotal,
                perUnit: fabricSurchargeTotal / Math.max(1, effectiveTeamMembers?.length || 1),
                members:
                  effectiveTeamMembers?.map((member) => ({
                    option: member.fabricOption || null,
                    amount: member.fabricSurcharge || 0,
                    surname: member.surname || null
                  })) || []
              }
            : (fabricOptionValue
            ? {
                option: fabricOptionValue,
                perUnit: fabricSurchargeValue
              }
                : null),
          cutType: isTeamOrder && isApparel
            ? {
                total: cutTypeSurchargeTotal,
                perUnit: cutTypeSurchargeTotal / Math.max(1, effectiveTeamMembers?.length || 1),
                members:
                  effectiveTeamMembers?.map((member) => ({
                    option: member.cutType || null,
                    amount: member.cutTypeSurcharge || 0,
                    surname: member.surname || null
                  })) || []
              }
            : (cutTypeValue
                ? {
                    option: cutTypeValue,
                    perUnit: cutTypeSurchargeValue
                  }
                : null)
        }
      };

      console.log('🛒 [ProductModal] Cart options being sent:', cartOptions);
      if (isTrophy) {
        console.log('🏆 [ProductModal] Trophy details in cart options:', cartOptions.trophyDetails);
      }

      // Use onConfirm callback if provided (for wishlist), otherwise continue with regular flow
      if (onConfirm) {
        console.log('≡ƒ¢Æ Using onConfirm callback');
        onConfirm(product, cartOptions);
        return;
      }

      // Use callback if provided (for walk-in ordering), otherwise use context
      if (onAddToCart) {
        console.log('≡ƒ¢Æ Using onAddToCart callback');
        onAddToCart(product, cartOptions);
        onClose();
        return;
      }

      if (!user) {
        showError('Login Required', 'Please log in to add items to cart.');
        return;
      }

      console.log('≡ƒ¢Æ Adding to cart for user:', user.id);

      // If this is from cart, remove the existing item first
      if (isFromCart && existingCartItemId) {
        console.log('≡ƒ¢Æ Removing existing cart item:', existingCartItemId);
        await removeFromCart(existingCartItemId);
        // Add a small delay to ensure the removal is processed
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log('≡ƒ¢Æ Calling addToCart context function');
      await addToCart(product, cartOptions);
      
      console.log('Γ£à Item added to cart successfully');
      // The notification is already handled by CartContext
      // Close the modal after adding to cart
      onClose();
    } catch (error) {
      console.error('Γ¥î Error updating cart:', error);
      
      // Show specific error message based on error type
      if (error.message.includes('Invalid product data')) {
        showError('Invalid Product', 'Product information is missing. Please try again.');
      } else if (error.message.includes('User not authenticated')) {
        showError('Login Required', 'Please log in to add items to cart.');
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        showError('Network Error', 'Please check your internet connection and try again.');
      } else {
        showError('Cart Error', 'Error updating cart. Please try again.');
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    try {
      console.log('≡ƒ¢Æ Buy Now clicked for product:', product.name);
      
      // Clear previous errors
      const errors = {};
      
      // Validate order details before proceeding
      if (isApparel && !isTeamOrder) {
        // Validate single order details
        if (!singleOrderDetails.teamName || !singleOrderDetails.teamName.trim()) {
          errors.singleTeamName = 'Required';
        }
        if (!singleOrderDetails.surname || !singleOrderDetails.surname.trim()) {
          errors.singleSurname = 'Required';
        }
        // Only require jersey number if not uniforms category
        if (!isUniformsCategory && (!singleOrderDetails.number || !singleOrderDetails.number.trim())) {
          errors.singleNumber = 'Required';
        }
        
        if (Object.keys(errors).length > 0) {
          setValidationErrors(errors);
          return;
        }
      }
      
      if (isApparel && isTeamOrder) {
        // Validate team name
        if (!teamName || !teamName.trim()) {
          errors.teamName = 'Required';
        }
        // Validate team members - check if all members have required fields
        teamMembers.forEach((member, index) => {
          if (!member.surname || !member.surname.trim()) {
            errors[`teamMember_${index}_surname`] = 'Required';
          }
          // Only require jersey number if not uniforms category
          if (!isUniformsCategory && (!member.number || !member.number.trim())) {
            errors[`teamMember_${index}_number`] = 'Required';
          }
        });
        
        if (Object.keys(errors).length > 0) {
          console.log('❌ [Buy Now] Validation errors for team order:', errors);
          setValidationErrors(errors);
          showError('Validation Error', 'Please fill in all required fields for all team members before proceeding.');
          return;
        }
      }
      
      // Removed ball size validation for Buy Now - balls can be purchased without size selection
      
      if (isTrophy) {
        // Validate trophy details
        if (!trophyDetails.size || !trophyDetails.size.trim()) {
          errors.trophySize = 'Please select trophy size before you buy';
        }
        if (!trophyDetails.occasion || !trophyDetails.occasion.trim()) {
          errors.trophyOccasion = 'Please enter occasion before you buy';
        }
        
        if (Object.keys(errors).length > 0) {
          console.log('❌ [Buy Now] Validation errors for trophy:', errors);
          setValidationErrors(errors);
          showError('Validation Error', 'Please fill in all required trophy details before proceeding.');
          return;
        }
      }
      
      // Clear validation errors if all passed
      setValidationErrors({});
      console.log('✅ [Buy Now] All validations passed, proceeding to checkout');
      
      // Use the current price (already calculated with jersey type and size type)
      const basePriceForCart = baseUnitPrice;
      const fabricOptionValue = selectedFabricOption || null;
      const fabricSurchargeValue = fabricSurchargeAmount;
      const cutTypeValue = selectedCutType || null;
      const cutTypeSurchargeValue = cutTypeSurchargeAmount;
      const variantKey = isJerseyCategory ? jerseyType : null;
      
      let effectiveTeamMembers = null;
      let effectiveSingleDetails = null;
      let quantityValue = quantity;
      let sizeSurchargeTotal = sizeSurchargeAmount;
      let sizeSurchargePerUnit = sizeSurchargeAmount;
      let fabricSurchargeTotal = fabricSurchargeValue;
      let cutTypeSurchargeTotal = cutTypeSurchargeValue;
      let finalPrice = currentPrice;

      if (isTeamOrder) {
        // For team orders, use teamPricingInfo which has per-member pricing
        if (isApparel && teamPricingInfo.members.length > 0) {
          // Map team members with their per-member pricing and customization
          effectiveTeamMembers = teamPricingInfo.members.map((pricingMember) => {
            const baseMember = teamMembers.find(m => m.id === pricingMember.id) || pricingMember;
            const memberData = {
              ...baseMember,
              jerseyType: baseMember.jerseyType || 'full',
              fabricOption: baseMember.fabricOption || '',
              cutType: baseMember.cutType || '',
              sizingType: baseMember.sizingType || 'adult',
              basePrice: pricingMember.basePrice || 0,
              fabricSurcharge: pricingMember.fabricSurcharge || 0,
              cutTypeSurcharge: pricingMember.cutTypeSurcharge || 0,
              sizeSurcharge: pricingMember.sizeSurcharge || 0,
              totalPrice: pricingMember.totalPrice || 0,
              sizeSurchargeSize: pricingMember.sizeSurchargeSize || null
            };
            // Ensure all size fields are preserved
            if (baseMember.jerseySize) memberData.jerseySize = baseMember.jerseySize;
            if (baseMember.shortsSize) memberData.shortsSize = baseMember.shortsSize;
            if (baseMember.size) memberData.size = baseMember.size;
            return memberData;
          });
          
          sizeSurchargeTotal = teamSizeSurchargeInfo.total;
          sizeSurchargePerUnit = teamSizeSurchargeInfo.perUnit;
          fabricSurchargeTotal = teamPricingInfo.members.reduce((sum, m) => sum + (m.fabricSurcharge || 0), 0);
          cutTypeSurchargeTotal = teamPricingInfo.members.reduce((sum, m) => sum + (m.cutTypeSurcharge || 0), 0);
          finalPrice = teamPricingInfo.total; // Total price for all members
        } else {
          effectiveTeamMembers = teamMembers;
          quantityValue = teamMembers.length;
        }
      } else {
        effectiveSingleDetails = isApparel
          ? sanitizeSingleOrderDetails(singleOrderDetails, variantKey)
          : singleOrderDetails;
        
        if (effectiveSingleDetails && typeof effectiveSingleDetails === 'object') {
        effectiveSingleDetails.sizeSurcharge = sizeSurchargeAmount;
        effectiveSingleDetails.sizeKey = singleOrderSizeKey;
        effectiveSingleDetails.fabricOption = fabricOptionValue;
        effectiveSingleDetails.fabricSurcharge = fabricSurchargeValue;
          effectiveSingleDetails.cutType = cutTypeValue;
          effectiveSingleDetails.cutTypeSurcharge = cutTypeSurchargeValue;
        }
      }
      
      const buyNowOptions = {
        size: selectedSize,
        quantity: quantityValue,
        isTeamOrder: isTeamOrder,
        teamMembers: effectiveTeamMembers,
        teamName: isTeamOrder ? teamName : null,
        singleOrderDetails: !isTeamOrder && isApparel ? effectiveSingleDetails : null,
        sizeType: sizeType,
        jerseyType: variantKey, // Legacy - per-member jersey type stored in teamMembers
        price: finalPrice,
        category: product.category,
        ballDetails: isBall ? ballDetails : null,
        trophyDetails: isTrophy ? trophyDetails : null,
        basePrice: isTeamOrder && isApparel 
          ? teamPricingInfo.members.reduce((sum, m) => sum + (m.basePrice || 0), 0)
          : basePriceForCart,
        fabricOption: fabricOptionValue, // Legacy - per-member fabric stored in teamMembers
        fabricSurcharge: isTeamOrder && isApparel ? fabricSurchargeTotal : fabricSurchargeValue,
        cutType: cutTypeValue, // Legacy - per-member cut type stored in teamMembers
        cutTypeSurcharge: isTeamOrder && isApparel ? cutTypeSurchargeTotal : cutTypeSurchargeValue,
        sizeSurcharge: sizeSurchargePerUnit,
        sizeSurchargeTotal,
        surchargeDetails: {
          size: isTeamOrder
            ? {
                total: sizeSurchargeTotal,
                perUnit: sizeSurchargePerUnit,
                members:
                  effectiveTeamMembers?.map((member) => ({
                    size: member.sizeSurchargeSize || member.size || null,
                    amount: member.sizeSurcharge || 0,
                    sizingType: member.sizingType || null,
                    surname: member.surname || null
                  })) || []
              }
            : {
                size: singleOrderSizeKey,
                group: sizeGroupHint,
                amount: sizeSurchargeAmount
              },
          fabric: isTeamOrder && isApparel
            ? {
                total: fabricSurchargeTotal,
                perUnit: fabricSurchargeTotal / Math.max(1, effectiveTeamMembers?.length || 1),
                members:
                  effectiveTeamMembers?.map((member) => ({
                    option: member.fabricOption || null,
                    amount: member.fabricSurcharge || 0,
                    surname: member.surname || null
                  })) || []
              }
            : (fabricOptionValue
            ? {
                option: fabricOptionValue,
                perUnit: fabricSurchargeValue
              }
                : null),
          cutType: isTeamOrder && isApparel
            ? {
                total: cutTypeSurchargeTotal,
                perUnit: cutTypeSurchargeTotal / Math.max(1, effectiveTeamMembers?.length || 1),
                members:
                  effectiveTeamMembers?.map((member) => ({
                    option: member.cutType || null,
                    amount: member.cutTypeSurcharge || 0,
                    surname: member.surname || null
                  })) || []
              }
            : (cutTypeValue
                ? {
                    option: cutTypeValue,
                    perUnit: cutTypeSurchargeValue
                  }
                : null)
        }
      };

      // Use callback if provided (for walk-in ordering), otherwise use default flow
      if (onBuyNow) {
        onBuyNow(product, buyNowOptions);
        onClose();
        return;
      }
      
      // Create a standalone order item for Buy Now (not added to cart)
      const buyNowItem = {
        id: product.id,
        name: product.name,
        price: finalPrice,
        image: product.main_image,
        size: selectedSize,
        quantity: quantityValue,
        isTeamOrder: isTeamOrder,
        teamMembers: effectiveTeamMembers,
        teamName: isTeamOrder ? teamName : null,
        singleOrderDetails: !isTeamOrder && isApparel ? effectiveSingleDetails : null,
        sizeType: sizeType,
        jerseyType: variantKey, // Legacy - per-member jersey type stored in teamMembers
        isBuyNow: true, // Mark as Buy Now item
        uniqueId: `buynow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
        category: product.category,
        ballDetails: isBall ? ballDetails : null,
        trophyDetails: isTrophy ? trophyDetails : null,
        basePrice: isTeamOrder && isApparel 
          ? teamPricingInfo.members.reduce((sum, m) => sum + (m.basePrice || 0), 0)
          : basePriceForCart,
        fabricOption: fabricOptionValue, // Legacy - per-member fabric stored in teamMembers
        fabricSurcharge: isTeamOrder && isApparel ? fabricSurchargeTotal : fabricSurchargeValue,
        cutType: cutTypeValue, // Legacy - per-member cut type stored in teamMembers
        cutTypeSurcharge: isTeamOrder && isApparel ? cutTypeSurchargeTotal : cutTypeSurchargeValue,
        sizeSurcharge: sizeSurchargePerUnit,
        sizeSurchargeTotal,
        surchargeDetails: buyNowOptions.surchargeDetails
      };
      
      console.log('✅ [Buy Now] Buy Now item created:', buyNowItem);
      console.log('✅ [Buy Now] Opening checkout with Buy Now item only');
      
      // Store the Buy Now item in component state and open checkout
      setBuyNowItem(buyNowItem);
      setShowCheckout(true);
      console.log('✅ [Buy Now] Checkout modal should now be visible. showCheckout:', true);
      
    } catch (error) {
      console.error('Error creating Buy Now item:', error);
      alert('Error processing Buy Now. Please try again.');
    }
  };

  // Removed unused handleTeamOrderToggle function

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

      console.log('🛒 Creating order with data:', orderData);

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
      
      // Clear the entire cart after successful checkout
      await clearCart();
      
      // Trigger a custom event to refresh orders count in header
      window.dispatchEvent(new CustomEvent('orderPlaced'));
      
      setShowCheckout(false);
      setBuyNowItem(null); // Clear Buy Now item
      onClose();
      
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

  const addTeamMember = () => {
    // Get default sizes based on the last member's sizing type, or use global sizeType
    const lastMember = teamMembers[teamMembers.length - 1];
    const memberSizeType = lastMember?.sizingType || sizeType;
    const memberJerseyType = lastMember?.jerseyType || jerseyType;
    const memberFabricOption = lastMember?.fabricOption || (fabricOptions.length > 0 ? fabricOptions[0].name : '');
    // For hoodies, long sleeves, and T-shirts, no cut type
    const memberCutType = shouldHideCutType ? '' : (lastMember?.cutType || (cutTypeOptions.length > 0 ? cutTypeOptions[0].name : ''));
    
    // For hoodies, long sleeves, and T-shirts, treat as shirt-only (no jersey type, no shorts)
    const isHoodieOrLongSleevesOrTShirt = isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
    const effectiveJerseyType = isHoodieOrLongSleevesOrTShirt ? 'shirt' : memberJerseyType;
    
    const shirtSizeList = memberSizeType === 'kids' 
      ? (jerseySizes?.shirts.kids.length > 0 ? jerseySizes.shirts.kids : ['S6', 'S8', 'S10', 'S12', 'S14'])
      : (jerseySizes?.shirts.adults.length > 0 ? jerseySizes.shirts.adults : ['S', 'M', 'L', 'XL', 'XXL']);
    const shortSizeList = memberSizeType === 'kids'
      ? (jerseySizes?.shorts.kids.length > 0 ? jerseySizes.shorts.kids : ['S6', 'S8', 'S10', 'S12', 'S14'])
      : (jerseySizes?.shorts.adults.length > 0 ? jerseySizes.shorts.adults : ['S', 'M', 'L', 'XL', 'XXL']);
    
    const defaultShirtSize = shirtSizeList[Math.floor(shirtSizeList.length / 2)] || (memberSizeType === 'kids' ? 'S10' : 'M');
    const defaultShortSize = shortSizeList[Math.floor(shortSizeList.length / 2)] || (memberSizeType === 'kids' ? 'S10' : 'M');

    const newMember = {
      id: Date.now(),
      teamName: teamName,
      surname: '',
      number: '',
      jerseySize: effectiveJerseyType === 'shorts' ? null : defaultShirtSize,
      shortsSize: (effectiveJerseyType === 'shirt' || isHoodieOrLongSleevesOrTShirt) ? null : defaultShortSize,
      sizingType: memberSizeType,
      jerseyType: effectiveJerseyType,
      fabricOption: memberFabricOption,
      cutType: memberCutType,
      size: effectiveJerseyType === 'shorts' ? null : defaultShirtSize
    };
    setTeamMembers(prev => [...prev, newMember]);
    console.log('✅ New team member row added with per-member customization');
  };

  const updateTeamMember = (index, field, value) => {
    setTeamMembers(prev => prev.map((member, i) => {
      if (i !== index) {
        return member;
      }

      // For hoodies, long sleeves, and T-shirts, treat as shirt-only (no jersey type, no shorts)
      const isHoodieOrLongSleevesOrTShirt = isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
      
      // Don't allow jersey type changes for hoodies, long sleeves, and T-shirts
      if (field === 'jerseyType' && isHoodieOrLongSleevesOrTShirt) {
        return member;
      }

      const updated = { ...member, [field]: value };
      const memberJerseyType = field === 'jerseyType' ? value : (updated.jerseyType || 'full');
      const effectiveJerseyType = isHoodieOrLongSleevesOrTShirt ? 'shirt' : memberJerseyType;

      // Handle jersey type changes
      if (field === 'jerseyType') {
        if (value === 'shirt') {
          updated.shortsSize = null;
          updated.size = updated.jerseySize || null;
        } else if (value === 'shorts') {
          updated.jerseySize = null;
          updated.size = null;
        } else {
          // full set - ensure both sizes exist (but not for hoodies/long sleeves/T-shirts)
          if (!updated.jerseySize) {
            const shirtSizes = updated.sizingType === 'kids'
              ? (jerseySizes?.shirts.kids.length > 0 ? jerseySizes.shirts.kids : ['S6', 'S8', 'S10', 'S12', 'S14'])
              : (jerseySizes?.shirts.adults.length > 0 ? jerseySizes.shirts.adults : ['S', 'M', 'L', 'XL', 'XXL']);
            updated.jerseySize = shirtSizes[Math.floor(shirtSizes.length / 2)] || 'M';
          }
          if (!isHoodieOrLongSleevesOrTShirt && !updated.shortsSize) {
            const shortSizes = updated.sizingType === 'kids'
              ? (jerseySizes?.shorts.kids.length > 0 ? jerseySizes.shorts.kids : ['S6', 'S8', 'S10', 'S12', 'S14'])
              : (jerseySizes?.shorts.adults.length > 0 ? jerseySizes.shorts.adults : ['S', 'M', 'L', 'XL', 'XXL']);
            updated.shortsSize = shortSizes[Math.floor(shortSizes.length / 2)] || 'M';
          }
          updated.size = updated.jerseySize || null;
        }
      }

      // Clear shorts size and cut type for hoodies, long sleeves, and T-shirts
      if (isHoodieOrLongSleevesOrTShirt) {
        updated.shortsSize = null;
        updated.cutType = '';
      }

      // Handle sizing type changes - update sizes to match new sizing type
      if (field === 'sizingType') {
        const shirtSizes = value === 'kids'
          ? (jerseySizes?.shirts.kids.length > 0 ? jerseySizes.shirts.kids : ['S6', 'S8', 'S10', 'S12', 'S14'])
          : (jerseySizes?.shirts.adults.length > 0 ? jerseySizes.shirts.adults : ['S', 'M', 'L', 'XL', 'XXL']);
        const shortSizes = value === 'kids'
          ? (jerseySizes?.shorts.kids.length > 0 ? jerseySizes.shorts.kids : ['S6', 'S8', 'S10', 'S12', 'S14'])
          : (jerseySizes?.shorts.adults.length > 0 ? jerseySizes.shorts.adults : ['S', 'M', 'L', 'XL', 'XXL']);
        
        if (effectiveJerseyType !== 'shorts' && updated.jerseySize) {
          // Try to find matching size in new list, or use default
          const defaultShirtSize = shirtSizes[Math.floor(shirtSizes.length / 2)] || (value === 'kids' ? 'S10' : 'M');
          updated.jerseySize = shirtSizes.includes(updated.jerseySize) ? updated.jerseySize : defaultShirtSize;
          updated.size = updated.jerseySize;
        }
        if (!isHoodieOrLongSleevesOrTShirt && effectiveJerseyType !== 'shirt' && updated.shortsSize) {
          const defaultShortSize = shortSizes[Math.floor(shortSizes.length / 2)] || (value === 'kids' ? 'S10' : 'M');
          updated.shortsSize = shortSizes.includes(updated.shortsSize) ? updated.shortsSize : defaultShortSize;
        }
      }

      if (field === 'jerseySize' && effectiveJerseyType !== 'shorts') {
        updated.size = value;
      }

      if (field === 'shortsSize') {
        // Clear shorts size for hoodies, long sleeves, and T-shirts
        if (isHoodieOrLongSleevesOrTShirt) {
          updated.shortsSize = null;
        } else if (effectiveJerseyType === 'shorts') {
          updated.size = null;
        } else if (!updated.size) {
          updated.size = updated.jerseySize || null;
        }
      }

      return updated;
    }));
  };

  const removeTeamMember = (id) => {
    setTeamMembers(teamMembers.filter(member => member.id !== id));
    console.log('Γ£à Team member row removed');
  };

  const toggleDescription = () => {
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };

  const toggleReviews = () => {
    setIsReviewsExpanded(!isReviewsExpanded);
  };

  const toggleMemberExpanded = (memberId) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <span key={index}>
        {index < rating ? (
          <AiFillStar className="modal-star filled" />
        ) : (
          <AiOutlineStar className="modal-star" />
        )}
      </span>
    ));
  };

  const renderFabricOptions = () => {
    // Only show for apparel/trophy categories (not for balls)
    if (!isApparel && !isTrophy) return null;
    if (fabricOptions.length === 0) return null;
    // Hide fabric options for team orders - they're per-member now
    if (isTeamOrder) return null;

    const label = isTrophy ? 'Material Options' : 'Fabric Options';
    return (
      <div className="modal-fabric-section">
        <h4 className="modal-fabric-title">{label}</h4>
        <div className="modal-fabric-options">
          {fabricOptions.map(({ name, amount }) => {
            const isActive = selectedFabricOption === name;
            return (
              <button
                key={name}
                type="button"
                className={`modal-fabric-button ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setSelectedFabricOption(name);
                  if (user && !isFromCart && !existingCartItemData) {
                    updateProductModalPreferences(user.id, { fabricOption: name });
                  }
                }}
              >
                <span className="modal-fabric-name">{name}</span>
                <span className="modal-fabric-fee">
                  {amount > 0 ? `+₱${amount.toFixed(2)}` : 'Free'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCutTypeOptions = () => {
    // Only show for jersey/apparel categories
    if (!isJerseyCategory && !isApparel) return null;
    // Hide cut type options for uniforms, hoodies, long sleeves, T-shirts, and team orders
    if (shouldHideCutType) return null;
    if (isTeamOrder) return null;
    if (cutTypeOptions.length === 0) {
      console.log('🔍 [ProductModal] No cut type options available. cutTypeData:', cutTypeData, 'cutTypeOptions:', cutTypeOptions);
      return null;
    }

    console.log('✅ [ProductModal] Rendering cut type options:', cutTypeOptions);

    return (
      <div className="modal-fabric-section">
        <h4 className="modal-fabric-title">Cut Type Options</h4>
        <div className="modal-fabric-options">
          {cutTypeOptions.map(({ name, amount }) => {
            const isActive = selectedCutType === name;
            return (
              <button
                key={name}
                type="button"
                className={`modal-fabric-button ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCutType(name);
                  if (user && !isFromCart && !existingCartItemData) {
                    updateProductModalPreferences(user.id, { cutType: name });
                  }
                }}
              >
                <span className="modal-fabric-name">{name}</span>
                <span className="modal-fabric-fee">
                  {amount > 0 ? `+₱${amount.toFixed(2)}` : 'Free'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close-button" onClick={onClose}>
          <FaTimes />
        </button>

        {/* Main Modal Content - Single Container */}
        <div className="modal-main-content">
          {/* Left Panel - Product Image Only */}
          <div className="modal-left-panel">
            {/* Product Image */}
            <div className="modal-image-container">
              {product.main_image ? (
                <img 
                  src={product.main_image} 
                  alt={product.name}
                  className="modal-image"
                />
              ) : (
                <div className="modal-image-placeholder">
                  <span className="modal-image-emoji">≡ƒÅÇ</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Product Configuration */}
          <div className="modal-right-panel">
            {/* Content Section - Scrollable */}
            <div className="modal-content-section">
              {/* Header Section - Now scrolls with content */}
              <div className="modal-header-section">
                {/* Brand Header */}
                <div className="modal-brand-header"></div>

                {/* Product Name */}
                <div className="modal-product-title">{product.name}</div>

                {/* Price */}
                <div className="modal-product-price-wrapper">
                  {isTeamOrder && isApparel && teamMembers.length > 0 && (
                    <div className="modal-price-label">{displayPriceLabel}</div>
                  )}
                  <div className="modal-product-price" key={`price-${jerseyType}-${sizeType}-${trophyDetails?.size || ''}-${teamMembers.length}`}>
                    {sizeType === 'kids' && !isTeamOrder ? (
                      <>
                        <span className="discounted-price">₱ {displayPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        <span className="original-price">₱ {(displayPrice + 200).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </>
                  ) : (
                      `₱ ${displayPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  )}
                  </div>
                </div>
              </div>


            {/* Order Type Switch - Only for Apparel */}
            {isApparel && (
              <div className="modal-order-switch">
                <div className="modal-switch-container">
                  <button
                    className={`modal-switch-option ${!isTeamOrder ? 'active' : ''}`}
                    onClick={() => {
                      setIsTeamOrder(false);
                      // Clear team order errors when switching to single order
                      setValidationErrors({});
                    }}
                  >
                    <span className="modal-switch-text">Single Order</span>
                  </button>
                  <button
                    className={`modal-switch-option ${isTeamOrder ? 'active' : ''}`}
                    onClick={() => {
                      setIsTeamOrder(true);
                      // Clear single order errors when switching to team order
                      setValidationErrors({});
                    }}
                  >
                    <FaUsers className="modal-switch-icon" />
                    <span className="modal-switch-text">Team Order</span>
                  </button>
                </div>
              </div>
            )}

            {/* Jersey Type Selection - Only for Jersey Category, Hide for Team Orders, Uniforms, Hoodies, Long Sleeves, and T-shirts */}
            {isJerseyCategory && !isTeamOrder && !shouldHideJerseyType && (
              <div className="modal-jersey-type-section">
                <div className="modal-jersey-type-label">JERSEY TYPE</div>
                <div className="modal-jersey-type-buttons">
                  <button
                    type="button"
                    className={`modal-jersey-type-button ${jerseyType === 'full' ? 'active' : ''}`}
                    onClick={() => {
                      console.log('🔄 [ProductModal] Setting jerseyType to: full');
                      setJerseyType('full');
                      if (user && !isFromCart && !existingCartItemData) {
                        updateProductModalPreferences(user.id, { jerseyType: 'full' });
                      }
                    }}
                  >
                    Full Set
                  </button>
                  <button
                    type="button"
                    className={`modal-jersey-type-button ${jerseyType === 'shirt' ? 'active' : ''}`}
                    onClick={() => {
                      console.log('🔄 [ProductModal] Setting jerseyType to: shirt');
                      setJerseyType('shirt');
                      if (user && !isFromCart && !existingCartItemData) {
                        updateProductModalPreferences(user.id, { jerseyType: 'shirt' });
                      }
                    }}
                  >
                    Shirt Only
                  </button>
                  <button
                    type="button"
                    className={`modal-jersey-type-button ${jerseyType === 'shorts' ? 'active' : ''}`}
                    onClick={() => {
                      console.log('🔄 [ProductModal] Setting jerseyType to: shorts');
                      setJerseyType('shorts');
                      if (user && !isFromCart && !existingCartItemData) {
                        updateProductModalPreferences(user.id, { jerseyType: 'shorts' });
                      }
                    }}
                  >
                    Shorts Only
                  </button>
                </div>
              </div>
            )}

            {/* Team Members Section - Only for Apparel */}
            {isApparel && isTeamOrder && (
              <div className="modal-team-section">
                <div className="modal-team-header">
                  <div className="modal-team-label">Team Members</div>
                  <button 
                    type="button"
                    className="modal-add-member-button"
                    onClick={addTeamMember}
                    title="Add Team Member"
                  >
                    <FaPlus />
                  </button>
                </div>
                
                {/* Team Name Input */}
                <div className="modal-team-name-section">
                  <div className="modal-input-wrapper">
                    <input
                      type="text"
                      placeholder="Team Name / Organization"
                      value={teamName}
                      onChange={(e) => {
                        const newTeamName = e.target.value;
                        setTeamName(newTeamName);
                        // Update the first team member's teamName
                        if (teamMembers.length > 0) {
                          setTeamMembers(prev => prev.map((member, index) => 
                            index === 0 ? { ...member, teamName: newTeamName } : member
                          ));
                        }
                        if (validationErrors.teamName && newTeamName.trim()) {
                          setValidationErrors({...validationErrors, teamName: ''});
                        }
                      }}
                      className={`modal-team-name-input ${validationErrors.teamName ? 'error' : ''}`}
                    />
                    {validationErrors.teamName && (
                      <span className="modal-error-message">{validationErrors.teamName}</span>
                    )}
                  </div>
                </div>

                {/* Team Members Roster - Multiple Input Rows */}
                <div className="modal-members-roster">
                  {teamMembers.map((member, index) => {
                    const isExpanded = expandedMembers.has(member.id);
                    return (
                    <div key={member.id} className="modal-member-card">
                      <div className="modal-member-header">
                        <div className="modal-member-tag-wrapper">
                      <div className="modal-member-tag">
                        Member {index + 1}
                          </div>
                          {isTeamOrder && isApparel && teamPricingInfo.members.length > 0 && (() => {
                            const memberPricing = teamPricingInfo.members.find(m => m.id === member.id);
                            const memberTotalPrice = memberPricing?.totalPrice || 0;
                            return (
                              <div className="modal-member-price">
                                ₱ {memberTotalPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </div>
                            );
                          })()}
                        </div>
                        <button
                          type="button"
                          className={`modal-member-toggle-btn ${isExpanded ? 'modal-member-toggle-btn-expanded' : ''}`}
                          onClick={() => toggleMemberExpanded(member.id)}
                          title={isExpanded ? "Collapse details" : "Expand details"}
                        >
                          <span className="modal-member-toggle-label">Customize</span>
                          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                      </div>
                      <div className="modal-member-row-row-1">
                        <div className="modal-input-wrapper modal-member-wrapper">
                          <input
                            type="text"
                            placeholder="Surname"
                            value={member.surname}
                            onChange={(e) => {
                              updateTeamMember(index, 'surname', e.target.value);
                              if (validationErrors[`teamMember_${index}_surname`]) {
                                const newErrors = {...validationErrors};
                                delete newErrors[`teamMember_${index}_surname`];
                                setValidationErrors(newErrors);
                              }
                            }}
                            className={`modal-member-input ${validationErrors[`teamMember_${index}_surname`] ? 'error' : ''}`}
                          />
                          {validationErrors[`teamMember_${index}_surname`] && (
                            <span className="modal-error-message">{validationErrors[`teamMember_${index}_surname`]}</span>
                          )}
                        </div>
                        {!isUniformsCategory && (
                          <div className="modal-input-wrapper modal-member-wrapper">
                            <input
                              type="text"
                              placeholder="Jersey No."
                              value={member.number}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d]/g, '');
                                updateTeamMember(index, 'number', value);
                                if (validationErrors[`teamMember_${index}_number`]) {
                                  const newErrors = {...validationErrors};
                                  delete newErrors[`teamMember_${index}_number`];
                                  setValidationErrors(newErrors);
                                }
                              }}
                              className={`modal-member-input number-input ${validationErrors[`teamMember_${index}_number`] ? 'error' : ''}`}
                            />
                            {validationErrors[`teamMember_${index}_number`] && (
                              <span className="modal-error-message">{validationErrors[`teamMember_${index}_number`]}</span>
                            )}
                          </div>
                        )}
                        {teamMembers.length > 1 && (
                          <button 
                            type="button"
                            className="modal-remove-member-button"
                            onClick={() => removeTeamMember(member.id)}
                            title="Remove Team Member"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                      {/* Per-Member Customization Section */}
                      {isExpanded && (
                      <div className="modal-member-customization-section">
                        {/* Jersey Type Selector - Only for Jerseys (not uniforms, hoodies, long sleeves, or T-shirts) */}
                        {isJerseyCategory && !shouldHideJerseyType && (
                          <div className="modal-member-customization-group">
                            <label className="modal-member-customization-label">Jersey Type</label>
                            <div className="modal-member-jersey-type-buttons">
                              <button
                                type="button"
                                className={`modal-member-jersey-type-btn ${(member.jerseyType || 'full') === 'full' ? 'active' : ''}`}
                                onClick={() => updateTeamMember(index, 'jerseyType', 'full')}
                              >
                                Full Set
                              </button>
                              <button
                                type="button"
                                className={`modal-member-jersey-type-btn ${(member.jerseyType || 'full') === 'shirt' ? 'active' : ''}`}
                                onClick={() => updateTeamMember(index, 'jerseyType', 'shirt')}
                              >
                                Shirt Only
                              </button>
                              <button
                                type="button"
                                className={`modal-member-jersey-type-btn ${(member.jerseyType || 'full') === 'shorts' ? 'active' : ''}`}
                                onClick={() => updateTeamMember(index, 'jerseyType', 'shorts')}
                              >
                                Shorts Only
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Size Type Selector */}
                        <div className="modal-member-customization-group">
                          <label className="modal-member-customization-label">Size Type</label>
                          <div className="modal-member-size-type-buttons">
                            <button
                              type="button"
                              className={`modal-member-size-type-btn ${(member.sizingType || 'adult') === 'adult' ? 'active' : ''}`}
                              onClick={() => updateTeamMember(index, 'sizingType', 'adult')}
                            >
                              Adult
                            </button>
                            <button
                              type="button"
                              className={`modal-member-size-type-btn ${(member.sizingType || 'adult') === 'kids' ? 'active' : ''}`}
                              onClick={() => updateTeamMember(index, 'sizingType', 'kids')}
                            >
                              Kids
                            </button>
                          </div>
                        </div>

                        {/* Fabric Option Selector */}
                        {fabricOptions.length > 0 && (
                          <div className="modal-member-customization-group">
                            <label className="modal-member-customization-label">Fabric</label>
                            <select
                              value={member.fabricOption || ''}
                              onChange={(e) => updateTeamMember(index, 'fabricOption', e.target.value)}
                              className="modal-member-select"
                            >
                              {fabricOptions.map(option => (
                                <option key={option.name} value={option.name}>
                                  {option.name} {option.amount > 0 ? `(+₱${option.amount.toFixed(2)})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Cut Type Selector - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                        {cutTypeOptions.length > 0 && !shouldHideCutType && (
                          <div className="modal-member-customization-group">
                            <label className="modal-member-customization-label">Cut Type</label>
                            <select
                              value={member.cutType || ''}
                              onChange={(e) => updateTeamMember(index, 'cutType', e.target.value)}
                              className="modal-member-select"
                            >
                              {cutTypeOptions.map(option => (
                                <option key={option.name} value={option.name}>
                                  {option.name} {option.amount > 0 ? `(+₱${option.amount.toFixed(2)})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Size Selectors - Based on member's jersey type and sizing type */}
                        <div className="modal-member-size-selectors">
                          {(() => {
                            // For hoodies, long sleeves, and T-shirts, treat as shirt-only (no jersey type)
                            const isHoodieOrLongSleevesOrTShirt = isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
                            const memberJerseyType = member.jerseyType || 'full';
                            const effectiveMemberJerseyType = isHoodieOrLongSleevesOrTShirt ? 'shirt' : memberJerseyType;
                            const memberSizingType = member.sizingType || 'adult';
                            const memberShirtSizes = memberSizingType === 'kids'
                              ? (jerseySizes?.shirts.kids.length > 0 ? jerseySizes.shirts.kids : ['S6', 'S8', 'S10', 'S12', 'S14'])
                              : (jerseySizes?.shirts.adults.length > 0 ? jerseySizes.shirts.adults : ['S', 'M', 'L', 'XL', 'XXL']);
                            const memberShortSizes = memberSizingType === 'kids'
                              ? (jerseySizes?.shorts.kids.length > 0 ? jerseySizes.shorts.kids : ['S6', 'S8', 'S10', 'S12', 'S14'])
                              : (jerseySizes?.shorts.adults.length > 0 ? jerseySizes.shorts.adults : ['S', 'M', 'L', 'XL', 'XXL']);

                            return (
                              <>
                                {/* Shirt Size - Show for jerseys only (full set, shirt only, or hoodies/long sleeves/T-shirts treated as shirt-only) */}
                                {/* For non-jersey apparel, use "General Size" instead (shown below) */}
                                {isJerseyCategory && (effectiveMemberJerseyType === 'full' || effectiveMemberJerseyType === 'shirt' || isHoodieOrLongSleevesOrTShirt) && (
                          <div className="modal-member-size-wrapper">
                            <label className="modal-member-size-label">Shirt Size</label>
                            <select
                                      value={member.jerseySize || (memberShirtSizes.length > 0 ? memberShirtSizes[Math.floor(memberShirtSizes.length / 2)] : 'M')}
                              onChange={(e) => updateTeamMember(index, 'jerseySize', e.target.value)}
                              className="modal-member-select"
                            >
                                      {memberShirtSizes.map(size => {
                                        const memberGroup = memberSizingType === 'kids' ? 'kids' : (isJerseyCategory ? 'adults' : 'general');
                                        const surcharge = getSizeSurcharge(size, memberGroup);
                                        return (
                                          <option key={size} value={size}>
                                            {size}{surcharge > 0 ? ` (+₱${surcharge.toFixed(2)})` : ''}
                                          </option>
                                        );
                                      })}
                            </select>
                          </div>
                        )}
                                {/* Short Size - Show for jerseys only (full set or shorts only, not hoodies/long sleeves/T-shirts) */}
                                {isJerseyCategory && shouldShowShorts && !isHoodieOrLongSleevesOrTShirt && (effectiveMemberJerseyType === 'full' || effectiveMemberJerseyType === 'shorts') && (
                          <div className="modal-member-size-wrapper">
                            <label className="modal-member-size-label">Short Size</label>
                            <select
                                      value={member.shortsSize || (memberShortSizes.length > 0 ? memberShortSizes[Math.floor(memberShortSizes.length / 2)] : 'M')}
                              onChange={(e) => updateTeamMember(index, 'shortsSize', e.target.value)}
                              className="modal-member-select"
                            >
                                      {memberShortSizes.map(size => {
                                        const memberGroup = memberSizingType === 'kids' ? 'kids' : (isJerseyCategory ? 'adults' : 'general');
                                        const surcharge = getSizeSurcharge(size, memberGroup);
                                        return (
                                          <option key={size} value={size}>
                                            {size}{surcharge > 0 ? ` (+₱${surcharge.toFixed(2)})` : ''}
                                          </option>
                                        );
                                      })}
                            </select>
                          </div>
                        )}
                                {/* General Size - For non-jersey apparel (uniforms, hoodies, long sleeves, T-shirts, etc.) */}
                                {!isJerseyCategory && (
                          <div className="modal-member-size-wrapper">
                            <label className="modal-member-size-label">Size</label>
                            <select
                                      value={member.size || member.jerseySize || 'M'}
                              onChange={(e) => updateTeamMember(index, 'size', e.target.value)}
                              className="modal-member-select"
                            >
                                      {(() => {
                                        const sizes = memberSizingType === 'kids'
                                          ? (jerseySizes?.shirts.kids.length > 0 ? jerseySizes.shirts.kids : ['S6', 'S8', 'S10', 'S12', 'S14'])
                                          : (jerseySizes?.shirts.adults.length > 0 ? jerseySizes.shirts.adults : ['S', 'M', 'L', 'XL', 'XXL']);
                                        const memberGroup = memberSizingType === 'kids' ? 'kids' : (isJerseyCategory ? 'adults' : 'general');
                                        return sizes.map(size => {
                                          const surcharge = getSizeSurcharge(size, memberGroup);
                                          return (
                                            <option key={size} value={size}>
                                              {size}{surcharge > 0 ? ` (+₱${surcharge.toFixed(2)})` : ''}
                                            </option>
                                          );
                                        });
                                      })()}
                                    </select>
                      </div>
                                )}
                              </>
                            );
                          })()}
                    </div>
                      </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              </div>
            )}

            {/* Size Type Toggle - Only for Apparel */}
            {isApparel && !isTeamOrder && (
              <div className="modal-size-type-section">
                <div className="modal-size-type-label">SIZE TYPE <a href="#" onClick={(e) => { e.preventDefault(); setShowSizeChart(true); }} className="modal-size-chart-link">Size chart</a></div>
                <div className="modal-size-type-buttons">
                  <button
                    className={`modal-size-type-button ${sizeType === 'adult' ? 'active' : ''}`}
                    onClick={() => {
                      setSizeType('adult');
                      if (user && !isFromCart && !existingCartItemData) {
                        updateProductModalPreferences(user.id, { sizeType: 'adult' });
                      }
                      const newShirtSizes = jerseySizes?.shirts.adults.length > 0 ? jerseySizes.shirts.adults : ['S', 'M', 'L', 'XL', 'XXL'];
                      const newShortSizes = jerseySizes?.shorts.adults.length > 0 ? jerseySizes.shorts.adults : ['S', 'M', 'L', 'XL', 'XXL'];
                      setSingleOrderDetails(prev => {
                        const jerseyDefault = newShirtSizes[Math.floor(newShirtSizes.length / 2)] || 'M';
                        const shortsDefault = newShortSizes[Math.floor(newShortSizes.length / 2)] || 'M';
                        const sizeValue = jerseyType === 'shorts' ? null : jerseyDefault;
                        return {
                          ...prev,
                          jerseySize: jerseyDefault,
                          shortsSize: shortsDefault,
                          size: sizeValue
                        };
                      });
                    }}
                  >
                    Adult
                  </button>
                  <button
                    className={`modal-size-type-button ${sizeType === 'kids' ? 'active' : ''}`}
                    onClick={() => {
                      setSizeType('kids');
                      if (user && !isFromCart && !existingCartItemData) {
                        updateProductModalPreferences(user.id, { sizeType: 'kids' });
                      }
                      const newShirtSizes = jerseySizes?.shirts.kids.length > 0 ? jerseySizes.shirts.kids : ['S6', 'S8', 'S10', 'S12', 'S14'];
                      const newShortSizes = jerseySizes?.shorts.kids.length > 0 ? jerseySizes.shorts.kids : ['S6', 'S8', 'S10', 'S12', 'S14'];
                      setSingleOrderDetails(prev => {
                        const jerseyDefault = newShirtSizes[Math.floor(newShirtSizes.length / 2)] || 'M';
                        const shortsDefault = newShortSizes[Math.floor(newShortSizes.length / 2)] || 'M';
                        const sizeValue = jerseyType === 'shorts' ? null : jerseyDefault;
                        return {
                          ...prev,
                          jerseySize: jerseyDefault,
                          shortsSize: shortsDefault,
                          size: sizeValue
                        };
                      });
                    }}
                  >
                    Kids
                  </button>
                </div>
              </div>
            )}

            {/* Single Order Form - Only for Apparel */}
            {isApparel && !isTeamOrder && (
              <div className="modal-single-order-section">
                <div className="modal-single-order-label">Order Details</div>
                <div className="modal-single-order-form">
                  {/* Row 1: Team Name - Full Width */}
                  <div className="modal-input-wrapper modal-single-order-form-row-1">
                    <input
                      type="text"
                      placeholder="Team Name / Organization"
                      value={singleOrderDetails.teamName}
                      onChange={(e) => {
                        setSingleOrderDetails({...singleOrderDetails, teamName: e.target.value});
                        if (validationErrors.singleTeamName) {
                          setValidationErrors({...validationErrors, singleTeamName: ''});
                        }
                      }}
                      className={`modal-single-order-input ${validationErrors.singleTeamName ? 'error' : ''}`}
                    />
                    {validationErrors.singleTeamName && (
                      <span className="modal-error-message">{validationErrors.singleTeamName}</span>
                    )}
                  </div>
                  
                  {/* Row 2: Surname and Jersey No. - Side by Side */}
                  <div className="modal-input-wrapper">
                    <input
                      type="text"
                      placeholder="Surname"
                      value={singleOrderDetails.surname}
                      onChange={(e) => {
                        setSingleOrderDetails({...singleOrderDetails, surname: e.target.value});
                        if (validationErrors.singleSurname) {
                          setValidationErrors({...validationErrors, singleSurname: ''});
                        }
                      }}
                      className={`modal-single-order-input ${validationErrors.singleSurname ? 'error' : ''}`}
                    />
                    {validationErrors.singleSurname && (
                      <span className="modal-error-message">{validationErrors.singleSurname}</span>
                    )}
                  </div>
                  {!isUniformsCategory && (
                    <div className="modal-input-wrapper">
                      <input
                        type="text"
                        placeholder="Jersey No."
                        value={singleOrderDetails.number}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // Check if user tried to enter non-numeric characters
                          if (inputValue && /[^\d]/.test(inputValue)) {
                            setValidationErrors({...validationErrors, singleNumber: 'Numbers only'});
                          } else if (validationErrors.singleNumber === 'Numbers only') {
                            setValidationErrors({...validationErrors, singleNumber: ''});
                          }
                          // Only allow numbers
                          const value = inputValue.replace(/[^\d]/g, '');
                          setSingleOrderDetails({...singleOrderDetails, number: value});
                          // Clear required error when typing
                          if (validationErrors.singleNumber === 'Required' && value) {
                            setValidationErrors({...validationErrors, singleNumber: ''});
                          }
                        }}
                        className={`modal-single-order-input ${validationErrors.singleNumber ? 'error' : ''}`}
                      />
                      {validationErrors.singleNumber && (
                        <span className="modal-error-message">{validationErrors.singleNumber}</span>
                      )}
                    </div>
                  )}
                  
                  {/* Row 3: Shirt Size and Short Size - With Labels (Conditional based on jersey type) */}
                  {/* Always show shirt size for apparel, but only for jerseys when jerseyType is 'full' or 'shirt' */}
                  {/* For T-shirts, hoodies, long sleeves (shouldHideJerseyType), always show shirt size */}
                  {(!isJerseyCategory || jerseyType === 'full' || jerseyType === 'shirt' || shouldHideJerseyType) && (
                    <div className="modal-single-order-size-wrapper">
                      <label className="modal-single-order-size-label">Shirt Size</label>
                      <select
                        value={singleOrderDetails.jerseySize || (shirtSizes.length > 0 ? shirtSizes[Math.floor(shirtSizes.length / 2)] : 'M')}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSingleOrderDetails(prev => ({
                            ...prev,
                            jerseySize: value,
                            size: jerseyType === 'shorts' ? prev.size : value
                          }));
                        }}
                        className="modal-single-order-select"
                      >
                        {shirtSizes.map(size => {
                          const surcharge = getSizeSurcharge(size, sizeGroupHint);
                          return (
                            <option key={size} value={size}>
                              {size}{surcharge > 0 ? ` (+₱${surcharge.toFixed(2)})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                  {/* Only show shorts for jerseys when jerseyType is 'full' or 'shorts' */}
                  {shouldShowShorts && (
                    <div className="modal-single-order-size-wrapper">
                      <label className="modal-single-order-size-label">Short Size</label>
                      <select
                        value={singleOrderDetails.shortsSize || (shortSizes.length > 0 ? shortSizes[Math.floor(shortSizes.length / 2)] : 'M')}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSingleOrderDetails(prev => ({
                            ...prev,
                            shortsSize: value,
                            size: jerseyType === 'shorts' ? null : prev.size
                          }));
                        }}
                        className="modal-single-order-select"
                      >
                        {shortSizes.map(size => {
                          const surcharge = getSizeSurcharge(size, sizeGroupHint);
                          return (
                            <option key={size} value={size}>
                              {size}{surcharge > 0 ? ` (+₱${surcharge.toFixed(2)})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {renderFabricOptions()}

            {renderCutTypeOptions()}

            {/* Ball Details Form - Hidden (balls can be added without size selection) */}

            {/* Trophy Details Form */}
            {isTrophy && (
              <div className="modal-trophy-details-section">
                <div className="modal-trophy-details-label">Trophy Details</div>
                <div className="modal-trophy-details-form">
                  <div className="modal-input-wrapper">
                    <select
                      value={trophyDetails.size}
                      onChange={(e) => {
                        setTrophyDetails({...trophyDetails, size: e.target.value});
                        if (validationErrors.trophySize) {
                          setValidationErrors({...validationErrors, trophySize: ''});
                        }
                      }}
                      className={`modal-trophy-details-input ${validationErrors.trophySize ? 'error' : ''}`}
                    >
                      <option value="">Select Size</option>
                      {trophySizeOptions.map(option => {
                        const surcharge = getSizeSurcharge(option, 'general');
                        return (
                          <option key={option} value={option}>
                            {option}{surcharge > 0 ? ` (+₱${surcharge.toFixed(2)})` : ''}
                          </option>
                        );
                      })}
                    </select>
                    {validationErrors.trophySize && (
                      <span className="modal-error-message">{validationErrors.trophySize}</span>
                    )}
                  </div>
                  <textarea
                    placeholder="Engraving Text (Optional)"
                    value={trophyDetails.engravingText}
                    onChange={(e) => setTrophyDetails({...trophyDetails, engravingText: e.target.value})}
                    className="modal-trophy-details-textarea"
                    rows={3}
                  />
                  <div className="modal-input-wrapper">
                    <input
                      type="text"
                      placeholder="Occasion (e.g., Championship 2025)"
                      value={trophyDetails.occasion}
                      onChange={(e) => {
                        setTrophyDetails({...trophyDetails, occasion: e.target.value});
                        if (validationErrors.trophyOccasion) {
                          setValidationErrors({...validationErrors, trophyOccasion: ''});
                        }
                      }}
                      className={`modal-trophy-details-input ${validationErrors.trophyOccasion ? 'error' : ''}`}
                    />
                    {validationErrors.trophyOccasion && (
                      <span className="modal-error-message">{validationErrors.trophyOccasion}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quantity Section */}
            {!isTeamOrder && (
              <div className="modal-quantity-section">
                <div className="modal-quantity-label">QUANTITY</div>
                <div className="modal-quantity-controls">
                  <button 
                    className="modal-quantity-button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </button>
                  <span className="modal-quantity-display">{quantity}</span>
                  <button 
                    className="modal-quantity-button"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="modal-action-buttons">
              <button 
                  className="modal-add-cart-button"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                <FaShoppingCart />
                {isAddingToCart ? 'ADDING...' : 'ADD TO CART'}
              </button>
              <button 
                  className="modal-buy-now-button"
                onClick={handleBuyNow}
              >
                <FaCreditCard />
                BUY NOW
              </button>
            </div>

            {/* Product Description */}
            <div className="modal-description-section">
              <div className="modal-description-header" onClick={toggleDescription}>
                <span className="modal-description-title">PRODUCT DESCRIPTION</span>
                <FaChevronDown className="modal-description-chevron" />
              </div>
              {isDescriptionExpanded && (
                <div className="modal-description-content">
                  <p>{product.description || 'High-quality sportswear designed for comfort and performance.'}</p>
                </div>
              )}
            </div>

            {/* Reviews Section */}
            <div className="modal-reviews-section">
              <div className="modal-reviews-header" onClick={toggleReviews}>
                <div className="modal-reviews-title-row">
                  <span className="modal-reviews-title">CUSTOMER REVIEWS</span>
                  <div className="modal-average-rating">
                    <div className="modal-stars-display">
                      {renderStars(Math.round(averageRating))}
                    </div>
                    <span className="modal-rating-text">({averageRating.toFixed(1)})</span>
                  </div>
                </div>
                <FaChevronDown className="modal-reviews-chevron" />
              </div>
              {isReviewsExpanded && (
                <div className="modal-reviews-content">
                  {reviewsLoading ? (
                    <p>Loading reviews...</p>
                  ) : reviews.length === 0 ? (
                    <p>No reviews yet for this product. Be the first to leave one!</p>
                  ) : (
                    reviews.map(review => (
                      <div key={review.id} className="modal-review-item">
                        <div className="modal-review-header">
                          <span className="modal-review-user">{review.user}</span>
                          <div className="modal-review-rating">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                        <p className="modal-review-comment">{review.comment}</p>
                        <span className="modal-review-date">{review.date}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Order Processing Modal */}
      <OrderProcessingModal 
        isOpen={isProcessingOrder}
        onClose={() => setIsProcessingOrder(false)}
        onError={(error) => {
          setIsProcessingOrder(false);
          showError('Order Failed', error.message);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        cartItems={buyNowItem ? [buyNowItem] : cartItems.filter(item => selectedItems.has(item.uniqueId || item.id))}
        onPlaceOrder={handlePlaceOrder}
      />
      {/* Size Chart Modal */}
      <SizeChartModal
        isOpen={showSizeChart}
        onClose={() => setShowSizeChart(false)}
      />
    </div>
  );
};

export default ProductModal;