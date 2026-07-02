interface Props {
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string | null;
  disabled?: boolean;
  onChange: (value: number) => void;
}

export default function SliderControl({ value, min, max, step, unit, disabled, onChange }: Props) {
  return (
    <>
      <input
        type="range"
        min={min}
        max={max}
        step={step || 1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span style={{ fontSize: 12, color: "#666", minWidth: 40, textAlign: "right" }}>
        {value}
        {unit || ""}
      </span>
    </>
  );
}
