# 🎨 Dashboard CSS Patterns Reference

## Quick CSS Patterns for YOHANNS Premium Dashboard

This document contains reusable CSS patterns used throughout the redesigned dashboard.

---

## 🎯 Premium Card Pattern

```css
/* Base Premium Card */
.premium-card {
  background: linear-gradient(135deg, #ffffff 0%, #fafbff 100%);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  padding: 2rem;
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

/* Glassmorphism Overlay */
.premium-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.2) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.premium-card:hover {
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.12),
    0 6px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.premium-card:hover::before {
  opacity: 1;
}
```

---

## 🏷️ Premium Badge Pattern

```css
/* Status Badge Base */
.premium-badge {
  padding: 0.375rem 0.875rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: 2px solid transparent;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;
}

/* Success Badge */
.badge-success {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  color: #10b981;
  border-color: #a7f3d0;
}

/* Warning Badge */
.badge-warning {
  background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
  color: #f97316;
  border-color: #fdba74;
}

/* Danger Badge */
.badge-danger {
  background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
  color: #dc2626;
  border-color: #fca5a5;
}

/* Info Badge */
.badge-info {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  color: #3b82f6;
  border-color: #bfdbfe;
}

/* Hover Effect */
.premium-badge:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
```

---

## 🔘 Premium Button Pattern

```css
/* Primary Button */
.btn-premium-primary {
  padding: 0.625rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 12px rgba(30, 58, 138, 0.25),
    0 2px 6px rgba(30, 58, 138, 0.15);
}

.btn-premium-primary:hover {
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  box-shadow: 
    0 8px 20px rgba(30, 58, 138, 0.35),
    0 4px 10px rgba(30, 58, 138, 0.2);
  transform: translateY(-2px);
}

.btn-premium-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(30, 58, 138, 0.2);
}

/* Secondary Button */
.btn-premium-secondary {
  padding: 0.625rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  color: #374151;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.btn-premium-secondary:hover {
  border-color: #3b82f6;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

/* Danger Button */
.btn-premium-danger {
  padding: 0.625rem 1rem;
  border: 2px solid transparent;
  border-radius: 10px;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 12px rgba(220, 38, 38, 0.25),
    0 2px 6px rgba(220, 38, 38, 0.15);
}

.btn-premium-danger:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
  box-shadow: 
    0 8px 20px rgba(220, 38, 38, 0.35),
    0 4px 10px rgba(220, 38, 38, 0.2);
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.1);
}
```

---

## 🎯 Gradient Text Pattern

```css
/* Gradient Text Heading */
.gradient-heading {
  font-size: 1.375rem;
  font-weight: 700;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.02em;
}

/* Large Gradient Text */
.gradient-text-large {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  letter-spacing: -0.03em;
}
```

---

## 🎨 Icon Container Pattern

```css
/* Premium Icon Container */
.icon-container {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* Success Icon */
.icon-success {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  color: #10b981;
}

/* Info Icon */
.icon-info {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  color: #3b82f6;
}

/* Warning Icon */
.icon-warning {
  background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
  color: #f97316;
}

/* Hover Animation */
.icon-container:hover {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

---

## 📊 Table Row Pattern

```css
/* Premium Table Row */
.table-row-premium {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr 1fr;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;
}

.table-row-premium:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 8px;
  margin: 0 -0.5rem;
  padding: 0.75rem 0.5rem;
  transform: translateY(-1px);
}
```

---

## 🎭 Background Pattern

```css
/* Dashboard Background */
.dashboard-background {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  position: relative;
}

.dashboard-background::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.03) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}
```

---

## ✨ Animation Patterns

```css
/* Fade In Up Animation */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up {
  animation: fadeInUp 0.6s ease-out;
}

/* Smooth Transition */
.smooth-transition {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Transform on Hover */
.hover-lift {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-lift:hover {
  transform: translateY(-2px);
}

/* Scale on Hover */
.hover-scale {
  transition: transform 0.3s ease;
}

.hover-scale:hover {
  transform: scale(1.05);
}
```

---

## 🎨 Gradient Border Pattern

```css
/* Top Gradient Border */
.gradient-border-top {
  border-top: 3px solid transparent;
  border-image: linear-gradient(90deg, #10b981, #34d399) 1;
}

/* Bottom Gradient Border */
.gradient-border-bottom {
  border-bottom: 2px solid transparent;
  border-image: linear-gradient(90deg, #3b82f6, #60a5fa) 1;
}

/* All Sides Gradient Border (using pseudo-element) */
.gradient-border-all {
  position: relative;
  background: #ffffff;
  padding: 1rem;
}

.gradient-border-all::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 2px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}
```

---

## 📐 Spacing System

```css
/* Consistent Spacing Variables */
:root {
  --space-xs: 0.25rem;   /* 4px */
  --space-sm: 0.5rem;    /* 8px */
  --space-md: 0.75rem;   /* 12px */
  --space-lg: 1rem;      /* 16px */
  --space-xl: 1.5rem;    /* 24px */
  --space-2xl: 2rem;     /* 32px */
  --space-3xl: 2.5rem;   /* 40px */
}

/* Card Padding */
.card-sm { padding: var(--space-lg); }
.card-md { padding: var(--space-xl); }
.card-lg { padding: var(--space-2xl); }

/* Gap Utilities */
.gap-sm { gap: var(--space-sm); }
.gap-md { gap: var(--space-lg); }
.gap-lg { gap: var(--space-xl); }
.gap-xl { gap: var(--space-2xl); }
```

---

## 🎯 Shadow System

```css
/* Shadow Utilities */
.shadow-sm {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.shadow-md {
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.04);
}

.shadow-lg {
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.12),
    0 6px 16px rgba(0, 0, 0, 0.08);
}

.shadow-xl {
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 10px 24px rgba(0, 0, 0, 0.1);
}

/* Colored Shadows */
.shadow-blue {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.shadow-green {
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}

.shadow-red {
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
}
```

---

## 🎨 Usage Examples

### Example 1: Premium Metric Card
```html
<div class="premium-card gradient-border-top">
  <div class="icon-container icon-success">
    <i class="fa fa-dollar-sign"></i>
  </div>
  <div class="gradient-text-large">$24,500</div>
  <div>Total Revenue</div>
</div>
```

### Example 2: Status Badge
```html
<span class="premium-badge badge-success">
  In Stock
</span>
```

### Example 3: Premium Button
```html
<button class="btn-premium-primary smooth-transition hover-lift">
  Save Changes
</button>
```

### Example 4: Gradient Heading
```html
<h2 class="gradient-heading">
  Dashboard Overview
</h2>
```

---

## 📋 Quick Reference Chart

| Pattern | Use For | Key Features |
|---------|---------|--------------|
| Premium Card | Containers | Gradient bg, glassmorphism |
| Premium Badge | Status tags | Gradient, borders, hover |
| Premium Button | Actions | Gradient, transform, shadow |
| Gradient Text | Headings | Clipped gradient text |
| Icon Container | Icons | Gradient bg, rotate hover |
| Table Row | Data rows | Transform hover |
| Background | Layouts | Gradient + patterns |

---

## ✅ Best Practices

1. **Always use the easing function:** `cubic-bezier(0.4, 0, 0.2, 1)`
2. **Consistent border radius:** 8px (small), 12px (medium), 16px (large)
3. **Multi-layer shadows:** Use 2-3 shadow layers for depth
4. **Gradient consistency:** Start with lighter, end with darker
5. **Position relative + z-index:** For layering effects
6. **Overflow hidden:** On cards with ::before overlays
7. **Transition all properties:** For smooth multi-property changes

---

**Quick Copy-Paste Ready!**  
All patterns are production-ready and tested.

**Version:** 2.0.0  
**Last Updated:** October 30, 2025

