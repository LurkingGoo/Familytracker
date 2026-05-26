# TripFinance Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build a mobile-first, offline-ready web application for tracking personal and group/family finances with Google Auth, card autonomy, and dynamic, database-backed debt splitting.

**Architecture:** Flat group-member and trip schema, denormalized card names in transactions to prevent RLS read leaks, normalized splitting via `transaction_splits` for speedy Postgres-level balance calculations, and TanStack query for offline caching and optimistic UI sync.

**Tech Stack:** Next.js App Router (TypeScript), Tailwind CSS, Supabase (JS Client + Auth + PostgreSQL), shadcn/ui, TanStack Query, Framer Motion.

---

### Task 1: Next.js and Tailwind CSS Project Scaffolding

**Files:**
- Create: Next.js project files in root directory
- Modify: `src/app/globals.css` (safe-area spacing configuration)

**Step 1: Scaffold Next.js Application**
Run Next.js scaffolding in non-interactive mode.
Run: `npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`
Expected: Next.js files populated in the root directory.

**Step 2: Install UI dependencies**
Run: `npm install lucide-react framer-motion @tanstack/react-query @tanstack/react-query-persist-client @supabase/supabase-js @supabase/ssr canvas-confetti @types/canvas-confetti @serwist/next`
Expected: Packages installed successfully.

**Step 3: Modify global styles for Mobile PWA Safe Areas**
Modify: `src/app/globals.css` to add safe area utilities for native mobile home-screen notch compatibility.
```css
@layer utilities {
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 16px);
  }
  .pt-safe {
    padding-top: env(safe-area-inset-top, 16px);
  }
  .min-h-screen-safe {
    min-height: calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  }
}
```

**Step 4: Verify scaffolding builds**
Run: `npm run build`
Expected: Build passes with zero errors.

**Step 5: Commit scaffolding**
```bash
git add .
git commit -m "chore: scaffold Next.js app with Tailwind, safe areas, and basic dependencies"
```

---

### Task 2: Supabase Database Schema & RLS Policies Setup

**Files:**
- Create: `supabase/migrations/20260526000000_init_schema.sql`

**Step 1: Write database schema SQL**
Create `supabase/migrations/20260526000000_init_schema.sql` containing:
- Profiles table, groups table, group_members table, cards table, transactions table, and transaction_splits table.
- Automatic profile trigger on user sign-up in auth schema.
- RLS configurations and policies matching our approved privacy boundaries.
- Database RPC functions for joining a group via invite code.

**Step 2: Verify SQL locally or via manual database check**
Review RLS policy triggers to ensure no circular dependency exists (e.g. RLS on group_members referencing group_members).
*Action:* We will execute this script in the Supabase Dashboard SQL Editor or via Supabase CLI.

**Step 3: Commit migration script**
```bash
git add supabase/migrations/20260526000000_init_schema.sql
git commit -m "db: add tables, RLS policies, join_code function, and profiles trigger"
```

---

### Task 3: shadcn/ui Initialization & Core Components

**Files:**
- Create: `components.json`
- Modify: `src/lib/utils.ts`

**Step 1: Initialize shadcn/ui**
Run: `npx -y shadcn@latest init -d --yes`
Expected: UI configuration files, styles, and utils created.

**Step 2: Add essential components**
Run: `npx -y shadcn@latest add button card dialog dropdown-menu input label tabs toast badge select --yes`
Expected: Component files created in `src/components/ui/`.

**Step 3: Verify build**
Run: `npm run build`
Expected: Build passes with shadcn utilities included.

**Step 4: Commit UI components**
```bash
git add components.json src/components/ui/ src/lib/utils.ts
git commit -m "chore: initialize shadcn/ui and add core component blocks"
```

---

### Task 4: Supabase Client, Auth Provider & Profile Middleware

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/components/providers/supabase-provider.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/middleware.ts`

**Step 1: Configure Supabase Client utility**
Write client setup that handles normal token authentication.
File: `src/lib/supabase.ts`

**Step 2: Create Supabase Auth context provider**
File: `src/components/providers/supabase-provider.tsx` wrapping the application in a React Auth Context, supplying loading state, profile state, and login routines.

**Step 3: Create Login screen**
Create native-looking dark login page matching premium design system, featuring prominent Google login.
File: `src/app/login/page.tsx`

**Step 4: Verify authentication routing**
Verify compile completes.
Run: `npm run build`
Expected: Success.

**Step 5: Commit auth layer**
```bash
git add src/lib/supabase.ts src/components/providers/supabase-provider.tsx src/app/login/page.tsx src/middleware.ts
git commit -m "feat: implement supabase clients, auth context provider, and premium login screen"
```

---

### Task 5: Group Workspaces Management (Create & Join)

**Files:**
- Create: `src/app/groups/page.tsx`
- Create: `src/components/groups/create-group-dialog.tsx`
- Create: `src/components/groups/join-group-dialog.tsx`

**Step 1: Create UI to display active groups**
Show clean, mobile-first cards for each group workspace of which the user is a member, complete with custom glassmorphism styling and quick-action buttons.

**Step 2: Create Group creation modal**
Includes validation for group title, and allows the creator to input "Preset Cards" (e.g. `'Amex Gold'`, `'Chase Sapphire'`) stored as an array of texts in `preset_card_names`.
File: `src/components/groups/create-group-dialog.tsx`

**Step 3: Join Group modal**
Allows entering an alphanumeric code (`join_code`) to join a group via database function trigger.
File: `src/components/groups/join-group-dialog.tsx`

**Step 4: Verify build**
Run: `npm run build`
Expected: Success.

**Step 5: Commit group management**
```bash
git add src/app/groups/ src/components/groups/
git commit -m "feat: add group workspaces view, create workspace with presets, and join via code"
```

---

### Task 6: Cards Management & Card Selection Merging

**Files:**
- Create: `src/app/cards/page.tsx`
- Create: `src/hooks/use-merged-cards.ts`

**Step 1: Private Card registration interface**
Build a dashboard tab letting users register custom, private cards (e.g., "Target RedCard"). RLS ensures these cards are only visible to the logged-in user.
File: `src/app/cards/page.tsx`

**Step 2: Write custom Hook to merge card dropdowns**
A custom hook that queries:
- The private cards table (`cards` where `user_id = current_user_id`).
- The current active group workspace (`groups` table `preset_card_names` array).
Returns a merged array: `Merged Cards = Presets + Private`.
File: `src/hooks/use-merged-cards.ts`

**Step 3: Verify compile**
Run: `npm run build`
Expected: Compile completes successfully.

**Step 4: Commit card features**
```bash
git add src/app/cards/page.tsx src/hooks/use-merged-cards.ts
git commit -m "feat: add private card management and hook for merged card selector"
```

---

### Task 7: Transaction Entry and Split Distribution

**Files:**
- Create: `src/components/transactions/add-transaction-dialog.tsx`
- Create: `src/hooks/use-transactions.ts`

**Step 1: Create transaction form dialog**
Dialog with form validation to input `amount`, `description`, choose `payer_id` (defaults to current user), select a card from our merged card list (copies selected card's name as denormalized `card_name` inside transaction row), and choose a division logic:
- Equal split (divides transaction total evenly among members).
- Exact share values.
Populates corresponding entries in both `transactions` and `transaction_splits`.
*Client-Side UUID generation:* The `use-transactions.ts` hook MUST generate UUIDs using `crypto.randomUUID()` on the client-side for new transactions and `transaction_splits` before executing the mutation. This ensures that the offline optimistic UI cache resolves correctly without relying on Postgres-generated IDs.

**Step 2: Add validation triggers**
Verify that the sum of dynamic splits equals the transaction amount before submitting.

**Step 3: Compile check**
Run: `npm run build`
Expected: Success.

**Step 4: Commit transaction ledger**
```bash
git add src/components/transactions/ src/hooks/use-transactions.ts
git commit -m "feat: add transaction creation dialog with dynamic splits and validation"
```

---

### Task 8: Personal Expenses Dashboard (Private Ledger)

**Files:**
- Create: `src/app/personal/page.tsx`
- Create: `src/components/personal/personal-summary-cards.tsx`

**Step 1: Build personal ledger view**
Query transactions where `group_id IS NULL` and `payer_id = auth.uid()`. Render transactions list in premium dashboard using dark glass cards, categorized by month.

**Step 2: personal metrics cards**
Displays summary widgets of personal monthly spending, top card utilized, and recent items.
File: `src/components/personal/personal-summary-cards.tsx`

**Step 3: Verify build**
Run: `npm run build`
Expected: Successful static export compile.

**Step 4: Commit personal space**
```bash
git add src/app/personal/ src/components/personal/
git commit -m "feat: add personal dashboard for private transaction ledger"
```

---

### Task 9: Shared Workspace Dashboard, Metrics & Debt Settlement

**Files:**
- Create: `src/app/groups/[id]/page.tsx`
- Create: `src/components/groups/settle-debts-dialog.tsx`

**Step 1: Design shared workspace page**
A feature-rich group dashboard with:
- Group total spending and breakdown by user.
- Transaction history for the group.
- Member filters to see specific member expenses.
- **The Balance Breakdown:** Calculates who owes who in real time using high-performance SQL summation queries on the normalized `transaction_splits` table.

**Step 2: Add Debt Settlement system**
A modal listing unsettled debts (e.g. "Dad owes Mom $50"). Clicking "Settle" performs a transaction injection marking splits as `is_settled = true`.
File: `src/components/groups/settle-debts-dialog.tsx`

**Step 3: Compile verification**
Run: `npm run build`
Expected: Success.

**Step 4: Commit group portal**
```bash
git add src/app/groups/\[id\]/ src/components/groups/settle-debts-dialog.tsx
git commit -m "feat: implement shared group dashboard, balances, and debt settlement"
```

---

### Task 10: PWA Shell, Safe Areas & Offline-Ready Query Persister

**Files:**
- Create: `src/app/layout.tsx` (PWA and manifest inclusion, Mobile shell navigation bar)
- Create: `public/manifest.json`
- Create: `src/components/providers/query-provider.tsx`

**Step 1: Setup PWA Manifest**
Create `public/manifest.json` with app details, standalone display configuration, icons, theme colors matching premium dark scheme.

**Step 2: Configure TanStack Query Persister & Sync Manager & Serwist Service Worker**
- Create `src/components/providers/query-provider.tsx` implementing local storage query persistence. Persist state locally so that when offline, data loads immediately. Implement window listener for online connection states to drain offline mutation queue.
- Configure `next.config.mjs` using `@serwist/next` to auto-generate a Service Worker that caches the application shell (HTML/JS/CSS).

**Step 3: Finish Mobile Native Navigation Shell**
Bottom navigation tabs (`Personal`, `Groups`, `Cards`) styled with absolute safe-areas for home indicator notches on modern smartphones.
File: `src/app/layout.tsx`

**Step 4: Final verification command**
Run: `npm run build`
Expected: Full project builds with zero TS or React warnings.

**Step 5: Commit shell**
```bash
git add src/app/layout.tsx public/manifest.json src/components/providers/query-provider.tsx
git commit -m "feat: complete native PWA shell, mobile tabs layout, and offline storage persister"
```
