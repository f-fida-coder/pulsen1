import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

export interface DailyPriceSummary {
  date: string;
  average: number;
  min: number;
  max: number;
  area: string;
}

function getDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Fetch a single day via tRPC and return a summary
function useDayPrice(area: "SE1" | "SE2" | "SE3" | "SE4", daysAgo: number) {
  const date = useMemo(() => getDateStr(daysAgo), [daysAgo]);
  return trpc.energy.spotPrices.useQuery(
    { area, date },
    { staleTime: 60 * 60 * 1000, retry: 1 }
  );
}

// For a range of days we batch individual queries. React hooks rules require
// a fixed number of hooks, so we cap at 14 days and always call all 14.
export function useHistoricalPrices(area: "SE1" | "SE2" | "SE3" | "SE4" = "SE3", days: number = 14) {
  const cappedDays = Math.min(days, 14);

  // Always call exactly 14 hooks (React rules: no conditional hooks)
  const d0 = useDayPrice(area, 0);
  const d1 = useDayPrice(area, 1);
  const d2 = useDayPrice(area, 2);
  const d3 = useDayPrice(area, 3);
  const d4 = useDayPrice(area, 4);
  const d5 = useDayPrice(area, 5);
  const d6 = useDayPrice(area, 6);
  const d7 = useDayPrice(area, 7);
  const d8 = useDayPrice(area, 8);
  const d9 = useDayPrice(area, 9);
  const d10 = useDayPrice(area, 10);
  const d11 = useDayPrice(area, 11);
  const d12 = useDayPrice(area, 12);
  const d13 = useDayPrice(area, 13);

  const allQueries = [d0, d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11, d12, d13];
  const activeQueries = allQueries.slice(0, cappedDays);

  const loading = activeQueries.some((q) => q.isLoading);
  const error = activeQueries.every((q) => q.error) ? "Kunde inte hämta historiska priser" : null;

  const history: DailyPriceSummary[] = activeQueries
    .map((q, i) => {
      if (!q.data || q.data.data.length === 0) return null;
      const prices = q.data.data.map((p) => p.price);
      return {
        date: getDateStr(i),
        average: q.data.average,
        min: Math.min(...prices),
        max: Math.max(...prices),
        area,
      } as DailyPriceSummary;
    })
    .filter((d): d is DailyPriceSummary => d !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  return { history, loading, error, refetch: () => activeQueries.forEach((q) => q.refetch()) };
}
