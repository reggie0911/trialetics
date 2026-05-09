import SignUpClient from './sign-up-client';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: PageProps) {
  await searchParams;
  return <SignUpClient />;
}
