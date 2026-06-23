import 'dotenv/config'
import { prisma } from '../lib/prisma.js'

// Definición de conductores de WeShuttle
const seedDrivers = [
  { id: "user_3EYQtdZpi4fPlmXGq4EKEa1onL0", name: "Conductor de Prueba (Clerk)" },
  { id: "user_3EZBdD7n2UefoPdzP4FS1Unf864", name: "Juliana Pag" },
  { id: "user_3EJohyoiSblh2utnRB6SrnhumBH", name: "John Sebastien Bass" },
  { id: "user_driver_01", name: "Conductor de Prueba (user_driver_01)" },
  { id: "user_driver_02", name: "Pedro Picapiedra" },
  { id: "user_driver_03", name: "Pablo Mármol" }
]

// Pasajeros reales y de prueba del seed de Rider (Franco)
const francoPassengers = [
  {
    id: "cmqltaxps000004jmzfim60c8",
    clerk_user_id: "user_3EYQtdZpi4fPlmXGq4EKEa1onL0",
    full_name: "Juan Bassi",
    role: "driver" // Mantener su rol de conductor en feedback-app
  },
  {
    id: "cmqlx8ac9000404lbr1d2wqpb",
    clerk_user_id: "user_3Dwjs2tNYWJq2r3WfN06m9gm533",
    full_name: "Juan",
    role: "rider"
  },
  {
    id: "cmqn73h9l000004jpt5hylq5k",
    clerk_user_id: "user_3FQc2n3EzY9IuARMfRHIV6zL6LI",
    full_name: "Kevin Gomez",
    role: "rider"
  },
  {
    id: "cmqlgbvkw0000fey105sv0wor",
    clerk_user_id: "user_3EYGQCDMhqZaMRhMIgYvm46DK1P",
    full_name: "Juan Perez",
    role: "rider"
  },
  {
    id: "cmqnyzfh90000svy1bwymln5c",
    clerk_user_id: "user_3EYGNPDkh6Nqg38YBdCb0TeAdNi",
    full_name: "Franco Gulino",
    role: "admin" // Mantener su rol de admin en feedback-app
  },
  {
    id: "cmqlor03c000004l8hlvnss0i",
    clerk_user_id: "user_3Db8E5HISehCv1nAJkIwlHXxtiG",
    full_name: "Gulino Franco",
    role: "rider"
  },
  {
    id: "cmqlptvne000204l1ahzsve8j",
    clerk_user_id: "user_3EZBdD7n2UefoPdzP4FS1Unf864",
    full_name: "Santiago Lopez",
    role: "driver" // Mantener su rol de conductor en feedback-app
  }
]

// Mapeo de pools a conductores para que sean consistentes
const poolDriverMap: Record<string, string> = {
  'pool_lunes_1': 'user_3EYQtdZpi4fPlmXGq4EKEa1onL0',
  'pool_lunes_2': 'user_3EZBdD7n2UefoPdzP4FS1Unf864',
  'pool_viernes_1': 'user_3EJohyoiSblh2utnRB6SrnhumBH',
  'pool_viernes_2': 'user_driver_01',
  'pool_sabado_1': 'user_driver_02',
  'pool_sabado_2': 'user_3EYQtdZpi4fPlmXGq4EKEa1onL0',
  'pool_domingo_1': 'user_3EZBdD7n2UefoPdzP4FS1Unf864',
  'pool_domingo_2': 'user_3EJohyoiSblh2utnRB6SrnhumBH'
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
    "No encendió el aire acondicionado y hacía muchísimo calor.",
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
  } else if (passengerId === 'user_3Db8E5HISehCv1nAJkIwlHXxtiG' || passengerId === 'user_3FQc2n3EzY9IuARMfRHIV6zL6LI') {
    return { rating: goodRatings[rIdx], comment: goodComments[rIdx] }
  } else {
    // Pasajeros de comportamiento crítico (Juan, Juan Perez, Santiago Lopez)
    return { rating: badRatings[rIdx], comment: badComments[rIdx] }
  }
}

async function main() {
  console.log('🧹 Limpiando base de datos para el seed...')
  
  // Limpiamos únicamente datos de seed anteriores para mantener idempotencia
  await prisma.review.deleteMany({
    where: {
      id: {
        startsWith: 'seed_review_',
      },
    },
  })

  await prisma.ratingAverage.deleteMany()

  console.log('🌱 Inyectando conductores...')
  for (const drv of seedDrivers) {
    await prisma.user.upsert({
      where: { id: drv.id },
      update: { name: drv.name },
      create: {
        id: drv.id,
        name: drv.name,
        role: 'driver',
      },
    })
  }

  console.log('🌱 Inyectando pasajeros de WeShuttle...')
  for (const pass of francoPassengers) {
    await prisma.user.upsert({
      where: { id: pass.clerk_user_id },
      update: { name: pass.full_name },
      create: {
        id: pass.clerk_user_id,
        name: pass.full_name,
        role: pass.role as any,
      },
    })
  }

  // --- MANTENER PARTE DEL SEED ORIGINAL DE PRUEBA LOCAL ---
  console.log('🌱 Inyectando datos de prueba locales originales...')
  const now = new Date()
  const seedPoolId = 'pool_seed_trip_001'
  const seedPoolId2 = 'pool_seed_trip_002'
  const targetDriverId = 'user_3EYQtdZpi4fPlmXGq4EKEa1onL0'

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

  // --- INTEGRACIÓN DEL SEED CON PATRONES DE NEGOCIO Y VIAJES DE RIDER (Franco) ---
  console.log('🌱 Integrando 500 reservas y generando sus reseñas correspondientes...');
  
  const today = new Date()
  const passengerAssignments: { clerk_user_id: string; status: string; payment: string }[] = []

  // 1. Asignaciones Exitosas (360 en total)
  for (let i = 0; i < 110; i++) passengerAssignments.push({ clerk_user_id: "user_3EYGNPDkh6Nqg38YBdCb0TeAdNi", status: "CONFIRMED", payment: "PAID" })
  for (let i = 0; i < 100; i++) passengerAssignments.push({ clerk_user_id: "user_3Db8E5HISehCv1nAJkIwlHXxtiG", status: "CONFIRMED", payment: "PAID" })
  for (let i = 0; i < 60; i++) passengerAssignments.push({ clerk_user_id: "user_3FQc2n3EzY9IuARMfRHIV6zL6LI", status: "CONFIRMED", payment: "PAID" })

  for (let i = 0; i < 35; i++) passengerAssignments.push({ clerk_user_id: "user_3EYQtdZpi4fPlmXGq4EKEa1onL0", status: "CONFIRMED", payment: "PAID" })
  for (let i = 0; i < 20; i++) passengerAssignments.push({ clerk_user_id: "user_3EZBdD7n2UefoPdzP4FS1Unf864", status: "CONFIRMED", payment: "PAID" })
  for (let i = 0; i < 20; i++) passengerAssignments.push({ clerk_user_id: "user_3Dwjs2tNYWJq2r3WfN06m9gm533", status: "CONFIRMED", payment: "PAID" })
  for (let i = 0; i < 15; i++) passengerAssignments.push({ clerk_user_id: "user_3EYGQCDMhqZaMRhMIgYvm46DK1P", status: "CONFIRMED", payment: "PAID" })

  // 2. Asignaciones Canceladas (140 en total) - No generan reseñas reales
  for (let i = 0; i < 45; i++) passengerAssignments.push({ clerk_user_id: "user_3EYGQCDMhqZaMRhMIgYvm46DK1P", status: "CANCELED", payment: "PAID" })
  for (let i = 0; i < 38; i++) passengerAssignments.push({ clerk_user_id: "user_3EZBdD7n2UefoPdzP4FS1Unf864", status: "CANCELED", payment: "PAID" })
  for (let i = 0; i < 32; i++) passengerAssignments.push({ clerk_user_id: "user_3Dwjs2tNYWJq2r3WfN06m9gm533", status: "CANCELED", payment: "PAID" })
  for (let i = 0; i < 15; i++) passengerAssignments.push({ clerk_user_id: "user_3EYQtdZpi4fPlmXGq4EKEa1onL0", status: "CANCELED", payment: "PAID" })
  for (let i = 0; i < 10; i++) passengerAssignments.push({ clerk_user_id: "user_3FQc2n3EzY9IuARMfRHIV6zL6LI", status: "CANCELED", payment: "PAID" })

  const datesByDayOfWeek: Record<number, Date[]> = {
    0: [], // Domingo
    1: [], // Lunes
    2: [], // Martes
    3: [], // Miércoles
    4: [], // Jueves
    5: [], // Viernes
    6: []  // Sábado
  }

  for (let i = -14; i <= -1; i++) {
    const d = new Date()
    d.setDate(today.getDate() + i)
    const dayOfWeek = d.getDay()
    datesByDayOfWeek[dayOfWeek].push(d)
  }

  const targetDays: number[] = []
  for (let i = 0; i < 30; i++) targetDays.push(0)  // Domingo (30)
  for (let i = 0; i < 100; i++) targetDays.push(1) // Lunes (100)
  for (let i = 0; i < 50; i++) targetDays.push(2)  // Martes (50)
  for (let i = 0; i < 80; i++) targetDays.push(3)  // Miércoles (80)
  for (let i = 0; i < 30; i++) targetDays.push(4)  // Jueves (30)
  for (let i = 0; i < 120; i++) targetDays.push(5) // Viernes (120)
  for (let i = 0; i < 90; i++) targetDays.push(6)  // Sábado (90)

  // Mezclar de forma reproducible usando el hash simple de los IDs para consistencia
  const shuffledAssignments = [...passengerAssignments].sort((a, b) => {
    const hashA = (a.clerk_user_id + a.status).length % 7
    const hashB = (b.clerk_user_id + b.status).length % 7
    return hashA - hashB
  })

  let horaPicoCount = 0
  const pools = [
    'pool_lunes_1', 'pool_lunes_2', 'pool_viernes_1', 'pool_viernes_2',
    'pool_sabado_1', 'pool_sabado_2', 'pool_domingo_1', 'pool_domingo_2'
  ]

  const reviewsToCreate: any[] = []

  for (let index = 0; index < 500; index++) {
    const assignment = shuffledAssignments[index]

    // Solo creamos reseñas para viajes exitosos confirmados
    if (assignment.status !== "CONFIRMED") {
      continue
    }

    const assignedDay = targetDays[index]
    const datesList = datesByDayOfWeek[assignedDay]
    const dateObj = datesList[index % datesList.length]

    const reservationDate = new Date(dateObj)

    const limitDate = new Date()
    limitDate.setDate(today.getDate() + 6)
    const isLastDay = reservationDate.toDateString() === limitDate.toDateString()

    let horaLocal
    if (horaPicoCount < 130 && (assignedDay === 1 || assignedDay === 5 || assignedDay === 6) && !isLastDay) {
      horaLocal = 21 // 21:00 hs (hora pico)
      horaPicoCount++
    } else {
      const options = [8, 12, 17]
      horaLocal = options[index % options.length]
    }

    const year = reservationDate.getFullYear()
    const month = reservationDate.getMonth()
    const day = reservationDate.getDate()

    let departureTimeUTC: Date
    if (horaLocal === 21) {
      departureTimeUTC = new Date(Date.UTC(year, month, day + 1, 0, 0, 0))
    } else {
      departureTimeUTC = new Date(Date.UTC(year, month, day, horaLocal + 3, 0, 0))
    }

    const poolId = pools[index % pools.length]
    const driverId = poolDriverMap[poolId] || 'user_3EYQtdZpi4fPlmXGq4EKEa1onL0'
    const passengerId = assignment.clerk_user_id
    const reservationId = `res_seed_${index + 1}`

    // 80% de reseñas completadas de forma determinística
    const isCompleted = (index % 5 !== 0)

    if (isCompleted) {
      const riderReview = getRiderToDriverRatingAndComment(driverId, index)
      const driverReview = getDriverToRiderRatingAndComment(passengerId, index)

      // Reseña del Rider al Conductor
      reviewsToCreate.push({
        id: `seed_review_res_seed_${index + 1}_r2d`,
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
        id: `seed_review_res_seed_${index + 1}_d2r`,
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
      // Reseñas pendientes para simular el ciclo de vida real de WeShuttle
      reviewsToCreate.push({
        id: `seed_review_res_seed_${index + 1}_r2d_pending`,
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
        id: `seed_review_res_seed_${index + 1}_d2r_pending`,
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

  console.log('Seeding completado con éxito y consistencia de datos garantizada.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })