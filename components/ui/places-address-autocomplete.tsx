'use client';

import { useEffect, useRef, useLayoutEffect } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';

import { GOOGLE_MAPS_WRAPPER_OPTIONS } from '@/lib/maps/google-maps-script-options';
import { cn } from '@/lib/utils';

/** Parsed from `google.maps.places.PlaceResult.address_components`. */
export type ParsedPlace = {
  address1: string;
  city?: string;
  state?: string;
  stateLong?: string;
  postalCode?: string;
  countryCode?: string;
};

const inputClassName = cn(
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs shadow-xs transition-[color,box-shadow] outline-none',
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
  'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30',
);

export function parsePlaceResult(place: google.maps.places.PlaceResult): ParsedPlace {
  const comps = place.address_components ?? [];
  const get = (type: string) => comps.find((c) => c.types.includes(type));

  const streetNumber = get('street_number')?.long_name ?? '';
  const route = get('route')?.long_name ?? '';
  let address1 = [streetNumber, route].filter(Boolean).join(' ').trim();

  if (!address1 && place.name?.trim()) {
    address1 = place.name.trim();
  }
  if (!address1 && place.formatted_address) {
    address1 = place.formatted_address.split(',')[0]?.trim() ?? '';
  }

  const locality = get('locality')?.long_name;
  const postalTown = get('postal_town')?.long_name;
  const sublocality = get('sublocality_level_1')?.long_name;
  const city = locality || postalTown || sublocality;

  const admin1 = get('administrative_area_level_1');
  const postal = get('postal_code')?.long_name;
  const postalSuffix = get('postal_code_suffix')?.long_name;
  const postalParts = [postal, postalSuffix].filter(Boolean);
  const postalCode = postalParts.length ? postalParts.join('-') : undefined;

  const country = get('country');

  return {
    address1,
    city: city || undefined,
    state: admin1?.short_name,
    stateLong: admin1?.long_name,
    postalCode,
    countryCode: country?.short_name,
  };
}

export type PlacesAddressAutocompleteProps = {
  value: string;
  onChange: (next: string) => void;
  onPlaceSelected: (parsed: ParsedPlace) => void;
  countryBias?: string | null;
  disabled?: boolean;
  placeholder?: string;
  'aria-invalid'?: boolean;
  id?: string;
  name?: string;
  className?: string;
  /** When false, omit the "Verified via Google Places" hint. */
  showVerifiedHint?: boolean;
};

function PlainAddressInput({
  value,
  onChange,
  disabled,
  placeholder,
  'aria-invalid': ariaInvalid,
  id,
  name,
  className,
}: Pick<
  PlacesAddressAutocompleteProps,
  'value' | 'onChange' | 'disabled' | 'placeholder' | 'aria-invalid' | 'id' | 'name' | 'className'
>) {
  return (
    <input
      type="text"
      id={id}
      name={name}
      autoComplete="street-address"
      disabled={disabled}
      placeholder={placeholder}
      aria-invalid={ariaInvalid}
      className={cn(inputClassName, className)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

type InnerProps = PlacesAddressAutocompleteProps & {
  mapsStatus: Status;
};

function PlacesAddressAutocompleteInner({
  value,
  onChange,
  onPlaceSelected,
  countryBias,
  disabled,
  placeholder,
  'aria-invalid': ariaInvalid,
  id,
  name,
  className,
  mapsStatus,
  showVerifiedHint = true,
}: InnerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectedRef = useRef(onPlaceSelected);

  useLayoutEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectedRef.current = onPlaceSelected;
  });

  const ready =
    mapsStatus === Status.SUCCESS &&
    typeof window !== 'undefined' &&
    Boolean(window.google?.maps?.places);

  useEffect(() => {
    if (!ready || !inputRef.current || disabled) {
      return;
    }

    const input = inputRef.current;

    if (acRef.current) {
      google.maps.event.clearInstanceListeners(acRef.current);
      acRef.current = null;
    }
    if (listenerRef.current) {
      google.maps.event.removeListener(listenerRef.current);
      listenerRef.current = null;
    }

    const bias = countryBias?.trim();
    const ac = new google.maps.places.Autocomplete(input, {
      fields: ['address_components', 'formatted_address', 'name'],
      ...(bias ? { componentRestrictions: { country: [bias.toUpperCase()] } } : {}),
    });
    acRef.current = ac;

    const lid = ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place?.address_components?.length && !place?.formatted_address) {
        return;
      }
      const parsed = parsePlaceResult(place);
      if (parsed.address1) {
        onChangeRef.current(parsed.address1);
      }
      onPlaceSelectedRef.current(parsed);
    });
    listenerRef.current = lid;

    return () => {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      if (acRef.current) {
        google.maps.event.clearInstanceListeners(acRef.current);
        acRef.current = null;
      }
    };
  }, [ready, disabled, countryBias]);

  const showHint = showVerifiedHint && ready;

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="text"
        id={id}
        name={name}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        className={cn(inputClassName, className)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {showHint ? (
        <p className="text-[11px] text-muted-foreground">Verified via Google Places</p>
      ) : null}
    </div>
  );
}

/**
 * Address line with optional Google Places Autocomplete. Without
 * `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, renders a plain controlled input.
 */
export function PlacesAddressAutocomplete(props: PlacesAddressAutocompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  if (!apiKey) {
    return (
      <div className="space-y-1">
        <PlainAddressInput {...props} />
      </div>
    );
  }

  return (
    <Wrapper apiKey={apiKey} {...GOOGLE_MAPS_WRAPPER_OPTIONS} render={(status) => {
      if (status === Status.FAILURE) {
        return (
          <div className="space-y-1">
            <PlainAddressInput {...props} />
          </div>
        );
      }
      return <PlacesAddressAutocompleteInner {...props} mapsStatus={status} />;
    }}
    />
  );
}
