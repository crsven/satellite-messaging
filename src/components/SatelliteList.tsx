import { VisibleSatellitesContext } from "contexts/VisibleSatellites";
import {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const ALLOWLIST_CHARACTERS = [" ", ".", ",", "-", "?", "!", "/", "(", ")"];

const SatelliteList = (): JSX.Element => {
  const { isLoading, satellites } = useContext(VisibleSatellitesContext);

  const [allLetters, setAllLetters] = useState<string[]>([]);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const newLetters = satellites.reduce<string[]>(
      (collectedLetters, satellite) => {
        const letterArray = Array.from(satellite.name);
        return collectedLetters.concat(letterArray);
      },
      []
    );

    setAllLetters(newLetters);
  }, [satellites]);

  const updateMessage = useCallback(
    ({ target }: ChangeEvent<HTMLInputElement>) => {
      const [allowedLetters, _leftoverLetters] = Array.from(
        target.value
      ).reduce<[string[], string[]]>(
        ([allowedCharacters, availableLetters], character) => {
          const indexOfUpperChar = availableLetters.indexOf(
            character.toUpperCase()
          );
          const indexOfLowerChar = availableLetters.indexOf(
            character.toLowerCase()
          );
          if (indexOfUpperChar >= 0) {
            allowedCharacters.push(character);
            availableLetters.splice(indexOfUpperChar, 1);
          } else if (indexOfLowerChar >= 0) {
            allowedCharacters.push(character);
            availableLetters.splice(indexOfLowerChar, 1);
          } else if (ALLOWLIST_CHARACTERS.includes(character)) {
            allowedCharacters.push(character);
          }
          return [allowedCharacters, availableLetters];
        },
        [new Array<string>(), Array.from(allLetters)]
      );

      const allowedMessage = allowedLetters.join("");
      setMessage(allowedMessage);
    },
    [allLetters]
  );

  return (
    <>
      {isLoading ? <p>Loading satellites...</p> : <p>Satellites above you:</p>}
      <ul>
        {satellites.map(({ id, distanceKm, name }) => (
          <li key={id}>
            {id}: {name} ({distanceKm.toFixed(2)} km away)
          </li>
        ))}
      </ul>
      <label htmlFor="message">What is your message?</label>
      <input
        name="message"
        onChange={updateMessage}
        type="text"
        value={message}
      />
    </>
  );
};

export default SatelliteList;
