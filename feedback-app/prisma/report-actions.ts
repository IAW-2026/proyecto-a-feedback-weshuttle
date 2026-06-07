'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'

/**
 * Crea un nuevo reporte para una reseña
 */
export async function createReport(formData: FormData) {
  const reviewId = formData.get('reviewId') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const reporterRole = formData.get('reporterRole') as string // 'RIDER' o 'DRIVER'

  const { userId } = await auth()
  if (!userId) return { success: false, error: 'No autorizado' }

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

    revalidatePath('/admin/reports')
    return { success: true }
  } catch (error) {
    console.error('Error al crear reporte:', error)
    return { success: false, error: 'No se pudo procesar el reporte.' }
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
 * Actualiza el estado de un reporte (BAJO_REVISION, RECHAZADO, RESUELTO)
 * Si se marca como RESUELTO, se elimina la reseña asociada.
 */
export async function updateReportStatus(reportId: string, status: string) {
  try {
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: { status: status as any, reviewed_at: status === 'RESUELTO' || status === 'RECHAZADO' ? new Date() : null },
    })

    // Si el administrador resuelve el reporte, eliminamos la reseña ofensiva
    if (status === 'RESUELTO') {
      await prisma.review.delete({
        where: { id: updatedReport.review_id }
      })
    }

    revalidatePath('/admin/reports')
    return { success: true }
  } catch (error) {
    console.error('Error al actualizar reporte:', error)
    return { success: false, error: 'Error al actualizar el estado del reporte.' }
  }
}