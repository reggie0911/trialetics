import CsvSplitterClient from './csv-splitter-client';
import { consumePageDynamic } from '@/lib/next/consume-page-dynamic';

type PageProps = {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
};

export default async function CsvSplitterPage(props: PageProps) {
  await consumePageDynamic(props);
  return <CsvSplitterClient />;
}
