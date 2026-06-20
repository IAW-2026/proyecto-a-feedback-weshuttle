// Helper to fetch pool details from Driver App API
export interface PoolDetails {
  destinationName: string;
  departureTime: Date;
}

export function getDestinationName(destinationId: string | null | undefined): string {
  if (!destinationId) return 'Polo Petroquímico';
  const mapping: Record<string, string> = {
    'dest_polo_petroquimico': 'Polo Petroquímico',
    'dest_puerto_white': 'Puerto de Ingeniero White',
    'dest_parque_industrial': 'Parque Industrial'
  };
  return mapping[destinationId] || destinationId;
}

export async function getPoolDetailsMap(poolIds: string[]): Promise<Record<string, PoolDetails>> {
  const driverAppUrl = process.env.DRIVER_APP_API_URL || process.env.NEXT_PUBLIC_DRIVER_APP_URL || "https://proyecto-a-driver2-weshuttle.vercel.app";
  const details: Record<string, PoolDetails> = {};

  if (poolIds.length === 0) return details;

  // Deduplicate poolIds to avoid redundant requests
  const uniquePoolIds = Array.from(new Set(poolIds));

  await Promise.all(
    uniquePoolIds.map(async (poolId) => {
      try {
        const url = `${driverAppUrl}/api/pools/${poolId}/status`;
        console.log(`Fetching pool status from: ${url}`);
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          details[poolId] = {
            destinationName: getDestinationName(data.destination_id),
            departureTime: new Date(data.departure_time),
          };
        } else {
          throw new Error(`HTTP error ${res.status}`);
        }
      } catch (error) {
        console.error(`Failed to fetch pool details for ${poolId}:`, error);
        // Fallback to a mock/simulated date and destination to keep development resilient
        details[poolId] = {
          destinationName: 'Polo Petroquímico (Simulado)',
          departureTime: new Date(),
        };
      }
    })
  );

  return details;
}
