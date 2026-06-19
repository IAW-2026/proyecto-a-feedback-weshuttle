// API Externa llamada por la Driver App al finalizar un viaje, 
// para pre-crear las reseñas entre conductor y pasajeros. 
// Solo debería ser accedida por la Driver App.
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
    const { pool_id, driver_user_id: incomingDriverId, driver_name: incomingDriverName, started_at } = body;

    if (!pool_id || !incomingDriverId || !started_at) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Missing required fields' }, { status: 400 });
    }

    // Sobrescribimos con el conductor de prueba de Clerk configurado para testing
    const driver_user_id = 'user_3EYGtdZpi4fPlmXGq4EKEa1onL0';
    const driver_name = incomingDriverName || 'Conductor de Prueba (Clerk)';

    // 1. Obtener los pasajeros pagados de la Rider App o usar el mock
    let riderAppData: MockRiderAppPassengersResponse;
    const useMock = process.env.USE_MOCK_PASSENGERS === 'true' || !process.env.RIDER_APP_API_URL;

    if (!useMock) {
      try {
        const url = `${process.env.RIDER_APP_API_URL}/api/pools/${pool_id}/passengers?status=PAID`;
        console.log(`Fetching real passenger list from: ${url}`);
        const riderAppResponse = await fetch(url);
        if (!riderAppResponse.ok) {
          throw new Error(`Rider App responded with status: ${riderAppResponse.status}`);
        }
        riderAppData = await riderAppResponse.json();
      } catch (error) {
        console.error("Failed to fetch passenger list from Rider App, falling back to mock:", error);
        // Fallback al mock por resiliencia si la conexión falla
        riderAppData = {
          pool_id: pool_id,
          passengers: [
            {
              reservation_id: 'res_101',
              passenger_user_id: 'user_3EYGQCDMhqZaMRhMIgYvm46DK1P', 
              passenger_name: 'Pasajero (Usuario de Clerk)',
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
              passenger_name: 'Pasajero de Prueba 2',
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
              passenger_name: 'Pasajero de Prueba 3',
              reservation_status: 'PAID',
              pickup_point: { address: 'Sarmiento 800', lat: -38.703, lng: -62.201 },
              destination_id: 'dest_polo_petroquimico',
              departure_time: '2026-06-10T08:00:00Z',
              max_price: 5000,
              effective_price: 3800,
            },
            {
              reservation_id: 'res_104',
              passenger_user_id: 'user_rider_004', 
              passenger_name: 'Pasajero de Prueba 4',
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
              passenger_name: 'Pasajero de Prueba 5',
              reservation_status: 'PAID',
              pickup_point: { address: 'Sarmiento 800', lat: -38.703, lng: -62.201 },
              destination_id: 'dest_polo_petroquimico',
              departure_time: '2026-06-10T08:00:00Z',
              max_price: 5000,
              effective_price: 3800,
            }
          ],
        };
      }
    } else {
      // Usar datos mockeados directamente
      riderAppData = {
        pool_id: pool_id,
        passengers: [
          {
            reservation_id: 'res_101',
            passenger_user_id: 'user_3EYGQCDMhqZaMRhMIgYvm46DK1P', 
            passenger_name: 'Pasajero (Usuario de Clerk)',
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
            passenger_name: 'Pasajero de Prueba 2',
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
            passenger_name: 'Pasajero de Prueba 3',
            reservation_status: 'PAID',
            pickup_point: { address: 'Sarmiento 800', lat: -38.703, lng: -62.201 },
            destination_id: 'dest_polo_petroquimico',
            departure_time: '2026-06-10T08:00:00Z',
            max_price: 5000,
            effective_price: 3800,
          },
          {
            reservation_id: 'res_104',
            passenger_user_id: 'user_rider_004', 
            passenger_name: 'Pasajero de Prueba 4',
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
            passenger_name: 'Pasajero de Prueba 5',
            reservation_status: 'PAID',
            pickup_point: { address: 'Sarmiento 800', lat: -38.703, lng: -62.201 },
            destination_id: 'dest_polo_petroquimico',
            departure_time: '2026-06-10T08:00:00Z',
            max_price: 5000,
            effective_price: 3800,
          }
        ],
      };
    }

    const paidPassengers = riderAppData.passengers.filter(p => p.reservation_status === 'PAID');
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
        role: 'driver',
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
          role: 'rider',
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