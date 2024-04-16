import React, { useState, useEffect } from "react";

export interface Scores {
  homeTeam: number;
  awayTeam: number;
}

export interface Settings {
  keyColour: string;
}

export interface Time {
  time: string;
  additionalTime?: number;
}

const Display = () => {
  const [score, setScore] = useState<Scores>({ homeTeam: 0, awayTeam: 0 });
  const [settings, setSettings] = useState<Settings>({ keyColour: "#0000FF" });

  useEffect(() => {
    (window as any).api.receive("score-update", (updatedScore: Scores) => {
      setScore(updatedScore);
    });

    // Cleanup the listener when the component unmounts
    return () => {
      (window as any).api.receive("score-update", () => {});
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
