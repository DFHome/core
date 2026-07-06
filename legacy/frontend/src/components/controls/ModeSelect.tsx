interface Props {
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

export default function ModeSelect({ value, options, disabled, onChange }: Props) {
  return (
    <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
