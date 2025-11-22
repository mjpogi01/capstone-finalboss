# Branches Page - Map Z-Index Fix

## Issue
The map on the Branches page was overlapping the fixed header when scrolling. This created a poor user experience where the map would cover navigation elements.

## Root Cause
The Leaflet map library creates map elements with internal z-index values (typically 400-600 for map panes and 1000+ for some controls). Without explicitly setting z-index values on the page containers, these map elements were appearing above the fixed header.

### Header Z-Index Values
The header component uses various z-index values:
- Base header: `z-index: 100`
- Dropdown menus: `z-index: 1000-1001`
- Mobile menu: `z-index: 9999`

### Problem
Leaflet map elements can have z-index values around 400-1000, which could potentially overlap with some header elements (z-index: 100-1001 range).

## Solution
Added proper z-index stacking context to all Branches page containers to ensure the entire page content stays below the header.

### CSS Changes Applied

#### 1. Main Container
```css
.branches-container {
  /* existing styles... */
  position: relative;
  z-index: 1;
}
```

#### 2. Wrapper Container
```css
.branches-wrapper {
  /* existing styles... */
  position: relative;
  z-index: 1;
}
```

#### 3. Content Section
```css
.branches-content {
  /* existing styles... */
  position: relative;
  z-index: 1;
}
```

#### 4. Layout Grid
```css
.branches-layout {
  /* existing styles... */
  position: relative;
  z-index: 1;
}
```

#### 5. Map Column
```css
.branches-map-column {
  /* existing styles... */
  position: relative;
  z-index: 1;
}
```

#### 6. Map Wrapper
```css
.branches-map-wrapper {
  /* existing styles... */
  position: relative;
  z-index: 1;
}
```

#### 7. Map Container
```css
.branches-map {
  /* existing styles... */
  position: relative;
  z-index: 1;
}
```

## How This Fix Works

### Stacking Context
By adding `position: relative` and `z-index: 1` to all major containers:

1. **Creates a new stacking context** at the page level with z-index: 1
2. **All child elements** (including Leaflet map elements) are now contained within this stacking context
3. **The header** (with z-index values of 100-9999) sits in a different stacking context and remains on top
4. **Page content** is properly layered below the header regardless of internal z-index values

### Z-Index Hierarchy
```
Root Stacking Context
├── Header Component (z-index: 100-9999) ← Always on top
└── Branches Page (z-index: 1)
    └── All content including map (contained within z-index: 1 context)
        └── Leaflet map elements (z-index: 400-1000, but relative to parent)
```

### Key Concept
Even though Leaflet map elements might have z-index values like 400 or 600, they are now relative to the `branches-container` (z-index: 1) stacking context. This means they effectively have a lower z-index than the header (z-index: 100+) in the root stacking context.

## Benefits

### 1. **Fixed Header Visibility**
- Header remains visible and accessible at all times
- No overlap with map elements during scrolling
- Navigation and user controls always accessible

### 2. **Proper Layering**
- Clear visual hierarchy maintained
- Page content properly positioned below header
- Consistent behavior across all scroll positions

### 3. **No Impact on Functionality**
- Map remains fully interactive
- All map controls work as expected
- Travel info panel displays correctly
- Branch list scrolling unaffected

### 4. **Consistent with Best Practices**
- Proper use of CSS stacking contexts
- Clean separation of concerns
- Follows standard z-index management patterns

### 5. **No Side Effects**
- Doesn't affect other page elements
- Maintains all hover effects
- Preserves all animations and transitions
- No performance impact

## Testing Checklist

✅ Header stays on top when scrolling down  
✅ Header stays on top when scrolling up  
✅ Map remains interactive  
✅ Map controls work correctly  
✅ Branch list scrolling works  
✅ Travel info panel displays correctly  
✅ Branch markers are clickable  
✅ Popups display properly  
✅ Route drawing still works  
✅ Mobile responsive behavior maintained  
✅ No visual glitches or artifacts  
✅ All hover effects still work  

## Technical Details

### CSS Properties Added
- **Property**: `position: relative`
- **Purpose**: Creates a positioning context for z-index to work
- **Property**: `z-index: 1`
- **Purpose**: Establishes a low-priority stacking context

### Why Z-Index 1?
- Low enough to stay below header (z-index: 100+)
- High enough to maintain proper page layering
- Simple and maintainable value
- Industry standard for content containers

### Alternative Solutions Considered

#### ❌ Increasing Header Z-Index
- Could cause conflicts with modals or overlays
- Not addressing the root cause
- May create future z-index wars

#### ❌ Decreasing Map Z-Index
- Leaflet sets z-index internally
- Would require modifying library behavior
- Not maintainable approach

#### ✅ Creating Stacking Context (Selected)
- Cleanest solution
- Doesn't modify library behavior
- Easy to maintain
- Follows CSS best practices

## Browser Compatibility

Tested and working on:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

All browsers support `position: relative` and `z-index` properties.

## Files Modified

1. **src/pages/customer/Branches.css** - Added z-index and position properties to 7 container classes

## Related Components

### Header Component
- File: `src/components/customer/Header.css`
- Z-Index Range: 100-9999
- No changes needed

### Leaflet Map
- Library: react-leaflet
- Internal Z-Index: 400-1000+
- No changes needed

## Future Considerations

### Z-Index Management
If other pages have similar fixed/sticky elements, consider:
1. Creating a z-index variable system (CSS custom properties)
2. Documenting z-index hierarchy
3. Applying same stacking context pattern

### Example Z-Index System
```css
:root {
  --z-index-content: 1;
  --z-index-header: 100;
  --z-index-dropdown: 1000;
  --z-index-modal: 5000;
  --z-index-overlay: 9999;
}
```

## Prevention

To prevent similar issues in the future:

### For New Pages
1. Always set `position: relative` and `z-index: 1` on main page containers
2. Test scrolling behavior with fixed headers
3. Check for z-index conflicts during development

### For Third-Party Libraries
1. Be aware that libraries may set their own z-index values
2. Use stacking contexts to contain library elements
3. Document any z-index requirements

## Summary

✅ **Issue**: Map overlapping fixed header  
✅ **Cause**: Missing z-index stacking context  
✅ **Solution**: Added `position: relative` and `z-index: 1` to all major containers  
✅ **Result**: Header stays on top, map stays interactive, no side effects  
✅ **Testing**: All functionality preserved  

---

**Status**: ✅ Fixed
**Date**: October 25, 2025
**Impact**: Visual fix only, no functional changes
**Files Modified**: 1 CSS file, 7 class updates

