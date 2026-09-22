# Form & Exam/Practice Accessibility Audit

**Date:** 2026-09-22
**Project:** EXAMSARTHI
**Scope:** Forms, Exam Interfaces, Practice Interfaces, Dynamic Content

> [!IMPORTANT]
> This audit was performed via code inspection. Features marked as "Incomplete/Stubs" were verified to exist only as placeholder files and lack actual implementations. No assumptions were made about how these non-existent features function.

---

## A. Forms Audited
- **Accessibility Settings Panel** (`src/components/accessibility/AccessibilityPanel.tsx`)
- *(Note: No other functional forms, login pages, or data-entry views are currently implemented in the repository.)*

## B. Form Accessibility Issues

**Issue ID:** FRM-01
**Category:** Forms - Grouping & Labels
**Page/Route:** Global (Accessibility Panel Dialog)
**Component:** `RadioGroup`
**File:** `src/components/accessibility/AccessibilityPanel.tsx`
**Current implementation:** `RadioGroup` components are preceded by a visual `<Label>` (e.g., `<Label>Text Size</Label>`), but there is no programmatic association (`aria-labelledby`) linking the group to its label.
**Accessibility problem:** Screen reader users navigating to the radio group will not hear the group name ("Text Size", "Contrast"), only the individual options ("Default", "Large"), removing critical context.
**Expected accessible behavior:** The `<RadioGroup>` should use `aria-labelledby` pointing to the ID of the visual `<Label>`, or use a native `<fieldset>` and `<legend>`.
**WCAG 2.1 criterion:** 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions
**Severity:** P1
**Recommended fix:** Add an `id` to the group Label (e.g., `id="text-size-label"`) and add `aria-labelledby="text-size-label"` to the `<RadioGroup>`.
**Verification method:** Confirmed from code

**Issue ID:** FRM-02
**Category:** Forms - Control Associations
**Page/Route:** Global (Accessibility Panel Dialog)
**Component:** `Switch`
**File:** `src/components/accessibility/AccessibilityPanel.tsx`
**Current implementation:** The `<Switch>` has an `aria-label`, but its visual text label (`<Label>Reduced Motion</Label>`) lacks an `htmlFor` attribute linking it to the switch.
**Accessibility problem:** Sighted mouse or touch users cannot click the text "Reduced Motion" to toggle the switch. The hit area is restricted entirely to the small switch toggle.
**Expected accessible behavior:** Clicking a visual label must activate its associated form control.
**WCAG 2.1 criterion:** 1.3.1 Info and Relationships, 2.5.8 Target Size Minimum (hit area expansion)
**Severity:** P2
**Recommended fix:** Assign an `id` to the `<Switch>` and add the matching `htmlFor` to the `<Label>`.
**Verification method:** Confirmed from code

**Issue ID:** FRM-03
**Category:** Forms - Helper Text
**Page/Route:** Global (Accessibility Panel Dialog)
**Component:** `Switch` Helper Text
**File:** `src/components/accessibility/AccessibilityPanel.tsx`
**Current implementation:** Helper text like `<p>Minimize animations</p>` is visually placed near the switch but not programmatically linked.
**Accessibility problem:** Screen reader users focusing on the switch will hear the label but will completely miss the explanatory helper text.
**Expected accessible behavior:** Helper text must be linked to the control using `aria-describedby`.
**WCAG 2.1 criterion:** 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions
**Severity:** P2
**Recommended fix:** Add an `id` to the helper text `<p>` element and reference it using `aria-describedby` on the `<Switch>`.
**Verification method:** Confirmed from code

---

## C. Exam Interface Audit
**Status:** ⚠️ NOT IMPLEMENTED (Stub)
**File:** `src/app/exam/page.tsx`
The exam interface currently consists solely of placeholder text (`"The secure, accessible examination interface will load here."`). None of the required components (questions, answers, navigation, timer, submission) exist in the codebase.

## D. Practice Interface Audit
**Status:** ⚠️ NOT IMPLEMENTED (Stub)
**File:** `src/app/practice/page.tsx`
The practice interface currently consists solely of placeholder text (`"Mock tests and practice materials will appear here."`). 

## E. Timer / Dynamic-Content Issues
**Status:** ⚠️ NOT IMPLEMENTED
No timer or dynamic content logic (e.g., `aria-live` regions, dynamic question loading, validation errors) is currently implemented.
**Future Accessibility Risk:** When implementing the timer, do not use `aria-live="assertive"` to announce every second, as this will render the exam completely unusable for screen reader users. Use a button to query the time or announce only at critical thresholds (e.g., 5 minutes remaining).

## F. Question / Answer Accessibility Issues
**Status:** ⚠️ NOT IMPLEMENTED
No question/answer components exist.
**Future Accessibility Risk:** When building multiple-choice questions, ensure each set of answers is wrapped in a `<fieldset>` with the question text as the `<legend>` so the question is announced when users navigate into the answers.

## G. Submission / Results Issues
**Status:** ⚠️ NOT IMPLEMENTED (Stub)
**File:** `src/app/results/page.tsx`
The results page is a stub. No submission flow, confirmation dialogs, or accessible score presentations exist yet.

---

## H. Cross-Referenced Existing Issues
- **[SRA-01] Semantic Labels:** Overlaps with **[FRM-02]**. Documented in `screen_reader_semantic_audit.md` during Day 1, emphasizing the lack of programmatic `<Label>` to control links in `AccessibilityPanel.tsx`.
- **[VIS-H-01] Touch Targets:** Documented in `visual_accessibility_audit.md`. Small switch/button hit areas are exacerbated by the lack of clickable labels identified in **[FRM-02]**.

---

## I. Top 10 Exam-Critical Accessibility Guidelines (For Future Implementation)
Since the exam interface is currently a stub, these are the top priorities to ensure it is built accessibly from the ground up:
1. **Radio Group Context:** Use `<fieldset>` and `<legend>` for all multiple-choice questions.
2. **Timer Announcements:** Do not announce time continuously. Announce only critical warnings (e.g., 5 minutes left) using `aria-live="polite"`.
3. **Form Validation:** Move focus to the first unanswered/invalid question upon a failed submission attempt.
4. **Error Identification:** Use `aria-invalid="true"` and `aria-describedby` for validation errors on unanswered required questions.
5. **Question Navigation:** Ensure the question navigator (palette) clearly identifies the current, answered, and unanswered states using visually hidden text (e.g., `<span className="sr-only">Answered</span>`), not just colors.
6. **Confirmation:** Provide an accessible confirmation dialog (`role="alertdialog"`) before final exam submission to prevent accidental clicks.
7. **Dynamic Loading:** If questions load dynamically without a page refresh, use `aria-live` or shift focus to the new question heading to alert screen readers.
8. **Results Data:** Do not rely solely on red/green colors for correct/incorrect answers in the results view; include text labels or icons.
9. **Skip Links:** Implement a "Skip to Exam Questions" link to bypass headers and navigation.
10. **Keyboard Traps:** Ensure modal dialogs (like "Time's up!") trap keyboard focus correctly so users cannot interact with the background exam behind the modal.

---

## J. Features That Are Currently Incomplete/Stubs
The following pages are currently just structural stubs returning basic `<div>` wrappers and placeholder text:
- `/exam` (`src/app/exam/page.tsx`)
- `/practice` (`src/app/practice/page.tsx`)
- `/results` (`src/app/results/page.tsx`)
- `/settings` (`src/app/settings/page.tsx`)

## K. Issues Requiring Actual Browser Testing
- None specific to this audit, as the missing `aria-labelledby`, `htmlFor`, and `aria-describedby` attributes are definitive, code-level accessibility failures that violate HTML specifications.

## L. Issues Requiring Actual Screen-Reader Testing
- Testing the exact announcement behavior of the `AccessibilityPanel` radio groups once `aria-labelledby` is implemented to ensure the screen reader reads "Text Size, Default, radio button 1 of 3" correctly.
- Verifying that the Radix UI Dialog correctly traps focus and announces its title upon opening.
