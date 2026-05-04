"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

type Entry = {
  id: string
  steps: number
  movement_minutes: number
  workout_sessions: number
  date: string
}

function getTodayLocalDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function Eintragen() {
  const [user, setUser] = useState<any>(null)
  const [date, setDate] = useState(getTodayLocalDate())
  const [steps, setSteps] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [workouts, setWorkouts] = useState(0)
  const [existingEntry, setExistingEntry] = useState<Entry | null>(null)
  const [message, setMessage] = useState("")
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login")
      } else {
        setUser(data.user)
      }
    })
  }, [router])

  useEffect(() => {
    async function loadExistingEntry() {
      if (!user || !date) return

      setMessage("")

      const { data, error } = await supabase
        .from("daily_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .maybeSingle()

      if (error) {
        console.log(error)
        setMessage("Fehler beim Laden des Eintrags.")
        return
      }

      if (data) {
        const entry = data as Entry
        setExistingEntry(entry)
        setSteps(entry.steps)
        setMinutes(entry.movement_minutes)
        setWorkouts(entry.workout_sessions)
      } else {
        setExistingEntry(null)
        setSteps(0)
        setMinutes(0)
        setWorkouts(0)
      }
    }

    loadExistingEntry()
  }, [user, date])

  async function speichern() {
    if (!user) return

    if (existingEntry) {
      const { error } = await supabase
        .from("daily_entries")
        .update({
          steps,
          movement_minutes: minutes,
          workout_sessions: workouts,
        })
        .eq("id", existingEntry.id)
        .eq("user_id", user.id)

      if (error) {
        console.log(error)
        setMessage("Fehler beim Aktualisieren.")
      } else {
        setMessage("Eintrag aktualisiert!")
        router.push("/dashboard")
      }

      return
    }

    const { error } = await supabase.from("daily_entries").insert({
      user_id: user.id,
      date,
      steps,
      movement_minutes: minutes,
      workout_sessions: workouts,
    })

    if (error) {
      console.log(error)
      setMessage("Fehler beim Speichern.")
    } else {
      setMessage("Gespeichert!")
      router.push("/dashboard")
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p>Lade...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white/10 border border-white/10 rounded-3xl p-6">
        <p className="text-emerald-300 text-sm uppercase tracking-widest mb-2">
          Tageswerte
        </p>

        <h1 className="text-3xl font-bold mb-2">Eintrag erfassen</h1>

        <p className="text-slate-400 mb-6">
          {existingEntry
            ? "Für dieses Datum gibt es bereits einen Eintrag. Du kannst ihn hier bearbeiten."
            : "Für dieses Datum gibt es noch keinen Eintrag."}
        </p>

        <label className="block mb-2 text-slate-300">Datum</label>
        <input
          type="date"
          className="border border-white/10 bg-slate-900 rounded-2xl p-3 mb-4 w-full text-white"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <label className="block mb-2 text-slate-300">Schritte</label>
        <input
          type="number"
          className="border border-white/10 bg-slate-900 rounded-2xl p-3 mb-4 w-full text-white"
          value={steps}
          onChange={(e) => setSteps(Number(e.target.value))}
        />

        <label className="block mb-2 text-slate-300">Bewegungsminuten</label>
        <input
          type="number"
          className="border border-white/10 bg-slate-900 rounded-2xl p-3 mb-4 w-full text-white"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
        />

        <label className="block mb-2 text-slate-300">Sporteinheiten</label>
        <input
          type="number"
          className="border border-white/10 bg-slate-900 rounded-2xl p-3 mb-6 w-full text-white"
          value={workouts}
          onChange={(e) => setWorkouts(Number(e.target.value))}
        />

        <button
          onClick={speichern}
          className="bg-emerald-400 text-slate-950 font-bold px-4 py-3 w-full rounded-2xl hover:bg-emerald-300 transition"
        >
          {existingEntry ? "Eintrag aktualisieren" : "Speichern"}
        </button>

        <a
          href="/dashboard"
          className="block text-center mt-4 text-slate-400 hover:text-white"
        >
          Zurück zum Dashboard
        </a>

        {message && (
          <p className="text-slate-300 mt-4 text-center">{message}</p>
        )}
      </div>
    </main>
  )
}