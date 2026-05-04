"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

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
  const [currentUserId, setCurrentUserId] = useState("")
  const [scores, setScores] = useState<UserScore[]>([])
  const [startDate, setStartDate] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function calculate() {
      setLoading(true)

      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) setCurrentUserId(userData.user.id)

      // 🔥 STARTDATUM LADEN
      const { data: settings } = await supabase
        .from("challenge_settings")
        .select("*")
        .eq("id", 1)
        .single()

      const challengeStart = settings?.challenge_start_date
      setStartDate(challengeStart)

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")

      const { data: entriesData } = await supabase
        .from("daily_entries")
        .select("*")
        .gte("date", challengeStart)

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

      const days = [...new Set(entries.map((e) => e.date))]

      days.forEach((day) => {
        const dayEntries = entries.filter((e) => e.date === day)
        if (dayEntries.length === 0) return

        const maxSteps = Math.max(...dayEntries.map((e) => e.steps))

        dayEntries.forEach((e) => {
          if (e.steps === maxSteps) {
            scoreMap[e.user_id].points += 1
            scoreMap[e.user_id].dailyStepPoints += 1
          }
        })
      })

      const weeks = [...new Set(entries.map((e) => getWeekKey(e.date)))]

      weeks.forEach((week) => {
        const weekEntries = entries.filter(
          (e) => getWeekKey(e.date) === week
        )

        const totals: Record<string, WeeklyTotal> = {}

        weekEntries.forEach((e) => {
          if (!totals[e.user_id]) {
            totals[e.user_id] = {
              user_id: e.user_id,
              minutes: 0,
              workouts: 0,
            }
          }

          totals[e.user_id].minutes += e.movement_minutes
          totals[e.user_id].workouts += e.workout_sessions
        })

        const users = Object.values(totals)

        applyRankingPoints(
          users,
          (u) => u.minutes,
          (u) => u.user_id,
          (id, pts) => {
            scoreMap[id].points += pts
            scoreMap[id].weeklyMinutePoints += pts
          }
        )

        applyRankingPoints(
          users,
          (u) => u.workouts,
          (u) => u.user_id,
          (id, pts) => {
            scoreMap[id].points += pts
            scoreMap[id].weeklyWorkoutPoints += pts
          }
        )
      })

      const final = Object.values(scoreMap).sort(
        (a, b) => b.points - a.points
      )

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
          {startDate && (
            <p className="text-xs text-slate-400 mt-2">
              zählt ab {startDate}
            </p>
          )}
        </div>

        {leader && (
          <div className="bg-emerald-400/20 border border-emerald-300/30 rounded-2xl p-4 mb-6">
            🏆 {leader.name}
            {leader.user_id === currentUserId ? " (Du)" : ""} –{" "}
            {leader.points} Punkte
          </div>
        )}

        {loading ? (
          <p className="text-slate-400">Lade...</p>
        ) : (
          <div className="space-y-3">
            {scores.map((user, index) => {
              const isMe = user.user_id === currentUserId

              return (
                <div
                  key={user.user_id}
                  className={`p-4 rounded-2xl border ${
                    index === 0
                      ? "bg-emerald-400/20 border-emerald-300/30"
                      : isMe
                      ? "bg-emerald-300/10 border-emerald-300/20"
                      : "bg-white/10 border-white/10"
                  }`}
                >
                  <div className="flex justify-between">
                    <div>
                      #{index + 1} {user.name}
                      {isMe && (
                        <span className="ml-2 text-emerald-300">
                          Du
                        </span>
                      )}
                    </div>
                    <div className="font-bold">{user.points}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}