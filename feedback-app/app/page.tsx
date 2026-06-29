import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import Link from "next/link"

export default async function Home() {
  const { userId } = await auth()

  if (userId) {
    redirect("/dashboard")
  }

  return (
    <div className="ws-page flex flex-col min-h-screen">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[var(--ws-outline)] shadow-[0_2px_12px_rgba(10,25,47,0.06)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-85 transition-opacity">
            <div className="flex items-center justify-center w-11 h-11 bg-white rounded-xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-1.5 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M 22 34 L 35 75 L 50 45 L 65 75 L 78 34"
                  fill="none"
                  stroke="#0c59cf"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="22" cy="30" r="8.5" fill="#e63946" />
                <circle cx="50" cy="40" r="8.5" fill="#f59e0b" />
                <circle cx="78" cy="30" r="8.5" fill="#10b981" />
              </svg>
            </div>
            <span className="ws-brand">
              WeShuttle
            </span>
          </Link>

          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-[8px] bg-[var(--ws-midnight)] text-white px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all hover:bg-slate-800 active:scale-95 cursor-pointer"
          >
            Ingresar
          </Link>
        </div>
      </header>

      {/* HERO / BODY */}
      <main className="ws-container flex-grow max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <section className="mb-10">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[var(--ws-midnight)] mb-3 leading-[1.1]">
            Bienvenido/a a WeShuttle Feedback
          </h1>
          <p className="text-lg text-[var(--ws-slate)] max-w-3xl leading-relaxed">
            Tu opinión ayuda a construir la mejor comunidad de movilidad corporativa. Valorá tu experiencia en cada viaje y manténganse conectados.
          </p>
        </section>

        {/* HERO BANNER CARD */}
        <section className="mb-14">
          <div className="ws-panel-dark p-8 md:p-12 relative overflow-hidden flex flex-col justify-between gap-6 min-h-[300px]">
            <div className="max-w-2xl z-10">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
                ¿Cómo fue tu último traslado?
              </h2>
              <p className="text-white/80 text-base md:text-lg leading-relaxed">
                Calificá con estrellas y dejá comentarios constructivos para tus conductores o pasajeros. Accedé para registrar tu feedback y ver tus reseñas.
              </p>
            </div>

            <div className="z-10">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-[8px] bg-white text-[var(--ws-midnight)] px-8 py-4 text-sm font-black uppercase tracking-wider transition-all hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.98]"
              >
                Ingresar para calificar
              </Link>
            </div>

            {/* Background design elements to match the premium theme */}
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none select-none translate-x-12 translate-y-12">
              <svg width="400" height="400" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="40" stroke="white" strokeWidth="5" />
                <path d="M50 20v60M20 50h60" stroke="white" strokeWidth="5" />
              </svg>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section>
          <h3 className="text-2xl font-black tracking-tight text-[var(--ws-midnight)] mb-8">
            La Experiencia de Feedback
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* FEATURE 1 */}
            <div className="ws-card ws-card-pad flex flex-col justify-between h-full min-h-[220px]">
              <div>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-4 font-bold text-lg">
                  ★
                </div>
                <h4 className="text-lg font-black text-[var(--ws-midnight)] mb-2">
                  Feedback mutuo y real
                </h4>
                <p className="text-sm text-[var(--ws-slate)] leading-relaxed">
                  Tanto conductores como pasajeros pueden dejarse valoraciones mutuas después de finalizar el traslado corporativo.
                </p>
              </div>
            </div>

            {/* FEATURE 2 */}
            <div className="ws-card ws-card-pad flex flex-col justify-between h-full min-h-[220px]">
              <div>
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 font-bold text-lg">
                  🗂️
                </div>
                <h4 className="text-lg font-black text-[var(--ws-midnight)] mb-2">
                  Reputación en tu perfil
                </h4>
                <p className="text-sm text-[var(--ws-slate)] leading-relaxed">
                  Consultá tu promedio general de estrellas y tus últimas reseñas recibidas para mantener los más altos estándares de calidad.
                </p>
              </div>
            </div>

            {/* FEATURE 3 */}
            <div className="ws-card ws-card-pad flex flex-col justify-between h-full min-h-[220px]">
              <div>
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-4 font-bold text-lg">
                  🛡️
                </div>
                <h4 className="text-lg font-black text-[var(--ws-midnight)] mb-2">
                  Moderación y reportes
                </h4>
                <p className="text-sm text-[var(--ws-slate)] leading-relaxed">
                  Sistema seguro de moderación de reportes ante comentarios ofensivos o información inapropiada en el viaje.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}