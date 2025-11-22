# CartModal Design Reference - Quick Guide

## 🎨 Color Palette Quick Reference

```css
/* Primary Accent Color */
--mycart-primary: #4f46e5          /* Indigo - Used for buttons, accents, hover states */

/* Background Colors */
--mycart-white: #ffffff             /* Main background, cards, text backgrounds */
--mycart-light-gray: #f8f9fa        /* Header, footer, disabled states */

/* Text Colors */
--mycart-text-dark: #1f2937         /* Primary text, headings, labels */
--mycart-text-light: #6b7280        /* Secondary text, descriptions */

/* Borders & Dividers */
--mycart-border: #e5e7eb            /* Subtle dividers, input borders */

/* Shadows (Elevation System) */
--mycart-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--mycart-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
--mycart-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
```

### Color Usage Examples

| Component | Property | Color |
|-----------|----------|-------|
| Modal Container | background | `--mycart-white` |
| Modal Shadow | box-shadow | `--mycart-shadow-lg` |
| Header | background | `--mycart-light-gray` |
| Header Text | color | `--mycart-text-dark` |
| Item Box Hover | background | `--mycart-light-gray` |
| Divider Lines | border-color | `--mycart-border` |
| Checkout Button | background | `--mycart-primary` |
| Checkout Hover | background | `#4338ca` (darker indigo) |
| Price Text | color | `--mycart-primary` |
| Secondary Text | color | `--mycart-text-light` |

---

## 📐 Spacing Scale (8px base)

```css
/* All spacing is multiples of 8px */
8px   → 0.5rem
16px  → 1rem
24px  → 1.5rem
32px  → 2rem
40px  → 2.5rem
```

### Applied Spacing

| Component | Spacing | Value |
|-----------|---------|-------|
| Header padding | 24px all sides | `padding: 24px` |
| Item box padding | 16px vertical, 24px horizontal | `padding: 16px 24px` |
| Footer padding | 20px vertical, 24px horizontal | `padding: 20px 24px` |
| Item-to-item gap | 16px | `gap: 16px` |
| Element gaps | 10-12px | Varies by context |

---

## 📱 Responsive Breakpoints

```css
/* Desktop (default/no media query) */
/* Tablet */
@media (max-width: 768px) { }

/* Mobile */
@media (max-width: 480px) { }
```

### Responsive Values Table

| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Image Size | 88×88px | 72×72px | 64×64px |
| Header Padding | 24px | 20px | 16px |
| Item Padding | 16px 24px | 14px 20px | 12px 16px |
| Header Font | 1.5rem | 1.3rem | 1.15rem |
| Item Name Font | 0.95rem | 0.9rem | 0.85rem |
| Footer Direction | row | row | column |
| Modal Border Radius | 12px | 12px | 12px 12px 0 0 |

---

## 🎯 Component Code Snippets

### 1. Cart Modal Container

```jsx
<div className="mycart-overlay-clean" onClick={closeCart}>
  <div className="mycart-container-clean" onClick={(e) => e.stopPropagation()}>
    {/* Content goes here */}
  </div>
</div>
```

**CSS:**
```css
.mycart-overlay-clean {
  background-color: rgba(0, 0, 0, 0.4);
  max-width: 500px;
}

.mycart-container-clean {
  background: var(--mycart-white);
  border-radius: 12px;
  box-shadow: var(--mycart-shadow-lg);
}
```

---

### 2. Product Item Layout

```jsx
<div className="mycart-item-box">
  {/* Checkbox */}
  <div className="mycart-checkbox-wrapper">
    <input type="checkbox" {...props} />
  </div>

  {/* Product Image */}
  <div className="mycart-product-image-wrapper">
    <img src={item.image} alt={item.name} />
  </div>

  {/* Product Info */}
  <div className="mycart-product-info-section">
    {/* Name & Remove */}
    <div className="mycart-product-header-line">
      <h3 className="mycart-product-name">{item.name}</h3>
      <button className="mycart-remove-btn-clean">
        <FaTrash />
      </button>
    </div>

    {/* Quantity */}
    <div className="mycart-quantity-controls">
      <button className="mycart-quantity-btn">−</button>
      <span className="mycart-quantity-display">1</span>
      <button className="mycart-quantity-btn">+</button>
    </div>

    {/* Price */}
    <div className="mycart-price-display">
      <span className="mycart-item-price">₱1,500</span>
    </div>
  </div>
</div>
```

---

### 3. Order Type Expandable

```jsx
<div className="mycart-order-type-container">
  <div 
    className={`mycart-order-type-header ${isExpanded ? 'expanded' : ''}`}
    onClick={toggleExpand}
  >
    <span className="mycart-order-type-label">Team Order</span>
    <span className="mycart-dropdown-arrow">▼</span>
  </div>
  
  {isExpanded && (
    <div className="mycart-order-details-section">
      <div className="mycart-detail-line">
        <span className="mycart-detail-label">Team:</span>
        <span className="mycart-detail-value">Lakers</span>
      </div>
      <div className="mycart-detail-line">
        <span className="mycart-detail-label">Jersey:</span>
        <span className="mycart-detail-value">23</span>
      </div>
    </div>
  )}
</div>
```

**CSS Arrow Rotation:**
```css
.mycart-dropdown-arrow {
  transition: transform 0.2s ease;
}

.mycart-order-type-header.expanded .mycart-dropdown-arrow {
  transform: rotate(180deg);
}
```

---

### 4. Footer Section

```jsx
<div className="mycart-footer-section">
  {/* Select All */}
  <div className="mycart-select-all-row">
    <input type="checkbox" id="select-all" {...props} />
    <label htmlFor="select-all">Select All (3)</label>
  </div>

  {/* Total Summary */}
  <div className="mycart-total-section">
    <span className="mycart-total-label">Total (3 Items):</span>
    <span className="mycart-total-amount">₱4,500</span>
  </div>

  {/* Checkout Button */}
  <button className="mycart-checkout-btn-clean" disabled={!hasSelected}>
    CHECK OUT (2 items)
  </button>
</div>
```

---

### 5. Empty State

```jsx
<div className="mycart-empty-state">
  <FaShoppingBag className="mycart-empty-icon" />
  <h3>Your cart is empty</h3>
  <p>Add some items to get started!</p>
</div>
```

---

### 6. Loading State

```jsx
<div className="mycart-loading-state">
  <div className="mycart-loading-spinner"></div>
  <p>Loading cart...</p>
</div>
```

---

## 🎨 Font Stack Priority

```css
font-family: 'Segoe UI', 'Inter', '-apple-system', 'BlinkMacSystemFont', sans-serif;

/* Fallback order:
   1. Segoe UI (Windows)
   2. Inter (Google Fonts/custom)
   3. -apple-system (macOS)
   4. BlinkMacSystemFont (Webkit browsers)
   5. Generic sans-serif
*/
```

---

## ✨ Common Interactive Patterns

### Button Hover Effect

```css
.mycart-checkout-btn-clean:hover:not(:disabled) {
  background: #4338ca;           /* Darker indigo */
  box-shadow: 0 12px 24px rgba(79, 70, 229, 0.25);  /* Enhanced shadow */
  transform: translateY(-2px);   /* Lift up */
  transition: all 0.3s ease;
}
```

### Quantity Button Active State

```css
.mycart-quantity-btn:active {
  transform: scale(0.95);        /* Press down */
  transition: transform 0.1s ease;
}
```

### Item Box Hover

```css
.mycart-item-box:hover {
  background: var(--mycart-light-gray);  /* Subtle background change */
  transition: all 0.2s ease;
}
```

---

## 🔄 Theming System

To create a custom theme, override CSS variables:

```css
/* Dark Theme Example */
:root {
  --mycart-primary: #6366f1;              /* Slate indigo */
  --mycart-light-gray: #1f2937;           /* Dark gray */
  --mycart-white: #111827;                /* Almost black */
  --mycart-text-dark: #f3f4f6;            /* Light gray */
  --mycart-text-light: #9ca3af;           /* Medium gray */
  --mycart-border: #374151;               /* Dark border */
}
```

---

## 📐 Common Measurements

```css
/* Border Radius */
border-radius: 12px    /* Main containers */
border-radius: 8px     /* Buttons, cards */
border-radius: 6px     /* Small elements */
border-radius: 4px     /* Tiny elements */

/* Font Weights */
font-weight: 400       /* Regular text */
font-weight: 500       /* Medium labels */
font-weight: 600       /* Semi-bold headings */
font-weight: 700       /* Bold amounts */

/* Z-index */
z-index: 1000          /* Modal overlay */

/* Max Width */
max-width: 500px       /* Desktop cart modal */
max-width: 100%        /* Tablet/mobile */
```

---

## 🎯 Quick Copy-Paste Snippets

### Add a new item box styling

```css
.mycart-item-box {
  display: flex;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--mycart-border);
  background: var(--mycart-white);
  transition: all 0.2s ease;
  align-items: flex-start;
}

.mycart-item-box:hover {
  background: var(--mycart-light-gray);
}
```

### Create a new button variant

```css
.mycart-custom-btn {
  padding: 12px 24px;
  background: var(--mycart-primary);
  color: var(--mycart-white);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--mycart-shadow-md);
}

.mycart-custom-btn:hover {
  background: #4338ca;
  transform: translateY(-2px);
}

.mycart-custom-btn:disabled {
  background: #d1d5db;
  opacity: 0.6;
  cursor: not-allowed;
}
```

### Create a custom card

```css
.mycart-custom-card {
  padding: 16px;
  background: var(--mycart-white);
  border: 1px solid var(--mycart-border);
  border-radius: 8px;
  box-shadow: var(--mycart-shadow-sm);
}
```

---

## 🎬 Animation Keyframes

```css
@keyframes mycart-fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes mycart-slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes mycart-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

## ♿ Accessibility Checklist

- ✓ All interactive elements have proper focus states
- ✓ Color contrast ratio ≥ 4.5:1 for text
- ✓ Semantic HTML with proper `<label>` associations
- ✓ Keyboard navigation support (Tab, Enter)
- ✓ ARIA attributes where needed
- ✓ No color-only information (text + icon/symbol)
- ✓ Font sizes ≥ 14px for body text

---

## 📊 Component Dimensions Reference

```
Modal
├─ Max Width: 500px
├─ Max Height: 85vh
├─ Border Radius: 12px
├─ Box Shadow: --mycart-shadow-lg
└─ Animation: 300ms slide-in

Header
├─ Padding: 24px
├─ Height: auto
├─ Border Bottom: 1px solid --mycart-border
├─ Background: --mycart-light-gray
└─ Font Size: 1.5rem

Product Item
├─ Padding: 16px 24px
├─ Gap: 16px
├─ Image Size: 88×88px
├─ Checkbox: 20×20px
└─ Min Height: auto

Quantity Controls
├─ Padding: 6px 10px
├─ Button Size: 24×24px
├─ Border: 1px solid --mycart-border
└─ Border Radius: 6px

Checkout Button
├─ Padding: 12px 24px
├─ Width: 100%
├─ Height: 44px (touch target)
├─ Font Weight: 600
└─ Border Radius: 8px

Footer
├─ Padding: 20px 24px
├─ Background: --mycart-light-gray
├─ Border Top: 1px solid --mycart-border
└─ Gap: 12px between sections
```

---

## 🚀 Performance Tips

1. **Use CSS Variables** for easy dynamic theming
2. **Minimal Repaints** - Use `transform` for animations (not `top`/`left`)
3. **Efficient Selectors** - All classes are specific and performant
4. **No Box Shadows on Scroll** - Applied only to static elements
5. **GPU Acceleration** - Animations use `transform` and `opacity`

---

## 📋 Browser Support

✅ Chrome 88+  
✅ Firefox 87+  
✅ Safari 14+  
✅ Edge 88+  
✅ iOS Safari 14+  
✅ Chrome Android 88+  

*CSS Variables supported in all modern browsers*

---

**Last Updated**: October 2025  
**Version**: 1.0 - Initial Modern Design

## 🎨 Color Palette Quick Reference

```css
/* Primary Accent Color */
--mycart-primary: #4f46e5          /* Indigo - Used for buttons, accents, hover states */

/* Background Colors */
--mycart-white: #ffffff             /* Main background, cards, text backgrounds */
--mycart-light-gray: #f8f9fa        /* Header, footer, disabled states */

/* Text Colors */
--mycart-text-dark: #1f2937         /* Primary text, headings, labels */
--mycart-text-light: #6b7280        /* Secondary text, descriptions */

/* Borders & Dividers */
--mycart-border: #e5e7eb            /* Subtle dividers, input borders */

/* Shadows (Elevation System) */
--mycart-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--mycart-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
--mycart-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
```

### Color Usage Examples

| Component | Property | Color |
|-----------|----------|-------|
| Modal Container | background | `--mycart-white` |
| Modal Shadow | box-shadow | `--mycart-shadow-lg` |
| Header | background | `--mycart-light-gray` |
| Header Text | color | `--mycart-text-dark` |
| Item Box Hover | background | `--mycart-light-gray` |
| Divider Lines | border-color | `--mycart-border` |
| Checkout Button | background | `--mycart-primary` |
| Checkout Hover | background | `#4338ca` (darker indigo) |
| Price Text | color | `--mycart-primary` |
| Secondary Text | color | `--mycart-text-light` |

---

## 📐 Spacing Scale (8px base)

```css
/* All spacing is multiples of 8px */
8px   → 0.5rem
16px  → 1rem
24px  → 1.5rem
32px  → 2rem
40px  → 2.5rem
```

### Applied Spacing

| Component | Spacing | Value |
|-----------|---------|-------|
| Header padding | 24px all sides | `padding: 24px` |
| Item box padding | 16px vertical, 24px horizontal | `padding: 16px 24px` |
| Footer padding | 20px vertical, 24px horizontal | `padding: 20px 24px` |
| Item-to-item gap | 16px | `gap: 16px` |
| Element gaps | 10-12px | Varies by context |

---

## 📱 Responsive Breakpoints

```css
/* Desktop (default/no media query) */
/* Tablet */
@media (max-width: 768px) { }

/* Mobile */
@media (max-width: 480px) { }
```

### Responsive Values Table

| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Image Size | 88×88px | 72×72px | 64×64px |
| Header Padding | 24px | 20px | 16px |
| Item Padding | 16px 24px | 14px 20px | 12px 16px |
| Header Font | 1.5rem | 1.3rem | 1.15rem |
| Item Name Font | 0.95rem | 0.9rem | 0.85rem |
| Footer Direction | row | row | column |
| Modal Border Radius | 12px | 12px | 12px 12px 0 0 |

---

## 🎯 Component Code Snippets

### 1. Cart Modal Container

```jsx
<div className="mycart-overlay-clean" onClick={closeCart}>
  <div className="mycart-container-clean" onClick={(e) => e.stopPropagation()}>
    {/* Content goes here */}
  </div>
</div>
```

**CSS:**
```css
.mycart-overlay-clean {
  background-color: rgba(0, 0, 0, 0.4);
  max-width: 500px;
}

.mycart-container-clean {
  background: var(--mycart-white);
  border-radius: 12px;
  box-shadow: var(--mycart-shadow-lg);
}
```

---

### 2. Product Item Layout

```jsx
<div className="mycart-item-box">
  {/* Checkbox */}
  <div className="mycart-checkbox-wrapper">
    <input type="checkbox" {...props} />
  </div>

  {/* Product Image */}
  <div className="mycart-product-image-wrapper">
    <img src={item.image} alt={item.name} />
  </div>

  {/* Product Info */}
  <div className="mycart-product-info-section">
    {/* Name & Remove */}
    <div className="mycart-product-header-line">
      <h3 className="mycart-product-name">{item.name}</h3>
      <button className="mycart-remove-btn-clean">
        <FaTrash />
      </button>
    </div>

    {/* Quantity */}
    <div className="mycart-quantity-controls">
      <button className="mycart-quantity-btn">−</button>
      <span className="mycart-quantity-display">1</span>
      <button className="mycart-quantity-btn">+</button>
    </div>

    {/* Price */}
    <div className="mycart-price-display">
      <span className="mycart-item-price">₱1,500</span>
    </div>
  </div>
</div>
```

---

### 3. Order Type Expandable

```jsx
<div className="mycart-order-type-container">
  <div 
    className={`mycart-order-type-header ${isExpanded ? 'expanded' : ''}`}
    onClick={toggleExpand}
  >
    <span className="mycart-order-type-label">Team Order</span>
    <span className="mycart-dropdown-arrow">▼</span>
  </div>
  
  {isExpanded && (
    <div className="mycart-order-details-section">
      <div className="mycart-detail-line">
        <span className="mycart-detail-label">Team:</span>
        <span className="mycart-detail-value">Lakers</span>
      </div>
      <div className="mycart-detail-line">
        <span className="mycart-detail-label">Jersey:</span>
        <span className="mycart-detail-value">23</span>
      </div>
    </div>
  )}
</div>
```

**CSS Arrow Rotation:**
```css
.mycart-dropdown-arrow {
  transition: transform 0.2s ease;
}

.mycart-order-type-header.expanded .mycart-dropdown-arrow {
  transform: rotate(180deg);
}
```

---

### 4. Footer Section

```jsx
<div className="mycart-footer-section">
  {/* Select All */}
  <div className="mycart-select-all-row">
    <input type="checkbox" id="select-all" {...props} />
    <label htmlFor="select-all">Select All (3)</label>
  </div>

  {/* Total Summary */}
  <div className="mycart-total-section">
    <span className="mycart-total-label">Total (3 Items):</span>
    <span className="mycart-total-amount">₱4,500</span>
  </div>

  {/* Checkout Button */}
  <button className="mycart-checkout-btn-clean" disabled={!hasSelected}>
    CHECK OUT (2 items)
  </button>
</div>
```

---

### 5. Empty State

```jsx
<div className="mycart-empty-state">
  <FaShoppingBag className="mycart-empty-icon" />
  <h3>Your cart is empty</h3>
  <p>Add some items to get started!</p>
</div>
```

---

### 6. Loading State

```jsx
<div className="mycart-loading-state">
  <div className="mycart-loading-spinner"></div>
  <p>Loading cart...</p>
</div>
```

---

## 🎨 Font Stack Priority

```css
font-family: 'Segoe UI', 'Inter', '-apple-system', 'BlinkMacSystemFont', sans-serif;

/* Fallback order:
   1. Segoe UI (Windows)
   2. Inter (Google Fonts/custom)
   3. -apple-system (macOS)
   4. BlinkMacSystemFont (Webkit browsers)
   5. Generic sans-serif
*/
```

---

## ✨ Common Interactive Patterns

### Button Hover Effect

```css
.mycart-checkout-btn-clean:hover:not(:disabled) {
  background: #4338ca;           /* Darker indigo */
  box-shadow: 0 12px 24px rgba(79, 70, 229, 0.25);  /* Enhanced shadow */
  transform: translateY(-2px);   /* Lift up */
  transition: all 0.3s ease;
}
```

### Quantity Button Active State

```css
.mycart-quantity-btn:active {
  transform: scale(0.95);        /* Press down */
  transition: transform 0.1s ease;
}
```

### Item Box Hover

```css
.mycart-item-box:hover {
  background: var(--mycart-light-gray);  /* Subtle background change */
  transition: all 0.2s ease;
}
```

---

## 🔄 Theming System

To create a custom theme, override CSS variables:

```css
/* Dark Theme Example */
:root {
  --mycart-primary: #6366f1;              /* Slate indigo */
  --mycart-light-gray: #1f2937;           /* Dark gray */
  --mycart-white: #111827;                /* Almost black */
  --mycart-text-dark: #f3f4f6;            /* Light gray */
  --mycart-text-light: #9ca3af;           /* Medium gray */
  --mycart-border: #374151;               /* Dark border */
}
```

---

## 📐 Common Measurements

```css
/* Border Radius */
border-radius: 12px    /* Main containers */
border-radius: 8px     /* Buttons, cards */
border-radius: 6px     /* Small elements */
border-radius: 4px     /* Tiny elements */

/* Font Weights */
font-weight: 400       /* Regular text */
font-weight: 500       /* Medium labels */
font-weight: 600       /* Semi-bold headings */
font-weight: 700       /* Bold amounts */

/* Z-index */
z-index: 1000          /* Modal overlay */

/* Max Width */
max-width: 500px       /* Desktop cart modal */
max-width: 100%        /* Tablet/mobile */
```

---

## 🎯 Quick Copy-Paste Snippets

### Add a new item box styling

```css
.mycart-item-box {
  display: flex;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--mycart-border);
  background: var(--mycart-white);
  transition: all 0.2s ease;
  align-items: flex-start;
}

.mycart-item-box:hover {
  background: var(--mycart-light-gray);
}
```

### Create a new button variant

```css
.mycart-custom-btn {
  padding: 12px 24px;
  background: var(--mycart-primary);
  color: var(--mycart-white);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--mycart-shadow-md);
}

.mycart-custom-btn:hover {
  background: #4338ca;
  transform: translateY(-2px);
}

.mycart-custom-btn:disabled {
  background: #d1d5db;
  opacity: 0.6;
  cursor: not-allowed;
}
```

### Create a custom card

```css
.mycart-custom-card {
  padding: 16px;
  background: var(--mycart-white);
  border: 1px solid var(--mycart-border);
  border-radius: 8px;
  box-shadow: var(--mycart-shadow-sm);
}
```

---

## 🎬 Animation Keyframes

```css
@keyframes mycart-fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes mycart-slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes mycart-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

## ♿ Accessibility Checklist

- ✓ All interactive elements have proper focus states
- ✓ Color contrast ratio ≥ 4.5:1 for text
- ✓ Semantic HTML with proper `<label>` associations
- ✓ Keyboard navigation support (Tab, Enter)
- ✓ ARIA attributes where needed
- ✓ No color-only information (text + icon/symbol)
- ✓ Font sizes ≥ 14px for body text

---

## 📊 Component Dimensions Reference

```
Modal
├─ Max Width: 500px
├─ Max Height: 85vh
├─ Border Radius: 12px
├─ Box Shadow: --mycart-shadow-lg
└─ Animation: 300ms slide-in

Header
├─ Padding: 24px
├─ Height: auto
├─ Border Bottom: 1px solid --mycart-border
├─ Background: --mycart-light-gray
└─ Font Size: 1.5rem

Product Item
├─ Padding: 16px 24px
├─ Gap: 16px
├─ Image Size: 88×88px
├─ Checkbox: 20×20px
└─ Min Height: auto

Quantity Controls
├─ Padding: 6px 10px
├─ Button Size: 24×24px
├─ Border: 1px solid --mycart-border
└─ Border Radius: 6px

Checkout Button
├─ Padding: 12px 24px
├─ Width: 100%
├─ Height: 44px (touch target)
├─ Font Weight: 600
└─ Border Radius: 8px

Footer
├─ Padding: 20px 24px
├─ Background: --mycart-light-gray
├─ Border Top: 1px solid --mycart-border
└─ Gap: 12px between sections
```

---

## 🚀 Performance Tips

1. **Use CSS Variables** for easy dynamic theming
2. **Minimal Repaints** - Use `transform` for animations (not `top`/`left`)
3. **Efficient Selectors** - All classes are specific and performant
4. **No Box Shadows on Scroll** - Applied only to static elements
5. **GPU Acceleration** - Animations use `transform` and `opacity`

---

## 📋 Browser Support

✅ Chrome 88+  
✅ Firefox 87+  
✅ Safari 14+  
✅ Edge 88+  
✅ iOS Safari 14+  
✅ Chrome Android 88+  

*CSS Variables supported in all modern browsers*

---

**Last Updated**: October 2025  
**Version**: 1.0 - Initial Modern Design
