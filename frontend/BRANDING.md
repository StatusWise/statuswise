# StatusWise Design System & Style Guide

## Table of Contents
1. [Overview](#overview)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Interactive States](#interactive-states)
7. [Icons & Graphics](#icons--graphics)
8. [Animation & Transitions](#animation--transitions)
9. [Implementation Guidelines](#implementation-guidelines)

## Overview

StatusWise uses a **dark theme** design system optimized for professional monitoring and status management interfaces. The design emphasizes clarity, accessibility, and user efficiency through consistent patterns and visual hierarchy.

### Design Principles
- **Clarity**: Clear information hierarchy and readable text
- **Consistency**: Unified visual language across all interfaces
- **Accessibility**: High contrast ratios and keyboard navigation
- **Efficiency**: Minimal cognitive load for users

## Color Palette

### Primary Colors
```css
/* Background Colors */
--bg-primary: #0f172a;        /* Page background */
--bg-secondary: #1e293b;      /* Card/panel background */
--bg-tertiary: #334155;       /* Elevated elements */

/* Border Colors */
--border-primary: #475569;    /* Default borders */
--border-secondary: #334155;  /* Subtle borders */

/* Text Colors */
--text-primary: #f1f5f9;      /* Primary text */
--text-secondary: #e2e8f0;    /* Secondary text */
--text-muted: #94a3b8;        /* Muted text */
--text-disabled: #64748b;     /* Disabled text */
```

### Accent Colors
```css
/* Blue (Primary Action) */
--blue-50: #eff6ff;
--blue-100: #dbeafe;
--blue-500: #3b82f6;          /* Primary blue */
--blue-600: #2563eb;          /* Hover state */
--blue-700: #1d4ed8;

/* Status Colors */
--success: #10b981;           /* Success states */
--success-bg: #064e3b;
--success-light: #34d399;

--warning: #f59e0b;           /* Warning states */
--warning-bg: #451a03;
--warning-light: #fbbf24;

--error: #ef4444;             /* Error states */
--error-bg: #450a0a;
--error-light: #fca5a5;

--info: #06b6d4;              /* Info states */
--info-bg: #1e3a8a;
--info-light: #93c5fd;
```

### Usage Guidelines
- Use `bg-primary` for main page backgrounds
- Use `bg-secondary` for cards, modals, and content panels
- Use `bg-tertiary` for elevated or active states
- Maintain 4.5:1 contrast ratio minimum for text
- Use accent colors sparingly for emphasis

## Typography

### Font Family
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Type Scale
```css
/* Headings */
--text-xs: 0.75rem;     /* 12px - Small labels */
--text-sm: 0.875rem;    /* 14px - Body text, buttons */
--text-base: 1rem;      /* 16px - Default body */
--text-lg: 1.125rem;    /* 18px - Section titles */
--text-xl: 1.25rem;     /* 20px - Card titles */
--text-2xl: 1.875rem;   /* 30px - Page titles */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Typography Patterns
```css
/* Page Title */
.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 0.5rem;
}

/* Section Title */
.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #f1f5f9;
}

/* Body Text */
.body-text {
  font-size: 0.875rem;
  color: #cbd5e1;
  line-height: 1.5;
}

/* Muted Text */
.muted-text {
  font-size: 0.875rem;
  color: #94a3b8;
}
```

## Spacing & Layout

### Spacing Scale
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
```

### Layout Patterns
```css
/* Container */
.container {
  max-width: 80rem;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

/* Grid */
.grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

/* Flex Utilities */
.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

## Components

### Buttons

#### Primary Button
```css
.btn-primary {
  background-color: #3b82f6;
  color: #ffffff;
  border: 1px solid #3b82f6;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.btn-primary:hover {
  background-color: #2563eb;
}
```

#### Secondary Button
```css
.btn-secondary {
  background-color: #6b7280;
  color: #ffffff;
  border: 1px solid #6b7280;
  /* ... other properties same as primary */
}

.btn-secondary:hover {
  background-color: #4b5563;
}
```

#### Ghost Button
```css
.btn-ghost {
  background-color: transparent;
  color: #94a3b8;
  border: 1px solid #475569;
  /* ... other properties same as primary */
}

.btn-ghost:hover {
  background-color: #334155;
  color: #f1f5f9;
}
```

#### Button Sizes
```css
.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
}

.btn-md {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}
```

### Cards
```css
.card {
  background-color: #1e293b;
  border: 1px solid #475569;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.card-header {
  padding: 1.5rem 1.5rem 0 1.5rem;
  border-bottom: 1px solid #475569;
  margin-bottom: 1.5rem;
}

.card-body {
  padding: 1.5rem;
}

.card-footer {
  padding: 1.5rem;
  border-top: 1px solid #475569;
  margin-top: 1.5rem;
}
```

### Badges
```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.badge-primary {
  background-color: #3b82f6;
  color: #ffffff;
}

.badge-success {
  background-color: #10b981;
  color: #ffffff;
}

.badge-warning {
  background-color: #f59e0b;
  color: #ffffff;
}

.badge-danger {
  background-color: #ef4444;
  color: #ffffff;
}
```

### Form Elements

#### Input Fields
```css
.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #475569;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: #334155;
  color: #f1f5f9;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-input:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}

.form-input-error {
  border-color: #ef4444;
}
```

#### Labels
```css
.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #e2e8f0;
  margin-bottom: 0.25rem;
}

.form-label-required::after {
  content: ' *';
  color: #ef4444;
}
```

### Alerts
```css
.alert {
  padding: 1rem;
  border-radius: 0.375rem;
  border: 1px solid;
  border-left-width: 4px;
  animation: fadeIn 0.3s ease-in-out;
}

.alert-success {
  background-color: #064e3b;
  border-color: #059669;
  color: #34d399;
}

.alert-error {
  background-color: #450a0a;
  border-color: #dc2626;
  color: #fca5a5;
}

.alert-warning {
  background-color: #451a03;
  border-color: #d97706;
  color: #fbbf24;
}

.alert-info {
  background-color: #1e3a8a;
  border-color: #3b82f6;
  color: #93c5fd;
}
```

### Tables
```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #f1f5f9;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background-color: #334155;
  border-bottom: 1px solid #475569;
}

.table td {
  padding: 1rem 0.75rem;
  border-bottom: 1px solid #475569;
  font-size: 0.875rem;
  color: #f1f5f9;
}

.table tbody tr:hover {
  background-color: rgba(51, 65, 85, 0.5);
}
```

## Interactive States

### Hover Effects
```css
/* Button Hover */
.interactive:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Link Hover */
.link:hover {
  color: #60a5fa;
  text-decoration: underline;
}

/* Card Hover */
.card-interactive:hover {
  border-color: #60a5fa;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}
```

### Focus States
```css
.focusable:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.5);
}
```

### Active States
```css
.btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
```

### Disabled States
```css
.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}
```

## Icons & Graphics

### Icon Guidelines
- Use 16px (1rem) for inline icons
- Use 20px (1.25rem) for button icons
- Use 24px (1.5rem) for section icons
- Maintain consistent stroke width (1.5-2px)
- Use currentColor for icon fill/stroke

### Status Icons
```css
.icon-success {
  color: #10b981;
}

.icon-warning {
  color: #f59e0b;
}

.icon-error {
  color: #ef4444;
}

.icon-info {
  color: #06b6d4;
}
```

## Animation & Transitions

### Standard Transitions
```css
.transition-all {
  transition: all 0.2s ease-in-out;
}

.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
}

.transition-transform {
  transition: transform 0.2s ease-in-out;
}
```

### Keyframe Animations
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

.animate-spin {
  animation: spin 1s linear infinite;
}
```

## Implementation Guidelines

### CSS Organization
1. Use CSS custom properties for consistent theming
2. Group related styles together
3. Use BEM naming convention for classes
4. Prioritize component-based styles

### Responsive Design
```css
/* Mobile First Approach */
.responsive-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Accessibility
- Maintain minimum 4.5:1 contrast ratio
- Ensure focus indicators are visible
- Use semantic HTML elements
- Provide alt text for images
- Support keyboard navigation

### Performance
- Use `transform` and `opacity` for animations
- Prefer CSS over JavaScript for simple interactions
- Optimize for 60fps animations
- Use `will-change` sparingly

### Browser Support
- Modern browsers (Chrome 88+, Firefox 85+, Safari 14+)
- CSS Grid and Flexbox support required
- CSS Custom Properties support required

## Quick Reference

### Color Tokens
```javascript
const colors = {
  // Backgrounds
  bg: {
    primary: '#0f172a',
    secondary: '#1e293b',
    tertiary: '#334155'
  },
  // Text
  text: {
    primary: '#f1f5f9',
    secondary: '#e2e8f0',
    muted: '#94a3b8'
  },
  // Accent
  blue: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444'
}
```

### Spacing Scale
```javascript
const spacing = {
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  12: '3rem'      // 48px
}
```

---

*This style guide should be updated as the design system evolves. Always refer to the latest version when implementing new features.* 