# Keyboard Accessibility Test Report

## A. Test Environment
- **Environment:** Simulated manual keyboard test via rigorous code inspection.
- **Note:** The application was not run locally due to the strict "Do NOT install packages" restriction, which prevents running `npm install` and `npm run dev`. Testing relies on the defined React component properties and the known keyboard behaviors of the underlying `@base-ui/react` primitives.

## B. Pages/Components Tested
1. Landing/Marketing page
2. Header/navigation
3. Accessibility panel
4. Dashboard
5. Exam page (Stub)
6. Practice page (Stub)
7. Results page (Stub)
8. Settings (Stub)
9. Dialogs/modals (Base UI)
10. Mobile navigation (Sheet/Base UI)

## C. Successful Keyboard Flows (Simulated)
- **Buttons:** The `Button` component explicitly defines `focus-visible:border-ring focus-visible:ring-3` ensuring clear, highly visible focus indicators when tabbing.
- **Base UI Dialogs:** The `Dialog` and `Sheet` components from `@base-ui/react` are built to handle ARIA dialog patterns natively, meaning they theoretically support Escape to close and Tab trapping automatically.
- **Form Controls:** Radio groups and switches in the Accessibility Panel are built on primitives that typically support Arrow Key navigation.

## D. Failed Keyboard Flows (Simulated)
- **Skip to Content:** Pressing Tab on page load does not reveal a "Skip to Main Content" link. The user is forced to tab through the Header on every single page load to reach the main content.
- **Link Focus Indicators:** Navigation links in the Header and Landing page rely exclusively on the browser's default focus ring, which is often insufficient or invisible against custom backgrounds.
- **Exam/Practice Flows:** These pages are currently empty stubs. A user cannot complete an exam or practice session via keyboard because the functionality does not yet exist.

---

## E. Accessibility Issues

### Issue ID: KEY-001
**Page:** All Pages
**Component:** Global Layout / Header
**Exact user action:** Pressing Tab immediately after the page loads.
**Observed behavior:** Focus goes to the Mobile Nav trigger or "EXAMSARTHI" logo first. There is no mechanism to bypass the navigation.
**Expected behavior:** The very first focusable element should be a visually hidden "Skip to main content" link that becomes visible on focus and allows the user to jump straight to the `<main>` tag.
**Severity:** P1 (Major accessibility barrier)
**WCAG criterion:** 2.4.1 Bypass Blocks (A)
**Recommended fix:** Implement a Skip Link component at the top of `src/app/layout.tsx`.
**File/component responsible:** `src/app/layout.tsx`
**Status:** Confirmed issue.

### Issue ID: KEY-002
**Page:** All Pages
**Component:** Header / MobileNav / Landing Page
**Exact user action:** Pressing Tab to navigate through inline `<Link>` elements.
**Observed behavior:** Links (e.g., in `Header.tsx`) do not have custom `focus-visible` classes defined. They rely on the browser's default focus ring.
**Expected behavior:** Interactive links must have a high-contrast focus indicator (like an outline or ring) that meets 3:1 contrast against the background so sighted keyboard users know where they are.
**Severity:** P2 (Moderate accessibility issue)
**WCAG criterion:** 2.4.7 Focus Visible (AA), 1.4.11 Non-text Contrast (AA)
**Recommended fix:** Add generic `focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary` classes to all navigation `<Link>` elements.
**File/component responsible:** `src/components/layout/Header.tsx`, `src/app/(marketing)/page.tsx`
**Status:** Confirmed issue.

### Issue ID: KEY-003
**Page:** All Pages
**Component:** Dialog / Sheet (Accessibility Panel, Mobile Nav)
**Exact user action:** Pressing Tab while a modal is open; pressing Escape to close; checking focus after closing.
**Observed behavior:** `@base-ui` theoretically handles focus trapping and returning focus to the trigger. However, because custom `onValueChange` or route changes (via Link clicks in MobileNav) are involved, focus might get lost upon closing or unmounting.
**Expected behavior:** Focus must not leave the open dialog. When closed, focus must immediately return to the button that opened the dialog.
**Severity:** P2
**WCAG criterion:** 2.4.3 Focus Order (A)
**Recommended fix:** Requires manual testing in a running browser. If focus is lost (especially in `MobileNav` after a route change), implement a manual focus return or use standard routing hooks to manage focus.
**File/component responsible:** `src/components/ui/dialog.tsx`, `src/components/layout/MobileNav.tsx`
**Status:** Requires further manual testing (Cannot be completely verified from code alone).

### Issue ID: KEY-004
**Page:** Exam / Practice
**Component:** Exam Interface
**Exact user action:** Attempting to navigate questions, select radio buttons, and submit.
**Observed behavior:** The interfaces do not exist yet (they are stubbed `<div>` elements).
**Expected behavior:** The user should be able to tab to questions, use arrow keys for multiple-choice answers, tab to navigation buttons, and submit without a mouse.
**Severity:** P0 (Blocks access/functionality)
**WCAG criterion:** 2.1.1 Keyboard (A), 2.1.2 No Keyboard Trap (A)
**Recommended fix:** When building these pages, use native `<fieldset>` and `<input type="radio">` wrapped in accessible UI components to ensure keyboard operability.
**File/component responsible:** `src/app/exam/page.tsx`, `src/app/practice/page.tsx`
**Status:** Cannot be verified from the current implementation.

---

## F. Priority of Each Issue
1. **KEY-004 (P0):** Exam flows are missing. Will require strict keyboard testing once built.
2. **KEY-001 (P1):** Missing Skip to Content link affects the fundamental navigability of every page.
3. **KEY-002 (P2):** Weak or missing visual focus indicators on links.
4. **KEY-003 (P2):** Focus trapping and return on Dialogs/Sheets need runtime verification.

## G. Recommended Fixes (Summary)
- **Layout:** Add a "Skip to Main Content" link at the top of the app.
- **Styling:** Apply consistent `focus-visible` utility classes to all interactive elements, particularly text links in the Header and Footer.
- **Testing:** Once package installation is permitted, execute a runtime keyboard test to verify Focus Trapping inside `Dialog` and `Sheet` components, especially after state changes.
