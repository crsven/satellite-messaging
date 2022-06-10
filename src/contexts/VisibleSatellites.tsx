import { createContext, PropsWithChildren, useState } from "react";
import { useInterval } from "usehooks-ts";

interface Satellite {
  name: string;
}

const SATELLITE_DB = [
  [{ name: "Satellite 1" }, { name: "Another One" }],
  [{ name: "Satellite 2" }, { name: "Another One" }],
  [{ name: "Bingo 5" }, { name: "Satellite 2" }],
];

export const VisibleSatellitesContext = createContext<Satellite[]>([]);

const VisibleSatellitesProvider = ({
  children,
}: PropsWithChildren<unknown>): JSX.Element => {
  const [index, setIndex] = useState<number>(0);
  const [satellites, setSatellites] = useState<Satellite[]>(
    SATELLITE_DB[index]
  );

  useInterval(() => {
    setSatellites(SATELLITE_DB[index % SATELLITE_DB.length]);
    setIndex(index + 1);
  }, 15000);

  return (
    <VisibleSatellitesContext.Provider value={satellites}>
      {children}
    </VisibleSatellitesContext.Provider>
  );
};

export default VisibleSatellitesProvider;
