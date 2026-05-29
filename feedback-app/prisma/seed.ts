import 'dotenv/config'
import { prisma } from '../lib/prisma.js' // Importa la instancia compartida de Prisma

async function main() {
  console.log('Iniciando seeding de la base de datos...')

  const now = new Date()
  const seedPoolId = 'pool_seed_trip_001'

  const existingDriver = await prisma.user.findFirst({
    where: { role: 'DRIVER' as any },
    orderBy: { createdAt: 'asc' },
  })

  const targetDriverId = existingDriver?.id ?? 'seed_driver_target_001'

  const passengers = [
    { id: 'seed_user_juan_bassi', name: 'Shai Gilgeous-Alexander' },
    { id: 'seed_user_juliana_pagani', name: 'LeBron James' },
    { id: 'seed_user_juani_ibarra', name: 'Nikola Jokic' },
    { id: 'seed_user_franco_gulino', name: 'Carmelo Anthony' },
    { id: 'seed_user_luka_doncic', name: 'Luka Doncic' },
    { id: 'seed_user_stephen_curry', name: 'Stephen Curry' },
    { id: 'seed_user_donte_divincenzo', name: 'Donte Divincenzo' },
    { id: 'seed_user_jalen_brunson', name: 'Jalen Brunson' },
    { id: 'seed_user_donovan_mitchell', name: 'Donovan Mitchell' },
    { id: 'seed_user_zach_lavine', name: 'Zach Lavine' },
  ]

  // Limpiamos únicamente datos de seed anteriores para mantener idempotencia.
  await prisma.review.deleteMany({
    where: {
      id: {
        startsWith: 'seed_review_trip_',
      },
    },
  })

  await prisma.ratingAverage.deleteMany({
    where: {
      user_id: targetDriverId,
      role: 'driver',
    },
  })

  if (!existingDriver) {
    await prisma.user.upsert({
      where: { id: targetDriverId },
      update: { name: 'Driver Seed' },
      create: {
        id: targetDriverId,
        name: 'Driver Seed',
        role: 'DRIVER' as any,
      },
    })
  }

  for (const passenger of passengers) {
    await prisma.user.upsert({
      where: { id: passenger.id },
      update: { name: passenger.name },
      create: {
        id: passenger.id,
        name: passenger.name,
        role: 'PASSENGER' as any,
      },
    })
  }

  const seedReviews = [
    { authorId: passengers[0].id, rating: 1, comment: 'Muy mala experiencia, hubo demoras y desorganización.' },
    { authorId: passengers[1].id, rating: 1, comment: 'No me sentí cómodo durante el viaje, faltó atención.' },
    { authorId: passengers[2].id, rating: 2, comment: 'El viaje cumplió, pero hubo varios puntos a mejorar.' },
    { authorId: passengers[3].id, rating: 2, comment: 'Regular: aceptable, aunque con retrasos y poca comunicación.' },
    { authorId: passengers[4].id, rating: 3, comment: 'Experiencia promedio, sin mayores problemas ni destacables.' },
    { authorId: passengers[5].id, rating: 3, comment: 'Correcto y en línea con lo esperado para el trayecto.' },
    { authorId: passengers[6].id, rating: 4, comment: 'Muy buen viaje, puntual y con buen trato.' },
    { authorId: passengers[7].id, rating: 4, comment: 'Casi excelente, manejo seguro y comunicación clara.' },
    { authorId: passengers[8].id, rating: 5, comment: 'Excelente servicio, todo perfecto de principio a fin.' },
    { authorId: passengers[9].id, rating: 5, comment: 'Viaje impecable, súper recomendable.' },
  ]

  for (let i = 0; i < seedReviews.length; i++) {
    const review = seedReviews[i]

    await prisma.review.create({
      data: {
        id: `seed_review_trip_${String(i + 1).padStart(3, '0')}`,
        pool_id: seedPoolId,
        reservation_id: `seed_res_trip_${String(i + 1).padStart(3, '0')}`,
        author_user_id: review.authorId,
        author_role: 'rider',
        target_user_id: targetDriverId,
        target_role: 'driver',
        status: 'COMPLETED',
        rating: review.rating,
        comment: review.comment,
        enabled_at: now,
        completed_at: now,
      },
    })
  }

  await prisma.ratingAverage.upsert({
    where: { user_id_role: { user_id: targetDriverId, role: 'driver' } },
    update: {
      average_rating: 3.0,
      total_reviews: 10,
    },
    create: {
      user_id: targetDriverId,
      role: 'driver',
      average_rating: 3.0,
      total_reviews: 10,
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