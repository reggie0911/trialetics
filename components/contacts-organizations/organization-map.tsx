/**
 * Organization Map Component
 * Displays Google Maps location for an organization's address
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { Card } from '@/components/ui/card';
import { MapPin, AlertCircle } from 'lucide-react';

interface Address {
  street_1: string | null;
  street_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

interface OrganizationMapProps {
  organizationName: string;
  address?: Address;
  apiKey?: string;
}

/**
 * Main map wrapper component
 */
export function OrganizationMap({ organizationName, address, apiKey }: OrganizationMapProps) {
  const mapApiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  if (!mapApiKey) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-amber-600">
          <AlertCircle className="h-5 w-5" />
          <p className="text-xs md:text-xs">Google Maps API key not configured</p>
        </div>
      </Card>
    );
  }

  if (!address || !address.street_1) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <MapPin className="h-5 w-5" />
          <p className="text-xs md:text-xs">No address available to display on map</p>
        </div>
      </Card>
    );
  }

  const render = (status: Status) => {
    if (status === Status.LOADING) {
      return (
        <Card className="p-6 h-[200px] flex items-center justify-center">
          <p className="text-xs md:text-xs text-muted-foreground">Loading map...</p>
        </Card>
      );
    }
    if (status === Status.FAILURE) {
      return (
        <Card className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p className="text-xs md:text-xs">Failed to load Google Maps</p>
          </div>
        </Card>
      );
    }
    return <></>;
  };

  return (
    <Card className="overflow-hidden">
      <Wrapper apiKey={mapApiKey} render={render}>
        <MapComponent organizationName={organizationName} address={address} />
      </Wrapper>
    </Card>
  );
}

/**
 * Google Maps component
 */
function MapComponent({ organizationName, address }: { organizationName: string; address: Address }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [geocoder, setGeocoder] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);

  // Initialize map and geocoder
  useEffect(() => {
    if (!mapRef.current || map) return;

    const newMap = new (window as any).google.maps.Map(mapRef.current, {
      center: { lat: 40.7128, lng: -74.006 }, // Default to NYC
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    setMap(newMap);
    setGeocoder(new (window as any).google.maps.Geocoder());
  }, [map]);

  // Geocode address and add marker
  useEffect(() => {
    if (!map || !geocoder || !address) return;

    const addressString = formatAddressString(address);

    geocoder.geocode({ address: addressString }, (results: any, status: any) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;

        // Update map center
        map.setCenter(location);

        // Remove old marker if exists
        if (marker) {
          marker.setMap(null);
        }

        // Add new marker
        const newMarker = new (window as any).google.maps.Marker({
          map: map,
          position: location,
          title: organizationName,
        });

        // Info window
        const infoWindow = new (window as any).google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h3 style="font-weight: 600; margin-bottom: 4px;">${organizationName}</h3>
              <p style="font-size: 12px; color: #666;">${addressString}</p>
            </div>
          `,
        });

        newMarker.addListener('click', () => {
          infoWindow.open(map, newMarker);
        });

        setMarker(newMarker);
      } else {
        console.error('Geocoding failed:', status);
      }
    });
  }, [map, geocoder, address, organizationName]);

  return <div ref={mapRef} className="w-full h-[200px]" />;
}

/**
 * Helper to format address as string for geocoding
 */
function formatAddressString(address: Address): string {
  const parts = [
    address.street_1,
    address.street_2,
    address.city,
    address.state,
    address.postal_code,
    address.country,
  ].filter(Boolean);

  return parts.join(', ');
}
