# Automatic Question Voice Reading Implementation Report

## Overview
Implemented the **Automatic Question Voice Reading** feature for EXAMSARTHI to automatically read questions (and optionally, their answer options) aloud to the user when they navigate between questions during an exam session. This improves accessibility, particularly for visually impaired users who otherwise had to trigger speech manually.

## Core Implementation Steps

### 1. State Management (`useAccessibilityStore.ts`)
- Added `autoReadOptions` boolean property to store the preference for automatically reading options out loud.
- Preserved existing `autoReadQuestions` preference.
- Provided `setAutoReadOptions` action to mutate the state.

### 2. Accessibility Panel (`AccessibilityPanel.tsx`)
- Added the **Auto Read Options** toggle directly beneath the **Auto Read Questions** toggle in the accessibility panel settings dialog.
- Added a **Voice Feedback** toggle, making use of the already existing `voiceFeedback` property from the store.

### 3. Exam Engine Guard Logic (`ExamSession.tsx`)
- Configured a `useEffect` hook that listens for changes to the `currentQuestion.id`.
- Handled the speech generation if both `audioAssistance` and `autoReadQuestions` are toggled `ON`.
- Included the logic to append formatted choices to the `textToSpeak` string when `autoReadOptions` is toggled `ON`.
- **Zero Duplicate Speech Guard**: A `useRef` hook (`lastSpokenQuestionId`) guarantees the automatic speech triggers only when the actual question changes, preventing React re-renders (like ticking timers, window resizes, option selections) from interrupting the user and unnecessarily re-reading the question.
- **i18n Support**: Utilized the `useTranslation` hook (`t('question')`, `t('option')`) ensuring full locale support (e.g., Hindi translation support as expected in EXAMSARTHI).

### 4. Translation Updates (`i18n.ts`)
- Added `"option"` to the `en` and `hi` translation maps so that `"Option {1}: ..."` reads effectively in English and Hindi.

## Conclusion
The update elegantly reuses existing text-to-speech hooks (`useSpeech`) and ensures clean integration into the `useAccessibilityStore` persistence layer without modifying or rebuilding UI components that have been carefully designed. Screen reader and manual speech controls remain perfectly intact.
