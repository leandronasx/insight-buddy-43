import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './Dashboard';
import { MonthProvider } from '@/contexts/MonthContext';
import * as React from 'react';

// Force the useDashboardData hook to return mocked data by overriding it in Dashboard.tsx
// Actually, it's easier to just mock it at the component level if we can.
// But we can't easily mock imports in a regular vite build without vite-plugin-mock or similar.
// Since it's just for verification, I will temporarily modify Dashboard.tsx to allow prop overrides or use a mocked hook.
