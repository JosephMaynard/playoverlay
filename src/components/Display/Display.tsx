import React, { useState, useEffect } from "react";
import { Scores, Settings, Time } from "../../types";

const Display = () => {
  const [score, setScore] = useState<Scores>({ homeTeam: 0, awayTeam: 0 });
  const [settings, setSettings] = useState<Settings>({
    keyColour: "#0000FF",
    homeTeamName: "HOM",
    awayTeamName: "AWA",
  });
  const [time, setTime] = useState<Time>({ time: "0:00" });

  useEffect(() => {
    const receiveScore = (event: any, updatedScore: Scores) => {
      setScore(updatedScore);
    };

    const receiveSettings = (event: any, updatedSettings: Settings) => {
      setSettings(updatedSettings);
    };

    (window as any).api.receive("score-update", receiveScore);
    (window as any).api.receive("settings-update", receiveSettings);

    // Cleanup the listener when the component unmounts
    return () => {
      (window as any).api.receive("score-update", null);
      (window as any).api.receive("settings-update", null);
    };
  }, []);

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ backgroundColor: settings.keyColour }}
    >
      Home: {score.homeTeam} | Away: {score.awayTeam}
    </div>
  );
};

export default Display;
