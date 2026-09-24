# ExamSaarthi Demo Script

**Theme:** "Your voice. Your exam. Your independence."
**Target Audience:** Hackathon Judges (SISTec Innovation Hackathon 2026, Problem DT-13)

## Preparation (2 mins)
1. Open `examsarthi.vercel.app`.
2. Turn on your system's screen reader (NVDA or VoiceOver).
3. Connect a microphone.

## Act 1: The Problem & The Welcome (1 min)
* "Traditional testing platforms rely heavily on sight and mouse navigation. Visually impaired students need a scribe, losing their independence and privacy."
* Press `Tab` to hear the "Skip to main content" link (demonstrates immediate WCAG compliance).
* Land on the dashboard. Demonstrate the high-contrast UI and the clean, distraction-free layout.

## Act 2: Voice-First Navigation & Settings (2 mins)
* Navigate to **Settings**.
* Show the Accessibility toggles: Screen-Reader Harmony (which disables internal TTS when NVDA is detected), High Contrast, and Voice Speed.
* Highlight that settings are automatically persisted.

## Act 3: The Exam Experience (3 mins)
* Go to the **Practice** section and launch the "General Knowledge & Aptitude" exam.
* **Demonstrate TTS:** Click the "Read Question" button. Listen to how it reads out the text.
* **Demonstrate Math Parsing:** Skip to Question 8 (the math question). Listen as the system reads `\frac{1}{2}` naturally as "fraction 1 over 2".
* **Demonstrate Voice Control:** 
  * Click the Microphone icon (or press Spacebar).
  * Say: *"Read options"* -> System reads options.
  * Say: *"Option B"* -> System selects Option B.
  * Say: *"Next question"* -> System navigates to the next question.
* Explain the **Socratic Hints AI**: Purposely select a wrong answer in Practice mode. Click "Get Hint" and show the Gemini-powered response guiding the user without giving away the answer.

## Act 4: Analytics & Sonification (2 mins)
* Submit the exam and return to the **Dashboard**.
* Navigate to the **Learning Trend & Subject Mastery** section.
* Explain that visual charts are useless to our target users.
* Click **"Listen to Trend"**. Hear the Web Audio API play a sequence of tones representing the accuracy trend over time.
* Click **"Spoken Summary"** to hear the TTS summarize the overall performance.

## Act 5: Conclusion (1 min)
* "ExamSaarthi brings dignity, privacy, and absolute independence to visually impaired candidates. From math parsing to audio sonification and AI hints, we have built a platform that isn't just compliant—it's empowering."
* "Thank you."
