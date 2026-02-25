import type { Planet, Voyager, SolarFlare, GeomagneticStorm } from "@/types/space";

export const PLANETS: Planet[] = [
  { name: "Меркурий", nameEn: "Mercury", angle: 145, distance: 0.39, color: "#B5B5B5", size: 4  },
  { name: "Венера",   nameEn: "Venus",   angle: 280, distance: 0.72, color: "#E8C46A", size: 7  },
  { name: "Земля",    nameEn: "Earth",   angle: 157, distance: 1.00, color: "#4B9CD3", size: 7  },
  { name: "Марс",     nameEn: "Mars",    angle: 72,  distance: 1.52, color: "#C1440E", size: 5  },
  { name: "Юпитер",  nameEn: "Jupiter", angle: 312, distance: 5.20, color: "#C88B3A", size: 18 },
  { name: "Сатурн",  nameEn: "Saturn",  angle: 348, distance: 9.58, color: "#E4D191", size: 15 },
  { name: "Уран",    nameEn: "Uranus",  angle: 68,  distance: 19.2, color: "#7DE8E8", size: 11 },
  { name: "Нептун",  nameEn: "Neptune", angle: 320, distance: 30.1, color: "#5B5EA6", size: 10 },
];

// Voyager angles are approximate ecliptic longitudes for visualization
export const VOYAGERS: Voyager[] = [
  { name: "Voyager 1", angle: 35,  distance: 163.7, speed: 17.0, launched: "1977-09-05" },
  { name: "Voyager 2", angle: 295, distance: 136.3, speed: 15.4, launched: "1977-08-20" },
];

export const SOLAR_FLARES: SolarFlare[] = [
  { flareClass: "M2.3", time: "2025-02-26T04:22Z", region: "AR3576", duration: 18 },
  { flareClass: "C8.1", time: "2025-02-25T19:45Z", region: "AR3574", duration: 9  },
  { flareClass: "X1.1", time: "2025-02-25T11:30Z", region: "AR3576", duration: 32 },
];

export const GEOMAGNETIC_STORM: GeomagneticStorm = {
  level: "G2",
  description: "Умеренная буря",
  color: "yellow",
};
