interface Props {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

export default function SwitchControl({ checked, disabled, onChange }: Props) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="slider-toggle" />
    </label>
  );
}
