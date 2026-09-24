# Day 3 Step 1 Changes

## 1. SEM-001 — Missing `<main>` landmark
- **File changed**: `src/app/(marketing)/page.tsx`
- **Exact type of change**: Replaced the top-level `<div>` element with `<main id="main-content">` and updated its closing tag.
- **Why it improves accessibility**: Provides a primary landmark for the main content, helping screen reader users easily locate and navigate to the most important part of the page.
- **WCAG criterion**: 1.3.1 Info and Relationships, 2.4.1 Bypass Blocks
- **Manual/browser testing still required**: Verify that screen readers correctly identify the `<main>` landmark and that no styling or layout regressions occurred.

## 2. KEY-001 — Missing Skip to Main Content
- **File changed**: `src/app/layout.tsx`
- **Exact type of change**: Added a visually hidden "Skip to main content" link as the first focusable element inside the application, which links to `#main-content`. Replaced the previous `<main>` tag with a `<div>` to avoid nested `<main>` tags since `page.tsx` now has the primary `<main>` landmark.
- **Why it improves accessibility**: Allows keyboard-only users and screen reader users to bypass repetitive navigation blocks and go straight to the primary content.
- **WCAG criterion**: 2.4.1 Bypass Blocks
- **Manual/browser testing still required**: Verify by pressing the `Tab` key upon initial page load that the "Skip to main content" link appears visibly, receives focus, and successfully jumps to the main content area when activated.

## 3. SR-002 — Missing `aria-current="page"`
- **File changed**: `src/components/layout/Header.tsx`
- **Exact type of change**: Added `aria-current={pathname === item.href ? "page" : undefined}` to navigation links.
- **Why it improves accessibility**: Programmatically informs assistive technologies which link represents the currently active page, matching the visual indication.
- **WCAG criterion**: 4.1.2 Name, Role, Value
- **Manual/browser testing still required**: Verify with a screen reader that the active link is announced as the "current page".

## 4. KEY-002 — Missing visible focus styles on links
- **Files changed**: `src/components/layout/Header.tsx`, `src/app/(marketing)/page.tsx`
- **Exact type of change**: Added standard Tailwind focus classes (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`) to links and buttons acting as links.
- **Why it improves accessibility**: Provides a clear and distinguishable visual indicator when interactive elements receive keyboard focus.
- **WCAG criterion**: 2.4.7 Focus Visible
- **Manual/browser testing still required**: Tab through the links to ensure focus rings are clearly visible and match the application's design system.

## 5. SEM-002 — Unnamed navigation landmarks
- **Files changed**: `src/components/layout/Header.tsx`, `src/components/layout/MobileNav.tsx`
- **Exact type of change**: Added `aria-label="Main navigation"` to the primary `<nav>` in `Header.tsx` and `aria-label="Mobile navigation"` to the `<nav>` in `MobileNav.tsx`.
- **Why it improves accessibility**: Differentiates multiple navigation landmarks on the same page, allowing screen reader users to understand the purpose of each one and navigate between them intentionally.
- **WCAG criterion**: 1.3.1 Info and Relationships, 2.4.1 Bypass Blocks
- **Manual/browser testing still required**: Inspect the accessibility tree to confirm the `<nav>` elements have the correct accessible names.

## 6. FRM-01 — RadioGroup lacks accessible labeling
- **File changed**: `src/components/accessibility/AccessibilityPanel.tsx`
- **Exact type of change**: Assigned unique `id`s (`label-text-size`, `label-contrast`, `label-theme`, `label-voice-speed`) to the visible `<Label>` components and added `aria-labelledby` linking each `<RadioGroup>` to its respective label.
- **Why it improves accessibility**: Programmatically associates the visible text labels with the radio groups, so screen reader users hear the group name when focusing on any option.
- **WCAG criterion**: 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions, 4.1.2 Name, Role, Value
- **Manual/browser testing still required**: Use a screen reader to verify that the group label is announced when tabbing into each radio group.
