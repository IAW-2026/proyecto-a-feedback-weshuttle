import 'dotenv/config'
import { prisma } from '../lib/prisma.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Helper para remapear los Clerk User IDs de la base de datos de WeShuttle
// para que coincidan con la traducción de ID que hace la aplicación en login (current-user.ts)
function mapClerkUserId(id: string): string {
  if (id === "user_3Db8E5HISehCv1nAJkIwlHXxtiG") {
    return "user_3EYGQCDMhqZaMRhMIgYvm46DK1P"
  }
  return id
}

// 1. Mapeo completo de Conductores (ID interno en Driver App -> Clerk ID y Nombre)
const driverMapping: Record<string, { clerk: string; name: string }> = {
  'drv_juliana_01': { clerk: 'user_3EZoK6pR0SB0EYHvCh3rpEcbNWT', name: 'Juliana Pagani' },
  'drv_carlos_02': { clerk: 'user_driver_01', name: 'Carlos Gómez' },
  'drv_pedro_03': { clerk: 'user_driver_02', name: 'Pedro Picapiedra' },
  'drv_john_04': { clerk: 'user_3EJohyoiSblh2utnRB6SrnhumBH', name: 'John Sebastien Bass' },
  'drv_juan_05': { clerk: 'user_3EYQtdZpi4fPlmXGq4EKEa1onL0', name: 'Juan Lopez' },
  'drv_juliana_pag': { clerk: 'user_3EZBdD7n2UefoPdzP4FS1Unf864', name: 'Juliana Pag' },
  'drv_nicolas_gonzalez': { clerk: 'user_3FNQPo24yXJr7Pc39XREgbA1lfY', name: 'Nicolas Gonzalez' },
  'drv_pendiente': { clerk: 'user_clerk_driver_pendiente_999', name: 'Carlos Gómez (Chofer Pendiente)' },
  'drv_rechazado': { clerk: 'user_clerk_driver_rechazado_000', name: 'Esteban Quito (Rechazado)' }
}

const additionalNames = [
  'Sofia Rodriguez', 'Mateo Gimenez', 'Valentina Perez', 'Lucas Silva',
  'Martina Diaz', 'Thiago Gonzalez', 'Maria Alvarez', 'Bautista Romero',
  'Zoe Fernandez', 'Joaquin Ruiz', 'Camila Gomez', 'Benjamin Ledesma',
  'Catalina Herrera', 'Felipe Medina', 'Isabella Castro', 'Juan Morales'
]

for (let i = 0; i < additionalNames.length; i++) {
  const num = i + 6
  const driverId = `drv_gen_${num.toString().padStart(2, '0')}`
  const clerkId = `user_gen_driver_${num.toString().padStart(2, '0')}`
  driverMapping[driverId] = { clerk: clerkId, name: additionalNames[i] }
}

// Helpers para obtener calificación y comentarios determinísticos de Rider a Conductor
function getRiderToDriverRatingAndComment(driverId: string, index: number) {
  const excellentRatings = [5, 5, 5, 5, 5, 4, 5, 5, 5, 4]
  const excellentComments = [
    "Excelente viaje, muy puntual y amable.",
    "Todo excelente, de primera el servicio.",
    "Muy buena onda el chofer y manejo excelente.",
    "El mejor pool de WeShuttle, impecable.",
    "Viaje súper tranquilo y rápido.",
    "Muy buen viaje, puntual y cómodo.",
    "Súper recomendable, chofer muy profesional.",
    "Excelente servicio, todo de diez.",
    "Muy buena experiencia, volveré a reservar.",
    "Llegamos a tiempo, el chofer maneja muy bien."
  ]

  const goodRatings = [4, 5, 4, 5, 5, 4, 4, 5, 4, 5]
  const goodComments = [
    "Buen viaje, llegó a tiempo.",
    "Todo en orden, correcto.",
    "Viaje agradable y sin contratiempos.",
    "Manejo seguro, buena experiencia.",
    "Muy amable el chofer, viaje cómodo.",
    "Recomendable, puntual y educado.",
    "Todo bien, cumplió con el horario.",
    "Excelente trato, vehículo limpio.",
    "Buena experiencia de traslado.",
    "Muy puntual y atento a las rutas."
  ]

  const badRatings = [1, 2, 1, 2, 3, 1, 2, 1, 2, 2]
  const badComments = [
    "Pésimo servicio. El conductor fue maleducado y llegó tardísimo.",
    "El conductor venía manejando muy rápido y brusco.",
    "Inaceptable, el vehículo estaba en malas condiciones y hubo mal trato.",
    "Demasiado retraso en la salida, mala organización.",
    "No me sentí seguro en el viaje por maniobras bruscas.",
    "El chofer fue descortés al hacer preguntas personales.",
    "Llegamos tarde al destino por desvíos innecesarios.",
    "No me sentí seguro al viajar debido a las velocidades elevadas.",
    "Mala actitud del conductor ante una consulta sobre la ruta.",
    "El viaje fue muy estresante por el estilo de conducción."
  ]

  const averageRatings = [3, 4, 3, 4, 5, 3, 4, 4, 3, 4]
  const averageComments = [
    "El viaje estuvo bien, pero se demoró un poco.",
    "Aceptable, aunque se podría mejorar la limpieza.",
    "Cumplió con el trayecto, nada especial.",
    "Buen trato, pero el auto no era muy cómodo.",
    "Llegó a horario, manejo un poco rápido.",
    "Normal, servicio promedio.",
    "Bien en general, pero hubo falta de comunicación.",
    "Cómodo y a tiempo, gracias.",
    "El viaje fue correcto, pero demoró la partida.",
    "Buena atención, auto aceptable."
  ]

  const rIdx = index % 10
  // Mapeamos el clerk ID para decidir el tono de la reseña
  if (driverId === 'user_3EYQtdZpi4fPlmXGq4EKEa1onL0') {
    return { rating: excellentRatings[rIdx], comment: excellentComments[rIdx] }
  } else if (driverId === 'user_3EZBdD7n2UefoPdzP4FS1Unf864') {
    return { rating: goodRatings[rIdx], comment: goodComments[rIdx] }
  } else if (driverId === 'user_3EJohyoiSblh2utnRB6SrnhumBH' || driverId === 'user_driver_01') {
    return { rating: badRatings[rIdx], comment: badComments[rIdx] }
  } else {
    return { rating: averageRatings[rIdx], comment: averageComments[rIdx] }
  }
}

// Helpers para obtener calificación y comentarios determinísticos de Conductor a Rider
function getDriverToRiderRatingAndComment(passengerId: string, index: number) {
  const excellentRatings = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
  const excellentComments = [
    "Pasajero excelente, muy puntual.",
    "Muy respetuoso y educado.",
    "Excelente comportamiento durante el viaje.",
    "Viaje sin inconvenientes, de diez.",
    "Súper puntual y muy amable.",
    "Un gusto llevar a este pasajero.",
    "Viajó tranquilo y respetó las normas del vehículo.",
    "Muy buena predisposición al subir.",
    "Comunicación clara y puntualidad perfecta.",
    "Recomendado, excelente pasajero."
  ]

  const goodRatings = [4, 5, 4, 5, 5, 4, 4, 5, 4, 5]
  const goodComments = [
    "Buen pasajero, puntual.",
    "Respetuoso y amable.",
    "Todo bien durante el trayecto.",
    "Viaje correcto y sin problemas.",
    "Llegó a horario, educado.",
    "Correcto comportamiento.",
    "Buen trato y puntualidad aceptable.",
    "Sin inconvenientes en el traslado.",
    "Amable y respetuoso.",
    "Buen pasajero corporativo."
  ]

  const badRatings = [1, 2, 1, 2, 3, 1, 2, 1, 2, 2]
  const badComments = [
    "Falta de respeto al conductor y a otros pasajeros.",
    "Muy impuntual, demoró la salida del pool.",
    "Comportamiento inaceptable, tiró basura en la combi.",
    "Muy conflictivo durante todo el recorrido.",
    "Llegó tarde e ingresó al vehículo de mala gana.",
    "No respetó las normas de seguridad del traslado.",
    "Hizo esperar al grupo más de 10 minutos.",
    "Actitud prepotente hacia el chofer.",
    "Conversación incómoda e irrespetuosa.",
    "Casi perdemos el horario por su tardanza."
  ]

  const rIdx = index % 10
  if (passengerId === 'user_3EYGNPDkh6Nqg38YBdCb0TeAdNi' || passengerId === 'user_3EYQtdZpi4fPlmXGq4EKEa1onL0') {
    return { rating: excellentRatings[rIdx], comment: excellentComments[rIdx] }
  } else if (passengerId === 'user_3Db8E5HISehCv1nAJkIwlHXxtiG' || passengerId === 'user_3EYGQCDMhqZaMRhMIgYvm46DK1P' || passengerId === 'user_3FQc2n3EzY9IuARMfRHIV6zL6LI') {
    return { rating: goodRatings[rIdx], comment: goodComments[rIdx] }
  } else {
    // Pasajeros de comportamiento crítico (Juan, Juan Perez, Santiago Lopez)
    return { rating: badRatings[rIdx], comment: badComments[rIdx] }
  }
}

async function main() {
  console.log('🌱 Iniciando la precarga de datos (Seeding) consistente desde seed-manifest.json...')

  // 1. Lectura del seed-manifest.json
  let manifestPath = path.join(__dirname, '../../seed-manifest.json')
  if (!fs.existsSync(manifestPath)) {
    manifestPath = path.join(__dirname, '../seed-manifest.json')
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`No se encontró el archivo seed-manifest.json en la ruta: ${manifestPath}`)
    }
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const { passengers = [], reservations = [] } = manifest

  console.log(`📖 Manifiesto leído: ${passengers.length} pasajeros, ${reservations.length} reservas.`)

  // 2. Limpieza total de la base de datos (con orden estricto de claves foráneas)
  console.log('🧹 Limpiando base de datos para el seed...')
  await prisma.report.deleteMany({})
  await prisma.review.deleteMany({})
  await prisma.ratingAverage.deleteMany({})
  await prisma.user.deleteMany({})
  console.log('🗑️ Base de datos limpia.')

  // 3. Creación/Upsert de Conductores en la tabla User de Feedback App
  console.log('🌱 Creando conductores...')
  for (const driverId of Object.keys(driverMapping)) {
    const details = driverMapping[driverId]
    const clerkId = mapClerkUserId(details.clerk)
    await prisma.user.upsert({
      where: { id: clerkId },
      update: { name: details.name, role: 'driver' },
      create: {
        id: clerkId,
        name: details.name,
        role: 'driver',
      }
    })
  }
  console.log(`👤 Conductores creados (${Object.keys(driverMapping).length} en total).`)

  // 4. Creación/Upsert de Pasajeros de WeShuttle
  console.log('🌱 Creando pasajeros de WeShuttle...')
  for (const pass of passengers) {
    const clerkId = mapClerkUserId(pass.clerk_user_id)
    let role = 'rider'
    if (clerkId === 'user_3EYQtdZpi4fPlmXGq4EKEa1onL0') {
      role = 'driver' // Juan Lopez
    } else if (clerkId === 'user_3EZBdD7n2UefoPdzP4FS1Unf864') {
      role = 'driver' // Juliana Pag
    } else if (clerkId === 'user_3EYGNPDkh6Nqg38YBdCb0TeAdNi') {
      role = 'admin'  // Franco Gulino
    }

    // Usamos upsert por si ya existía en la lista de conductores
    await prisma.user.upsert({
      where: { id: clerkId },
      update: { name: pass.full_name, role: role as any },
      create: {
        id: clerkId,
        name: pass.full_name,
        role: role as any,
      }
    })
  }
  console.log(`👤 Pasajeros mapeados y creados.`)

  // --- MANTENER PARTE DEL SEED ORIGINAL DE PRUEBA LOCAL ---
  console.log('🌱 Inyectando datos de prueba locales originales...')
  const now = new Date()
  const seedPoolId = 'pool_seed_trip_001'
  const seedPoolId2 = 'pool_seed_trip_002'
  const targetDriverId = mapClerkUserId('user_3EYQtdZpi4fPlmXGq4EKEa1onL0')

  const originalPassengers = [
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

  const originalPassengers2 = [
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

  for (const passenger of originalPassengers) {
    await prisma.user.upsert({
      where: { id: passenger.id },
      update: { name: passenger.name },
      create: {
        id: passenger.id,
        name: passenger.name,
        role: 'rider',
      },
    })
  }

  for (const passenger of originalPassengers2) {
    await prisma.user.upsert({
      where: { id: passenger.id },
      update: { name: passenger.name },
      create: {
        id: passenger.id,
        name: passenger.name,
        role: 'rider',
      },
    })
  }

  const originalSeedReviews = [
    { authorId: originalPassengers[0].id, rating: 5, comment: 'Muy mala experiencia, hubo demoras y desorganización.' },
    { authorId: originalPassengers[1].id, rating: 5, comment: 'No me sentí cómodo durante el viaje, faltó atención.' },
    { authorId: originalPassengers[2].id, rating: 5, comment: 'El viaje cumplió, pero hubo varios puntos a mejorar.' },
    { authorId: originalPassengers[3].id, rating: 4, comment: 'Regular: aceptable, aunque con retrasos y poca comunicación.' },
    { authorId: originalPassengers[4].id, rating: 5, comment: 'Experiencia promedio, sin mayores problemas ni destacables.' },
    { authorId: originalPassengers[5].id, rating: 5, comment: 'Correcto y en línea con lo esperado para el trayecto.' },
    { authorId: originalPassengers[6].id, rating: 5, comment: 'Muy buen viaje, puntual y con buen trato.' },
    { authorId: originalPassengers[7].id, rating: 4, comment: 'Casi excelente, manejo seguro y comunicación clara.' },
    { authorId: originalPassengers[8].id, rating: 5, comment: 'Excelente servicio, todo perfecto de principio a fin.' },
    { authorId: originalPassengers[9].id, rating: 5, comment: 'Viaje impecable, súper recomendable.' },
  ]

  const originalSeedReviewsPool2 = [
    { authorId: originalPassengers2[0].id, rating: 5, comment: 'Excelente experiencia.' },
    { authorId: originalPassengers2[1].id, rating: 4, comment: 'Muy buen viaje.' },
    { authorId: originalPassengers2[2].id, rating: 5, comment: 'Todo perfecto.' },
    { authorId: originalPassengers2[3].id, rating: 5, comment: 'Correcto.' },
    { authorId: originalPassengers2[4].id, rating: 4, comment: 'Buen conductor.' },
    { authorId: originalPassengers2[5].id, rating: 5, comment: 'Muy recomendable.' },
    { authorId: originalPassengers2[6].id, rating: 5, comment: 'Muy conforme.' },
    { authorId: originalPassengers2[7].id, rating: 5, comment: 'Excelente trato.' },
    { authorId: originalPassengers2[8].id, rating: 5, comment: 'Sin inconvenientes.' },
    { authorId: originalPassengers2[9].id, rating: 5, comment: 'Buen servicio.' },
  ]

  for (let i = 0; i < originalSeedReviews.length; i++) {
    const review = originalSeedReviews[i]
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

  for (let i = 0; i < originalSeedReviewsPool2.length; i++) {
    const review = originalSeedReviewsPool2[i]
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

  // 5. Creación de los Pools Únicos y Mapeo de Reservas
  const confirmedReservations = reservations.filter(
    (r: any) => r.pool_id && r.reservation_status === 'CONFIRMED'
  )

  const reservationsByPool: Record<string, any[]> = {}
  for (const r of confirmedReservations) {
    if (!reservationsByPool[r.pool_id]) {
      reservationsByPool[r.pool_id] = []
    }
    reservationsByPool[r.pool_id].push(r)
  }

  const poolIds = Object.keys(reservationsByPool)
  console.log(`🚌 Procesando ${poolIds.length} pools confirmados para asignar conductores...`)

  // Choferes y vehículos activos para la distribución (Exactamente igual que el Driver App)
  const juanDriver = { driver_id: 'drv_juan_05' }
  const eligibleOtherDrivers = [
    { driver_id: 'drv_juliana_01' },
    { driver_id: 'drv_carlos_02' },
    { driver_id: 'drv_pedro_03' },
    { driver_id: 'drv_john_04' },
    { driver_id: 'drv_juliana_pag' },
    { driver_id: 'drv_nicolas_gonzalez' }
  ]

  for (let i = 0; i < 13; i++) {
    const num = i + 6
    eligibleOtherDrivers.push({ driver_id: `drv_gen_${num.toString().padStart(2, '0')}` })
  }

  const poolDriverMap = new Map<string, string>() // pool_id -> driver clerk ID
  let juanPoolsCount = 0

  for (let idx = 0; idx < poolIds.length; idx++) {
    const poolId = poolIds[idx]
    let assignedDriverId
    if (idx % 10 === 0 && juanPoolsCount < 30) {
      assignedDriverId = juanDriver.driver_id
      juanPoolsCount++
    } else {
      const otherIdx = (idx - juanPoolsCount) % eligibleOtherDrivers.length
      assignedDriverId = eligibleOtherDrivers[otherIdx].driver_id
    }

    const details = driverMapping[assignedDriverId]
    poolDriverMap.set(poolId, details ? mapClerkUserId(details.clerk) : mapClerkUserId('user_3EYQtdZpi4fPlmXGq4EKEa1onL0'))
  }

  // 6. Generación de reseñas consistentes para las reservas
  console.log(`🌱 Integrando ${confirmedReservations.length} reservas del manifiesto y generando sus reseñas en Feedback App...`)
  const reviewsToCreate: any[] = []

  for (let index = 0; index < confirmedReservations.length; index++) {
    const r = confirmedReservations[index]
    const poolId = r.pool_id
    const passengerId = mapClerkUserId(r.passenger_user_id)
    const driverId = poolDriverMap.get(poolId) || mapClerkUserId('user_3EYQtdZpi4fPlmXGq4EKEa1onL0')
    const reservationId = r.id
    const departureTimeUTC = new Date(r.departure_time)

    // 80% de reseñas completadas de forma determinística
    const isCompleted = (index % 5 !== 0)

    if (isCompleted) {
      const riderReview = getRiderToDriverRatingAndComment(driverId, index)
      const driverReview = getDriverToRiderRatingAndComment(passengerId, index)

      // Reseña del Rider al Conductor
      reviewsToCreate.push({
        id: `seed_review_${reservationId}_r2d`,
        pool_id: poolId,
        reservation_id: reservationId,
        author_user_id: passengerId,
        author_role: 'rider',
        target_user_id: driverId,
        target_role: 'driver',
        status: 'COMPLETED',
        rating: riderReview.rating,
        comment: riderReview.comment,
        enabled_at: departureTimeUTC,
        completed_at: departureTimeUTC,
      })

      // Reseña del Conductor al Rider
      reviewsToCreate.push({
        id: `seed_review_${reservationId}_d2r`,
        pool_id: poolId,
        reservation_id: reservationId,
        author_user_id: driverId,
        author_role: 'driver',
        target_user_id: passengerId,
        target_role: 'rider',
        status: 'COMPLETED',
        rating: driverReview.rating,
        comment: driverReview.comment,
        enabled_at: departureTimeUTC,
        completed_at: departureTimeUTC,
      })
    } else {
      // Reseñas pendientes
      reviewsToCreate.push({
        id: `seed_review_${reservationId}_r2d_pending`,
        pool_id: poolId,
        reservation_id: reservationId,
        author_user_id: passengerId,
        author_role: 'rider',
        target_user_id: driverId,
        target_role: 'driver',
        status: 'PENDING',
        enabled_at: departureTimeUTC,
      })

      reviewsToCreate.push({
        id: `seed_review_${reservationId}_d2r_pending`,
        pool_id: poolId,
        reservation_id: reservationId,
        author_user_id: driverId,
        author_role: 'driver',
        target_user_id: passengerId,
        target_role: 'rider',
        status: 'PENDING',
        enabled_at: departureTimeUTC,
      })
    }
  }

  await prisma.review.createMany({
    data: reviewsToCreate
  })

  console.log(`✅ Inyectadas ${reviewsToCreate.length} reseñas asociadas a las reservas del seed de Rider.`)

  // --- CALCULAR Y GUARDAR PROMEDIOS EN RATINGAVERAGE ---
  console.log('📈 Actualizando promedios de calificación (RatingAverage)...')
  const allCompletedReviews = await prisma.review.findMany({
    where: {
      status: 'COMPLETED',
      rating: { not: null }
    }
  })

  const averagesMap = new Map<string, { sum: number; count: number }>()
  for (const rev of allCompletedReviews) {
    const key = `${rev.target_user_id}:::${rev.target_role}`
    const current = averagesMap.get(key) || { sum: 0, count: 0 }
    averagesMap.set(key, {
      sum: current.sum + rev.rating!,
      count: current.count + 1
    })
  }

  for (const [key, val] of averagesMap.entries()) {
    const [userId, role] = key.split(':::')
    const avg = Number((val.sum / val.count).toFixed(1))

    await prisma.ratingAverage.upsert({
      where: {
        user_id_role: {
          user_id: userId,
          role: role as any
        }
      },
      update: {
        average_rating: avg,
        total_reviews: val.count
      },
      create: {
        user_id: userId,
        role: role as any,
        average_rating: avg,
        total_reviews: val.count
      }
    })
  }

  console.log('🎉 Seeding completado con éxito y consistencia de datos garantizada con el manifiesto.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })