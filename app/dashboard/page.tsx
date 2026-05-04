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

type Profile = {
  id: string
  name: string
  is_admin: boolean
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
  const [isAdmin, setIsAdmin] = useState(false)
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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single()

      setIsAdmin(profileData?.is_admin ?? false)

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

        {/* LEADER */}
        {winner && (
          <div className="bg-emerald-400/20 border border-emerald-300/30 rounded-2xl p-4 mb-6">
            <p className="text-emerald-200 text-xs uppercase">
              Heute vorne
            </p>
            <p className="text-xl font-bold">
              🏆 {winner.profiles?.name}
              {winner.user_id === user.id ? " (Du)" : ""} mit{" "}
              {winner.steps} Schritten
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

        {/* ADMIN BUTTON */}
        {isAdmin && (
          <a
            href="/admin"
            className="block bg-yellow-400/20 border border-yellow-300/30 text-yellow-100 font-bold rounded-2xl p-4 mb-4 text-center"
          >
            Admin-Bereich öffnen
          </a>
        )}

        {/* STATISTIK BUTTON */}
        <a
          href="/statistik"
          className="block bg-white/10 border border-white/10 text-white font-bold rounded-2xl p-4 mb-6 text-center"
        >
          Statistik anzeigen
        </a>

        {/* PROGRESS */}
        <div className="mb-6">
          <p className="text-xs text-slate-400 mb-3">
            Fortschritt heute
          </p>

          <div className="space-y-3">
            {entries.map((entry, index) => {
              const maxSteps = entries[0]?.steps || 1
              const percent = (entry.steps / maxSteps) * 100
              const isMe = entry.user_id === user.id

              return (
                <div key={entry.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>
                      {entry.profiles?.name}
                      {isMe && (
                        <span className="ml-2 text-emerald-300 font-bold">
                          Du
                        </span>
                      )}
                    </span>
                    <span>{entry.steps}</span>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        index === 0
                          ? "bg-emerald-400"
                          : isMe
                          ? "bg-emerald-300/70"
                          : "bg-white/40"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* LISTE */}
        <div className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-slate-400">
              Noch keine Einträge heute
            </p>
          ) : (
            entries.map((entry, index) => {
              const isMe = entry.user_id === user.id

              return (
                <div
                  key={entry.id}
                  className={`p-4 rounded-2xl flex justify-between border ${
                    index === 0
                      ? "bg-emerald-400/20 border-emerald-300/30"
                      : isMe
                      ? "bg-emerald-300/10 border-emerald-300/20"
                      : "bg-white/10 border-white/10"
                  }`}
                >
                  <div>
                    <p className="font-bold">
                      {index === 0 ? "🏆 " : ""}#{index + 1}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {entry.profiles?.name}
                      {isMe && (
                        <span className="ml-2 text-emerald-300 font-bold">
                          Du
                        </span>
                      )}
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
              )
            })
          )}
        </div>
      </div>

      {/* NAV */}
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

        <a href="/statistik" className="text-xs">
          Stats
        </a>

        {isAdmin && (
          <a href="/admin" className="text-xs text-yellow-300">
            Admin
          </a>
        )}

        <button onClick={logout} className="text-xs text-red-300">
          Logout
        </button>
      </div>
    </main>
  )
}