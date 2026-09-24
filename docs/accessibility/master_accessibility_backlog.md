# EXAMSARTHI Master Accessibility Backlog

## 1. Executive Summary
This backlog consolidates the findings from five separate accessibility audits (General, Keyboard, Screen-Reader/Semantic, Visual, and Forms/Exam) conducted against WCAG 2.1 AA standards. The EXAMSARTHI project exhibits strong foundational UI (using Radix/Base UI), but requires specific fixes for keyboard navigation, semantic HTML landmarks, and contrast ratios. Notably, the core examination and practice interfaces are currently functional stubs and their accessibility requirements are documented as future implementation guidelines to ensure a robust foundation when they are built.

## 2. Total Issues by Priority
- **P0 (Blocks Access - Future Implementation):** 1 (Exam/Practice Interfaces)
- **P1 (Major Barrier):** 8
- **P2 (Moderate Issue):** 10
- **P3 (Minor Improvement):** 1

## 3. Confirmed Code Issues
The following issues were definitively identified via source code inspection and violate WCAG criteria natively in the markup or CSS:
- SEM-001 (Missing `<main>` landmark)
- FRM-01 (Missing `aria-labelledby` on RadioGroup)
- FRM-02 (Missing `htmlFor` on Switch labels)
- FRM-03 (Missing `aria-describedby` on Switch helper text)
- SR-002 (Missing `aria-current="page"`)
- KEY-001 (Missing "Skip to Content" link)
- KEY-002 (Missing `focus-visible` utility classes on links)
- SEM-002 (Missing `aria-label` on `<nav>` landmarks)
- VIS-C-01 (Color-only indication for destructive variants)
- VIS-H-01 (Inadequate touch target sizes)
- VIS-D-01 (Small typography `text-xs`)

## 4. Issues Requiring Browser Testing
- VIS-B-01 (Exact computed contrast of 15% opacity dark mode borders)
- VIS-A-01 (Contrast of `opacity-50` disabled elements)
- VIS-B-02 (Contrast of `ring/50` focus rings)
- VIS-E-01 (Fixed heights clipping text at 200% zoom)
- VIS-F-01 (`overflow-hidden` clipping content at 400% zoom)
- VIS-G-01 (Focus rings clipped by `overflow-hidden` containers)
- ISS-004 / KEY-003 (Dialog/Sheet focus trapping and return focus behavior)

## 5. Issues Requiring Real Screen-Reader Testing
- NAV-001 (Unpredictable focus management during route changes inside Mobile Nav)
- Verifying the announcement of `RadioGroup` and `Select` components with assistive technology once ARIA fixes are applied.

## 6. Master Backlog

| ID | Priority | Category | Page/Route | Component | File | Problem | WCAG Criterion | Recommended Fix | Verification Method | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| SEM-001 | P1 | Semantic HTML | Landing Page | Main Layout | `src/app/(marketing)/page.tsx` | Missing main semantic region. | 1.3.1 | Change root `<div>` to `<main>`. | Confirmed from code | OPEN |
| FRM-01 | P1 | Forms | Global | RadioGroup | `src/components/accessibility/AccessibilityPanel.tsx` | RadioGroup lacks `aria-labelledby` linking to its visual label. | 1.3.1, 3.3.2 | Add `id` to label and `aria-labelledby` to RadioGroup. | Confirmed from code | OPEN |
| SR-002 | P1 | Semantic HTML | Global | Header Links | `src/components/layout/Header.tsx` | Active navigation links rely on color only. | 1.4.1, 4.1.2 | Add `aria-current="page"` to the active route link. | Confirmed from code | OPEN |
| KEY-001 | P1 | Keyboard Nav | All Pages | Global Layout | `src/app/layout.tsx` | Missing "Skip to Main Content" link. | 2.4.1 | Implement a Skip Link component at the top of the layout. | Confirmed from code | OPEN |
| VIS-B-01 | P1 | Visual | Global | Input, Card | `src/app/globals.css`, `src/components/ui/input.tsx` | Dark mode inputs/borders use 15% opacity white. | 1.4.11 | Increase border opacity to at least 30% or use solid colors. | Requires browser testing | OPEN |
| VIS-C-01 | P1 | Visual | Global | Alert, Badge, Button | `src/components/ui/alert.tsx`, `src/components/ui/badge.tsx` | Destructive variants use color-only for error states. | 1.4.1 | Include warning/error icon or explicit text. | Confirmed from code | OPEN |
| VIS-E-01 | P1 | Visual | Global | Button, Input | `src/components/ui/button.tsx`, `src/components/ui/input.tsx` | Fixed heights (`h-8`) prevent text resizing. | 1.4.4 | Change fixed heights to minimum heights (`min-h-8`). | Requires browser testing | OPEN |
| ISS-004 | P1 | Dialog/Nav | Global | Dialog | `src/components/ui/dialog.tsx` | Focus trapping and return on Dialogs need runtime verification. | 2.4.3 | Manual testing in a running browser. | Requires browser testing | OPEN |
| FRM-02 | P2 | Forms | Global | Switch | `src/components/accessibility/AccessibilityPanel.tsx` | Switch visual text lacks `htmlFor` linking. | 1.3.1, 2.5.8 | Add `id` to Switch and `htmlFor` to Label. | Confirmed from code | OPEN |
| FRM-03 | P2 | Forms | Global | Switch | `src/components/accessibility/AccessibilityPanel.tsx` | Helper text not programmatically linked. | 1.3.1, 3.3.2 | Add `aria-describedby` to Switch pointing to helper text. | Confirmed from code | OPEN |
| SEM-002 | P2 | Semantic HTML | Global | Header, MobileNav | `src/components/layout/Header.tsx`, `src/components/layout/MobileNav.tsx` | Multiple `<nav>` landmarks lack accessible names. | 1.3.1, 2.4.1 | Add `aria-label` to `<nav>` tags. | Confirmed from code | OPEN |
| KEY-002 | P2 | Keyboard Nav | Global | Header, Landing Page | `src/components/layout/Header.tsx`, `src/app/(marketing)/page.tsx` | Links lack custom `focus-visible` classes. | 2.4.7, 1.4.11 | Add explicit `focus-visible` outline utility classes. | Confirmed from code | OPEN |
| NAV-001 | P2 | Dialog/Nav | Global | Mobile Nav | `src/components/layout/MobileNav.tsx` | Route changes inside mobile menu can disrupt focus. | 2.4.3 | Screen-reader testing on route change. | Requires screen-reader testing | OPEN |
| VIS-A-01 | P2 | Visual | Global | Button, Input | `src/components/ui/button.tsx`, `src/components/ui/input.tsx` | Disabled elements use `opacity-50`. | 1.4.3, 1.4.11 | Replace `opacity-50` with disabled color tokens. | Requires browser testing | OPEN |
| VIS-B-02 | P2 | Visual | Global | Focus Styles | `src/app/globals.css`, `src/components/ui/button.tsx` | Focus rings use `ring-ring/50`. | 1.4.11, 2.4.7 | Use solid colors for focus rings. | Requires browser testing | OPEN |
| VIS-F-01 | P2 | Visual | Global | Card | `src/components/ui/card.tsx` | `overflow-hidden` risks clipping content at 400% zoom. | 1.4.10 | Review use of `overflow-hidden`. | Requires browser testing | OPEN |
| VIS-G-01 | P2 | Visual | Global | Global Theme | `src/app/globals.css` | Focus rings potentially clipped by `overflow-hidden` parents. | 2.4.7 | Test interactive elements inside `overflow-hidden` containers. | Requires browser testing | OPEN |
| VIS-H-01 | P2 | Visual | Global | Button, Input | `src/components/ui/button.tsx` | Button sizes `xs` and `sm` have very small touch targets. | 2.5.5, 2.5.8 | Scale up to at least 44px on mobile viewports. | Confirmed from code | OPEN |
| VIS-D-01 | P3 | Visual | Global | Button | `src/components/ui/button.tsx` | Small typography (`text-xs`) on `xs` buttons. | 1.4.8 | Increase `text-xs` size slightly or use sparingly. | Confirmed from code | OPEN |

## 7. Quick-Win Candidates
- **SEM-001:** Change the root `<div>` in `src/app/(marketing)/page.tsx` to `<main>`.
- **SR-002:** Add `aria-current="page"` logic to active navigation links.
- **SEM-002:** Add `aria-label="Main"` and `aria-label="Mobile"` to `<nav>` tags.
- **KEY-002:** Add `focus-visible:outline` classes to `<Link>` components globally.

## 8. Core Accessibility Foundation Fixes
- **KEY-001:** Implement a "Skip to Main Content" link in the root layout.
- **ISS-004 / KEY-003:** Establish rigorous focus trapping and return-focus logic for Dialogs and Sheets, especially when navigating via next/link inside a modal.

## 9. Forms/Screen-Reader Fixes
- The `AccessibilityPanel` needs immediate attention to link `<Label>` to its `<Switch>` via `htmlFor` (FRM-02), and `<RadioGroup>` via `aria-labelledby` (FRM-01).

## 10. Visual Accessibility Fixes
- Review the Tailwind configuration and UI components to remove fixed heights (`h-8` -> `min-h-8`) (VIS-E-01) and increase dark mode border opacities (VIS-B-01).

## 11. Future Exam/Practice Accessibility Requirements (P0)
The routes `/exam`, `/practice`, and `/results` are currently stubs. When they are implemented, the following requirements MUST be met to ensure WCAG compliance:
1. **Radio Group Context:** Use `<fieldset>` and `<legend>` for all multiple-choice questions.
2. **Timer Announcements:** Announce only critical time warnings (e.g., 5 minutes left) using `aria-live="polite"`. Do NOT use continuous assertive announcements.
3. **Form Validation:** Move focus to the first unanswered/invalid question upon a failed submission attempt.
4. **Error Identification:** Use `aria-invalid="true"` and `aria-describedby` for validation errors on unanswered required questions.
5. **Question Navigation:** Ensure the question palette clearly identifies the answered/unanswered states using visually hidden text.
6. **Confirmation:** Provide an accessible confirmation dialog (`role="alertdialog"`) before final exam submission.
7. **Dynamic Loading:** If questions load dynamically, use `aria-live` or shift focus to the new question heading.
8. **Results Data:** Do not rely solely on color for correct/incorrect answers; include text labels or icons.
9. **Skip Links:** Implement a "Skip to Exam Questions" link to bypass headers.
10. **Keyboard Traps:** Ensure modal dialogs trap keyboard focus correctly.

## 12. Developer Handoff Section
All issues marked as "Confirmed from code" can be actioned immediately without requiring a running environment. However, any issues marked "Requires browser testing" or "Requires screen-reader testing" MUST be tested in a local dev environment (`npm run dev`) before fixes are merged. 

## 13. Final Testing Checklist
- [ ] Install dependencies and run the application locally.
- [ ] Verify all contrast ratios in both light and dark mode using an automated tool (e.g., axe DevTools) or manual color picker.
- [ ] Navigate the entire application using ONLY the `Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc`, and `Arrow` keys.
- [ ] Test the application using a screen reader (NVDA on Windows or VoiceOver on macOS).
- [ ] Zoom the page to 200% and ensure text resizing does not break layout.
- [ ] Zoom the page to 400% and ensure reflow occurs without horizontal scrolling or clipped content.

