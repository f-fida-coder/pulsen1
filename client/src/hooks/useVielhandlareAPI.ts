import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export interface HourlyPrice {
  time: string;
  price: number; // öre/kWh
}

export interface PriceData {
  data: HourlyPrice[];
  average: number;
  min: { price: number; time: string };
  max: { price: number; time: string };
}

export interface UseVielhandlareAPIResult {
  priceData: PriceData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  optimalChargeHour: number | null;
  optimalDischargeHour: number | null;
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useVielhandlareAPI(area: "SE1" | "SE2" | "SE3" | "SE4" = "SE3"): UseVielhandlareAPIResult {
  const date = getTodayStr();

  const { data, isLoading, error, refetch } = trpc.energy.spotPrices.useQuery(
    { area, date },
    { staleTime: 5 * 60 * 1000, retry: 2 }
  );

  const priceData: PriceData | null = data
    ? {
        data: data.data,
        average: data.average,
        min: data.min,
        max: data.max,
      }
    : null;

  // Optimal charge: cheapest 3-hour window
  const optimalChargeHour =
    priceData && priceData.data.length >= 3
      ? (() => {
          let best = 0;
          let bestSum = Infinity;
          for (let i = 0; i <= priceData.data.length - 3; i++) {
            const sum = priceData.data[i].price + priceData.data[i + 1].price + priceData.data[i + 2].price;
            if (sum < bestSum) {
              bestSum = sum;
              best = i;
            }
          }
          return best;
        })()
      : null;

  const optimalDischargeHour =
    priceData && priceData.data.length > 0
      ? priceData.data.indexOf(priceData.data.reduce((a, b) => (a.price > b.price ? a : b)))
      : null;

  return {
    priceData,
    loading: isLoading,
    error: error ? "Kunde inte hämta elpriser" : null,
    refetch,
    optimalChargeHour,
    optimalDischargeHour,
  };
}
