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

type WeeklyTotal = {
  user_id: string
  minutes: number
  workouts: number
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

  useEffect(() => {
    async function calculate() {
      setLoading(true)

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")

      const { data: entriesData } = await supabase
        .from("daily_entries")
        .select("*")
        .gte("date", CHALLENGE_START_DATE)

      const { data: startScoresData } = await supabase
        .from("start_scores")
        .select("*")

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

        const totals: Record<string, WeeklyTotal> = {}

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

        const users: WeeklyTotal[] = Object.values(totals)

        applyRankingPoints(
          users,
          (user) => user.minutes,
          (user) => user.user_id,
          (userId, points) => {
            if (!scoreMap[userId]) return

            scoreMap[userId].points += points
            scoreMap[userId].weeklyMinutePoints += points
          }
        )

        applyRankingPoints(
          users,
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

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-24">
      <div className="max-w-5xl mx-auto p-4">
        <div className="mb-6">
          <p className="text-emerald-300 text-xs uppercase">
            Gesamtwertung
          </p>
          <h1 className="text-3xl font-bold">Ranking</h1>
        </div>

        {leader && (
          <div className="bg-emerald-400/20 border border-emerald-300/30 rounded-2xl p-4 mb-6">
            <p className="text-xs text-emerald-200">
              Aktuell vorne
            </p>
            <p className="text-xl font-bold">
              🏆 {leader.name} ({leader.points} Punkte)
            </p>
          </div>
        )}

        {loading ? (
          <p className="text-slate-400">Lade...</p>
        ) : (
          <div className="space-y-3">
            {scores.map((user, index) => (
              <div
                key={user.user_id}
                className={`p-4 rounded-2xl ${
                  index === 0
                    ? "bg-emerald-400/20 border border-emerald-300/30"
                    : "bg-white/10"
                }`}
              >
                <div className="flex justify-between mb-3">
                  <div>
                    <p className="font-bold">
                      {index === 0 ? "🏆 " : ""}#{index + 1}
                    </p>
                    <p className="text-slate-300">{user.name}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold">{user.points}</p>
                    <p className="text-xs text-slate-400">Punkte</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900 rounded-xl p-2">
                    Start: {user.startPoints}
                  </div>

                  <div className="bg-slate-900 rounded-xl p-2">
                    Schritte: {user.dailyStepPoints}
                  </div>

                  <div className="bg-slate-900 rounded-xl p-2">
                    Minuten: {user.weeklyMinutePoints}
                  </div>

                  <div className="bg-slate-900 rounded-xl p-2">
                    Sport: {user.weeklyWorkoutPoints}
                  </div>
                </div>
              </div>
            ))}
          </div>
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

        <a href="/gesamtwertung" className="text-xs text-emerald-300">
          Gesamt
        </a>
      </div>
    </main>
  )
}