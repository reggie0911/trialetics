import type { ComponentType } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import '../app/globals.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: false },
  },
  decorators: [
    (Story: ComponentType) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};

export default preview;
