import Link from "next/link"
import { prisma } from "../../../lib/prisma"
import Navbar from "../../components/NavBar"
import { redirect } from "next/navigation"
import { getCurrentUser } from "../../../lib/current-user"
import AdminReviewsTable from "../../components/AdminReviewsTable"
import { Prisma } from "@prisma/client"
import ProfileNameEditor from "../../components/ProfileNameEditor"
import { createAdminReview, type CreateAdminReviewInput } from "@/lib/reviews/admin-create-review"

type ReviewWithUsers = Prisma.ReviewGetPayload<{
  include: { author: true; recipient: true }
}>

async function createAdminReviewAction(input: CreateAdminReviewInput) {
  "use server"

  const user = await getCurrentUser()

  if (!user) {
    throw new Error("UNAUTHORIZED")
  }

  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN")
  }

  return createAdminReview(input)
}

export default async function AdminDashboard() {
  const user = await getCurrentUser()

  if (!user) redirect('/sign-in')
  if (user.role !== 'ADMIN') redirect('/dashboard')

  const reviews: ReviewWithUsers[] = await prisma.review.findMany({
    include: { author: true, recipient: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const pendingReportsCount = await prisma.report.count({
    where: { status: 'PENDING' }
  })

  const total = reviews.length
  const completed = reviews.filter(r => r.status === 'COMPLETED').length
  const pending = reviews.filter(r => r.status === 'PENDING').length
  const precreated = reviews.filter(r => r.status === 'PRECREATED').length

  const average =
    reviews.filter(r => r.rating != null && r.rating > 0).length > 0
      ? (
          reviews.reduce((acc, r) => acc + (r.rating || 0), 0) /
          reviews.filter(r => r.rating != null && r.rating > 0).length
        ).toFixed(1)
      : '0.0'

  return (
    <div className="ws-page">
      <Navbar role={user.role} displayName={user.name} />

      <main className="ws-container max-w-7xl mx-auto">
        <section className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm text-[var(--ws-slate)] mb-4 font-semibold tracking-wide uppercase">
              WeShuttle Admin
            </p>
            <h1 className="text-4xl font-black tracking-tight mb-6 text-[var(--ws-midnight)]">
              Panel de administración — Reseñas
            </h1>
            <p className="text-[var(--ws-slate)] max-w-xl leading-relaxed">
              Gestioná las reseñas de pasajeros y conductores: crear, ver, editar y eliminar.
            </p>

            <div className="mt-8 flex items-center gap-4">
              <Link 
                href="/dashboard/admin/reports" 
                className="ws-secondary-button inline-flex items-center gap-3 px-6 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200 transition-all active:scale-95 shadow-sm"
              >
                <span>Gestión de Reportes</span>
                {pendingReportsCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                    {pendingReportsCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          <ProfileNameEditor initialName={user.name} />
        </section>

        {/* STATISTICS ABOVE TABLE */}
        <section className="mb-8">
          <div className="ws-card ws-card-large w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-sm text-[var(--ws-slate)] mb-1 font-semibold">Resumen</p>
                <h2 className="text-3xl font-black mb-1 text-[var(--ws-midnight)]">{average}★</h2>
                <p className="text-[var(--ws-slate)] text-sm">Calificación promedio</p>
              </div>

              <div className="flex gap-4 flex-wrap">
                <div className="bg-[var(--ws-info-soft)] rounded-[12px] p-4 border border-[var(--ws-outline)]">
                  <p className="text-sm text-[var(--ws-slate)]">Total Reseñas</p>
                  <p className="text-2xl font-black">{total}</p>
                </div>

                <div className="bg-[var(--ws-info-soft)] rounded-[12px] p-4 border border-[var(--ws-outline)]">
                  <p className="text-sm text-[var(--ws-slate)]">Completadas</p>
                  <p className="text-2xl font-black">{completed}</p>
                </div>

                <div className="bg-[var(--ws-info-soft)] rounded-[12px] p-4 border border-[var(--ws-outline)]">
                  <p className="text-sm text-[var(--ws-slate)]">Pendientes</p>
                  <p className="text-2xl font-black">{pending}</p>
                </div>

                <div className="bg-[var(--ws-info-soft)] rounded-[12px] p-4 border border-[var(--ws-outline)]">
                  <p className="text-sm text-[var(--ws-slate)]">Precreadas</p>
                  <p className="text-2xl font-black">{precreated}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FULL-WIDTH CRUD TABLE */}
        <section className="mb-10">
          <div className="ws-card ws-card-large w-full">
            <h3 className="text-xl font-black mb-4">Listado de reseñas</h3>
            <div className="w-full">
              <AdminReviewsTable initialReviews={reviews} createReviewAction={createAdminReviewAction} />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
