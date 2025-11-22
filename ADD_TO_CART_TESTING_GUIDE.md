# Add to Cart - Testing & Verification Guide

## Quick Start Test (2 minutes)

### Step 1: Navigate to Home Page
1. Open your browser
2. Go to http://localhost:3000 (or your deployed URL)
3. Make sure you're logged in (sign up if needed)

### Step 2: Find a Product
1. You should see the "JERSEYS" category products displayed
2. Look for any product card with an image and "Add Cart" button

### Step 3: Click "Add Cart" Button
1. Click the **"Add Cart"** button on any product card
2. The **ProductModal** should open instantly showing:
   - Product name and image
   - Price
   - Size selection (Adult/Kids)
   - Order type toggle (Single/Team)
   - Add to Cart and Buy Now buttons

### Step 4: Customize Your Order
**For Single Order:**
1. Select size type (S, M, L, XL, 2XL)
2. Enter your name
3. Enter jersey number
4. Quantity (optional, default is 1)

**For Team Order:**
1. Click "Team Order" toggle
2. Select team name or enter a new one
3. Add team members:
   - Surname
   - Jersey number
   - Size
4. Click "Add Team Member" button to add more
5. Repeat for as many team members as needed

### Step 5: Add to Cart
1. Click the **"Add to Cart"** button in ProductModal
2. You should see:
   - ✅ Success notification at top: "✅ Added to Cart"
   - ProductModal closes automatically
   - You're back at product list

### Step 6: Verify in Cart
1. Click the **shopping cart icon** in the header
2. You should see:
   - Your added item in the cart
   - Correct product name, size, and price
   - Quantity selector works
   - Item can be removed with trash icon
   - Total price is calculated correctly

## Advanced Testing Scenarios

### Scenario 1: Add Multiple Items
1. Add a product to cart (follow steps 1-6 above)
2. Add another product with different options
3. Verify both items appear in cart
4. Verify total is sum of all items

### Scenario 2: Add Same Product Twice
1. Add "Jersey" with size M, single order
2. Add same "Jersey" with same options again
3. Expected behavior: Quantity increases to 2 (not two separate items)
4. OR if team order: Creates new separate item

### Scenario 3: Team Order Flow
1. Click "Add Cart" on a product
2. Toggle to "Team Order"
3. Add multiple team members
4. Verify in cart that all team members are listed in dropdown
5. Verify price is multiplied by number of team members

### Scenario 4: Size Type Pricing
1. For Adult size: Price should be full price
2. For Kids size: Price should be reduced by 200 (if product supports it)
3. Verify in cart that correct price is shown

### Scenario 5: Checkout Flow
1. Add items to cart
2. Check items by clicking checkboxes in cart
3. Click "CHECK OUT" button
4. CheckoutModal should open with selected items
5. Fill in shipping details
6. Proceed to payment
7. Place order

## Console Debugging

### Expected Console Logs (Open DevTools - F12)
When you click "Add Cart" and complete the process, you should see in the console:

```
🛒 handleAddToCart called for product: [Product Name] ID: [UUID]
🛒 Cart options: {size: 'M', quantity: 1, isTeamOrder: false, ...}
🛒 Adding to cart for user: [User ID]
🛒 Calling addToCart context function
✅ Item added to cart successfully
🛒 Loading cart for user: [User ID]
🛒 Cart items loaded: [Number] items
```

### Error Logs (if something goes wrong)
You might see:

```
❌ Error updating cart: [Error message]
❌ Error adding to cart: [Error message]
```

**What to do:** 
1. Check the error message
2. Try refreshing the page
3. Make sure you're logged in
4. Check your internet connection

## Troubleshooting

| Issue | Symptom | Solution |
|-------|---------|----------|
| **Button doesn't work** | Click "Add Cart" → nothing happens | Check browser console for errors, refresh page |
| **Modal doesn't open** | Can't see product customization options | Verify product data is loading (check network tab) |
| **Cart doesn't update** | Item added but not in cart | Check console for network errors, try again |
| **Wrong price** | Price in cart is different from product | Verify size type (kids/adult) is correct |
| **Quantity not increasing** | Adding same item twice creates duplicate | Expected for team orders, normal for single orders |

## Performance Expectations

- **Button click to modal open:** < 100ms (should be instant)
- **Add to cart process:** < 2 seconds (includes server save)
- **Cart modal update:** < 1 second (should be instant)
- **Checkout flow:** < 5 seconds total

## What Changed

### Files Modified:
1. **src/components/customer/ProductCategories.js**
   - Added onClick handler to "Add Cart" button
   - Now opens ProductModal when clicked

2. **src/components/customer/ProductModal.js**
   - Added console logging for debugging
   - Enhanced error handling

### Key Fix:
```javascript
// BEFORE: Button did nothing
<button className="sportswear-add-to-cart-btn" title="Add to Cart">

// AFTER: Button opens modal for customization
<button 
  className="sportswear-add-to-cart-btn" 
  title="Add to Cart"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    openProductModal(product);
  }}
>
```

## Success Criteria

✅ **The fix is successful when:**
- Click "Add Cart" on any product → ProductModal opens
- Can customize order (size, type, members)
- Click "Add to Cart" in modal → Item appears in cart
- Success notification appears
- No console errors

✅ **The feature works correctly when:**
- All 13 test scenarios above pass
- No error messages in console
- Performance is responsive (< 2 seconds)
- All data (product, price, size, type) is correct

## Next Steps

If all tests pass:
1. ✅ Add to cart functionality is fixed
2. Proceed with other features

If tests fail:
1. ❌ Check the error message in console
2. Verify user is logged in
3. Check network connectivity
4. Review the "Troubleshooting" section above
5. Contact support with console error message

## Contact & Support

For issues with the add-to-cart functionality:
- Check browser console (F12) for error messages
- Take a screenshot of the error
- Note the exact steps you took
- Report to development team with these details

## Quick Start Test (2 minutes)

### Step 1: Navigate to Home Page
1. Open your browser
2. Go to http://localhost:3000 (or your deployed URL)
3. Make sure you're logged in (sign up if needed)

### Step 2: Find a Product
1. You should see the "JERSEYS" category products displayed
2. Look for any product card with an image and "Add Cart" button

### Step 3: Click "Add Cart" Button
1. Click the **"Add Cart"** button on any product card
2. The **ProductModal** should open instantly showing:
   - Product name and image
   - Price
   - Size selection (Adult/Kids)
   - Order type toggle (Single/Team)
   - Add to Cart and Buy Now buttons

### Step 4: Customize Your Order
**For Single Order:**
1. Select size type (S, M, L, XL, 2XL)
2. Enter your name
3. Enter jersey number
4. Quantity (optional, default is 1)

**For Team Order:**
1. Click "Team Order" toggle
2. Select team name or enter a new one
3. Add team members:
   - Surname
   - Jersey number
   - Size
4. Click "Add Team Member" button to add more
5. Repeat for as many team members as needed

### Step 5: Add to Cart
1. Click the **"Add to Cart"** button in ProductModal
2. You should see:
   - ✅ Success notification at top: "✅ Added to Cart"
   - ProductModal closes automatically
   - You're back at product list

### Step 6: Verify in Cart
1. Click the **shopping cart icon** in the header
2. You should see:
   - Your added item in the cart
   - Correct product name, size, and price
   - Quantity selector works
   - Item can be removed with trash icon
   - Total price is calculated correctly

## Advanced Testing Scenarios

### Scenario 1: Add Multiple Items
1. Add a product to cart (follow steps 1-6 above)
2. Add another product with different options
3. Verify both items appear in cart
4. Verify total is sum of all items

### Scenario 2: Add Same Product Twice
1. Add "Jersey" with size M, single order
2. Add same "Jersey" with same options again
3. Expected behavior: Quantity increases to 2 (not two separate items)
4. OR if team order: Creates new separate item

### Scenario 3: Team Order Flow
1. Click "Add Cart" on a product
2. Toggle to "Team Order"
3. Add multiple team members
4. Verify in cart that all team members are listed in dropdown
5. Verify price is multiplied by number of team members

### Scenario 4: Size Type Pricing
1. For Adult size: Price should be full price
2. For Kids size: Price should be reduced by 200 (if product supports it)
3. Verify in cart that correct price is shown

### Scenario 5: Checkout Flow
1. Add items to cart
2. Check items by clicking checkboxes in cart
3. Click "CHECK OUT" button
4. CheckoutModal should open with selected items
5. Fill in shipping details
6. Proceed to payment
7. Place order

## Console Debugging

### Expected Console Logs (Open DevTools - F12)
When you click "Add Cart" and complete the process, you should see in the console:

```
🛒 handleAddToCart called for product: [Product Name] ID: [UUID]
🛒 Cart options: {size: 'M', quantity: 1, isTeamOrder: false, ...}
🛒 Adding to cart for user: [User ID]
🛒 Calling addToCart context function
✅ Item added to cart successfully
🛒 Loading cart for user: [User ID]
🛒 Cart items loaded: [Number] items
```

### Error Logs (if something goes wrong)
You might see:

```
❌ Error updating cart: [Error message]
❌ Error adding to cart: [Error message]
```

**What to do:** 
1. Check the error message
2. Try refreshing the page
3. Make sure you're logged in
4. Check your internet connection

## Troubleshooting

| Issue | Symptom | Solution |
|-------|---------|----------|
| **Button doesn't work** | Click "Add Cart" → nothing happens | Check browser console for errors, refresh page |
| **Modal doesn't open** | Can't see product customization options | Verify product data is loading (check network tab) |
| **Cart doesn't update** | Item added but not in cart | Check console for network errors, try again |
| **Wrong price** | Price in cart is different from product | Verify size type (kids/adult) is correct |
| **Quantity not increasing** | Adding same item twice creates duplicate | Expected for team orders, normal for single orders |

## Performance Expectations

- **Button click to modal open:** < 100ms (should be instant)
- **Add to cart process:** < 2 seconds (includes server save)
- **Cart modal update:** < 1 second (should be instant)
- **Checkout flow:** < 5 seconds total

## What Changed

### Files Modified:
1. **src/components/customer/ProductCategories.js**
   - Added onClick handler to "Add Cart" button
   - Now opens ProductModal when clicked

2. **src/components/customer/ProductModal.js**
   - Added console logging for debugging
   - Enhanced error handling

### Key Fix:
```javascript
// BEFORE: Button did nothing
<button className="sportswear-add-to-cart-btn" title="Add to Cart">

// AFTER: Button opens modal for customization
<button 
  className="sportswear-add-to-cart-btn" 
  title="Add to Cart"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    openProductModal(product);
  }}
>
```

## Success Criteria

✅ **The fix is successful when:**
- Click "Add Cart" on any product → ProductModal opens
- Can customize order (size, type, members)
- Click "Add to Cart" in modal → Item appears in cart
- Success notification appears
- No console errors

✅ **The feature works correctly when:**
- All 13 test scenarios above pass
- No error messages in console
- Performance is responsive (< 2 seconds)
- All data (product, price, size, type) is correct

## Next Steps

If all tests pass:
1. ✅ Add to cart functionality is fixed
2. Proceed with other features

If tests fail:
1. ❌ Check the error message in console
2. Verify user is logged in
3. Check network connectivity
4. Review the "Troubleshooting" section above
5. Contact support with console error message

## Contact & Support

For issues with the add-to-cart functionality:
- Check browser console (F12) for error messages
- Take a screenshot of the error
- Note the exact steps you took
- Report to development team with these details
