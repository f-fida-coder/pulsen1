import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

export interface ZonePrice {
  area: string;
  average: number;
  min: number;
  max: number;
  loading: boolean;
  error: boolean;
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useZoneComparison(): ZonePrice[] {
  const date = useMemo(() => getTodayStr(), []);

  const se1 = trpc.energy.spotPrices.useQuery({ area: "SE1", date }, { staleTime: 5 * 60 * 1000 });
  const se2 = trpc.energy.spotPrices.useQuery({ area: "SE2", date }, { staleTime: 5 * 60 * 1000 });
  const se3 = trpc.energy.spotPrices.useQuery({ area: "SE3", date }, { staleTime: 5 * 60 * 1000 });
  const se4 = trpc.energy.spotPrices.useQuery({ area: "SE4", date }, { staleTime: 5 * 60 * 1000 });

  const queries = [
    { area: "SE1", q: se1 },
    { area: "SE2", q: se2 },
    { area: "SE3", q: se3 },
    { area: "SE4", q: se4 },
  ];

  return queries.map(({ area, q }) => {
    if (q.isLoading) return { area, average: 0, min: 0, max: 0, loading: true, error: false };
    if (q.error || !q.data) return { area, average: 0, min: 0, max: 0, loading: false, error: true };
    const prices = q.data.data.map((p) => p.price);
    return {
      area,
      average: q.data.average,
      min: Math.min(...prices),
      max: Math.max(...prices),
      loading: false,
      error: false,
    };
  });
}
