interface HsvValue {
  h: number;
  s: number;
  v: number;
}

interface Props {
  value: HsvValue | number | unknown;
  colorModel?: string | null;
  disabled?: boolean;
  onChange: (value: HsvValue | number) => void;
}

function hsvToHex(hsv: HsvValue): string {
  const { h, s, v } = hsv;
  const sN = s / 100;
  const vN = v / 100;
  const c = vN * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vN - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex: string): HsvValue {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return { h: Math.round(h), s: Math.round(s), v: Math.round(v) };
}

export default function ColorControl({ value, colorModel, disabled, onChange }: Props) {
  if (colorModel === "temperature_k") {
    const kelvin = typeof value === "number" ? value : 4500;
    return (
      <input
        type="range"
        min={2000}
        max={9000}
        step={100}
        value={kelvin}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }

  const hsv = (value as HsvValue) ?? { h: 0, s: 0, v: 100 };
  return (
    <input
      type="color"
      value={hsvToHex(hsv)}
      disabled={disabled}
      onChange={(e) => onChange(hexToHsv(e.target.value))}
    />
  );
}
