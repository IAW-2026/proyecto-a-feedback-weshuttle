import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Definimos una interfaz para el cuerpo de la solicitud,
// basándonos en el contrato de GEMINI.MD
interface PrecreateReviewRequestBody {
  pool_id: string;
  driver_user_id: string;
  driver_name?: string; // Agregamos esto para capturar el nombre del conductor
  force_test_dual_role?: boolean;
  started_at: string; // ISO 8601 string
}

// Definimos una interfaz para la respuesta mockeada de la Rider App,
// basándonos en el contrato de GEMINI.MD para GET /api/pools/:pool_id/passengers
interface MockRiderAppPassengersResponse {
  pool_id: string;
  passengers: {
    reservation_id: string;
    passenger_user_id: string;
    passenger_name: string;
    reservation_status: string; // "PAID"
    pickup_point: {
      address: string;
      lat: number;
      lng: number;
    };
    destination_id: string;
    departure_time: string;
    max_price: number;
    effective_price: number;
  }[];
}

export async function POST(req: Request) {
  try {
    const body: PrecreateReviewRequestBody = await req.json();
    const { pool_id, driver_user_id, driver_name, started_at } = body;

    if (!pool_id || !driver_user_id || !started_at) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Missing required fields' }, { status: 400 });
    }

    // 1. Mockear la llamada a la Rider App para obtener pasajeros pagados
    // En la Etapa 3, aquí harías un fetch real:
    // const riderAppResponse = await fetch(`${process.env.RIDER_APP_API_URL}/api/pools/${pool_id}/passengers?status=PAID`);
    // const riderAppData: MockRiderAppPassengersResponse = await riderAppResponse.json();

    // Datos mockeados para simular la respuesta de la Rider App
    // CONSEJO PARA ETAPA 3: Aquí es donde cambiarás este objeto por el fetch real.
    const mockRiderAppData: MockRiderAppPassengersResponse = {
      pool_id: pool_id,
      passengers: [
        {
          reservation_id: 'res_101',
          // Usando el ID de pasajero real proporcionado para testing
          passenger_user_id: 'user_3Dwjs2tNYWJq2r3WfN06m9gm533', 
          passenger_name: 'Juan Sebastian BASSI',
          reservation_status: 'PAID',
          pickup_point: { address: 'Av. Alem 1250', lat: -38.718, lng: -62.266 },
          destination_id: 'dest_polo_petroquimico',
          departure_time: '2026-06-10T08:00:00Z',
          max_price: 5000,
          effective_price: 3800,
        },
        {
          reservation_id: 'res_102',
          passenger_user_id: 'user_rider_002',
          passenger_name: 'Juan Ignacio Ibarra',
          reservation_status: 'PAID',
          pickup_point: { address: 'Sarmiento 850', lat: -38.713, lng: -62.261 },
          destination_id: 'dest_polo_petroquimico',
          departure_time: '2026-06-10T08:00:00Z',
          max_price: 5000,
          effective_price: 3800,
        },
        {
          reservation_id: 'res_103',
          passenger_user_id: 'user_rider_001',
          passenger_name: 'NPC 001',
          reservation_status: 'PAID',
          pickup_point: { address: 'Sarmiento 800', lat: -38.703, lng: -62.201 },
          destination_id: 'dest_polo_petroquimico',
          departure_time: '2026-06-10T08:00:00Z',
          max_price: 5000,
          effective_price: 3800,
        },
        {
          reservation_id: 'res_104',
          passenger_user_id: 'user_3EJohyoiSblh2utnRB6SrnhumBH', // Otro ID de usuario de Clerk
          passenger_name: 'John Sebastien',
          reservation_status: 'PAID',
          pickup_point: { address: 'Sarmiento 900', lat: -38.703, lng: -62.201 },
          destination_id: 'dest_polo_petroquimico',
          departure_time: '2026-06-10T08:00:00Z',
          max_price: 5000,
          effective_price: 3800,
        },
        {
          reservation_id: 'res_105',
          passenger_user_id: 'user_rider_005',
          passenger_name: 'NPC 005',
          reservation_status: 'PAID',
          pickup_point: { address: 'Sarmiento 800', lat: -38.703, lng: -62.201 },
          destination_id: 'dest_polo_petroquimico',
          departure_time: '2026-06-10T08:00:00Z',
          max_price: 5000,
          effective_price: 3800,
        }
      ],
    };

    const paidPassengers = mockRiderAppData.passengers.filter(p => p.reservation_status === 'PAID');
    let createdReviewsCount = 0;

    // CAPTURA: Asegurar que el conductor existe y actualizar su nombre si viene en el request
    await prisma.user.upsert({
      where: { id: driver_user_id },
      update: {
        name: driver_name // Si Juliana (Driver App) nos manda el nombre, lo guardamos/actualizamos
      },
      create: {
        id: driver_user_id,
        name: driver_name || "Conductor WeShuttle", 
        role: 'DRIVER',
      },
    });

    // Limpia una simulación previa para que el conteo arranque en cero
    await prisma.review.deleteMany({
      where: {
        author_user_id: driver_user_id,
        author_role: 'driver',
        status: {
          in: ['PRECREATED', 'PENDING'],
        },
      },
    });

    // 2. Pre-crear reseñas para cada pasajero pagado
    for (const passenger of paidPassengers) {
      // Asegurar que el pasajero existe en nuestra base de datos local
      await prisma.user.upsert({
        where: { id: passenger.passenger_user_id },
        update: { 
          name: passenger.passenger_name 
        },
        create: {
          id: passenger.passenger_user_id,
          name: passenger.passenger_name,
          role: 'PASSENGER',
        },
      });

      // Reseña del pasajero al conductor
      await prisma.review.create({
        data: {
          pool_id,
          reservation_id: passenger.reservation_id,
          author_user_id: passenger.passenger_user_id,
          author_role: 'rider',
          target_user_id: driver_user_id,
          target_role: 'driver',
          status: "PRECREATED",
          enabled_at: new Date(),
        },
      });
      createdReviewsCount++;

      // Reseña del conductor al pasajero
      await prisma.review.create({
        data: {
          pool_id,
          reservation_id: passenger.reservation_id,
          author_user_id: driver_user_id,
          author_role: 'driver',
          target_user_id: passenger.passenger_user_id,
          target_role: 'rider',
          status: "PRECREATED",
          enabled_at: new Date(),
        },
      });
      createdReviewsCount++;
    }

    // 3. Devolver la respuesta según el contrato
    return NextResponse.json({
      pool_id,
      review_status: 'PRECREATED',
      paid_passengers_count: paidPassengers.length,
      created_reviews: createdReviewsCount,
    }, { status: 201 });

  } catch (error) {
    console.error('Error pre-creating reviews:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message: 'Failed to pre-create reviews' }, { status: 500 });
  }
}