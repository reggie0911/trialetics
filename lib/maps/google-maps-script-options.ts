/**
 * Single source of truth for `@googlemaps/react-wrapper` options.
 * The underlying Loader is a singleton — every `<Wrapper>` in the app must use
 * identical `apiKey`, `libraries`, `version`, etc. or runtime errors occur.
 */
export const GOOGLE_MAPS_WRAPPER_OPTIONS = {
  version: 'weekly' as const,
  /** Mutable tuple — `@googlemaps/react-wrapper` types expect `Library[]`, not `readonly`. */
  libraries: ['geocoding', 'places'] as ['geocoding', 'places'],
};
