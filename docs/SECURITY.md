# ExamSaarthi Security & Threat Model

This document outlines the security architecture and threat model for the ExamSaarthi platform. 

## 1. Authentication & Identity
- **Primary Auth Flow**: WebAuthn (Passkeys) via Supabase Auth.
- **Benefits**: Eradicates phishing and credential-stuffing attacks. Passkeys are discoverable and bound to the user's hardware.
- **Fallback**: Email Magic Links / OTP. Passwords have been completely removed from the primary signup/login flows to reduce friction for visually impaired users and eliminate weak credential risks.
- **Multi-factor / Liveness**: Voice enrollment is used as a secondary identity verification hook, creating a unique voiceprint hash (audio is not stored in plaintext). 

## 2. Authorization (Row Level Security - RLS)
- **Supabase RLS Policies**: Database access is strictly controlled at the Postgres row level.
  - Candidates can only SELECT/UPDATE their own active `exam_sessions`.
  - Candidates can only INSERT/UPDATE `answers` and `audit_logs` where the `session_id` belongs to them.
  - Correct answers are physically inaccessible to candidates via standard select policies. The actual verification happens server-side.

## 3. Exam Integrity & Anti-Cheating
- **Tamper-Evident Audit Logs**: Exam events (focus_lost, paste, timer_paused, answer_changed) are logged into the `audit_logs` table. Each entry includes a `previous_hash` (forming a lightweight blockchain) to prevent truncation or silent modification of the event stream.
- **Server-Authoritative Timer**: The time remaining is tracked on the server (`time_remaining_seconds`). Client-side timer manipulation will not extend the actual allowed exam duration.

## 4. Rate Limiting & Abuse Prevention
- **Upstash Redis**: Rate limiting is handled via Upstash Redis rather than CAPTCHAs. Traditional visual CAPTCHAs are inherently inaccessible. Audio CAPTCHAs are often tedious or ineffective. Rate limiting via IP/User-Agent and Session velocity checks provides a better UX.

## 5. Defense in Depth (Headers & Application Security)
- **Content Security Policy (CSP)**: `next.config.ts` enforces strict CSP headers, `X-Frame-Options` (DENY), and `Permissions-Policy`.
- **Microphone Access**: Explicitly constrained via `Permissions-Policy` to the originating domain (`self`).
