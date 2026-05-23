import { prisma } from '../lib/prisma.js' // Importa la instancia compartida de Prisma

async function main() {
  console.log('Iniciando seeding de la base de datos...')

  // 1. Aseguramos la existencia de usuarios de prueba con IDs fijos
  const rider1Id = 'user_rider_001'
  const rider2Id = 'user_rider_002'
  const driverId = 'user_driver_001'

  const testUsers = [
    { id: rider1Id, role: 'PASSENGER', name: 'Franco Gulino' },
    { id: rider2Id, role: 'PASSENGER', name: 'Juan Ignacio Ibarra' },
    { id: driverId, role: 'DRIVER', name: 'Juliana Pagani' },
  ]

  for (const u of testUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { name: u.name },
      create: {
        id: u.id,
        name: u.name,
        role: u.role as any, // Cast para evitar conflictos de enum si ts-node tiene problemas de tipos
      },
    })
  }

  console.log('Usuarios base verificados.')

  // 2. Crear una reseña COMPLETADA (para probar estadísticas y promedios)
  await prisma.review.upsert({
    where: { id: 'seed_review_completed_1' },
    update: {},
    create: {
      id: 'seed_review_completed_1',
      pool_id: 'pool_historical_001',
      reservation_id: 'res_historical_001',
      author_user_id: rider1Id,
      author_role: 'rider',
      target_user_id: driverId,
      target_role: 'driver',
      status: 'COMPLETED',
      rating: 5,
      comment: 'Viaje excelente, muy puntual.',
      enabled_at: new Date(),
      completed_at: new Date(),
    },
  })

  // 3. Crear una reseña PENDIENTE (para que aparezca el formulario en el dashboard)
  await prisma.review.upsert({
    where: { id: 'seed_review_pending_1' },
    update: {},
    create: {
      id: 'seed_review_pending_1',
      pool_id: 'pool_active_002',
      reservation_id: 'res_active_002',
      author_user_id: rider1Id,
      author_role: 'rider',
      target_user_id: driverId,
      target_role: 'driver',
      status: 'PENDING',
      enabled_at: new Date(),
    },
  })

  // 4. Poblar la tabla de promedios para el conductor
  await prisma.ratingAverage.upsert({
    where: { user_id_role: { user_id: driverId, role: 'driver' } },
    update: {},
    create: {
      user_id: driverId,
      role: 'driver',
      average_rating: 5.0,
      total_reviews: 1,
    },
  })

  console.log('Seeding completado con éxito.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })