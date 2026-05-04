"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Entry = {
  id: string
  date: string
  steps: number
  movement_minutes: number
  workout_sessions: number
  user_id: string
  profiles: {
    name: string
  } | null
}

function getTodayLocalDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.push("/login")
        return
      }

      setUser(data.user)

      const today = getTodayLocalDate()

      const { data: entriesData } = await supabase
        .from("daily_entries")
        .select(`
          *,
          profiles ( name )
        `)
        .eq("date", today)
        .order("steps", { ascending: false })

      setEntries((entriesData as Entry[]) ?? [])
    }

    loadData()
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const winner = entries[0]

  if (!user) return null

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-24">
      <div className="max-w-5xl mx-auto p-4">
        
        {/* HEADER */}
        <div className="mb-6">
          <p className="text-emerald-300 text-xs uppercase tracking-widest">
            Dashboard
          </p>
          <h1 className="text-3xl font-bold">Fitness Challenge</h1>
        </div>

        {/* GEWINNER */}
        {winner && (
          <div className="bg-emerald-400/20 border border-emerald-300/30 rounded-2xl p-4 mb-6">
            <p className="text-emerald-200 text-xs uppercase">
              Heute vorne
            </p>
            <p className="text-xl font-bold">
              🏆 {winner.profiles?.name} ({winner.steps} Schritte)
            </p>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-xs text-slate-400">Einträge</p>
            <p className="text-2xl font-bold">{entries.length}</p>
          </div>

          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-xs text-slate-400">Max Schritte</p>
            <p className="text-2xl font-bold">
              {winner ? winner.steps : 0}
            </p>
          </div>
        </div>

        {/* LISTE */}
        <div className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-slate-400">
              Noch keine Einträge heute
            </p>
          ) : (
            entries.map((entry, index) => (
              <div
                key={entry.id}
                className={`p-4 rounded-2xl flex justify-between ${
                  index === 0
                    ? "bg-emerald-400/20 border border-emerald-300/30"
                    : "bg-white/10"
                }`}
              >
                <div>
                  <p className="font-bold">
                    {index === 0 ? "🏆 " : ""}#{index + 1}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {entry.profiles?.name}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold">{entry.steps}</p>
                  <p className="text-xs text-slate-400">
                    {entry.movement_minutes} min ·{" "}
                    {entry.workout_sessions}x
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MOBILE NAV */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 p-3 flex justify-around">
        <a href="/dashboard" className="text-xs text-emerald-300">
          Dashboard
        </a>

        <a href="/eintragen" className="text-xs">
          Eintragen
        </a>

        <a href="/wochenwertung" className="text-xs">
          Woche
        </a>

        <a href="/gesamtwertung" className="text-xs">
          Gesamt
        </a>

        <button onClick={logout} className="text-xs text-red-300">
          Logout
        </button>
      </div>
    </main>
  )
}