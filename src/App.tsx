import styles from "./App.module.scss";
import SatelliteList from "components/SatelliteList";
import VisibleSatellitesProvider from "contexts/VisibleSatellites";

const App = (): JSX.Element => {
  return (
    <div className={styles.container}>
      <header className={styles.header}>Satellite Messaging</header>
      <VisibleSatellitesProvider>
        <SatelliteList />
      </VisibleSatellitesProvider>
    </div>
  );
};

export default App;
