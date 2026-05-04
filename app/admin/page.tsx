"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Profile = {
  id: string
  name: string
  is_admin: boolean
}

type StartScore = {
  id: string
  user_id: string
  start_points: number
}

type Entry = {
  id: string
  user_id: string
  date: string
  steps: number
  movement_minutes: number
  workout_sessions: number
  profiles: {
    name: string
  } | null
}

type ProfileRow = Profile & {
  start_score_id: string | null
  start_points: number
}

function getTodayLocalDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [checked, setChecked] = useState(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [message, setMessage] = useState("")

  const [challengeStartDate, setChallengeStartDate] = useState("2026-05-04")

  const [newUserId, setNewUserId] = useState("")
  const [newDate, setNewDate] = useState(getTodayLocalDate())
  const [newSteps, setNewSteps] = useState(0)
  const [newMinutes, setNewMinutes] = useState(0)
  const [newWorkouts, setNewWorkouts] = useState(0)

  const router = useRouter()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      router.push("/login")
      return
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .single()

    if (!myProfile?.is_admin) {
      setChecked(true)
      setIsAdmin(false)
      return
    }

    setIsAdmin(true)
    setChecked(true)

    const { data: settingsData } = await supabase
      .from("challenge_settings")
      .select("*")
      .eq("id", 1)
      .single()

    if (settingsData?.challenge_start_date) {
      setChallengeStartDate(settingsData.challenge_start_date)
    }

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("name", { ascending: true })

    const { data: startScoresData } = await supabase
      .from("start_scores")
      .select("*")

    const { data: entriesData } = await supabase
      .from("daily_entries")
      .select(`
        *,
        profiles (
          name
        )
      `)
      .order("date", { ascending: false })

    const loadedProfiles = (profilesData ?? []) as Profile[]
    const loadedStartScores = (startScoresData ?? []) as StartScore[]

    const mappedProfiles = loadedProfiles.map((profile) => {
      const startScore = loadedStartScores.find(
        (score) => score.user_id === profile.id
      )

      return {
        ...profile,
        start_score_id: startScore?.id ?? null,
        start_points: startScore?.start_points ?? 0,
      }
    })

    setProfiles(mappedProfiles)
    setEntries((entriesData as Entry[]) ?? [])

    if (!newUserId && mappedProfiles.length > 0) {
      setNewUserId(mappedProfiles[0].id)
    }
  }

  async function saveChallengeSettings() {
    setMessage("")

    const { error } = await supabase
      .from("challenge_settings")
      .update({
        challenge_start_date: challengeStartDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)

    if (error) {
      console.log(error)
      setMessage("Fehler beim Speichern der Challenge-Einstellungen.")
      return
    }

    setMessage("Challenge-Einstellungen gespeichert.")
  }

  function updateEntryLocal(
    id: string,
    field: keyof Entry,
    value: number | string
  ) {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    )
  }

  function updateProfileLocal(
    id: string,
    field: keyof ProfileRow,
    value: string | number | boolean
  ) {
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === id ? { ...profile, [field]: value } : profile
      )
    )
  }

  async function createEntry() {
    setMessage("")

    if (!newUserId) {
      setMessage("Bitte einen Benutzer auswählen.")
      return
    }

    const { data: existing } = await supabase
      .from("daily_entries")
      .select("*")
      .eq("user_id", newUserId)
      .eq("date", newDate)
      .maybeSingle()

    if (existing) {
      setMessage("Für diesen Benutzer gibt es an diesem Datum bereits einen Eintrag.")
      return
    }

    const { error } = await supabase.from("daily_entries").insert({
      user_id: newUserId,
      date: newDate,
      steps: newSteps,
      movement_minutes: newMinutes,
      workout_sessions: newWorkouts,
    })

    if (error) {
      console.log(error)
      setMessage("Fehler beim Erstellen des Eintrags.")
      return
    }

    setMessage("Neuer Eintrag erstellt.")
    setNewSteps(0)
    setNewMinutes(0)
    setNewWorkouts(0)
    await load()
  }

  async function saveEntry(entry: Entry) {
    setMessage("")

    const { error } = await supabase
      .from("daily_entries")
      .update({
        date: entry.date,
        steps: entry.steps,
        movement_minutes: entry.movement_minutes,
        workout_sessions: entry.workout_sessions,
      })
      .eq("id", entry.id)

    if (error) {
      console.log(error)
      setMessage("Fehler beim Speichern des Eintrags.")
      return
    }

    setMessage("Eintrag gespeichert.")
    await load()
  }

  async function deleteEntry(entryId: string) {
    const confirmed = confirm("Diesen Eintrag wirklich löschen?")
    if (!confirmed) return

    setMessage("")

    const { error } = await supabase
      .from("daily_entries")
      .delete()
      .eq("id", entryId)

    if (error) {
      console.log(error)
      setMessage("Fehler beim Löschen.")
      return
    }

    setEntries((current) => current.filter((entry) => entry.id !== entryId))
    setMessage("Eintrag gelöscht.")
  }

  async function saveProfile(profile: ProfileRow) {
    setMessage("")

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        name: profile.name,
        is_admin: profile.is_admin,
      })
      .eq("id", profile.id)

    if (profileError) {
      console.log(profileError)
      setMessage("Fehler beim Speichern des Profils.")
      return
    }

    if (profile.start_score_id) {
      const { error: scoreError } = await supabase
        .from("start_scores")
        .update({
          start_points: profile.start_points,
        })
        .eq("id", profile.start_score_id)

      if (scoreError) {
        console.log(scoreError)
        setMessage("Profil gespeichert, aber Startpunkte nicht.")
        return
      }
    } else {
      const { error: scoreError } = await supabase
        .from("start_scores")
        .insert({
          user_id: profile.id,
          start_points: profile.start_points,
        })

      if (scoreError) {
        console.log(scoreError)
        setMessage("Profil gespeichert, aber Startpunkte nicht.")
        return
      }
    }

    setMessage("Benutzer gespeichert.")
    await load()
  }

  if (!checked) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p>Lade...</p>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-xl mx-auto bg-white/10 border border-white/10 rounded-3xl p-6">
          <h1 className="text-3xl font-bold mb-3">Kein Zugriff</h1>
          <a
            href="/dashboard"
            className="bg-emerald-400 text-slate-950 font-bold px-5 py-3 rounded-2xl inline-block"
          >
            Zurück
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-24">
      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-6">
          <p className="text-emerald-300 text-xs uppercase tracking-widest">
            Admin
          </p>
          <h1 className="text-3xl font-bold">Kontrollzentrum</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Benutzer, Startpunkte, Challenge-Start und Tageswerte verwalten.
          </p>
        </div>

        {message && (
          <div className="bg-emerald-400/20 border border-emerald-300/30 rounded-2xl p-4 mb-5">
            {message}
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Challenge-Einstellungen</h2>

          <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Startdatum der Webapp-Wertung
                </label>
                <input
                  type="date"
                  value={challengeStartDate}
                  onChange={(event) =>
                    setChallengeStartDate(event.target.value)
                  }
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={saveChallengeSettings}
                  className="w-full bg-emerald-400 text-slate-950 font-bold px-4 py-3 rounded-xl"
                >
                  Einstellungen speichern
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-3">
              Alle Auswertungen zählen später nur Einträge ab diesem Datum.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Neuen Eintrag erstellen</h2>

          <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
            <div className="grid md:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Benutzer
                </label>
                <select
                  value={newUserId}
                  onChange={(event) => setNewUserId(event.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                >
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(event) => setNewDate(event.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Schritte
                </label>
                <input
                  type="number"
                  value={newSteps}
                  onChange={(event) => setNewSteps(Number(event.target.value))}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Minuten
                </label>
                <input
                  type="number"
                  value={newMinutes}
                  onChange={(event) => setNewMinutes(Number(event.target.value))}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Sport
                </label>
                <input
                  type="number"
                  value={newWorkouts}
                  onChange={(event) => setNewWorkouts(Number(event.target.value))}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={createEntry}
                  className="w-full bg-emerald-400 text-slate-950 font-bold px-4 py-3 rounded-xl"
                >
                  Erstellen
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Benutzer verwalten</h2>

          <div className="space-y-3">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-white/10 border border-white/10 rounded-2xl p-4"
              >
                <div className="grid md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(event) =>
                        updateProfileLocal(profile.id, "name", event.target.value)
                      }
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Startpunkte
                    </label>
                    <input
                      type="number"
                      value={profile.start_points}
                      onChange={(event) =>
                        updateProfileLocal(
                          profile.id,
                          "start_points",
                          Number(event.target.value)
                        )
                      }
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      checked={profile.is_admin}
                      onChange={(event) =>
                        updateProfileLocal(
                          profile.id,
                          "is_admin",
                          event.target.checked
                        )
                      }
                    />
                    <span className="text-sm">Admin</span>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => saveProfile(profile)}
                      className="w-full bg-emerald-400 text-slate-950 font-bold px-4 py-3 rounded-xl"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Einträge bearbeiten</h2>

          <div className="space-y-3">
            {entries.length === 0 ? (
              <p className="text-slate-400">Noch keine Einträge vorhanden.</p>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white/10 border border-white/10 rounded-2xl p-4"
                >
                  <p className="font-bold mb-3">
                    {entry.profiles?.name ?? "Unbekannt"}
                  </p>

                  <div className="grid md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Datum
                      </label>
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(event) =>
                          updateEntryLocal(entry.id, "date", event.target.value)
                        }
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Schritte
                      </label>
                      <input
                        type="number"
                        value={entry.steps}
                        onChange={(event) =>
                          updateEntryLocal(
                            entry.id,
                            "steps",
                            Number(event.target.value)
                          )
                        }
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Minuten
                      </label>
                      <input
                        type="number"
                        value={entry.movement_minutes}
                        onChange={(event) =>
                          updateEntryLocal(
                            entry.id,
                            "movement_minutes",
                            Number(event.target.value)
                          )
                        }
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Sport
                      </label>
                      <input
                        type="number"
                        value={entry.workout_sessions}
                        onChange={(event) =>
                          updateEntryLocal(
                            entry.id,
                            "workout_sessions",
                            Number(event.target.value)
                          )
                        }
                        className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                      />
                    </div>

                    <div className="flex gap-2 items-end">
                      <button
                        onClick={() => saveEntry(entry)}
                        className="flex-1 bg-emerald-400 text-slate-950 font-bold px-4 py-3 rounded-xl"
                      >
                        Speichern
                      </button>

                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="flex-1 bg-red-500/20 border border-red-400/30 text-red-200 px-4 py-3 rounded-xl"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
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
        <a href="/statistik" className="text-xs">
          Stats
        </a>
        <a href="/admin" className="text-xs text-emerald-300">
          Admin
        </a>
      </div>
    </main>
  )
}