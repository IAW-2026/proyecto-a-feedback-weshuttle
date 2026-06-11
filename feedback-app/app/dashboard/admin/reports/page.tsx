import { getAdminReports } from "@/prisma/report-actions"
import AdminReportsTable from "@/app/components/AdminReportsTable"
import Navbar from "@/app/components/NavBar"
import { getCurrentUser } from "@/lib/current-user"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AdminReportsPage() {
  // 1. Verificación de seguridad en el servidor
  const user = await getCurrentUser()

  if (!user) redirect("/sign-in")
  if (user.role !== "ADMIN") redirect("/dashboard")

  // 2. Obtención de datos directamente de la DB
  const reports = await getAdminReports()

  return (
    <div className="ws-page">
      <Navbar role={user.role} displayName={user.name} />

      <main className="ws-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <span className="ws-pill ws-pill-warning uppercase tracking-widest font-black text-[10px]">
                Moderación
              </span>
            </div>
            <h1 className="text-4xl font-black text-[var(--ws-midnight)] tracking-tight">
              Gestión de Reportes
            </h1>
            <p className="text-[var(--ws-slate)] mt-2 font-medium">
              Panel de control para revisar denuncias sobre contenido inapropiado o spam.
            </p>
          </div>

          <Link
            href="/dashboard/admin"
            className="ws-secondary-button"
          >
            Volver a inicio
          </Link>
        </section>

        <AdminReportsTable initialReports={reports as any} />
      </main>
    </div>
  )
}