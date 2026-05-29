import Link from "next/link"
import { redirect } from "next/navigation"

import Navbar from "../../components/NavBar"
import { getCurrentUser } from "@/lib/current-user"

const adminSections = [
	{
		title: "Operaciones",
		description:
			"Seguimiento central de actividad, revisión de feedback y estado general de la plataforma.",
		badge: "Control",
	},
	{
		title: "Calidad de servicio",
		description:
			"Monitoreo de reseñas, patrones de satisfacción y oportunidades de mejora en la experiencia.",
		badge: "Feedback",
	},
	{
		title: "Soporte y escalamiento",
		description:
			"Acceso rápido a incidencias, soporte y enlaces directos hacia las vistas de driver y rider.",
		badge: "Soporte",
	},
]

export default async function AdminDashboard() {
	const user = await getCurrentUser()

	if (!user) {
		redirect("/sign-in")
	}

	if (user.role !== "ADMIN") {
		redirect("/dashboard")
	}

	return (
		<div className="ws-page">
			<Navbar role={user.role} />

			<main className="ws-container">
				<section className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<p className="text-sm text-[var(--ws-slate)] mb-4 font-semibold tracking-wide uppercase">
							WeShuttle Admin Dashboard
						</p>

						<h1 className="text-[32px] sm:text-5xl font-black tracking-tight leading-[0.95] mb-5 text-[var(--ws-midnight)] max-w-4xl">
							Centro de control para la operación y la calidad del servicio.
						</h1>

						<p className="text-lg text-[var(--ws-slate)] max-w-2xl leading-relaxed">
							Desde acá podés supervisar la experiencia de conductores y pasajeros, y derivar acciones cuando haga falta.
						</p>
					</div>

					<Link href="/dashboard" className="ws-secondary-button">
						Volver al selector
					</Link>
				</section>

				<section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
					{adminSections.map((section) => (
						<article key={section.title} className="ws-card ws-card-large">
							<div className="ws-pill ws-pill-info mb-5">{section.badge}</div>
							<h2 className="text-2xl font-black tracking-tight mb-3 text-[var(--ws-midnight)]">
								{section.title}
							</h2>
							<p className="text-[var(--ws-slate)] leading-relaxed">
								{section.description}
							</p>
						</article>
					))}
				</section>

				<section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<article className="ws-card ws-card-large">
						<p className="text-sm text-[var(--ws-slate)] mb-2 font-semibold">
							Acceso rápido
						</p>
						<h2 className="text-3xl font-black tracking-tight mb-4 text-[var(--ws-midnight)]">
							Navegá las vistas principales
						</h2>
						<p className="text-[var(--ws-slate)] leading-relaxed mb-6">
							Saltá entre la experiencia de conductores y pasajeros para validar el estado del producto desde una sola pantalla.
						</p>

						<div className="flex flex-col sm:flex-row gap-3">
							<Link href="/dashboard/driver" className="ws-primary-button">
								Ver driver
							</Link>
							<Link href="/dashboard/passenger" className="ws-secondary-button">
								Ver rider
							</Link>
						</div>
					</article>

					<article className="ws-panel-dark p-8">
						<p className="text-sm text-white/60 mb-2 font-semibold uppercase tracking-wider">
							Estado general
						</p>
						<h2 className="text-3xl font-black tracking-tight mb-4">
							Interfaz alineada a la identidad WeShuttle
						</h2>
						<p className="text-white/75 leading-relaxed">
							Fondo claro, tarjetas blancas, bordes suaves, tipografía Inter y acciones principales en azul noche para mantener una lectura corporativa uniforme.
						</p>
					</article>
				</section>
			</main>
		</div>
	)
}
