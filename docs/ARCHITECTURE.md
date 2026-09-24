# ExamSaarthi Architecture

## Core Principles
1. **AI Enhances, Never Gates**: AI features (like Vision descriptions or Socratic hints) always have deterministic fallbacks. Exams can be completed fully offline.
2. **Screen-Reader First**: Fully accessible semantic HTML, explicit screen-reader harmony mode (disabling internal TTS), and extensive keyboard support.
3. **Server-Authoritative**: The client cannot be trusted with correct answers or the timer.
4. **Abstracted Providers**: Every external service (DB, AI, Speech) is behind an interface for easy swapping.

## System Flow Diagram

```mermaid
graph TD
    %% Client Tier
    subgraph Client [Browser Client (Next.js App Router)]
        UI[shadcn/ui + Tailwind + Base UI]
        State[Zustand Local State]
        Voice[Web Speech API / Push-to-Talk]
        Offline[Service Worker + IndexedDB]
        
        UI <--> State
        UI <--> Voice
        State <--> Offline
    end

    %% API Tier (Serverless / Server Actions)
    subgraph API [Next.js API Routes & Server Actions]
        AuthModule[Auth Module]
        ExamModule[Exam Engine Module]
        AuditModule[Audit Log Module]
        AIGateway[AI Gateway]
        
        AuthModule --> |JWT/Session| ExamModule
        ExamModule --> AuditModule
    end

    %% Data & External Tier
    subgraph Data [Data & AI Layer]
        Supabase[(Supabase Postgres)]
        Upstash[(Upstash Redis / Fallback)]
        Gemini[Gemini API]
        ExternalTTS[External TTS/STT]
    end

    %% Connections
    Client <-->|REST / Server Actions| API
    
    AuthModule <--> Supabase
    ExamModule <--> Supabase
    ExamModule <--> Upstash
    AuditModule <--> Supabase
    
    AIGateway <--> Gemini
    AIGateway <--> ExternalTTS
    ExamModule <--> AIGateway
```

## Module Responsibilities
- **Exam Engine (`/api/exam`)**: Handles secure delivery of questions, single active session locking, server-side timer, and processing submissions.
- **AI Gateway (`/api/ai`)**: Implements interfaces `VisionDescriber`, `Assistant`, `STT`, and `TTS`. Abstracts Gemini (or other providers).
- **Auth Module (`/api/auth`)**: JWT generation, RBAC (Candidate vs. Setter/Admin).
- **Audit Module (`/api/audit`)**: Hash-chained, tamper-evident logging of all events (focus changes, pastes, answer selections).
