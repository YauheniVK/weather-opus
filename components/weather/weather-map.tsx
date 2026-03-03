"use client";

import "leaflet/dist/leaflet.css";
import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Thermometer, Cloud, CloudRain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { WeatherData } from "@/types";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

type WeatherLayer = "temp_new" | "clouds_new" | "precipitation_new";

const LAYERS: { id: WeatherLayer; label: string; icon: React.ReactNode }[] = [
  { id: "temp_new", label: "Temp", icon: <Thermometer className="h-3.5 w-3.5" /> },
  { id: "clouds_new", label: "Clouds", icon: <Cloud className="h-3.5 w-3.5" /> },
  { id: "precipitation_new", label: "Rain", icon: <CloudRain className="h-3.5 w-3.5" /> },
];

/** Imperatively swaps the OWM overlay layer when `layer` changes. */
function WeatherOverlay({ layer }: { layer: WeatherLayer }) {
  const map = useMap();
  const tileRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    // Remove previous layer
    if (tileRef.current) {
      map.removeLayer(tileRef.current);
    }
    // Add new layer
    const tileLayer = L.tileLayer(
      `/api/weather/tile?layer=${layer}&z={z}&x={x}&y={y}`,
      { opacity: 0.6, attribution: "© OpenWeatherMap" },
    );
    tileLayer.addTo(map);
    tileRef.current = tileLayer;

    return () => {
      if (tileRef.current) {
        map.removeLayer(tileRef.current);
        tileRef.current = null;
      }
    };
  }, [map, layer]);

  return null;
}

interface WeatherMapProps {
  lat: number;
  lon: number;
  data: WeatherData;
}

export default function WeatherMap({ lat, lon, data }: WeatherMapProps) {
  const [activeLayer, setActiveLayer] = useState<WeatherLayer>("temp_new");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Weather Map</CardTitle>
          <div className="flex gap-1">
            {LAYERS.map((layer) => (
              <Button
                key={layer.id}
                variant={activeLayer === layer.id ? "default" : "outline"}
                size="sm"
                className="h-7 px-2.5 gap-1.5 text-xs"
                onClick={() => setActiveLayer(layer.id)}
              >
                {layer.icon}
                {layer.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4 px-4">
        <div className="h-80 rounded-xl overflow-hidden">
          <MapContainer
            center={[lat, lon]}
            zoom={8}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <WeatherOverlay layer={activeLayer} />
            <Marker position={[lat, lon]} icon={markerIcon}>
              <Popup>
                <div className="text-sm space-y-1 min-w-[140px]">
                  <p className="font-semibold">
                    {data.city}, {data.country}
                  </p>
                  <p className="capitalize text-gray-600">{data.description}</p>
                  <p>🌡 {Math.round(data.temperature)}°C</p>
                  <p>💨 {data.windSpeed} m/s</p>
                  <p>💧 {data.humidity}%</p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
