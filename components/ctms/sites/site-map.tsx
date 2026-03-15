'use client';

import { useEffect, useRef, useState, useCallback, useTransition } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { MapPin, Plane, Hotel, Loader2, ExternalLink, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { updateSite } from '@/lib/actions/sites';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export interface NearbyPlace {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  photoUrl?: string;
  lat: number;
  lng: number;
}

export interface DirectionsInfo {
  duration: string;
  distance: string;
}

export interface SiteMapProps {
  siteName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  siteId: string;
  studyId: string;
  savedAirport: { placeId: string | null; name: string | null; address: string | null } | null;
  savedHotel: { placeId: string | null; name: string | null; address: string | null } | null;
  onGeocode?: (lat: number, lng: number) => void;
  onNearbyResults?: (airports: NearbyPlace[], hotels: NearbyPlace[]) => void;
  onDirections?: (type: 'airport' | 'hotel', info: DirectionsInfo) => void;
  airportDirections?: DirectionsInfo | null;
  hotelDirections?: DirectionsInfo | null;
  selectedAirportId?: string | null;
  selectedHotelId?: string | null;
  onSelectAirport?: (place: NearbyPlace) => void;
  onSelectHotel?: (place: NearbyPlace) => void;
  showAirports?: boolean;
  showHotels?: boolean;
}

function buildAddressQuery(
  address: string | null,
  city: string | null,
  state: string | null,
  postalCode: string | null
): string {
  return [address, city, state, postalCode].filter(Boolean).join(', ');
}

interface InnerMapProps {
  siteName: string;
  addressQuery: string;
  onGeocode?: (lat: number, lng: number) => void;
  onMapReady?: (map: google.maps.Map, siteLocation: google.maps.LatLng) => void;
}

function InnerMap({ siteName, addressQuery, onGeocode, onMapReady }: InnerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const onGeocodeRef = useRef(onGeocode);
  const onMapReadyRef = useRef(onMapReady);
  const [error, setError] = useState(false);

  onGeocodeRef.current = onGeocode;
  onMapReadyRef.current = onMapReady;

  useEffect(() => {
    if (!mapRef.current || !window.google || initializedRef.current) return;
    initializedRef.current = true;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: addressQuery }, (results, status) => {
      if (status !== 'OK' || !results || results.length === 0) {
        setError(true);
        return;
      }

      const location = results[0].geometry.location;
      onGeocodeRef.current?.(location.lat(), location.lng());

      const map = new window.google.maps.Map(mapRef.current!, {
        center: location,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      });

      const marker = new window.google.maps.Marker({
        position: location,
        map,
        title: siteName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;padding:4px 2px"><strong>${siteName}</strong><br/><span style="color:#666;font-size:12px">${addressQuery}</span></div>`,
      });

      infoWindow.open(map, marker);
      marker.addListener('click', () => infoWindow.open(map, marker));

      onMapReadyRef.current?.(map, location);
    });
  }, [addressQuery, siteName]);

  if (error) {
    return (
      <div className="w-full h-full min-h-[288px] flex flex-col items-center justify-center gap-2 bg-muted/30 rounded-lg border border-dashed">
        <MapPin className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Location could not be found on map</p>
        <p className="text-xs text-muted-foreground">{addressQuery}</p>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full min-h-[288px] rounded-lg" />;
}

function MapLoadingState() {
  return (
    <div className="w-full h-full min-h-[288px] flex items-center justify-center bg-muted/30 rounded-lg border animate-pulse">
      <p className="text-sm text-muted-foreground">Loading map...</p>
    </div>
  );
}

function MapErrorState() {
  return (
    <div className="w-full h-full min-h-[288px] flex flex-col items-center justify-center gap-2 bg-muted/30 rounded-lg border border-dashed">
      <MapPin className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">Map unavailable</p>
    </div>
  );
}

function PlaceDetail({
  place,
  type,
  directions,
}: {
  place: NearbyPlace | null;
  type: 'airport' | 'hotel';
  directions?: DirectionsInfo | null;
}) {
  const [copied, setCopied] = useState(false);

  if (!place) return null;

  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(place.address);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      {place.photoUrl && (
        <div className="w-full h-24 rounded-md overflow-hidden bg-muted">
          <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium leading-tight">{place.name}</p>
        {place.address && (
          <div className="flex items-start gap-1 mt-0.5">
            <p className="text-xs text-muted-foreground flex-1">{place.address}</p>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0" onClick={handleCopy}>
              {copied ? <Check className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5" />}
            </Button>
          </div>
        )}
      </div>
      {directions && (
        <p className="text-xs text-muted-foreground">
          {directions.duration} drive &middot; {directions.distance}
        </p>
      )}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        Open in Google Maps
      </a>
    </div>
  );
}

export function SiteMap({
  siteName,
  address,
  city,
  state,
  postalCode,
  siteId,
  studyId,
  savedAirport,
  savedHotel,
  onGeocode,
  onNearbyResults,
  onDirections,
  airportDirections,
  hotelDirections,
  selectedAirportId,
  selectedHotelId,
  onSelectAirport,
  onSelectHotel,
  showAirports = true,
  showHotels = true,
}: SiteMapProps) {
  const addressQuery = buildAddressQuery(address, city, state, postalCode);
  const [airports, setAirports] = useState<NearbyPlace[]>([]);
  const [hotels, setHotels] = useState<NearbyPlace[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [savingType, setSavingType] = useState<'airport' | 'hotel' | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const onNearbyResultsRef = useRef(onNearbyResults);
  const onDirectionsRef = useRef(onDirections);
  const savedAirportRef = useRef(savedAirport);
  const savedHotelRef = useRef(savedHotel);

  onNearbyResultsRef.current = onNearbyResults;
  onDirectionsRef.current = onDirections;
  savedAirportRef.current = savedAirport;
  savedHotelRef.current = savedHotel;

  const addPlaceMarkers = useCallback(
    (map: google.maps.Map, places: NearbyPlace[], type: 'airport' | 'hotel', selectedId?: string | null) => {
      places.forEach((place) => {
        const isSelected = place.place_id === selectedId;
        const marker = new google.maps.Marker({
          position: { lat: place.lat, lng: place.lng },
          map,
          title: place.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isSelected ? 9 : 7,
            fillColor: type === 'airport' ? '#f59e0b' : '#8b5cf6',
            fillOpacity: isSelected ? 1 : 0.7,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
        const photoHtml = place.photoUrl
          ? `<img src="${place.photoUrl}" alt="${place.name}" style="width:100%;height:80px;object-fit:cover;border-radius:4px;margin-bottom:6px" />`
          : '';

        const info = new google.maps.InfoWindow({
          content: `<div style="font-family:sans-serif;padding:4px 2px;max-width:220px">
            ${photoHtml}
            <strong>${place.name}</strong>
            <br/><span style="color:#666;font-size:12px">${place.address}</span>
            ${place.rating ? `<br/><span style="color:#f59e0b;font-size:12px">${place.rating.toFixed(1)} rating</span>` : ''}
            <br/><a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-size:12px;text-decoration:none">Open in Google Maps</a>
          </div>`,
        });

        marker.addListener('click', () => info.open(map, marker));
        markersRef.current.push(marker);
      });
    },
    []
  );

  const handleMapReady = useCallback(
    (map: google.maps.Map, siteLocation: google.maps.LatLng) => {
      if (!window.google?.maps?.places) return;

      setLoadingPlaces(true);
      const service = new google.maps.places.PlacesService(map);
      const searchLocation = { lat: siteLocation.lat(), lng: siteLocation.lng() };

      let completed = 0;

      const computeDirections = (placeId: string | null, places: NearbyPlace[], type: 'airport' | 'hotel') => {
        if (!placeId || !onDirectionsRef.current) return;
        const place = places.find((p) => p.place_id === placeId);
        if (!place) return;

        const directionsService = new google.maps.DirectionsService();
        directionsService.route(
          {
            origin: siteLocation,
            destination: { lat: place.lat, lng: place.lng },
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, dirStatus) => {
            if (dirStatus === 'OK' && result?.routes[0]?.legs[0]) {
              const leg = result.routes[0].legs[0];
              onDirectionsRef.current?.(type, {
                duration: leg.duration?.text ?? '',
                distance: leg.distance?.text ?? '',
              });
            }
          }
        );
      };

      let airportResults: NearbyPlace[] = [];
      let hotelResults: NearbyPlace[] = [];

      const checkDone = () => {
        completed++;
        if (completed >= 2) {
          setLoadingPlaces(false);
          onNearbyResultsRef.current?.(airportResults, hotelResults);
          computeDirections(savedAirportRef.current?.placeId ?? null, airportResults, 'airport');
          computeDirections(savedHotelRef.current?.placeId ?? null, hotelResults, 'hotel');
        }
      };

      service.nearbySearch(
        { location: searchLocation, radius: 50000, type: 'airport' },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const mapped: NearbyPlace[] = results.slice(0, 5).map((r) => ({
              place_id: r.place_id!,
              name: r.name!,
              address: r.vicinity ?? '',
              rating: r.rating,
              photoUrl: r.photos?.[0]?.getUrl({ maxWidth: 400 }),
              lat: r.geometry!.location!.lat(),
              lng: r.geometry!.location!.lng(),
            }));
            setAirports(mapped);
            airportResults = mapped;
            addPlaceMarkers(map, mapped, 'airport', selectedAirportId ?? savedAirportRef.current?.placeId);
          }
          checkDone();
        }
      );

      service.nearbySearch(
        { location: searchLocation, radius: 30000, type: 'lodging' },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const mapped: NearbyPlace[] = results.slice(0, 5).map((r) => ({
              place_id: r.place_id!,
              name: r.name!,
              address: r.vicinity ?? '',
              rating: r.rating,
              photoUrl: r.photos?.[0]?.getUrl({ maxWidth: 400 }),
              lat: r.geometry!.location!.lat(),
              lng: r.geometry!.location!.lng(),
            }));
            setHotels(mapped);
            hotelResults = mapped;
            addPlaceMarkers(map, mapped, 'hotel', selectedHotelId ?? savedHotelRef.current?.placeId);
          }
          checkDone();
        }
      );
    },
    [addPlaceMarkers, selectedAirportId, selectedHotelId]
  );

  const handleSave = useCallback(
    (place: NearbyPlace, type: 'airport' | 'hotel') => {
      setSavingType(type);
      startTransition(async () => {
        const fields =
          type === 'airport'
            ? {
                nearest_airport_place_id: place.place_id,
                nearest_airport_name: place.name,
                nearest_airport_address: place.address,
              }
            : {
                nearest_hotel_place_id: place.place_id,
                nearest_hotel_name: place.name,
                nearest_hotel_address: place.address,
              };

        await updateSite({ id: siteId, study_id: studyId, ...fields });
        router.refresh();
        setSavingType(null);
      });
    },
    [siteId, studyId, router]
  );

  if (!addressQuery) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="w-full h-72 flex flex-col items-center justify-center gap-2 bg-muted/30 rounded-lg border border-dashed">
            <MapPin className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No address on file</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  const render = (status: Status) => {
    if (status === Status.LOADING) return <MapLoadingState />;
    if (status === Status.FAILURE) return <MapErrorState />;
    return (
      <InnerMap
        siteName={siteName}
        addressQuery={addressQuery}
        onGeocode={onGeocode}
        onMapReady={handleMapReady}
      />
    );
  };

  const currentAirportId = selectedAirportId ?? savedAirport?.placeId;
  const currentHotelId = selectedHotelId ?? savedHotel?.placeId;
  const selectedAirport = airports.find((a) => a.place_id === currentAirportId) ?? null;
  const selectedHotel = hotels.find((h) => h.place_id === currentHotelId) ?? null;

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-0">
        <CardTitle>Location & Nearby Places</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Map */}
          <div className="flex-1 min-w-0 overflow-hidden rounded-lg">
            <Wrapper apiKey={apiKey} libraries={['geocoding', 'places']} render={render}>
              <InnerMap
                siteName={siteName}
                addressQuery={addressQuery}
                onGeocode={onGeocode}
                onMapReady={handleMapReady}
              />
            </Wrapper>
          </div>

          {/* Side panel */}
          <div className="w-full lg:w-72 shrink-0 space-y-4">
            {loadingPlaces && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching nearby...
              </div>
            )}

            {!loadingPlaces && showAirports && airports.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Plane className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-xs font-medium text-muted-foreground">Nearest Airport</p>
                </div>
                <Select
                  value={currentAirportId ?? ''}
                  onValueChange={(id) => {
                    const place = airports.find((a) => a.place_id === id);
                    if (place) {
                      onSelectAirport?.(place);
                      handleSave(place, 'airport');
                    }
                  }}
                >
                  <SelectTrigger className="w-full" disabled={savingType === 'airport'}>
                    <SelectValue
                      placeholder="Select Airport"
                      getDisplayLabel={(v) => airports.find((a) => a.place_id === v)?.name ?? v}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {airports.map((a) => (
                      <SelectItem key={a.place_id} value={a.place_id}>
                        {a.name}{a.rating ? ` (${a.rating.toFixed(1)})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <PlaceDetail place={selectedAirport} type="airport" directions={airportDirections} />
              </div>
            )}

            {!loadingPlaces && showHotels && hotels.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Hotel className="h-3.5 w-3.5 text-violet-500" />
                  <p className="text-xs font-medium text-muted-foreground">Nearest Hotel</p>
                </div>
                <Select
                  value={currentHotelId ?? ''}
                  onValueChange={(id) => {
                    const place = hotels.find((h) => h.place_id === id);
                    if (place) {
                      onSelectHotel?.(place);
                      handleSave(place, 'hotel');
                    }
                  }}
                >
                  <SelectTrigger className="w-full" disabled={savingType === 'hotel'}>
                    <SelectValue
                      placeholder="Select Hotel"
                      getDisplayLabel={(v) => hotels.find((h) => h.place_id === v)?.name ?? v}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels.map((h) => (
                      <SelectItem key={h.place_id} value={h.place_id}>
                        {h.name}{h.rating ? ` (${h.rating.toFixed(1)})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <PlaceDetail place={selectedHotel} type="hotel" directions={hotelDirections} />
              </div>
            )}

            {(savingType || isPending) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving selection...
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
