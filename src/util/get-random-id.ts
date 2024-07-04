const alphabet = "zyxwvutsrqponmlkjihgfedcba"
export const getRandomId = (length: number): string => {
  let str = ""
  let num = length
  while (num--) str += alphabet[(Math.random() * alphabet.length) | 0]
  return str
}
