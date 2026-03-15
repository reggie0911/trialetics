'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudRain, CloudSnow, Sun, CloudLightning, Wind, Loader2, CloudFog } from 'lucide-react';

interface WeatherData {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
}

interface SiteWeatherProps {
  lat: number | null;
  lng: number | null;
}

const WMO_DESCRIPTIONS: Record<number, { label: string; icon: typeof Sun }> = {
  0: { label: 'Clear sky', icon: Sun },
  1: { label: 'Mainly clear', icon: Sun },
  2: { label: 'Partly cloudy', icon: Cloud },
  3: { label: 'Overcast', icon: Cloud },
  45: { label: 'Foggy', icon: CloudFog },
  48: { label: 'Depositing rime fog', icon: CloudFog },
  51: { label: 'Light drizzle', icon: CloudRain },
  53: { label: 'Moderate drizzle', icon: CloudRain },
  55: { label: 'Dense drizzle', icon: CloudRain },
  61: { label: 'Slight rain', icon: CloudRain },
  63: { label: 'Moderate rain', icon: CloudRain },
  65: { label: 'Heavy rain', icon: CloudRain },
  71: { label: 'Slight snow', icon: CloudSnow },
  73: { label: 'Moderate snow', icon: CloudSnow },
  75: { label: 'Heavy snow', icon: CloudSnow },
  80: { label: 'Slight showers', icon: CloudRain },
  81: { label: 'Moderate showers', icon: CloudRain },
  82: { label: 'Violent showers', icon: CloudRain },
  85: { label: 'Slight snow showers', icon: CloudSnow },
  86: { label: 'Heavy snow showers', icon: CloudSnow },
  95: { label: 'Thunderstorm', icon: CloudLightning },
  96: { label: 'Thunderstorm with hail', icon: CloudLightning },
  99: { label: 'Thunderstorm with heavy hail', icon: CloudLightning },
};

function getWeatherInfo(code: number) {
  return WMO_DESCRIPTIONS[code] ?? { label: 'Unknown', icon: Cloud };
}

export function SiteWeather({ lat, lng }: SiteWeatherProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat === null || lng === null) return;

    setLoading(true);
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.current) {
          setWeather({
            temperature: Math.round(data.current.temperature_2m),
            weatherCode: data.current.weather_code,
            windSpeed: Math.round(data.current.wind_speed_10m),
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lat, lng]);

  if (lat === null || lng === null) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading weather...</span>
      </div>
    );
  }

  if (!weather) return null;

  const { label, icon: WeatherIcon } = getWeatherInfo(weather.weatherCode);

  return (
    <div className="flex items-center gap-3 text-sm">
      <WeatherIcon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="font-medium text-foreground">{weather.temperature}°F</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-muted-foreground/40">·</span>
      <div className="flex items-center gap-1 text-muted-foreground">
        <Wind className="h-3.5 w-3.5" />
        <span>{weather.windSpeed} mph</span>
      </div>
    </div>
  );
}
