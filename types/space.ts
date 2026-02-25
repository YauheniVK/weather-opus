export interface Planet {
  name: string;
  nameEn: string;
  angle: number;
  distance: number;
  color: string;
  size: number;
}

export interface Voyager {
  name: string;
  angle: number;
  distance: number;
  speed: number;
  launched: string;
}

export interface SolarFlare {
  flareClass: string;
  time: string;
  region: string;
  duration: number;
}

export type StormColor = "green" | "yellow" | "red";

export interface GeomagneticStorm {
  level: string;
  description: string;
  color: StormColor;
}
