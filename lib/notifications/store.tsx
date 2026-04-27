'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import type { NotificationDoc } from './types';

// ── State ─────────────────────────────────────────────────────────────────────

interface NotificationState {
  items: NotificationDoc[];
  unreadCount: number;
  isLoading: boolean;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  isLoading: true,
};

// ── Actions ───────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_ITEMS'; items: NotificationDoc[] }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'MARK_READ'; ids: string[] }
  | { type: 'MARK_ALL_READ' }
  | { type: 'ARCHIVE'; id: string };

function reducer(state: NotificationState, action: Action): NotificationState {
  switch (action.type) {
    case 'SET_ITEMS': {
      const unreadCount = action.items.filter((n) => !n.read_at && !n.archived_at).length;
      return { ...state, items: action.items, unreadCount, isLoading: false };
    }
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'MARK_READ': {
      const idSet = new Set(action.ids);
      const items = state.items.map((n) =>
        idSet.has(n.id!) ? { ...n, read_at: new Date().toISOString() } : n
      );
      return { ...state, items, unreadCount: items.filter((n) => !n.read_at && !n.archived_at).length };
    }
    case 'MARK_ALL_READ': {
      const now = new Date().toISOString();
      const items = state.items.map((n) => ({ ...n, read_at: n.read_at ?? now }));
      return { ...state, items, unreadCount: 0 };
    }
    case 'ARCHIVE': {
      const items = state.items.map((n) =>
        n.id === action.id ? { ...n, archived_at: new Date().toISOString() } : n
      );
      return { ...state, items, unreadCount: items.filter((n) => !n.read_at && !n.archived_at).length };
    }
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface NotificationContextValue {
  state: NotificationState;
  dispatch: React.Dispatch<Action>;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  archive: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function NotificationStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const markRead = useCallback(async (ids: string[]) => {
    dispatch({ type: 'MARK_READ', ids });
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    } catch (e) {
      console.error('[NotificationStore] markRead error:', e);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    dispatch({ type: 'MARK_ALL_READ' });
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    } catch (e) {
      console.error('[NotificationStore] markAllRead error:', e);
    }
  }, []);

  const archive = useCallback(async (id: string) => {
    dispatch({ type: 'ARCHIVE', id });
    try {
      await fetch('/api/notifications/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (e) {
      console.error('[NotificationStore] archive error:', e);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ state, dispatch, markRead, markAllRead, archive }}>
      {children}
    </NotificationContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useNotificationStore() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationStore must be used inside NotificationStoreProvider');
  return ctx;
}

export function useNotifications() {
  return useNotificationStore().state;
}

export function useUnreadCount() {
  return useNotificationStore().state.unreadCount;
}
