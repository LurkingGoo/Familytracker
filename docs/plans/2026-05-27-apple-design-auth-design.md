# Design Document: Apple Monochrome Styling & Dual Email/Password Auth

This document outlines the architectural specifications to shift TripFinance from a colorful glowing layout to a premium Apple dark-monochrome aesthetic, while replacing the unsupported Google OAuth method with robust Email OTP (One-Time Password) and Email/Password credential authentication.

---

## 1. Aesthetic System Shift (Apple Dark Glassmorphism)

We are eliminating all vibrant gradients (`violet`, `cyan`, etc.) and background glowing ambient circles in favor of a sleek, high-fidelity monochromatic system.

### Color Tokens & Utilities

| Aspect | Old Colorful Token | New Apple Monochrome Token |
| --- | --- | --- |
| **Canvas Background** | `bg-radial from-slate-900 via-slate-950 to-black` | `bg-black` (Pure absolute black `#000000`) |
| **Background Glows** | Low-opacity violet/cyan ambient circles | Removed entirely (or ultra-subtle, very large `bg-white/[0.01]` blur) |
| **Card Borders** | `border-slate-800/80` | `border-neutral-900` or `border-neutral-800/60` (Ultra-thin, sharp) |
| **Card Fill** | `bg-slate-950/40 backdrop-blur-xl` | `bg-neutral-950/40 backdrop-blur-2xl` (Cupertino glass effect) |
| **Brand Headers** | `bg-linear-to-r from-white via-slate-200 to-slate-400` | `bg-linear-to-b from-white to-neutral-400` (Metallic silver gradient) |
| **Primary CTA Button** | `bg-linear-to-r from-violet-600 to-cyan-500 text-white` | `bg-white text-black hover:bg-neutral-200` (High contrast solid) |
| **Secondary Button** | `border-slate-800 bg-slate-900/60` | `border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900` |
| **Focus Rings** | `focus:ring-violet-500` | `focus:ring-neutral-700` or `focus:border-neutral-700` |
| **Highlights/Badges** | `text-violet-400` / `bg-violet-600/10` | `text-neutral-200` / `bg-neutral-900 border border-neutral-800` |

---

## 2. Authentication Flow Upgrades (Supabase Auth)

Google OAuth is replaced by a dual-tab authentication card that integrates cleanly with default Supabase configurations:

### A. One-Time Passcode (Email OTP / Magic Link)
- **Flow:** User enters their email address. A 6-digit OTP code is sent to their inbox. The PWA transitions to a code entry screen. Upon submitting, Supabase verifies the token and signs the user in securely.
- **Methods:**
  - `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })`
  - `supabase.auth.verifyOtp({ email, token, type: 'email' })`

### B. Email & Password Credentials (Signup/Login)
- **Flow:** Users can switch to the "Password" tab to log in with an existing password, or click a "Create Account" toggle to sign up with Email, Password, and full Name.
- **Methods:**
  - `supabase.auth.signInWithPassword({ email, password })`
  - `supabase.auth.signUp({ email, password, options: { data: { name } } })`

---

## 3. Component Transformations

1. **`src/app/page.tsx` (Landing page):** Remove blue/purple background blur. Swap colored glows for absolute dark canvases. Change glowing logo to an ultra-thin silver circular outline containing a minimalist Sparkles/Card icon. Turn CTA buttons to pure solid white.
2. **`src/app/login/page.tsx` (Login page):** Implement the dual-mode tab controller (Email OTP vs Password). Standardize input labels, placeholder states (`placeholder-neutral-700`), and form validation.
3. **`src/components/pwa-shell.tsx` (App Shell Navigation):** Change the active tab indicator from a violet bar and text to a pure white bar and text with neutral gray inactive states.
4. **Dashboard pages & modals (`/personal`, `/groups`, `/cards`):** Replace colored header badges, glowing progress bars, and colored border accents with clean, high-contrast monochrome styles.

---

## 4. Verification & Integrity Plan

- **Compilation Checks:** Run local TypeScript and build checks (`npm run build`).
- **Authentication Handshake:** Verify signup, login, password checks, and OTP requests.
- **RLS Continuity:** Confirm that users signed in via OTP or credentials can read/write data according to security boundary rules.
