import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import './AddProductModal.css';

const isTrophyCategory = (category) => typeof category === 'string' && category.toLowerCase() === 'trophies';
const isBallCategory = (category) => typeof category === 'string' && category.toLowerCase() === 'balls';
const isMedalCategory = (category) => typeof category === 'string' && category.toLowerCase() === 'medals';
const isJerseyCategory = (category) => {
  if (!category || typeof category !== 'string') return false;
  const lowerCategory = category.toLowerCase();
  return lowerCategory === 'jerseys' || lowerCategory === 'uniforms' || 
         lowerCategory === 't-shirts' || lowerCategory === 'long sleeves' ||
         lowerCategory === 'hoodies';
};
const shouldShowShorts = (category) => {
  if (!category || typeof category !== 'string') return false;
  const lowerCategory = category.toLowerCase();
  // Only show shorts for actual Jerseys category (not uniforms, hoodies or long sleeves)
  return lowerCategory === 'jerseys';
};

const shouldShowJerseyPrices = (category) => {
  if (!category || typeof category !== 'string') return false;
  const lowerCategory = category.toLowerCase();
  // Only show jersey prices (full set, shirt only, shorts only) for actual Jerseys category
  // Uniforms, hoodies, and long sleeves don't have jersey type options
  return lowerCategory === 'jerseys';
};

const isUniformsCategory = (category) => {
  if (!category || typeof category !== 'string') return false;
  return category.toLowerCase() === 'uniforms';
};

const isHoodieCategory = (category) => {
  if (!category || typeof category !== 'string') return false;
  return category.toLowerCase() === 'hoodies';
};

const isLongSleevesCategory = (category) => {
  if (!category || typeof category !== 'string') return false;
  return category.toLowerCase() === 'long sleeves';
};

const isTShirtCategory = (category) => {
  if (!category || typeof category !== 'string') return false;
  const lowerCategory = category.toLowerCase();
  return lowerCategory === 't-shirts' || lowerCategory === 't-shirt';
};

const shouldShowCutType = (category) => {
  if (!category || typeof category !== 'string') return false;
  const lowerCategory = category.toLowerCase();
  // Hide cut type for uniforms, hoodies, long sleeves, and T-shirts
  return lowerCategory !== 'uniforms' && 
         lowerCategory !== 'hoodies' && 
         lowerCategory !== 'long sleeves' &&
         lowerCategory !== 't-shirts' &&
         lowerCategory !== 't-shirt';
};

const APPAREL_CATEGORIES = new Set([
  'jerseys',
  'uniforms',
  't-shirts',
  'long sleeves',
  'hoodies',
  'jackets',
  'accessories',
  'hats'
]);

const isApparelCategory = (category) => {
  if (!category || typeof category !== 'string') return false;
  return APPAREL_CATEGORIES.has(category.toLowerCase());
};

const DEFAULT_FABRIC_SURCHARGES = {
  'Polydex': '0', // Default
  'Microcool': '100',
  'Aircool': '100',
  'Drifit': '100',
  'Square Mesh': '100',
  'Lacoste': '100' // Added for uniforms
};

const DEFAULT_FABRIC_PRESETS = Object.keys(DEFAULT_FABRIC_SURCHARGES);

// Uniforms can only use these fabrics
const UNIFORM_FABRICS = ['Lacoste', 'Drifit', 'Polydex'];

const DEFAULT_CUT_TYPE_SURCHARGES = {
  'Normal Cut': '0',
  'NBA Cut': '100'
};

const DEFAULT_CUT_TYPE_PRESETS = Object.keys(DEFAULT_CUT_TYPE_SURCHARGES);

const createEmptySizeSurcharges = () => ({
  adults: {},
  kids: {},
  general: {}
});

const normalizeSizeSurcharges = (value) => {
  if (!value) {
    return createEmptySizeSurcharges();
  }

  let source = value;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch (error) {
      console.warn('Failed to parse size_surcharges JSON:', error?.message);
      return createEmptySizeSurcharges();
    }
  }

  if (!source || typeof source !== 'object') {
    return createEmptySizeSurcharges();
  }

  const hasGroupKeys = ['adults', 'kids', 'general'].some((key) =>
    Object.prototype.hasOwnProperty.call(source, key)
  );

  if (hasGroupKeys) {
    return {
      adults: { ...(source.adults || {}) },
      kids: { ...(source.kids || {}) },
      general: { ...(source.general || {}) }
    };
  }

  // Treat plain map as general
  return {
    adults: {},
    kids: {},
    general: { ...source }
  };
};

const normalizeFabricSurcharges = (value) => {
  if (!value) {
    return {};
  }

  let source = value;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch (error) {
      console.warn('Failed to parse fabric_surcharges JSON:', error?.message);
      return {};
    }
  }

  if (!source || typeof source !== 'object') {
    return {};
  }

  const normalized = {};
  Object.entries(source).forEach(([name, amount]) => {
    if (!name) return;
    normalized[name] =
      amount === null || amount === undefined || amount === ''
        ? ''
        : String(amount);
  });
  return normalized;
};

const buildSizeSurchargesPayload = (surcharges) => {
  if (!surcharges) return null;
  const result = {};

  const appendGroup = (groupKey, data) => {
    if (!data) return;
    const entries = Object.entries(data).reduce((acc, [size, fee]) => {
      if (fee === '' || fee === null || fee === undefined) {
        return acc;
      }
      const amount = parseFloat(fee);
      if (!Number.isNaN(amount)) {
        acc[size] = amount;
      }
      return acc;
    }, {});

    if (Object.keys(entries).length > 0) {
      result[groupKey] = entries;
    }
  };

  appendGroup('adults', surcharges.adults);
  appendGroup('kids', surcharges.kids);
  appendGroup('general', surcharges.general);

  const keys = Object.keys(result);
  if (keys.length === 0) return null;

  if (keys.length === 1 && keys[0] === 'general') {
    return result.general;
  }

  return result;
};

const buildFabricSurchargesPayload = (surcharges) => {
  if (!surcharges) return null;
  const payload = Object.entries(surcharges).reduce((acc, [name, fee]) => {
    const trimmedName = name?.trim();
    if (!trimmedName) return acc;
    if (fee === '' || fee === null || fee === undefined) return acc;
    const amount = parseFloat(fee);
    if (Number.isNaN(amount)) return acc;
    acc[trimmedName] = amount;
    return acc;
  }, {});

  return Object.keys(payload).length > 0 ? payload : null;
};

const normalizeCutTypeSurcharges = (value) => {
  if (!value) {
    return {};
  }

  let source = value;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch (error) {
      console.warn('Failed to parse cut_type_surcharges JSON:', error?.message);
      return {};
    }
  }

  if (!source || typeof source !== 'object') {
    return {};
  }

  const normalized = {};
  Object.entries(source).forEach(([name, amount]) => {
    if (!name) return;
    normalized[name] =
      amount === null || amount === undefined || amount === ''
        ? ''
        : String(amount);
  });
  return normalized;
};

const buildCutTypeSurchargesPayload = (surcharges) => {
  if (!surcharges) return null;
  const payload = Object.entries(surcharges).reduce((acc, [name, fee]) => {
    const trimmedName = name?.trim();
    if (!trimmedName) return acc;
    if (fee === '' || fee === null || fee === undefined) return acc;
    const amount = parseFloat(fee);
    if (Number.isNaN(amount)) return acc;
    acc[trimmedName] = amount;
    return acc;
  }, {});

  return Object.keys(payload).length > 0 ? payload : null;
};

const parseAvailableSizes = (sizeValue) => {
  if (!sizeValue) {
    return [];
  }

  if (Array.isArray(sizeValue)) {
    return sizeValue.filter(item => typeof item === 'string' && item.trim().length > 0).map(item => item.trim());
  }

  if (typeof sizeValue !== 'string') {
    return [];
  }

  const trimmed = sizeValue.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
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
    console.warn('Failed to parse available sizes in AddProductModal:', error.message);
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
    console.warn('Failed to parse jersey sizes in AddProductModal:', error.message);
  }

  return defaultSizes;
};

const DEFAULT_FORM_DATA = {
  name: '',
  category: '',
  size: '',
  price: '0',
  description: '',
  stock_quantity: null,
  sold_quantity: 0,
  branch_id: null
};

const DEFAULT_JERSEY_PRICES = {
  fullSet: '950',
  shirtOnly: '500',
  shortsOnly: '450',
  fullSetKids: '850',
  shirtOnlyKids: '450',
  shortsOnlyKids: '400'
};

const DEFAULT_SIZE_SURCHARGE_VALUES = {
  adults: {
    XXL: '50',
    '2XL': '50',
    '3XL': '50',
    '4XL': '50',
    '5XL': '50',
    '6XL': '50',
    '7XL': '50',
    '8XL': '50'
  },
  kids: {},
  general: {}
};

const AddProductModal = ({ onClose, onAdd, editingProduct, isEditMode }) => {
  const [formData, setFormData] = useState({ ...DEFAULT_FORM_DATA });
  const [jerseyPrices, setJerseyPrices] = useState({ ...DEFAULT_JERSEY_PRICES });
  // Trophy prices: object mapping size to price, e.g., { "14\" (Large)": 1000, "10\" (Medium)": 750 }
  const [trophyPrices, setTrophyPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mainImage, setMainImage] = useState(null);
  const [additionalImages, setAdditionalImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [uploadingAdditionalIndex, setUploadingAdditionalIndex] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [newSizeInput, setNewSizeInput] = useState('');
  const [sizeInputError, setSizeInputError] = useState('');
  
  // Jersey sizes structure: { shirts: { adults: [], kids: [] }, shorts: { adults: [], kids: [] } }
  const [jerseySizes, setJerseySizes] = useState({
    shirts: { adults: [], kids: [] },
    shorts: { adults: [], kids: [] }
  });
  const [newJerseySizeInput, setNewJerseySizeInput] = useState({
    shirts: { adults: '', kids: '' },
    shorts: { adults: '', kids: '' }
  });
  const [collapsedGroups, setCollapsedGroups] = useState({
    'adults': false,
    'kids': false
  });
  const [activeJerseyTab, setActiveJerseyTab] = useState('adults');
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  const predefinedCategories = [
    'Jerseys',
    'T-Shirts',
    'Long Sleeves',
    'Uniforms',
    'Accessories',
    'Balls',
    'Trophies',
    'Hats'
  ];

  const [categories, setCategories] = useState(predefinedCategories);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [sizeSurcharges, setSizeSurcharges] = useState(createEmptySizeSurcharges());
  const [fabricSurcharges, setFabricSurcharges] = useState({ ...DEFAULT_FABRIC_SURCHARGES });
  const [newFabricOption, setNewFabricOption] = useState({ name: '', fee: '' });
  const [fabricError, setFabricError] = useState('');
  const [cutTypeSurcharges, setCutTypeSurcharges] = useState({ ...DEFAULT_CUT_TYPE_SURCHARGES });
  const [newCutTypeOption, setNewCutTypeOption] = useState({ name: '', fee: '' });
  const [cutTypeError, setCutTypeError] = useState('');
  const [branchStocks, setBranchStocks] = useState({}); // { branchId: stockQuantity }
  const [branchProducts, setBranchProducts] = useState({}); // { branchId: { product info } } - current stocks per branch
  const [selectedBranches, setSelectedBranches] = useState([]); // Array of selected branch IDs
  const [branchStockQuantity, setBranchStockQuantity] = useState(''); // Single stock quantity for selected branches
  const [hoveredBranchId, setHoveredBranchId] = useState(null); // Track which branch is being hovered
  const [addingStockBranchId, setAddingStockBranchId] = useState(null); // Track which branch is having stock added
  const [addingStockQuantity, setAddingStockQuantity] = useState(''); // Temporary input for adding stock to a branch

  useEffect(() => {
    // Load custom categories from localStorage
    const loadCustomCategories = () => {
      try {
        // Load deleted predefined categories
        let deletedPredefined = [];
        try {
          const savedDeletedPredefined = localStorage.getItem('deletedPredefinedCategories');
          if (savedDeletedPredefined) {
            deletedPredefined = JSON.parse(savedDeletedPredefined);
          }
        } catch (e) {
          console.warn('Failed to load deleted predefined categories:', e);
        }

        // Filter out deleted predefined categories
        const activePredefined = predefinedCategories.filter(
          cat => !deletedPredefined.includes(cat)
        );

        // Load custom categories
        const savedCustomCategories = localStorage.getItem('customCategories');
        if (savedCustomCategories) {
          const customCats = JSON.parse(savedCustomCategories);
          setCategories([...activePredefined, ...customCats]);
        } else {
          setCategories(activePredefined);
        }
      } catch (e) {
        console.warn('Failed to load custom categories:', e);
        setCategories(predefinedCategories);
      }
    };

    loadCustomCategories();
  }, []);

  const handleAddCategory = () => {
    const trimmedCategory = newCategoryInput.trim();
    
    if (!trimmedCategory) {
      setCategoryError('Please enter a category name');
      return;
    }

    // Check if category already exists (case insensitive)
    const categoryExists = categories.some(cat => 
      cat.toLowerCase() === trimmedCategory.toLowerCase()
    );

    if (categoryExists) {
      setCategoryError('This category already exists');
      return;
    }

    // Add to state
    const updatedCategories = [...categories, trimmedCategory];
    setCategories(updatedCategories);

    // Save to localStorage
    try {
      const customCategories = updatedCategories.filter(
        cat => !predefinedCategories.includes(cat)
      );
      localStorage.setItem('customCategories', JSON.stringify(customCategories));
    } catch (e) {
      console.error('Failed to save custom categories:', e);
    }

    setNewCategoryInput('');
    setCategoryError('');
  };

  const handleRemoveCategory = (categoryToRemove) => {
    // Remove from state
    const updatedCategories = categories.filter(cat => cat !== categoryToRemove);
    setCategories(updatedCategories);

    // Update localStorage - store only custom categories (non-predefined ones)
    try {
      const customCategories = updatedCategories.filter(
        cat => !predefinedCategories.includes(cat)
      );
      localStorage.setItem('customCategories', JSON.stringify(customCategories));
      
      // Also store deleted predefined categories separately to track what was hidden
      const deletedPredefined = predefinedCategories.filter(
        cat => !updatedCategories.includes(cat)
      );
      if (deletedPredefined.length > 0) {
        localStorage.setItem('deletedPredefinedCategories', JSON.stringify(deletedPredefined));
      }
    } catch (e) {
      console.error('Failed to update custom categories:', e);
    }

    setCategoryError('');

    // Clear the selected category if it was removed
    if (formData.category === categoryToRemove) {
      setFormData(prev => ({ ...prev, category: '' }));
    }
  };

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/branches');
        if (response.ok) {
          const branchesData = await response.json();
          setBranches(branchesData);
          const mainBranch = branchesData.find(branch => branch.is_main_manufacturing);
          if (mainBranch && !isEditMode) {
            // Only set default branch for non-simple categories (apparel, etc.)
            const isSimpleCategory = ballCategorySelected || medalCategorySelected;
            if (!isSimpleCategory) {
              setFormData(prev => ({ ...prev, branch_id: mainBranch.id }));
            }
          }
        } else {
          console.error('Failed to fetch branches');
        }
      } catch (fetchError) {
        console.error('Error fetching branches:', fetchError);
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [isEditMode]);

  // Fetch current stocks per branch when in edit mode
  useEffect(() => {
    if (isEditMode && editingProduct && formData.name && formData.category) {
      const fetchBranchStocks = async () => {
        try {
          const branchProductsMap = {};
          // Fetch products with same name and category from all branches
          const allProductsResponse = await fetch('http://localhost:4000/api/products');
          if (allProductsResponse.ok) {
            const allProducts = await allProductsResponse.json();
            const matchingProducts = allProducts.filter(p => 
              p.name === formData.name && 
              p.category === formData.category &&
              p.stock_quantity !== null &&
              p.stock_quantity !== undefined
            );
            
            matchingProducts.forEach(product => {
              if (product.branch_id) {
                branchProductsMap[product.branch_id] = {
                  stock_quantity: product.stock_quantity || 0,
                  id: product.id
                };
              }
            });
            
            setBranchProducts(branchProductsMap);
            // Initialize selected branches with branches that have stocks
            const branchesWithStocks = Object.keys(branchProductsMap);
            setSelectedBranches(branchesWithStocks.map(id => parseInt(id)));
            // Initialize branchStocks with current stocks
            const initialStocks = {};
            Object.keys(branchProductsMap).forEach(branchId => {
              initialStocks[branchId] = branchProductsMap[branchId].stock_quantity;
            });
            setBranchStocks(initialStocks);
            // Set the stock quantity if all selected branches have the same stock
            if (branchesWithStocks.length > 0) {
              const stockValues = branchesWithStocks.map(id => branchProductsMap[id].stock_quantity);
              const allSameStock = stockValues.every(val => val === stockValues[0]);
              if (allSameStock) {
                setBranchStockQuantity(stockValues[0]?.toString() || '');
              }
            }
          }
        } catch (error) {
          console.error('Error fetching branch stocks:', error);
        }
      };
      
      fetchBranchStocks();
    } else if (!isEditMode) {
      // For new products, initialize empty branch stocks
      setBranchProducts({});
      setBranchStocks({});
      setSelectedBranches([]);
      setBranchStockQuantity('');
    }
  }, [isEditMode, editingProduct, formData.name, formData.category]);

  useEffect(() => {
    if (isEditMode && editingProduct) {
      // Parse price - for jerseys, check jersey_prices column first, then fallback to price
      let priceValue = editingProduct.price || '';
      let jerseyPricesValue = { fullSet: '', shirtOnly: '', shortsOnly: '' };
      
      // Only load jersey prices for actual jerseys category (not uniforms, hoodies, long sleeves)
      if (shouldShowJerseyPrices(editingProduct.category)) {
        // Check if jersey_prices column exists and has data
        if (editingProduct.jersey_prices) {
          // Use jersey_prices if available
          const prices = typeof editingProduct.jersey_prices === 'string' 
            ? JSON.parse(editingProduct.jersey_prices) 
            : editingProduct.jersey_prices;
          jerseyPricesValue = {
            fullSet: prices.fullSet || prices.full_set || '',
            shirtOnly: prices.shirtOnly || prices.shirt_only || '',
            shortsOnly: prices.shortsOnly || prices.shorts_only || '',
            fullSetKids: prices.fullSetKids || prices.full_set_kids || '',
            shirtOnlyKids: prices.shirtOnlyKids || prices.shirt_only_kids || '',
            shortsOnlyKids: prices.shortsOnlyKids || prices.shorts_only_kids || ''
          };
          priceValue = prices.fullSet || prices.full_set || editingProduct.price || '';
        } else {
          // Fallback: use price column as full set price
          priceValue = editingProduct.price || '';
          jerseyPricesValue.fullSet = editingProduct.price || '';
        }
      }
      
      setFormData({
        name: editingProduct.name || '',
        category: editingProduct.category || '',
        size: editingProduct.size || '',
        price: priceValue,
        description: editingProduct.description || '',
        stock_quantity: editingProduct.stock_quantity || null,
        sold_quantity: editingProduct.sold_quantity || 0,
        branch_id: editingProduct.branch_id ?? null
      });

      // Parse trophy prices if it's a trophy product
      let trophyPricesValue = {};
      if (isTrophyCategory(editingProduct.category)) {
        const parsedSizes = parseAvailableSizes(editingProduct.size);
        setAvailableSizes(parsedSizes);
        
        // Load trophy_prices if available
        if (editingProduct.trophy_prices) {
          try {
            const prices = typeof editingProduct.trophy_prices === 'string' 
              ? JSON.parse(editingProduct.trophy_prices) 
              : editingProduct.trophy_prices;
            trophyPricesValue = prices || {};
          } catch (e) {
            console.warn('Failed to parse trophy_prices:', e);
            trophyPricesValue = {};
          }
        }
      } else if (isJerseyCategory(editingProduct.category)) {
        const parsedJerseySizes = parseJerseySizes(editingProduct.size);
        setJerseySizes(parsedJerseySizes);
        setAvailableSizes([]); // Clear trophy sizes
      } else {
        setAvailableSizes([]);
        setJerseySizes({
          shirts: { adults: [], kids: [] },
          shorts: { adults: [], kids: [] }
        });
      }

      setJerseyPrices(jerseyPricesValue);
      setTrophyPrices(trophyPricesValue);
      setSizeInputError('');
      setNewSizeInput('');
      setNewJerseySizeInput({
        shirts: { adults: '', kids: '' },
        shorts: { adults: '', kids: '' }
      });

      if (editingProduct.main_image) {
        setMainImage(editingProduct.main_image);
      }
      if (editingProduct.additional_images && editingProduct.additional_images.length > 0) {
        setAdditionalImages(editingProduct.additional_images);
      }

      const normalizedSizeSurcharges = normalizeSizeSurcharges(
        editingProduct.size_surcharges
      );
      // Clear surcharges for trophy category (trophy sizes use 'general' group)
      if (isTrophyCategory(editingProduct.category)) {
        normalizedSizeSurcharges.general = {};
      }
      setSizeSurcharges(normalizedSizeSurcharges);

      let normalizedFabricSurcharges = normalizeFabricSurcharges(
        editingProduct.fabric_surcharges
      );

      // Clear fabric surcharges for trophy category
      if (isTrophyCategory(editingProduct.category)) {
        normalizedFabricSurcharges = {};
      } else if (
        Object.keys(normalizedFabricSurcharges).length === 0 &&
        (isJerseyCategory(editingProduct.category) ||
          isApparelCategory(editingProduct.category))
      ) {
        normalizedFabricSurcharges = { ...DEFAULT_FABRIC_SURCHARGES };
      }

      // For uniforms, filter to only allowed fabrics (Lacoste, Drifit, Polydex)
      // For T-shirts and other categories, keep all fabric options including Lacoste
      if (isUniformsCategory(editingProduct.category)) {
        const filtered = {};
        UNIFORM_FABRICS.forEach(fabric => {
          // Check if fabric exists in normalized surcharges (case-insensitive)
          const fabricKey = Object.keys(normalizedFabricSurcharges).find(
            key => key.toLowerCase() === fabric.toLowerCase()
          );
          if (fabricKey) {
            filtered[fabricKey] = normalizedFabricSurcharges[fabricKey];
          } else {
            // If not in existing surcharges, add default value
            filtered[fabric] = fabric === 'Polydex' ? '0' : '100';
          }
        });
        normalizedFabricSurcharges = filtered;
      }
      // For T-shirts: all fabric options (including Lacoste) are preserved, no filtering

      setFabricSurcharges(normalizedFabricSurcharges);
      setFabricError('');

      let normalizedCutTypeSurcharges = normalizeCutTypeSurcharges(
        editingProduct.cut_type_surcharges
      );

      // Clear cut type surcharges for uniforms, hoodies, long sleeves, and T-shirts (they don't have cut type)
      if (
        isUniformsCategory(editingProduct.category) ||
        isHoodieCategory(editingProduct.category) ||
        isLongSleevesCategory(editingProduct.category) ||
        isTShirtCategory(editingProduct.category)
      ) {
        normalizedCutTypeSurcharges = {};
      } else if (
        Object.keys(normalizedCutTypeSurcharges).length === 0 &&
        (isJerseyCategory(editingProduct.category) ||
          isApparelCategory(editingProduct.category))
      ) {
        normalizedCutTypeSurcharges = { ...DEFAULT_CUT_TYPE_SURCHARGES };
      }

      setCutTypeSurcharges(normalizedCutTypeSurcharges);
      setCutTypeError('');
    }
    if (!isEditMode) {
      setSizeSurcharges(createEmptySizeSurcharges());
      setFabricSurcharges({ ...DEFAULT_FABRIC_SURCHARGES });
      setFabricError('');
      setCutTypeSurcharges({ ...DEFAULT_CUT_TYPE_SURCHARGES });
      setCutTypeError('');
    }
  }, [isEditMode, editingProduct]);

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL'];
  const kidsSizes = ['S6', 'S8', 'S10', 'S12', 'S14'];
  const trophyCategorySelected = isTrophyCategory(formData.category);
  const ballCategorySelected = isBallCategory(formData.category);
  const medalCategorySelected = isMedalCategory(formData.category);
  const simpleCategorySelected = ballCategorySelected || medalCategorySelected || trophyCategorySelected; // Categories that need branch stock selection
  const jerseyCategorySelected = isJerseyCategory(formData.category);
  const showMultipleSizes = trophyCategorySelected || jerseyCategorySelected;
  const apparelCategorySelected = isApparelCategory(formData.category);

  const renderSizeSurchargeGroup = (
    label,
    groupKey,
    sizeList,
    emptyMessage,
    description
  ) => {
    const normalizedList = Array.from(
      new Set(
        (sizeList || [])
          .filter((value) => typeof value === 'string' && value.trim().length > 0)
          .map((value) => value.trim())
      )
    );

    // Count how many sizes have surcharges
    const surchargeCount = normalizedList.filter(
      (size) => sizeSurcharges[groupKey]?.[size] && sizeSurcharges[groupKey][size] !== ''
    ).length;

    return (
      <div className="apm-size-surcharge-group" key={`${groupKey}-group`}>
        <div className="apm-size-surcharge-header">
          <div className="apm-size-surcharge-title-section">
            <h5 className="apm-size-surcharge-title">{label}</h5>
            {normalizedList.length > 0 && (
              <span className="apm-size-surcharge-count">
                {surchargeCount > 0 ? `${surchargeCount} of ${normalizedList.length} set` : 'None set'}
              </span>
            )}
          </div>
          {normalizedList.length === 0 && emptyMessage && (
            <span className="apm-muted">{emptyMessage}</span>
          )}
        </div>
        {description && (
          <div className="apm-size-surcharge-description">
            {description}
          </div>
        )}
        {normalizedList.length > 0 && (
          <div className="apm-size-surcharge-container">
            <div className="apm-size-surcharge-grid">
              {normalizedList.map((size) => {
                const hasValue = sizeSurcharges[groupKey]?.[size] && sizeSurcharges[groupKey][size] !== '';
                const value = sizeSurcharges[groupKey]?.[size] ?? '';
                
                return (
                  <div 
                    className={`apm-size-surcharge-item ${hasValue ? 'has-surcharge' : ''}`} 
                    key={`${groupKey}-${size}`}
                  >
                    <div className="apm-size-surcharge-label">
                      <span className="apm-size-chip">{size}</span>
                      {hasValue && (
                        <span className="apm-size-surcharge-badge">Set</span>
                      )}
                    </div>
                    <div className={`apm-size-surcharge-input-wrapper ${hasValue ? 'has-value' : ''}`}>
                      <span className="apm-currency-prefix">₱</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={value}
                        onChange={(e) =>
                          handleSizeSurchargeChange(groupKey, size, e.target.value)
                        }
                        placeholder="0.00"
                        className="apm-size-surcharge-input-field"
                      />
                      {hasValue && (
                        <button
                          type="button"
                          className="apm-size-surcharge-clear"
                          onClick={() => handleSizeSurchargeChange(groupKey, size, '')}
                          aria-label={`Clear surcharge for ${size}`}
                          title="Clear surcharge"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFabricSurchargeSection = () => {
    const supportsFabric =
      jerseyCategorySelected || apparelCategorySelected;
    if (!supportsFabric) return null;

    // For uniforms, only show Lacoste, Drifit, and Polydex
    // For T-shirts and all other categories, show all fabric options including Lacoste
    const isUniforms = isUniformsCategory(formData.category);
    let availableFabrics = fabricSurcharges;
    
    if (isUniforms) {
      // Filter to only show uniform-allowed fabrics
      availableFabrics = Object.fromEntries(
        Object.entries(fabricSurcharges).filter(([name]) =>
          UNIFORM_FABRICS.some(allowed => name.toLowerCase() === allowed.toLowerCase())
        )
      );
    }
    // For T-shirts and other categories (not uniforms), all fabrics are available including Lacoste

    const fabricEntries = Object.entries(availableFabrics);

    // Quick add options - for uniforms, only show allowed fabrics
    // For T-shirts and all other categories, show all fabric options including Lacoste
    let quickAddOptions = [];
    if (jerseyCategorySelected || apparelCategorySelected) {
      if (isUniforms) {
        quickAddOptions = DEFAULT_FABRIC_PRESETS.filter(preset =>
          UNIFORM_FABRICS.some(allowed => preset.toLowerCase() === allowed.toLowerCase())
        );
      } else {
        // T-shirts and other categories: show all fabric options (Polydex, Microcool, Aircool, Drifit, Square Mesh, Lacoste)
        quickAddOptions = DEFAULT_FABRIC_PRESETS;
      }
    }

    return (
      <div className="apm-section-block">
        <div className="apm-form-group">
          <label>Fabric / Material Options</label>
          <small className="apm-form-help">
            Define optional fabric or material choices and their surcharges. A value of 0 keeps the option available without an extra charge.
          </small>

          {quickAddOptions.length > 0 && (
            <div className="apm-fabric-quick-add">
              {quickAddOptions.map((option) => {
                const exists = Object.keys(fabricSurcharges).some(
                  (name) => name.toLowerCase() === option.toLowerCase()
                );
                return (
                  <button
                    type="button"
                    key={option}
                    className={`apm-quick-pill ${
                      exists ? 'apm-quick-pill--disabled' : ''
                    }`}
                    onClick={() => handleQuickAddFabricOption(option)}
                    disabled={exists}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {fabricError && (
            <div className="apm-form-inline-error">{fabricError}</div>
          )}

          {isUniforms && (
            <div style={{
              padding: '0.75rem',
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: '#92400e'
            }}>
              <strong>Note:</strong> Uniforms can only use Lacoste, Drifit, or Polydex fabrics.
            </div>
          )}

          <div className="apm-fabric-list">
            {fabricEntries.length === 0 ? (
              <span className="apm-muted">
                No fabric or material options yet. Use the form below to add one.
                {isUniforms && ' For uniforms, only add Lacoste, Drifit, or Polydex.'}
              </span>
            ) : (
              fabricEntries.map(([name, fee]) => (
                <div className="apm-fabric-row" key={name}>
                  <span className="apm-fabric-name">{name}</span>
                  <div className="apm-size-surcharge-input">
                    <span className="apm-currency-prefix">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      value={fee ?? ''}
                      onChange={(e) => handleFabricSurchargeChange(name, e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    type="button"
                    className="apm-fabric-remove"
                    onClick={() => handleRemoveFabricOption(name)}
                    aria-label={`Remove ${name}`}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="apm-fabric-add">
            <input
              type="text"
              placeholder={isUniforms ? "Only: Lacoste, Drifit, or Polydex" : "New option name"}
              value={newFabricOption.name}
              onChange={(e) =>
                setNewFabricOption((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <div className="apm-size-surcharge-input">
              <span className="apm-currency-prefix">₱</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newFabricOption.fee}
                onChange={(e) =>
                  setNewFabricOption((prev) => ({ ...prev, fee: e.target.value }))
                }
              />
            </div>
            <button
              type="button"
              className="apm-size-add-btn"
              onClick={() => {
                // Validate for uniforms
                if (isUniforms) {
                  const optionName = newFabricOption.name.trim();
                  if (optionName && !UNIFORM_FABRICS.some(allowed => 
                    optionName.toLowerCase() === allowed.toLowerCase()
                  )) {
                    setFabricError('Uniforms can only use Lacoste, Drifit, or Polydex fabrics.');
                    return;
                  }
                }
                handleAddFabricOption();
              }}
            >
              Add Option
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCutTypeSurchargeSection = () => {
    const supportsCutType =
      jerseyCategorySelected || apparelCategorySelected;
    if (!supportsCutType) return null;

    // Hide cut type for uniforms, hoodies, and long sleeves
    if (!shouldShowCutType(formData.category)) {
      return null;
    }

    const cutTypeEntries = Object.entries(cutTypeSurcharges);

    const quickAddOptions =
      jerseyCategorySelected || apparelCategorySelected
        ? DEFAULT_CUT_TYPE_PRESETS
        : [];

    return (
      <div className="apm-section-block">
        <div className="apm-form-group">
          <label>Cut Type Options</label>
          <small className="apm-form-help">
            Define optional cut type choices and their surcharges. A value of 0 keeps the option available without an extra charge.
          </small>

          {quickAddOptions.length > 0 && (
            <div className="apm-fabric-quick-add">
              {quickAddOptions.map((option) => {
                const exists = Object.keys(cutTypeSurcharges).some(
                  (name) => name.toLowerCase() === option.toLowerCase()
                );
                return (
                  <button
                    type="button"
                    key={option}
                    className={`apm-quick-pill ${
                      exists ? 'apm-quick-pill--disabled' : ''
                    }`}
                    onClick={() => handleQuickAddCutTypeOption(option)}
                    disabled={exists}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {cutTypeError && (
            <div className="apm-form-inline-error">{cutTypeError}</div>
          )}

          <div className="apm-fabric-list">
            {cutTypeEntries.length === 0 ? (
              <span className="apm-muted">
                No cut type options yet. Use the form below to add one.
              </span>
            ) : (
              cutTypeEntries.map(([name, fee]) => (
                <div className="apm-fabric-row" key={name}>
                  <span className="apm-fabric-name">{name}</span>
                  <div className="apm-size-surcharge-input">
                    <span className="apm-currency-prefix">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      value={fee ?? ''}
                      onChange={(e) => handleCutTypeSurchargeChange(name, e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    type="button"
                    className="apm-fabric-remove"
                    onClick={() => handleRemoveCutTypeOption(name)}
                    aria-label={`Remove ${name}`}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="apm-fabric-add">
            <input
              type="text"
              placeholder="New option name"
              value={newCutTypeOption.name}
              onChange={(e) =>
                setNewCutTypeOption((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <div className="apm-size-surcharge-input">
              <span className="apm-currency-prefix">₱</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newCutTypeOption.fee}
                onChange={(e) =>
                  setNewCutTypeOption((prev) => ({ ...prev, fee: e.target.value }))
                }
              />
            </div>
            <button
              type="button"
              className="apm-size-add-btn"
              onClick={handleAddCutTypeOption}
            >
              Add Option
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderJerseyPriceSection = () => {
    // Only show jersey prices for actual jerseys category (not uniforms, hoodies, long sleeves)
    if (!shouldShowJerseyPrices(formData.category)) return null;

    const kidsShirtSizes = jerseySizes.shirts?.kids ?? [];
    const kidsShortSizes = jerseySizes.shorts?.kids ?? [];
    const hasKidsSizes = kidsShirtSizes.length > 0 || kidsShortSizes.length > 0;

    return (
      <div className="apm-section-block">
        <div className="apm-form-group">
          <label>Jersey Prices</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                Adults Prices
              </h4>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  Full Set Price <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  value={jerseyPrices.fullSet}
                  onChange={(e) =>
                    setJerseyPrices((prev) => ({ ...prev, fullSet: e.target.value }))
                  }
                  required
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  Shirt Only Price <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  value={jerseyPrices.shirtOnly}
                  onChange={(e) =>
                    setJerseyPrices((prev) => ({ ...prev, shirtOnly: e.target.value }))
                  }
                  required
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  Shorts Only Price <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  value={jerseyPrices.shortsOnly}
                  onChange={(e) =>
                    setJerseyPrices((prev) => ({ ...prev, shortsOnly: e.target.value }))
                  }
                  required
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '2px solid #e5e7eb'
              }}
            >
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                Kids Prices
              </h4>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  Full Set Price (Kids)
                  {hasKidsSizes && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
                </label>
                <input
                  type="number"
                  value={jerseyPrices.fullSetKids}
                  onChange={(e) =>
                    setJerseyPrices((prev) => ({ ...prev, fullSetKids: e.target.value }))
                  }
                  required={hasKidsSizes}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  Shirt Only Price (Kids)
                  {hasKidsSizes && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
                </label>
                <input
                  type="number"
                  value={jerseyPrices.shirtOnlyKids}
                  onChange={(e) =>
                    setJerseyPrices((prev) => ({ ...prev, shirtOnlyKids: e.target.value }))
                  }
                  required={hasKidsSizes}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  Shorts Only Price (Kids)
                  {hasKidsSizes && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
                </label>
                <input
                  type="number"
                  value={jerseyPrices.shortsOnlyKids}
                  onChange={(e) =>
                    setJerseyPrices((prev) => ({ ...prev, shortsOnlyKids: e.target.value }))
                  }
                  required={hasKidsSizes}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
            </div>
          </div>
          <small className="apm-form-help">
            Set default pricing for full set, shirt only, and shorts only options. Kids prices stay optional until you add kids sizes.
          </small>
        </div>
      </div>
    );
  };

  const renderSimplePriceSection = (label = 'Price') => (
    <div className="apm-section-block">
      <div className="apm-form-group">
        <label>{label}</label>
        <input
          type="number"
          name="price"
          value={formData.price}
          onChange={handleInputChange}
          required
          placeholder="0.00"
          step="0.01"
          min="0"
        />
      </div>
    </div>
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };

      if (name === 'category' && isTrophyCategory(value)) {
        updated.size = '';
      }

      return updated;
    });

      if (name === 'category') {
        setSizeSurcharges(createEmptySizeSurcharges());
        // Clear fabric surcharges for trophy category, otherwise use defaults
        if (isTrophyCategory(value)) {
          setFabricSurcharges({});
        } else {
          setFabricSurcharges({ ...DEFAULT_FABRIC_SURCHARGES });
        }
        setFabricError('');

        if (isTrophyCategory(value)) {
          setAvailableSizes(prev => prev.length > 0 ? prev : []);
          setJerseySizes({
            shirts: { adults: [], kids: [] },
            shorts: { adults: [], kids: [] }
          });
          setJerseyPrices({ ...DEFAULT_JERSEY_PRICES });
          setTrophyPrices({});
          setSizeInputError('');
        } else if (isJerseyCategory(value)) {
          setJerseySizes(prev => ({
            shirts: {
              adults: prev.shirts.adults.length > 0 ? prev.shirts.adults : [],
              kids: prev.shirts.kids.length > 0 ? prev.shirts.kids : []
            },
            shorts: {
              adults: prev.shorts.adults.length > 0 ? prev.shorts.adults : [],
              kids: prev.shorts.kids.length > 0 ? prev.shorts.kids : []
            }
          }));
          setAvailableSizes([]);
          setSizeInputError('');
        } else {
          setAvailableSizes([]);
          setJerseySizes({
            shirts: { adults: [], kids: [] },
            shorts: { adults: [], kids: [] }
          });
          setJerseyPrices({ ...DEFAULT_JERSEY_PRICES });
          setTrophyPrices({});
          setNewSizeInput('');
          setSizeInputError('');
          setNewJerseySizeInput({
            shirts: { adults: '', kids: '' },
            shorts: { adults: '', kids: '' }
          });
        }

        if (isJerseyCategory(value) || isApparelCategory(value)) {
          // Set all fabric options (including Lacoste) for all categories
          setFabricSurcharges({ ...DEFAULT_FABRIC_SURCHARGES });
          // For uniforms only, filter to only allowed fabrics (Lacoste, Drifit, Polydex)
          // T-shirts and other categories keep all fabric options including Lacoste
          if (isUniformsCategory(value)) {
            setFabricSurcharges(prev => {
              const filtered = {};
              UNIFORM_FABRICS.forEach(fabric => {
                if (prev[fabric] !== undefined) {
                  filtered[fabric] = prev[fabric];
                } else {
                  filtered[fabric] = fabric === 'Polydex' ? '0' : '100';
                }
              });
              return filtered;
            });
          }
          // For T-shirts: all fabric options (including Lacoste) are available, no filtering needed
        }
      }
  };

  // Handle trophy price changes
  const handleTrophyPriceChange = (size, price) => {
    setTrophyPrices(prev => ({
      ...prev,
      [size]: price
    }));
  };

  // Remove trophy price when size is removed
  const handleRemoveTrophySize = (sizeToRemove) => {
    setAvailableSizes(prev => prev.filter(size => size !== sizeToRemove));
    setTrophyPrices(prev => {
      const updated = { ...prev };
      delete updated[sizeToRemove];
      return updated;
    });
    clearSizeSurchargeForSize(sizeToRemove, 'general');
    setSizeInputError('');
  };

  const handleSizeSelect = (size) => {
    setFormData(prev => ({
      ...prev,
      size: size
    }));
  };

  const handleSizeSurchargeChange = (group, size, value) => {
    setSizeSurcharges(prev => {
      const next = {
        adults: { ...prev.adults },
        kids: { ...prev.kids },
        general: { ...prev.general }
      };

      if (value === '') {
        delete next[group][size];
      } else {
        next[group][size] = value;
      }
      return next;
    });
  };

  const clearSizeSurchargeForSize = (size, scope = 'all') => {
    setSizeSurcharges(prev => {
      const next = {
        adults: { ...prev.adults },
        kids: { ...prev.kids },
        general: { ...prev.general }
      };

      if (scope === 'adults' || scope === 'all') {
        delete next.adults[size];
      }
      if (scope === 'kids' || scope === 'all') {
        delete next.kids[size];
      }
      if (scope === 'general' || scope === 'all') {
        delete next.general[size];
      }
      return next;
    });
  };

  const handleFabricSurchargeChange = (name, value) => {
    setFabricSurcharges(prev => ({
      ...prev,
      [name]: value
    }));
    setFabricError('');
  };

  const handleRemoveFabricOption = (name) => {
    setFabricSurcharges(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setFabricError('');
  };

  const handleAddFabricOption = () => {
    const optionName = newFabricOption.name.trim();
    if (!optionName) {
      setFabricError('Please enter a fabric option name before adding.');
      return;
    }

    const exists = Object.keys(fabricSurcharges).some(
      existing => existing.toLowerCase() === optionName.toLowerCase()
    );
    if (exists) {
      setFabricError('This fabric option already exists.');
      return;
    }

    const amount = newFabricOption.fee === '' ? '0' : newFabricOption.fee;
    setFabricSurcharges(prev => ({
      ...prev,
      [optionName]: amount
    }));
    setNewFabricOption({ name: '', fee: '' });
    setFabricError('');
  };

  const handleQuickAddFabricOption = (optionName) => {
    const exists = Object.keys(fabricSurcharges).some(
      existing => existing.toLowerCase() === optionName.toLowerCase()
    );
    if (exists) {
      return;
    }
    setFabricSurcharges(prev => ({
      ...prev,
      [optionName]: '0'
    }));
    setFabricError('');
  };

  const handleCutTypeSurchargeChange = (name, value) => {
    setCutTypeSurcharges(prev => ({
      ...prev,
      [name]: value
    }));
    setCutTypeError('');
  };

  const handleRemoveCutTypeOption = (name) => {
    setCutTypeSurcharges(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setCutTypeError('');
  };

  const handleAddCutTypeOption = () => {
    const optionName = newCutTypeOption.name.trim();
    if (!optionName) {
      setCutTypeError('Please enter a cut type option name before adding.');
      return;
    }

    const exists = Object.keys(cutTypeSurcharges).some(
      existing => existing.toLowerCase() === optionName.toLowerCase()
    );
    if (exists) {
      setCutTypeError('This cut type option already exists.');
      return;
    }

    const amount = newCutTypeOption.fee === '' ? '0' : newCutTypeOption.fee;
    setCutTypeSurcharges(prev => ({
      ...prev,
      [optionName]: amount
    }));
    setNewCutTypeOption({ name: '', fee: '' });
    setCutTypeError('');
  };

  const handleQuickAddCutTypeOption = (optionName) => {
    const exists = Object.keys(cutTypeSurcharges).some(
      existing => existing.toLowerCase() === optionName.toLowerCase()
    );
    if (exists) {
      return;
    }
    setCutTypeSurcharges(prev => ({
      ...prev,
      [optionName]: DEFAULT_CUT_TYPE_SURCHARGES[optionName] || '0'
    }));
    setCutTypeError('');
  };

  const handleAddAvailableSize = () => {
    if (!isTrophyCategory(formData.category) && !isJerseyCategory(formData.category)) {
      return;
    }

    const value = newSizeInput.trim();
    if (!value) {
      setSizeInputError('Enter a size before adding.');
      return;
    }

    const exists = availableSizes.some(size => size.toLowerCase() === value.toLowerCase());
    if (exists) {
      setSizeInputError('Size already added.');
      return;
    }

    setAvailableSizes(prev => [...prev, value]);
    // Initialize price as empty for new trophy size
    if (isTrophyCategory(formData.category)) {
      setTrophyPrices(prev => ({
        ...prev,
        [value]: ''
      }));
    }
    setNewSizeInput('');
    setSizeInputError('');
  };

  const handleRemoveAvailableSize = (sizeToRemove) => {
    setAvailableSizes(prev => prev.filter(size => size !== sizeToRemove));
    // Remove trophy price when size is removed (for trophy category)
    if (isTrophyCategory(formData.category)) {
      setTrophyPrices(prev => {
        const updated = { ...prev };
        delete updated[sizeToRemove];
        return updated;
      });
    }
    setSizeInputError('');
  };

  const seedDefaultSizeSurcharge = (groupKey, size) => {
    if (!size) return;
    const normalizedGroup = groupKey === 'kids' ? 'kids' : groupKey === 'adults' ? 'adults' : groupKey;
    const defaults = DEFAULT_SIZE_SURCHARGE_VALUES[normalizedGroup];
    if (!defaults) return;

    const trimmed = size.trim();
    if (!trimmed) return;

    const lookupKeys = [trimmed, trimmed.toUpperCase(), trimmed.toLowerCase(), trimmed.replace(/\s+/g, '').toUpperCase()];
    const defaultValue = lookupKeys.reduce((value, key) => {
      if (value !== null && value !== undefined) return value;
      return defaults[key];
    }, undefined);

    if (!defaultValue) return;

    setSizeSurcharges(prev => {
      const existing = prev[normalizedGroup]?.[trimmed];
      if (existing !== undefined && existing !== '') {
        return prev;
      }
      return {
        adults: { ...prev.adults, ...(normalizedGroup === 'adults' ? { [trimmed]: defaultValue } : {}) },
        kids: { ...prev.kids, ...(normalizedGroup === 'kids' ? { [trimmed]: defaultValue } : {}) },
        general: { ...prev.general, ...(normalizedGroup === 'general' ? { [trimmed]: defaultValue } : {}) }
      };
    });
  };

  const handleAddJerseySize = (type, ageGroup) => {
    const value = newJerseySizeInput[type][ageGroup].trim();
    if (!value) {
      setSizeInputError(`Enter a size before adding for ${type} ${ageGroup}.`);
      return;
    }

    const exists = jerseySizes[type][ageGroup].some(size => size.toLowerCase() === value.toLowerCase());
    if (exists) {
      setSizeInputError(`Size ${value} already added for ${type} ${ageGroup}.`);
      return;
    }

    setJerseySizes(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [ageGroup]: [...prev[type][ageGroup], value]
      }
    }));

    if (ageGroup === 'adults' || ageGroup === 'kids') {
      seedDefaultSizeSurcharge(ageGroup, value);
    }

    setNewJerseySizeInput(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [ageGroup]: ''
      }
    }));
    setSizeInputError('');
  };

  const handleRemoveJerseySize = (type, ageGroup, sizeToRemove) => {
    const otherType = type === 'shirts' ? 'shorts' : 'shirts';
    const ageKey = ageGroup === 'adults' ? 'adults' : 'kids';
    const existsInOther =
      jerseySizes?.[otherType]?.[ageKey]?.includes(sizeToRemove) || false;

    setJerseySizes(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [ageGroup]: prev[type][ageGroup].filter(size => size !== sizeToRemove)
      }
    }));
    if (!existsInOther) {
      clearSizeSurchargeForSize(sizeToRemove, ageGroup === 'adults' ? 'adults' : 'kids');
    }
    setSizeInputError('');
  };

  const handleQuickAddJerseySize = (type, ageGroup, size) => {
    const exists = jerseySizes[type][ageGroup].includes(size);
    if (exists) {
      handleRemoveJerseySize(type, ageGroup, size);
    } else {
      setJerseySizes(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          [ageGroup]: [...prev[type][ageGroup], size]
        }
      }));
      if (ageGroup === 'adults' || ageGroup === 'kids') {
        seedDefaultSizeSurcharge(ageGroup, size);
      }
      setSizeInputError('');
    }
  };

  const toggleGroupCollapse = (groupKey) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const handleSelectAllSizes = (type, ageGroup, sizesArray) => {
    // Toggle between selecting all and unselecting all
    const sizesToCheck = sizesArray || sizes;
    const currentSizes = jerseySizes[type][ageGroup];
    const allSelected = sizesToCheck.every(size => currentSizes.includes(size));
    
    if (allSelected) {
      // Unselect all - remove all sizes from the array
      setJerseySizes(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          [ageGroup]: prev[type][ageGroup].filter(size => !sizesToCheck.includes(size))
        }
      }));
      if (ageGroup === 'adults' || ageGroup === 'kids') {
        setSizeSurcharges(prev => {
          const next = {
            adults: { ...prev.adults },
            kids: { ...prev.kids },
            general: { ...prev.general }
          };
          sizesToCheck.forEach(size => {
            if (ageGroup === 'adults') {
              delete next.adults[size];
            } else {
              delete next.kids[size];
            }
          });
          return next;
        });
      }
    } else {
      const additions = sizesToCheck.filter(size => !currentSizes.includes(size));
      // Add all sizes from the provided array that aren't already included
      setJerseySizes(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          [ageGroup]: [...new Set([...prev[type][ageGroup], ...additions])]
        }
      }));
      if ((ageGroup === 'adults' || ageGroup === 'kids') && additions.length > 0) {
        additions.forEach(size => seedDefaultSizeSurcharge(ageGroup, size));
      }
    }
    setSizeInputError('');
  };

  const handleMainImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImages(true);
    setUploadingSlot('main');
    setError('');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError('Please log in to upload images');
        return;
      }

      const uploadData = new FormData();
      uploadData.append('image', file);

      const response = await fetch('http://localhost:4000/api/upload/single', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: uploadData
      });

      const result = await response.json();

      if (result.success) {
        setMainImage(result.imageUrl);
        setError('');
      } else {
        setError(result.error || 'Failed to upload main image');
      }
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      setError('Failed to upload main image: ' + uploadError.message);
    } finally {
      setUploadingImages(false);
      setUploadingSlot(null);
    }
  };

  const handleAdditionalImageUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImages(true);
    setUploadingSlot('additional');
    setUploadingAdditionalIndex(index);
    setError('');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError('Please log in to upload images');
        return;
      }

      const uploadData = new FormData();
      uploadData.append('image', file);

      const response = await fetch('http://localhost:4000/api/upload/single', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: uploadData
      });

      const result = await response.json();

      if (result.success) {
        const newImages = [...additionalImages];
        newImages[index] = result.imageUrl;
        setAdditionalImages(newImages);
        setError('');
      } else {
        setError(result.error || 'Failed to upload additional image');
      }
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      setError('Failed to upload additional image: ' + uploadError.message);
    } finally {
      setUploadingImages(false);
      setUploadingSlot(null);
      setUploadingAdditionalIndex(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSizeInputError('');

    const isTrophyProduct = isTrophyCategory(formData.category);
    const isJerseyProduct = isJerseyCategory(formData.category);

    if (isTrophyProduct && availableSizes.length === 0) {
      setError('Please add at least one available size for trophy products.');
      return;
    }

    // Validate trophy prices - each size must have a price
    if (isTrophyProduct) {
      const missingPrices = availableSizes.filter(size => {
        const price = trophyPrices[size];
        return !price || price.toString().trim() === '' || isNaN(parseFloat(price)) || parseFloat(price) < 0;
      });
      
      if (missingPrices.length > 0) {
        setError(`Please enter a valid price for all trophy sizes. Missing prices for: ${missingPrices.join(', ')}`);
        return;
      }
    }

    if (isJerseyProduct) {
      const hasShirtSizes = jerseySizes.shirts.adults.length > 0 || jerseySizes.shirts.kids.length > 0;
      const hasShortSizes = jerseySizes.shorts.adults.length > 0 || jerseySizes.shorts.kids.length > 0;
      const showShorts = shouldShowShorts(formData.category);
      
      // For categories without shorts (Uniforms, T-Shirts, Long Sleeves), only check shirt sizes
      // For Jerseys, check both shirt and short sizes
      if (showShorts) {
        if (!hasShirtSizes && !hasShortSizes) {
          setError('Please add at least one size for shirts or shorts (adults or kids).');
          return;
        }
      } else {
        if (!hasShirtSizes) {
          setError('Please add at least one size for shirts (adults or kids).');
          return;
        }
      }
    }

    setLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError('Please log in to add products');
        return;
      }

      let sizeValue = null;
      if (isTrophyProduct && availableSizes.length > 0) {
        sizeValue = JSON.stringify(availableSizes);
      } else if (isJerseyProduct) {
        const hasAnySizes = jerseySizes.shirts.adults.length > 0 || jerseySizes.shirts.kids.length > 0 ||
                           jerseySizes.shorts.adults.length > 0 || jerseySizes.shorts.kids.length > 0;
        if (hasAnySizes) {
          sizeValue = JSON.stringify(jerseySizes);
        }
      } else {
        sizeValue = formData.size || null;
      }

      // Handle price - for jerseys, store full set price in price column and all prices in jersey_prices
      // For trophies, store prices per size in trophy_prices
      let priceValue = formData.price;
      let jerseyPricesValue = null;
      let trophyPricesValue = null;
      
      // Check if this is specifically a Jerseys category (not uniforms, hoodies, long sleeves, etc.)
      // Only jerseys have jersey type options (full set, shirt only, shorts only)
      const isJerseysCategory = shouldShowJerseyPrices(formData.category);
      
      if (isTrophyProduct) {
        // Store trophy prices as JSONB object mapping size to price
        const pricesObject = {};
        availableSizes.forEach(size => {
          const price = trophyPrices[size];
          if (price && !isNaN(parseFloat(price)) && parseFloat(price) >= 0) {
            pricesObject[size] = parseFloat(price);
          }
        });
        trophyPricesValue = pricesObject;
        // Use the first size's price as the base price (or minimum if needed)
        const firstSizePrice = availableSizes.length > 0 && trophyPrices[availableSizes[0]] 
          ? parseFloat(trophyPrices[availableSizes[0]]) 
          : parseFloat(formData.price) || 0;
        priceValue = firstSizePrice;
        console.log('🏆 [AddProductModal] Trophy prices being saved:', trophyPricesValue);
      } else if (isJerseysCategory) {
        // Validate jersey prices - check for empty strings and ensure values are valid numbers
        const fullSetValue = jerseyPrices.fullSet?.toString().trim();
        const shirtOnlyValue = jerseyPrices.shirtOnly?.toString().trim();
        const shortsOnlyValue = jerseyPrices.shortsOnly?.toString().trim();
        
        // Check if kids sizes are available
        const hasKidsSizes = jerseySizes.shirts.kids.length > 0 || jerseySizes.shorts.kids.length > 0;
        
        // Kids prices
        const fullSetKidsValue = jerseyPrices.fullSetKids?.toString().trim();
        const shirtOnlyKidsValue = jerseyPrices.shirtOnlyKids?.toString().trim();
        const shortsOnlyKidsValue = jerseyPrices.shortsOnlyKids?.toString().trim();
        
        console.log('🔍 [AddProductModal] Validating jersey prices:', {
          fullSet: fullSetValue,
          shirtOnly: shirtOnlyValue,
          shortsOnly: shortsOnlyValue,
          hasKidsSizes,
          fullSetKids: fullSetKidsValue,
          shirtOnlyKids: shirtOnlyKidsValue,
          shortsOnlyKids: shortsOnlyKidsValue
        });
        
        if (!fullSetValue || fullSetValue === '' || isNaN(parseFloat(fullSetValue)) || parseFloat(fullSetValue) < 0) {
          setError('Please enter a valid Full Set Price.');
          setLoading(false);
          return;
        }
        
        if (!shirtOnlyValue || shirtOnlyValue === '' || isNaN(parseFloat(shirtOnlyValue)) || parseFloat(shirtOnlyValue) < 0) {
          setError('Please enter a valid Shirt Only Price.');
          setLoading(false);
          return;
        }
        
        if (!shortsOnlyValue || shortsOnlyValue === '' || isNaN(parseFloat(shortsOnlyValue)) || parseFloat(shortsOnlyValue) < 0) {
          setError('Please enter a valid Shorts Only Price.');
          setLoading(false);
          return;
        }
        
        // Validate kids prices if kids sizes are available
        if (hasKidsSizes) {
          if (!fullSetKidsValue || fullSetKidsValue === '' || isNaN(parseFloat(fullSetKidsValue)) || parseFloat(fullSetKidsValue) < 0) {
            setError('Please enter a valid Full Set Price (Kids).');
            setLoading(false);
            return;
          }
          
          if (!shirtOnlyKidsValue || shirtOnlyKidsValue === '' || isNaN(parseFloat(shirtOnlyKidsValue)) || parseFloat(shirtOnlyKidsValue) < 0) {
            setError('Please enter a valid Shirt Only Price (Kids).');
            setLoading(false);
            return;
          }
          
          if (!shortsOnlyKidsValue || shortsOnlyKidsValue === '' || isNaN(parseFloat(shortsOnlyKidsValue)) || parseFloat(shortsOnlyKidsValue) < 0) {
            setError('Please enter a valid Shorts Only Price (Kids).');
            setLoading(false);
            return;
          }
        }
        
        // Store full set price in price column (for backward compatibility)
        priceValue = parseFloat(fullSetValue);
        // Store all prices in jersey_prices JSONB column
        jerseyPricesValue = {
          fullSet: parseFloat(fullSetValue),
          shirtOnly: parseFloat(shirtOnlyValue),
          shortsOnly: parseFloat(shortsOnlyValue)
        };
        
        // Add kids prices if kids sizes are available
        if (hasKidsSizes) {
          jerseyPricesValue.fullSetKids = parseFloat(fullSetKidsValue);
          jerseyPricesValue.shirtOnlyKids = parseFloat(shirtOnlyKidsValue);
          jerseyPricesValue.shortsOnlyKids = parseFloat(shortsOnlyKidsValue);
        }
        
        console.log('✅ [AddProductModal] Jersey prices validated and formatted:', jerseyPricesValue);
      } else {
        // For non-jersey products, use regular price
        if (!formData.price) {
          setError('Please enter a price.');
          setLoading(false);
          return;
        }
        priceValue = parseFloat(formData.price);
      }

      // For trophy products, exclude 'general' group surcharges (trophy sizes use 'general' group)
      let surchargesToSave = sizeSurcharges;
      if (isTrophyProduct) {
        surchargesToSave = {
          ...sizeSurcharges,
          general: {} // Clear general group surcharges for trophy products
        };
      }
      const sizeSurchargePayload = buildSizeSurchargesPayload(surchargesToSave);
      // For trophy products, exclude fabric surcharges
      const fabricSurchargePayload = isTrophyProduct 
        ? null 
        : buildFabricSurchargesPayload(fabricSurcharges);
      const cutTypeSurchargePayload = buildCutTypeSurchargesPayload(cutTypeSurcharges);

      console.log('🧪 [AddProductModal] Built surcharge payloads:', {
        rawSizeState: sizeSurcharges,
        sizeSurchargePayload,
        rawFabricState: fabricSurcharges,
        fabricSurchargePayload,
        rawCutTypeState: cutTypeSurcharges,
        cutTypeSurchargePayload
      });

      const productData = {
        ...formData,
        price: priceValue,
        jersey_prices: jerseyPricesValue,
        trophy_prices: trophyPricesValue,
        size: sizeValue,
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : null,
        sold_quantity: formData.sold_quantity ? parseInt(formData.sold_quantity) : 0,
        main_image: mainImage,
        additional_images: additionalImages
      };

      if (sizeSurchargePayload) {
        productData.size_surcharges = JSON.stringify(sizeSurchargePayload);
        console.log('🧪 [AddProductModal] size_surcharges JSON stringified payload:', productData.size_surcharges);
      }

      if (fabricSurchargePayload) {
        productData.fabric_surcharges = JSON.stringify(fabricSurchargePayload);
        console.log('🧪 [AddProductModal] fabric_surcharges JSON stringified payload:', productData.fabric_surcharges);
      }

      if (cutTypeSurchargePayload) {
        productData.cut_type_surcharges = JSON.stringify(cutTypeSurchargePayload);
        console.log('🧪 [AddProductModal] cut_type_surcharges JSON stringified payload:', productData.cut_type_surcharges);
      }

      console.log('📦 [AddProductModal] Sending product data:', {
        ...productData,
        jersey_prices: jerseyPricesValue
      });
      console.log('📦 [AddProductModal] Jersey prices value:', jerseyPricesValue);
      console.log('📦 [AddProductModal] Jersey prices state:', jerseyPrices);

      // Handle branch stocks for simple categories (balls, medals, trophies)
      const hasBranchStocks = Object.keys(branchStocks).length > 0;
      const shouldUseBranchStocks = simpleCategorySelected || trophyCategorySelected;
      
      if (hasBranchStocks && shouldUseBranchStocks) {
        // Create/update products for each branch with stock
        const branchStockEntries = Object.entries(branchStocks).filter(([branchId, stockQuantity]) => {
          // Only process branches that have a stock quantity set (not null, undefined, or empty string)
          return stockQuantity !== null && stockQuantity !== undefined && stockQuantity !== '';
        });
        
        console.log('📦 [AddProductModal] Processing branch stocks:', branchStockEntries);
        console.log('📦 [AddProductModal] Total branches to process:', branchStockEntries.length);
        
        if (branchStockEntries.length === 0) {
          throw new Error('Please set stock quantity for at least one branch');
        }
        
        const productPromises = branchStockEntries.map(async ([branchId, stockQuantity]) => {
          try {
          const branchProductData = {
            ...productData,
            branch_id: parseInt(branchId),
            stock_quantity: stockQuantity ? parseInt(stockQuantity) : null
          };

            console.log(`📦 [AddProductModal] Processing branch ${branchId} with stock ${stockQuantity}`);

          // For edit mode, check if product exists in this branch
          if (isEditMode && branchProducts[branchId]) {
            // Update existing product in this branch
            const existingProductId = branchProducts[branchId].id;
              console.log(`📦 [AddProductModal] Updating existing product ${existingProductId} in branch ${branchId}`);
            const url = `http://localhost:4000/api/products/${existingProductId}`;
            const response = await fetch(url, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify(branchProductData)
            });

            if (!response.ok) {
              const errorData = await response.json();
                console.error(`❌ [AddProductModal] Failed to update product in branch ${branchId}:`, errorData);
              throw new Error(errorData.error || `Failed to update product in branch ${branchId}`);
            }

              const result = await response.json();
              console.log(`✅ [AddProductModal] Successfully updated product in branch ${branchId}`);
              return result;
          } else {
            // Create new product for this branch
              console.log(`📦 [AddProductModal] Creating new product in branch ${branchId}`);
            const url = 'http://localhost:4000/api/products';
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify(branchProductData)
            });

            if (!response.ok) {
              const errorData = await response.json();
                console.error(`❌ [AddProductModal] Failed to create product in branch ${branchId}:`, errorData);
              throw new Error(errorData.error || `Failed to create product in branch ${branchId}`);
            }

              const result = await response.json();
              console.log(`✅ [AddProductModal] Successfully created product in branch ${branchId}:`, result.id);
              return result;
            }
          } catch (error) {
            console.error(`❌ [AddProductModal] Error processing branch ${branchId}:`, error);
            throw error;
          }
        });

        const createdProducts = await Promise.all(productPromises);
        console.log('✅ [AddProductModal] All products created/updated successfully for branches:', createdProducts.map(p => ({ id: p.id, branch_id: p.branch_id, stock: p.stock_quantity })));
        
        // Use the first created product for callback (for compatibility)
        const newProduct = createdProducts[0];
        console.log('✅ [AddProductModal] Product jersey_prices:', newProduct.jersey_prices);
        console.log('✅ [AddProductModal] Returned size_surcharges:', newProduct.size_surcharges);
        console.log('✅ [AddProductModal] Returned fabric_surcharges:', newProduct.fabric_surcharges);

        const normalizedProduct = {
          ...newProduct,
          size_surcharges: normalizeSizeSurcharges(newProduct.size_surcharges),
          fabric_surcharges: normalizeFabricSurcharges(newProduct.fabric_surcharges)
        };

        console.log('✅ [AddProductModal] Normalized surcharges (ready for state):', {
          size: normalizedProduct.size_surcharges,
          fabric: normalizedProduct.fabric_surcharges
        });

        onAdd(normalizedProduct);
      } else {
        // Standard single product creation/update
        const url = isEditMode
          ? `http://localhost:4000/api/products/${editingProduct.id}`
          : 'http://localhost:4000/api/products';

        const method = isEditMode ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(productData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ [AddProductModal] API Error:', errorData);
          throw new Error(errorData.error || 'Failed to add product');
        }

        const newProduct = await response.json();
        console.log('✅ [AddProductModal] Product added successfully:', newProduct);
        console.log('✅ [AddProductModal] Product jersey_prices:', newProduct.jersey_prices);
        console.log('✅ [AddProductModal] Returned size_surcharges:', newProduct.size_surcharges);
        console.log('✅ [AddProductModal] Returned fabric_surcharges:', newProduct.fabric_surcharges);

        const normalizedProduct = {
          ...newProduct,
          size_surcharges: normalizeSizeSurcharges(newProduct.size_surcharges),
          fabric_surcharges: normalizeFabricSurcharges(newProduct.fabric_surcharges)
        };

        console.log('✅ [AddProductModal] Normalized surcharges (ready for state):', {
          size: normalizedProduct.size_surcharges,
          fabric: normalizedProduct.fabric_surcharges
        });

        onAdd(normalizedProduct);
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apm-overlay" onClick={onClose}>
      <div className="apm-content" onClick={(e) => e.stopPropagation()}>
        <div className="apm-header">
          <h2>{isEditMode ? 'EDIT PRODUCT' : 'ADD NEW ITEMS'}</h2>
          <button type="button" className="apm-close-btn" onClick={onClose}>
            {'×'}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="apm-form">
          <div className="apm-form-row">
            <div className="apm-image-section">
              <h3 className="apm-image-section-title">Product Images</h3>
              
              {/* Main Image Section */}
              <div className="apm-image-subsection">
                <div className="apm-main-image-upload">
                  {mainImage ? (
                    <div className="apm-uploaded-image">
                      <img src={mainImage} alt="Main product" />
                      <button
                        type="button"
                        className="apm-remove-image"
                        onClick={() => setMainImage(null)}
                        aria-label="Remove main image"
                      >
                        {'×'}
                      </button>
                    </div>
                  ) : (
                    <div className="apm-image-placeholder">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMainImageUpload}
                        disabled={uploadingImages && uploadingSlot === 'main'}
                        style={{ display: 'none' }}
                        id="main-image-upload"
                      />
                      <label htmlFor="main-image-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                        {uploadingImages && uploadingSlot === 'main' ? (
                          <div className="apm-uploading-overlay">
                            <div className="apm-uploading-spinner"></div>
                            <p>Uploading...</p>
                          </div>
                        ) : (
                          <>
                            <div className="apm-image-icon">
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                                <circle cx="12" cy="13" r="3"/>
                              </svg>
                            </div>
                            <p>Click to upload main image</p>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Images Section */}
              <div className="apm-image-subsection">
                <div className="apm-additional-images">
                  {Array.from({ length: 3 }).map((_, index) => {
                    const image = additionalImages[index];

                    if (image) {
                      return (
                        <div key={`image-${index}`} className="apm-uploaded-image apm-uploaded-image--small">
                          <img src={image} alt={`Additional ${index + 1}`} />
                          <button
                            type="button"
                            className="apm-remove-image"
                            onClick={() => setAdditionalImages(prev => prev.filter((_, i) => i !== index))}
                            aria-label={`Remove additional image ${index + 1}`}
                          >
                            {'×'}
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div key={`placeholder-${index}`} className="apm-image-placeholder apm-image-placeholder--small">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleAdditionalImageUpload(event, index)}
                          disabled={uploadingImages && uploadingSlot === 'additional' && uploadingAdditionalIndex === index}
                          style={{ display: 'none' }}
                          id={`additional-image-${index}`}
                        />
                        <label htmlFor={`additional-image-${index}`} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                          {uploadingImages && uploadingSlot === 'additional' && uploadingAdditionalIndex === index ? (
                            <div className="apm-uploading-overlay">
                              <div className="apm-uploading-spinner"></div>
                              <p>Uploading...</p>
                            </div>
                          ) : (
                            <>
                              <div className="apm-image-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                                  <circle cx="12" cy="13" r="3"/>
                                </svg>
                              </div>
                              <p>+</p>
                            </>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="apm-details-section">
              <h3>Product Details</h3>

              <div className="apm-section-block">
                <div className="apm-form-group">
                  <label>Product Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter product name"
                  />
                </div>

                <div className="apm-form-group">
                  <div className="apm-category-label-row">
                    <label className="apm-product-category-label">Product Category</label>
                    <button
                      type="button"
                      className={`apm-category-edit ${categoriesExpanded ? 'apm-category-edit--active' : ''}`}
                      onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                    >
                      Edit
                    </button>
                  </div>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <small className="apm-form-help">Select an existing category or manage categories below</small>

                  {/* Category Management Section */}
                  {categoriesExpanded && (
                    <div className="apm-category-management">
                      <div className="apm-category-management-panel">
                        {/* Add Category */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                          <input
                            type="text"
                            value={newCategoryInput}
                            onChange={(e) => {
                              setNewCategoryInput(e.target.value);
                              setCategoryError('');
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCategory();
                              }
                            }}
                            placeholder="Enter new category name"
                            style={{
                              flex: 1,
                              padding: '0.5rem 0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              background: '#ffffff',
                              color: '#111827'
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddCategory}
                            style={{
                              padding: '0.5rem 1rem',
                              border: 'none',
                              borderRadius: '6px',
                              background: '#3b82f6',
                              color: '#ffffff',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#2563eb'}
                            onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
                          >
                            Add
                          </button>
                        </div>
                        
                        {categoryError && (
                          <div style={{ 
                            color: '#dc2626', 
                            fontSize: '0.75rem', 
                            fontWeight: 500,
                            marginBottom: '0.75rem',
                            padding: '0.5rem',
                            background: '#fef2f2',
                            borderRadius: '4px',
                            border: '1px solid #fecaca'
                          }}>
                            {categoryError}
                          </div>
                        )}
                        
                        {/* Category List with Remove Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                          {categories.map(cat => {
                            const isPredefined = predefinedCategories.includes(cat);
                            return (
                              <div key={cat} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                padding: '0.5rem 0.75rem',
                                background: isPredefined ? '#ffffff' : '#f1f5f9',
                                borderRadius: '6px',
                                border: isPredefined ? '1px solid #e2e8f0' : '1px solid #cbd5f5'
                              }}>
                                <span style={{ 
                                  fontSize: '0.875rem', 
                                  fontWeight: 500,
                                  color: '#111827'
                                }}>
                                  {cat}
                                  {isPredefined && (
                                    <span style={{ 
                                      marginLeft: '0.5rem',
                                      fontSize: '0.7rem',
                                      color: '#64748b',
                                      fontStyle: 'italic'
                                    }}>(Built-in)</span>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCategory(cat)}
                                  aria-label={`Remove category ${cat}`}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.background = '#fef2f2';
                                    e.target.style.transform = 'scale(1.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.background = 'none';
                                    e.target.style.transform = 'scale(1)';
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            {/* Only show apparel-specific sections if not ball/medal */}
            {!simpleCategorySelected && isApparelCategory(formData.category) && !jerseyCategorySelected && (
              shouldShowJerseyPrices(formData.category)
                ? renderJerseyPriceSection()
                : renderSimplePriceSection('Base Price')
            )}

              {trophyCategorySelected ? (
                <div className="apm-section-block">
                  <div className="apm-form-group">
                    <label>Available Sizes</label>
                    <div className="apm-available-sizes-input">
                      <input
                        type="text"
                        value={newSizeInput}
                        onChange={(event) => setNewSizeInput(event.target.value)}
                        onKeyPress={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleAddAvailableSize();
                          }
                        }}
                        placeholder='e.g. 13"'
                      />
                      <button
                        type="button"
                        className="apm-size-add-btn"
                        onClick={handleAddAvailableSize}
                      >
                        Add Size
                      </button>
                    </div>
                    {sizeInputError && (
                      <div className="apm-form-inline-error">{sizeInputError}</div>
                    )}
                    {availableSizes.length > 0 && (
                      <div className="apm-available-sizes-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                        {availableSizes.map(size => (
                          <div key={size} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            padding: '0.75rem',
                            background: '#f8fafc',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb'
                          }}>
                            <span style={{ flex: '0 0 150px', fontWeight: 500, fontSize: '0.875rem', color: '#111827' }}>{size}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                              <label style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap', fontWeight: 500 }}>Price: <span style={{ color: '#ef4444' }}>*</span></label>
                              <input
                                type="number"
                                value={trophyPrices[size] || ''}
                                onChange={(e) => handleTrophyPriceChange(size, e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                required
                                style={{ 
                                  width: '120px', 
                                  padding: '0.5rem', 
                                  border: '1px solid #d1d5db', 
                                  borderRadius: '6px', 
                                  fontSize: '0.875rem',
                                  background: '#ffffff'
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              aria-label={`Remove size ${size}`}
                              onClick={() => handleRemoveAvailableSize(size)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: '1.25rem',
                                fontWeight: 600,
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                transition: 'all 0.2s ease',
                                flex: '0 0 auto'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = '#fef2f2';
                                e.target.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = 'none';
                                e.target.style.transform = 'scale(1)';
                              }}
                            >
                              {'×'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <small className="apm-form-help">
                      Add trophy sizes and their corresponding prices. Each size must have a price (e.g., 13" = 500, 16" = 750, 19" = 1000).
                    </small>
                  </div>
                </div>
              ) : jerseyCategorySelected ? (
                <div className="apm-form-group apm-jersey-sizes-section">
                  <label>Available Sizes for Jerseys</label>
                  
                  {/* Tabs for Adults and Kids */}
                  <div className="apm-jersey-tabs">
                    <button
                      type="button"
                      className={`apm-jersey-tab ${activeJerseyTab === 'adults' ? 'apm-jersey-tab--active' : ''}`}
                      onClick={() => setActiveJerseyTab('adults')}
                    >
                      Adults
                    </button>
                    <button
                      type="button"
                      className={`apm-jersey-tab ${activeJerseyTab === 'kids' ? 'apm-jersey-tab--active' : ''}`}
                      onClick={() => setActiveJerseyTab('kids')}
                    >
                      Kids
                    </button>
                  </div>

                  {/* Adults Tab Content */}
                  {activeJerseyTab === 'adults' && (
                    <div className="apm-jersey-tab-content">
                        {/* Adults Prices - Only show for jerseys (not uniforms, hoodies, long sleeves) */}
                        {shouldShowJerseyPrices(formData.category) && (
                          <div className="apm-section-block">
                            <div className="apm-form-group">
                              <label>Adults Jersey Prices</label>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                                    Full Set Price <span style={{ color: '#ef4444' }}>*</span>
                                  </label>
                                  <input
                                    type="number"
                                    value={jerseyPrices.fullSet}
                                    onChange={(e) =>
                                      setJerseyPrices((prev) => ({ ...prev, fullSet: e.target.value }))
                                    }
                                    required
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                                    Shirt Only Price <span style={{ color: '#ef4444' }}>*</span>
                                  </label>
                                  <input
                                    type="number"
                                    value={jerseyPrices.shirtOnly}
                                    onChange={(e) =>
                                      setJerseyPrices((prev) => ({ ...prev, shirtOnly: e.target.value }))
                                    }
                                    required
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                                    Shorts Only Price <span style={{ color: '#ef4444' }}>*</span>
                                  </label>
                                  <input
                                    type="number"
                                    value={jerseyPrices.shortsOnly}
                                    onChange={(e) =>
                                      setJerseyPrices((prev) => ({ ...prev, shortsOnly: e.target.value }))
                                    }
                                    required
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                                  />
                                </div>
                              </div>
                              <small className="apm-form-help">
                                Set default pricing for full set, shirt only, and shorts only options for adults.
                              </small>
                            </div>
                          </div>
                        )}

                        {/* Shirt Sizes - Adults */}
                        <div className="apm-jersey-size-subgroup">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h5 className="apm-jersey-size-subgroup-title" style={{ margin: 0 }}>Shirt Sizes</h5>
                            <button
                              type="button"
                              onClick={() => handleSelectAllSizes('shirts', 'adults')}
                              style={{
                                background: 'none',
                                border: 'none',
                                textDecoration: 'underline',
                                color: '#3b82f6',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                padding: 0,
                                fontFamily: 'inherit'
                              }}
                            >
                              {sizes.every(size => jerseySizes.shirts.adults.includes(size)) ? 'UNSELECT ALL' : 'SELECT ALL'}
                            </button>
                          </div>
                          <div className="apm-size-quick-add">
                            <p>Quick add standard sizes:</p>
                            <div className="apm-quick-size-buttons">
                              {sizes.map(size => (
                                <button
                                  key={size}
                                  type="button"
                                  className={`apm-quick-size-btn ${jerseySizes.shirts.adults.includes(size) ? 'apm-quick-size-btn--selected' : ''}`}
                                  onClick={() => handleQuickAddJerseySize('shirts', 'adults', size)}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="apm-available-sizes-input">
                            <input
                              type="text"
                              value={newJerseySizeInput.shirts.adults}
                              onChange={(e) => setNewJerseySizeInput(prev => ({
                                ...prev,
                                shirts: { ...prev.shirts, adults: e.target.value }
                              }))}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddJerseySize('shirts', 'adults');
                                }
                              }}
                              placeholder="e.g. S, M, L or custom size"
                            />
                            <button
                              type="button"
                              className="apm-size-add-btn"
                              onClick={() => handleAddJerseySize('shirts', 'adults')}
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Short Sizes - Adults - Only show for Jerseys (not hoodies or long sleeves) */}
                        {shouldShowShorts(formData.category) && (
                          <div className="apm-jersey-size-subgroup">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <h5 className="apm-jersey-size-subgroup-title" style={{ margin: 0 }}>Short Sizes</h5>
                              <button
                                type="button"
                                onClick={() => handleSelectAllSizes('shorts', 'adults')}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  textDecoration: 'underline',
                                  color: '#3b82f6',
                                  cursor: 'pointer',
                                  fontSize: '0.9rem',
                                  fontWeight: 600,
                                  padding: 0,
                                  fontFamily: 'inherit'
                                }}
                              >
                                {sizes.every(size => jerseySizes.shorts.adults.includes(size)) ? 'UNSELECT ALL' : 'SELECT ALL'}
                              </button>
                            </div>
                            <div className="apm-size-quick-add">
                              <p>Quick add standard sizes:</p>
                              <div className="apm-quick-size-buttons">
                                {sizes.map(size => (
                                <button
                                  key={size}
                                  type="button"
                                  className={`apm-quick-size-btn ${jerseySizes.shorts.adults.includes(size) ? 'apm-quick-size-btn--selected' : ''}`}
                                    onClick={() => handleQuickAddJerseySize('shorts', 'adults', size)}
                                  >
                                    {size}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="apm-available-sizes-input">
                              <input
                                type="text"
                                value={newJerseySizeInput.shorts.adults}
                                onChange={(e) => setNewJerseySizeInput(prev => ({
                                  ...prev,
                                  shorts: { ...prev.shorts, adults: e.target.value }
                                }))}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddJerseySize('shorts', 'adults');
                                  }
                                }}
                                placeholder="e.g. S, M, L or custom size"
                              />
                              <button
                                type="button"
                                className="apm-size-add-btn"
                                onClick={() => handleAddJerseySize('shorts', 'adults')}
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                        {renderSizeSurchargeGroup(
                          'Adult Size Surcharges',
                          'adults',
                          Array.from(
                            new Set([
                              ...(jerseySizes.shirts?.adults || []),
                              ...(shouldShowShorts(formData.category)
                                ? jerseySizes.shorts?.adults || []
                                : [])
                            ])
                          ),
                          'Add adult jersey sizes to enable surcharges.',
                          'Set optional surcharges for adult jersey sizes. Leave blank to keep the base price.'
                        )}
                    </div>
                  )}

                  {/* Kids Tab Content */}
                  {activeJerseyTab === 'kids' && (
                    <div className="apm-jersey-tab-content">
                        {/* Kids Prices - Only show for jerseys (not uniforms, hoodies, long sleeves) */}
                        {shouldShowJerseyPrices(formData.category) && (() => {
                          const kidsShirtSizes = jerseySizes.shirts?.kids ?? [];
                          const kidsShortSizes = jerseySizes.shorts?.kids ?? [];
                          const hasKidsSizes = kidsShirtSizes.length > 0 || kidsShortSizes.length > 0;
                          
                          return (
                            <div className="apm-section-block">
                              <div className="apm-form-group">
                                <label>Kids Jersey Prices</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                                      Full Set Price (Kids)
                                      {hasKidsSizes && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
                                    </label>
                                    <input
                                      type="number"
                                      value={jerseyPrices.fullSetKids}
                                      onChange={(e) =>
                                        setJerseyPrices((prev) => ({ ...prev, fullSetKids: e.target.value }))
                                      }
                                      required={hasKidsSizes}
                                      placeholder="0.00"
                                      step="0.01"
                                      min="0"
                                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                                      Shirt Only Price (Kids)
                                      {hasKidsSizes && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
                                    </label>
                                    <input
                                      type="number"
                                      value={jerseyPrices.shirtOnlyKids}
                                      onChange={(e) =>
                                        setJerseyPrices((prev) => ({ ...prev, shirtOnlyKids: e.target.value }))
                                      }
                                      required={hasKidsSizes}
                                      placeholder="0.00"
                                      step="0.01"
                                      min="0"
                                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                                      Shorts Only Price (Kids)
                                      {hasKidsSizes && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
                                    </label>
                                    <input
                                      type="number"
                                      value={jerseyPrices.shortsOnlyKids}
                                      onChange={(e) =>
                                        setJerseyPrices((prev) => ({ ...prev, shortsOnlyKids: e.target.value }))
                                      }
                                      required={hasKidsSizes}
                                      placeholder="0.00"
                                      step="0.01"
                                      min="0"
                                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                                    />
                                  </div>
                                </div>
                                <small className="apm-form-help">
                                  Set default pricing for full set, shirt only, and shorts only options for kids. Prices become required when you add kids sizes.
                                </small>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Shirt Sizes - Kids */}
                        <div className="apm-jersey-size-subgroup">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h5 className="apm-jersey-size-subgroup-title" style={{ margin: 0 }}>Shirt Sizes</h5>
                            <button
                              type="button"
                              onClick={() => handleSelectAllSizes('shirts', 'kids', kidsSizes)}
                              style={{
                                background: 'none',
                                border: 'none',
                                textDecoration: 'underline',
                                color: '#3b82f6',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                padding: 0,
                                fontFamily: 'inherit'
                              }}
                            >
                              {kidsSizes.every(size => jerseySizes.shirts.kids.includes(size)) ? 'UNSELECT ALL' : 'SELECT ALL'}
                            </button>
                          </div>
                          <div className="apm-size-quick-add">
                            <p>Quick add standard sizes:</p>
                            <div className="apm-quick-size-buttons">
                              {kidsSizes.map(size => (
                                <button
                                  key={size}
                                  type="button"
                                  className={`apm-quick-size-btn ${jerseySizes.shirts.kids.includes(size) ? 'apm-quick-size-btn--selected' : ''}`}
                                  onClick={() => handleQuickAddJerseySize('shirts', 'kids', size)}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="apm-available-sizes-input">
                            <input
                              type="text"
                              value={newJerseySizeInput.shirts.kids}
                              onChange={(e) => setNewJerseySizeInput(prev => ({
                                ...prev,
                                shirts: { ...prev.shirts, kids: e.target.value }
                              }))}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddJerseySize('shirts', 'kids');
                                }
                              }}
                              placeholder="e.g. S6, S8, S10 or custom size"
                            />
                            <button
                              type="button"
                              className="apm-size-add-btn"
                              onClick={() => handleAddJerseySize('shirts', 'kids')}
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Short Sizes - Kids - Only show for Jerseys (not hoodies or long sleeves) */}
                        {shouldShowShorts(formData.category) && (
                          <div className="apm-jersey-size-subgroup">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <h5 className="apm-jersey-size-subgroup-title" style={{ margin: 0 }}>Short Sizes</h5>
                              <button
                                type="button"
                                onClick={() => handleSelectAllSizes('shorts', 'kids', kidsSizes)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  textDecoration: 'underline',
                                  color: '#3b82f6',
                                  cursor: 'pointer',
                                  fontSize: '0.9rem',
                                  fontWeight: 600,
                                  padding: 0,
                                  fontFamily: 'inherit'
                                }}
                              >
                                {kidsSizes.every(size => jerseySizes.shorts.kids.includes(size)) ? 'UNSELECT ALL' : 'SELECT ALL'}
                              </button>
                            </div>
                            <div className="apm-size-quick-add">
                              <p>Quick add standard sizes:</p>
                              <div className="apm-quick-size-buttons">
                                {kidsSizes.map(size => (
                                <button
                                  key={size}
                                  type="button"
                                  className={`apm-quick-size-btn ${jerseySizes.shorts.kids.includes(size) ? 'apm-quick-size-btn--selected' : ''}`}
                                    onClick={() => handleQuickAddJerseySize('shorts', 'kids', size)}
                                  >
                                    {size}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="apm-available-sizes-input">
                              <input
                                type="text"
                                value={newJerseySizeInput.shorts.kids}
                                onChange={(e) => setNewJerseySizeInput(prev => ({
                                  ...prev,
                                  shorts: { ...prev.shorts, kids: e.target.value }
                                }))}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddJerseySize('shorts', 'kids');
                                  }
                                }}
                                placeholder="e.g. S6, S8, S10 or custom size"
                              />
                              <button
                                type="button"
                                className="apm-size-add-btn"
                                onClick={() => handleAddJerseySize('shorts', 'kids')}
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                        {renderSizeSurchargeGroup(
                          'Kids Size Surcharges',
                          'kids',
                          Array.from(
                            new Set([
                              ...(jerseySizes.shirts?.kids || []),
                              ...(shouldShowShorts(formData.category)
                                ? jerseySizes.shorts?.kids || []
                                : [])
                            ])
                          ),
                          'Add kids jersey sizes to enable surcharges.',
                          'Set optional surcharges for kids jersey sizes. Leave blank to keep the base price.'
                        )}
                    </div>
                  )}

                  {sizeInputError && (
                  <div className="apm-form-inline-error">{sizeInputError}</div>
                  )}
                  <small className="apm-form-help">
                    Add available sizes for jersey shirts and shorts for both adults and kids. Use quick add buttons for standard sizes or type custom sizes.
                  </small>
                </div>
              ) : !simpleCategorySelected ? (
                // Show size selector for non-jersey, non-trophy categories (but not balls/medals)
                <div className="apm-section-block">
                  <div className="apm-form-group">
                    <label>Size (Optional)</label>
                    <div className="apm-size-buttons">
                      <button
                        type="button"
                        className={`apm-size-btn ${formData.size === '' ? 'apm-size-btn--selected' : ''}`}
                        onClick={() => handleSizeSelect('')}
                      >
                        No Size
                      </button>
                      {sizes.map(size => (
                        <button
                          key={size}
                          type="button"
                          className={`apm-size-btn ${formData.size === size ? 'apm-size-btn--selected' : ''}`}
                          onClick={() => handleSizeSelect(size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    <small className="apm-form-help">Leave blank if not applicable</small>
                  </div>
                </div>
              ) : null}

              {/* Hide size surcharges, fabric, cut type for balls/medals */}
              {!simpleCategorySelected && apparelCategorySelected && !jerseyCategorySelected && !trophyCategorySelected && (
                <div className="apm-section-block">
                  {renderSizeSurchargeGroup(
                    'Size Surcharges',
                    'general',
                    sizes,
                    'Use the sizes where surcharges apply.',
                    'Set optional surcharges right beside each size. Leave blank when the base price already covers the size.'
                  )}
                </div>
              )}
              
              {/* Hide fabric and cut type surcharges for balls/medals */}
              {!simpleCategorySelected && renderFabricSurchargeSection()}

              {!simpleCategorySelected && renderCutTypeSurchargeSection()}

              {/* Show simple price for balls, medals, and non-apparel categories (but not trophies) */}
              {(!apparelCategorySelected || simpleCategorySelected) && !trophyCategorySelected ? renderSimplePriceSection() : null}

              {/* Show stock quantity for balls, medals, trophies, and non-apparel categories */}
              {(!apparelCategorySelected || simpleCategorySelected || trophyCategorySelected) && (
                <div className="apm-section-block">
                  <div className="apm-form-group">
                    <label>Stock Quantity (Optional)</label>
                    <input
                      type="number"
                      name="stock_quantity"
                      value={branchStockQuantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        setBranchStockQuantity(value);
                        // Update branchStocks for all selected branches
                        if (value === '' || value === null || value === undefined) {
                          setBranchStocks(prev => {
                            const updated = { ...prev };
                            selectedBranches.forEach(branchId => {
                              delete updated[branchId];
                            });
                            return updated;
                          });
                        } else {
                          const stockValue = parseInt(value) || 0;
                          setBranchStocks(prev => {
                            const updated = { ...prev };
                            selectedBranches.forEach(branchId => {
                              updated[branchId] = stockValue;
                            });
                            return updated;
                          });
                        }
                      }}
                      placeholder="Enter stock quantity"
                      min="0"
                    />
                    <small className="apm-form-help">Enter stock quantity and select branches below to apply it</small>
                    
                    {/* Branch Selection Checkboxes */}
                    {branches.length > 0 && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <label style={{ display: 'block', fontWeight: 600, color: '#111827', fontSize: '0.875rem', margin: 0 }}>
                            Select Branches
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const allBranchIds = branches.map(b => b.id);
                              const allSelected = allBranchIds.every(id => selectedBranches.includes(id));
                              
                              if (allSelected) {
                                // Deselect all
                                setSelectedBranches([]);
                                setBranchStocks({});
                              } else {
                                // Select all
                                setSelectedBranches(allBranchIds);
                                // If stock quantity is already set, apply it to all branches
                                if (branchStockQuantity) {
                                  const stockValue = parseInt(branchStockQuantity) || 0;
                                  const allStocks = {};
                                  allBranchIds.forEach(branchId => {
                                    allStocks[branchId] = stockValue;
                                  });
                                  setBranchStocks(allStocks);
                                }
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#3b82f6',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textDecoration: 'underline',
                              padding: '0.25rem 0.5rem',
                              fontFamily: 'inherit'
                            }}
                          >
                            {branches.every(b => selectedBranches.includes(b.id)) ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {branches.map(branch => {
                            const currentStockFromDB = branchProducts[branch.id]?.stock_quantity || 0;
                            const newStock = branchStocks[branch.id];
                            // Display new stock if set, otherwise show current stock from DB
                            const displayStock = newStock !== undefined && newStock !== '' ? newStock : currentStockFromDB;
                            const isSelected = selectedBranches.includes(branch.id);
                            const isHovered = hoveredBranchId === branch.id;
                            const isAddingStock = addingStockBranchId === branch.id;
                            const branchStock = branchStocks[branch.id] || '';
                            
                            return (
                              <div 
                                key={branch.id}
                                onMouseEnter={() => setHoveredBranchId(branch.id)}
                                onMouseLeave={() => {
                                  setHoveredBranchId(null);
                                  if (!isAddingStock) {
                                    setAddingStockBranchId(null);
                                    setAddingStockQuantity('');
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.5rem',
                                  borderRadius: '4px',
                                  background: isSelected ? '#eff6ff' : isHovered ? '#f0f9ff' : 'transparent',
                                  transition: 'background 0.2s ease',
                                  position: 'relative'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setSelectedBranches(prev => prev.filter(id => id !== branch.id));
                                      setBranchStocks(prev => {
                                        const updated = { ...prev };
                                        delete updated[branch.id];
                                        return updated;
                                      });
                                    } else {
                                      setSelectedBranches(prev => [...prev, branch.id]);
                                      // If stock quantity is already set, apply it to this branch
                                      if (branchStockQuantity) {
                                        const stockValue = parseInt(branchStockQuantity) || 0;
                                        setBranchStocks(prev => ({
                                          ...prev,
                                          [branch.id]: stockValue
                                        }));
                                      }
                                    }
                                  }}
                                  style={{
                                    width: '1rem',
                                    height: '1rem',
                                    cursor: 'pointer',
                                    accentColor: '#3b82f6'
                                  }}
                                />
                                <label 
                                  style={{ 
                                    flex: 1,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    color: '#111827',
                                    fontWeight: isSelected ? 500 : 400
                                  }}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedBranches(prev => prev.filter(id => id !== branch.id));
                                      setBranchStocks(prev => {
                                        const updated = { ...prev };
                                        delete updated[branch.id];
                                        return updated;
                                      });
                                    } else {
                                      setSelectedBranches(prev => [...prev, branch.id]);
                                      if (branchStockQuantity) {
                                        const stockValue = parseInt(branchStockQuantity) || 0;
                                        setBranchStocks(prev => ({
                                          ...prev,
                                          [branch.id]: stockValue
                                        }));
                                      }
                                    }
                                  }}
                                >
                                  {branch.name}
                                  {branch.is_main_manufacturing && (
                                    <span style={{ marginLeft: '0.5rem', color: '#6b7280', fontSize: '0.75rem' }}>
                                      (Main Manufacturing)
                                    </span>
                                  )}
                                  {displayStock > 0 && (
                                    <span style={{ marginLeft: '0.5rem', color: newStock !== undefined && newStock !== '' ? '#3b82f6' : '#059669', fontSize: '0.75rem', fontWeight: 500 }}>
                                      - Stock: {displayStock}
                                      {currentStockFromDB > 0 && newStock !== undefined && newStock !== '' && newStock !== currentStockFromDB && (
                                        <span style={{ color: '#6b7280', marginLeft: '0.25rem' }}>
                                          (was {currentStockFromDB})
                                        </span>
                                      )}
                                    </span>
                                  )}
                                  {displayStock === 0 && newStock === 0 && currentStockFromDB === 0 && (
                                    <span style={{ marginLeft: '0.5rem', color: '#9ca3af', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                      - No stock
                                    </span>
                                  )}
                                </label>
                                
                                {/* Add button appears on hover */}
                                {isHovered && !isAddingStock && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      // Deselect all branches
                                      setSelectedBranches([]);
                                      // Clear the stock quantity input
                                      setBranchStockQuantity('');
                                      // Clear all branch stocks
                                      setBranchStocks({});
                                      // Open input for this branch
                                      setAddingStockBranchId(branch.id);
                                      setAddingStockQuantity(branchStock || '');
                                    }}
                                    onMouseEnter={(e) => {
                                      e.stopPropagation();
                                      setHoveredBranchId(branch.id);
                                    }}
                                    style={{
                                      background: '#3b82f6',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '0.25rem 0.75rem',
                                      fontSize: '0.75rem',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      transition: 'background 0.2s ease'
                                    }}
                                  >
                                    Add
                                  </button>
                                )}
                                
                                {/* Input field appears when adding stock */}
                                {isAddingStock && (
                                  <div 
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    onMouseEnter={() => setHoveredBranchId(branch.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="number"
                                      value={addingStockQuantity}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        setAddingStockQuantity(e.target.value);
                                      }}
                                      onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const stockValue = parseInt(addingStockQuantity) || 0;
                                          if (stockValue > 0) {
                                            setBranchStocks(prev => ({
                                              ...prev,
                                              [branch.id]: stockValue
                                            }));
                                            setSelectedBranches(prev => {
                                              if (!prev.includes(branch.id)) {
                                                return [...prev, branch.id];
                                              }
                                              return prev;
                                            });
                                            setAddingStockBranchId(null);
                                            setAddingStockQuantity('');
                                            setHoveredBranchId(null);
                                          }
                                        } else if (e.key === 'Escape') {
                                          e.preventDefault();
                                          setAddingStockBranchId(null);
                                          setAddingStockQuantity('');
                                          setHoveredBranchId(null);
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder="Qty"
                                      min="0"
                                      autoFocus
                                      style={{
                                        width: '60px',
                                        padding: '0.25rem 0.5rem',
                                        border: '1px solid #3b82f6',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem'
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        const stockValue = parseInt(addingStockQuantity) || 0;
                                        if (stockValue > 0) {
                                          setBranchStocks(prev => ({
                                            ...prev,
                                            [branch.id]: stockValue
                                          }));
                                          setSelectedBranches(prev => {
                                            if (!prev.includes(branch.id)) {
                                              return [...prev, branch.id];
                                            }
                                            return prev;
                                          });
                                        }
                                        setAddingStockBranchId(null);
                                        setAddingStockQuantity('');
                                        setHoveredBranchId(null);
                                      }}
                                      style={{
                                        background: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setAddingStockBranchId(null);
                                        setAddingStockQuantity('');
                                        setHoveredBranchId(null);
                                      }}
                                      style={{
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="apm-section-block">
                <div className="apm-form-group">
                  <label>Sold Quantity</label>
                  <input
                    type="number"
                    name="sold_quantity"
                    value={formData.sold_quantity}
                    onChange={handleInputChange}
                    placeholder="Enter initial sold quantity"
                    min="0"
                  />
                  <small className="apm-form-help">Number of items already sold</small>
                </div>
              </div>


              <div className="apm-section-block">
                <div className="apm-form-group">
                  <label>Product Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter product description"
                    rows="4"
                  />
                </div>
              </div>

              {error && (
                <div className="apm-error-message">
                  {error}
                </div>
              )}

              <div className="apm-form-actions">
                <button type="button" className="apm-cancel-btn" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="apm-submit-btn" disabled={loading}>
                  {loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'UPDATE PRODUCT' : 'ADD PRODUCT')}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;



