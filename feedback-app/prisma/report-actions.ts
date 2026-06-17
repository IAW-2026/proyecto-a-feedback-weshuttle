'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'

/**
 * Crea un nuevo reporte para una reseña
 */
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
        reporter_user_id: userId,
        review_id: reviewId,
        type: type as any,
        description,
        reporter_role: reporterRole,
        status: 'PENDING',
      },
    })

    revalidatePath('/dashboard/admin/reports')
    return { success: true }
  } catch (error) {
    console.error('Error creando reporte:', error)
    return { success: false, error: 'No se pudo crear el reporte.' }
  }
}

/**
 * Obtiene todos los reportes para la vista de administrador
 */
export async function getAdminReports() {
  try {
    const reports = await prisma.report.findMany({
      include: {
        review: {
          include: {
            author: {
              select: { name: true }
            },
            recipient: {
              select: { name: true }
            }
          }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return reports
  } catch (error) {
    console.error('Error fetching reports:', error)
    return []
  }
}

/**
 * Actualiza el estado de un reporte (RECHAZADO, RESUELTO)
 * Si se marca como RESUELTO, se oculta la reseña asociada (soft delete).
 */
export async function updateReportStatus(reportId: string, status: 'RESUELTO' | 'RECHAZADO') {
  try {
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: { status: status, reviewed_at: new Date() },
    })

    // Si el administrador resuelve el reporte, marcamos la reseña como eliminada (borrado lógico)
    if (status === 'RESUELTO' && updatedReport.review_id) {
      await prisma.review.update({
        where: { id: updatedReport.review_id },
        data: { status: 'REMOVED' }
      })
    }

    revalidatePath('/dashboard/admin/reports')
    revalidatePath('/dashboard/driver/trips')
    revalidatePath('/dashboard/passenger/trips')

    return { success: true }
  } catch (error) {
    console.error('Error al actualizar reporte:', error)
    return { success: false, error: 'Error al actualizar el estado del reporte.' }
  }
}