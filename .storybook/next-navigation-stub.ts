/** Minimal `next/navigation` stubs for Storybook (webpack alias). */
export function useRouter() {
  return {
    push: () => {},
    replace: () => {},
    refresh: () => {},
  };
}

export function usePathname() {
  return '/storybook';
}

export function useSearchParams() {
  return new URLSearchParams();
}
