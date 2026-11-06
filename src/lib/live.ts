/** Sample figures for a sample bank. Everything that ticks on the page ticks from the clock here. */
export const RATE = 0.0412;
export const BALANCE = 48210.52;
const BOOK_START = 4218902113.4;
const BOOK_PER_SEC = 37.21;

const t0 = typeof performance !== "undefined" ? performance.now() : 0;
export const elapsed = () => (performance.now() - t0) / 1000;

export const money = (v: number, digits = 2) =>
  v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const interestPerSecond = (balance: number) => (balance * RATE) / (365 * 24 * 3600);
export const liveBalance = () => BALANCE + elapsed() * interestPerSecond(BALANCE);
export const liveBook = () => BOOK_START + Math.floor(elapsed() * 2) * (BOOK_PER_SEC / 2);
