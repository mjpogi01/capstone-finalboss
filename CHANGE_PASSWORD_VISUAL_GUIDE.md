# Change Password - Visual Guide

## 🎨 UI Components Overview

### 1. Profile Page - Change Password Button

**Location**: Profile Page → Personal Information Section → Password Field

```
┌─────────────────────────────────────────────────┐
│  Personal Information                            │
├─────────────────────────────────────────────────┤
│  Name :          [John Doe                    ] │
│  Email Address : [john@example.com           ] │
│  Phone Number :  [+1234567890                ] │
│  Address :       [123 Main St                ] │
│  Password :      ••••••••••••••••  [Change Password] │
└─────────────────────────────────────────────────┘
```

**Button Style**:
- Background: Cyan blue (#00bfff)
- Text: Black
- Hover: Lighter cyan with lift effect
- Size: Compact, fits next to password dots

---

### 2. Change Password Modal - Full View

```
┌──────────────────────────────────────────────────────┐
│  ╔════════════════════════════════════════════════╗  │
│  ║  Change Password                            ✕ ║  │
│  ╠════════════════════════════════════════════════╣  │
│  ║                                                 ║  │
│  ║  Current Password                               ║  │
│  ║  [•••••••••••••••••••••••••••••••••••]  👁  ║  │
│  ║                                                 ║  │
│  ║  New Password                                   ║  │
│  ║  [•••••••••••••••••••••••••••••••••••]  👁  ║  │
│  ║  Password must be at least 6 characters long    ║  │
│  ║                                                 ║  │
│  ║  Confirm New Password                           ║  │
│  ║  [•••••••••••••••••••••••••••••••••••]  👁  ║  │
│  ║                                                 ║  │
│  ║         [Cancel]  [CHANGE PASSWORD]             ║  │
│  ╚════════════════════════════════════════════════╝  │
└──────────────────────────────────────────────────────┘
```

**Modal Features**:
- **Border**: Cyan blue glow (#00bfff)
- **Background**: Pure black with transparency
- **Width**: 500px (desktop), 90% (mobile)
- **Position**: Centered on screen
- **Backdrop**: Dark with blur effect

---

### 3. Error State Example

```
┌──────────────────────────────────────────────────────┐
│  ╔════════════════════════════════════════════════╗  │
│  ║  Change Password                            ✕ ║  │
│  ╠════════════════════════════════════════════════╣  │
│  ║                                                 ║  │
│  ║  ⚠️ Current password is incorrect               ║  │
│  ║                                                 ║  │
│  ║  Current Password                               ║  │
│  ║  [wrongpass123.....................]  👁      ║  │
│  ║                                                 ║  │
│  ║  New Password                                   ║  │
│  ║  [newpass123........................]  👁      ║  │
│  ║  Password must be at least 6 characters long    ║  │
│  ║                                                 ║  │
│  ║  Confirm New Password                           ║  │
│  ║  [newpass123........................]  👁      ║  │
│  ║                                                 ║  │
│  ║         [Cancel]  [CHANGE PASSWORD]             ║  │
│  ╚════════════════════════════════════════════════╝  │
└──────────────────────────────────────────────────────┘
```

**Error Message Style**:
- Background: Red with transparency (#ff6b6b)
- Border: Red
- Icon: Warning (⚠️)
- Animation: Shake effect

---

### 4. Password Visibility Toggle States

**Hidden (Default)**:
```
[•••••••••••••••••••••••••••••••••••]  👁
```

**Visible**:
```
[mySecretPassword123................]  👁‍🗨
```

**States**:
- **Hidden**: Eye icon (👁) - Shows dots (•••)
- **Visible**: Eye-slash icon (👁‍🗨) - Shows actual text
- **Hover**: Icon color changes to cyan blue

---

### 5. Loading State

```
┌──────────────────────────────────────────────────────┐
│  ╔════════════════════════════════════════════════╗  │
│  ║  Change Password                            ✕ ║  │
│  ╠════════════════════════════════════════════════╣  │
│  ║                                                 ║  │
│  ║  Current Password                               ║  │
│  ║  [•••••••••••••••••••••••••••••••••••]  👁  ║  │
│  ║                                                 ║  │
│  ║  New Password                                   ║  │
│  ║  [•••••••••••••••••••••••••••••••••••]  👁  ║  │
│  ║  Password must be at least 6 characters long    ║  │
│  ║                                                 ║  │
│  ║  Confirm New Password                           ║  │
│  ║  [•••••••••••••••••••••••••••••••••••]  👁  ║  │
│  ║                                                 ║  │
│  ║         [Cancel]  [Changing... ⏳]              ║  │
│  ╚════════════════════════════════════════════════╝  │
└──────────────────────────────────────────────────────┘
```

**Loading Indicators**:
- Button text: "Changing..."
- Button disabled: Reduced opacity
- All inputs disabled
- Cursor: Not-allowed on disabled elements

---

### 6. Success Notification

**After successful password change**:

```
┌─────────────────────────────────────────┐
│  ✓ Password changed successfully!       │
└─────────────────────────────────────────┘
     (Appears at top of page, auto-dismisses)
```

**Notification Style**:
- Background: Green (#4caf50)
- Icon: Checkmark (✓)
- Position: Top-right or top-center
- Duration: 3-5 seconds
- Animation: Slide in from top

---

## 🎭 Animation Sequences

### Modal Opening
```
1. Overlay fades in (0.2s)
2. Modal slides up and fades in (0.3s)
3. Fields become interactive
```

### Modal Closing
```
1. Modal fades out (0.2s)
2. Overlay fades out (0.2s)
3. Form resets
```

### Error Display
```
1. Error box appears
2. Shake animation (0.3s)
3. Red border on invalid field
```

### Success Flow
```
1. Button shows "Changing..."
2. Success notification appears
3. Modal closes automatically
4. Notification dismisses after 3s
```

---

## 📐 Spacing & Layout

### Desktop Layout (1920x1080)
```
Modal Width:      500px
Modal Height:     Auto (fits content)
Padding:          2rem (32px)
Field Spacing:    1.25rem (20px)
Button Width:     50% each (side-by-side)
```

### Tablet Layout (768x1024)
```
Modal Width:      90%
Modal Height:     Auto
Padding:          1.5rem (24px)
Field Spacing:    1rem (16px)
Button Width:     50% each (side-by-side)
```

### Mobile Layout (375x667)
```
Modal Width:      90%
Modal Height:     Auto
Padding:          1.5rem (24px)
Field Spacing:    1rem (16px)
Button Width:     100% (stacked)
```

---

## 🎨 Color Palette

### Primary Colors
```css
--primary-cyan:      #00bfff
--background-black:  #000000
--text-white:        #ffffff
--error-red:         #ff6b6b
--success-green:     #4caf50
```

### Transparency Levels
```css
--input-bg:          rgba(0, 191, 255, 0.05)
--input-border:      rgba(0, 191, 255, 0.2)
--input-focus:       rgba(0, 191, 255, 0.1)
--overlay-bg:        rgba(0, 0, 0, 0.85)
--error-bg:          rgba(255, 107, 107, 0.1)
```

---

## 🔤 Typography

### Font Family
```css
font-family: 'Inter', sans-serif;
```

### Font Sizes
```
Modal Title:       1.5rem (24px) - Bold
Field Labels:      0.875rem (14px) - Semi-bold
Input Text:        0.875rem (14px) - Regular
Button Text:       0.875rem (14px) - Bold, Uppercase
Error Text:        0.875rem (14px) - Regular
Hint Text:         0.75rem (12px) - Regular
```

### Font Weights
```
Title:    700 (Bold)
Labels:   600 (Semi-bold)
Buttons:  600 (Semi-bold)
Input:    400 (Regular)
```

---

## 🎯 Interactive States

### Button States
```
Default:   Cyan blue background, black text
Hover:     Lighter cyan, lift up 2px, enhanced shadow
Active:    Pressed down effect
Disabled:  60% opacity, not-allowed cursor
Loading:   "Changing..." text, disabled state
```

### Input States
```
Default:   Dark background, subtle border
Focus:     Cyan border, glow effect, lighter background
Error:     Red border, shake animation
Disabled:  50% opacity, not-allowed cursor
```

### Icon States
```
Default:   White/gray color
Hover:     Cyan blue color
Active:    Slightly larger
```

---

## 📱 Responsive Breakpoints

```css
/* Desktop */
@media (min-width: 1024px) {
  Modal width: 500px
  Buttons: Side-by-side
  Padding: 2rem
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  Modal width: 90%
  Buttons: Side-by-side
  Padding: 1.5rem
}

/* Mobile */
@media (max-width: 767px) {
  Modal width: 90%
  Buttons: Stacked
  Padding: 1.5rem
  Font sizes: Slightly smaller
}
```

---

## ✨ Key Design Principles

1. **Consistency**: Matches existing Yohann's dark theme
2. **Accessibility**: Proper labels, keyboard navigation, ARIA attributes
3. **Feedback**: Clear error messages, loading states, success notifications
4. **Responsiveness**: Works on all devices
5. **Security**: Password visibility toggle, current password verification
6. **UX**: Smooth animations, intuitive flow, helpful hints

---

**Design Status**: ✅ Complete and Production-Ready

All visual elements align with the Yohann's Sportswear brand design system.

