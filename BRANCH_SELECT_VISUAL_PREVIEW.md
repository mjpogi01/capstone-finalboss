# Branch Select Modal - Visual Preview

## 🎨 Visual Design Preview

### Modal Appearance

```
┌────────────────────────────────────────────────────────────────┐
│                                                            [X] │
│                                                                │
│                    Select Your Branch                          │
│                                                                │
│   To better assist you, please choose your nearest branch.    │
│   We'll take you directly to our Facebook Page for your       │
│   inquiries. 📨                                                │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  SAN PASCUAL (MAIN BRANCH)                               │ │
│  │  Villa Maria Subdivision Sambat, San Pascual,            │ │
│  │  4204 Batangas                                           │ │
│  │                                                          │ │
│  │  [📘 Visit Facebook Page]                                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  CALAPAN BRANCH                                          │ │
│  │  Unit 2, Ground Floor Basa Bldg., Infantado Street,      │ │
│  │  Brgy. San Vicente West Calapan City, 5200 Oriental      │ │
│  │  Mindoro                                                 │ │
│  │                                                          │ │
│  │  [📘 Visit Facebook Page]                                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  MUZON BRANCH                                            │ │
│  │  Barangay Muzon, San Luis, 4226 Batangas                 │ │
│  │                                                          │ │
│  │  [📘 Visit Facebook Page]                                │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│     Can't find your branch? Send us a message on our main     │
│     page!                                                      │
│                                                                │
│                  [Message Main Page]                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## 🎯 Design Elements

### Header Section
```
╔═══════════════════════════════════════════════════╗
║                                               [X] ║
║                                                   ║
║           Select Your Branch                      ║
║         (Gradient Blue-Purple Text)               ║
║                                                   ║
║   To better assist you, please choose your        ║
║   nearest branch. We'll take you directly to      ║
║   our Facebook Page for your inquiries. 📨        ║
╚═══════════════════════════════════════════════════╝
```

### Branch Card (Normal State)
```
┌─────────────────────────────────────────────────┐
│ 🏪 SAN PASCUAL (MAIN BRANCH)                    │
│                                                 │
│ 📍 Villa Maria Subdivision Sambat,              │
│    San Pascual, 4204 Batangas                   │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │  📘  Visit Facebook Page                    │ │
│ └─────────────────────────────────────────────┘ │
│     (Blue Facebook Button)                      │
└─────────────────────────────────────────────────┘
```

### Branch Card (Hover State)
```
┌─────────────────────────────────────────────────┐
│ 🏪 SAN PASCUAL (MAIN BRANCH)                    │ ↑
│                                                 │ Lifted
│ 📍 Villa Maria Subdivision Sambat,              │ with
│    San Pascual, 4204 Batangas                   │ glow
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │  📘  Visit Facebook Page                    │ │
│ └─────────────────────────────────────────────┘ │
│     (Darker Blue with Shadow)                   │
└─────────────────────────────────────────────────┘
```

### Footer Section
```
╔═══════════════════════════════════════════════════╗
║                                                   ║
║  Can't find your branch? Send us a message on    ║
║  our main page!                                  ║
║                                                   ║
║       ┌─────────────────────────────┐            ║
║       │   Message Main Page         │            ║
║       └─────────────────────────────┘            ║
║        (Blue Outline Button)                     ║
╚═══════════════════════════════════════════════════╝
```

## 🎨 Color Palette

### Background Colors
- **Modal Background:** Dark gradient (#1a1a1a → #0a0a0a)
- **Card Background:** Semi-transparent white (3% opacity)
- **Overlay:** Black with 85% opacity + blur

### Text Colors
- **Title:** Blue to Purple gradient (#3b82f6 → #8b5cf6)
- **Branch Names:** Pure White (#ffffff)
- **Addresses:** Light Gray (#9ca3af)
- **Footer Text:** Medium Gray (#9ca3af)

### Button Colors
- **Facebook Button:**
  - Background: Facebook Blue gradient (#1877f2 → #0c5fd6)
  - Text: White (#ffffff)
  - Hover: Darker blue with glow

- **Main Page Button:**
  - Background: Transparent
  - Border: Blue (#3b82f6)
  - Text: Blue (#3b82f6)
  - Hover: Filled blue background

### Border Colors
- **Card Border:** White with 10% opacity
- **Card Hover:** Blue with 30% opacity (#3b82f6)

## ✨ Animations & Effects

### 1. Modal Entry Animation
```
Before: Opacity 0, Position: 30px down
After:  Opacity 1, Position: 0
Duration: 0.3s
Easing: ease
```

### 2. Card Stagger Animation
```
Card 1: Delay 0s    (Appears first)
Card 2: Delay 0.1s  (Appears 0.1s after Card 1)
Card 3: Delay 0.2s  (Appears 0.1s after Card 2)

Animation: Slide in from left with fade
Duration: 0.5s
```

### 3. Hover Effects

**Branch Cards:**
- Lift up 2px
- Add blue glow shadow
- Lighten background
- Blue border highlight
- Duration: 0.3s

**Facebook Buttons:**
- Lift up 2px
- Add stronger blue glow
- Darken gradient
- Duration: 0.3s

**Close Button:**
- Rotate 90 degrees
- Change to red color
- Red glow background
- Duration: 0.3s

## 📱 Responsive Behavior

### Desktop (> 768px)
```
┌────────────── 900px max-width ──────────────┐
│                                             │
│  [Large cards with full content]           │
│  [32px title, 18px branch names]           │
│  [40px padding all around]                 │
│                                             │
└─────────────────────────────────────────────┘
```

### Tablet (768px and below)
```
┌─────────── Smaller padding ───────────┐
│                                       │
│  [24px title, 16px branch names]     │
│  [24px padding]                      │
│  [Slightly smaller fonts]            │
│                                       │
└───────────────────────────────────────┘
```

### Mobile (480px and below)
```
┌──── Full width ────┐
│                    │
│  [20px title]      │
│  [Compact cards]   │
│  [20px padding]    │
│  [Smaller buttons] │
│                    │
└────────────────────┘
```

## 🎬 User Interaction Flow

### Step-by-Step Visual Flow

1. **Initial State - Hero Section**
```
┌─────────────────────────────────────┐
│  Gear Up for Greatness!             │
│                                     │
│  [SHOP NOW]  [INQUIRE NOW]  ← Click │
└─────────────────────────────────────┘
```

2. **Modal Appears**
```
Screen darkens with blur effect
     ↓
Modal slides up from bottom
     ↓
Cards appear one by one (staggered)
```

3. **User Hovers Over Branch**
```
Card lifts up with blue glow
Facebook button gets darker
Shadow appears underneath
```

4. **User Clicks Facebook Button**
```
Button slightly compresses (active state)
     ↓
New tab opens with Facebook page
     ↓
Modal remains open
```

5. **User Can Close Modal By:**
```
• Clicking [X] button (top right)
• Clicking outside modal (overlay)
• Pressing ESC key (optional feature)
```

## 🎯 Key Visual Features

### ✓ Modern Dark Theme
- Sleek, professional look
- Easy on the eyes
- Matches modern web design trends

### ✓ Glassmorphism Effect
- Semi-transparent cards
- Subtle backdrop blur
- Layered depth

### ✓ Smooth Animations
- No jarring movements
- Professional transitions
- Engaging but not distracting

### ✓ Clear Hierarchy
- Title stands out (gradient)
- Branch names bold and white
- Addresses subtle gray
- Buttons prominent blue

### ✓ Facebook Branding
- Recognizable Facebook blue
- Facebook icon included
- Clear call-to-action

### ✓ Accessible Design
- High contrast text
- Clear button states
- Large touch targets (mobile)
- Readable fonts

## 📐 Spacing & Layout

### Modal Spacing
```
Top padding:    40px
Bottom padding: 40px
Left padding:   40px
Right padding:  40px

Between sections: 30px
Between cards:    20px
```

### Card Spacing
```
Card padding:     24px
Title margin:     8px bottom
Button spacing:   16px top

Icon spacing:     10px (in buttons)
```

### Button Dimensions
```
Facebook Button:
  Padding: 12px vertical, 24px horizontal
  Border radius: 10px
  Font size: 15px

Main Page Button:
  Padding: 12px vertical, 32px horizontal
  Border radius: 10px
  Border width: 2px
```

## 🎨 Typography Hierarchy

```
Title (Select Your Branch):
  Font: Inter, 32px, Weight 800
  Color: Blue-Purple gradient
  ━━━━━━━━━━━━━━━━━━━━━━━━━

Description:
  Font: Inter, 16px, Weight 400
  Color: Gray (#9ca3af)
  ──────────────────────────

Branch Names:
  Font: Inter, 18px, Weight 700
  Color: White (#ffffff)
  ━━━━━━━━━━━━━━━━━━━━━━━━

Addresses:
  Font: Inter, 14px, Weight 400
  Color: Light Gray (#9ca3af)
  ──────────────────────────

Buttons:
  Font: Inter, 15px, Weight 600
  Color: White / Blue
  ━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🚀 Live Preview

To see the modal in action:

1. Run your application
2. Navigate to the home page (Hero section)
3. Click the **"INQUIRE NOW"** button
4. Experience the smooth animations and interactions!

**Status:** ✅ Ready to Use
**Design Quality:** Professional & Modern
**User Experience:** Intuitive & Smooth

