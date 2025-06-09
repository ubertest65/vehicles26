import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase-server"
import LoginForm from "@/components/login-form"

export default async function Home() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Fahrzeugzustand Tracker</h1>
          <p className="text-muted-foreground mt-2">Melden Sie sich an, um Fahrzeugzustände zu verfolgen</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
