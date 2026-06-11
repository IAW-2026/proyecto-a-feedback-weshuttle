'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server' // Asumiendo que usas Clerk para autenticación

export async function createReport(formData: FormData) {
  const { userId } = await auth() // Obtener el ID del usuario actual de la sesión de Clerk

  if (!userId) {
    return { success: false, error: 'Usuario no autenticado.' }
  }

  const reviewId = formData.get('reviewId') as string
  const reporterRole = formData.get('reporterRole') as string // 'RIDER' o 'DRIVER'
  const type = formData.get('type') as string // SPAM, CONTENIDO_OFENSIVO, etc.
  const description = formData.get('description') as string | null

  if (!reviewId || !reporterRole || !type) {
    return { success: false, error: 'Faltan campos requeridos para el reporte.' }
  }

  try {
    await prisma.report.create({
      data: {
        review_id: reviewId,
        reporter_role: reporterRole,
        reporter_user_id: userId, // Usar el ID de usuario real
        type: type as any, // Castear al enum ReportType
        description,
        status: 'PENDING',
      },
    })

    // Revalidar la ruta del dashboard de admin para que vea el nuevo reporte
    revalidatePath('/dashboard/admin/reports')

    return { success: true }
  } catch (error) {
    console.error('Error creando reporte:', error)
    return { success: false, error: 'No se pudo crear el reporte.' }
  }
}

export async function updateReportStatus(reportId: string, newStatus: 'PENDING' | 'BAJO_REVISION' | 'RESUELTO' | 'RECHAZADO') {
  if (!reportId || !newStatus) {
    return { success: false, error: 'Faltan campos requeridos para actualizar el estado.' }
  }

  try {
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: { status: newStatus },
      include: { review: true } // Incluir la reseña para poder eliminarla
    })

    if (newStatus === 'RESUELTO' && updatedReport.review_id) {
      // Si el reporte es resuelto, y la reseña es inapropiada, eliminar la reseña
      // Esta lógica podría ser más compleja en una app real (ej. soft delete, confirmación admin)
      await prisma.review.delete({
        where: { id: updatedReport.review_id }
      })
      revalidatePath('/dashboard/driver/trips') // Revalidar la página de viajes del conductor
      revalidatePath('/dashboard/passenger/trips') // Revalidar la página de viajes del pasajero
    }

    revalidatePath('/dashboard/admin/reports') // Revalidar la ruta del dashboard de admin

    return { success: true }
  } catch (error) {
    console.error('Error actualizando estado del reporte:', error)
    return { success: false, error: 'No se pudo actualizar el estado del reporte.' }
  }
}