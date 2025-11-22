import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaTimes } from 'react-icons/fa';
import './SearchableSelect.css';

const SearchableSelect = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  error = false,
  name = '',
  label = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    const optionLabel = typeof option === 'string' ? option : (option.label || option.name || '');
    return optionLabel.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get display value
  const getDisplayValue = () => {
    if (!value) return '';
    const selectedOption = options.find(opt => {
      const optValue = typeof opt === 'string' ? opt : (opt.value || opt.name || '');
      return optValue === value;
    });
    if (selectedOption) {
      return typeof selectedOption === 'string' ? selectedOption : (selectedOption.label || selectedOption.name || '');
    }
    return value;
  };

  // Handle option click
  const handleSelect = (option) => {
    const optionValue = typeof option === 'string' ? option : (option.value || option.name || '');
    onChange({ target: { name, value: optionValue } });
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'Enter' && isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
      e.preventDefault();
      handleSelect(filteredOptions[highlightedIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Reset highlighted index when search term changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && isOpen) {
      const optionElement = dropdownRef.current?.querySelector(
        `.searchable-select-option:nth-child(${highlightedIndex + 2})` // +2 because of search input
      );
      if (optionElement) {
        optionElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const displayValue = getDisplayValue();

  return (
    <div 
      className={`searchable-select-wrapper ${className} ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}
      ref={dropdownRef}
    >
      {label && <label className="searchable-select-label">{label}</label>}
      <div 
        className={`searchable-select ${isOpen ? 'open' : ''} ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="searchable-select-display">
          {displayValue || <span className="searchable-select-placeholder">{placeholder}</span>}
        </div>
        <div className="searchable-select-actions">
          {value && !disabled && (
            <button
              type="button"
              className="searchable-select-clear"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ target: { name, value: '' } });
                setSearchTerm('');
              }}
              aria-label="Clear selection"
            >
              <FaTimes />
            </button>
          )}
          <FaChevronDown className={`searchable-select-chevron ${isOpen ? 'open' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="searchable-select-dropdown">
          <div className="searchable-select-search">
            <input
              ref={inputRef}
              type="text"
              className="searchable-select-search-input"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredOptions.length > 0) {
                  e.preventDefault();
                  handleSelect(filteredOptions[0]);
                } else {
                  handleKeyDown(e);
                }
              }}
            />
          </div>
          <div className="searchable-select-options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const optionValue = typeof option === 'string' ? option : (option.value || option.name || '');
                const optionLabel = typeof option === 'string' ? option : (option.label || option.name || '');
                const isSelected = optionValue === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={optionValue}
                    className={`searchable-select-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {optionLabel}
                    {isSelected && <span className="searchable-select-check">✓</span>}
                  </div>
                );
              })
            ) : (
              <div className="searchable-select-no-results">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
