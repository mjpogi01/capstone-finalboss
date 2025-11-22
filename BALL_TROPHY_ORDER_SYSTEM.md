# 🏀🏆 Ball and Trophy Order System Documentation

## Overview

This document describes the ball and trophy order information system implemented in the Yohann's Sportswear e-commerce platform. The system provides specialized order forms and display interfaces for ball and trophy products, separate from apparel (jerseys, t-shirts, etc.).

## Features Implemented

### 1. **Product Category Detection**
The system automatically detects when a product belongs to the "balls" or "trophies" category and displays appropriate forms and information.

### 2. **Ball Order Information**
When ordering balls, customers can specify:
- **Sport Type**: Basketball, Volleyball, Soccer, Football, or Other
- **Brand**: e.g., Molten, Mikasa
- **Ball Size**: Size 3 (Kids), Size 5 (Youth), Size 6 (Women), Size 7 (Men), Official Size
- **Material**: Rubber, Synthetic Leather, Genuine Leather, or Composite

### 3. **Trophy Order Information**
When ordering trophies, customers can specify:
- **Trophy Type**: Cup Trophy, Figure Trophy, Plaque, Medal, Crystal Trophy, or Wooden Trophy
- **Size**: 6" (Small), 10" (Medium), 14" (Large), 18" (Extra Large), 24" (Premium)
- **Material**: Plastic, Metal, Crystal, Wood, or Acrylic
- **Engraving Text**: Custom text to be engraved (optional)
- **Occasion**: e.g., "Championship 2025"

---

## User Interface Components

### 1. **ProductModal** (`src/components/customer/ProductModal.js`)

**Purpose**: Capture ball/trophy details when adding items to cart or buying now.

**Features**:
- Automatically hides team order and single order forms for balls/trophies
- Shows dedicated ball details form with 🏀 icon
- Shows dedicated trophy details form with 🏆 icon
- Validates and stores details in cart items

**Visual Design**:
- Ball forms have orange gradient background (#ff6b35 to #f7931e)
- Trophy forms have gold gradient background (#ffd700 to #ffae42)
- Clean, easy-to-use dropdown selects and text inputs

---

### 2. **CartModal** (`src/components/customer/CartModal.js`)

**Purpose**: Display ball/trophy details in the shopping cart.

**Features**:
- Shows "🏀 Ball Details" or "🏆 Trophy Details" instead of "Team Order/Single Order"
- Expandable section shows all ball/trophy specifications
- Clean, organized display of information

**Visual Example**:
```
[Product Image]  Molten Basketball
                 🏀 Ball Details ▼
                 
                 [Expanded]
                 Sport: Basketball
                 Brand: Molten
                 Size: Size 7 (Men)
                 Material: Synthetic Leather
```

---

### 3. **CheckoutModal** (`src/components/customer/CheckoutModal.js`)

**Purpose**: Show ball/trophy details during checkout.

**Features**:
- Displays complete specifications before order placement
- Clear categorization (Ball or Trophy)
- Engraving text highlighted in gold color
- All details visible for review

---

### 4. **CustomerOrdersModal** (`src/components/customer/CustomerOrdersModal.js`)

**Purpose**: Display ball/trophy order information in order history.

**Features**:
- **Order Count Badge**: Shows total number of orders in header (e.g., "5 Orders")
- Ball orders show with 🏀 badge
- Trophy orders show with 🏆 badge
- Grid layout displays all specifications
- Different from apparel orders (no team name, surname, jersey number)

**Visual Design**:
- Ball badge: Orange gradient with white text
- Trophy badge: Gold gradient with dark text
- Information displayed in organized grid format
- Engraving text shown in italic gold font

---

## Data Structure

### Ball Details Object
```javascript
{
  sportType: 'Basketball',
  brand: 'Molten',
  ballSize: 'Size 7 (Men)',
  material: 'Synthetic Leather'
}
```

### Trophy Details Object
```javascript
{
  trophyType: 'Cup Trophy',
  size: '14" (Large)',
  material: 'Metal',
  engravingText: 'Champions 2025 - Victory League',
  occasion: 'Championship 2025'
}
```

### Order Item Structure
```javascript
{
  id: 'product-id',
  name: 'Molten Basketball',
  category: 'balls', // or 'trophies'
  price: 650.00,
  quantity: 2,
  ballDetails: {
    sportType: 'Basketball',
    brand: 'Molten',
    ballSize: 'Size 7 (Men)',
    material: 'Synthetic Leather'
  },
  // OR
  trophyDetails: {
    trophyType: 'Cup Trophy',
    size: '14" (Large)',
    material: 'Metal',
    engravingText: 'Champions 2025',
    occasion: 'Championship 2025'
  }
}
```

---

## CSS Styling

### Ball Details Styling
- Background: Orange gradient (rgba(255, 107, 53, 0.1) to rgba(247, 147, 30, 0.1))
- Border: 2px solid rgba(255, 107, 53, 0.3)
- Badge: Gradient (#ff6b35 to #f7931e) with white text

### Trophy Details Styling
- Background: Gold gradient (rgba(255, 215, 0, 0.1) to rgba(255, 174, 66, 0.1))
- Border: 2px solid rgba(255, 215, 0, 0.3)
- Badge: Gradient (#ffd700 to #ffae42) with dark text
- Engraving text: Italic, gold color (#ffd700)

---

## How It Works

### 1. **Adding to Cart**
1. User selects a ball or trophy product
2. ProductModal opens with ball/trophy specific form
3. User fills in details (sport type, brand, size, etc.)
4. Details are saved with cart item
5. Item appears in cart with category information

### 2. **Checkout Process**
1. Cart items are passed to CheckoutModal
2. System detects category (balls/trophies)
3. Appropriate details are displayed in checkout table
4. Order is placed with all specifications

### 3. **Order History**
1. Orders are fetched from database
2. Each order item's category is checked
3. Ball/trophy details are extracted and displayed
4. Organized grid layout shows all information

---

## Category Detection Logic

The system uses the product's `category` field to determine type:

```javascript
const isBall = item.category?.toLowerCase() === 'balls';
const isTrophy = item.category?.toLowerCase() === 'trophies';
const isApparel = !isBall && !isTrophy;
```

This ensures:
- **Balls**: Show ball-specific forms and details
- **Trophies**: Show trophy-specific forms and details
- **Apparel** (Jerseys, T-shirts, etc.): Show team order/single order forms

---

## Key Differences from Apparel Orders

| Feature | Apparel | Balls | Trophies |
|---------|---------|-------|----------|
| **Team Orders** | ✅ Yes | ❌ No | ❌ No |
| **Surname/Number** | ✅ Yes | ❌ No | ❌ No |
| **Size Selection** | ✅ Adult/Kids | ✅ Ball-specific | ✅ Height-based |
| **Brand** | ❌ No | ✅ Yes | ❌ No |
| **Sport Type** | ❌ No | ✅ Yes | ❌ No |
| **Trophy Type** | ❌ No | ❌ No | ✅ Yes |
| **Engraving** | ❌ No | ❌ No | ✅ Yes |
| **Occasion** | ❌ No | ❌ No | ✅ Yes |

---

## Files Modified

1. **`src/components/customer/CustomerOrdersModal.js`**
   - Added category detection
   - Added ball/trophy detail display
   - Added order count badge to header

2. **`src/components/customer/CustomerOrdersModal.css`**
   - Added ball-details and trophy-details styling
   - Added badge styling for balls and trophies
   - Added order count badge styling
   - Added responsive design for mobile

3. **`src/components/customer/ProductModal.js`**
   - Added ball and trophy state management
   - Added category detection
   - Added ball details form
   - Added trophy details form
   - Modified cart options to include category and details

4. **`src/components/customer/ProductModal.css`**
   - Added modal-ball-details-section styling
   - Added modal-trophy-details-section styling
   - Orange gradient for balls
   - Gold gradient for trophies

5. **`src/components/customer/CheckoutModal.js`**
   - Added category detection in cart items
   - Added ball details display
   - Added trophy details display

6. **`src/components/customer/CartModal.js`**
   - Added category detection
   - Added ball/trophy details in expandable section
   - Modified order type label to show icons

7. **`src/components/customer/CartModal.css`**
   - Added ball and trophy details styling
   - Added engraving text styling

---

## Testing Checklist

### Ball Orders
- [ ] Can add ball to cart with all details
- [ ] Ball details appear in cart
- [ ] Ball details appear in checkout
- [ ] Ball order shows correctly in order history
- [ ] All ball specifications display properly

### Trophy Orders
- [ ] Can add trophy to cart with all details
- [ ] Trophy details appear in cart
- [ ] Trophy details appear in checkout
- [ ] Trophy order shows correctly in order history
- [ ] Engraving text displays in gold italic font
- [ ] All trophy specifications display properly

### Order Count Badge
- [ ] Badge shows correct number of orders
- [ ] Badge appears in header when orders exist
- [ ] Badge updates when orders are added/cancelled
- [ ] Badge is responsive on mobile

---

## Future Enhancements

### Potential Improvements
1. **Image Upload**: Allow customers to upload designs for engraving
2. **3D Preview**: Show 3D preview of trophy with engraving
3. **Font Selection**: Let customers choose engraving font style
4. **Multi-line Engraving**: Support multiple lines of text
5. **Ball Customization**: Add custom logo printing for balls
6. **Bulk Discounts**: Automatic discounts for bulk ball/trophy orders
7. **Comparison Tool**: Compare different balls or trophies side-by-side

---

## Support & Maintenance

### Common Issues

**Issue**: Ball/Trophy details not saving
- **Solution**: Check that category field is set correctly ('balls' or 'trophies')

**Issue**: Details not showing in order history
- **Solution**: Ensure ballDetails/trophyDetails object is saved in order_items JSONB field

**Issue**: Styling not applied
- **Solution**: Check that CSS classes match the component files

### Database Considerations

The order_items JSONB field in the orders table stores ball/trophy details:

```sql
-- Example order_items JSONB structure
[
  {
    "name": "Molten Basketball",
    "category": "balls",
    "price": 650,
    "quantity": 2,
    "ballDetails": {
      "sportType": "Basketball",
      "brand": "Molten",
      "ballSize": "Size 7 (Men)",
      "material": "Synthetic Leather"
    }
  }
]
```

---

## Contact

For questions or issues with the ball and trophy order system, please contact the development team or refer to the main project README.

---

**Last Updated**: October 24, 2025  
**Version**: 1.0  
**Status**: ✅ Production Ready

