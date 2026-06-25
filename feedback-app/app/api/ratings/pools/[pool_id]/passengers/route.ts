// API Externa consumida por la Driver App para obtener las calificaciones promedio de los pasajeros de un pool.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthHeaders } from '@/lib/auth-headers';

interface RiderAppPassengersResponse {
  pool_id: string;
  passengers: {
    reservation_id: string;
    passenger_user_id: string;
    passenger_name: string;
    reservation_status: string;
  }[];
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ pool_id: string }> }
) {
  try {
    const { pool_id } = await params;
    if (!pool_id || !pool_id.trim()) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Missing pool_id' }, { status: 400 });
    }

    let passengers: { passenger_user_id: string; passenger_name: string }[] = [];
    const useMock = process.env.USE_MOCK_PASSENGERS === 'true' || !process.env.RIDER_APP_API_URL;

    if (!useMock) {
      try {
        const url = `${process.env.RIDER_APP_API_URL}/api/pools/${pool_id}/passengers`;
        console.log(`Fetching passenger list from Rider App: ${url}`);
        const response = await fetch(url, { headers: getAuthHeaders() });
        if (!response.ok) {
          throw new Error(`Rider App responded with status: ${response.status}`);
        }
        const data: RiderAppPassengersResponse = await response.json();
        passengers = data.passengers || [];
      } catch (error) {
        console.error("Failed to fetch passenger list from Rider App, falling back to mock:", error);
        passengers = getMockPassengers();
      }
    } else {
      passengers = getMockPassengers();
    }

    if (passengers.length === 0) {
      return NextResponse.json({
        pool_id,
        ratings: []
      });
    }

    // Filtramos para obtener pasajeros únicos por ID
    const uniquePassengers: { passenger_user_id: string; passenger_name: string }[] = [];
    const seen = new Set<string>();
    for (const p of passengers) {
      if (!seen.has(p.passenger_user_id)) {
        seen.add(p.passenger_user_id);
        uniquePassengers.push({
          passenger_user_id: p.passenger_user_id,
          passenger_name: p.passenger_name
        });
      }
    }

    const passengerIds = uniquePassengers.map(p => p.passenger_user_id);

    // Obtenemos todas las reseñas completadas donde el destinatario es uno de los pasajeros y su rol es 'rider'
    const reviews = await prisma.review.findMany({
      where: {
        target_user_id: { in: passengerIds },
        target_role: 'rider',
        status: 'COMPLETED',
        rating: { not: null }
      },
      select: {
        target_user_id: true,
        rating: true
      }
    });

    // Agrupamos calificaciones por cada target_user_id
    const ratingsMap = new Map<string, { sum: number; count: number }>();
    reviews.forEach((review: { target_user_id: string; rating: number | null }) => {
      const current = ratingsMap.get(review.target_user_id) || { sum: 0, count: 0 };
      ratingsMap.set(review.target_user_id, {
        sum: current.sum + (review.rating || 0),
        count: current.count + 1
      });
    });

    const ratings = uniquePassengers.map(passenger => {
      const stats = ratingsMap.get(passenger.passenger_user_id);
      const average_rating = stats && stats.count > 0
        ? Number((stats.sum / stats.count).toFixed(1))
        : null;
      const total_reviews = stats ? stats.count : 0;

      return {
        passenger_user_id: passenger.passenger_user_id,
        passenger_name: passenger.passenger_name,
        average_rating,
        total_reviews
      };
    });

    return NextResponse.json({
      pool_id,
      ratings
    });

  } catch (error) {
    console.error('Error fetching ratings by pool:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch ratings' }, { status: 500 });
  }
}

function getMockPassengers() {
  return [
    {
      passenger_user_id: 'user_3EYGQCDMhqZaMRhMIgYvm46DK1P',
      passenger_name: 'Franco Gulino',
    },
    {
      passenger_user_id: 'user_rider_002',
      passenger_name: 'Pasajero de Prueba 2',
    },
    {
      passenger_user_id: 'user_rider_001',
      passenger_name: 'Pasajero de Prueba 3',
    },
    {
      passenger_user_id: 'user_rider_004',
      passenger_name: 'Pasajero de Prueba 4',
    },
    {
      passenger_user_id: 'user_rider_005',
      passenger_name: 'Pasajero de Prueba 5',
    }
  ];
}
