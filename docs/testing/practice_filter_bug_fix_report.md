# Practice Filter Bug Fix Report

## 1. Root Cause
The root cause was a combination of unstable state synchronization and missing component memoization:
1. **Unstable `useEffect` Dependency**: The Practice page was directly using `searchParams` as a dependency in a `useEffect` designed to sync URL state to local component state. In Next.js (App Router), `useSearchParams()` can yield a new object reference on renders triggered by client state updates or shallow routing. Whenever the user interacted with a local filter (e.g., clicking a Quick Subject button), the component re-rendered, providing a new `searchParams` reference to the `useEffect`. The effect then immediately fired and overwrote the local filter state back to the values found in the URL (which were still the defaults like `"all"`). This resulted in filters appearing to ignore user clicks or instantly reverting.
2. **Missing `useMemo`**: The actual dataset filtering operation was running synchronously on every render without memoization, compounding the performance and stability of the filter list UI.

## 2. Files Changed
- `src/app/practice/page.tsx`

## 3. What Was Fixed
- **State Synchronization Bug**: Refactored the synchronization `useEffect` to depend on the *values* extracted from the URL (`urlSubject`, `urlTopic`, `urlDifficulty`) instead of the `searchParams` object reference itself. This guarantees that local state only synchronizes when the URL values genuinely change.
- **Derived State Optimization**: Wrapped the `filteredSets` calculation in `React.useMemo`, using `searchQuery`, `subjectFilter`, and `difficultyFilter` as dependencies. This ensures filtering is deterministic and optimized.
- **Voice Feedback Integration**: Created centralized event handlers (`handleSubjectChange`, `handleDifficultyChange`, `handleSearchClear`, and `handleClearAllFilters`) which update the local state while conditionally dispatching Voice Feedback (using `useVoiceFeedback`).
- **Interactive UI Updates**: Re-wired the Search input clear button, Select dropdowns, Quick Subject buttons, and Active Filter chips to use the newly created event handlers.

## 4. Accessibility Impact
- **Maintained Existing A11y**: Preserved semantic labels, `aria-label`, and `aria-pressed` definitions across all interactive filters.
- **Voice Feedback Enhanced**: Visually impaired users utilizing the Voice Feedback system will now hear brief confirmations when altering the view state (e.g., "Subject set to Reasoning", "Filters cleared", etc.), significantly improving spatial awareness of the practice sets layout without requiring a separate screen reader.

## 5. Validation Results
- **Linting**: Passed (no new errors or warnings introduced in `page.tsx`).
- **Compilation**: Clean `tsc` compilation with no typing errors.
- **Build/Dev Server**: Hot reloaded cleanly without runtime errors or crashes.
- **UX**: 
  - Typing in search properly retains focus and updates the results instantly.
  - Dropdowns properly switch subjects and difficulties.
  - The Quick Select Subject buttons properly set subject and synchronize perfectly with the Dropdown and Active Filter chips (Single Source of Truth).
  - Clearing individual chips removes only their specific filter.
  - "Clear All Filters" flawlessly resets everything.
  - Count explicitly reflects `filteredSets.length`.

## 6. Any Remaining Issue
- The overarching `searchParams` hook design dictates that filters are managed purely locally until the user decides to navigate elsewhere or manually alter the URL. No significant issues remain with the Practice filter, and it functions strictly per the acceptance criteria.
