"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function login() {
    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setMessage("Login fehlgeschlagen. Bitte prüfe E-Mail und Passwort.")
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/10 border border-white/10 rounded-3xl p-8 shadow-2xl">
        <p className="text-emerald-300 text-sm uppercase tracking-widest mb-2">
          Fitness Challenge
        </p>

        <h1 className="text-4xl font-bold mb-3">Login</h1>

        <p className="text-slate-400 mb-8">
          Melde dich an, um deine Werte einzutragen und das Ranking zu sehen.
        </p>

        <label className="block mb-2 text-slate-300">E-Mail</label>
        <input
          type="email"
          className="border border-white/10 bg-slate-900 rounded-2xl p-3 mb-4 w-full text-white outline-none focus:border-emerald-300"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="block mb-2 text-slate-300">Passwort</label>
        <input
          type="password"
          className="border border-white/10 bg-slate-900 rounded-2xl p-3 mb-6 w-full text-white outline-none focus:border-emerald-300"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") login()
          }}
        />

        <button
          onClick={login}
          disabled={loading}
          className="bg-emerald-400 text-slate-950 font-bold px-4 py-3 w-full rounded-2xl hover:bg-emerald-300 transition disabled:opacity-60"
        >
          {loading ? "Wird angemeldet..." : "Einloggen"}
        </button>

        {message && (
          <div className="mt-5 bg-red-500/20 border border-red-400/30 text-red-100 rounded-2xl p-4">
            {message}
          </div>
        )}
      </div>
    </main>
  )
}