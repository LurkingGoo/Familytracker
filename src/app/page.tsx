import { redirect } from 'next/navigation'

// The proxy handles auth-aware redirection, but provide a clean server-side
// fallback so there's no client flash or double-navigation race condition.
export default function RootPage() {
  redirect('/login')
}
