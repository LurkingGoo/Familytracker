# Apple Monochrome & Dual Auth Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Shift the application to a premium dark-monochrome Apple aesthetic and support Email OTP and Email/Password credentials login/signup inside a Cupertino glass interface.

**Architecture:** Extend `SupabaseProvider` with client methods for OTP validation and Password credentials. Redesign the Landing page, Login page, and primary workspace/vault dashboards to use a consistent greyscale and glassmorphic system (absolute black `#000000` base, 1px neutral thin borders, glassmorphic backdrop blurs, and high-contrast solid white buttons).

**Tech Stack:** Next.js (App Router), Tailwind CSS v4, Base UI / shadcn/ui, Supabase (PostgreSQL + Auth), Serwist (PWA), framer-motion, lucide-react.

---

### Task 1: Supabase Provider Authentication Extension

**Files:**
- Modify: `src/components/providers/supabase-provider.tsx`

**Step 1: Write Provider code extensions**
Extend the provider's context type and exported functions to include OTP and Password authentication methods:
```typescript
interface SupabaseContextType {
  supabase: SupabaseClient
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithOtp: (email: string) => Promise<void>
  verifyOtp: (email: string, token: string) => Promise<void>
  signUpWithPassword: (email: string, password: string, name?: string) => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}
```
Implement `signInWithOtp`, `verifyOtp`, `signUpWithPassword`, and `signInWithPassword` in the provider body using `@supabase/supabase-js` authentication methods:
```typescript
const signInWithOtp = async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      shouldCreateUser: true,
    },
  })
  if (error) throw error
}

const verifyOtp = async (email: string, token: string) => {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })
  if (error) throw error
}

const signUpWithPassword = async (email: string, password: string, name?: string) => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split('@')[0],
      },
    },
  })
  if (error) throw error
}

const signInWithPassword = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
}
```

**Step 2: Verify compilation and types**
Run: `npm run build`
Expected: exit 0, zero compilation errors.

**Step 3: Commit**
```bash
git add src/components/providers/supabase-provider.tsx
git commit -m "feat: add Email OTP and Email/Password methods to Supabase provider"
```

---

### Task 2: Apple Monochrome Landing Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Write Apple style UI refactor**
Refactor the landing page to feature absolute black background (`bg-black`), remove cyan/violet glows, turn logo from gradient to white-border outline, and set the primary action button to high-contrast Apple style (solid white, black text):
```typescript
export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4 py-12 text-white">
      <div className="absolute top-[-20%] left-[-20%] h-[70%] w-[70%] rounded-full bg-white/[0.01] blur-[150px] pointer-events-none" />

      <div className="mx-auto max-w-[500px] w-full z-10 text-center flex flex-col items-center">
        {/* Apple Style Monochromatic Logo Outline */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="flex h-20 w-20 items-center justify-center rounded-3xl border border-neutral-800 bg-neutral-950 shadow-2xl"
        >
          <Sparkles className="h-10 w-10 text-neutral-200 animate-pulse" />
        </motion.div>

        {/* Metallic Silver Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-6 text-4xl font-black tracking-tight bg-linear-to-b from-white to-neutral-400 bg-clip-text text-transparent"
        >
          TripFinance
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-3 text-sm text-neutral-400 max-w-[340px] leading-relaxed"
        >
          Mobile-first, offline-ready budget trackers built to split family accounts while keeping personal finances strictly secure.
        </motion.p>

        {/* High-Contrast Solid White Apple Style Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-8 w-full"
        >
          <Button
            onClick={() => router.push('/login')}
            className="w-full bg-white hover:bg-neutral-200 text-black font-bold rounded-2xl py-7 shadow-2xl flex items-center justify-center gap-2 group transition-all duration-300 text-base border border-transparent"
          >
            Get Started
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

        {/* Monochrome Feature Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="grid grid-cols-3 gap-3 w-full mt-12 border-t border-neutral-900 pt-8"
        >
          <div className="flex flex-col items-center p-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-neutral-300 mb-2.5">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">RLS Security</h4>
            <p className="text-[9px] text-neutral-500 mt-1">Total data privacy protection</p>
          </div>

          <div className="flex flex-col items-center p-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-neutral-300 mb-2.5">
              <Landmark className="h-5 w-5" />
            </div>
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Tab Splitting</h4>
            <p className="text-[9px] text-neutral-500 mt-1">Simplify shared calculations</p>
          </div>

          <div className="flex flex-col items-center p-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-neutral-300 mb-2.5">
              <CreditCard className="h-5 w-5" />
            </div>
            <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Merged Cards</h4>
            <p className="text-[9px] text-neutral-500 mt-1">Presets mixed with private wallets</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
```

**Step 2: Verify static compilation**
Run: `npm run build`
Expected: compiles successfully.

**Step 3: Commit**
```bash
git add src/app/page.tsx
git commit -m "feat: refactor landing page to premium Apple monochrome styling"
```

---

### Task 3: Apple Glass login page & Dual Auth tabs

**Files:**
- Modify: `src/app/login/page.tsx`

**Step 1: Write Auth Tab Logic & UI Structure**
Refactor the login page to support the two tabs: **One-Time Code (OTP)** and **Password credentials**.
Implement the form inputs, states (sending OTP code, entering code, toggle signup/login) with clean Apple styling:
- Dark glass container: `bg-neutral-950/40 border-neutral-900 backdrop-blur-xl`
- Sleek inputs: `bg-neutral-900/50 border-neutral-800 text-white placeholder-neutral-700 focus:ring-1 focus:ring-white focus:border-white rounded-xl`
- Action Button: solid white primary buttons and subtle charcoal borders for switches.
Include error/success visual feedback and loading spinner indicators.

**Step 2: Verify build**
Run: `npm run build`
Expected: exit 0.

**Step 3: Commit**
```bash
git add src/app/login/page.tsx
git commit -m "feat: implement Apple Glass login UI with Email OTP and Password sign-in/signup"
```

---

### Task 4: Apple Monochrome App Navigation Shell

**Files:**
- Modify: `src/components/pwa-shell.tsx`

**Step 1: Refactor highlight colors**
Open `src/components/pwa-shell.tsx` and change the active navigation bottom bar indicators from `violet` to monochromatic silver/white tones:
- Indicator: `bg-white` (line 47)
- Text highlight: `text-white` (line 53)
- Icon highlight: `text-white` (line 53)

**Step 2: Verify compilation**
Run: `npm run build`
Expected: exit 0.

**Step 3: Commit**
```bash
git add src/components/pwa-shell.tsx
git commit -m "style: change app navigation shell highlights to silver-white monochrome"
```

---

### Task 5: Dashboard and Form Modals Monochrome Transition

**Files:**
- Modify: `src/app/personal/page.tsx`
- Modify: `src/app/groups/page.tsx`
- Modify: `src/app/cards/page.tsx`
- Modify: `src/components/transactions/add-transaction-dialog.tsx`
- Modify: `src/components/groups/create-group-dialog.tsx`
- Modify: `src/components/groups/join-group-dialog.tsx`
- Modify: `src/app/groups/[id]/page.tsx`

**Step 1: Remove all purple/cyan gradients & glows**
Systematically sweep the main panels, headers, dialog wrappers, buttons, input outlines, and spinners to use crisp monochromatic tokens:
- Realign colors to `neutral-800`, `neutral-900`, `neutral-950`, `white`, and grey shades.
- Spinners: swap `border-violet-500` to `border-white`.
- Primary actions: white background, black text.
- Accent items: `border-neutral-800 bg-neutral-900/60 text-neutral-300`.

**Step 2: Run all unit tests**
Run: `npx tsx --test src/lib/__tests__/balance-solver.test.ts`
Expected: 4/4 tests pass successfully.

**Step 3: Verify local Next build compiles**
Run: `npm run build`
Expected: exit 0, compiles perfectly.

**Step 4: Commit**
```bash
git add src/app/personal/page.tsx src/app/groups/page.tsx src/app/cards/page.tsx src/components/transactions/add-transaction-dialog.tsx src/components/groups/create-group-dialog.tsx src/components/groups/join-group-dialog.tsx src/app/groups/[id]/page.tsx
git commit -m "style: complete full monochrome Apple design sweep across all pages and modals"
```
