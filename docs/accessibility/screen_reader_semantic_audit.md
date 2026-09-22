# Screen-Reader and Semantic Accessibility Audit

**Note on Testing:** This audit was performed via a rigorous inspection of the underlying source code and component structures. **No actual screen readers (NVDA, JAWS, VoiceOver, TalkBack) were used during this phase.** Issues marked as "Requires screen-reader testing" must be manually verified with assistive technology in a running browser environment before being considered fully resolved.

---

## 1. Top Screen-Reader Issues

### Issue ID: SR-001
**Page:** All Pages
**Component:** Accessibility Panel
**File:** `src/components/accessibility/AccessibilityPanel.tsx`
**Current implementation:** The `<Switch>` elements have an `aria-label` (e.g., `aria-label="Toggle reduced motion"`), while their adjacent visual text labels (`<Label>Reduced Motion</Label>`) are not programmatically linked to them via an `id` and `htmlFor` attribute.
**Problem:** A screen reader will read the visual text and the switch label separately, causing redundancy and potential confusion. Furthermore, clicking the visual label text does not toggle the switch because they are not semantically linked.
**Expected accessible behavior:** Visual labels should act as the accessible name for their form controls. Clicking the label should activate the control.
**WCAG 2.1 criterion:** 1.3.1 Info and Relationships (A), 3.3.2 Labels or Instructions (A)
**Severity:** P2
**Recommended fix:** Assign a unique `id` to the `<Switch>` components and use `<Label htmlFor="the-id">` to link them. Remove the separate `aria-label` from the switch to avoid redundant announcements.
**Verification method:** Confirmed from code.

### Issue ID: SR-002
**Page:** All Pages
**Component:** Header Navigation Links
**File:** `src/components/layout/Header.tsx`
**Current implementation:** Active navigation links use a slightly different text color (`text-foreground` vs `text-foreground/60`) but have no semantic indicator of state.
**Problem:** A screen reader user navigating the links will not know which link represents the page they are currently on.
**Expected accessible behavior:** The active page link must explicitly communicate its state to assistive technology.
**WCAG 2.1 criterion:** 4.1.2 Name, Role, Value (A)
**Severity:** P1
**Recommended fix:** Add `aria-current="page"` to the `<Link>` that corresponds to the active route.
**Verification method:** Confirmed from code.

---

## 2. Top Semantic HTML Issues

### Issue ID: SEM-001
**Page:** Landing/Marketing Page
**Component:** Main Layout
**File:** `src/app/(marketing)/page.tsx`
**Current implementation:** The entire page content is wrapped inside a generic `<div className="flex flex-col min-h-screen">`.
**Problem:** The page lacks a `<main>` semantic landmark.
**Expected accessible behavior:** The primary content of every page should be enclosed in a single `<main>` tag to allow screen reader users to jump directly to it.
**WCAG 2.1 criterion:** 1.3.1 Info and Relationships (A)
**Severity:** P1
**Recommended fix:** Change the root wrapper `<div>` containing the page sections to a `<main>` tag.
**Verification method:** Confirmed from code.

### Issue ID: SEM-002
**Page:** All Pages
**Component:** Header and MobileNav
**File:** `src/components/layout/Header.tsx`, `src/components/layout/MobileNav.tsx`
**Current implementation:** Both the desktop header and the mobile menu utilize the `<nav>` tag without an accessible name.
**Problem:** When a page contains multiple `<nav>` landmarks, screen reader users cannot easily distinguish between them.
**Expected accessible behavior:** Each `<nav>` should have a unique accessible name.
**WCAG 2.1 criterion:** 1.3.1 Info and Relationships (A), 2.4.1 Bypass Blocks (A)
**Severity:** P2
**Recommended fix:** Add `aria-label="Main"` to the desktop `<nav>` and `aria-label="Mobile"` to the mobile `<nav>`.
**Verification method:** Confirmed from code.

---

## 3. ARIA Issues

### Issue ID: ARIA-001
**Page:** All Pages
**Component:** Accessibility Panel
**File:** `src/components/accessibility/AccessibilityPanel.tsx`
**Current implementation:** The `RadioGroup` for Text Size, Contrast, and Theme uses base-ui which likely handles internal ARIA roles (like `role="radiogroup"`), but the overarching `Label` for the group is just a stylized text element (`<Label>Text Size</Label>`). 
**Problem:** The `RadioGroup` may not be programmatically associated with its grouping label.
**Expected accessible behavior:** The group of radio buttons should be semantically grouped under a single accessible name.
**WCAG 2.1 criterion:** 1.3.1 Info and Relationships (A)
**Severity:** P2
**Recommended fix:** Add an `id` to the grouping label and use `aria-labelledby` on the `RadioGroup` pointing to that ID.
**Verification method:** Requires runtime testing (to verify how base-ui maps the labels).

---

## 4. Forms & Exam Interfaces Issues

### Issue ID: FRM-001
**Page:** Exam & Practice (Stubs)
**Component:** N/A (Missing Implementation)
**File:** `src/app/exam/page.tsx`, `src/app/practice/page.tsx`
**Current implementation:** The exam components have not yet been built.
**Problem:** Building accessible exam interfaces is highly complex and risky if not planned structurally from the start.
**Expected accessible behavior:** Exam questions with multiple choices MUST use `<fieldset>` and `<legend>` for the question text, and standard radio buttons for options. Timer countdowns MUST use an `aria-live` region to periodically announce time remaining without overwhelming the user.
**WCAG 2.1 criterion:** Multiple (3.3.2, 4.1.3, etc.)
**Severity:** P0
**Recommended fix:** Follow strict semantic guidelines when implementing these pages.
**Verification method:** Confirmed from code (Implementation missing).

---

## 5. Dialog/Navigation Issues

### Issue ID: NAV-001
**Page:** All Pages
**Component:** Mobile Nav
**File:** `src/components/layout/MobileNav.tsx`
**Current implementation:** The mobile sheet is implemented using `@base-ui` which theoretically manages the `<dialog>` ARIA role and `aria-modal="true"`.
**Problem:** Because the menu relies on internal Next.js routing, clicking a link might close the menu and load a new route simultaneously, which can cause unpredictable focus management for screen readers.
**Expected accessible behavior:** The screen reader should announce the navigation cleanly, and focus should predictably move to the new page content.
**WCAG 2.1 criterion:** 2.4.3 Focus Order (A)
**Severity:** P2
**Recommended fix:** Needs actual screen-reader testing to observe behavior on route change.
**Verification method:** Requires screen-reader testing.

---

## 6. Issues Requiring Actual Screen-Reader Testing

1. **Accessibility Panel Focus Flow:** Using NVDA/VoiceOver, open the settings dialog and verify that all Text Size and Contrast radio buttons announce their state (checked/unchecked) correctly, and that the focus trap does not let the screen reader "escape" the modal into the background content.
2. **Language Selector:** Verify that the Shadcn/Base-UI `Select` component announces its listbox popup and selected language effectively. (Custom select components frequently have ARIA mapping bugs).
3. **Route Announcements:** When navigating between "Dashboard", "Practice", and "Exams", does the screen reader announce the page change? (Next.js sometimes requires a custom route announcer component to ensure blind users know the new page has loaded).

---

## 7. Files/Components Likely Requiring Changes

- `src/app/(marketing)/page.tsx` (Add `<main>`)
- `src/components/layout/Header.tsx` (Add `aria-label` to `<nav>`, add `aria-current`)
- `src/components/layout/MobileNav.tsx` (Add `aria-label` to `<nav>`)
- `src/components/accessibility/AccessibilityPanel.tsx` (Link `<Label>` with `<Switch>` via IDs)
- `src/app/exam/page.tsx` (Requires complete accessible implementation)
- `src/app/practice/page.tsx` (Requires complete accessible implementation)
