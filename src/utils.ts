import { MatchPhases, Penalty } from './types';

export const timeToString = (timeInSeconds: number) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

function hexToRGB(hex: string): [number, number, number] {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

function colorDistance(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  // Calculate the Euclidean distance between two RGB colors
  const [r1, g1, b1] = rgb1;
  const [r2, g2, b2] = rgb2;
  return Math.sqrt(
    Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2)
  );
}

export function checkColors(
  color1: string,
  color2: string,
  tolerance: number = 0.05
): boolean {
  // Convert hex colors to RGB
  const rgb1 = hexToRGB(color1);
  const rgb2 = hexToRGB(color2);

  // Calculate the distance between the two colors
  const distance = colorDistance(rgb1, rgb2);

  // Return true if the distance is less than the tolerance (colors are too close)
  return distance < tolerance;
}

// Example usage
// console.log(checkColors('#FF0000', '#FF0100')); // => false

export function calculatePenalties(penalties: Penalty[]) {
  const homeTeamPenaltiesScored = penalties.filter(
    (penalty) => penalty.team === 'home' && penalty.result === 'scored'
  ).length;
  const awayTeamPenaltiesScored = penalties.filter(
    (penalty) => penalty.team === 'away' && penalty.result === 'scored'
  ).length;
  return {
    homeTeamPenaltiesScored,
    awayTeamPenaltiesScored,
  };
}

export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export const getMatchPhases = (
  halfLength: number = 45,
  extraTimeHalfLength: number = 15
): MatchPhases => ({
  firstHalf: {
    title: 'First Half',
    start: 0,
    end: halfLength,
  },
  secondHalf: {
    title: 'Second Half',
    start: halfLength,
    end: halfLength * 2,
  },
  extraTimeFirstHalf: {
    title: 'Extra Time First Half',
    start: halfLength * 2,
    end: halfLength * 2 + extraTimeHalfLength,
  },
  extraTimeSecondHalf: {
    title: 'Extra Time Second Half',
    start: halfLength * 2 + extraTimeHalfLength,
    end: (halfLength + extraTimeHalfLength) * 2,
  },
});

export function arraysEqual(arr1?: string[], arr2?: string[]): boolean {
  if (arr1 === undefined || arr2 === undefined || arr1.length !== arr2.length)
    return false;

  const sortedArr1 = [...arr1].sort();
  const sortedArr2 = [...arr2].sort();

  return sortedArr1.every((value, index) => value === sortedArr2[index]);
}

export function insertValue(arr: string[], value: string): string[] {
  if (!arr.includes(value)) {
    return [...arr, value];
  }
  return arr;
}

export function removeValue(arr: string[], value: string): string[] {
  return arr.filter((item) => item !== value);
}

export const debounce = (func: (...args: any) => void, delay: number) => {
  let timer: any;
  return (...args: any) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};
