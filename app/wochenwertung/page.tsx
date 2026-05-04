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
  steps: number
  movement_minutes: number
  workout_sessions: number
  date: string
}

type UserWeek = {
  user_id: string
  name: string
  steps: number
  minutes: number
  workouts: number
  stepPoints: number
  minutePoints: number
  workoutPoints: number
  totalWeekPoints: number
}

function getWeekKey(dateString: string) {
  const date = new Date(dateString)
  const day = date.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  const monday = new Date(date)
  monday.setDate(date.getDate() + diffToMonday)

  const year = monday.getFullYear()
  const month = String(monday.getMonth() + 1).padStart(2, "0")
  const dayOfMonth = String(monday.getDate()).padStart(2, "0")

  return `${year}-${month}-${dayOfMonth}`
}

function getWeekEndDate(weekStart: string) {
  const date = new Date(weekStart)
  date.setDate(date.getDate() + 6)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function pointsForRank(rank: number) {
  if (rank === 1) return 5
  if (rank === 2) return 4
  if (rank === 3) return 3
  if (rank === 4) return 2
  return 0
}

function applyRankingPoints<T>(
  items: T[],
  getValue: (item: T) => number,
  getUserId: (item: T) => string,
  addPoints: (userId: string, points: number) => void
) {
  const sorted = [...items].sort((a, b) => getValue(b) - getValue(a))

  let currentRank = 1
  let previousValue: number | null = null

  sorted.forEach((item, index) => {
    const value = getValue(item)

    if (previousValue !== null && value < previousValue) {
      currentRank = index + 1
    }

    const points = pointsForRank(currentRank)
    addPoints(getUserId(item), points)

    previousValue = value
  })
}

export default function Wochenwertung() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [weeks, setWeeks] = useState<string[]>([])
  const [selectedWeek, setSelectedWeek] = useState("")
  const [ranking, setRanking] = useState<UserWeek[]>([])

  useEffect(() => {
    async function load() {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .order("name", { ascending: true })

      const { data: entriesData } = await supabase
        .from("daily_entries")
        .select("*")
        .gte("date", CHALLENGE_START_DATE)

      const loadedProfiles = (profilesData ?? []) as Profile[]
      const loadedEntries = (entriesData ?? []) as Entry[]

      setProfiles(loadedProfiles)
      setEntries(loadedEntries)

      const uniqueWeeks = [
        ...new Set(loadedEntries.map((entry) => getWeekKey(entry.date))),
      ].sort((a, b) => b.localeCompare(a))

      setWeeks(uniqueWeeks)

      if (uniqueWeeks.length > 0) {
        setSelectedWeek(uniqueWeeks[0])
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (!selectedWeek) {
      setRanking([])
      return
    }

    const weekEntries = entries.filter(
      (entry) => getWeekKey(entry.date) === selectedWeek
    )

    const map: Record<string, UserWeek> = {}

    profiles.forEach((profile) => {
      map[profile.id] = {
        user_id: profile.id,
        name: profile.name,
        steps: 0,
        minutes: 0,
        workouts: 0,
        stepPoints: 0,
        minutePoints: 0,
        workoutPoints: 0,
        totalWeekPoints: 0,
      }
    })

    weekEntries.forEach((entry) => {
      if (!map[entry.user_id]) {
        map[entry.user_id] = {
          user_id: entry.user_id,
          name: "Unbekannt",
          steps: 0,
          minutes: 0,
          workouts: 0,
          stepPoints: 0,
          minutePoints: 0,
          workoutPoints: 0,
          totalWeekPoints: 0,
        }
      }

      map[entry.user_id].steps += entry.steps
      map[entry.user_id].minutes += entry.movement_minutes
      map[entry.user_id].workouts += entry.workout_sessions
    })

    // Schritte: tägliche Auswertung
    // Pro Tag bekommt jede Person mit den meisten Schritten 1 Punkt.
    const days = [...new Set(weekEntries.map((entry) => entry.date))]

    days.forEach((day) => {
      const dayEntries = weekEntries.filter((entry) => entry.date === day)
      if (dayEntries.length === 0) return

      const maxSteps = Math.max(...dayEntries.map((entry) => entry.steps))

      dayEntries.forEach((entry) => {
        if (entry.steps === maxSteps) {
          map[entry.user_id].stepPoints += 1
          map[entry.user_id].totalWeekPoints += 1
        }
      })
    })

    const users = Object.values(map)

    // Bewegungsminuten: Wochenranking
    applyRankingPoints(
      users,
      (user) => user.minutes,
      (user) => user.user_id,
      (userId, points) => {
        map[userId].minutePoints = points
        map[userId].totalWeekPoints += points
      }
    )

    // Sporteinheiten: Wochenranking
    applyRankingPoints(
      users,
      (user) => user.workouts,
      (user) => user.user_id,
      (userId, points) => {
        map[userId].workoutPoints = points
        map[userId].totalWeekPoints += points
      }
    )

    const finalRanking = Object.values(map).sort((a, b) => {
      if (b.totalWeekPoints !== a.totalWeekPoints) {
        return b.totalWeekPoints - a.totalWeekPoints
      }

      if (b.stepPoints !== a.stepPoints) {
        return b.stepPoints - a.stepPoints
      }

      if (b.minutes !== a.minutes) {
        return b.minutes - a.minutes
      }

      if (b.workouts !== a.workouts) {
        return b.workouts - a.workouts
      }

      return a.name.localeCompare(b.name)
    })

    setRanking(finalRanking)
  }, [selectedWeek, entries, profiles])

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-emerald-300 text-sm uppercase tracking-widest">
            Wochenranking
          </p>
          <h1 className="text-4xl font-bold">Wochenwertung</h1>
          <p className="text-slate-400 mt-2">
            Schritte werden täglich bewertet. Bewegungsminuten und
            Sporteinheiten werden pro Woche gerankt.
          </p>
        </div>

        {weeks.length === 0 ? (
          <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
            <p className="text-slate-400">
              Noch keine Wochen-Daten vorhanden.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white/10 border border-white/10 rounded-3xl p-5 mb-6">
              <label className="block text-slate-300 mb-2">
                Woche auswählen
              </label>

              <select
                value={selectedWeek}
                onChange={(event) => setSelectedWeek(event.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-2xl p-3 text-white"
              >
                {weeks.map((week) => (
                  <option key={week} value={week}>
                    {week} bis {getWeekEndDate(week)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/10 border border-white/10 rounded-3xl p-5">
                <p className="text-slate-400">Teilnehmer</p>
                <p className="text-3xl font-bold">{ranking.length}</p>
              </div>

              <div className="bg-white/10 border border-white/10 rounded-3xl p-5">
                <p className="text-slate-400">Meiste Tagessiege Schritte</p>
                <p className="text-3xl font-bold">
                  {ranking.length > 0
                    ? Math.max(...ranking.map((user) => user.stepPoints))
                    : 0}
                </p>
              </div>

              <div className="bg-white/10 border border-white/10 rounded-3xl p-5">
                <p className="text-slate-400">Meiste Minuten</p>
                <p className="text-3xl font-bold">
                  {ranking.length > 0
                    ? Math.max(...ranking.map((user) => user.minutes))
                    : 0}
                </p>
              </div>

              <div className="bg-white/10 border border-white/10 rounded-3xl p-5">
                <p className="text-slate-400">Meiste Einheiten</p>
                <p className="text-3xl font-bold">
                  {ranking.length > 0
                    ? Math.max(...ranking.map((user) => user.workouts))
                    : 0}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {ranking.map((user, index) => (
                <div
                  key={user.user_id}
                  className={`border rounded-3xl p-5 ${
                    index === 0
                      ? "bg-emerald-400/20 border-emerald-300/40"
                      : "bg-white/10 border-white/10"
                  }`}
                >
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <p className="text-slate-400">Platz {index + 1}</p>
                      <p className="text-2xl font-bold">{user.name}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-3xl font-bold">
                        {user.totalWeekPoints}
                      </p>
                      <p className="text-slate-400">Wochenpunkte</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-3 mt-5">
                    <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                      <p className="text-slate-400">
                        Tagessiege Schritte
                      </p>
                      <p className="text-xl font-bold">
                        {user.stepPoints} Pkt.
                      </p>
                      <p className="text-slate-500 text-sm">
                        {user.steps} Schritte gesamt
                      </p>
                    </div>

                    <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                      <p className="text-slate-400">Minuten</p>
                      <p className="text-xl font-bold">{user.minutes}</p>
                    </div>

                    <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                      <p className="text-slate-400">Minuten-Punkte</p>
                      <p className="text-xl font-bold">
                        {user.minutePoints} Pkt.
                      </p>
                    </div>

                    <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                      <p className="text-slate-400">Sport-Punkte</p>
                      <p className="text-xl font-bold">
                        {user.workoutPoints} Pkt.
                      </p>
                      <p className="text-slate-500 text-sm">
                        {user.workouts} Einheiten
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-8">
          <a
            href="/dashboard"
            className="inline-block bg-emerald-400 text-slate-950 font-bold px-5 py-3 rounded-2xl hover:bg-emerald-300 transition"
          >
            Zurück zum Dashboard
          </a>
        </div>
      </div>
    </main>
  )
}