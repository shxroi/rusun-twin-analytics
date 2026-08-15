export const nf = (v: number, digits = 1) =>
  v.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const rp = (v: number) =>
  `Rp ${Math.round(v).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

export const kwh = (v: number, digits = 1) => `${nf(v, digits)} kWh`;
export const m3 = (v: number, digits = 2) => `${nf(v, digits)} m³`;

export const dayOf = (date: string) => Number(date.slice(-2));

export const shortDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
