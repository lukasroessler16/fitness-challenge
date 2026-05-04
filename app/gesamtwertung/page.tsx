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

type StartScore = {
  user_id: string
  start_points: number
}

type UserScore = {
  user_id: string
  name: string
  points: number
  startPoints: number
  dailyStepPoints: number
  weeklyMinutePoints: number
  weeklyWorkoutPoints: number
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

    addPoints(getUserId(item), pointsForRank(currentRank))
    previousValue = value
  })
}

export default function Gesamtwertung() {
  const [scores, setScores] = useState<UserScore[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function calculate() {
      setLoading(true)
      setErrorMessage("")

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("name", { ascending: true })

      const { data: entriesData, error: entriesError } = await supabase
        .from("daily_entries")
        .select("*")
        .gte("date", CHALLENGE_START_DATE)

      const { data: startScoresData, error: startScoresError } = await supabase
        .from("start_scores")
        .select("*")

      if (profilesError || entriesError || startScoresError) {
        console.log({ profilesError, entriesError, startScoresError })
        setErrorMessage("Die Gesamtwertung konnte nicht geladen werden.")
        setLoading(false)
        return
      }

      const profiles = (profilesData ?? []) as Profile[]
      const entries = (entriesData ?? []) as Entry[]
      const startScores = (startScoresData ?? []) as StartScore[]

      const scoreMap: Record<string, UserScore> = {}

      profiles.forEach((profile) => {
        scoreMap[profile.id] = {
          user_id: profile.id,
          name: profile.name,
          points: 0,
          startPoints: 0,
          dailyStepPoints: 0,
          weeklyMinutePoints: 0,
          weeklyWorkoutPoints: 0,
        }
      })

      startScores.forEach((score) => {
        if (!scoreMap[score.user_id]) return
        scoreMap[score.user_id].points += score.start_points
        scoreMap[score.user_id].startPoints = score.start_points
      })

      const days = [...new Set(entries.map((entry) => entry.date))]

      days.forEach((day) => {
        const dayEntries = entries.filter((entry) => entry.date === day)
        if (dayEntries.length === 0) return

        const maxSteps = Math.max(...dayEntries.map((entry) => entry.steps))

        dayEntries.forEach((entry) => {
          if (!scoreMap[entry.user_id]) return

          if (entry.steps === maxSteps) {
            scoreMap[entry.user_id].points += 1
            scoreMap[entry.user_id].dailyStepPoints += 1
          }
        })
      })

      const weeks = [...new Set(entries.map((entry) => getWeekKey(entry.date)))]

      weeks.forEach((week) => {
        const weekEntries = entries.filter(
          (entry) => getWeekKey(entry.date) === week
        )

        const totals: Record<
          string,
          {
            user_id: string
            minutes: number
            workouts: number
          }
        > = {}

        weekEntries.forEach((entry) => {
          if (!totals[entry.user_id]) {
            totals[entry.user_id] = {
              user_id: entry.user_id,
              minutes: 0,
              workouts: 0,
            }
          }

          totals[entry.user_id].minutes += entry.movement_minutes
          totals[entry.user_id].workouts += entry.workout_sessions
        })

        const weeklyUsers = Object.values(totals)

        applyRankingPoints(
          weeklyUsers,
          (user) => user.minutes,
          (user) => user.user_id,
          (userId, points) => {
            if (!scoreMap[userId]) return
            scoreMap[userId].points += points
            scoreMap[userId].weeklyMinutePoints += points
          }
        )

        applyRankingPoints(
          weeklyUsers,
          (user) => user.workouts,
          (user) => user.user_id,
          (userId, points) => {
            if (!scoreMap[userId]) return
            scoreMap[userId].points += points
            scoreMap[userId].weeklyWorkoutPoints += points
          }
        )
      })

      const final = Object.values(scoreMap).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        return a.name.localeCompare(b.name)
      })

      setScores(final)
      setLoading(false)
    }

    calculate()
  }, [])

  const leader = scores[0]
  const totalPoints = scores.reduce((sum, score) => sum + score.points, 0)

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <p className="text-emerald-300 text-sm uppercase tracking-widest">
              Ranking
            </p>
            <h1 className="text-4xl font-bold">Gesamtwertung</h1>
            <p className="text-slate-400 mt-2">
              Startpunkte plus neue Punkte ab {CHALLENGE_START_DATE}.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <a
              href="/dashboard"
              className="bg-white/10 border border-white/10 px-5 py-3 rounded-2xl hover:bg-white/20 transition"
            >
              Dashboard
            </a>

            <a
              href="/wochenwertung"
              className="bg-white/10 border border-white/10 px-5 py-3 rounded-2xl hover:bg-white/20 transition"
            >
              Wochenwertung
            </a>

            <a
              href="/eintragen"
              className="bg-emerald-400 text-slate-950 font-bold px-5 py-3 rounded-2xl hover:bg-emerald-300 transition"
            >
              Eintragen
            </a>
          </div>
        </div>

        {loading && (
          <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
            <p className="text-slate-300">Gesamtwertung wird geladen...</p>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4 mb-6">
            <p className="font-bold">Fehler</p>
            <p>{errorMessage}</p>
          </div>
        )}

        {!loading && !errorMessage && (
          <>
            {leader && (
              <section className="bg-emerald-400/20 border border-emerald-300/30 rounded-3xl p-6 mb-8">
                <p className="text-emerald-200 text-sm uppercase tracking-widest">
                  Aktuelle Führung
                </p>
                <h2 className="text-3xl font-bold mt-2">
                  🏆 {leader.name} führt mit {leader.points} Punkten
                </h2>
              </section>
            )}

            <section className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/10 border border-white/10 rounded-3xl p-5">
                <p className="text-slate-400">Teilnehmer</p>
                <p className="text-3xl font-bold">{scores.length}</p>
              </div>

              <div className="bg-white/10 border border-white/10 rounded-3xl p-5">
                <p className="text-slate-400">Gesamtpunkte vergeben</p>
                <p className="text-3xl font-bold">{totalPoints}</p>
              </div>

              <div className="bg-white/10 border border-white/10 rounded-3xl p-5">
                <p className="text-slate-400">Höchster Punktestand</p>
                <p className="text-3xl font-bold">
                  {leader ? leader.points : 0}
                </p>
              </div>
            </section>

            {scores.length === 0 ? (
              <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
                <p className="text-slate-400">Noch keine Benutzer vorhanden.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {scores.map((score, index) => (
                  <div
                    key={score.user_id}
                    className={`border rounded-3xl p-5 ${
                      index === 0
                        ? "bg-emerald-400/20 border-emerald-300/40"
                        : "bg-white/10 border-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-center gap-4">
                      <div>
                        <p className="text-slate-400">
                          {index === 0 ? "🏆 " : ""}Platz {index + 1}
                        </p>
                        <p className="text-2xl font-bold">{score.name}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-3xl font-bold">{score.points}</p>
                        <p className="text-slate-400">Punkte</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-4 gap-3 mt-5">
                      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                        <p className="text-slate-400">Startwert</p>
                        <p className="text-xl font-bold">
                          {score.startPoints} Pkt.
                        </p>
                      </div>

                      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                        <p className="text-slate-400">Tagessiege Schritte</p>
                        <p className="text-xl font-bold">
                          {score.dailyStepPoints} Pkt.
                        </p>
                      </div>

                      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                        <p className="text-slate-400">Minuten wöchentlich</p>
                        <p className="text-xl font-bold">
                          {score.weeklyMinutePoints} Pkt.
                        </p>
                      </div>

                      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                        <p className="text-slate-400">Sport wöchentlich</p>
                        <p className="text-xl font-bold">
                          {score.weeklyWorkoutPoints} Pkt.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}