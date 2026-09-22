# Visual Accessibility Audit Report

**Date:** 2026-09-22
**Project:** EXAMSARTHI
**Standard:** WCAG 2.1 AA

> [!IMPORTANT]
> This audit was performed via code inspection. Issues marked as "Requires browser testing" indicate that the computed styles must be verified in a live browser to confirm exact WCAG contrast ratios and rendering behaviors.

---

## A. Contrast Issues

**Issue ID:** VIS-A-01
**Page:** Global
**Component:** `Button`, `Input`, `DropdownMenu`
**File:** `src/components/ui/button.tsx`, `src/components/ui/input.tsx`
**Current implementation:** Disabled elements use `disabled:opacity-50`.
**Problem:** Applying 50% opacity to entire components often reduces text and boundary contrast below the required 3:1 (for UI components) or 4.5:1 (for text), making disabled states difficult to perceive for visually impaired users.
**Expected behavior:** Disabled states should maintain adequate contrast or use specific disabled color tokens rather than generic opacity reduction.
**WCAG 2.1 criterion:** 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast
**Severity:** P2
**Recommended fix:** Replace `opacity-50` with explicit disabled color tokens (e.g., `disabled:bg-muted disabled:text-muted-foreground`) that have been vetted for contrast.
**Verification method:** Requires browser testing

## B. Non-text Contrast Issues

**Issue ID:** VIS-B-01
**Page:** Global
**Component:** `Input`, `Card`, `Sidebar`
**File:** `src/app/globals.css`, `src/components/ui/input.tsx`
**Current implementation:** Dark mode inputs and borders use `oklch(1 0 0 / 15%)` (15% opacity white).
**Problem:** Extremely low opacity borders on dark backgrounds often fail the 3:1 non-text contrast ratio required to identify the boundaries of form inputs and cards.
**Expected behavior:** Input borders and component boundaries must have at least a 3:1 contrast ratio against the adjacent background.
**WCAG 2.1 criterion:** 1.4.11 Non-text Contrast
**Severity:** P1
**Recommended fix:** Increase the opacity of the `--border` and `--input` tokens in dark mode (e.g., from `15%` to at least `30%`), or use a solid color.
**Verification method:** Requires browser testing

**Issue ID:** VIS-B-02
**Page:** Global
**Component:** Global Focus Styles
**File:** `src/app/globals.css`, `src/components/ui/button.tsx`
**Current implementation:** Focus rings on some elements use `ring-ring/50` (50% opacity of the primary color).
**Problem:** A semi-transparent focus ring may not have enough contrast against the background to be clearly visible.
**Expected behavior:** Focus indicators must have a 3:1 contrast ratio against the background color.
**WCAG 2.1 criterion:** 1.4.11 Non-text Contrast, 2.4.7 Focus Visible
**Severity:** P2
**Recommended fix:** Use solid colors for focus rings (e.g., `ring-ring`) rather than semi-transparent colors.
**Verification method:** Requires browser testing

## C. Color Dependency Issues

**Issue ID:** VIS-C-01
**Page:** Global
**Component:** `Alert`, `Badge`, `Button`
**File:** `src/components/ui/alert.tsx`, `src/components/ui/badge.tsx`
**Current implementation:** Destructive variants use `text-destructive` and `bg-destructive/10`.
**Problem:** If these variants rely solely on the red color to convey an error or destructive action without accompanying icons or text labels (e.g., "Error: "), it violates the rule against using color as the only visual means of conveying information.
**Expected behavior:** Information conveyed by color must also be conveyed through text or iconography.
**WCAG 2.1 criterion:** 1.4.1 Use of Color
**Severity:** P1
**Recommended fix:** Ensure all destructive actions or alerts include a warning/error icon or explicit text.
**Verification method:** Confirmed from code (usage patterns need browser verification)

## D. Typography Issues

**Issue ID:** VIS-D-01
**Page:** Global
**Component:** `Button`
**File:** `src/components/ui/button.tsx`
**Current implementation:** The `xs` button variant uses `text-xs` (typically 12px or 0.75rem).
**Problem:** 12px text is very difficult to read for many users with low vision and is generally considered below the recommended minimum legible size for interactive elements.
**Expected behavior:** Text should generally be at least 14px (text-sm) or 16px (text-base) for readability.
**WCAG 2.1 criterion:** 1.4.8 Visual Presentation (AAA, but highly recommended for AA)
**Severity:** P3
**Recommended fix:** Increase the `text-xs` size slightly or ensure `xs` buttons are used sparingly and not for critical actions.
**Verification method:** Confirmed from code

## E. Text Resizing Issues

**Issue ID:** VIS-E-01
**Page:** Global
**Component:** `Button`, `Input`
**File:** `src/components/ui/button.tsx`, `src/components/ui/input.tsx`
**Current implementation:** Components use fixed height utility classes like `h-8`, `h-6`, `h-9`.
**Problem:** When a user increases their browser font size to 200%, text within fixed-height containers will clip or overflow the container boundaries, making it unreadable.
**Expected behavior:** Containers should use minimum heights (`min-h-8`) rather than fixed heights to allow them to grow vertically if text wraps or scales.
**WCAG 2.1 criterion:** 1.4.4 Resize text
**Severity:** P1
**Recommended fix:** Change `h-8` to `min-h-8` and use padding to define the structural height.
**Verification method:** Requires browser testing

## F. Zoom Issues

**Issue ID:** VIS-F-01
**Page:** Global
**Component:** `Card`
**File:** `src/components/ui/card.tsx`
**Current implementation:** The Card component uses `overflow-hidden`.
**Problem:** If content scales up at 400% zoom and reflows, `overflow-hidden` can cause text or interactive elements to be entirely clipped and inaccessible.
**Expected behavior:** Content must reflow without loss of information or functionality at 400% zoom.
**WCAG 2.1 criterion:** 1.4.10 Reflow
**Severity:** P2
**Recommended fix:** Review the use of `overflow-hidden` on containers and ensure content can safely wrap.
**Verification method:** Requires browser testing

## G. Focus Visibility Issues

**Issue ID:** VIS-G-01
**Page:** Global
**Component:** Global Theme
**File:** `src/app/globals.css`
**Current implementation:** Global styles define `:focus-visible { @apply outline-none ring-2 ring-primary ring-offset-2 ring-offset-background; }`.
**Problem:** While focus visibility is well implemented globally, elements with `overflow-hidden` (like Cards or specific Tabs) might clip the `ring-offset-2`, hiding the focus ring.
**Expected behavior:** Focus indicators must not be clipped by container overflow rules.
**WCAG 2.1 criterion:** 2.4.7 Focus Visible
**Severity:** P2
**Recommended fix:** Test interactive elements inside `overflow-hidden` containers and add padding or change overflow rules if focus rings are clipped.
**Verification method:** Requires browser testing

## H. Responsive Accessibility Issues

**Issue ID:** VIS-H-01
**Page:** Global
**Component:** `Button`, `Input`
**File:** `src/components/ui/button.tsx`
**Current implementation:** Button sizes `xs` and `sm` use `h-6` (24px) and `h-7` (28px) respectively.
**Problem:** These heights are extremely small for touch targets on mobile devices. While WCAG 2.1 AA does not strictly fail this, WCAG 2.2 introduces a 24x24px absolute minimum, and Apple/Google accessibility guidelines strongly recommend 44x44px or 48x48px for touch targets.
**Expected behavior:** Interactive touch targets should be sufficiently large to activate without precision errors.
**WCAG 2.1 criterion:** 2.5.5 Target Size (AAA), WCAG 2.2 2.5.8 Target Size Minimum (AA)
**Severity:** P2
**Recommended fix:** Ensure that on mobile viewports, button and input heights scale up to at least 44px (e.g., using `md:h-8 h-11`).
**Verification method:** Confirmed from code

---

## I. Top 10 Visual Accessibility Issues

1. **[VIS-E-01] Fixed heights (`h-8`, `h-6`) on inputs and buttons preventing safe text resizing (P1)**
2. **[VIS-B-01] Insufficient non-text contrast for dark mode borders (`15%` opacity) (P1)**
3. **[VIS-A-01] Disabled states using `opacity-50` failing contrast minimums (P2)**
4. **[VIS-C-01] Potential reliance on color-only (`text-destructive`) for error states (P1)**
5. **[VIS-H-01] Inadequate touch target sizes (`h-6`, `h-7`) for mobile users (P2)**
6. **[VIS-F-01] `overflow-hidden` on structural cards risking clipped content at high zoom (P2)**
7. **[VIS-B-02] Focus rings using `ring/50` potentially failing 3:1 contrast against backgrounds (P2)**
8. **[VIS-D-01] Very small typography (`text-xs`) on smaller button variants (P3)**
9. **[VIS-G-01] Global focus rings potentially being clipped by `overflow-hidden` parents (P2)**
10. **(From Day 1 - SRA-01) Missing visual programmatic association for form labels causing screen reader failures, which often overlaps with visual proximity issues.**

## J. Issues Requiring Actual Browser Testing

- Validating the exact computed contrast ratio of `.dark` mode input borders (`15%` opacity white).
- Testing text resizing to 200% to confirm if `h-8` inputs and buttons clip text.
- Testing 400% reflow to verify if `overflow-hidden` cards hide critical text.
- Confirming the contrast ratio of disabled buttons (`opacity-50`) against their background.
- Confirming that focus rings (`ring-2 ring-offset-2`) are not visually clipped by parent containers.

---
*Cross-Referenced Issues:*
- Refer to `accessibility_audit_report.md` for broader UI component issues.
- Refer to `screen_reader_semantic_audit.md` for missing ARIA relationships (e.g., `<Label>` without `htmlFor`).
