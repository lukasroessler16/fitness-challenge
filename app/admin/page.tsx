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

type AdminRow = {
  user_id: string
  name: string
  start_score_id: string | null
  start_points: number
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [rows, setRows] = useState<AdminRow[]>([])
  const [message, setMessage] = useState("")
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.push("/login")
        return
      }

      setUser(userData.user)

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single()

      if (!myProfile?.is_admin) {
        setIsAdmin(false)
        return
      }

      setIsAdmin(true)

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .order("name", { ascending: true })

      const { data: startScoresData } = await supabase
        .from("start_scores")
        .select("*")

      const profiles = (profilesData ?? []) as Profile[]
      const startScores = (startScoresData ?? []) as StartScore[]

      const mappedRows = profiles.map((profile) => {
        const score = startScores.find((s) => s.user_id === profile.id)

        return {
          user_id: profile.id,
          name: profile.name,
          start_score_id: score?.id ?? null,
          start_points: score?.start_points ?? 0,
        }
      })

      setRows(mappedRows)
    }

    load()
  }, [router])

  function updateLocalPoints(userId: string, value: number) {
    setRows((current) =>
      current.map((row) =>
        row.user_id === userId
          ? { ...row, start_points: value }
          : row
      )
    )
  }

  async function saveStartScore(row: AdminRow) {
    setMessage("")

    if (row.start_score_id) {
      const { error } = await supabase
        .from("start_scores")
        .update({
          start_points: row.start_points,
        })
        .eq("id", row.start_score_id)

      if (error) {
        console.log(error)
        setMessage("Fehler beim Aktualisieren.")
        return
      }
    } else {
      const { error } = await supabase.from("start_scores").insert({
        user_id: row.user_id,
        start_points: row.start_points,
      })

      if (error) {
        console.log(error)
        setMessage("Fehler beim Speichern.")
        return
      }
    }

    setMessage("Startpunkte gespeichert.")
    router.refresh()
  }

  if (!user) {
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
          <p className="text-slate-400 mb-6">
            Du bist nicht als Admin freigeschaltet.
          </p>
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
      <div className="max-w-5xl mx-auto p-4">
        <div className="mb-6">
          <p className="text-emerald-300 text-xs uppercase tracking-widest">
            Admin
          </p>
          <h1 className="text-3xl font-bold">Startpunkte verwalten</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Hier kannst du den bisherigen Zwischenstand als Startwert setzen.
          </p>
        </div>

        {message && (
          <div className="bg-emerald-400/20 border border-emerald-300/30 rounded-2xl p-4 mb-5">
            {message}
          </div>
        )}

        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.user_id}
              className="bg-white/10 border border-white/10 rounded-2xl p-4"
            >
              <p className="font-bold mb-3">{row.name}</p>

              <div className="flex gap-3">
                <input
                  type="number"
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl p-3 text-white"
                  value={row.start_points}
                  onChange={(e) =>
                    updateLocalPoints(row.user_id, Number(e.target.value))
                  }
                />

                <button
                  onClick={() => saveStartScore(row)}
                  className="bg-emerald-400 text-slate-950 font-bold px-4 rounded-xl"
                >
                  Speichern
                </button>
              </div>
            </div>
          ))}
        </div>
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
        <a href="/admin" className="text-xs text-emerald-300">
          Admin
        </a>
      </div>
    </main>
  )
}