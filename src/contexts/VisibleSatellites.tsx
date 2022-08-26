import { createContext, PropsWithChildren, useEffect, useState } from "react";
import {
  degreesLat,
  degreesLong,
  eciToGeodetic,
  gstime,
  propagate,
  SatRec,
  twoline2satrec,
} from "satellite.js";
import { useInterval } from "usehooks-ts";

declare module "satellite.js" {
  interface SatRec {
    init: "y" | "n";
  }
}

interface Location {
  lat: number;
  lng: number;
}

interface Satellite {
  id: number;
  distanceKm: number;
  location: Location;
  name: string;
  satrec: SatRec;
}

const MAX_DISTANCE_KM = 250;

const LOCATIONS = {
  HOME: {
    lat: 34.01518,
    lng: -118.49057,
  },
  NYC: {
    lat: 42.104111,
    lng: -118.3933,
  },
};

const getDistance = (
  { lat: lat1, lng: lng1 }: Location,
  { lat: lat2, lng: lng2 }: Location
): number => {
  const deg2rad = (deg: number) => deg * (Math.PI / 180);
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1); // deg2rad below
  const dLon = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km

  return d;
};

const getLocation = (
  satellite: Partial<Satellite>
): { lat: number; lng: number } | null => {
  const now = new Date();
  if (satellite.satrec === undefined) {
    return null;
  }

  const { position } = propagate(satellite.satrec, now);
  const gmst = gstime(now);

  if (typeof position === "boolean") {
    return null;
  }

  let latitude, longitude;
  try {
    ({ latitude, longitude } = eciToGeodetic(position, gmst));
  } catch (e) {
    console.log("error translating", satellite);
  }

  return {
    lat: latitude ? degreesLat(latitude) : 0,
    lng: longitude ? degreesLong(longitude) : 0,
  };
};

const parseSatellites = async (): Promise<Satellite[]> => {
  const tleData = await fetch("/data/tle.20220610.txt").then((r) => r.text());
  const lines = tleData.split("\n");
  const count = parseFloat((lines.length / 2).toFixed(0));
  const baseSatellites = [];
  // Load satrec
  for (let i = 0; i < count; i++) {
    const line1 = lines[i * 2 + 0];
    const line2 = lines[i * 2 + 1];

    let satrec = null;
    try {
      satrec = twoline2satrec(line1, line2);
    } catch (err) {
      continue;
    }

    if (satrec === null || satrec === undefined || satrec.error === 1) {
      continue;
    }
    baseSatellites.push({
      id: Number(line1.substring(2, 7)),
      distanceKm: 999999,
      satrec,
    });
  }

  const awaitForInit = async (
    satellites: Partial<Satellite>[]
  ): Promise<void> => {
    const resolveIfInit = (resolve: () => unknown) => {
      if (satellites.some((s) => s.satrec && s.satrec.init !== "n")) {
        setTimeout((_) => resolveIfInit(resolve), 100);
      } else {
        resolve();
      }
    };

    return new Promise(resolveIfInit);
  };

  await awaitForInit(baseSatellites);

  // Load metadata
  const oioData = await fetch("/data/oio.20220610.txt").then((r) => r.text());
  const parsedOioData = oioData.split("\n").reduce((oioByNorad, line) => {
    const [_int, name, norad] = line.split(",");
    oioByNorad[norad] = { name };
    return oioByNorad;
  }, {} as Record<string, { name: string }>);

  const satellites = baseSatellites
    .filter((s) => parsedOioData[s.id] !== undefined && s.satrec.error === 0)
    .map((s) => ({
      ...s,
      name: parsedOioData[s.id].name,
      location: getLocation(s) || { lat: 0, lng: 0 },
    }));

  return satellites;
};

const filterVisible = (
  satellites: Satellite[],
  location: Location
): Satellite[] =>
  satellites
    .map((s) => ({ ...s, distanceKm: getDistance(s.location, location) }))
    .filter((s) => s.distanceKm <= MAX_DISTANCE_KM);

const updateSatelliteLocations = (satellites: Satellite[]): Satellite[] =>
  satellites.map((s) => ({
    ...s,
    location: getLocation(s) || { lat: 0, lng: 0 },
  }));

interface VisibleSatellitesContextValue {
  isLoading: boolean;
  satellites: Satellite[];
}

export const VisibleSatellitesContext =
  createContext<VisibleSatellitesContextValue>({
    isLoading: true,
    satellites: [],
  });

const VisibleSatellitesProvider = ({
  children,
}: PropsWithChildren<unknown>): JSX.Element => {
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [visibleSatellites, setVisibleSatellites] = useState<Satellite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useInterval(async () => {
    const updatedSatellites = updateSatelliteLocations(satellites);
    setSatellites(updatedSatellites);
    setVisibleSatellites(filterVisible(satellites, LOCATIONS.HOME));
  }, 15000);

  useEffect(() => {
    parseSatellites().then((parsedSatellites) => {
      setSatellites(parsedSatellites);
      setVisibleSatellites(filterVisible(parsedSatellites, LOCATIONS.HOME));
      setIsLoading(false);
    });
  }, []);

  return (
    <VisibleSatellitesContext.Provider
      value={{ satellites: visibleSatellites, isLoading }}
    >
      {children}
    </VisibleSatellitesContext.Provider>
  );
};

export default VisibleSatellitesProvider;
