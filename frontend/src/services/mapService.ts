import Constants from "expo-constants";
import { api } from "./api";

export const MAPTILER_KEY = String(Constants.expoConfig?.extra?.maptilerApiKey ?? process.env.EXPO_PUBLIC_MAPTILER_API_KEY ?? "");

export const mapService = {
  configured: MAPTILER_KEY.length > 0,
  staticMap(latitude: number, longitude: number, zoom = 12, width = 720, height = 360) {
    if (!MAPTILER_KEY) return "";
    return `https://api.maptiler.com/maps/streets-v2/static/${longitude},${latitude},${zoom}/${width}x${height}.png?key=${encodeURIComponent(MAPTILER_KEY)}`;
  },
  geocode: (query: string) => api.get(`/api/maps/geocode?q=${encodeURIComponent(query)}`),
  reverse: (longitude: number, latitude: number) => api.get(`/api/maps/reverse?lon=${longitude}&lat=${latitude}`),
};