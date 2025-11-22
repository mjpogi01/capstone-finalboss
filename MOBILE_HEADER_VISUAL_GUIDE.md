# 📱 Mobile Header - Visual Layout Guide

## 🎯 Final Mobile Layout

### Desktop View (>1024px)
```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]  HOME  ABOUT  HIGHLIGHTS  BRANCHES  FAQS  CONTACTS  🔍 🛒 ❤️ 👤 │
└─────────────────────────────────────────────────────────────────┘
```
**All elements visible in header**

---

### Mobile View (≤1024px)
```
┌──────────────────────────────────────┐
│                                      │
│  [☰]        [LOGO]          [🔍]    │
│  LEFT      CENTER          RIGHT     │
│                                      │
└──────────────────────────────────────┘
```
**Clean 3-element layout**

---

### When Hamburger Menu is OPEN:
```
┌─────────────────┬───────────────────┐
│                 │                   │
│   SIDEBAR       │  [LOGO]      [🔍] │
│   (280px)       │                   │
│                 │                   │
│  ┌──────────┐   │                   │
│  │   HOME   │   │                   │
│  │  ABOUT   │   │                   │
│  │HIGHLIGHTS│   │   BACKDROP        │
│  │ BRANCHES │   │   (Click to       │
│  │   FAQS   │   │    close)         │
│  │ CONTACTS │   │                   │
│  ├──────────┤   │                   │
│  │ 🛒 CART  │   │                   │
│  │ ❤️ WISH  │   │                   │
│  │ 📦 ORDER │   │                   │
│  │ 👤 ACCT  │   │                   │
│  │ 🚪 LOGOUT│   │                   │
│  └──────────┘   │                   │
│                 │                   │
└─────────────────┴───────────────────┘
```

---

## 🎨 Element Breakdown

### 1️⃣ Hamburger Menu (LEFT)
```
┌─────────┐
│         │
│   ☰     │  ← Closed state (FaBars icon)
│         │
└─────────┘

┌─────────┐
│         │
│   ×     │  ← Open state (FaTimes icon)
│         │
└─────────┘
```
**Properties:**
- Size: 40px × 40px (38px on mobile)
- Color: Cyan (#00bfff)
- Border: 1px solid cyan (30% opacity)
- Background: Cyan (10% opacity)
- Hover: Scale up + glow effect

---

### 2️⃣ Logo (CENTER)
```
┌──────────────────┐
│                  │
│   YOHANNS LOGO   │  ← Centered
│                  │
└──────────────────┘
```
**Properties:**
- Height: 40px (38px on mobile)
- Position: Centered with flex
- Drop-shadow: Cyan glow
- Hover: Scale up slightly

---

### 3️⃣ Search Icon (RIGHT)
```
┌─────────┐
│         │
│   🔍    │  ← Opens search dropdown
│         │
└─────────┘
```
**Properties:**
- Size: 36px × 36px
- Color: Cyan (#00bfff)
- Border: 1px solid cyan (30% opacity)
- Background: Cyan (10% opacity)
- Hover: Scale up + glow effect

---

## 📋 Sidebar Panel Details

### Sidebar Structure:
```
┌────────────────────────┐
│                        │
│  ▼ NAVIGATION LINKS    │
│  ┌──────────────────┐  │
│  │ 🏠 HOME          │  │
│  ├──────────────────┤  │
│  │ ℹ️ ABOUT         │  │
│  ├──────────────────┤  │
│  │ ⭐ HIGHLIGHTS    │  │
│  ├──────────────────┤  │
│  │ 📍 BRANCHES      │  │
│  ├──────────────────┤  │
│  │ ❓ FAQS          │  │
│  ├──────────────────┤  │
│  │ 📞 CONTACTS      │  │
│  └──────────────────┘  │
│                        │
│  ──────────────────────│  ← Divider
│                        │
│  ▼ ACTIONS             │
│  ┌──────────────────┐  │
│  │ 🛒 CART      [3]│  │  ← Badge shows count
│  ├──────────────────┤  │
│  │ ❤️ WISHLIST  [5]│  │  ← Badge shows count
│  ├──────────────────┤  │
│  │ 📦 ORDERS    [2]│  │  ← Badge shows count
│  ├──────────────────┤  │
│  │ 👤 ACCOUNT      │  │
│  ├──────────────────┤  │
│  │ 🚪 LOGOUT       │  │  ← Red color
│  └──────────────────┘  │
│                        │
└────────────────────────┘
```

---

## 🎨 Sidebar Styling

### Link States:

#### Default State:
```
┌──────────────────────┐
│ 🏠 HOME              │  ← Cyan border (20% opacity)
└──────────────────────┘     Background: Cyan (5% opacity)
```

#### Hover State:
```
┌──────────────────────┐
│  🏠 HOME         ➜   │  ← Slides right
└──────────────────────┘     Border: Cyan (40% opacity)
                             Background: Cyan (15% opacity)
                             Glow effect
```

#### Active State:
```
┌══════════════════════┐
║ 🏠 HOME              ║  ← Stronger cyan border
└══════════════════════┘     Gradient background
                             Brighter glow
```

---

## 📱 Responsive Sizing

### Logo Heights:
```
1024px+ : 35px (Desktop)
≤1024px : 40px (Tablet/Mobile)
≤768px  : 38px (Mobile)
≤480px  : 35px (Small Mobile)
≤360px  : 32px (Tiny Mobile)
```

### Hamburger Sizes:
```
≤1024px : 40px × 40px
≤768px  : 38px × 38px
≤480px  : 36px × 36px
≤360px  : 34px × 34px
```

### Search Icon Sizes:
```
≤1024px : 36px × 36px
≤768px  : 36px × 36px
≤480px  : 34px × 34px
≤360px  : 30px × 30px
```

### Sidebar Widths:
```
≤1024px : 280px
≤768px  : 260px
≤480px  : 240px
≤360px  : 220px
```

---

## 🎭 Animation Sequence

### Opening Sidebar:
```
Step 1: User clicks hamburger (☰)
        ↓
Step 2: Backdrop fades in (0.3s)
        ┌─────────────────┐
        │ DARK OVERLAY    │
        └─────────────────┘
        ↓
Step 3: Sidebar slides from left (0.3s)
        ┌──────────┐
        │ SIDEBAR  │ →
        └──────────┘
        ↓
Step 4: Icon changes to × (instant)
        ☰ → ×
```

### Closing Sidebar:
```
Step 1: User clicks × or backdrop
        ↓
Step 2: Icon changes to ☰ (instant)
        × → ☰
        ↓
Step 3: Sidebar slides to left (0.3s)
        ┌──────────┐
     ← │ SIDEBAR  │
        └──────────┘
        ↓
Step 4: Backdrop fades out (0.3s)
        ┌─────────────────┐
        │ DARK OVERLAY    │ → fade
        └─────────────────┘
```

---

## 🎨 Color Palette

### Primary Colors:
```
Cyan:       #00bfff
Cyan 50%:   rgba(0, 191, 255, 0.5)
Cyan 30%:   rgba(0, 191, 255, 0.3)
Cyan 20%:   rgba(0, 191, 255, 0.2)
Cyan 15%:   rgba(0, 191, 255, 0.15)
Cyan 10%:   rgba(0, 191, 255, 0.1)
Cyan 5%:    rgba(0, 191, 255, 0.05)
```

### Background:
```
Dark Primary:   #1a1a1a
Dark Secondary: #0d0d0d
Gradient:       linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)
```

### Special Colors:
```
Logout Red:     #ef4444
Logout Red 20%: rgba(220, 38, 38, 0.2)
Logout Red 10%: rgba(220, 38, 38, 0.1)

Badge Cyan:     linear-gradient(135deg, #00bfff, #0099cc)
Badge Shadow:   rgba(0, 191, 255, 0.4)

Backdrop:       rgba(0, 0, 0, 0.7)
```

---

## 📏 Spacing & Padding

### Header:
```
Desktop:  0.75rem 1.5rem
Tablet:   0.75rem 1rem
Mobile:   0.75rem 1rem
Small:    0.65rem 0.85rem
Tiny:     0.6rem 0.75rem
```

### Sidebar:
```
Padding Top:    5rem (clearance from header)
Padding Bottom: 2rem
Padding Left:   1.5rem
Padding Right:  1.5rem
```

### Links:
```
Padding:     1rem 1.5rem
Gap:         0.5rem (between links)
Icon Gap:    1rem (icon to text)
```

---

## ✨ Interactive Elements

### Badges:
```
┌────────┐
│   3    │  ← Rounded badge
└────────┘
```
**Properties:**
- Min-width: 24px
- Height: 24px
- Border-radius: 12px
- Background: Cyan gradient
- Shadow: Cyan glow
- Font: Bold, 0.75rem

---

## 🎯 Touch Targets

All interactive elements meet accessibility standards:

✅ **Hamburger**: 40px × 40px (WCAG AAA)  
✅ **Logo**: 40px height (clickable)  
✅ **Search**: 36px × 36px (WCAG AAA)  
✅ **Sidebar Links**: 48px+ height (WCAG AAA)  
✅ **Action Buttons**: 48px+ height (WCAG AAA)

---

## 📐 Z-Index Hierarchy

```
Layer 5: Hamburger Button    (z-index: 1001)
Layer 4: Sidebar Panel        (z-index: 1000)
Layer 3: Backdrop Overlay     (z-index: 999)
Layer 2: Header               (z-index: 100)
Layer 1: Page Content         (z-index: 1)
```

This ensures:
- Hamburger always clickable
- Sidebar above backdrop
- Backdrop blocks page interaction
- Header stays on top of page

---

## 🚀 Performance

**Optimizations:**
- ✅ CSS-only animations (no JavaScript)
- ✅ Hardware-accelerated transforms
- ✅ Optimized transitions (0.3s)
- ✅ Minimal repaints
- ✅ No layout thrashing

**File Size:**
- CSS added: ~3KB
- No JavaScript changes
- No images added

---

## 📱 Device Testing Grid

| Device | Width | Logo | Burger | Search | Sidebar |
|--------|-------|------|--------|--------|---------|
| Desktop | >1024px | 35px | Hidden | 🔍 | Hidden |
| Tablet | 1024px | 40px | 40px | 36px | 280px |
| iPhone 14 | 390px | 38px | 38px | 36px | 260px |
| iPhone SE | 375px | 35px | 36px | 34px | 240px |
| Galaxy S21 | 360px | 32px | 34px | 30px | 220px |

---

**Status**: ✅ **Complete - Visual Guide Ready!**

This guide shows exactly how the mobile header looks and behaves at every breakpoint and state.


