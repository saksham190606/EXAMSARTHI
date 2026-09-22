# EXAMSARTHI
Accessible Online Examination & Practice Platform for Visually Impaired Candidates.

## 🎯 Problem
Many modern online examination portals present severe accessibility barriers. Users often cannot navigate effectively without a mouse, and complex elements lack semantic labels. State changes rely purely on visual cues, leaving candidates who struggle with manual inputs without a viable fallback.

## 💡 Solution
EXAMSARTHI tackles these issues with a focused, accessibility-first approach built around independent navigation. We integrate Text-to-Speech and Speech Recognition directly into the exam flow. Combined with a semantic UI and complete keyboard navigation, candidates can practice and take exams without traditional barriers.

## ✨ Key Features
| Feature | Description |
|---|---|
| **Accessible Exam / Practice** | Mock exam flow tailored for accessible inputs. |
| **Text-to-Speech** | Native browser synthesis reads questions and options. |
| **Voice Commands** | Speech recognition to navigate and submit. |
| **Voice Answer Selection** | Choose options by saying "Option A" or "Select C". |
| **Keyboard Navigation** | Complete tab sequence and logical focus trapping. |
| **Accessibility Settings** | Toggles for contrast, text size, and voice speed. |
| **Submission Confirmation** | Prevents accidental exam submission. |
| **Accessible Results** | Clear, screen-reader friendly post-exam review. |

## 🔊 Voice Accessibility
EXAMSARTHI heavily integrates the Web Speech API for seamless voice interaction. Users can trigger TTS to "Read Question" and "Read Options", adjust "Voice speed", or say "Stop Speaking". Voice commands allow selecting answers (e.g., "Option A/1", "Option B/2", "Option C/3", "Option D/4"), navigating ("Next/Previous"), and providing "Submit confirmation" safely.

## ♿ Accessibility
Key technical implementations include:
- Semantic HTML and WAI-ARIA
- Complete keyboard navigation
- Screen-reader support with logical DOM ordering
- Visible focus states for keyboard users
- Accessible form controls (`fieldset`/`legend`)
- Non-color-only states for visual clarity
- WCAG 2.1 AA considerations

## 🔄 Exam Flow
Home → Practice → Start Exam → Question → Voice/Keyboard Interaction → Submit Confirmation → Results

## 🛠 Tech Stack
- Next.js & React
- TypeScript
- Tailwind CSS
- Zustand
- shadcn/ui + Base UI
- Web Speech API

## 📁 Project Structure
```text
src/
├── app/
├── components/
├── hooks/
├── lib/
└── store/
```
The project utilizes a modular Next.js App Router structure with dedicated directories for UI components, custom hooks, and state management.

## 🚀 Getting Started
```bash
git clone https://github.com/saksham190606/EXAMSARTHI.git
cd EXAMSARTHI
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.
*(Windows users: if you encounter script issues, use `npm.cmd install` and `npm.cmd run dev`)*

## 📚 Documentation
Detailed accessibility audits, implementation notes, and validation reports are available in the documentation folders.
- [Accessibility Audits](./docs/accessibility/)
- [Implementation Reports](./docs/implementation/)
- [Testing & Validation](./docs/testing/)

## 👥 Team
| Member | Role |
|---|---|
| **Saksham** | Team Lead + Core Developer |
| **Priyansh** | Accessibility Testing |
| **Tanmay** | UI/UX + Presentation |
| **Prakhar** | Data + Testing / QA |

## ⚠️ Known Limitations
- Speech Recognition relies heavily on native browser APIs (best in Chrome).
- Exam questions and data are currently stored locally/mocked.
- Backend services are not yet integrated.

## 🔮 Future Scope
- Backend integration and database persistence
- Candidate authentication and progress tracking
- Multilingual voice support
- Broader browser compatibility testing for assistive technologies

## 🏆 Hackathon Highlight
EXAMSARTHI combines accessible exam interaction, native Text-to-Speech, intuitive voice commands, and semantic HTML into a single cohesive workflow.
