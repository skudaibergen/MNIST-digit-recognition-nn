
export const zip = rows => rows[0].map((_,c)=>rows.map(row => row[c]));

export const range = (startAt, size) => {
  const arr = [ ...Array(size).keys() ];
  return arr.splice(startAt, arr.length - startAt);
}

// Modern version of the Fisher–Yates shuffle algorithm
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j =  Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const parseInt = stringArr => stringArr.map(el => Number.parseInt(el));

export const idxOfMax = arr => arr.indexOf(Math.max(...arr));
