import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

/**
 * The weather mirror — an opt-in touch where the garden reflects the sky
 * outside. Everything here fails silently to `null`: the garden must never
 * look broken because a location or weather call didn't work.
 */

const TOGGLE_KEY = 'bloomwish:weather-mirror';

export async function isWeatherMirrorEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(TOGGLE_KEY)) === 'on';
}

export async function setWeatherMirrorEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(TOGGLE_KEY, enabled ? 'on' : 'off');
}

/** Ask for foreground location permission. Returns whether it was granted. */
export async function requestWeatherPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export interface LocalWeather {
  isRaining: boolean;
  isSnowing: boolean;
}

// Open-Meteo WMO weather codes: 51–67 drizzle/rain, 80–82 showers,
// 95–99 thunderstorms; 71–77 and 85–86 are snow.
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

/**
 * Current conditions at the user's location, via the free no-key Open-Meteo
 * API. Uses the last known position when available to avoid a GPS spin-up.
 */
export async function fetchLocalWeather(): Promise<LocalWeather | null> {
  try {
    if (!(await isWeatherMirrorEnabled())) return null;

    const position =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.LocationAccuracy.Low }));
    if (!position) return null;

    const { latitude, longitude } = position.coords;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}&current=precipitation,weather_code`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const body = (await response.json()) as {
      current?: { precipitation?: number; weather_code?: number };
    };
    const code = body.current?.weather_code ?? 0;
    const precipitation = body.current?.precipitation ?? 0;

    return {
      isRaining: RAIN_CODES.has(code) || (precipitation > 0 && !SNOW_CODES.has(code)),
      isSnowing: SNOW_CODES.has(code),
    };
  } catch {
    return null;
  }
}
