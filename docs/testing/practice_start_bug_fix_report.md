# BUG FIX: "Start Practice" Opens Next.js 404 Page

## Issue Description
Users reported that clicking the "Start Practice" button on any practice set from the Practice Page (`/practice`) resulted in navigating to a `404 Not Found` page instead of opening the practice set interface. The `href` for the "Start Practice" `<Link>` was set to `/practice/${practice.id}`, but no corresponding dynamic route existed in the App Router.

## Root Cause Analysis
- The `/practice` route maps to `src/app/practice/page.tsx`.
- The start practice link pushes to `/practice/[id]`.
- There was no `src/app/practice/[id]` folder and `page.tsx` file inside it to handle the dynamic routing.

## Implementation Fixes
1. **Created Dynamic Route**: Created `src/app/practice/[id]/page.tsx` to handle dynamic routing for practice sets.
2. **Reused Engine**: Reused the exact same exam engine (`useExamEngine`), Voice Mode (`useVoiceMode`), and Accessibility features (e.g. `LiveRegion`, keyboard navigation) as the main `/exam` page to ensure consistency and accessibility standard compliance.
3. **Dynamic Mock Data Filtering**: 
   - Uses `useParams()` from `next/navigation` to retrieve the `id` from the URL.
   - Looks up the `id` inside `PracticeSets` from `src/lib/mockData.ts`.
   - Filters the global `MockExamQuestions` by matching `subject`.
   - Passes the dynamically filtered subset of questions and duration into the `useExamEngine` instance.
4. **Safety Fallbacks**: Ensures fallback loading states are displayed while client components render, and gracefully displays "Practice Set Not Found" with a backlink if an invalid `[id]` is provided.

## Test Cases Executed & Passed
1. **Route Resolution Test**: Navigating directly to `/practice/p1`, `/practice/p2`, `/practice/p3`, and `/practice/p4` successfully resolves to a 200 HTTP response.
2. **Component Integration Test**: The Practice Exam Page correctly loads the specific title (e.g. "Logical Reasoning & Coding") and specific subject context for that exam set, matching the mock data.
3. **Accessibility Persistence Test**: Verified VoiceFeedback and VoiceCommands are imported correctly and bound. `VoiceExamPanel` displays as usual.
4. **Completion Flow Test**: Triggering `submitExam` directs to the `/results` page exactly as the main Exam engine does.

## Future Considerations
If the application is refactored away from mock data to real API endpoints, this page component can easily swap `MockExamQuestions.filter` for an asynchronous `fetchPracticeQuestions(practiceId)` call inside a `useEffect`.
