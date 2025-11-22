import React, { useMemo, useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faXmark, faLock, faCircleCheck, faChevronDown, faChevronUp, faArrowLeft, faCloudUpload } from '@fortawesome/free-solid-svg-icons';
import { FaTruck, FaMapMarkerAlt, FaCloudUploadAlt } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import userService from '../../services/userService';
import { getProvinces, getCitiesByProvince, getBarangaysByCity } from '../../utils/locationData';
import SearchableSelect from '../common/SearchableSelect';
import './WalkInCustomOrder.css';

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
  { name: 'Square Mesh', surcharge: 100 }
];

// Cut type options
const cutTypeOptions = [
  { name: 'Normal Cut', surcharge: 0 }, // Default
  { name: 'NBA Cut', surcharge: 100 }
];

const getDefaultSize = (sizingType = 'adults') => {
  const sizes = sizingType === 'kids' ? kidsSizes : adultSizes;
  return sizes.length > 0 ? sizes[Math.floor(sizes.length / 2)] : 'M';
};

const initialMember = { 
  number: '', 
  surname: '', 
  size: getDefaultSize('adults'), // Set default size
  shortsSize: getDefaultSize('adults'), // Set default shorts size
  sizingType: 'adults',
  jerseyType: 'full', // 'full', 'shirt', 'shorts'
  fabricOption: 'Polydex', // Default fabric
  cutType: 'Normal Cut', // Default cut type
  apparelType: '' // 'basketball_jersey', 'volleyball_jersey', 'hoodie', 'tshirt', 'longsleeves', 'uniforms'
};

export default function WalkInCustomOrder({ onClose }) {
  const { user } = useAuth();
  const [clientName, setClientName] = useState('');
  const [email, setEmail] = useState('');
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
    email: '',
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
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email address';
    if (!phone.trim()) e.phone = 'Phone is required';
    else if (!/^\+?[0-9\-()\s]{7,}$/.test(phone)) e.phone = 'Enter a valid phone number';
    if (!teamName.trim()) e.teamName = 'Team name is required';
    if (!apparelType) e.apparelType = 'Apparel type is required';
    
    // Shipping method validation
    // Location is required for both pickup and delivery (COD)
    if (!pickupBranchId) {
      e.pickup = 'Please select a branch location';
    }
    if (shippingMethod === 'delivery' && (!deliveryAddress.address || !deliveryAddress.receiver || !deliveryAddress.phone)) {
      e.deliveryAddress = 'Delivery address is required';
    }

    // Roster validation
    const numbers = new Set();
    members.forEach((m, idx) => {
      // Handle jersey number - can be 0, so check if it's null/undefined/empty string, not falsy
      const memberNumber = m.number !== null && m.number !== undefined && m.number !== '' 
        ? String(m.number).trim() 
        : '';
      if (!memberNumber) {
        e[`member_number_${idx}`] = 'Required';
      }
      
      // Validate surname
      if (!m.surname || !String(m.surname).trim()) {
        e[`member_surname_${idx}`] = 'Required';
      }
      
      // Use top-level apparelType if member doesn't have one, or member's apparelType if set
      const memberApparelType = (m.apparelType && String(m.apparelType).trim()) || (apparelType && String(apparelType).trim());
      if (!memberApparelType) {
        e[`member_apparel_type_${idx}`] = 'Required';
      }
      
      // Validate sizes based on jerseyType (default to 'full' if not set)
      const jerseyType = m.jerseyType || 'full';
      const memberSizingType = m.sizingType || 'adults';
      
      if (jerseyType === 'full') {
        // Check if size exists and is not empty (handle null, undefined, empty string, but allow valid values)
        const memberSize = m.size !== null && m.size !== undefined && m.size !== '' ? String(m.size).trim() : '';
        const memberShortsSize = m.shortsSize !== null && m.shortsSize !== undefined && m.shortsSize !== '' ? String(m.shortsSize).trim() : '';
        
        if (!memberSize) {
          e[`member_size_${idx}`] = 'Required';
        }
        if (!memberShortsSize) {
          e[`member_shorts_size_${idx}`] = 'Required';
        }
      } else if (jerseyType === 'shirt') {
        const memberSize = m.size !== null && m.size !== undefined && m.size !== '' ? String(m.size).trim() : '';
        if (!memberSize) {
          e[`member_size_${idx}`] = 'Required';
        }
      } else if (jerseyType === 'shorts') {
        const memberShortsSize = m.shortsSize !== null && m.shortsSize !== undefined && m.shortsSize !== '' ? String(m.shortsSize).trim() : '';
        if (!memberShortsSize) {
          e[`member_shorts_size_${idx}`] = 'Required';
      }
      }
      
      // Validate sizing type
      if (!m.sizingType) {
        e[`member_sizing_type_${idx}`] = 'Required';
      }
      
      // Check for duplicate jersey numbers
      if (memberNumber) {
        if (numbers.has(memberNumber)) {
          e[`member_number_${idx}`] = 'Duplicate jersey number';
        }
        numbers.add(memberNumber);
      }
    });
    return e;
  }, [clientName, email, phone, teamName, apparelType, shippingMethod, pickupBranchId, deliveryAddress, members]);

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
    setMembers(prev => [...prev, { ...initialMember, apparelType: apparelType || initialMember.apparelType }]);
    console.log('✅ New team member row added');
  };
  
  const removeMemberRow = (index) => {
    setMembers(prev => prev.filter((_, i) => i !== index));
    console.log('✅ Team member row removed');
  };
  
  const updateMember = (index, field, value) => {
    setMembers(prev => prev.map((m, i) => {
      if (i === index) {
        // Clear sizes when switching sizing type and set defaults
        if (field === 'sizingType') {
          const newSizingType = value || m.sizingType || 'adults';
          const availableSizes = newSizingType === 'kids' ? kidsSizes : adultSizes;
          const defaultSize = availableSizes.length > 0 ? availableSizes[Math.floor(availableSizes.length / 2)] : 'M';
          const jerseyType = m.jerseyType || 'full';
          
          const updated = { ...m, [field]: value, size: '', shortsSize: '' };
          // Auto-set default sizes based on jersey type
          if (jerseyType === 'full' || jerseyType === 'shirt') {
            updated.size = defaultSize;
          }
          if (jerseyType === 'full' || jerseyType === 'shorts') {
            updated.shortsSize = defaultSize;
          }
          return updated;
        }
        // Handle jerseyType changes - clear sizes based on type and set defaults
        if (field === 'jerseyType') {
          const sizingType = m.sizingType || 'adults';
          const availableSizes = sizingType === 'kids' ? kidsSizes : adultSizes;
          const defaultSize = availableSizes.length > 0 ? availableSizes[Math.floor(availableSizes.length / 2)] : 'M';
          
          const updated = { ...m, [field]: value };
          if (value === 'shirt') {
            updated.shortsSize = '';
            // Set default size if not already set
            if (!updated.size || updated.size === '') {
              updated.size = defaultSize;
            }
          } else if (value === 'shorts') {
            updated.size = '';
            // Set default shortsSize if not already set
            if (!updated.shortsSize || updated.shortsSize === '') {
              updated.shortsSize = defaultSize;
            }
          } else if (value === 'full') {
            // Set defaults for both if not already set
            if (!updated.size || updated.size === '') {
              updated.size = defaultSize;
            }
            if (!updated.shortsSize || updated.shortsSize === '') {
              updated.shortsSize = defaultSize;
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
        // Ensure member has default sizes when expanded if not already set
        const member = members[memberIndex];
        if (member) {
          const sizingType = member.sizingType || 'adults';
          const jerseyType = member.jerseyType || 'full';
          const availableSizes = sizingType === 'kids' ? kidsSizes : adultSizes;
          const defaultSize = availableSizes.length > 0 ? availableSizes[Math.floor(availableSizes.length / 2)] : 'M';
          
          const needsUpdate = 
            ((jerseyType === 'full' || jerseyType === 'shirt') && (!member.size || member.size === '')) ||
            ((jerseyType === 'full' || jerseyType === 'shorts') && (!member.shortsSize || member.shortsSize === ''));
          
          if (needsUpdate) {
            setMembers(prev => prev.map((m, i) => {
              if (i === memberIndex) {
                const updated = { ...m };
                if ((jerseyType === 'full' || jerseyType === 'shirt') && (!m.size || m.size === '')) {
                  updated.size = defaultSize;
                }
                if ((jerseyType === 'full' || jerseyType === 'shorts') && (!m.shortsSize || m.shortsSize === '')) {
                  updated.shortsSize = defaultSize;
                }
                return updated;
              }
              return m;
            }));
          }
        }
      }
      return newSet;
    });
  };

  // Load provinces on mount
  useEffect(() => {
    const provincesList = getProvinces();
    setProvinces(provincesList);
    if (user) {
      checkUserAddress();
    }
  }, [user]);

  // Ensure all members have default sizes when form loads or members change
  useEffect(() => {
    setMembers(prev => prev.map(m => {
      const sizingType = m.sizingType || 'adults';
      const jerseyType = m.jerseyType || 'full';
      const availableSizes = sizingType === 'kids' ? kidsSizes : adultSizes;
      const defaultSize = availableSizes.length > 0 ? availableSizes[Math.floor(availableSizes.length / 2)] : 'M';
      
      const updated = { ...m };
      let hasChanges = false;
      
      // Set default size if missing and required for jersey type
      if ((jerseyType === 'full' || jerseyType === 'shirt') && (!m.size || m.size === '')) {
        updated.size = defaultSize;
        hasChanges = true;
      }
      if ((jerseyType === 'full' || jerseyType === 'shorts') && (!m.shortsSize || m.shortsSize === '')) {
        updated.shortsSize = defaultSize;
        hasChanges = true;
      }
      
      return hasChanges ? updated : m;
    }));
  }, []); // Only run once on mount

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
          setEmail(defaultAddress.email || user?.email || '');
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
    // Sync with client info for name, email, and phone
    if (name === 'fullName') {
      setClientName(processedValue);
    } else if (name === 'email') {
      setEmail(processedValue);
      // Real-time validation for email
      if (processedValue.trim() && !/^\S+@\S+\.\S+$/.test(processedValue)) {
        setInstantErrors(prev => ({ ...prev, email: 'Invalid email format' }));
      } else {
        setInstantErrors(prev => ({ ...prev, email: '' }));
      }
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
    const requiredFields = ['fullName', 'email', 'phone', 'streetAddress', 'province', 'city', 'barangay', 'postalCode'];
    requiredFields.forEach(field => {
      if (!newAddress[field] || newAddress[field].trim() === '') {
        errors[field] = 'This field is required';
      }
    });
    if (newAddress.email && !/^\S+@\S+\.\S+$/.test(newAddress.email)) {
      errors.email = 'Please enter a valid email address';
    }
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
        // Build complete address string
        const fullAddressString = `${newAddress.streetAddress || ''}, ${newAddress.barangay || ''}, ${newAddress.city || ''}, ${newAddress.province || ''} ${newAddress.postalCode || ''}`.trim();
        
        const addressData = {
          fullName: newAddress.fullName.trim(),
          email: newAddress.email.trim(), // Include email in address data
          phone: newAddress.phone.trim(),
          streetAddress: newAddress.streetAddress.trim(),
          barangay: newAddress.barangay.trim(),
          city: newAddress.city.trim(),
          province: newAddress.province.trim(),
          postalCode: newAddress.postalCode.trim(),
          address: fullAddressString
        };
        
        console.log('💾 Saving address data:', addressData);
        
        if (editingAddressId) {
          await userService.updateUserAddress(editingAddressId, addressData);
        } else {
          await userService.saveUserAddress(addressData);
        }
        
        // Sync with client info
        setClientName(newAddress.fullName.trim());
        setEmail(newAddress.email.trim());
        setPhone(newAddress.phone.trim());
        
        // Refresh addresses list to show saved data
        await checkUserAddress();
        setShowAddressForm(false);
        setEditingAddressId(null);
        
        console.log('✅ Address saved successfully');
      } catch (error) {
        console.error('❌ Failed to save address:', error.message);
        alert('Failed to save address. Please try again.');
      }
    } else {
      console.log('❌ Address validation failed');
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
      email: addressToEdit.email || email || user?.email || '',
      phone: addressToEdit.phone || '',
      streetAddress: streetAddress,
      barangay: barangay,
      city: city,
      province: province,
      postalCode: postalCode
    });
    // Sync with client info
    setClientName(addressToEdit.full_name || '');
    setEmail(addressToEdit.email || email || user?.email || '');
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
    setEmail(user?.email || '');
    setPhone('');
    setTeamName('');
    setApparelType('');
    setImages([]);
    setMembers([{ ...initialMember }]);
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
                          email: '',
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
    
    // First, ensure all members have default sizes if missing (before validation)
    const membersWithDefaults = members.map(m => {
      const sizingType = m.sizingType || 'adults';
      const jerseyType = m.jerseyType || 'full';
      const availableSizes = sizingType === 'kids' ? kidsSizes : adultSizes;
      const defaultSize = availableSizes.length > 0 ? availableSizes[Math.floor(availableSizes.length / 2)] : 'M';
      
      const updated = { ...m };
      // Set default size if missing and required for jersey type
      if ((jerseyType === 'full' || jerseyType === 'shirt') && (!m.size || m.size === '')) {
        updated.size = defaultSize;
      }
      if ((jerseyType === 'full' || jerseyType === 'shorts') && (!m.shortsSize || m.shortsSize === '')) {
        updated.shortsSize = defaultSize;
      }
      return updated;
    });
    
    // Update members state with defaults if any were applied
    const hasDefaultsApplied = membersWithDefaults.some((m, idx) => 
      m.size !== members[idx].size || m.shortsSize !== members[idx].shortsSize
    );
    if (hasDefaultsApplied) {
      setMembers(membersWithDefaults);
    }
    
    // Use members with defaults for validation
    const membersToValidate = hasDefaultsApplied ? membersWithDefaults : members;
    
    // Re-validate to get current errors
    const currentErrors = {};
    if (!clientName.trim()) currentErrors.clientName = 'Client name is required';
    if (!email.trim()) currentErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) currentErrors.email = 'Enter a valid email address';
    if (!phone.trim()) currentErrors.phone = 'Phone is required';
    else if (!/^\+?[0-9\-()\s]{7,}$/.test(phone)) currentErrors.phone = 'Enter a valid phone number';
    if (!teamName.trim()) currentErrors.teamName = 'Team name is required';
    if (!apparelType) currentErrors.apparelType = 'Apparel type is required';
    
    // Shipping method validation
    if (!pickupBranchId) {
      currentErrors.pickup = 'Please select a branch location';
    }
    if (shippingMethod === 'delivery' && (!deliveryAddress.address || !deliveryAddress.receiver || !deliveryAddress.phone)) {
      currentErrors.deliveryAddress = 'Delivery address is required';
    }

    // Roster validation using members with defaults
    const numbers = new Set();
    membersToValidate.forEach((m, idx) => {
      // Handle jersey number - can be 0, so check if it's null/undefined/empty string, not falsy
      const memberNumber = m.number !== null && m.number !== undefined && m.number !== '' 
        ? String(m.number).trim() 
        : '';
      if (!memberNumber) {
        currentErrors[`member_number_${idx}`] = 'Required';
      }
      
      // Validate surname
      if (!m.surname || !String(m.surname).trim()) {
        currentErrors[`member_surname_${idx}`] = 'Required';
      }
      
      // Use top-level apparelType if member doesn't have one, or member's apparelType if set
      const memberApparelType = (m.apparelType && String(m.apparelType).trim()) || (apparelType && String(apparelType).trim());
      if (!memberApparelType) {
        currentErrors[`member_apparel_type_${idx}`] = 'Required';
      }
      
      // Validate sizes based on jerseyType (default to 'full' if not set)
      const jerseyType = m.jerseyType || 'full';
      const memberSizingType = m.sizingType || 'adults';
      
      if (jerseyType === 'full') {
        // Check if size exists and is not empty (handle null, undefined, empty string, but allow valid values including '0')
        const memberSize = m.size !== null && m.size !== undefined && m.size !== '' ? String(m.size).trim() : '';
        const memberShortsSize = m.shortsSize !== null && m.shortsSize !== undefined && m.shortsSize !== '' ? String(m.shortsSize).trim() : '';
        
        // Only require if truly empty (not just whitespace, and not a valid size)
        if (!memberSize || memberSize === '') {
          currentErrors[`member_size_${idx}`] = 'Required';
        }
        if (!memberShortsSize || memberShortsSize === '') {
          currentErrors[`member_shorts_size_${idx}`] = 'Required';
        }
      } else if (jerseyType === 'shirt') {
        const memberSize = m.size !== null && m.size !== undefined && m.size !== '' ? String(m.size).trim() : '';
        if (!memberSize || memberSize === '') {
          currentErrors[`member_size_${idx}`] = 'Required';
        }
      } else if (jerseyType === 'shorts') {
        const memberShortsSize = m.shortsSize !== null && m.shortsSize !== undefined && m.shortsSize !== '' ? String(m.shortsSize).trim() : '';
        if (!memberShortsSize || memberShortsSize === '') {
          currentErrors[`member_shorts_size_${idx}`] = 'Required';
        }
      }
      
      // Validate sizing type
      if (!m.sizingType) {
        currentErrors[`member_sizing_type_${idx}`] = 'Required';
      }
      
      // Check for duplicate jersey numbers
      if (memberNumber) {
        if (numbers.has(memberNumber)) {
          currentErrors[`member_number_${idx}`] = 'Duplicate jersey number';
        }
        numbers.add(memberNumber);
      }
    });
    
    // Check for errors before submission
    if (Object.keys(currentErrors).length > 0) {
      console.log('❌ Validation errors found:', currentErrors);
      console.log('Form state:', {
        clientName,
        email,
        phone,
        teamName,
        apparelType,
        pickupBranchId,
        shippingMethod,
        members: members.map((m, i) => ({
          index: i,
          number: m.number,
          surname: m.surname,
          apparelType: m.apparelType,
          size: m.size,
          shortsSize: m.shortsSize,
          jerseyType: m.jerseyType,
          sizingType: m.sizingType
        }))
      });
      // Show errors and set validation message
      setShowErrors(true);
      setValidationMessage(null);
      // Scroll to top to show inline errors
      document.querySelector('.wio-cdfm-form')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    console.log('✅ All validations passed, submitting form...');
    // Clear errors display and validation message if no errors
    setShowErrors(false);
    setValidationMessage(null);
    
    setIsSubmitting(true);
    try {
      // Use members with defaults (already computed above)
      const finalMembers = membersToValidate.map(m => ({
        ...m,
        // Ensure apparelType is set
        apparelType: m.apparelType?.trim() || apparelType || ''
      }));
      
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add form fields
      formData.append('clientName', clientName);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('teamName', teamName);
      formData.append('apparelType', apparelType);
      // Use final members with defaults and apparelType applied
      formData.append('members', JSON.stringify(finalMembers));
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
      
      // Add flag to indicate this is a walk-in custom order
      formData.append('isWalkIn', 'true');
      
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

  return (
    <div className="wio-cdfm-container">
      <div className="wio-cdfm-header">
        <h2 className="wio-cdfm-title">Custom Design Order</h2>
        {onClose && (
          <button className="wio-cdfm-close" onClick={onClose} aria-label="Close">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        )}
      </div>

      <form className="wio-cdfm-form" onSubmit={handleSubmit}>
          {/* Delivery Information */}
          <section className="wio-cdfm-card">
            <div className="wio-cdfm-section-header">
              <div className="wio-cdfm-section-header-left">
                <FaTruck className="wio-cdfm-section-icon" />
                <h3 className="wio-cdfm-section-title">DELIVERY INFORMATION</h3>
              </div>
              {hasAddress && !showAddressForm && (
                <button 
                  type="button"
                  className="wio-cdfm-add-address-header-btn"
                  onClick={() => setShowAddressForm(true)}
                >
                  Add Address
                </button>
              )}
            </div>
            
            {(!hasAddress || showAddressForm) ? (
              showAddressForm ? (
                /* Address Input Form */
                <div className="wio-cdfm-address-form">
                  <div className="wio-cdfm-form-header">
                    <div className="wio-cdfm-form-header-top">
                      <div className="wio-cdfm-form-header-title">
                        <h4>{editingAddressId ? 'Edit Delivery Information' : 'Add Delivery Information'}</h4>
                        <p>Please provide your delivery information</p>
                      </div>
                      <button 
                        type="button"
                        className="wio-cdfm-back-address-btn"
                        onClick={() => {
                          setShowAddressForm(false);
                          setEditingAddressId(null);
                          setNewAddress({
                            fullName: '',
                            email: '',
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
                  
                  <div className="wio-cdfm-address-form-fields">
                    <div className="wio-cdfm-form-group">
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
                        <span className="wio-cdfm-error-message">{addressErrors.fullName}</span>
                      )}
                    </div>
                    
                    <div className="wio-cdfm-form-group">
                      <input
                        type="email"
                        name="email"
                        value={newAddress.email}
                        onChange={handleAddressInputChange}
                        className={addressErrors.email || instantErrors.email ? 'error' : ''}
                        placeholder="Contact Email"
                        maxLength={255}
                      />
                      {(addressErrors.email || instantErrors.email) && (
                        <span className="wio-cdfm-error-message">{addressErrors.email || instantErrors.email}</span>
                      )}
                    </div>
                    
                    <div className="wio-cdfm-form-group">
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
                        <span className="wio-cdfm-error-message">{addressErrors.phone}</span>
                      )}
                    </div>
                    
                    <div className="wio-cdfm-form-group">
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
                        <span className="wio-cdfm-error-message">{addressErrors.province}</span>
                      )}
                    </div>
                    <div className="wio-cdfm-form-group">
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
                        <span className="wio-cdfm-error-message">{addressErrors.city}</span>
                      )}
                    </div>
                    <div className="wio-cdfm-form-group">
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
                        <span className="wio-cdfm-error-message">{addressErrors.barangay}</span>
                      )}
                    </div>
                    
                    <div className="wio-cdfm-form-group">
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
                        <span className="wio-cdfm-error-message">{addressErrors.postalCode}</span>
                      )}
                    </div>
                    
                    <div className="wio-cdfm-form-group">
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
                        <span className="wio-cdfm-error-message">{addressErrors.streetAddress}</span>
                      )}
                    </div>
                  </div>

                  <div className="wio-cdfm-form-actions">
                    <button 
                      type="button"
                      className="wio-cdfm-save-address-btn"
                      onClick={handleSaveAddress}
                    >
                      Save & Continue
                    </button>
                  </div>
                </div>
              ) : (
                /* No Address Yet */
                <div className="wio-cdfm-no-address-section">
                  <div className="wio-cdfm-no-address-content">
                    <div className="wio-cdfm-no-address-icon"><FaMapMarkerAlt /></div>
                    <div className="wio-cdfm-no-address-text">
                      <h4>No delivery information yet</h4>
                      <p>Please add your delivery information to continue</p>
                    </div>
                    <button 
                      type="button"
                      className="wio-cdfm-add-address-btn"
                      onClick={() => setShowAddressForm(true)}
                    >
                      Add Information
                    </button>
                  </div>
                </div>
              )
            ) : (
              /* Existing Addresses Display */
              <div className="wio-cdfm-addresses-list">
                {allAddresses.map((address) => (
                  <div 
                    key={address.id} 
                    className={`wio-cdfm-address-card ${selectedAddressId === address.id ? 'selected' : ''}`}
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
                    <div className="wio-cdfm-address-card-content">
                      <div className="wio-cdfm-address-header">
                        <div className="wio-cdfm-location-icon">
                          <FaMapMarkerAlt />
                        </div>
                        <div className="wio-cdfm-receiver-info">
                          <div className="wio-cdfm-receiver-name">{address.full_name}</div>
                          <div className="wio-cdfm-receiver-phone">{address.phone}</div>
                        </div>
                        <div className="wio-cdfm-address-actions">
                          <button 
                            type="button"
                            className="wio-cdfm-edit-address-btn"
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
                            className="wio-cdfm-delete-address-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAddress(address.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="wio-cdfm-address-details">
                        <div className="wio-cdfm-address-line">{address.address}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Show error if delivery selected but no address */}
            {showErrors && errors.deliveryAddress && shippingMethod === 'delivery' && (
              <div className="wio-cdfm-error-message" style={{ 
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
          <section className="wio-cdfm-card">
            <h3 className="wio-cdfm-card-title">Apparel Type</h3>
            <div className="wio-cdfm-field">
              <label>Select Apparel Type <span className="wio-cdfm-required">*</span></label>
              <div className="wio-cdfm-input-wrapper">
                <select
                  className={showErrors && errors.apparelType ? 'error' : ''}
                  value={apparelType}
                  onChange={(e) => {
                    const selectedApparelType = e.target.value;
                    setApparelType(selectedApparelType);
                    // Sync top-level apparelType to all members if they don't have one set
                    if (selectedApparelType) {
                      setMembers(prev => prev.map(m => ({
                        ...m,
                        apparelType: m.apparelType || selectedApparelType
                      })));
                    }
                    // Clear error when user selects an option
                    if (showErrors && selectedApparelType) {
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
                {showErrors && errors.apparelType && <span className="wio-cdfm-inline-error">{errors.apparelType}</span>}
              </div>
            </div>
          </section>

          {/* Team Details */}
          <section className="wio-cdfm-card">
            <div className="wio-cdfm-card-title-row">
              <h3 className="wio-cdfm-card-title">Team Details</h3>
              <span className="wio-cdfm-char-count">{teamName.length}/50</span>
            </div>
            <div className="wio-cdfm-field">
              <label>Team Name <span className="wio-cdfm-required">*</span></label>
              <div className="wio-cdfm-input-wrapper">
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
                {showErrors && errors.teamName && <span className="wio-cdfm-inline-error">{errors.teamName}</span>}
              </div>
            </div>
          </section>

          {/* Image Upload */}
          <section className="wio-cdfm-card">
            <h3 className="wio-cdfm-card-title">Design Image Upload</h3>
            <div className="wio-cdfm-upload-area"
                 onDrop={handleDrop}
                 onDragOver={(e) => e.preventDefault()}>
              <input id="wio-file-input" type="file" accept="image/*" multiple onChange={handleFileInput} />
              <label htmlFor="wio-file-input" className="wio-cdfm-upload-label">
                <div className="wio-cdfm-upload-icon-wrapper">
                  <FaCloudUploadAlt className="wio-cdfm-upload-icon" />
                </div>
                <div className="wio-cdfm-upload-text">
                  <span className="wio-cdfm-upload-text-primary">Drag a file here</span>
                  <span className="wio-cdfm-upload-text-secondary">or browse a file to upload</span>
                </div>
              </label>
            </div>
            {images.length > 0 && (
              <div className="wio-cdfm-preview-grid">
                {images.map((img, i) => (
                  <div key={i} className="wio-cdfm-preview-item">
                    <img src={img.url} alt={`design-${i}`} />
                    <button type="button" className="wio-cdfm-delete-thumb" onClick={() => removeImage(i)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Team Members Roster */}
          <section className="wio-cdfm-card">
            <div className="wio-cdfm-card-title-row">
              <h3 className="wio-cdfm-card-title">Team Members Roster</h3>
              <button type="button" className="wio-cdfm-add-row" onClick={addMemberRow} aria-label="Add Team Member" title="Add Team Member">
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
            <div className="wio-cdfm-members-roster">
              {members.map((m, idx) => {
                const isExpanded = expandedMembers.has(idx);
                const memberJerseyType = m.jerseyType || 'full';
                const memberSizingType = m.sizingType || 'adults';
                const memberFabricOption = m.fabricOption || 'Polydex';
                const memberCutType = m.cutType || 'Normal Cut';
                
                // Calculate member price
                // Base prices
                let basePrice = 0;
                if (memberSizingType === 'kids') {
                  // Kids: ₱850 full set, ₱450 shirt only, ₱400 shorts only
                  if (memberJerseyType === 'full') basePrice = 850;
                  else if (memberJerseyType === 'shirt') basePrice = 450;
                  else if (memberJerseyType === 'shorts') basePrice = 400;
                } else {
                  // Adult: ₱950 full set, ₱500 shirt only, ₱450 shorts only
                  if (memberJerseyType === 'full') basePrice = 950;
                  else if (memberJerseyType === 'shirt') basePrice = 500;
                  else if (memberJerseyType === 'shorts') basePrice = 450;
                }
                
                // Size surcharge (₱50 for 2XL-8XL, regardless of jersey type)
                let sizeSurcharge = 0;
                const shirtSize = m.size || '';
                const shortsSize = m.shortsSize || '';
                if (surchargeSizes.includes(shirtSize) || surchargeSizes.includes(shortsSize)) {
                  sizeSurcharge = 50; // Only one surcharge regardless of how many sizes qualify
                }
                
                // Fabric surcharge
                const fabricOption = fabricOptions.find(f => f.name === memberFabricOption);
                const fabricSurcharge = fabricOption ? fabricOption.surcharge : 0;
                
                // Cut type surcharge
                const cutTypeOption = cutTypeOptions.find(c => c.name === memberCutType);
                const cutTypeSurcharge = cutTypeOption ? cutTypeOption.surcharge : 0;
                
                // Custom design fee
                const customDesignFee = 200;
                
                // Total member price
                const memberPrice = basePrice + sizeSurcharge + fabricSurcharge + cutTypeSurcharge + customDesignFee;
                
                return (
                  <div key={idx} className="wio-cdfm-member-card">
                    <div className="wio-cdfm-member-header">
                      <div className="wio-cdfm-member-tag-wrapper">
                        <div className="wio-cdfm-member-tag">
                          Member {idx + 1}
                        </div>
                        <div className="wio-cdfm-member-price">
                          ₱{memberPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`wio-cdfm-member-toggle-btn ${isExpanded ? 'wio-cdfm-member-toggle-btn-expanded' : ''}`}
                        onClick={() => toggleMemberExpanded(idx)}
                        title={isExpanded ? "Collapse details" : "Expand details"}
                      >
                        <span className="wio-cdfm-member-toggle-label">Customize</span>
                        <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
                      </button>
                    </div>
                    <div className="wio-cdfm-member-row-row-1">
                      <div className="wio-cdfm-input-wrapper wio-cdfm-member-wrapper">
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
                          className={`wio-cdfm-member-input ${showErrors && errors[`member_surname_${idx}`] ? 'error' : ''}`}
                        />
                        {showErrors && errors[`member_surname_${idx}`] && (
                          <span className="wio-cdfm-error-message">{errors[`member_surname_${idx}`]}</span>
                        )}
                      </div>
                      <div className="wio-cdfm-input-wrapper wio-cdfm-member-wrapper">
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
                          className={`wio-cdfm-member-input wio-cdfm-number-input ${showErrors && errors[`member_number_${idx}`] ? 'error' : ''}`}
                        />
                        {showErrors && errors[`member_number_${idx}`] && (
                          <span className="wio-cdfm-error-message">{errors[`member_number_${idx}`]}</span>
                        )}
                      </div>
                      {members.length > 1 && (
                        <button 
                          type="button"
                          className="wio-cdfm-remove-member-button"
                          onClick={() => removeMemberRow(idx)}
                          title="Remove Team Member"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      )}
                    </div>
                    {/* Per-Member Customization Section */}
                    {isExpanded && (
                      <div className="wio-cdfm-member-customization-section">
                        {/* Apparel Type Selector */}
                        <div className="wio-cdfm-member-customization-group">
                          <label className="wio-cdfm-member-customization-label">Apparel Type <span className="wio-cdfm-required">*</span></label>
                          <select
                            value={m.apparelType || ''}
                            onChange={(e) => {
                              updateMember(idx, 'apparelType', e.target.value);
                              if (showErrors && e.target.value) {
                                setShowErrors(false);
                              }
                            }}
                            className={`wio-cdfm-member-select ${showErrors && errors[`member_apparel_type_${idx}`] ? 'error' : ''}`}
                          >
                            <option value="">Select Apparel Type</option>
                            <option value="basketball_jersey">Basketball Jersey</option>
                            <option value="volleyball_jersey">Volleyball Jersey</option>
                            <option value="hoodie">Hoodie</option>
                            <option value="tshirt">T-shirt</option>
                            <option value="longsleeves">Longsleeves</option>
                            <option value="uniforms">Uniforms</option>
                          </select>
                          {showErrors && errors[`member_apparel_type_${idx}`] && (
                            <span className="wio-cdfm-error-message">{errors[`member_apparel_type_${idx}`]}</span>
                          )}
                        </div>

                        {/* Jersey Type Selector */}
                        <div className="wio-cdfm-member-customization-group">
                          <label className="wio-cdfm-member-customization-label">Jersey Type</label>
                          <div className="wio-cdfm-member-jersey-type-buttons">
                            <button
                              type="button"
                              className={`wio-cdfm-member-jersey-type-btn ${memberJerseyType === 'full' ? 'active' : ''}`}
                              onClick={() => {
                                updateMember(idx, 'jerseyType', 'full');
                                if (showErrors) setShowErrors(false);
                              }}
                            >
                              Full Set
                            </button>
                            <button
                              type="button"
                              className={`wio-cdfm-member-jersey-type-btn ${memberJerseyType === 'shirt' ? 'active' : ''}`}
                              onClick={() => {
                                updateMember(idx, 'jerseyType', 'shirt');
                                if (showErrors) setShowErrors(false);
                              }}
                            >
                              Shirt Only
                            </button>
                            <button
                              type="button"
                              className={`wio-cdfm-member-jersey-type-btn ${memberJerseyType === 'shorts' ? 'active' : ''}`}
                              onClick={() => {
                                updateMember(idx, 'jerseyType', 'shorts');
                                if (showErrors) setShowErrors(false);
                              }}
                            >
                              Shorts Only
                            </button>
                          </div>
                        </div>

                        {/* Size Type Selector */}
                        <div className="wio-cdfm-member-customization-group">
                          <label className="wio-cdfm-member-customization-label">Size Type</label>
                          <div className="wio-cdfm-member-size-type-buttons">
                            <button
                              type="button"
                              className={`wio-cdfm-member-size-type-btn ${(m.sizingType || 'adults') === 'adults' ? 'active' : ''}`}
                              onClick={() => {
                                updateMember(idx, 'sizingType', 'adults');
                                if (showErrors) setShowErrors(false);
                              }}
                            >
                              Adult
                            </button>
                            <button
                              type="button"
                              className={`wio-cdfm-member-size-type-btn ${(m.sizingType || 'adults') === 'kids' ? 'active' : ''}`}
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
                        <div className="wio-cdfm-member-size-selectors">
                          {(() => {
                            const memberSizingType = m.sizingType || 'adults';
                            const memberShirtSizes = memberSizingType === 'kids' ? kidsSizes : adultSizes;
                            const memberShortSizes = memberSizingType === 'kids' ? kidsSizes : adultSizes;

                            return (
                              <>
                                {/* Shirt Size - Show for full set or shirt only */}
                                {(memberJerseyType === 'full' || memberJerseyType === 'shirt') && (
                                  <div className="wio-cdfm-member-size-wrapper">
                                    <label className="wio-cdfm-member-size-label">Shirt Size</label>
                                    <select
                                      value={m.size || ''}
                                      onChange={(e) => {
                                        updateMember(idx, 'size', e.target.value);
                                        if (showErrors && e.target.value) {
                                          setShowErrors(false);
                                        }
                                      }}
                                      className="wio-cdfm-member-select"
                                    >
                                      <option value="">Select Size</option>
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
                                {/* Short Size - Show for full set or shorts only */}
                                {(memberJerseyType === 'full' || memberJerseyType === 'shorts') && (
                                  <div className="wio-cdfm-member-size-wrapper">
                                    <label className="wio-cdfm-member-size-label">Short Size</label>
                                    <select
                                      value={m.shortsSize || ''}
                                      onChange={(e) => {
                                        updateMember(idx, 'shortsSize', e.target.value);
                                        if (showErrors && e.target.value) {
                                          setShowErrors(false);
                                        }
                                      }}
                                      className="wio-cdfm-member-select"
                                    >
                                      <option value="">Select Size</option>
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
                        <div className="wio-cdfm-fabric-cut-row">
                          {/* Fabric Option Selector */}
                          <div className="wio-cdfm-member-customization-group">
                            <label className="wio-cdfm-member-customization-label">Fabric Option</label>
                            <select
                              value={m.fabricOption || 'Polydex'}
                              onChange={(e) => {
                                updateMember(idx, 'fabricOption', e.target.value);
                                if (showErrors) setShowErrors(false);
                              }}
                              className="wio-cdfm-member-select"
                            >
                              {fabricOptions.map(fabric => (
                                <option key={fabric.name} value={fabric.name}>
                                  {fabric.name} {fabric.surcharge > 0 ? `(+₱${fabric.surcharge})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Cut Type Selector */}
                          <div className="wio-cdfm-member-customization-group">
                            <label className="wio-cdfm-member-customization-label">Cut Type</label>
                            <select
                              value={m.cutType || 'Normal Cut'}
                              onChange={(e) => {
                                updateMember(idx, 'cutType', e.target.value);
                                if (showErrors) setShowErrors(false);
                              }}
                              className="wio-cdfm-member-select"
                            >
                              {cutTypeOptions.map(cut => (
                                <option key={cut.name} value={cut.name}>
                                  {cut.name} {cut.surcharge > 0 ? `(+₱${cut.surcharge})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Shipping Method and Notes Container */}
          <div className="wio-cdfm-shipping-notes-container">
            {/* Shipping Method */}
            <section className="wio-cdfm-card wio-cdfm-shipping-section">
              <h3 className="wio-cdfm-card-title">Shipping Method</h3>
              <div className="wio-cdfm-field">
                <div className="wio-cdfm-shipping-methods">
                  <button
                    type="button"
                    className={`wio-cdfm-shipping-option ${shippingMethod === 'pickup' ? 'active' : ''}`}
                    onClick={() => setShippingMethod('pickup')}
                  >
                    <div className="wio-cdfm-shipping-option-title">Store Pickup</div>
                    <div className="wio-cdfm-shipping-option-desc">Free</div>
                  </button>
                  <button
                    type="button"
                    className={`wio-cdfm-shipping-option ${shippingMethod === 'delivery' ? 'active' : ''}`}
                    onClick={() => setShippingMethod('delivery')}
                  >
                    <div className="wio-cdfm-shipping-option-title">Delivery</div>
                    <div className="wio-cdfm-shipping-option-desc">₱{DELIVERY_FEE}</div>
                  </button>
                </div>
              </div>
            </section>

            {/* Notes/Message Section */}
            <section className="wio-cdfm-card wio-cdfm-notes-section">
              <h3 className="wio-cdfm-card-title">Notes/Message to Yohanns</h3>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Please Leave A Message ......"
                className="wio-cdfm-notes-textarea"
                rows="4"
              />
            </section>
          </div>

          {/* Branch Location - Required for both pickup and delivery (COD) */}
          <section className="wio-cdfm-card">
            <h3 className="wio-cdfm-card-title">Select the Nearest Branch</h3>
            <div className="wio-cdfm-field">
              <label>Select the nearest branch <span className="wio-cdfm-required">*</span></label>
              <select
                className={`wio-cdfm-field select ${showErrors && errors.pickup ? 'error' : ''}`}
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
                <small className="wio-cdfm-helper">{branches.find(b => b.id === pickupBranchId)?.address}</small>
              )}
              {showErrors && errors.pickup && (
                <span className="wio-cdfm-inline-error">{errors.pickup}</span>
              )}
            </div>
          </section>


          {/* Summary */}
          <section className="wio-cdfm-card">
            <button type="button" className="wio-cdfm-summary-toggle" onClick={() => setShowSummary(s => !s)}>
              {showSummary ? 'Hide' : 'Show'} Order Summary
            </button>
            {showSummary && (
              <div className="wio-cdfm-summary-content">
                <div><strong>Team Name:</strong> {teamName || '-'}</div>
                <div><strong>Team Members:</strong> {members.length} {members.length === 1 ? 'member' : 'members'}</div>
                <div><strong>Shipping:</strong> {shippingMethod === 'pickup' ? 'Store Pickup (Free)' : `Delivery (₱${DELIVERY_FEE})`}</div>
                <div><strong>Design Images:</strong> {images.length} {images.length === 1 ? 'image' : 'images'}</div>
              </div>
            )}
          </section>

          {/* Submit */}
          <div className="wio-cdfm-submit-bar">
            <div className="wio-cdfm-submit-bar-inner">
              {showErrors && hasErrors && Object.keys(errors).length > 0 && (
                <span className="wio-cdfm-submit-hint">Complete all required fields to submit</span>
              )}
              <button 
                className="wio-cdfm-submit-btn" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Order'}
              </button>
            </div>
          </div>
        </form>

        {showLoginPrompt && (
          <div className="wio-cdfm-confirm-overlay" onClick={() => setShowLoginPrompt(false)}>
            <div className="wio-cdfm-confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="wio-cdfm-confirm-icon warning" aria-hidden>
                <FontAwesomeIcon icon={faLock} />
              </div>
              <h3>Login Required</h3>
              <p>You need to be logged in to place a custom design order.</p>
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                Please log in to your account to continue with your custom design order.
              </p>
              <div className="wio-cdfm-button-container">
                <button className="wio-cdfm-cancel-button" onClick={() => setShowLoginPrompt(false)}>
                  Cancel
                </button>
                <button className="wio-wio-cdfm-login-button" onClick={() => { 
                  setShowLoginPrompt(false); 
                  if (onClose) onClose(); 
                }}>
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Address Confirmation Modal - White Theme */}
        {showDeleteConfirm && (
          <div className="wio-cdfm-delete-confirm-overlay" onClick={cancelDeleteAddress}>
            <div className="wio-cdfm-delete-confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="wio-cdfm-delete-confirm-icon">
                <FontAwesomeIcon icon={faTrash} />
              </div>
              <h3 className="wio-cdfm-delete-confirm-title">Delete Address?</h3>
              <p className="wio-cdfm-delete-confirm-message">Are you sure you want to delete this address? This action cannot be undone.</p>
              <div className="wio-cdfm-delete-confirm-actions">
                <button 
                  type="button"
                  className="wio-cdfm-delete-confirm-no"
                  onClick={cancelDeleteAddress}
                >
                  No
                </button>
                <button 
                  type="button"
                  className="wio-cdfm-delete-confirm-yes"
                  onClick={confirmDeleteAddress}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmation && (
          <div className="wio-cdfm-confirm-overlay" onClick={() => setConfirmation(null)}>
            <div className="wio-cdfm-confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="wio-cdfm-confirm-icon success" aria-hidden>
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
                  emailStatusText = '📨 Confirmation email is being sent. Please check the inbox shortly.';
                  emailStatusColor = '#1E88E5';
                } else {
                  emailStatusText = '⚠️ Email notification not available. Please provide a copy manually if needed.';
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
              <button onClick={() => { setConfirmation(null); if (onClose) onClose(); }}>Close</button>
            </div>
          </div>
        )}
    </div>
  );
}




