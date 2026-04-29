'use client';

import { SiteMap } from '@/components/ctms/sites/site-map';
import type { InstitutionRow } from '@/lib/types/directory';

export interface LocationCardProps {
  institution: InstitutionRow;
  /** Re-key on address changes to refresh the embedded map; passed in by the parent. */
  mapKey: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

/**
 * Right-rail Location surface.
 * Delegates to the existing `SiteMap` component which already renders its own
 * Card titled "Location & Nearby Places" with the map, airport, and hotel UI.
 */
export function LocationCard({ institution, mapKey, address, city, state, postalCode }: LocationCardProps) {
  return (
    <div id="location-card" className="contents">
      <SiteMap
        key={mapKey}
        siteName={institution.name}
        address={address}
        city={city}
        state={state}
        postalCode={postalCode}
        persistence={{ kind: 'institution', institutionId: institution.id }}
        savedAirport={{
          placeId: institution.nearest_airport_place_id ?? null,
          name: institution.nearest_airport_name ?? null,
          address: institution.nearest_airport_address ?? null,
        }}
        savedHotel={{
          placeId: institution.nearest_hotel_place_id ?? null,
          name: institution.nearest_hotel_name ?? null,
          address: institution.nearest_hotel_address ?? null,
        }}
        mapOnly
      />
    </div>
  );
}
