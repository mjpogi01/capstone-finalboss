# Mobile Filter Icon - Visual Guide

## 📱 Mobile View Layout

### Desktop View (>768px)
- Sidebar is visible on the left
- No mobile filter button shown

### Mobile View (≤767px)

```
┌──────────────────────────────────────────────┐
│  Shop Our Products                      [×]  │ ← Header
├──────────────────────────────────────────────┤
│  🔍 [Search products...]                     │ ← Search Bar
│                                              │
│  Sort by                                     │ ← Sort Label
│  [Relevance] [Latest] [Top Sales] [Price▼]  │ ← Sort Buttons
│                                              │
│            ◄  1/5  ►                         │ ← Pagination
├──────────────────────────────────────────────┤
│  [🔍 Filters]                  127 results   │ ← NEW FILTER ROW
├──────────────────────────────────────────────┤
│                                              │
│  [Product Grid - 2 columns on mobile]       │
│                                              │
│  [🏀 Product 1]    [🏀 Product 2]           │
│                                              │
│  [🏀 Product 3]    [🏀 Product 4]           │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 🎯 Filter Button Row Details

```
┌────────────────────────────────────────────────┐
│                                                │
│  [🔍 Filters]                    127 results   │
│   ↑                              ↑             │
│   Filter Button              Results Count     │
│   - Dark background                            │
│   - Filter icon + text                         │
│   - Aligned left                               │
│                                                │
└────────────────────────────────────────────────┘
```

**Filter Button Properties:**
- Background: `#1a1a1a`
- Border: `1px solid #262626`
- Padding: `10px 16px`
- Border radius: `8px`
- Font: Inter, 13px, 600 weight
- Icon size: 12px
- Gap between icon and text: 8px

**Results Count Properties:**
- Color: `#9ca3af` (gray)
- Font: Inter, 13px, 500 weight
- Aligned to the right

---

## 🎨 Mobile Filter Modal/Drawer

### When Filter Button is Clicked:

```
┌──────────────────────────────────────────────┐
│                                              │
│         [Semi-transparent overlay]           │
│                                              │
│                                              │
│                                              │
│  ┌─────────────────────────────────────────┐│
│  │ Filters                           [×]   ││ ← Header
│  ├─────────────────────────────────────────┤│
│  │                                         ││
│  │ All Filters              Clear All      ││
│  │                                         ││
│  │ By Category                             ││
│  │ ☐ Basketball Shoes                      ││
│  │ ☑ Basketball Jerseys                    ││
│  │ ☐ Basketballs                           ││
│  │       More ▼                            ││
│  │                                         ││
│  │ Price Range                             ││
│  │ [₱ 500] - [₱ 5000]                      ││
│  │                                         ││
│  │ Rating                                  ││
│  │ ★★★★★                                   ││
│  │ ★★★★☆ & Up                             ││
│  │ ★★★☆☆ & Up                             ││
│  │ ★★☆☆☆ & Up                             ││
│  │ ★☆☆☆☆ & Up                             ││
│  │                                         ││
│  ├─────────────────────────────────────────┤│
│  │         [Apply Filters]                 ││ ← Footer
│  └─────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

---

## 🎬 Animation Flow

### Opening Animation:
1. User taps "Filters" button
2. Overlay fades in (0.2s)
3. Drawer slides up from bottom (0.3s)
4. Content is immediately interactive

### Closing Animation:
1. User taps "Apply Filters", "×", or outside drawer
2. Drawer slides down
3. Overlay fades out
4. Modal removes from DOM

---

## 🎨 Detailed Styling

### Modal Overlay
```css
Background: rgba(0, 0, 0, 0.7)
Backdrop filter: blur(4px)
Z-index: 3000
Animation: fadeIn 0.2s
```

### Drawer Container
```css
Background: #0a0a0a
Border radius: 20px 20px 0 0
Max height: 85vh
Position: Fixed bottom
Box shadow: 0 -4px 20px rgba(0, 0, 0, 0.5)
Animation: slideUp 0.3s cubic-bezier
```

### Header Section
```css
Padding: 20px 20px 16px
Border bottom: 1px solid #1a1a1a
Display: flex (space-between)

Title:
  Font: Inter, 20px, 700
  Color: #ffffff

Close Button:
  Size: 36x36px
  Background: #1a1a1a
  Border radius: 8px
```

### Content Section
```css
Flex: 1
Overflow-y: auto
Padding: 20px

All sidebar styles apply here:
  - Category checkboxes
  - Price inputs
  - Rating buttons
```

### Footer Section
```css
Padding: 16px 20px
Border top: 1px solid #1a1a1a
Background: #0a0a0a

Apply Button:
  Width: 100%
  Padding: 14px
  Background: linear-gradient(#3b82f6 → #2563eb)
  Border radius: 10px
  Font: Inter, 15px, 600
  Box shadow: 0 4px 12px rgba(59, 130, 246, 0.3)
  
  Hover:
    Transform: translateY(-2px)
    Shadow: 0 6px 16px rgba(59, 130, 246, 0.4)
```

---

## 💡 Interactive States

### Filter Button
- **Default**: Dark gray background
- **Hover**: Blue border, blue text
- **Active/Pressed**: Slight scale down

### Apply Filters Button
- **Default**: Blue gradient with shadow
- **Hover**: Moves up 2px, stronger shadow
- **Active**: Back to default position

### Close Button
- **Default**: Gray icon
- **Hover**: White icon, darker background

---

## 📏 Positioning Details

### Filter Row Positioning
- **Below**: Sort buttons and pagination
- **Above**: Product grid
- **Full width**: 100% of container
- **Padding**: 12px 16px
- **Background**: #0a0a0a
- **Border bottom**: 1px solid #1a1a1a

### Horizontal Alignment
```
┌───────────────────────────────────────────────┐
│  [Filter Button]              [Results Count] │
│        ↑                              ↑       │
│   justify-content: space-between             │
│   display: flex                               │
│   align-items: center                         │
└───────────────────────────────────────────────┘
```

---

## 🔄 Filter Synchronization

### Desktop ↔ Mobile Sync
- All filters use the same state
- Changing filters on desktop updates mobile and vice versa
- No duplicate state management
- Clear All works everywhere

### State Variables Used
```javascript
selectedCategories  // Array of selected category names
priceMin           // Minimum price filter
priceMax           // Maximum price filter
selectedRating     // Selected star rating (1-5)
showAllCategories  // Show more/less categories
```

---

## 📱 Responsive Breakpoints

| Screen Width | Filter Row | Sidebar | Filter Modal |
|-------------|-----------|---------|-------------|
| ≤479px      | ✅ Shown  | ❌ Hidden | ✅ Available |
| 480-767px   | ✅ Shown  | ❌ Hidden | ✅ Available |
| 768-1024px  | ❌ Hidden | ✅ Shown  | ❌ Hidden    |
| >1024px     | ❌ Hidden | ✅ Shown  | ❌ Hidden    |

---

## ✅ Accessibility Features

1. **ARIA Labels**
   - `aria-label="Open filters"` on filter button
   - `aria-label="Close filters"` on close button

2. **Keyboard Navigation**
   - All interactive elements are focusable
   - Tab order is logical
   - Enter/Space to activate buttons

3. **Screen Reader Support**
   - Semantic HTML structure
   - Proper heading hierarchy
   - Clear button labels

4. **Visual Feedback**
   - Hover states on all interactive elements
   - Active states show selection
   - Color contrast meets WCAG standards

---

## 🎯 User Testing Scenarios

### Scenario 1: First Time User
1. Opens Shop Products on mobile
2. Sees filter button immediately
3. Taps filter button
4. Drawer opens smoothly
5. Selects a category
6. Sees products filter instantly
7. Taps "Apply Filters"
8. Drawer closes, filtered products shown

### Scenario 2: Power User
1. Opens filters
2. Sets category, price range, and rating
3. Closes modal
4. Sees 5 matching products
5. Reopens filters to adjust
6. All previous selections still active
7. Changes price range
8. Products update in real-time

### Scenario 3: Clear Filters
1. Opens filters with active selections
2. Taps "Clear All"
3. All checkboxes uncheck
4. Price inputs clear
5. Rating deselects
6. All products shown again

---

## 🚀 Performance Notes

- Modal only renders when `showMobileFilters` is true
- No performance impact when closed
- Smooth animations use GPU acceleration
- Minimal DOM manipulation

---

## 🎓 Code Snippets

### Opening the Filter Modal
```javascript
<button onClick={() => setShowMobileFilters(true)}>
  <FaFilter />
  <span>Filters</span>
</button>
```

### Closing the Filter Modal
```javascript
// Click outside
<div onClick={() => setShowMobileFilters(false)}>

// Stop propagation inside
<div onClick={(e) => e.stopPropagation()}>

// Close button
<button onClick={() => setShowMobileFilters(false)}>
```

### Results Count
```javascript
<div className="mobile-results-text">
  {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'}
</div>
```

---

**Created**: October 26, 2025
**For**: Mobile Shop Products Filter Feature

