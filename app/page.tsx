export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white/10 border border-white/10 rounded-3xl p-8 shadow-2xl text-center">
        <p className="text-sm uppercase tracking-widest text-emerald-300 mb-3">
          Fitness Challenge
        </p>

        <h1 className="text-4xl font-bold mb-4">
          Deine Challenge-Auswertung
        </h1>

        <p className="text-slate-300 mb-8">
          Schritte, Bewegungsminuten und Sporteinheiten erfassen,
          vergleichen und auswerten.
        </p>

        <a
          href="/login"
          className="inline-block bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-2xl hover:bg-emerald-300 transition"
        >
          Zum Login
        </a>
      </div>
    </main>
  )
}