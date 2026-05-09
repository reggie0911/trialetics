import AuthErrorClient from './auth-error-client';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthErrorPage({ searchParams }: PageProps) {
  await searchParams;
  return <AuthErrorClient />;
}
