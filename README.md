# EXAMSARTHI

**Accessible Online Examination & Practice Platform for Visually Impaired Candidates**

EXAMSARTHI is a web-based examination platform explicitly designed to empower visually impaired candidates to take practice exams independently. By combining keyboard-first navigation, deep semantic HTML, native Text-to-Speech (TTS), and Voice Commands, EXAMSARTHI aims to remove the traditional barriers found in standard online testing environments.

---

## 1. Problem Statement

Many modern online examination portals present severe accessibility barriers:
- **Poor Keyboard Navigation:** Users cannot navigate effectively without a mouse.
- **Inaccessible Controls:** Complex elements (like radios and dialogs) lack semantic labels.
- **Weak Semantic Structure:** Meaningful relationships (e.g., grouping MCQs) are lost to screen readers.
- **Reliance on Visual Cues:** State changes (like selected options) rely purely on color changes.
- **Lack of Voice Interaction:** Candidates who struggle with manual inputs have no fallback.

## 2. Our Solution

EXAMSARTHI tackles these issues head-on with a focused, accessibility-first approach. Rather than treating accessibility as an afterthought, every feature is built around the user's ability to navigate independently:
- **Accessible Semantic UI:** Utilizing precise WAI-ARIA roles.
- **Screen-Reader-Friendly Structure:** Clear fieldsets, legends, and logical DOM ordering.
- **Voice Capabilities:** Both Text-to-Speech and Speech Recognition integrated directly into the exam flow.
- **Accessibility Settings:** High contrast modes, variable text sizes, and adjustable voice speed.

---

## 3. Key Features

| Feature | Description |
|---------|-------------|
| **Accessible Practice/Exam** | Full mock exam flow tailored for accessible inputs. |
| **Text-to-Speech (TTS)** | Native browser synthesis to read questions and options aloud. |
| **Voice Commands** | Browser-based speech recognition to navigate and submit. |
| **Voice Answer Selection** | Choose options simply by saying "Option A" or "Select C". |
| **Keyboard Navigation** | Complete tab sequence and logical focus trapping. |
| **Submission Confirmation** | Prevents accidental exam submission, confirming via voice or keypress. |
| **Accessibility Settings** | Real-time toggles for contrast, text size, and voice speed. |
| **Accessible Forms** | Form controls correctly associated with their semantic labels. |

---

## 4. Voice Accessibility

EXAMSARTHI is heavily integrated with the Web Speech API.

### Text-to-Speech
Powered by `window.speechSynthesis`.
- **Read Question Aloud:** Triggers reading of the current question.
- **Read Options Aloud:** Reads through all available choices clearly.
- **Voice Speed Controls:** Users can set the reading speed to slow, normal, or fast.
- **Stop Speaking:** Immediate termination of current TTS.

### Voice Commands
Powered by `SpeechRecognition` (optimized for Google Chrome).
Available voice commands include:
- *"Option A/1", "Option B/2", "Option C/3", "Option D/4"*
- *"Next question", "Previous question"*
- *"Go to question [number]"*
- *"Read question", "Read options", "Stop speaking"*
- *"Submit exam"*
- *"Yes/Confirm"*, *"No/Cancel"* (within dialogs)

**Safety Check:** Using the "Submit exam" command triggers an accessible confirmation dialog, preventing immediate accidental submissions.

---

## 5. Accessibility

EXAMSARTHI is implemented with **WCAG 2.1 AA considerations**.
Key technical implementations include:
- **Semantic HTML & WAI-ARIA:** Extensive use of `aria-labelledby`, `aria-describedby`, and `aria-label`.
- **Form Grouping:** Proper `fieldset` and `legend` elements for MCQ options.
- **Visible Focus States:** Enhanced CSS focus rings for keyboard users.
- **Focus Management:** Trapping focus inside dialogs and resetting focus during view changes.
- **Color Independence:** State changes (e.g., active question) use bold styling and borders, not just color.

---

## 6. Exam Flow

The standard user journey is linear and fully accessible:

**Home** ➔ **Practice Center** ➔ **Start Exam** ➔ **Question View** ➔ **Read Aloud / Voice Command** ➔ **Select Answer** ➔ **Next/Previous** ➔ **Submit Confirmation** ➔ **Results**

---

## 7. Technology Stack

- **Framework:** Next.js (App Router)
- **Library:** React
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui and Base UI
- **State Management:** Zustand
- **Web Speech API:** Native Speech Synthesis and Speech Recognition

---

## 8. Project Structure

```
src/
├── app/          # Next.js App Router (pages and layouts)
├── components/   # Reusable UI components (shadcn, forms, layout)
├── hooks/        # Custom React hooks (e.g., useSpeech, useVoiceCommands)
├── lib/          # Utilities and helpers
└── store/        # Zustand state management
```

---

## 9. Available Routes

- `/` - Landing / Home page
- `/dashboard` - User dashboard
- `/practice` - Practice exam selection and configuration
- `/exam` - The main examination interface
- `/results` - Post-exam score and review
- `/settings` - Accessibility and application settings

---

## 10. Documentation

Comprehensive documentation outlining our accessibility journey during the hackathon:

### Accessibility Audits
- [Accessibility Audit Report](./docs/accessibility/accessibility_audit_report.md)
- [Keyboard Accessibility Test](./docs/accessibility/keyboard_accessibility_test.md)
- [Screen Reader Semantic Audit](./docs/accessibility/screen_reader_semantic_audit.md)
- [Visual Accessibility Audit](./docs/accessibility/visual_accessibility_audit.md)
- [Forms Exam Accessibility Audit](./docs/accessibility/forms_exam_accessibility_audit.md)
- [Master Accessibility Backlog](./docs/accessibility/master_accessibility_backlog.md)

### Implementation
- [Day 3 Step 1 Changes](./docs/implementation/day3_step1_changes.md)
- [Day 3 Step 2 Changes](./docs/implementation/day3_step2_changes.md)
- [Day 3 Step 3 Visual Changes](./docs/implementation/day3_step3_visual_changes.md)
- [Day 3 Error Resolution Report](./docs/implementation/day3_error_resolution_report.md)
- **[Exam Core Implementation Report](./docs/implementation/exam_core_implementation_report.md)** (Highly Recommended)
- [Final Accessibility Verification](./docs/implementation/final_accessibility_verification.md)
- **[Final Hackathon Readiness Report](./docs/implementation/final_hackathon_readiness_report.md)** (Highly Recommended)

### Testing & Validation
- [Day 3 Runtime Accessibility Test](./docs/testing/day3_runtime_accessibility_test.md)
- [Day 3 Validation Report](./docs/testing/day3_validation_report.md)

---

## 11. Demo Flow

The application provides a fully mocked, local examination flow. Upon launching, navigate to the **Practice Center** and start a session. Use your keyboard (`Tab`, `Space`, `Enter`) or enable the microphone to use voice commands (`"Read Question"`, `"Option A"`, `"Next Question"`) to experience the platform exactly as a visually impaired candidate would.

---

## 12. Team / Contributors

| Member | Role |
|---|---|
| **Saksham** | Team Lead + Core Developer |
| **Priyansh** | Accessibility Testing |
| **Tanmay** | UI/UX + Presentation |
| **Prakhar** | Data + Testing / QA |

---

## 13. Getting Started

Clone the repository using:
```bash
git clone https://github.com/saksham190606/EXAMSARTHI.git
```
Then run the following in your terminal:

```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

*(Note for Windows users: if you encounter script issues, you may need to run `npm.cmd install` or `npm.cmd run dev`)*

---

## 14. Known Limitations

- **Speech Recognition Compatibility:** Relies heavily on the native browser `SpeechRecognition` API, which works best in Google Chrome. Firefox and Safari may have limited support.
- **Local Data:** The exam questions and data are currently stored locally/mocked.
- **Backend/API:** Backend services are not yet integrated.

---

## 15. Future Scope

The following features are **NOT YET IMPLEMENTED** but planned for future releases:
- Backend integration and database persistence
- Candidate authentication and progress tracking
- Broader browser compatibility testing for assistive technologies
- Multilingual voice support (expanding beyond current basic TTS mapping)

---

## 16. License

License: Not yet specified.

---

## 17. Hackathon Highlights

**EXAMSARTHI** successfully combines accessible exam interaction, native Text-to-Speech, intuitive voice commands, strict keyboard navigation, and semantic HTML structure into a single, cohesive examination workflow. We proved that accessibility does not have to be an afterthought, but can be the core driver of an application's architecture.
