// Helper to fetch pool details from Driver App API
import { getAuthHeaders } from './auth-headers';

export interface PoolDetails {
  destinationName: string;
  departureTime: Date;
  driverName?: string;
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
        const res = await fetch(url, { headers: getAuthHeaders() });
        
        let destinationName = 'Polo Petroquímico (Simulado)';
        let departureTime = new Date();
        let driverName: string | undefined = undefined;

        if (res.ok) {
          const data = await res.json();
          destinationName = getDestinationName(data.destination_id);
          departureTime = new Date(data.departure_time);
        } else {
          console.warn(`Pool ${poolId} not found in Driver App (Status ${res.status}). Using fallback.`);
        }

        // Fetch driver info
        try {
          const driverUrl = `${driverAppUrl}/api/pools/${poolId}/assigned-driver`;
          console.log(`Fetching driver info from: ${driverUrl}`);
          const driverRes = await fetch(driverUrl, { headers: getAuthHeaders() });
          if (driverRes.ok) {
            const driverData = await driverRes.json();
            if (driverData.driver?.full_name) {
              driverName = driverData.driver.full_name;
            }
          }
        } catch (driverError) {
          console.error(`Failed to fetch driver info for pool ${poolId}:`, driverError);
        }

        details[poolId] = {
          destinationName,
          departureTime,
          driverName,
        };
      } catch (error) {
        console.error(`Failed to fetch pool details for ${poolId}:`, error);
        details[poolId] = {
          destinationName: 'Polo Petroquímico (Simulado)',
          departureTime: new Date(),
        };
      }
    })
  );

  return details;
}
