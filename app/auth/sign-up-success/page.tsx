import SignUpSuccessClient from './sign-up-success-client';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpSuccessPage({ searchParams }: PageProps) {
  await searchParams;
  return <SignUpSuccessClient />;
}
