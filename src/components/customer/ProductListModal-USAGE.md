# ProductListModal - Usage Guide

## Overview
The ProductListModal is a comprehensive product listing component that displays all available products in a clean, responsive modal/popup interface.

## Features
✅ **Search Functionality** - Real-time search across product names and descriptions
✅ **Category Filter** - Filter products by category
✅ **Sorting Options** - Sort by name, price (low/high), popularity, or latest
✅ **Product Cards** - Display product image, name, description, price, rating, and sold count
✅ **Quick Add to Cart** - Add products directly from the list
✅ **Product Details** - Click on any product to view full details in ProductModal
✅ **Pagination** - Navigate through large product lists
✅ **Responsive Design** - Works perfectly on mobile, tablet, and desktop
✅ **Loading & Error States** - Proper handling of loading and error scenarios
✅ **Star Rating System** - Visual rating display
✅ **Dark Theme** - Matches your existing dark theme design

## Installation

### 1. Import the Component
```javascript
import ProductListModal from './components/customer/ProductListModal';
```

### 2. Add State to Your Component
```javascript
const [showProductList, setShowProductList] = useState(false);
```

### 3. Add the Modal to Your JSX
```javascript
<ProductListModal 
  isOpen={showProductList} 
  onClose={() => setShowProductList(false)} 
/>
```

### 4. Trigger the Modal with "Shop Now" Button
```javascript
<button onClick={() => setShowProductList(true)}>
  Shop Now
</button>
```

## Complete Integration Example

### Example: Adding to Hero Component

```javascript
import React, { useState } from 'react';
import ProductListModal from './ProductListModal';
import './Hero.css';

const Hero = () => {
  const [showProductList, setShowProductList] = useState(false);

  return (
    <>
      <div className="hero-section">
        <div className="hero-content">
          <h1>Welcome to Our Store</h1>
          <p>Discover amazing products</p>
          <button 
            className="shop-now-btn"
            onClick={() => setShowProductList(true)}
          >
            Shop Now
          </button>
        </div>
      </div>

      {/* Product List Modal */}
      <ProductListModal 
        isOpen={showProductList} 
        onClose={() => setShowProductList(false)} 
      />
    </>
  );
};

export default Hero;
```

### Example: Adding to Header/Navbar

```javascript
import React, { useState } from 'react';
import ProductListModal from './ProductListModal';
import './Header.css';

const Header = () => {
  const [showProductList, setShowProductList] = useState(false);

  return (
    <>
      <header className="header">
        <nav className="navbar">
          <div className="logo">My Store</div>
          <div className="nav-links">
            <button onClick={() => setShowProductList(true)}>
              Products
            </button>
            {/* Other nav items */}
          </div>
        </nav>
      </header>

      {/* Product List Modal */}
      <ProductListModal 
        isOpen={showProductList} 
        onClose={() => setShowProductList(false)} 
      />
    </>
  );
};

export default Header;
```

## Customization

### Modify Products Per Page
In `ProductListModal.js`, change line 21:
```javascript
const productsPerPage = 12; // Change to your desired number
```

### Modify Grid Columns
In `ProductListModal.css`, adjust the grid template:
```css
.products-grid {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  /* Change 280px to adjust card minimum width */
}
```

### Change Color Scheme
Update the gradient colors in `ProductListModal.css`:
```css
.product-list-modal {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  /* Customize your gradient here */
}
```

## API Integration

The component automatically fetches products using `productService.getAllProducts()`. 

Make sure your product service returns products with this structure:
```javascript
{
  id: number,
  name: string,
  price: number,
  description: string,
  image_url: string,
  category: string,
  rating: number (optional),
  review_count: number (optional),
  sold_quantity: number (optional),
  created_at: date (optional)
}
```

## Key Features Explanation

### Search
- Searches across product names and descriptions
- Real-time filtering as you type
- Case-insensitive

### Category Filter
- Automatically detects unique categories from products
- "All" option to show all products
- Updates dynamically when products change

### Sorting Options
- **Name**: Alphabetical order
- **Price: Low to High**: Ascending price
- **Price: High to Low**: Descending price
- **Popularity**: Based on sold_quantity
- **Latest**: Based on created_at timestamp

### Quick Add vs. Full Details
- **Quick Add Button**: Adds product with default settings (single order, size M)
- **Click Product Card**: Opens ProductModal for full customization

### Pagination
- Shows previous/next buttons
- Displays page numbers with ellipsis for large sets
- Shows current page highlighted
- Displays result count at bottom

## Styling Tips

### Button Styling for "Shop Now"
```css
.shop-now-btn {
  background: linear-gradient(135deg, #00bfff 0%, #0099cc 100%);
  color: #000000;
  padding: 15px 40px;
  border: none;
  border-radius: 30px;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 191, 255, 0.4);
}

.shop-now-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 191, 255, 0.6);
}
```

## Browser Compatibility
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers

## Performance Tips
- Products are fetched only when modal opens
- Pagination limits DOM elements
- Images use object-fit for consistent sizing
- Smooth scrolling with custom scrollbar

## Troubleshooting

### Modal doesn't open
- Check that `isOpen` prop is being set to `true`
- Verify state is properly managed

### Products not loading
- Check browser console for errors
- Verify `productService.getAllProducts()` is working
- Check network tab for API calls

### Styling issues
- Ensure CSS file is imported
- Check for conflicting global styles
- Verify z-index is higher than other elements

## Advanced Usage

### Pre-filter by Category
```javascript
<ProductListModal 
  isOpen={showProductList} 
  onClose={() => setShowProductList(false)}
  initialCategory="Sports" // Add this prop and handle in component
/>
```

### Custom Product Click Handler
Modify the `handleProductClick` function in the component to add custom behavior before opening ProductModal.

---

**Created by**: Your Development Team
**Version**: 1.0.0
**Last Updated**: 2025

