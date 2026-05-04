"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

const CHALLENGE_START_DATE = "2026-05-04"

type Profile = {
  id: string
  name: string
}

type Entry = {
  user_id: string
  date: string
  steps: number
  movement_minutes: number
  workout_sessions: number
}

type UserStats = {
  user_id: string
  name: string
  totalSteps: number
  totalMinutes: number
  totalWorkouts: number
  entryCount: number
  averageSteps: number
  averageMinutes: number
  averageWorkouts: number
}

export default function StatistikPage() {
  const [stats, setStats] = useState<UserStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .order("name", { ascending: true })

      const { data: entriesData } = await supabase
        .from("daily_entries")
        .select("*")
        .gte("date", CHALLENGE_START_DATE)

      const profiles = (profilesData ?? []) as Profile[]
      const entries = (entriesData ?? []) as Entry[]

      const result: UserStats[] = profiles.map((profile) => {
        const userEntries = entries.filter(
          (entry) => entry.user_id === profile.id
        )

        const totalSteps = userEntries.reduce(
          (sum, entry) => sum + entry.steps,
          0
        )

        const totalMinutes = userEntries.reduce(
          (sum, entry) => sum + entry.movement_minutes,
          0
        )

        const totalWorkouts = userEntries.reduce(
          (sum, entry) => sum + entry.workout_sessions,
          0
        )

        const entryCount = userEntries.length

        return {
          user_id: profile.id,
          name: profile.name,
          totalSteps,
          totalMinutes,
          totalWorkouts,
          entryCount,
          averageSteps:
            entryCount > 0 ? Math.round(totalSteps / entryCount) : 0,
          averageMinutes:
            entryCount > 0 ? Math.round(totalMinutes / entryCount) : 0,
          averageWorkouts:
            entryCount > 0
              ? Math.round((totalWorkouts / entryCount) * 10) / 10
              : 0,
        }
      })

      result.sort((a, b) => b.totalSteps - a.totalSteps)

      setStats(result)
      setLoading(false)
    }

    load()
  }, [])

  const maxSteps = Math.max(...stats.map((user) => user.totalSteps), 1)
  const maxMinutes = Math.max(...stats.map((user) => user.totalMinutes), 1)
  const maxWorkouts = Math.max(...stats.map((user) => user.totalWorkouts), 1)

  const totalStepsAll = stats.reduce((sum, user) => sum + user.totalSteps, 0)
  const totalMinutesAll = stats.reduce((sum, user) => sum + user.totalMinutes, 0)
  const totalWorkoutsAll = stats.reduce((sum, user) => sum + user.totalWorkouts, 0)

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-24">
      <div className="max-w-5xl mx-auto p-4">
        <div className="mb-6">
          <p className="text-emerald-300 text-xs uppercase tracking-widest">
            Statistik
          </p>
          <h1 className="text-3xl font-bold">Challenge-Auswertung</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Gesamtwerte und Durchschnittswerte seit {CHALLENGE_START_DATE}.
          </p>
        </div>

        {loading ? (
          <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
            <p className="text-slate-300">Statistik wird geladen...</p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-xs text-slate-400">Schritte</p>
                <p className="text-xl font-bold">{totalStepsAll}</p>
              </div>

              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-xs text-slate-400">Minuten</p>
                <p className="text-xl font-bold">{totalMinutesAll}</p>
              </div>

              <div className="bg-white/10 rounded-2xl p-4">
                <p className="text-xs text-slate-400">Sport</p>
                <p className="text-xl font-bold">{totalWorkoutsAll}</p>
              </div>
            </section>

            <section className="space-y-4">
              {stats.map((user, index) => {
                const stepPercent = (user.totalSteps / maxSteps) * 100
                const minutePercent = (user.totalMinutes / maxMinutes) * 100
                const workoutPercent = (user.totalWorkouts / maxWorkouts) * 100

                return (
                  <div
                    key={user.user_id}
                    className={`rounded-2xl p-4 border ${
                      index === 0
                        ? "bg-emerald-400/20 border-emerald-300/30"
                        : "bg-white/10 border-white/10"
                    }`}
                  >
                    <div className="flex justify-between gap-3 mb-4">
                      <div>
                        <p className="font-bold">
                          {index === 0 ? "🏆 " : ""}#{index + 1}
                        </p>
                        <p className="text-slate-300">{user.name}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {user.entryCount}
                        </p>
                        <p className="text-xs text-slate-400">Einträge</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Schritte gesamt</span>
                          <span>{user.totalSteps}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div
                            className="bg-emerald-400 h-2 rounded-full"
                            style={{ width: `${stepPercent}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Ø {user.averageSteps} Schritte pro Eintrag
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Bewegungsminuten gesamt</span>
                          <span>{user.totalMinutes}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div
                            className="bg-white/60 h-2 rounded-full"
                            style={{ width: `${minutePercent}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Ø {user.averageMinutes} Minuten pro Eintrag
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Sporteinheiten gesamt</span>
                          <span>{user.totalWorkouts}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div
                            className="bg-white/40 h-2 rounded-full"
                            style={{ width: `${workoutPercent}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Ø {user.averageWorkouts} Einheiten pro Eintrag
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </section>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 p-3 flex justify-around">
        <a href="/dashboard" className="text-xs">
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

        <a href="/statistik" className="text-xs text-emerald-300">
          Statistik
        </a>
      </div>
    </main>
  )
}