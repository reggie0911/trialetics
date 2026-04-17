'use client';

import { useCallback, useEffect, useReducer } from 'react';

import type {
  ActionChipPayload,
  InsightCardPayload,
  RecommendationCardPayload,
} from '@/lib/ai/types';

import { useCopilotContext } from './context-provider';

interface InsightsResponse {
  insights: InsightCardPayload[];
  recommendations: RecommendationCardPayload[];
  agentIds: string[];
  cached: boolean;
  generatedAt: string;
}

interface ActionsResponse {
  actions: ActionChipPayload[];
  agentIds: string[];
  cached: boolean;
  generatedAt: string;
}

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type Action<T> =
  | { type: 'request' }
  | { type: 'success'; data: T }
  | { type: 'error'; error: string };

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case 'request':
      return { ...state, loading: true, error: null };
    case 'success':
      return { data: action.data, loading: false, error: null };
    case 'error':
      return { data: null, loading: false, error: action.error };
    default:
      return state;
  }
}

const initialState: State<unknown> = { data: null, loading: true, error: null };

/**
 * Shared SWR-style hook for the Insights and Actions tabs. Refetches on
 * pathname / studyId / siteId / subjectId changes and exposes a manual
 * `refresh()` for `<LastRefreshed />`. Uses a reducer so the in-effect
 * dispatch isn't a synchronous `setState` (avoids react-hooks/set-state-in-effect).
 */
function useCopilotResource<T>(endpoint: '/api/ai/insights' | '/api/ai/actions'): State<T> & { refresh: () => void } {
  const { pathname, studyId, siteId, subjectId } = useCopilotContext();
  const [state, dispatch] = useReducer(reducer<T>, initialState as State<T>);

  const params = new URLSearchParams({ page: pathname });
  if (studyId) params.set('studyId', studyId);
  if (siteId) params.set('siteId', siteId);
  if (subjectId) params.set('subjectId', subjectId);
  const key = `${endpoint}?${params}`;

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'request' });
    fetch(key, { method: 'GET', cache: 'no-store' })
      .then(async res => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return (await res.json()) as T;
      })
      .then(data => {
        if (!cancelled) dispatch({ type: 'success', data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          dispatch({
            type: 'error',
            error: err instanceof Error ? err.message : 'Request failed.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const refresh = useCallback(() => {
    dispatch({ type: 'request' });
    fetch(`${key}${key.includes('?') ? '&' : '?'}_=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
    })
      .then(async res => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return (await res.json()) as T;
      })
      .then(data => dispatch({ type: 'success', data }))
      .catch((err: unknown) =>
        dispatch({
          type: 'error',
          error: err instanceof Error ? err.message : 'Request failed.',
        })
      );
  }, [key]);

  return { ...state, refresh };
}

export function useCopilotInsights() {
  return useCopilotResource<InsightsResponse>('/api/ai/insights');
}

export function useCopilotActions() {
  return useCopilotResource<ActionsResponse>('/api/ai/actions');
}
