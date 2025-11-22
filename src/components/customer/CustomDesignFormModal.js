import React, { useMemo, useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faXmark, faLock, faCircleCheck, faChevronDown, faChevronUp, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FaTruck, FaMapMarkerAlt, FaCloudUploadAlt } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { API_URL } from '../../config/api';
import userService from '../../services/userService';
import { getProvinces, getCitiesByProvince, getBarangaysByCity } from '../../utils/locationData';
import SearchableSelect from '../common/SearchableSelect';
import './CustomDesignFormModal.css';

const branches = [
  { id: 'san-pascual', name: 'SAN PASCUAL (MAIN BRANCH)', address: 'Villa Maria Subdivision Sambat, San Pascual, 4204 Batangas' },
  { id: 'calapan', name: 'CALAPAN BRANCH', address: 'Unit 2, G/F Basa Bldg., Infantado St., San Vicente West, Calapan City' },
  { id: 'muzon', name: 'MUZON BRANCH', address: 'Barangay Muzon, San Luis, 4226 Batangas' },
  { id: 'lemery', name: 'LEMERY BRANCH', address: 'Miranda Bldg, Illustre Ave., Brgy. District III 4209 Lemery Batangas' },
  { id: 'batangas-city', name: 'BATANGAS CITY BRANCH', address: 'Unit 1 Casa Buena Bldg, P. Burgos St. Ext Calicanto, Batangas' },
  { id: 'bauan', name: 'BAUAN BRANCH', address: 'J.P Rizal St. Poblacion, Bauan Batangas' },
  { id: 'calaca', name: 'CALACA BRANCH', address: 'Block D-8 Calaca Public Market, Poblacion 4, Calaca City' },
  { id: 'balayan', name: 'BALAYAN BRANCH', address: 'Balayan, Batangas' },
  { id: 'lipa', name: 'LIPA BRANCH', address: 'Lipa City, Batangas' },
];

// Available sizes - will be updated based on latest product
const adultSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL'];
const kidsSizes = ['S6', 'S8', 'S10', 'S12', 'S14'];

// Sizes that have surcharges (₱50)
const surchargeSizes = ['2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL'];

// Fabric options with surcharges
const fabricOptions = [
  { name: 'Polydex', surcharge: 0 }, // Default
  { name: 'Microcool', surcharge: 100 },
  { name: 'Aircool', surcharge: 100 },
  { name: 'Drifit', surcharge: 100 },
  { name: 'Square Mesh', surcharge: 100 },
  { name: 'Lacoste', surcharge: 100 } // Added for uniforms
];

// Cut type options
const cutTypeOptions = [
  { name: 'Normal Cut', surcharge: 0 }, // Default
  { name: 'NBA Cut', surcharge: 100 }
];

// Knitted options for uniforms (Sleeves and Collars)
const knittedOptions = [
  { name: 'Sleeves', surcharge: 100 },
  { name: 'Collars', surcharge: 100 }
];

const initialMember = { 
  number: '', 
  surname: '', 
  size: '', 
  shortsSize: '', 
  sizingType: 'adults',
  jerseyType: 'full', // 'full', 'shirt', 'shorts'
  fabricOption: 'Polydex', // Default fabric
  cutType: 'Normal Cut', // Default cut type
  knittedOption: '', // For uniforms: 'Sleeves', 'Collars', or empty
  apparelType: '' // 'basketball_jersey', 'volleyball_jersey', 'hoodie', 'tshirt', 'longsleeves', 'uniforms'
};

export default function CustomDesignFormModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { openSignIn } = useModal();
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [teamName, setTeamName] = useState('');
  const [apparelType, setApparelType] = useState(''); // 'basketball_jersey', 'volleyball_jersey', 'hoodie', 'tshirt', 'longsleeves', 'uniforms'
  const [images, setImages] = useState([]); // {file, url}
  const [members, setMembers] = useState([ { ...initialMember } ]);
  const [pickupBranchId, setPickupBranchId] = useState('');
  const [shippingMethod, setShippingMethod] = useState('pickup'); // 'pickup' or 'delivery'
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
  const [hasAddress, setHasAddress] = useState(false);
  const [allAddresses, setAllAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [newAddress, setNewAddress] = useState({
    fullName: '',
    phone: '',
    province: '',
    city: '',
    barangay: '',
    postalCode: '',
    streetAddress: ''
  });
  const [addressErrors, setAddressErrors] = useState({});
  const [provinces, setProvinces] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [availableBarangays, setAvailableBarangays] = useState([]);
  const [expandedMembers, setExpandedMembers] = useState(new Set());
  const [orderNotes, setOrderNotes] = useState(''); // Notes/message to Yohanns
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [validationMessage, setValidationMessage] = useState(null);
  const [showErrors, setShowErrors] = useState(false); // Track if errors should be shown
  const [instantErrors, setInstantErrors] = useState({}); // Real-time validation errors
  const [showLoginPrompt, setShowLoginPrompt] = useState(false); // Show login prompt for non-logged-in users
  
  const DELIVERY_FEE = 50; // Delivery fee in pesos

  const errors = useMemo(() => {
    const e = {};
    if (!clientName.trim()) e.clientName = 'Client name is required';
    // Email is automatically taken from logged-in user, no validation needed
    if (!phone.trim()) e.phone = 'Phone is required';
    else if (!/^\+?[0-9\-()\s]{7,}$/.test(phone)) e.phone = 'Enter a valid phone number';
    if (!teamName.trim()) e.teamName = 'Team name is required';
    if (!apparelType) e.apparelType = 'Apparel type is required';
    
    // Shipping method validation
    // Location is required for both pickup and delivery (COD)
    if (!pickupBranchId) {
      e.pickup = 'Please select a branch location';
    }
    // For delivery, check if address is selected and has all required fields
    if (shippingMethod === 'delivery') {
      // Check if user has addresses but none selected
      if (hasAddress && !selectedAddressId && !showAddressForm) {
        e.deliveryAddress = 'Please select a delivery address';
      }
      // Check if address form is shown but not saved
      else if (showAddressForm && (!newAddress.province || !newAddress.city || !newAddress.barangay || !newAddress.streetAddress)) {
        e.deliveryAddress = 'Please complete the delivery address form';
      }
      // Check if delivery address fields are missing
      else if (!deliveryAddress.address || !deliveryAddress.receiver || !deliveryAddress.phone) {
      e.deliveryAddress = 'Delivery address is required';
      }
      // Additional check: if address exists but is incomplete
      else if (deliveryAddress.address && (!deliveryAddress.receiver || !deliveryAddress.phone)) {
        e.deliveryAddress = 'Delivery address information is incomplete';
      }
    }

    // Roster validation
    const numbers = new Set();
    members.forEach((m, idx) => {
      if (!m.number) e[`member_number_${idx}`] = 'Required';
      if (!m.surname?.trim()) e[`member_surname_${idx}`] = 'Required';
      // Validate sizes based on jerseyType
      // Only validate sizes that are actually needed based on jerseyType
      const memberJerseyType = m.jerseyType || 'full';
      
      // For hoodies, long sleeves, and T-shirts, they don't have jersey type - treat as shirt-only
      const isHoodieOrLongSleeves = apparelType === 'hoodie' || apparelType === 'longsleeves';
      const isTShirt = apparelType === 'tshirt';
      const effectiveJerseyType = (isHoodieOrLongSleeves || isTShirt) ? 'shirt' : memberJerseyType;
      
      // Debug logging for member 0 to help diagnose issues
      if (idx === 0) {
        console.log(`🔍 Member ${idx} validation - apparelType: "${apparelType}", jerseyType: "${m.jerseyType}" (resolved to: "${effectiveJerseyType}"), size: "${m.size}", shortsSize: "${m.shortsSize}"`);
        if (isTShirt) {
          console.log(`✅ Member ${idx}: T-shirt - treating as shirt-only, no jersey type`);
        }
      }
      
      // For full set: require both shirt and shorts sizes
      if (effectiveJerseyType === 'full') {
        if (!m.size?.trim()) e[`member_size_${idx}`] = 'Required';
        if (!m.shortsSize?.trim()) e[`member_shorts_size_${idx}`] = 'Required';
      } 
      // For shirt only (or hoodies/long sleeves): require shirt size only (shorts size NOT required)
      else if (effectiveJerseyType === 'shirt') {
        if (!m.size?.trim()) e[`member_size_${idx}`] = 'Required';
        // shortsSize validation is intentionally skipped for shirt-only orders, hoodies, long sleeves, and T-shirts
        if (isHoodieOrLongSleeves) {
          console.log(`✅ Member ${idx}: Hoodie/Long Sleeves - skipping shortsSize validation`);
        } else if (isTShirt) {
          console.log(`✅ Member ${idx}: T-shirt - skipping shortsSize validation`);
        } else {
          console.log(`✅ Member ${idx}: Shirt-only order - skipping shortsSize validation`);
        }
      } 
      // For shorts only: require shorts size only (shirt size NOT required)
      else if (effectiveJerseyType === 'shorts') {
        if (!m.shortsSize?.trim()) e[`member_shorts_size_${idx}`] = 'Required';
        // size validation is intentionally skipped for shorts-only orders
        console.log(`✅ Member ${idx}: Shorts-only order - skipping size validation`);
      }
      if (!m.sizingType) e[`member_sizing_type_${idx}`] = 'Required';
      if (m.number) {
        if (numbers.has(m.number)) e[`member_number_${idx}`] = 'Duplicate jersey number';
        numbers.add(m.number);
      }
    });
    return e;
  }, [clientName, phone, teamName, apparelType, shippingMethod, pickupBranchId, deliveryAddress, members, hasAddress, selectedAddressId, showAddressForm, newAddress]);

  const hasErrors = Object.keys(errors).length > 0;

  const handleDrop = (evt) => {
    evt.preventDefault();
    const files = Array.from(evt.dataTransfer.files || []);
    addFiles(files);
  };

  const addFiles = (files) => {
    const accepted = files.filter(f => f.type.startsWith('image/'));
    const mapped = accepted.map(file => ({ file, url: URL.createObjectURL(file) }));
    setImages(prev => [...prev, ...mapped]);
  };

  const handleFileInput = (evt) => {
    addFiles(Array.from(evt.target.files || []));
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const addMemberRow = () => {
    // When adding a member, set defaults based on current apparel type
    const newMember = { ...initialMember };
    const isUniforms = apparelType === 'uniforms';
    const isHoodie = apparelType === 'hoodie';
    const isLongSleeves = apparelType === 'longsleeves';
    const isTShirt = apparelType === 'tshirt';
    
    if (isUniforms || isHoodie || isLongSleeves || isTShirt) {
      newMember.cutType = ''; // No cut type for uniforms, hoodies, long sleeves, or T-shirts
    }
    
    if (!isUniforms) {
      newMember.knittedOption = ''; // No knitted option for non-uniforms
    }
    
    // For uniforms, ensure fabric is valid
    if (isUniforms) {
      const uniformFabrics = ['Lacoste', 'Drifit', 'Polydex'];
      if (!uniformFabrics.includes(newMember.fabricOption)) {
        newMember.fabricOption = 'Polydex';
      }
    }
    
    // For hoodies, long sleeves, and T-shirts, clear shorts size (no shorts for these items)
    if (isHoodie || isLongSleeves || isTShirt) {
      newMember.shortsSize = '';
    }
    
    setMembers(prev => [...prev, newMember]);
    console.log('✅ New team member row added');
  };
  
  const removeMemberRow = (index) => {
    setMembers(prev => prev.filter((_, i) => i !== index));
    console.log('✅ Team member row removed');
  };
  
  const updateMember = (index, field, value) => {
    setMembers(prev => prev.map((m, i) => {
      if (i === index) {
        // Clear sizes when switching sizing type and set new defaults
        if (field === 'sizingType') {
          const isHoodieOrLongSleeves = apparelType === 'hoodie' || apparelType === 'longsleeves';
          const isTShirt = apparelType === 'tshirt';
          const memberJerseyType = (isHoodieOrLongSleeves || isTShirt) ? 'shirt' : (m.jerseyType || 'full');
          const memberShirtSizes = value === 'kids' ? kidsSizes : adultSizes;
          const memberShortSizes = value === 'kids' ? kidsSizes : adultSizes;
          const defaultShirtSize = memberShirtSizes.length > 0 ? memberShirtSizes[Math.floor(memberShirtSizes.length / 2)] : 'M';
          const defaultShortSize = memberShortSizes.length > 0 ? memberShortSizes[Math.floor(memberShortSizes.length / 2)] : 'M';
          
          const updated = { ...m, [field]: value };
          
          // Set defaults based on jerseyType (or treat hoodies/long sleeves/T-shirts as shirt-only)
          if (memberJerseyType === 'full') {
            updated.size = defaultShirtSize;
            updated.shortsSize = (isHoodieOrLongSleeves || isTShirt) ? '' : defaultShortSize;
          } else if (memberJerseyType === 'shirt') {
            updated.size = defaultShirtSize;
            updated.shortsSize = '';
          } else if (memberJerseyType === 'shorts') {
            updated.size = '';
            updated.shortsSize = defaultShortSize;
          } else {
            updated.size = '';
            updated.shortsSize = '';
          }
          
          // Clear shorts size for hoodies, long sleeves, and T-shirts
          if (isHoodieOrLongSleeves || isTShirt) {
            updated.shortsSize = '';
          }
          
          return updated;
        }
        // Handle jerseyType changes - clear sizes based on type and set defaults
        // Note: jerseyType is not applicable for hoodies, long sleeves, and T-shirts
        if (field === 'jerseyType') {
          const isHoodieOrLongSleeves = apparelType === 'hoodie' || apparelType === 'longsleeves';
          const isTShirt = apparelType === 'tshirt';
          if (isHoodieOrLongSleeves || isTShirt) {
            // Don't allow jerseyType changes for hoodies/long sleeves/T-shirts
            return m;
          }
          
          console.log(`🔄 Updating member ${index} jerseyType to: "${value}"`);
          const memberSizingType = m.sizingType || 'adults';
          const memberShirtSizes = memberSizingType === 'kids' ? kidsSizes : adultSizes;
          const memberShortSizes = memberSizingType === 'kids' ? kidsSizes : adultSizes;
          const defaultShirtSize = memberShirtSizes.length > 0 ? memberShirtSizes[Math.floor(memberShirtSizes.length / 2)] : 'M';
          const defaultShortSize = memberShortSizes.length > 0 ? memberShortSizes[Math.floor(memberShortSizes.length / 2)] : 'M';
          
          const updated = { ...m, [field]: value };
          if (value === 'shirt') {
            updated.shortsSize = '';
            // Auto-set default shirt size if not set
            if (!updated.size?.trim()) {
              updated.size = defaultShirtSize;
              console.log(`  ✅ Auto-set default shirt size: ${defaultShirtSize}`);
            }
            console.log(`  ✅ Cleared shortsSize for shirt-only order`);
          } else if (value === 'shorts') {
            updated.size = '';
            // Auto-set default shorts size if not set
            if (!updated.shortsSize?.trim()) {
              updated.shortsSize = defaultShortSize;
              console.log(`  ✅ Auto-set default shorts size: ${defaultShortSize}`);
            }
            console.log(`  ✅ Cleared size for shorts-only order`);
          } else if (value === 'full') {
            // Auto-set default sizes for full set if not set
            if (!updated.size?.trim()) {
              updated.size = defaultShirtSize;
              console.log(`  ✅ Auto-set default shirt size: ${defaultShirtSize}`);
            }
            if (!updated.shortsSize?.trim()) {
              updated.shortsSize = defaultShortSize;
              console.log(`  ✅ Auto-set default shorts size: ${defaultShortSize}`);
            }
          }
          return updated;
        }
        return { ...m, [field]: value };
      }
      return m;
    }));
  };

  const toggleMemberExpanded = (memberIndex) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberIndex)) {
        newSet.delete(memberIndex);
      } else {
        newSet.add(memberIndex);
      }
      return newSet;
    });
  };

  // Load provinces on mount
  useEffect(() => {
    if (isOpen) {
      const provincesList = getProvinces();
      setProvinces(provincesList);
      if (user) {
        checkUserAddress();
      }
    }
  }, [isOpen, user]);

  // Clear cutType and knittedOption when apparel type changes
  useEffect(() => {
    if (apparelType) {
      const isUniforms = apparelType === 'uniforms';
      const isHoodie = apparelType === 'hoodie';
      const isLongSleeves = apparelType === 'longsleeves';
      const isTShirt = apparelType === 'tshirt';
      
      // Clear cutType for uniforms, hoodies, long sleeves, and T-shirts
      if (isUniforms || isHoodie || isLongSleeves || isTShirt) {
        setMembers(prev => prev.map(member => ({
          ...member,
          cutType: '', // Clear cut type
          knittedOption: isUniforms ? member.knittedOption : '', // Only keep knitted option for uniforms
          // For hoodies, long sleeves, and T-shirts, clear shorts size (no shorts for these items)
          shortsSize: (isHoodie || isLongSleeves || isTShirt) ? '' : member.shortsSize
        })));
      } else {
        // Set default cut type for other apparel types
        setMembers(prev => prev.map(member => ({
          ...member,
          cutType: member.cutType || 'Normal Cut',
          knittedOption: '' // Clear knitted option for non-uniforms
        })));
      }

      // Reset fabric option to default if current selection is not available for uniforms
      if (isUniforms) {
        setMembers(prev => prev.map(member => {
          const currentFabric = member.fabricOption || 'Polydex';
          const uniformFabrics = ['Lacoste', 'Drifit', 'Polydex'];
          if (!uniformFabrics.includes(currentFabric)) {
            return { ...member, fabricOption: 'Polydex' };
          }
          return member;
        }));
      }
    }
  }, [apparelType]);

  // Filter cities by selected province
  useEffect(() => {
    if (newAddress.province) {
      const cities = getCitiesByProvince(newAddress.province);
      setAvailableCities(cities);
      setNewAddress(prev => ({ ...prev, city: '', barangay: '' }));
      setAvailableBarangays([]);
    } else {
      setAvailableCities([]);
      setAvailableBarangays([]);
    }
  }, [newAddress.province]);

  // Filter barangays by selected city
  useEffect(() => {
    if (newAddress.province && newAddress.city) {
      const barangays = getBarangaysByCity(newAddress.province, newAddress.city);
      setAvailableBarangays(barangays);
      setNewAddress(prev => ({ ...prev, barangay: '' }));
    } else {
      setAvailableBarangays([]);
    }
  }, [newAddress.province, newAddress.city]);

  // Ensure delivery address is set when switching to delivery mode and address is selected
  useEffect(() => {
    if (shippingMethod === 'delivery' && selectedAddressId && allAddresses.length > 0) {
      const selectedAddress = allAddresses.find(addr => addr.id === selectedAddressId);
      if (selectedAddress) {
        // Always sync when switching to delivery to ensure address is set
        // Use functional update to avoid dependency on deliveryAddress
        setDeliveryAddress(prev => {
          // Only update if address is missing or different
          if (!prev.address || 
              !prev.receiver || 
              !prev.phone ||
              prev.address !== selectedAddress.address ||
              prev.receiver !== selectedAddress.full_name ||
              prev.phone !== selectedAddress.phone) {
            console.log('🔄 Syncing delivery address from selected address:', selectedAddress);
            return {
              address: selectedAddress.address || '',
              receiver: selectedAddress.full_name || '',
              phone: selectedAddress.phone || '',
              province: selectedAddress.province || '',
              city: selectedAddress.city || '',
              barangay: selectedAddress.barangay || '',
              postalCode: selectedAddress.postal_code || '',
              streetAddress: selectedAddress.street_address || ''
            };
          }
          return prev;
        });
      }
    }
  }, [shippingMethod, selectedAddressId, allAddresses]);

  // Auto-set default sizes when member customization is expanded and sizes are missing
  useEffect(() => {
    setMembers(prev => prev.map((m, idx) => {
      const isExpanded = expandedMembers.has(idx);
      if (!isExpanded) return m; // Only process expanded members
      
      const memberJerseyType = m.jerseyType || 'full';
      const memberSizingType = m.sizingType || 'adults';
      const memberShirtSizes = memberSizingType === 'kids' ? kidsSizes : adultSizes;
      const memberShortSizes = memberSizingType === 'kids' ? kidsSizes : adultSizes;
      const defaultShirtSize = memberShirtSizes.length > 0 ? memberShirtSizes[Math.floor(memberShirtSizes.length / 2)] : 'M';
      const defaultShortSize = memberShortSizes.length > 0 ? memberShortSizes[Math.floor(memberShortSizes.length / 2)] : 'M';
      
      // For hoodies, long sleeves, and T-shirts, always show shirt size (no jersey type)
      const isHoodieOrLongSleeves = apparelType === 'hoodie' || apparelType === 'longsleeves';
      const isTShirt = apparelType === 'tshirt';
      const effectiveJerseyType = (isHoodieOrLongSleeves || isTShirt) ? 'shirt' : memberJerseyType;
      
      const updated = { ...m };
      let changed = false;
      
      // Auto-set shirt size if needed (for full set, shirt only, or hoodies/long sleeves/T-shirts)
      if ((effectiveJerseyType === 'full' || effectiveJerseyType === 'shirt' || isHoodieOrLongSleeves || isTShirt) && !m.size?.trim()) {
        updated.size = defaultShirtSize;
        changed = true;
      }
      
      // Auto-set shorts size if needed (for full set or shorts only, but not for hoodies/long sleeves/T-shirts)
      if ((effectiveJerseyType === 'full' || effectiveJerseyType === 'shorts') && !isHoodieOrLongSleeves && !isTShirt && !m.shortsSize?.trim()) {
        updated.shortsSize = defaultShortSize;
        changed = true;
      }
      
      // Clear shorts size for T-shirts
      if (isTShirt && m.shortsSize) {
        updated.shortsSize = '';
        changed = true;
      }
      
      // Clear shorts size for hoodies and long sleeves
      if (isHoodieOrLongSleeves && m.shortsSize) {
        updated.shortsSize = '';
        changed = true;
      }
      
      return changed ? updated : m;
    }));
  }, [expandedMembers, apparelType]); // Add apparelType dependency

  // Check for user address when modal opens
  const checkUserAddress = async () => {
    if (!user) return;
    try {
      const addresses = await userService.getUserAddresses();
      if (addresses && addresses.length > 0) {
        setAllAddresses(addresses);
        setHasAddress(true);
        setShowAddressForm(false);
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
          // Sync with client info
          setClientName(defaultAddress.full_name || '');
          setPhone(defaultAddress.phone || '');
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
    let processedValue = value;
    if (name === 'postalCode') {
      processedValue = value.replace(/[^0-9]/g, '');
    }
    setNewAddress(prev => ({
      ...prev,
      [name]: processedValue
    }));
    // Sync with client info for name and phone
    if (name === 'fullName') {
      setClientName(processedValue);
    } else if (name === 'phone') {
      setPhone(processedValue);
      // Real-time validation for phone
      if (processedValue.trim() && !/^\+?[0-9\-()\s]{7,}$/.test(processedValue)) {
        setInstantErrors(prev => ({ ...prev, phone: 'Invalid phone format' }));
      } else {
        setInstantErrors(prev => ({ ...prev, phone: '' }));
      }
    }
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
    if (newAddress.phone && !/^[\d\s\-+()]+$/.test(newAddress.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    if (newAddress.postalCode && !/^\d+$/.test(newAddress.postalCode)) {
      errors.postalCode = 'Postal code must contain only numbers';
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
          city: newAddress.city,
          province: newAddress.province,
          postalCode: newAddress.postalCode,
          address: `${newAddress.streetAddress}, ${newAddress.barangay}, ${newAddress.city}, ${newAddress.province} ${newAddress.postalCode}`
        };
        if (editingAddressId) {
          await userService.updateUserAddress(editingAddressId, addressData);
        } else {
          await userService.saveUserAddress(addressData);
        }
        // Sync with client info
        setClientName(newAddress.fullName);
        setPhone(newAddress.phone);
        await checkUserAddress();
        setShowAddressForm(false);
        setEditingAddressId(null);
      } catch (error) {
        console.error('Failed to save address:', error.message);
        alert('Failed to save address. Please try again.');
      }
    }
  };

  const handleChangeAddress = (address = null) => {
    setShowAddressForm(true);
    if (address) {
      setEditingAddressId(address.id);
    }
    const addressToEdit = address || { address: deliveryAddress.address, full_name: deliveryAddress.receiver, phone: deliveryAddress.phone };
    let streetAddress = addressToEdit.street_address || '';
    let barangay = addressToEdit.barangay || '';
    let city = addressToEdit.city || '';
    let province = addressToEdit.province || '';
    let postalCode = addressToEdit.postal_code || '';
    if (!streetAddress && !barangay && !city && !province) {
      const addressString = addressToEdit.address || '';
      const addressParts = addressString.split(', ').map(part => part.trim());
      if (addressParts.length >= 5) {
        streetAddress = addressParts[0] || '';
        barangay = addressParts[1] || '';
        city = addressParts[2] || '';
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
    // Sync with client info
    setClientName(addressToEdit.full_name || '');
    setPhone(addressToEdit.phone || '');
  };

  const handleDeleteAddress = (addressId) => {
    setAddressToDelete(addressId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return;
    
      try {
      await userService.deleteUserAddress(addressToDelete);
        await checkUserAddress();
      if (selectedAddressId === addressToDelete) {
          setSelectedAddressId(null);
          setDeliveryAddress({
            address: '',
            receiver: '',
            phone: ''
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

  const resetForm = () => {
    // Pre-populate with user data if logged in
    setClientName(user?.user_metadata?.full_name || '');
    // Email is automatically taken from logged-in user, no need to set state
    setPhone('');
    setTeamName('');
    setApparelType('');
    setImages([]);
    // Reset members - also clear knittedOption
    setMembers([{ ...initialMember, knittedOption: '', cutType: 'Normal Cut' }]);
    setPickupBranchId('');
    setShippingMethod('pickup');
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
    setOrderNotes(''); // Reset notes
    setValidationMessage(null);
    setShowSummary(false);
    setShowErrors(false); // Reset error display
    setInstantErrors({}); // Reset instant validation errors
    setExpandedMembers(new Set());
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is logged in
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    
    // Clear instant errors and show submit errors
    setInstantErrors({});
    setShowErrors(true);
    
    // Debug: Log validation state
    console.log('🔍 Validation check:', {
      hasErrors,
      errors,
      shippingMethod,
      selectedAddressId,
      hasAddress,
      deliveryAddress,
      pickupBranchId,
      clientName: !!clientName.trim(),
      email: !!user?.email,
      phone: !!phone.trim(),
      teamName: !!teamName.trim(),
      apparelType: !!apparelType,
      membersCount: members.length
    });
    
    // Check for errors before submission
    if (hasErrors) {
      console.log('❌ Validation errors found:', errors);
      // Scroll to top to show inline errors
      document.querySelector('.cdfm-form')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add form fields
      formData.append('clientName', clientName);
      // Use logged-in user's email automatically
      formData.append('email', user?.email || '');
      formData.append('phone', phone);
      formData.append('teamName', teamName);
      formData.append('apparelType', apparelType);
      formData.append('members', JSON.stringify(members));
      formData.append('shippingMethod', shippingMethod);
      formData.append('pickupBranchId', pickupBranchId);
      // Get full address details if an address is selected
      let fullDeliveryAddress = deliveryAddress;
      if (shippingMethod === 'delivery' && selectedAddressId) {
        const selectedAddress = allAddresses.find(addr => addr.id === selectedAddressId);
        if (selectedAddress) {
          fullDeliveryAddress = {
            address: selectedAddress.address,
            receiver: selectedAddress.full_name,
            phone: selectedAddress.phone,
            province: selectedAddress.province,
            city: selectedAddress.city,
            barangay: selectedAddress.barangay,
            postalCode: selectedAddress.postal_code,
            streetAddress: selectedAddress.street_address
          };
        }
      } else if (shippingMethod === 'delivery' && newAddress.province && newAddress.city) {
        // If using a new address from the form
        fullDeliveryAddress = {
          address: `${newAddress.streetAddress}, ${newAddress.barangay}, ${newAddress.city}, ${newAddress.province} ${newAddress.postalCode}`,
          receiver: newAddress.fullName,
          phone: newAddress.phone,
          province: newAddress.province,
          city: newAddress.city,
          barangay: newAddress.barangay,
          postalCode: newAddress.postalCode,
          streetAddress: newAddress.streetAddress
        };
      }
      formData.append('deliveryAddress', shippingMethod === 'delivery' ? JSON.stringify(fullDeliveryAddress) : '');
      formData.append('orderNotes', orderNotes);
      
      // Add user ID if logged in
      if (user?.id) {
        formData.append('userId', user.id);
      }
      
      // Add design images if any
      images.forEach((image, index) => {
        if (image.file) {
          formData.append('designImages', image.file);
        }
      });
      
      // Submit to backend
      const response = await fetch(`${API_URL}/api/custom-design`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit custom design order');
      }
      
      // Show confirmation with real order data
      setConfirmation({ 
        reference: result.order.order_number, 
        shippingMethod: shippingMethod,
        pickup: shippingMethod === 'pickup' ? branches.find(b => b.id === pickupBranchId)?.name : null,
        deliveryAddress: shippingMethod === 'delivery' ? deliveryAddress.address : null,
        deliveryFee: shippingMethod === 'delivery' ? DELIVERY_FEE : 0,
        emailSent: result.emailSent,
        emailQueued: result.emailQueued
      });
      
      // Clear the form after successful submission
      resetForm();
    } catch (error) {
      console.error('Custom design submission error:', error);
      setValidationMessage({
        type: 'error',
        message: error.message || 'Failed to submit custom design order. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cdfm-overlay" onClick={onClose}>
      <div className="cdfm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cdfm-header">
          <h2 className="cdfm-title">Custom Design Order</h2>
          <button className="cdfm-close" onClick={onClose} aria-label="Close">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <form className="cdfm-form" onSubmit={handleSubmit}>
          {/* Delivery Information */}
          <section className="cdfm-card">
            <div className="cdfm-section-header">
              <div className="cdfm-section-header-left">
                <FaTruck className="cdfm-section-icon" />
                <h3 className="cdfm-section-title">DELIVERY INFORMATION</h3>
              </div>
              {hasAddress && !showAddressForm && (
                <button 
                  type="button"
                  className="cdfm-add-address-header-btn"
                  onClick={() => setShowAddressForm(true)}
                >
                  Add Address
                </button>
              )}
            </div>
            
            {(!hasAddress || showAddressForm) ? (
              showAddressForm ? (
                /* Address Input Form */
                <div className="cdfm-address-form">
                  <div className="cdfm-form-header">
                    <div className="cdfm-form-header-top">
                      <div className="cdfm-form-header-title">
                        <h4>{editingAddressId ? 'Edit Delivery Information' : 'Add Delivery Information'}</h4>
                        <p>Please provide your delivery information</p>
                      </div>
                      <button 
                        type="button"
                        className="cdfm-back-address-btn"
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
                        <FontAwesomeIcon icon={faArrowLeft} />
                        <span>Back</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="cdfm-address-form-fields">
                    <div className="cdfm-form-group">
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
                        <span className="cdfm-error-message">{addressErrors.fullName}</span>
                      )}
                    </div>
                    
                    <div className="cdfm-form-group">
                      <input
                        type="tel"
                        name="phone"
                        value={newAddress.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d\s\-+]/g, '');
                          handleAddressInputChange({ target: { name: 'phone', value } });
                        }}
                        className={addressErrors.phone ? 'error' : ''}
                        placeholder="Phone Number"
                        maxLength={30}
                      />
                      {addressErrors.phone && (
                        <span className="cdfm-error-message">{addressErrors.phone}</span>
                      )}
                    </div>
                    
                    <div className="cdfm-form-group">
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
                      {addressErrors.province && (
                        <span className="cdfm-error-message">{addressErrors.province}</span>
                      )}
                    </div>
                    <div className="cdfm-form-group">
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
                      {addressErrors.city && (
                        <span className="cdfm-error-message">{addressErrors.city}</span>
                      )}
                    </div>
                    <div className="cdfm-form-group">
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
                      {addressErrors.barangay && (
                        <span className="cdfm-error-message">{addressErrors.barangay}</span>
                      )}
                    </div>
                    
                    <div className="cdfm-form-group">
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
                        <span className="cdfm-error-message">{addressErrors.postalCode}</span>
                      )}
                    </div>
                    
                    <div className="cdfm-form-group">
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
                        <span className="cdfm-error-message">{addressErrors.streetAddress}</span>
                      )}
                    </div>
                  </div>

                  <div className="cdfm-form-actions">
                    <button 
                      type="button"
                      className="cdfm-save-address-btn"
                      onClick={handleSaveAddress}
                    >
                      Save & Continue
                    </button>
                  </div>
                </div>
              ) : (
                /* No Address Yet */
                <div className="cdfm-no-address-section">
                  <div className="cdfm-no-address-content">
                    <div className="cdfm-no-address-icon"><FaMapMarkerAlt /></div>
                    <div className="cdfm-no-address-text">
                      <h4>No delivery information yet</h4>
                      <p>Please add your delivery information to continue</p>
                    </div>
                    <button 
                      type="button"
                      className="cdfm-add-address-btn"
                      onClick={() => setShowAddressForm(true)}
                    >
                      Add Information
                    </button>
                  </div>
                </div>
              )
            ) : (
              /* Existing Addresses Display */
              <div className="cdfm-addresses-list">
                {allAddresses.map((address) => (
                  <div 
                    key={address.id} 
                    className={`cdfm-address-card ${selectedAddressId === address.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedAddressId(address.id);
                      setDeliveryAddress({
                        address: address.address,
                        receiver: address.full_name,
                        phone: address.phone,
                        province: address.province,
                        city: address.city,
                        barangay: address.barangay,
                        postalCode: address.postal_code,
                        streetAddress: address.street_address
                      });
                      // Sync with client info
                      setClientName(address.full_name || '');
                      setPhone(address.phone || '');
                    }}
                  >
                    <div className="cdfm-address-card-content">
                      <div className="cdfm-address-header">
                        <div className="cdfm-location-icon">
                          <FaMapMarkerAlt />
                        </div>
                        <div className="cdfm-receiver-info">
                          <div className="cdfm-receiver-name">{address.full_name}</div>
                          <div className="cdfm-receiver-phone">{address.phone}</div>
                        </div>
                        <div className="cdfm-address-actions">
                          <button 
                            type="button"
                            className="cdfm-edit-address-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAddressId(address.id);
                              handleChangeAddress(address);
                            }}
                          >
                            Edit
                          </button>
                          <button 
                            type="button"
                            className="cdfm-delete-address-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAddress(address.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="cdfm-address-details">
                        <div className="cdfm-address-line">{address.address}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Show error if delivery selected but no address */}
            {showErrors && errors.deliveryAddress && shippingMethod === 'delivery' && (
              <div className="cdfm-error-message" style={{ 
                display: 'block', 
                marginTop: '12px', 
                padding: '12px', 
                backgroundColor: 'rgba(255, 68, 68, 0.1)', 
                borderLeft: '4px solid #ff4444', 
                color: '#ff4444', 
                fontSize: '14px',
                borderRadius: '4px'
              }}>
                {errors.deliveryAddress}
              </div>
            )}
          </section>

          {/* Apparel Type */}
          <section className="cdfm-card">
            <h3 className="cdfm-card-title">Apparel Type</h3>
            <div className="cdfm-field">
              <label>Select Apparel Type <span className="cdfm-required">*</span></label>
              <div className="cdfm-input-wrapper">
                <select
                  className={showErrors && errors.apparelType ? 'error' : ''}
                  value={apparelType}
                  onChange={(e) => {
                    setApparelType(e.target.value);
                    // Clear error when user selects an option
                    if (showErrors && e.target.value) {
                      setShowErrors(false);
                    }
                  }}
                >
                  <option value="">Select Apparel Type</option>
                  <option value="basketball_jersey">Basketball Jersey</option>
                  <option value="volleyball_jersey">Volleyball Jersey</option>
                  <option value="hoodie">Hoodie</option>
                  <option value="tshirt">T-shirt</option>
                  <option value="longsleeves">Long Sleeves</option>
                  <option value="uniforms">Uniforms</option>
                </select>
                {showErrors && errors.apparelType && <span className="cdfm-inline-error">{errors.apparelType}</span>}
              </div>
            </div>
          </section>

          {/* Team Details */}
          <section className="cdfm-card">
            <div className="cdfm-card-title-row">
              <h3 className="cdfm-card-title">Team Details</h3>
              <span className="cdfm-char-count">{teamName.length}/50</span>
            </div>
            <div className="cdfm-field">
              <label>Team Name <span className="cdfm-required">*</span></label>
              <div className="cdfm-input-wrapper">
                <input 
                  className={showErrors && errors.teamName ? 'error' : ''} 
                  maxLength={50} 
                  value={teamName} 
                  onChange={(e) => {
                    setTeamName(e.target.value);
                    // Clear error when user starts typing
                    if (showErrors && e.target.value.trim()) {
                      setShowErrors(false);
                    }
                  }}
                  placeholder="Enter team name" 
                />
                {showErrors && errors.teamName && <span className="cdfm-inline-error">{errors.teamName}</span>}
              </div>
            </div>
          </section>

          {/* Image Upload */}
          <section className="cdfm-card">
            <h3 className="cdfm-card-title">Design Image Upload</h3>
            <div className="cdfm-cust-upload-area"
                 onDrop={handleDrop}
                 onDragOver={(e) => e.preventDefault()}>
              <input id="cdfm-cust-file-input" type="file" accept="image/*" multiple onChange={handleFileInput} />
              <label htmlFor="cdfm-cust-file-input" className="cdfm-cust-upload-label">
                <div className="cdfm-cust-upload-icon-wrapper">
                  <FaCloudUploadAlt className="cdfm-cust-upload-icon" />
                </div>
                <div className="cdfm-cust-upload-text">
                  <span className="cdfm-cust-upload-text-primary">Drag a file here</span>
                  <span className="cdfm-cust-upload-text-secondary">or browse a file to upload</span>
                </div>
              </label>
            </div>
            {images.length > 0 && (
              <div className="cdfm-cust-preview-grid">
                {images.map((img, i) => (
                  <div key={i} className="cdfm-cust-preview-item">
                    <img src={img.url} alt={`design-${i}`} />
                    <button type="button" className="cdfm-cust-delete-thumb" onClick={() => removeImage(i)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Team Members Roster */}
          <section className="cdfm-card">
            <div className="cdfm-card-title-row">
              <h3 className="cdfm-card-title">Team Members Roster</h3>
              <button type="button" className="cdfm-add-row" onClick={addMemberRow} aria-label="Add Team Member" title="Add Team Member">
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
            <div className="cdfm-members-roster">
              {members.map((m, idx) => {
                const isExpanded = expandedMembers.has(idx);
                const memberJerseyType = m.jerseyType || 'full';
                const memberSizingType = m.sizingType || 'adults';
                const memberFabricOption = m.fabricOption || 'Polydex';
                const memberCutType = m.cutType || 'Normal Cut';
                const memberKnittedOption = m.knittedOption || '';
                
                // Determine if this is uniforms, hoodie, long sleeves, or T-shirt
                const isUniforms = apparelType === 'uniforms';
                const isHoodie = apparelType === 'hoodie';
                const isLongSleeves = apparelType === 'longsleeves';
                const isTShirt = apparelType === 'tshirt';
                
                // Calculate member price
                // Base prices
                let basePrice = 0;
                // For hoodies, long sleeves, and T-shirts, they don't have jersey type, so use shirt-only pricing
                const effectiveJerseyType = (isHoodie || isLongSleeves || isTShirt) ? 'shirt' : memberJerseyType;
                
                if (memberSizingType === 'kids') {
                  // Kids: ₱850 full set, ₱450 shirt only, ₱400 shorts only
                  if (effectiveJerseyType === 'full') basePrice = 850;
                  else if (effectiveJerseyType === 'shirt') basePrice = 450;
                  else if (effectiveJerseyType === 'shorts') basePrice = 400;
                } else {
                  // Adult: ₱950 full set, ₱500 shirt only, ₱450 shorts only
                  if (effectiveJerseyType === 'full') basePrice = 950;
                  else if (effectiveJerseyType === 'shirt') basePrice = 500;
                  else if (effectiveJerseyType === 'shorts') basePrice = 450;
                }
                
                // Size surcharge (₱50 for 2XL-8XL, regardless of jersey type)
                // For hoodies, long sleeves, and T-shirts, only check shirt size (no shorts)
                let sizeSurcharge = 0;
                const shirtSize = m.size || '';
                const shortsSize = (isHoodie || isLongSleeves || isTShirt) ? '' : (m.shortsSize || '');
                if (surchargeSizes.includes(shirtSize) || surchargeSizes.includes(shortsSize)) {
                  sizeSurcharge = 50; // Only one surcharge regardless of how many sizes qualify
                }
                
                // Fabric surcharge - filter fabric options based on apparel type
                // For uniforms: only Lacoste, Drifit, Polydex
                let availableFabrics = fabricOptions;
                if (isUniforms) {
                  availableFabrics = fabricOptions.filter(f => 
                    ['Lacoste', 'Drifit', 'Polydex'].includes(f.name)
                  );
                }
                const fabricOption = availableFabrics.find(f => f.name === memberFabricOption);
                const fabricSurcharge = fabricOption ? fabricOption.surcharge : 0;
                
                // Cut type surcharge - not available for uniforms, hoodies, or long sleeves
                let cutTypeSurcharge = 0;
                if (!isUniforms && !isHoodie && !isLongSleeves) {
                  const cutTypeOption = cutTypeOptions.find(c => c.name === memberCutType);
                  cutTypeSurcharge = cutTypeOption ? cutTypeOption.surcharge : 0;
                }
                
                // Knitted option surcharge (only for uniforms)
                let knittedSurcharge = 0;
                if (isUniforms && memberKnittedOption) {
                  const knittedOption = knittedOptions.find(k => k.name === memberKnittedOption);
                  knittedSurcharge = knittedOption ? knittedOption.surcharge : 0;
                }
                
                // Custom design fee
                const customDesignFee = 200;
                
                // Total member price
                const memberPrice = basePrice + sizeSurcharge + fabricSurcharge + cutTypeSurcharge + knittedSurcharge + customDesignFee;
                
                return (
                  <div key={idx} className="cdfm-member-card">
                    <div className="cdfm-member-header">
                      <div className="cdfm-member-tag-wrapper">
                        <div className="cdfm-member-tag">
                          Member {idx + 1}
                        </div>
                        <div className="cdfm-member-price">
                          ₱{memberPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`cdfm-member-toggle-btn ${isExpanded ? 'cdfm-member-toggle-btn-expanded' : ''}`}
                        onClick={() => toggleMemberExpanded(idx)}
                        title={isExpanded ? "Collapse details" : "Expand details"}
                      >
                        <span className="cdfm-member-toggle-label">Customize</span>
                        <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
                      </button>
                    </div>
                    <div className="cdfm-member-row-row-1">
                      <div className="cdfm-input-wrapper cdfm-member-wrapper">
                        <input
                          type="text"
                          placeholder="Surname"
                          value={m.surname}
                          onChange={(e) => {
                            updateMember(idx, 'surname', e.target.value);
                            if (showErrors && e.target.value.trim()) {
                              setShowErrors(false);
                            }
                          }}
                          className={`cdfm-member-input ${showErrors && errors[`member_surname_${idx}`] ? 'error' : ''}`}
                        />
                        {showErrors && errors[`member_surname_${idx}`] && (
                          <span className="cdfm-error-message">{errors[`member_surname_${idx}`]}</span>
                        )}
                      </div>
                      <div className="cdfm-input-wrapper cdfm-member-wrapper">
                        <input
                          type="text"
                          placeholder="Jersey No."
                          value={m.number}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d]/g, '');
                            updateMember(idx, 'number', value);
                            if (showErrors && value.trim()) {
                              setShowErrors(false);
                            }
                          }}
                          className={`cdfm-member-input cdfm-number-input ${showErrors && errors[`member_number_${idx}`] ? 'error' : ''}`}
                        />
                        {showErrors && errors[`member_number_${idx}`] && (
                          <span className="cdfm-error-message">{errors[`member_number_${idx}`]}</span>
                        )}
                      </div>
                      {members.length > 1 && (
                        <button 
                          type="button"
                          className="cdfm-remove-member-button"
                          onClick={() => removeMemberRow(idx)}
                          title="Remove Team Member"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      )}
                    </div>
                    {/* Per-Member Customization Section */}
                    {isExpanded && (
                      <div className="cdfm-member-customization-section">
                        {/* Jersey Type Selector - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                        {apparelType !== 'uniforms' && apparelType !== 'hoodie' && apparelType !== 'longsleeves' && apparelType !== 'tshirt' && (
                          <div className="cdfm-member-customization-group">
                            <label className="cdfm-member-customization-label">Jersey Type</label>
                            <div className="cdfm-member-jersey-type-buttons">
                              <button
                                type="button"
                                className={`cdfm-member-jersey-type-btn ${memberJerseyType === 'full' ? 'active' : ''}`}
                                onClick={() => {
                                  updateMember(idx, 'jerseyType', 'full');
                                  if (showErrors) setShowErrors(false);
                                }}
                              >
                                Full Set
                              </button>
                              <button
                                type="button"
                                className={`cdfm-member-jersey-type-btn ${memberJerseyType === 'shirt' ? 'active' : ''}`}
                                onClick={() => {
                                  updateMember(idx, 'jerseyType', 'shirt');
                                  if (showErrors) setShowErrors(false);
                                }}
                              >
                                Shirt Only
                              </button>
                              <button
                                type="button"
                                className={`cdfm-member-jersey-type-btn ${memberJerseyType === 'shorts' ? 'active' : ''}`}
                                onClick={() => {
                                  updateMember(idx, 'jerseyType', 'shorts');
                                  if (showErrors) setShowErrors(false);
                                }}
                              >
                                Shorts Only
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Size Type Selector */}
                        <div className="cdfm-member-customization-group">
                          <label className="cdfm-member-customization-label">Size Type</label>
                          <div className="cdfm-member-size-type-buttons">
                            <button
                              type="button"
                              className={`cdfm-member-size-type-btn ${(m.sizingType || 'adults') === 'adults' ? 'active' : ''}`}
                              onClick={() => {
                                updateMember(idx, 'sizingType', 'adults');
                                if (showErrors) setShowErrors(false);
                              }}
                            >
                              Adult
                            </button>
                            <button
                              type="button"
                              className={`cdfm-member-size-type-btn ${(m.sizingType || 'adults') === 'kids' ? 'active' : ''}`}
                              onClick={() => {
                                updateMember(idx, 'sizingType', 'kids');
                                if (showErrors) setShowErrors(false);
                              }}
                            >
                              Kids
                            </button>
                          </div>
                        </div>

                        {/* Size Selectors - Based on member's jersey type and sizing type */}
                        <div className="cdfm-member-size-selectors">
                          {(() => {
                            const memberSizingType = m.sizingType || 'adults';
                            const memberShirtSizes = memberSizingType === 'kids' ? kidsSizes : adultSizes;
                            const memberShortSizes = memberSizingType === 'kids' ? kidsSizes : adultSizes;
                            // For hoodies, long sleeves, and T-shirts, only show shirt size (no shorts)
                            const isHoodieOrLongSleeves = apparelType === 'hoodie' || apparelType === 'longsleeves';
                            const isTShirt = apparelType === 'tshirt';

                            return (
                              <>
                                {/* Shirt Size - Show for full set, shirt only, or hoodies/long sleeves/T-shirts */}
                                {(memberJerseyType === 'full' || memberJerseyType === 'shirt' || isHoodieOrLongSleeves || isTShirt) && (
                                  <div className="cdfm-member-size-wrapper">
                                    <label className="cdfm-member-size-label">Shirt Size</label>
                                    <select
                                      value={m.size || (memberShirtSizes.length > 0 ? memberShirtSizes[Math.floor(memberShirtSizes.length / 2)] : 'M')}
                                      onChange={(e) => {
                                        updateMember(idx, 'size', e.target.value);
                                        if (showErrors && e.target.value) {
                                          setShowErrors(false);
                                        }
                                      }}
                                      className="cdfm-member-select"
                                    >
                                      {memberShirtSizes.map(size => {
                                        const hasSurcharge = surchargeSizes.includes(size);
                                        return (
                                          <option key={size} value={size}>
                                            {size} {hasSurcharge ? '(+₱50)' : ''}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                )}
                                {/* Short Size - Show for full set or shorts only (not for hoodies/long sleeves/T-shirts) */}
                                {(memberJerseyType === 'full' || memberJerseyType === 'shorts') && !isHoodieOrLongSleeves && !isTShirt && (
                                  <div className="cdfm-member-size-wrapper">
                                    <label className="cdfm-member-size-label">Short Size</label>
                                    <select
                                      value={m.shortsSize || (memberShortSizes.length > 0 ? memberShortSizes[Math.floor(memberShortSizes.length / 2)] : 'M')}
                                      onChange={(e) => {
                                        updateMember(idx, 'shortsSize', e.target.value);
                                        if (showErrors && e.target.value) {
                                          setShowErrors(false);
                                        }
                                      }}
                                      className="cdfm-member-select"
                                    >
                                      {memberShortSizes.map(size => {
                                        const hasSurcharge = surchargeSizes.includes(size);
                                        return (
                                          <option key={size} value={size}>
                                            {size} {hasSurcharge ? '(+₱50)' : ''}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        {/* Fabric Option and Cut Type in One Row */}
                        <div className="cdfm-fabric-cut-row">
                          {/* Fabric Option Selector */}
                          <div className="cdfm-member-customization-group">
                            <label className="cdfm-member-customization-label">Fabric Option</label>
                            <select
                              value={m.fabricOption || 'Polydex'}
                              onChange={(e) => {
                                updateMember(idx, 'fabricOption', e.target.value);
                                if (showErrors) setShowErrors(false);
                              }}
                              className="cdfm-member-select"
                            >
                              {(() => {
                                // Filter fabric options based on apparel type
                                // For uniforms: only Lacoste, Drifit, Polydex
                                let availableFabrics = fabricOptions;
                                if (apparelType === 'uniforms') {
                                  availableFabrics = fabricOptions.filter(f => 
                                    ['Lacoste', 'Drifit', 'Polydex'].includes(f.name)
                                  );
                                }
                                return availableFabrics.map(fabric => (
                                  <option key={fabric.name} value={fabric.name}>
                                    {fabric.name} {fabric.surcharge > 0 ? `(+₱${fabric.surcharge})` : ''}
                                  </option>
                                ));
                              })()}
                            </select>
                          </div>

                          {/* Cut Type Selector - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                          {apparelType !== 'uniforms' && apparelType !== 'hoodie' && apparelType !== 'longsleeves' && apparelType !== 'tshirt' && (
                            <div className="cdfm-member-customization-group">
                              <label className="cdfm-member-customization-label">Cut Type</label>
                              <select
                                value={m.cutType || 'Normal Cut'}
                                onChange={(e) => {
                                  updateMember(idx, 'cutType', e.target.value);
                                  if (showErrors) setShowErrors(false);
                                }}
                                className="cdfm-member-select"
                              >
                                {cutTypeOptions.map(cut => (
                                  <option key={cut.name} value={cut.name}>
                                    {cut.name} {cut.surcharge > 0 ? `(+₱${cut.surcharge})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Knitted Options - Only for uniforms */}
                          {apparelType === 'uniforms' && (
                            <div className="cdfm-member-customization-group">
                              <label className="cdfm-member-customization-label">Knitted Options</label>
                              <select
                                value={m.knittedOption || ''}
                                onChange={(e) => {
                                  updateMember(idx, 'knittedOption', e.target.value);
                                  if (showErrors) setShowErrors(false);
                                }}
                                className="cdfm-member-select"
                              >
                                <option value="">None</option>
                                {knittedOptions.map(knitted => (
                                  <option key={knitted.name} value={knitted.name}>
                                    {knitted.name} {knitted.surcharge > 0 ? `(+₱${knitted.surcharge})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Shipping Method and Notes Container */}
          <div className="cdfm-shipping-notes-container">
            {/* Shipping Method */}
            <section className="cdfm-card cdfm-shipping-section">
              <h3 className="cdfm-card-title">Shipping Method</h3>
              <div className="cdfm-field">
                <div className="cdfm-shipping-methods">
                  <button
                    type="button"
                    className={`cdfm-shipping-option ${shippingMethod === 'pickup' ? 'active' : ''}`}
                    onClick={() => setShippingMethod('pickup')}
                  >
                    <div className="cdfm-shipping-option-title">Store Pickup</div>
                    <div className="cdfm-shipping-option-desc">Free</div>
                  </button>
                  <button
                    type="button"
                    className={`cdfm-shipping-option ${shippingMethod === 'delivery' ? 'active' : ''}`}
                    onClick={() => setShippingMethod('delivery')}
                  >
                    <div className="cdfm-shipping-option-title">Delivery</div>
                    <div className="cdfm-shipping-option-desc">₱{DELIVERY_FEE}</div>
                  </button>
                </div>
              </div>
            </section>

            {/* Notes/Message Section */}
            <section className="cdfm-card cdfm-notes-section">
              <h3 className="cdfm-card-title">Notes/Message to Yohanns</h3>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Please Leave A Message ......"
                className="cdfm-notes-textarea"
                rows="4"
              />
            </section>
          </div>

          {/* Branch Location - Required for both pickup and delivery (COD) */}
          <section className="cdfm-card">
            <h3 className="cdfm-card-title">Select the Nearest Branch</h3>
            <div className="cdfm-field">
              <label>Select the nearest branch <span className="cdfm-required">*</span></label>
              <select
                className={`cdfm-field select ${showErrors && errors.pickup ? 'error' : ''}`}
                value={pickupBranchId}
                onChange={(e) => {
                  setPickupBranchId(e.target.value);
                  // Clear error when user selects a branch
                  if (showErrors && e.target.value) {
                    setShowErrors(false);
                  }
                }}
                >
                  <option value="">Choose the nearest branch</option>
                  {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {pickupBranchId && (
                <small className="cdfm-helper">{branches.find(b => b.id === pickupBranchId)?.address}</small>
              )}
              {showErrors && errors.pickup && (
                <span className="cdfm-inline-error">{errors.pickup}</span>
              )}
            </div>
          </section>


          {/* Summary */}
          <section className="cdfm-card">
            <button type="button" className="cdfm-summary-toggle" onClick={() => setShowSummary(s => !s)}>
              {showSummary ? 'Hide' : 'Show'} Order Summary
            </button>
            {showSummary && (
              <div className="cdfm-summary-content">
                <div><strong>Team Name:</strong> {teamName || '-'}</div>
                <div><strong>Team Members:</strong> {members.length} {members.length === 1 ? 'member' : 'members'}</div>
                <div><strong>Shipping:</strong> {shippingMethod === 'pickup' ? 'Store Pickup (Free)' : `Delivery (₱${DELIVERY_FEE})`}</div>
                <div><strong>Design Images:</strong> {images.length} {images.length === 1 ? 'image' : 'images'}</div>
              </div>
            )}
          </section>

          {/* Submit */}
          <div className="cdfm-submit-bar">
            <div className="cdfm-submit-bar-inner">
              <button 
                className="cdfm-submit-btn" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Order'}
              </button>
              {showErrors && hasErrors && (
                <span className="cdfm-submit-hint">Complete all required fields to submit</span>
              )}
            </div>
          </div>
        </form>

        {showLoginPrompt && (
          <div className="cdfm-confirm-overlay" onClick={() => setShowLoginPrompt(false)}>
            <div className="cdfm-confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="cdfm-confirm-icon warning" aria-hidden>
                <FontAwesomeIcon icon={faLock} />
              </div>
              <h3>Login Required</h3>
              <p>You need to be logged in to place a custom design order.</p>
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                Please log in to your account to continue with your custom design order.
              </p>
              <div className="cdfm-button-container">
                <button className="cdfm-cancel-button" onClick={() => setShowLoginPrompt(false)}>
                  Cancel
                </button>
                <button className="cdfm-login-button" onClick={() => { 
                  setShowLoginPrompt(false); 
                  onClose(); 
                  openSignIn(); 
                }}>
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Address Confirmation Modal - Black Theme */}
        {showDeleteConfirm && (
          <div className="cdfm-delete-confirm-overlay" onClick={cancelDeleteAddress}>
            <div className="cdfm-delete-confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="cdfm-delete-confirm-icon">
                <FontAwesomeIcon icon={faTrash} />
              </div>
              <h3 className="cdfm-delete-confirm-title">Delete Address?</h3>
              <p className="cdfm-delete-confirm-message">Are you sure you want to delete this address? This action cannot be undone.</p>
              <div className="cdfm-delete-confirm-actions">
                <button 
                  type="button"
                  className="cdfm-delete-confirm-no"
                  onClick={cancelDeleteAddress}
                >
                  No
                </button>
                <button 
                  type="button"
                  className="cdfm-delete-confirm-yes"
                  onClick={confirmDeleteAddress}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmation && (
          <div className="cdfm-confirm-overlay" onClick={() => setConfirmation(null)}>
            <div className="cdfm-confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="cdfm-confirm-icon success" aria-hidden>
                <FontAwesomeIcon icon={faCircleCheck} />
              </div>
              <h3>Custom Design Order Submitted!</h3>
              <p>Reference Number: <strong>{confirmation.reference}</strong></p>
              {confirmation.shippingMethod === 'pickup' && (
                <p>Pickup Location: <strong>{confirmation.pickup}</strong></p>
              )}
              {confirmation.shippingMethod === 'delivery' && (
                <>
                  <p>Delivery Address: <strong>{confirmation.deliveryAddress}</strong></p>
                  <p>Delivery Fee: <strong>₱{confirmation.deliveryFee}</strong></p>
                </>
              )}
              {(confirmation.emailSent !== undefined || confirmation.emailQueued !== undefined) && (() => {
                let emailStatusText = '';
                let emailStatusColor = '#FF9800';

                if (confirmation.emailSent) {
                  emailStatusText = '✅ Confirmation email sent';
                  emailStatusColor = '#4CAF50';
                } else if (confirmation.emailQueued) {
                  emailStatusText = '📨 Confirmation email is being sent. Please check your inbox shortly.';
                  emailStatusColor = '#1E88E5';
                } else {
                  emailStatusText = '⚠️ Email notification not available. Please contact support if you need a copy.';
                }

                return (
                  <p style={{ color: emailStatusColor }}>
                    {emailStatusText}
                  </p>
                );
              })()}
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                Our design team will contact you within 2-3 business days to discuss your custom design requirements.
              </p>
              <button onClick={() => { setConfirmation(null); onClose(); }}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


