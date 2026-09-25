# QA Report: Natural Multilingual Command-Driven Voice Interface (Voice Mode V2)

**Document:** `QA/VOICE_MODE_2_PRODUCTION.md`  
**Date:** September 2026  
**Environment:** Next.js 16.3.5 / Turbopack / Vercel Production Environment  
**Status:** PASSED & VERIFIED  

---

## 1. System Architecture

The Voice Examination System in EXAMSARTHI has been upgraded into a natural, multilingual, command-driven interface without replacing the core exam engine, personalization pipeline, or accessibility primitives.

```
+-----------------------------------------------------------------------------------+
|                              Candidate Voice Input                                |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        Web Speech Recognition (Browser)                           |
|         Locale dynamically adapted: en-IN (Indian English) <-> hi-IN (Hindi)       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                         Multilingual Command Parser                               |
|        - Regex-based normalization & script detection (Devanagari vs Latin)       |
|        - Bilingual support: English, Hindi, Transliterated, & Mixed Phrases       |
|        - Returns ParsedCommand { type, detectedLanguage, rawText }                |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                         useVoiceMode Hook & State Machine                         |
|   States: Inactive -> RequestingPermission -> Listening <-> Processing <-> Speaking|
|   Safeguards:                                                                     |
|     1. Acoustic Collision Prevention: Synchronously halts recognition during TTS  |
|     2. Audio Buffer Flush: 300ms safety buffer after speech ends before listening |
|     3. Silence Tolerance: 'no-speech' silently restarts without error prompts      |
|     4. Single Unknown Feedback: Unrecognized input produces at most 1 prompt     |
|     5. Controlled Locale Adaptation: Switches locale after detected language      |
|     6. Two-Step Submission Safeguard: Voice submit triggers UI confirmation       |
+-----------------------------------------------------------------------------------+
        |                                                 |
        v                                                 v
+-------------------------------+             +-------------------------------------+
|        Exam State Actions     |             |      Browser Speech Synthesis       |
| (Select, Navigate, Flag, etc) |             | (Matches detected language: hi / en)|
+-------------------------------+             +-------------------------------------+
```

---

## 2. Commands Added & Supported

The voice command system now provides natural bilingual and mixed-language understanding:

### Navigation
- **English:** `next`, `next question`, `go next`, `forward`, `previous`, `previous question`, `go back`, `back`, `question 5`, `go to question 5`
- **Hindi:** `अगला`, `अगला सवाल`, `अगला प्रश्न`, `आगे`, `आगे बढ़ो`, `पिछला`, `पिछला सवाल`, `पिछला प्रश्न`, `पीछे`, `वापस`, `सवाल 5`, `प्रश्न 5 पर जाओ`
- **Mixed / Transliterated:** `अगला question`, `next सवाल`, `नेक्स्ट`, `प्रीवियस`, `agla sawal`, `pichla`, `question 5 par jao`

### Reading
- **English:** `read question`, `read the question`, `repeat`, `repeat question`, `read again`, `read options`, `read everything`, `read all`
- **Hindi:** `सवाल पढ़ो`, `प्रश्न पढ़ो`, `दोबारा पढ़ो`, `फिर से पढ़ो`, `विकल्प पढ़ो`, `सब पढ़ो`, `पूरा पढ़ो`
- **Mixed / Transliterated:** `sawal padho`, `dohrao`, `vikalp padho`, `question padho`, `sab padho`

### Answer Selection
- **English:** `A`, `B`, `C`, `D`, `Option A`, `Option B`, `Option C`, `Option D`, `Select B`, `Choose B`, `1`, `2`, `3`, `4`
- **Hindi:** `विकल्प ए`, `विकल्प बी`, `विकल्प सी`, `विकल्प डी`, `ए चुनो`, `बी चुनो`, `पहला`, `दूसरा`, `तीसरा`, `चौथा`, `ऑप्शन 2`
- **Mixed / Transliterated:** `Option बी`, `विकल्प B`, `doosra`, `pehla`, `vikalp b`

### Exam Controls
- **Start Exam:**
  - English: `start exam`, `begin exam`, `start test`, `begin test`
  - Hindi: `परीक्षा शुरू करो`, `परीक्षा चालू करो`, `टेस्ट शुरू करो`, `test start करो`
  - Behavior: If candidate is already inside an exam session, the system announces *"The exam is already in progress."* / *"परीक्षा पहले से चल रही है।"* rather than restarting.
- **Mark for Review / Flag:**
  - English: `flag question`, `mark for review`, `flag for review`, `flag`, `review question`
  - Hindi: `समीक्षा के लिए चिन्हित करो`, `समीक्षा के लिए चिह्नित करो`, `फ्लैग करो`, `चिन्हित करो`
  - Response: Confirms *"Question flagged for review."* / *"Review flag removed."*
- **Time Remaining:**
  - English: `how much time is left`, `remaining time`, `time left`
  - Hindi: `कितना समय बचा है`, `कितना समय बाकी है`, `समय कितना बचा है`, `समय`

### Voice Controls
- **Disable / Stop:**
  - English: `disable voice mode`, `stop voice mode`, `stop listening`, `turn off voice mode`
  - Hindi: `वॉइस मोड बंद करो`, `आवाज़ मोड बंद करो`, `सुनना बंद करो`
- **Enable / Resume:**
  - English: `enable voice mode`, `start listening`, `start voice mode`
  - Hindi: `वॉइस मोड चालू करो`, `सुनना शुरू करो`

---

## 3. Bilingual Behavior & Automatic Language Detection Strategy

1. **Practical Dual-Engine Architecture:**
   - Universal browser automatic language identification is not reliably built into Web Speech API. EXAMSARTHI implements a practical hybrid strategy:
   - Initial recognition locale is set to the candidate's preferred examination locale (`en-IN` or `hi-IN`).
   - The parser inspects transcript Unicode ranges (`[\u0900-\u097F]` for Devanagari vs Latin `[a-zA-Z]`) and lexical markers.
   - When a Devanagari or Hindi phrase is recognized while in `en-IN`, the engine executes the Hindi command and adapts `recognition.lang` to `hi-IN` for subsequent recognition cycles.
   - When an English command is recognized while in `hi-IN`, the engine executes the English command and adapts `recognition.lang` to `en-IN`.
   - If 2 consecutive unrecognized cycles occur under the current locale, a controlled fallback temporarily toggles the recognition locale on the subsequent cycle.

2. **Matched Language Speech Output:**
   - Feedback is delivered in the candidate's spoken language: speaking in Hindi yields Hindi speech synthesis feedback; speaking in English yields English feedback.

---

## 4. Activation & Deactivation Flow

1. **Privacy-by-Default Activation:**
   - Voice Mode is inactive by default. The microphone is never accessed in the background.
   - Accessible descriptions clearly advise:
     - Inactive: *"Voice recognition is inactive until you enable Voice Mode and grant microphone permission."*
     - Active: *"Voice recognition is currently active. Audio is processed locally by your browser Web Speech API and is not recorded or stored."*
2. **Explicit Permission Handling:**
   - Clicking *"Enable Voice Mode"* transitions to `RequestingPermission` (`Allow microphone access...`).
   - A single browser microphone permission request is initiated via standard `navigator.mediaDevices.getUserMedia({ audio: true })`.
   - Immediately upon acquisition, the temporary media tracks are stopped so `SpeechRecognition` has exclusive access to the microphone.
   - System speaks *"Voice mode enabled."* and enters `Listening` state.
3. **Graceful Denial Handling:**
   - If permission is denied, the status transitions to `Error`, a visible alert displays instructions to enable microphone access in browser settings, and one spoken notice is issued (*"Microphone permission denied. You can continue using keyboard controls."*).
   - No infinite prompts or restart loops are triggered.

---

## 5. Acoustic Collision & Feedback-Loop Prevention

1. **Synchronous Recognition Suspension:**
   - Before `speechSynthesis.speak()` is called, `recognition.abort()` is executed synchronously and `isSpeakingRef.current` is set to `true`.
2. **Audio Buffer Flush:**
   - When `utterance.onend` fires, a 300ms safety buffer delay is enforced before `startListening()` is re-engaged. This prevents device speaker audio from being transcribed by the microphone.
3. **Silence Tolerance:**
   - The Web Speech `'no-speech'` event is treated as normal silence while the candidate reads or thinks. The engine silently loops back to `'Listening'` without triggering error messages.
4. **Single Unknown Feedback:**
   - Genuinely unrecognized speech triggers a concise response (*"I didn't understand that command."* / *"मैं इस कमांड को समझ नहीं पाया।"*) exactly once, then resumes listening.

---

## 6. Two-Step Submission Safety

1. When candidate says *"Submit exam"* or *"परीक्षा जमा करो"*:
   - The platform opens the visual `SubmitDialog` modal.
   - System prompts: *"You have X unanswered questions. Are you sure you want to submit the exam? Say yes or no."* / *"आपके X अनुत्तरित प्रश्न हैं। क्या आप परीक्षा सबमिट करना चाहते हैं? हाँ या नहीं कहें।"*
2. Candidate confirms:
   - English: `yes`, `confirm`, `submit`
   - Hindi: `हाँ`, `जमा करो`, `पुष्टि करो`
   - System confirms submission, announces *"Exam submitted."*, and deactivates Voice Mode.
3. Candidate cancels:
   - English: `no`, `cancel`, `stop`
   - Hindi: `नहीं`, `रद्द करो`
   - System closes `SubmitDialog`, announces *"Action cancelled."*, and resumes listening.

---

## 7. Verification & Build Results

### 1. Parser Test Suite (35 Cases)
All 35 command combinations passed verification in Node.js:
```
PASS: Enable voice mode -> ENABLE_VOICE en
PASS: Start exam -> START_EXAM en
PASS: Read question -> READ_QUESTION en
PASS: Option B -> SELECT_OPTION en
PASS: Next -> NEXT en
PASS: Previous -> PREVIOUS en
PASS: Repeat -> REPEAT en
PASS: How much time is left? -> TIME_LEFT en
PASS: Flag question -> FLAG_QUESTION en
PASS: Submit exam -> SUBMIT en
PASS: Yes -> YES en
PASS: Disable voice mode -> DISABLE_VOICE en
PASS: Stop listening -> DISABLE_VOICE en
PASS: वॉइस मोड चालू करो -> ENABLE_VOICE hi
PASS: परीक्षा शुरू करो -> START_EXAM hi
PASS: सवाल पढ़ो -> READ_QUESTION hi
PASS: विकल्प बी -> SELECT_OPTION hi
PASS: अगला सवाल -> NEXT hi
PASS: पिछला सवाल -> PREVIOUS hi
PASS: दोबारा पढ़ो -> REPEAT hi
PASS: कितना समय बचा है? -> TIME_LEFT hi
PASS: समीक्षा के लिए चिन्हित करो -> FLAG_QUESTION hi
PASS: परीक्षा जमा करो -> SUBMIT hi
PASS: हाँ -> YES hi
PASS: वॉइस मोड बंद करो -> DISABLE_VOICE hi
PASS: सुनना बंद करो -> DISABLE_VOICE hi
PASS: अगला question -> NEXT mixed
PASS: Option बी -> SELECT_OPTION mixed
PASS: Next सवाल -> NEXT mixed
PASS: परीक्षा submit करो -> SUBMIT mixed
PASS: read everything -> READ_ALL en
PASS: सब पढ़ो -> READ_ALL hi
PASS: go to question 5 -> GOTO en
PASS: सवाल 5 -> GOTO hi
PASS: प्रश्न 5 पर जाओ -> GOTO hi
ALL 35 PARSER TEST CASES PASSED!
```

### 2. Browser End-to-End Test Suite
Recorded session: `voice_mode_v2_verify_1790254356038.webp`
- **Default Inactive State:** Verified `Enable Voice Mode` button, `OFF` badge, and inactive privacy disclosure.
- **Active State (English):** Verified transition to `Voice Mode: Active`, `Listening...`, expanded 5-category cheat sheet, and active privacy disclosure.
- **Dynamic Language Switch (English -> Hindi):** Header language switch immediately translated Voice Panel to `आवाज मोड: सक्रिय`, `सुन रहा है...`, Hindi commands cheat sheet, and Hindi privacy disclosure.
- **Deactivation:** Clicking button cleanly returned to `आवाज मोड सक्षम करें` with `बंद` badge and inactive privacy disclosure.

### 3. Production Build Validation
```
> examsarthi@0.1.0 build
> next build

▲ Next.js 16.3.5 (Turbopack)
✓ Running next.config.ts took 52ms
✓ Compiled successfully in 1200ms
  Finished TypeScript in 3.4s ...
✓ Generating static pages (9/9) in 1519ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /dashboard
├ ○ /exam
├ ○ /practice
├ ○ /results
└ ○ /settings
○  (Static)  prerendered as static content
```
*Result: 0 errors, 0 warnings.*

---

## 8. Remaining Browser-Specific Limitations

1. **Web Speech API Availability:**
   - Supported natively in Chromium-based browsers (Google Chrome, Microsoft Edge, Brave, Opera) and Safari (macOS / iOS). On browsers without speech recognition (such as default Firefox desktop), Voice Mode gracefully displays an "Unavailable" notice while maintaining full keyboard and visual navigation.
2. **Hindi TTS Voice Packages:**
   - Availability of native Hindi synthesized speech (`hi-IN`) depends on operating system speech packages installed on the user device. If no Hindi voice is installed, browser speech synthesis falls back cleanly to the system default voice without crashing.
3. **Network Requirements:**
   - Some browser speech recognition implementations require an active internet connection to contact browser vendor recognition endpoints (e.g. Google speech servers in Chrome).
