# Design Document: Vercel Stability, Proxy Migration & Swipeable Glass Card Wallet Redesign

**Date:** 2026-05-27  
**Status:** Approved  
**Topic:** Resolving Vercel deployment blockers via Next.js 16 Proxy migration, eliminating the landing page redirect lag, and redesigning the card ledger with a premium swipeable glass card wallet interface.

---

## 1. Vercel Stability & Next.js 16 Proxy Migration
In Next.js 16, the `middleware.ts` file convention is fully deprecated. It is replaced by the `proxy.ts` convention, which exports a named function `proxy(request: NextRequest)`. Deploying to Vercel with a deprecated middleware convention or with invalid CLI options (like `--webpack` in build pipelines that don't need it) results in compilation and packaging failures.

### Action Plan
*   **Remove Deprecations:** Rename `src/middleware.ts` to `src/proxy.ts`.
*   **Export Named proxy:** Define and export the `proxy(request: NextRequest)` function.
*   **Remove Webpack Flag:** Simplify `package.json` build script to `"build": "next build"`, utilizing Next.js 16's optimized build pipeline.

---

## 2. Landing Page Elimination & Routing Upgrades
The colorful/monochrome hybrid landing page at `/` is eliminated to streamline entry. Users should immediately land on the authentication tab.

### Redirection Rules (implemented at Edge via `src/proxy.ts`):
*   **Unauthenticated users:**
    *   Visiting `/` or `/login` -> Redirect to `/login`
    *   Visiting protected pages (`/personal`, `/groups`, `/cards`) -> Redirect to `/login`
*   **Authenticated users:**
    *   Visiting `/` or `/login` -> Redirect to `/personal` (their vault workspace dashboard)

---

## 3. Premium Swipeable Glass Card Wallet Redesign
The static list under `/cards` will be replaced with a premium, swipeable glass card wallet UI, simulating a high-end physical/digital card holder.

### Card Aesthetics:
*   **Glassmorphic Container:** Tailored HSL dark canvas (`bg-neutral-950/40 backdrop-blur-2xl border border-neutral-800/80`).
*   **Card Shimmer:** An oblique linear highlight (`bg-gradient-to-tr from-white/[0.06] to-transparent`) overlay.
*   **Monochromatic Card Templates:**
    *   *Credit Cards:* Absolute black canvas, silver border, minimalist metallic emblem.
    *   *Cash/Checking:* Translucent charcoal gray, dark gray accents, silver wallet chip outline.
*   **Interactive Swipe Layer:** Responsive touch and drag mechanics using `framer-motion`'s `drag="x"` to transition between registered cards with spring physics.

---

## 4. Backend Integrity & Coherency Check
We will review and verify that the backend's PostgreSQL database schema, row-level security (RLS) policies, and database triggers are fully consistent with the frontend authentication and sync behaviors.

### Verification Matrix:
*   Verify that RLS rules on `cards`, `transactions`, and `transaction_splits` allow read/write access for email/password and OTP verified users.
*   Confirm that client-side UUID generation accurately propagates split records locally during offline operations.
