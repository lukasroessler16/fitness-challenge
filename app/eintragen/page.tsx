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
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info")
  const [saving, setSaving] = useState(false)
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
      setExistingEntry(null)

      const { data, error } = await supabase
        .from("daily_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .maybeSingle()

      if (error) {
        console.log(error)
        setMessageType("error")
        setMessage("Fehler beim Laden des Eintrags.")
        return
      }

      if (data) {
        const entry = data as Entry
        setExistingEntry(entry)
        setSteps(entry.steps)
        setMinutes(entry.movement_minutes)
        setWorkouts(entry.workout_sessions)
        setMessageType("info")
        setMessage("Für dieses Datum gibt es bereits einen Eintrag. Du kannst ihn bearbeiten.")
      } else {
        setSteps(0)
        setMinutes(0)
        setWorkouts(0)
      }
    }

    loadExistingEntry()
  }, [user, date])

  async function speichern() {
    if (!user) return

    setSaving(true)
    setMessage("")

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

      setSaving(false)

      if (error) {
        console.log(error)
        setMessageType("error")
        setMessage("Fehler beim Aktualisieren.")
      } else {
        setMessageType("success")
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

    setSaving(false)

    if (error) {
      console.log(error)
      setMessageType("error")
      setMessage("Fehler beim Speichern.")
    } else {
      setMessageType("success")
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

  const messageStyle =
    messageType === "success"
      ? "bg-emerald-400/20 border-emerald-300/30 text-emerald-100"
      : messageType === "error"
      ? "bg-red-500/20 border-red-400/30 text-red-100"
      : "bg-white/10 border-white/10 text-slate-200"

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-emerald-300 text-sm uppercase tracking-widest">
            Tageswerte
          </p>
          <h1 className="text-4xl font-bold">Eintrag erfassen</h1>
          <p className="text-slate-400 mt-2">
            Trage deine Werte ein oder korrigiere ältere Einträge.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-white/10 border border-white/10 rounded-3xl p-6 shadow-2xl">
            <label className="block mb-2 text-slate-300">Datum</label>
            <input
              type="date"
              className="border border-white/10 bg-slate-900 rounded-2xl p-3 mb-5 w-full text-white outline-none focus:border-emerald-300"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block mb-2 text-slate-300">Schritte</label>
                <input
                  type="number"
                  className="border border-white/10 bg-slate-900 rounded-2xl p-3 w-full text-white outline-none focus:border-emerald-300"
                  value={steps}
                  onChange={(e) => setSteps(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block mb-2 text-slate-300">Bewegungsminuten</label>
                <input
                  type="number"
                  className="border border-white/10 bg-slate-900 rounded-2xl p-3 w-full text-white outline-none focus:border-emerald-300"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block mb-2 text-slate-300">Sporteinheiten</label>
                <input
                  type="number"
                  className="border border-white/10 bg-slate-900 rounded-2xl p-3 w-full text-white outline-none focus:border-emerald-300"
                  value={workouts}
                  onChange={(e) => setWorkouts(Number(e.target.value))}
                />
              </div>
            </div>

            <button
              onClick={speichern}
              disabled={saving}
              className="mt-6 bg-emerald-400 text-slate-950 font-bold px-4 py-3 w-full rounded-2xl hover:bg-emerald-300 transition disabled:opacity-60"
            >
              {saving
                ? "Speichert..."
                : existingEntry
                ? "Eintrag aktualisieren"
                : "Eintrag speichern"}
            </button>

            <a
              href="/dashboard"
              className="block text-center mt-4 text-slate-400 hover:text-white"
            >
              Zurück zum Dashboard
            </a>

            {message && (
              <div className={`mt-5 border rounded-2xl p-4 ${messageStyle}`}>
                {message}
              </div>
            )}
          </section>

          <aside className="bg-white/10 border border-white/10 rounded-3xl p-6">
            <p className="text-slate-400 mb-2">Vorschau</p>

            <div className="space-y-3">
              <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                <p className="text-slate-400">Schritte</p>
                <p className="text-2xl font-bold">{steps}</p>
              </div>

              <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                <p className="text-slate-400">Minuten</p>
                <p className="text-2xl font-bold">{minutes}</p>
              </div>

              <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                <p className="text-slate-400">Sporteinheiten</p>
                <p className="text-2xl font-bold">{workouts}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}