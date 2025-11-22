# Cart Duplicate Detection - Detailed Logic

## Summary
**LAHAT NG DETALYE DAPAT EXACTLY THE SAME** para maging duplicate at mag-increase ang quantity. Kung may kahit anong difference, **SEPARATE ENTRY** siya sa cart.

---

## Ano ang Nag-Dedetermine ng "Duplicate"?

Para maging DUPLICATE at mag-increase lang ang quantity, dapat **LAHAT** ng ito ay EXACTLY THE SAME:

### ✅ Required Matches:
1. **Same Product** (same product ID)
2. **Same Size** (M, L, XL, etc.)
3. **Same Order Type** (Team Order or Single Order)
4. **Same Customization Details:**
   - For Team Orders: Same team members list
   - For Single Orders: Same name, surname, number

---

## Mga Examples

### Example 1: True Duplicate ✅ (Quantity Increase)

**First Add:**
```
Product: Jersey A
Size: M
Type: Single Order
Details: Team Name "Lakers", Surname "Smith", Number "10"
Quantity: 1
```

**Second Add (EXACTLY THE SAME):**
```
Product: Jersey A
Size: M
Type: Single Order
Details: Team Name "Lakers", Surname "Smith", Number "10"
Quantity: 1
```

**Result:**
```
✅ Duplicate detected! Quantity increased to 2
Cart shows: 1 entry with Qty: 2
```

---

### Example 2: Different Size ❌ (Separate Entry)

**First Add:**
```
Product: Jersey A
Size: M
Quantity: 1
```

**Second Add (DIFFERENT SIZE):**
```
Product: Jersey A
Size: L  ← DIFFERENT!
Quantity: 1
```

**Result:**
```
✅ NOT duplicate (different size)
Cart shows:
  - Jersey A (Size L) | Qty: 1
  - Jersey A (Size M) | Qty: 1
```

---

### Example 3: Different Jersey Number ❌ (Separate Entry)

**First Add:**
```
Product: Jersey A
Size: M
Details: Team "Lakers", Surname "Smith", Number "10"
Quantity: 1
```

**Second Add (DIFFERENT NUMBER):**
```
Product: Jersey A
Size: M
Details: Team "Lakers", Surname "Smith", Number "23"  ← DIFFERENT!
Quantity: 1
```

**Result:**
```
✅ NOT duplicate (different jersey number)
Cart shows:
  - Jersey A (Lakers, Smith #23) | Qty: 1
  - Jersey A (Lakers, Smith #10) | Qty: 1
```

---

### Example 4: Different Surname ❌ (Separate Entry)

**First Add:**
```
Product: Jersey A
Size: M
Details: Team "Lakers", Surname "Smith", Number "10"
Quantity: 1
```

**Second Add (DIFFERENT SURNAME):**
```
Product: Jersey A
Size: M
Details: Team "Lakers", Surname "Jones", Number "10"  ← DIFFERENT!
Quantity: 1
```

**Result:**
```
✅ NOT duplicate (different surname)
Cart shows:
  - Jersey A (Lakers, Jones #10) | Qty: 1
  - Jersey A (Lakers, Smith #10) | Qty: 1
```

---

### Example 5: Team Order vs Single Order ❌ (Separate Entry)

**First Add:**
```
Product: Jersey A
Size: M
Type: Team Order (5 members)
Quantity: 5
```

**Second Add (DIFFERENT TYPE):**
```
Product: Jersey A
Size: M
Type: Single Order  ← DIFFERENT!
Quantity: 1
```

**Result:**
```
✅ NOT duplicate (different order type)
Cart shows:
  - Jersey A (Single Order) | Qty: 1
  - Jersey A (Team Order, 5 members) | Qty: 5
```

---

### Example 6: Different Team Names ❌ (Separate Entry)

**First Add:**
```
Product: Jersey A
Size: M
Type: Team Order
Team Name: "Lakers"
Members: 5
```

**Second Add (DIFFERENT TEAM NAME):**
```
Product: Jersey A
Size: M
Type: Team Order
Team Name: "Warriors"  ← DIFFERENT!
Members: 5
```

**Result:**
```
✅ NOT duplicate (different team name)
Cart shows:
  - Jersey A (Team: Warriors, 5 members) | Qty: 5
  - Jersey A (Team: Lakers, 5 members) | Qty: 5
```

---

## Technical Implementation

### Step 1: Initial Filter
```javascript
// Find items with same product, size, and order type
const existingItems = await supabase
  .from('user_carts')
  .select('*')
  .eq('user_id', userId)
  .eq('product_id', cartItem.id)      // Same product
  .eq('size', cartItem.size)          // Same size
  .eq('is_team_order', cartItem.isTeamOrder);  // Same order type
```

### Step 2: Deep Comparison
```javascript
// For each potential match, compare customization details
for (const existingItem of existingItems) {
  // Compare team members (for team orders)
  const isSameTeamDetails = 
    JSON.stringify(existingItem.team_members) === 
    JSON.stringify(cartItem.teamMembers);
  
  // Compare single order details (name, surname, number)
  const isSameSingleDetails = 
    JSON.stringify(existingItem.single_order_details) === 
    JSON.stringify(cartItem.singleOrderDetails);
  
  // If EVERYTHING matches, it's a duplicate
  if (isSameTeamDetails && isSameSingleDetails) {
    foundExactMatch = existingItem;
    break;
  }
}
```

### Step 3: Action
```javascript
if (foundExactMatch) {
  // Increase quantity
  newQuantity = existing.quantity + newItem.quantity;
  console.log('🔄 EXACT match found, increasing quantity');
} else {
  // Create separate entry
  console.log('✅ Different details, creating separate entry');
}
```

---

## What Gets Compared?

### For Apparel (Jerseys, Shirts, etc.):

#### Single Order:
```javascript
{
  teamName: "Lakers",     // Must match exactly
  surname: "Smith",       // Must match exactly
  number: "10",          // Must match exactly
  size: "M"              // Must match exactly
}
```

#### Team Order:
```javascript
{
  teamName: "Lakers",     // Must match exactly
  teamMembers: [          // Array must match exactly
    { surname: "Smith", number: "10", size: "M" },
    { surname: "Jones", number: "23", size: "L" },
    // ... all members must be identical
  ]
}
```

### For Balls:
```javascript
{
  product_id: "basketball-uuid",  // Must match
  size: "Size 7",                 // Must match
  // Balls typically don't have customization
}
```

### For Trophies:
```javascript
{
  product_id: "trophy-uuid",      // Must match
  size: '10"',                    // Must match
  trophyDetails: {
    material: "Gold",             // Must match
    engravingText: "Champions",   // Must match
    occasion: "2024"              // Must match
  }
}
```

---

## Console Logs for Debugging

### Duplicate Found (Quantity Increase):
```
🔄 EXACT same item found (same size, same customization), increasing quantity from 1 to 2
```

### NOT Duplicate (Separate Entry):
```
✅ Same product but different customization details, creating separate entry
✅ New item added to cart: Jersey A
```

---

## Quick Reference Chart

| Scenario | Product | Size | Customization | Result |
|----------|---------|------|---------------|--------|
| Exact same everything | ✅ Same | ✅ Same | ✅ Same | 🔄 **Quantity +1** |
| Different size | ✅ Same | ❌ Different | ✅ Same | ✅ **Separate Entry** |
| Different number | ✅ Same | ✅ Same | ❌ Different | ✅ **Separate Entry** |
| Different name | ✅ Same | ✅ Same | ❌ Different | ✅ **Separate Entry** |
| Team vs Single | ✅ Same | ✅ Same | ❌ Different type | ✅ **Separate Entry** |
| Different team | ✅ Same | ✅ Same | ❌ Different team | ✅ **Separate Entry** |

---

## Summary

### Mag-i-increase ang Quantity kung:
✅ **LAHAT** ay exactly the same:
- Same product
- Same size
- Same order type
- Same customization (team name, surname, number, etc.)

### Mag-c-create ng Separate Entry kung:
❌ **May kahit ANO na different**:
- Different size
- Different jersey number
- Different surname
- Different team name
- Different order type (team vs single)
- Different team members

---

## Testing Checklist

- [ ] Same product, same size, same details → Quantity increases ✅
- [ ] Same product, different size → Separate entries ✅
- [ ] Same product, different number → Separate entries ✅
- [ ] Same product, different surname → Separate entries ✅
- [ ] Team order vs single order → Separate entries ✅
- [ ] Different team names → Separate entries ✅

---

**Bottom Line:** Kung may kahit anong difference (size, number, name, team, etc.), **HINDI duplicate** at mag-c-create ng **separate entry** sa cart! 🎯

