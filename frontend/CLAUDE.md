# Peninsula Health - Frontend Style Guide

## CSS Architecture Overview

This project uses a consistent CSS architecture built around CSS variables, shared component classes, and modular styling patterns.

## Style System Structure

### 1. CSS Variables (`/frontend/src/styles/variables.css`)
Centralized design tokens for:
- **Colors**: Brand colors, status colors, backgrounds, borders
- **Spacing**: Consistent padding, margins, and gap values
- **Typography**: Font sizes, weights, and line heights
- **Shadows**: Standardized box-shadow scale
- **Border Radius**: Consistent corner radius values
- **Transitions**: Unified animation timings

### 2. Shared Components (`/frontend/src/styles/components.css`)
Reusable CSS classes for common UI patterns:
- **Navigation**: `.standardNavBar`, `.standardNavContent`
- **Buttons**: `.btnPrimary`, `.btnSecondary`, `.btnSm`, `.btnLg`
- **Forms**: `.formGroup`, `.formInput`, `.formLabel`
- **Modals**: `.modalOverlay`, `.modalContent`
- **Cards**: `.card`, `.cardHover`
- **Layout**: `.pageContainer`, `.pageMain`
- **Utilities**: `.loadingSpinner`, status badges

### 3. Global Styles (`/frontend/src/styles/global.css`)
Base styling for HTML elements and global patterns.

## Design Tokens

### Color Palette
- **Primary**: Teal (`#17a2b8`) - Main brand color
- **Secondary**: Navy (`#343a40`) - Supporting brand color
- **Success**: Green (`#28a745`) - Positive actions
- **Warning**: Orange (`#ffc107`) - Caution states
- **Error**: Red (`#dc3545`) - Error states
- **Neutral Grays**: Light to dark gray scale for backgrounds and text

### Typography Scale
- **Headings**: `1rem` to `2rem` with consistent line heights
- **Body Text**: `0.875rem` base with good readability
- **Small Text**: `0.75rem` for secondary information

### Spacing Scale
- **Base Unit**: `0.5rem` (8px)
- **Scale**: `xs`, `sm`, `md`, `lg`, `xl`, `2xl` multipliers
- **Consistent Gaps**: Used across all components

### Border Radius
- **Small**: `4px` for inputs and small elements
- **Medium**: `8px` for cards and buttons
- **Large**: `12px` for modals and major components

## Component Patterns

### Navigation Bars
- White background with subtle shadow
- Consistent padding and spacing
- Unified logo and title positioning

### Buttons
- Primary: Teal background with white text
- Secondary: Gray outline with dark text
- Consistent hover states with slight translation and shadow
- Size variants: small, medium, large

### Forms
- 2px borders with focus states in primary color
- Consistent padding and spacing
- Error states with red coloring
- Label positioning above inputs

### Cards
- Clean white background with subtle shadows
- Optional hover effects for interactive cards
- Consistent internal padding

### Modals
- Dark overlay background
- Centered positioning with max-width constraints
- Consistent header, body, and footer patterns

## Usage Guidelines

### CSS Variables
Always use CSS variables instead of hardcoded values:
```css
/* Good */
background-color: var(--color-primary);
padding: var(--spacing-md);

/* Avoid */
background-color: #17a2b8;
padding: 16px;
```

### Shared Classes
Prefer shared component classes over custom styling:
```css
/* Good */
<button className="btnPrimary btnLg">Submit</button>

/* Avoid creating custom button styles */
```

### Module-Specific Styling
Use CSS modules for component-specific styles that don't fit shared patterns, but still leverage CSS variables for consistency.

## Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

### Mobile-First Approach
- Base styles target mobile devices
- Use media queries to enhance for larger screens
- Consistent touch targets (minimum 44px)

## Accessibility

### Color Contrast
All color combinations meet WCAG 2.1 AA standards for contrast ratios.

### Focus States
All interactive elements have visible focus indicators using the primary color.

### Touch Targets
Interactive elements maintain minimum 44px touch targets on mobile devices.

## Development Commands

### Linting
```bash
# Frontend linting (if available)
npm run lint

# Type checking
npm run typecheck
```

### Build Process
```bash
# Development server
npm start

# Production build
npm run build
```

## Maintenance

### Adding New Components
1. Use existing CSS variables from `variables.css`
2. Leverage shared classes from `components.css`
3. Create module-specific styles only when necessary
4. Follow established naming conventions
5. Ensure responsive design patterns

### Updating Colors or Spacing
1. Modify values in `variables.css`
2. Changes will automatically apply across all components
3. Test responsive design after changes

This style guide ensures visual consistency, maintainability, and scalability across the Peninsula Health frontend application.