"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface WeatherSearchProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  autoLocate?: boolean;
}

export function WeatherSearch({ onSearch, isLoading, autoLocate }: WeatherSearchProps) {
  const [city, setCity] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (autoLocate) {
      handleGeolocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = city.trim();
    if (!trimmed) return;
    onSearch(trimmed);
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onSearch(`lat=${latitude}&lon=${longitude}`);
        setGeoLoading(false);
      },
      (error) => {
        setGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location access denied. Please allow location access.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location unavailable. Try searching by city name.");
            break;
          default:
            toast.error("Could not get your location. Try searching by city name.");
        }
      },
      { timeout: 10000 }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search city (e.g. London, New York...)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="pl-10 h-11 text-base"
          disabled={isLoading || geoLoading}
        />
      </div>
      <Button
        type="submit"
        className="h-11 px-5"
        variant="gradient"
        disabled={isLoading || geoLoading || !city.trim()}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        <span className="hidden sm:inline ml-2">Search</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11 px-4"
        onClick={handleGeolocation}
        disabled={isLoading || geoLoading}
        title="Use my location"
      >
        {geoLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MapPin className="h-4 w-4 text-blue-500" />
        )}
        <span className="hidden sm:inline ml-2">My Location</span>
      </Button>
    </form>
  );
}
