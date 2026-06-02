import 'dotenv/config'
import { prisma } from '../lib/prisma.js' // Importa la instancia compartida de Prisma

async function main() {
  console.log('Iniciando seeding de la base de datos...')

  const now = new Date()
  const seedPoolId = 'pool_seed_trip_001'
  const seedPoolId2 = 'pool_seed_trip_002'

const targetDriverId = 'user_3EYQtdZpi4fPlmXGq4EKEa1onL0'

  const passengers = [
    { id: 'seed_user_shai_gilgeous-alexander', name: 'Shai Gilgeous-Alexander' },
    { id: 'seed_user_lebron_james', name: 'LeBron James' },
    { id: 'seed_user_nikola_jokic', name: 'Nikola Jokic' },
    { id: 'seed_user_carmelo_anthony', name: 'Carmelo Anthony' },
    { id: 'seed_user_luka_doncic', name: 'Luka Doncic' },
    { id: 'seed_user_stephen_curry', name: 'Stephen Curry' },
    { id: 'seed_user_donte_divincenzo', name: 'Donte Divincenzo' },
    { id: 'seed_user_jalen_brunson', name: 'Jalen Brunson' },
    { id: 'seed_user_donovan_mitchell', name: 'Donovan Mitchell' },
    { id: 'seed_user_zach_lavine', name: 'Zach Lavine' },
  ]

  const passengers2 = [
  { id: 'seed_user_kevin_durant', name: 'Kevin Durant' },
  { id: 'seed_user_russell_westbrook', name: 'Russell Westbrook' },
  { id: 'seed_user_james_harden', name: 'James Harden' },
  { id: 'seed_user_anthony_davis', name: 'Anthony Davis' },
  { id: 'seed_user_damian_lillard', name: 'Damian Lillard' },
  { id: 'seed_user_giannis_antetokounmpo', name: 'Giannis Antetokounmpo' },
  { id: 'seed_user_kyrie_irving', name: 'Kyrie Irving' },
  { id: 'seed_user_steve_nash', name: 'Steve Nash' },
  { id: 'seed_user_jason_williams', name: 'Jason Williams' },
  { id: 'seed_user_tim_duncan', name: 'Tim Duncan' },
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
// creamos un primer pool
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
// creamos un segundo pool con otros pasajeros para tener más datos de prueba
  for (const passenger of passengers2) {
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

  const seedReviewsPool2 = [
    { authorId: passengers2[0].id, rating: 5, comment: 'Excelente experiencia.' },
    { authorId: passengers2[1].id, rating: 4, comment: 'Muy buen viaje.' },
    { authorId: passengers2[2].id, rating: 5, comment: 'Todo perfecto.' },
    { authorId: passengers2[3].id, rating: 3, comment: 'Correcto.' },
    { authorId: passengers2[4].id, rating: 4, comment: 'Buen conductor.' },
    { authorId: passengers2[5].id, rating: 5, comment: 'Muy recomendable.' },
    { authorId: passengers2[6].id, rating: 4, comment: 'Muy conforme.' },
    { authorId: passengers2[7].id, rating: 5, comment: 'Excelente trato.' },
    { authorId: passengers2[8].id, rating: 3, comment: 'Sin inconvenientes.' },
    { authorId: passengers2[9].id, rating: 4, comment: 'Buen servicio.' },
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

  for (let i = 0; i < seedReviewsPool2.length; i++) {
    const review = seedReviewsPool2[i]

    await prisma.review.create({
      data: {
        id: `seed_review_trip2_${String(i + 1).padStart(3, '0')}`,
        pool_id: seedPoolId2,
        reservation_id: `seed_res_trip2_${String(i + 1).padStart(3, '0')}`,
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