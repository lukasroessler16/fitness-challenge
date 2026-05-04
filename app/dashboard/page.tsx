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
  const [errorMessage, setErrorMessage] = useState("")
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

      const { data: entriesData, error } = await supabase
        .from("daily_entries")
        .select(`
          *,
          profiles (
            name
          )
        `)
        .eq("date", today)
        .order("steps", { ascending: false })

      if (error) {
        console.log(error)
        setErrorMessage(error.message)
        return
      }

      setEntries((entriesData as Entry[]) ?? [])
    }

    loadData()
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const winner = entries.length > 0 ? entries[0] : null

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p>Lade...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <p className="text-emerald-300 text-sm uppercase tracking-widest">
              Dashboard
            </p>
            <h1 className="text-4xl font-bold">Fitness Challenge</h1>
            <p className="text-slate-400 mt-2">
              Angemeldet als {user.email}
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <a href="/eintragen" className="bg-emerald-400 text-slate-950 font-bold px-5 py-3 rounded-2xl hover:bg-emerald-300 transition">
              Eintragen
            </a>
            <a href="/wochenwertung" className="bg-white/10 border border-white/10 px-5 py-3 rounded-2xl hover:bg-white/20 transition">
              Wochenwertung
            </a>
            <a href="/gesamtwertung" className="bg-white/10 border border-white/10 px-5 py-3 rounded-2xl hover:bg-white/20 transition">
              Gesamtwertung
            </a>
            <button onClick={logout} className="bg-red-500/20 border border-red-400/30 text-red-200 px-5 py-3 rounded-2xl hover:bg-red-500/30 transition">
              Logout
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4 mb-6">
            <p className="font-bold">Fehler beim Laden:</p>
            <p>{errorMessage}</p>
          </div>
        )}

        {winner && (
          <section className="bg-emerald-400/20 border border-emerald-300/30 rounded-3xl p-6 mb-8">
            <p className="text-emerald-200 text-sm uppercase tracking-widest">
              Aktuelle Tagesführung
            </p>
            <h2 className="text-3xl font-bold mt-2">
              {winner.profiles?.name ?? "Unbekannt"} führt mit {winner.steps} Schritten
            </h2>
          </section>
        )}

        <section className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/10 border border-white/10 rounded-3xl p-5">
            <p className="text-slate-400">Einträge heute</p>
            <p className="text-3xl font-bold">{entries.length}</p>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-3xl p-5">
            <p className="text-slate-400">Meiste Schritte</p>
            <p className="text-3xl font-bold">
              {entries.length > 0 ? entries[0].steps : 0}
            </p>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-3xl p-5">
            <p className="text-slate-400">Gesamt Schritte heute</p>
            <p className="text-3xl font-bold">
              {entries.reduce((sum, e) => sum + e.steps, 0)}
            </p>
          </div>
        </section>

        <section className="bg-white/10 border border-white/10 rounded-3xl p-6">
          <div className="flex justify-between items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold">Heutige Einträge</h2>
            <p className="text-slate-400 text-sm">{getTodayLocalDate()}</p>
          </div>

          {entries.length === 0 ? (
            <p className="text-slate-400">
              Noch keine Einträge für heute vorhanden.
            </p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`border rounded-2xl p-4 flex justify-between items-center ${
                    index === 0
                      ? "bg-emerald-400/20 border-emerald-300/30"
                      : "bg-slate-900/80 border-white/10"
                  }`}
                >
                  <div>
                    <p className="font-bold text-lg">
                      {index === 0 ? "🏆 " : ""}Platz {index + 1}
                    </p>
                    <p className="text-slate-400">
                      {entry.profiles?.name ?? "Unbekannt"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold">{entry.steps} Schritte</p>
                    <p className="text-slate-400">
                      {entry.movement_minutes} Min ·{" "}
                      {entry.workout_sessions} Einheiten
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}