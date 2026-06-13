import { trpc } from "@/lib/trpc";

export interface WeatherPoint {
  time: string;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  temperature: number;
  cloudCover: number;
  humidity: number;
}

export interface SMHIWeatherResult {
  forecast: WeatherPoint[];
  current: WeatherPoint | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSMHIWeather(lat: number = 59.3293, lon: number = 18.0686): SMHIWeatherResult {
  const { data, isLoading, error, refetch } = trpc.energy.weather.useQuery(
    { lat, lon },
    { staleTime: 10 * 60 * 1000, retry: 2 }
  );

  const forecast: WeatherPoint[] = data ?? [];

  return {
    forecast,
    current: forecast[0] ?? null,
    loading: isLoading,
    error: error ? "Kunde inte hämta SMHI-data" : null,
    refetch,
  };
}
