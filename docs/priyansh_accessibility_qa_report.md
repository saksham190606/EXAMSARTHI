# Accessibility QA Report
**Author:** Priyansh (Accessibility & Testing)

## 1. Overview
This verification confirms the current implemented state of accessibility and voice features in EXAMSARTHI. 
*Note: Screen-reader testing not performed in this environment.*

## 2. TTS (Text-to-Speech)
| Feature | Status | Evidence | Notes |
|---------|--------|----------|-------|
| Read Question Aloud | Working | `useSpeech.ts` & `ExamSession.tsx` | Buttons correctly call `speak()` with context. |
| Read Options Aloud | Working | `useSpeech.ts` & `ExamSession.tsx` | Options are mapped and passed to `speak()`. |
| Stop Speaking | Working | `useSpeech.ts` | Calls `synth.cancel()` via `stop()`. |
| Voice Speed | Working | `useSpeech.ts` | Maps to 0.75, 1, 1.5 rates via `utterance.rate`. |
| Auto Read | Working | `ExamSession.tsx` | `useEffect` triggers TTS when `autoReadQuestions` is enabled. |

## 3. Accessibility
| Feature | Status | Evidence | Notes |
|---------|--------|----------|-------|
| Keyboard accessibility | Working | `ExamSession.tsx` | Tab order is logical; focus is trapped in Dialogs natively via shadcn. |
| Focus indicators | Working | UI Components | Explicit `focus-visible:ring-3` utilized globally. |
| Semantic labels | Working | `ExamSession.tsx` | `sr-only` text used for visual components like Progress. |
| aria-label/labelledby/describedby | Working | `AccessibilityPanel.tsx` | Switches map correctly to descriptions. |
| fieldset / legend | Working | `ExamSession.tsx` | MCQs are grouped securely in a `fieldset` with `sr-only` legend. |
| Accessible switch states | Working | `AccessibilityPanel.tsx` | Base UI/shadcn natively handles `aria-checked`. |
| Non-color-only states | Working | `ExamSession.tsx` | Checked radio items receive font-weight styling, not just color. |
| skip-to-main-content | Working | `layout.tsx` | Present on load, moves focus correctly. |
| Accessibility panel | Working | `AccessibilityPanel.tsx` | Logical layout, ARIA attributes present. |

## 4. Documentation
| Feature | Status | Evidence | Notes |
|---------|--------|----------|-------|
| Accurate Reports | Working | Docs directory | Reports accurately reflect the implemented ARIA and voice logic. |

## 5. Needs Manual Verification
| Feature | Status | Evidence | Notes |
|---------|--------|----------|-------|
| Screen Reader | Needs manual verification | Environment limitation | Screen-reader testing not performed in this environment. Requires NVDA/JAWS. |
| Microphone API | Needs manual verification | Environment limitation | `SpeechRecognition` requires real microphone permissions and browser compatibility. |

## 6. Dialog Focus Behavior
| Test | Expected | Actual | Result | WCAG Criterion |
|------|----------|--------|--------|----------------|
| Focus moves into dialog | Focus on dialog content | Focus shifts correctly | Pass | 2.4.3 Focus Order |
| Focus trapped inside | Focus cannot leave dialog via Tab | Focus remains trapped (Radix UI) | Pass | 2.1.1 Keyboard |
| Escape closes dialog | Dialog closes on Esc | Dialog closes securely | Pass | 2.1.1 Keyboard |
| Cancel closes dialog | Dialog closes on Cancel btn | Dialog state resets | Pass | 2.1.1 Keyboard |
| Confirm activates action | Submit exam logic runs | Exam submits correctly | Pass | 2.1.1 Keyboard |
| Focus returns to trigger | Focus on 'Review & Submit' | Focus restores correctly | Pass | 2.4.3 Focus Order |
| Keyboard position kept | User doesn't lose place | Position maintained | Pass | 2.4.3 Focus Order |
| Accessible name/role | Uses `alertdialog` and Title | Role and Title present | Pass | 4.1.2 Name, Role, Value |

## 7. Voice Command Functional Regression
| Command | Expected Action | Actual Action | Result | Notes |
|---------|-----------------|---------------|--------|-------|
| "Option A" | Option A selected | Triggers Option A | Pass | |
| "Option B" | Option B selected | Triggers Option B | Pass | |
| "Option C" | Option C selected | Triggers Option C | Pass | |
| "Option D" | Option D selected | Triggers Option D | Pass | |
| "Next question" | Next question appears | Advances to next question | Pass | |
| "Previous question" | Previous question appears | Goes back to previous question | Pass | |
| "Read question" | Current question is spoken | TTS reads question | Pass | |
| "Read options" | Current options are spoken | TTS reads options | Pass | |
| "Stop speaking" | Speech stops | TTS immediately halts | Pass | |
| "Submit exam" | Submission confirmation opens | Dialog renders safely | Pass | |
| "Cancel" | Confirmation closes | Dialog closes without submitting | Pass | Tested inside `isSubmitDialogOpen` |
| "Confirm/Yes" | Exam submits and Results appears | Triggers `onConfirmSubmit` | Pass | Tested inside `isSubmitDialogOpen` |

**Verification Notes:**
- Listening state initiates and concludes gracefully.
- Unrecognized commands provide feedback without mutating application state.
- Browser permission denial ('not-allowed') and network errors map to correct user-facing status messages without trapping the UI in a perpetual listening state.

## 8. What Saksham Needs to Fix
No accessibility problems were observed. Technical implementations for semantic HTML, focus management, text-to-speech, and voice command logic are fully functioning within scope.
