/**
 * SolPulsen Data Fetcher — Spot Prices, Weather & Solar Forecast
 * 
 * Hämtar:
 * 1. Spotpriser från elprisetjustnu.se
 * 2. Väderprognos från SMHI Open Data (temperatur, molnighet, vind)
 * 3. Solproduktionsprognos baserad på SMHI-data + panelkonfiguration
 * 4. Lastprognos baserad på väder + hushållsmönster
 * 
 * Alla API:er är öppna och gratis. Ingen API-nyckel krävs.
 */

import axios from "axios";

// =============================================================================
// DATA MODELS
// =============================================================================

export interface HourlyPrice {
  hour: number;
  price_sek: number;
  time_start: string;
}

export interface WeatherForecast {
  hour: number;
  temperature_c: number;
  cloud_cover_octas: number;
  wind_speed_ms: number;
  weather_symbol: number;
  humidity_pct: number;
  precipitation_mm: number;
  valid_time: string;
}

export interface SolarForecast {
  hour: number;
  production_kw: number;
  cloud_factor: number;
  solar_elevation: number;
  theoretical_max_kw: number;
}

export interface LoadForecast {
  hour: number;
  consumption_kw: number;
  base_load_kw: number;
  heating_load_kw: number;
  reason: string;
}

export interface ForecastResult {
  date: string;
  zone: string;
  location: { lat: number; lon: number };
  prices: HourlyPrice[];
  weather: WeatherForecast[];
  solar: SolarForecast[];
  load: LoadForecast[];
  summary: {
    avg_price_sek: number;
    min_price_sek: number;
    max_price_sek: number;
    total_solar_kwh: number;
    total_load_kwh: number;
    price_spread_sek: number;
    weather_description: string;
  };
}

export interface MultiForecastResult {
  days: ForecastResult[];
  combined_prices: HourlyPrice[];
  combined_solar: SolarForecast[];
  combined_load: LoadForecast[];
  combined_weather: WeatherForecast[];
  tomorrow_available: boolean;
  total_hours: number;
}

// Swedish cities
export const SWEDISH_LOCATIONS: Record<string, { lat: number; lon: number; zone: string }> = {
  stockholm: { lat: 59.3293, lon: 18.0686, zone: "SE3" },
  göteborg: { lat: 57.7089, lon: 11.9746, zone: "SE3" },
  malmö: { lat: 55.6050, lon: 13.0038, zone: "SE4" },
  uppsala: { lat: 59.8586, lon: 17.6389, zone: "SE3" },
  linköping: { lat: 58.4108, lon: 15.6214, zone: "SE3" },
  luleå: { lat: 65.5848, lon: 22.1547, zone: "SE1" },
  sundsvall: { lat: 62.3908, lon: 17.3069, zone: "SE2" },
  västerås: { lat: 59.6099, lon: 16.5448, zone: "SE3" },
  örebro: { lat: 59.2753, lon: 15.2134, zone: "SE3" },
  lund: { lat: 55.7047, lon: 13.1910, zone: "SE4" },
};

// SMHI Weather symbol → cloud factor for solar
const CLOUD_FACTOR: Record<number, number> = {
  1: 1.00, 2: 0.90, 3: 0.70, 4: 0.60, 5: 0.40, 6: 0.20, 7: 0.15,
};
// Rain/snow variants
for (let i = 8; i <= 27; i++) {
  CLOUD_FACTOR[i] = 0.10;
}

// Weather symbol descriptions
const WEATHER_DESCRIPTIONS: Record<number, string> = {
  1: "Klart", 2: "Nästan klart", 3: "Växlande molnighet",
  4: "Halvklart", 5: "Molnigt", 6: "Mulet", 7: "Dimma",
  8: "Lätt regnskur", 9: "Regnskur", 10: "Kraftig regnskur",
  11: "Åskväder", 12: "Lätt snöblandat regn", 13: "Snöblandat regn",
  14: "Kraftigt snöblandat regn", 15: "Lätt snöfall", 16: "Snöfall",
  17: "Kraftigt snöfall", 18: "Lätt regn", 19: "Regn", 20: "Kraftigt regn",
};

// =============================================================================
// SPOT PRICE FETCHER
// =============================================================================

export async function fetchSpotPrices(zone: string = "SE3", date?: string): Promise<HourlyPrice[]> {
  const now = new Date();
  if (!date) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    date = `${year}/${month}-${day}`;
  } else if (date.includes("-") && !date.includes("/")) {
    // Convert YYYY-MM-DD to YYYY/MM-DD
    const parts = date.split("-");
    date = `${parts[0]}/${parts[1]}-${parts[2]}`;
  }

  const url = `https://www.elprisetjustnu.se/api/v1/prices/${date}_${zone}.json`;

  try {
    const res = await axios.get(url, { timeout: 10000 });
    const data = res.data;

    // Aggregate to hourly prices (API may return quarter-hourly)
    const hourlyMap: Record<number, { prices: number[]; time_start: string }> = {};
    for (let i = 0; i < data.length; i++) {
      const hour = data.length > 24 ? Math.floor(i / 4) : i;
      if (!hourlyMap[hour]) {
        hourlyMap[hour] = { prices: [], time_start: data[i].time_start };
      }
      hourlyMap[hour].prices.push(data[i].SEK_per_kWh);
    }

    return Object.entries(hourlyMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([hour, { prices, time_start }]) => ({
        hour: Number(hour),
        price_sek: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100000) / 100000,
        time_start,
      }));
  } catch (err: any) {
    console.error(`[DataFetcher] Spot price error: ${err.message}`);
    return [];
  }
}

// =============================================================================
// SMHI WEATHER FETCHER
// =============================================================================

export async function fetchWeatherForecast(lat: number, lon: number): Promise<WeatherForecast[]> {
  // Open-Meteo: free, no auth, reliable from any IP
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=temperature_2m,cloudcover,windspeed_10m,relativehumidity_2m,precipitation&forecast_days=3&timezone=Europe/Stockholm`;

  try {
    const res = await axios.get(url, { timeout: 15000 });
    const h = res.data.hourly;
    const forecasts: WeatherForecast[] = [];

    for (let i = 0; i < (h.time?.length ?? 0); i++) {
      const dt = new Date(h.time[i]);
      const localHour = dt.getHours();
      const cloudPct = h.cloudcover?.[i] ?? 50;
      const symbol = cloudPct < 10 ? 1 : cloudPct < 25 ? 2 : cloudPct < 50 ? 3 : cloudPct < 65 ? 4 : cloudPct < 80 ? 5 : cloudPct < 95 ? 6 : 7;

      forecasts.push({
        hour: localHour,
        temperature_c: h.temperature_2m?.[i] ?? 0,
        cloud_cover_octas: Math.round(cloudPct / 12.5),
        wind_speed_ms: (h.windspeed_10m?.[i] ?? 0) / 3.6,
        weather_symbol: symbol,
        humidity_pct: h.relativehumidity_2m?.[i] ?? 0,
        precipitation_mm: h.precipitation?.[i] ?? 0,
        valid_time: h.time[i],
      });
    }

    return forecasts;
  } catch (err: any) {
    console.error(`[DataFetcher] Weather error: ${err.message}`);
    return [];
  }
}

export function getWeatherForDate(forecasts: WeatherForecast[], targetDate?: string): WeatherForecast[] {
  if (!targetDate) {
    const now = new Date();
    targetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  return forecasts.filter((f) => {
    const dt = new Date(f.valid_time);
    const localDate = new Date(dt.getTime() + 3600000); // CET offset
    const dateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
    return dateStr === targetDate;
  });
}

// =============================================================================
// SOLAR PRODUCTION FORECAST
// =============================================================================

function calculateSolarElevation(lat: number, lon: number, hour: number, dayOfYear: number): number {
  const declination = 23.45 * Math.sin(((284 + dayOfYear) / 365) * 2 * Math.PI);
  const solarNoonOffset = (lon - 15) / 15;
  const hourAngle = (hour - 12 - solarNoonOffset) * 15;

  const latRad = (lat * Math.PI) / 180;
  const decRad = (declination * Math.PI) / 180;
  const haRad = (hourAngle * Math.PI) / 180;

  const sinElevation =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);

  return (Math.asin(Math.max(-1, Math.min(1, sinElevation))) * 180) / Math.PI;
}

export function forecastSolarProduction(
  weather: WeatherForecast[],
  lat: number,
  lon: number,
  panelKwp: number = 10.0,
  panelTilt: number = 30.0,
  systemEfficiency: number = 0.85
): SolarForecast[] {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);

  const weatherMap: Record<number, WeatherForecast> = {};
  for (const w of weather) {
    weatherMap[w.hour] = w;
  }

  const forecasts: SolarForecast[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const elevation = calculateSolarElevation(lat, lon, hour, dayOfYear);

    if (elevation <= 0) {
      forecasts.push({
        hour,
        production_kw: 0,
        cloud_factor: 0,
        solar_elevation: Math.round(elevation * 10) / 10,
        theoretical_max_kw: 0,
      });
      continue;
    }

    // Clear-sky irradiance (Kasten model)
    const airMass = 1 / Math.max(0.05, Math.sin((elevation * Math.PI) / 180));
    const clearSkyIrradiance = 1000 * Math.pow(0.7, Math.pow(airMass, 0.678));

    // Panel angle factor
    const incidenceAngle = Math.abs(elevation - panelTilt);
    const panelFactor = Math.max(0, Math.cos((incidenceAngle * Math.PI) / 180));

    // Theoretical max
    const theoreticalKw = panelKwp * (clearSkyIrradiance / 1000) * panelFactor * systemEfficiency;

    // Cloud factor from SMHI
    const w = weatherMap[hour];
    let cf = 0.5;
    let tempFactor = 1.0;
    if (w) {
      cf = CLOUD_FACTOR[w.weather_symbol] ?? 0.3;
      if (w.temperature_c > 25) {
        tempFactor = 1 - 0.004 * (w.temperature_c - 25);
      } else if (w.temperature_c < 25) {
        tempFactor = Math.min(1.05, 1 + 0.004 * (25 - w.temperature_c));
      }
    }

    const production = theoreticalKw * cf * tempFactor;

    forecasts.push({
      hour,
      production_kw: Math.round(Math.max(0, production) * 100) / 100,
      cloud_factor: Math.round(cf * 100) / 100,
      solar_elevation: Math.round(elevation * 10) / 10,
      theoretical_max_kw: Math.round(theoreticalKw * 100) / 100,
    });
  }

  return forecasts;
}

// =============================================================================
// LOAD FORECAST
// =============================================================================

export interface LoadForecastConfig {
  baseLoadKw?: number;
  hasHeatPump?: boolean;
  heatPumpKw?: number;
  hasEv?: boolean;
  evChargeKw?: number;
  evChargeStart?: number;
  evChargeEnd?: number;
  householdSize?: number;
}

const ACTIVITY_PATTERN = [
  0.3, 0.2, 0.2, 0.2, 0.2, 0.3,  // 00-05
  0.6, 1.0, 0.8, 0.5, 0.4, 0.5,  // 06-11
  0.6, 0.5, 0.4, 0.5, 0.7, 1.2,  // 12-17
  1.5, 1.2, 0.9, 0.7, 0.5, 0.4,  // 18-23
];

export function forecastLoad(
  weather: WeatherForecast[],
  config: LoadForecastConfig = {}
): LoadForecast[] {
  const {
    baseLoadKw = 1.0,
    hasHeatPump = true,
    heatPumpKw = 3.0,
    hasEv = false,
    evChargeKw = 11.0,
    evChargeStart = 22,
    evChargeEnd = 6,
    householdSize = 4,
  } = config;

  const weatherMap: Record<number, WeatherForecast> = {};
  for (const w of weather) {
    weatherMap[w.hour] = w;
  }

  const forecasts: LoadForecast[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const activity = ACTIVITY_PATTERN[hour] * (householdSize / 4);
    const currentBase = baseLoadKw * (0.5 + 0.5 * activity);

    // Heat pump load
    let heating = 0;
    const reasonParts: string[] = [];
    if (hasHeatPump) {
      const w = weatherMap[hour];
      const temp = w ? w.temperature_c : 5.0;
      if (temp < 15) {
        const heatingFactor = Math.min(1.0, Math.max(0, (15 - temp) / 25));
        heating = heatPumpKw * heatingFactor;
        reasonParts.push(`VP ${heating.toFixed(1)}kW (${temp.toFixed(0)}°C)`);
      }
    }

    // EV charging
    let evLoad = 0;
    if (hasEv) {
      if (evChargeStart > evChargeEnd) {
        if (hour >= evChargeStart || hour < evChargeEnd) {
          evLoad = evChargeKw;
          reasonParts.push(`EV ${evChargeKw}kW`);
        }
      } else {
        if (hour >= evChargeStart && hour < evChargeEnd) {
          evLoad = evChargeKw;
          reasonParts.push(`EV ${evChargeKw}kW`);
        }
      }
    }

    const total = currentBase + heating + evLoad;
    if (reasonParts.length === 0) {
      reasonParts.push(`Bas ${currentBase.toFixed(1)}kW`);
    }

    forecasts.push({
      hour,
      consumption_kw: Math.round(total * 100) / 100,
      base_load_kw: Math.round(currentBase * 100) / 100,
      heating_load_kw: Math.round(heating * 100) / 100,
      reason: reasonParts.join(", "),
    });
  }

  return forecasts;
}

// =============================================================================
// FULL FORECAST PIPELINE
// =============================================================================

// =============================================================================
// TOMORROW'S PRICES
// =============================================================================

/**
 * Fetch tomorrow's spot prices. Available after ~13:00 CET daily.
 * Returns empty array if not yet published.
 */
export async function fetchTomorrowPrices(zone: string = "SE3"): Promise<HourlyPrice[]> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");
  const date = `${year}/${month}-${day}`;

  const url = `https://www.elprisetjustnu.se/api/v1/prices/${date}_${zone}.json`;

  try {
    const res = await axios.get(url, { timeout: 10000 });
    const data = res.data;

    const hourlyMap: Record<number, { prices: number[]; time_start: string }> = {};
    for (let i = 0; i < data.length; i++) {
      const hour = data.length > 24 ? Math.floor(i / 4) : i;
      if (!hourlyMap[hour]) {
        hourlyMap[hour] = { prices: [], time_start: data[i].time_start };
      }
      hourlyMap[hour].prices.push(data[i].SEK_per_kWh);
    }

    // Offset hours by +24 for combined 48h schedule
    return Object.entries(hourlyMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([hour, { prices, time_start }]) => ({
        hour: Number(hour) + 24,
        price_sek: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100000) / 100000,
        time_start,
      }));
  } catch (err: any) {
    // 404 = not yet published, other errors logged
    if (!err.response || err.response.status !== 404) {
      console.error(`[DataFetcher] Tomorrow price error: ${err.message}`);
    }
    return [];
  }
}

/**
 * Get weather forecast for tomorrow from SMHI data (already fetched multi-day)
 */
export function getWeatherForTomorrow(forecasts: WeatherForecast[]): WeatherForecast[] {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  const tomorrowWeather = forecasts.filter((f) => {
    const dt = new Date(f.valid_time);
    const localDate = new Date(dt.getTime() + 3600000);
    const dateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
    return dateStr === targetDate;
  });

  // Offset hours by +24 for combined schedule
  return tomorrowWeather.map((w) => ({ ...w, hour: w.hour + 24 }));
}

/**
 * Generate solar forecast for tomorrow (offset hours by +24)
 */
export function forecastSolarForTomorrow(
  weather: WeatherForecast[],
  lat: number,
  lon: number,
  panelKwp: number = 10.0,
  panelTilt: number = 30.0,
  systemEfficiency: number = 0.85
): SolarForecast[] {
  // Use tomorrow's day of year
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startOfYear = new Date(tomorrow.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((tomorrow.getTime() - startOfYear.getTime()) / 86400000);

  // Weather map uses offset hours (24-47)
  const weatherMap: Record<number, WeatherForecast> = {};
  for (const w of weather) {
    weatherMap[w.hour] = w;
  }

  const forecasts: SolarForecast[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const elevation = calculateSolarElevation(lat, lon, hour, dayOfYear);

    if (elevation <= 0) {
      forecasts.push({
        hour: hour + 24,
        production_kw: 0,
        cloud_factor: 0,
        solar_elevation: Math.round(elevation * 10) / 10,
        theoretical_max_kw: 0,
      });
      continue;
    }

    const airMass = 1 / Math.max(0.05, Math.sin((elevation * Math.PI) / 180));
    const clearSkyIrradiance = 1000 * Math.pow(0.7, Math.pow(airMass, 0.678));
    const incidenceAngle = Math.abs(elevation - panelTilt);
    const panelFactor = Math.max(0, Math.cos((incidenceAngle * Math.PI) / 180));
    const theoreticalKw = panelKwp * (clearSkyIrradiance / 1000) * panelFactor * systemEfficiency;

    const w = weatherMap[hour + 24];
    let cf = 0.5;
    let tempFactor = 1.0;
    if (w) {
      cf = CLOUD_FACTOR[w.weather_symbol] ?? 0.3;
      if (w.temperature_c > 25) {
        tempFactor = 1 - 0.004 * (w.temperature_c - 25);
      } else if (w.temperature_c < 25) {
        tempFactor = Math.min(1.05, 1 + 0.004 * (25 - w.temperature_c));
      }
    }

    const production = theoreticalKw * cf * tempFactor;

    forecasts.push({
      hour: hour + 24,
      production_kw: Math.round(Math.max(0, production) * 100) / 100,
      cloud_factor: Math.round(cf * 100) / 100,
      solar_elevation: Math.round(elevation * 10) / 10,
      theoretical_max_kw: Math.round(theoreticalKw * 100) / 100,
    });
  }

  return forecasts;
}

/**
 * Generate load forecast for tomorrow (offset hours by +24)
 */
export function forecastLoadForTomorrow(
  weather: WeatherForecast[],
  config: LoadForecastConfig = {}
): LoadForecast[] {
  const todayLoad = forecastLoad(
    weather.map((w) => ({ ...w, hour: w.hour - 24 })),
    config
  );
  return todayLoad.map((l) => ({ ...l, hour: l.hour + 24 }));
}

// =============================================================================
// 48H MULTI-DAY FORECAST
// =============================================================================

export async function runMultiForecast(params: {
  zone?: string;
  lat?: number;
  lon?: number;
  panelKwp?: number;
  loadConfig?: LoadForecastConfig;
}): Promise<MultiForecastResult> {
  const {
    zone = "SE3",
    lat = 59.3293,
    lon = 18.0686,
    panelKwp = 10.0,
    loadConfig,
  } = params;

  // Fetch today's forecast
  const todayForecast = await runFullForecast({ zone, lat, lon, panelKwp, loadConfig });

  // Fetch tomorrow's prices
  const tomorrowPrices = await fetchTomorrowPrices(zone);
  const tomorrowAvailable = tomorrowPrices.length > 0;

  if (!tomorrowAvailable) {
    return {
      days: [todayForecast],
      combined_prices: todayForecast.prices,
      combined_solar: todayForecast.solar,
      combined_load: todayForecast.load,
      combined_weather: todayForecast.weather,
      tomorrow_available: false,
      total_hours: 24,
    };
  }

  // Fetch tomorrow's weather, solar, load
  const allWeather = await fetchWeatherForecast(lat, lon);
  const tomorrowWeather = getWeatherForTomorrow(allWeather);
  const tomorrowSolar = forecastSolarForTomorrow(tomorrowWeather, lat, lon, panelKwp);
  const tomorrowLoad = forecastLoadForTomorrow(tomorrowWeather, loadConfig);

  // Build tomorrow's ForecastResult
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  const tomorrowPriceValues = tomorrowPrices.map((p) => p.price_sek);
  const tomorrowAvgPrice = tomorrowPriceValues.reduce((a, b) => a + b, 0) / tomorrowPriceValues.length;
  const tomorrowTotalSolar = tomorrowSolar.reduce((sum, s) => sum + s.production_kw, 0);
  const tomorrowTotalLoad = tomorrowLoad.reduce((sum, l) => sum + l.consumption_kw, 0);

  let tomorrowWeatherDesc = "Ej tillgängligt";
  if (tomorrowWeather.length > 0) {
    const midday = tomorrowWeather.find((w) => w.hour === 36) || tomorrowWeather[0];
    tomorrowWeatherDesc = `${WEATHER_DESCRIPTIONS[midday.weather_symbol] || "Okänt"}, ${midday.temperature_c.toFixed(0)}°C`;
  }

  const tomorrowForecast: ForecastResult = {
    date: tomorrowDate,
    zone,
    location: { lat, lon },
    prices: tomorrowPrices,
    weather: tomorrowWeather,
    solar: tomorrowSolar,
    load: tomorrowLoad,
    summary: {
      avg_price_sek: Math.round(tomorrowAvgPrice * 10000) / 10000,
      min_price_sek: Math.round(Math.min(...tomorrowPriceValues) * 10000) / 10000,
      max_price_sek: Math.round(Math.max(...tomorrowPriceValues) * 10000) / 10000,
      total_solar_kwh: Math.round(tomorrowTotalSolar * 10) / 10,
      total_load_kwh: Math.round(tomorrowTotalLoad * 10) / 10,
      price_spread_sek: Math.round((Math.max(...tomorrowPriceValues) - Math.min(...tomorrowPriceValues)) * 10000) / 10000,
      weather_description: tomorrowWeatherDesc,
    },
  };

  return {
    days: [todayForecast, tomorrowForecast],
    combined_prices: [...todayForecast.prices, ...tomorrowPrices],
    combined_solar: [...todayForecast.solar, ...tomorrowSolar],
    combined_load: [...todayForecast.load, ...tomorrowLoad],
    combined_weather: [...todayForecast.weather, ...tomorrowWeather],
    tomorrow_available: true,
    total_hours: 48,
  };
}

// =============================================================================
// SINGLE-DAY FORECAST (original)
// =============================================================================

export async function runFullForecast(params: {
  zone?: string;
  lat?: number;
  lon?: number;
  panelKwp?: number;
  batteryKwh?: number;
  batteryKw?: number;
  date?: string;
  loadConfig?: LoadForecastConfig;
}): Promise<ForecastResult> {
  const {
    zone = "SE3",
    lat = 59.3293,
    lon = 18.0686,
    panelKwp = 10.0,
    date,
    loadConfig,
  } = params;

  // 1. Spot prices
  const prices = await fetchSpotPrices(zone, date);

  // 2. Weather forecast
  const allWeather = await fetchWeatherForecast(lat, lon);
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const weather = getWeatherForDate(allWeather, targetDate);

  // 3. Solar forecast
  const solar = forecastSolarProduction(weather, lat, lon, panelKwp);
  const totalSolar = solar.reduce((sum, s) => sum + s.production_kw, 0);

  // 4. Load forecast
  const load = forecastLoad(weather, loadConfig);
  const totalLoad = load.reduce((sum, l) => sum + l.consumption_kw, 0);

  // Summary
  const priceValues = prices.map((p) => p.price_sek);
  const avgPrice = priceValues.length > 0 ? priceValues.reduce((a, b) => a + b, 0) / priceValues.length : 0;
  const minPrice = priceValues.length > 0 ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length > 0 ? Math.max(...priceValues) : 0;

  // Weather description
  let weatherDesc = "Ej tillgängligt";
  if (weather.length > 0) {
    const midday = weather.find((w) => w.hour === 12) || weather[0];
    weatherDesc = `${WEATHER_DESCRIPTIONS[midday.weather_symbol] || "Okänt"}, ${midday.temperature_c.toFixed(0)}°C`;
  }

  return {
    date: targetDate,
    zone,
    location: { lat, lon },
    prices,
    weather,
    solar,
    load,
    summary: {
      avg_price_sek: Math.round(avgPrice * 10000) / 10000,
      min_price_sek: Math.round(minPrice * 10000) / 10000,
      max_price_sek: Math.round(maxPrice * 10000) / 10000,
      total_solar_kwh: Math.round(totalSolar * 10) / 10,
      total_load_kwh: Math.round(totalLoad * 10) / 10,
      price_spread_sek: Math.round((maxPrice - minPrice) * 10000) / 10000,
      weather_description: weatherDesc,
    },
  };
}
