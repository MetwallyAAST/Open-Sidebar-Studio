"use client";
import { RotateCcw } from "lucide-react";
export const title = (key: string) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
type Value = string | number | boolean;
export function Field({
  name,
  value,
  onChange,
  options,
  min,
  max,
  step,
  reset,
  help,
}: {
  name: string;
  value: Value;
  onChange: (value: Value) => void;
  options?: readonly string[];
  min?: number;
  max?: number;
  step?: number;
  reset?: () => void;
  help?: string;
}) {
  const color =
    typeof value === "string" &&
    /color|background|text$|accent/i.test(name) &&
    !options;
  return (
    <label
      className={`field ${typeof value === "boolean" ? "toggle-field" : ""}`}
    >
      <span>
        {title(name)}
        {reset && (
          <button
            type="button"
            className="reset-field"
            title={`Reset ${title(name)}`}
            aria-label={`Reset ${title(name)}`}
            onClick={(e) => {
              e.preventDefault();
              reset();
            }}
          >
            <RotateCcw size={11} />
          </button>
        )}
      </span>
      {typeof value === "boolean" ? (
        <input
          aria-label={title(name)}
          type="checkbox"
          role="switch"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
      ) : options ? (
        <select
          aria-label={title(name)}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {title(option)}
            </option>
          ))}
        </select>
      ) : typeof value === "number" ? (
        <div className="number-control">
          <input
            aria-label={title(name)}
            type="number"
            value={value}
            min={min}
            max={max}
            step={step ?? 1}
            onChange={(e) => {
              if (e.target.value !== "") onChange(Number(e.target.value));
            }}
          />
          <span>
            {/Duration|Fade|Delay/.test(name)
              ? "ms"
              : /opacity|shadow$|mass|stiffness|damping|order|zIndex|saturation/i.test(
                    name,
                  )
                ? ""
                : "px"}
          </span>
        </div>
      ) : color ? (
        <div className="color-control">
          <input
            aria-label={`${title(name)} picker`}
            type="color"
            value={/^#[\da-f]{6}$/i.test(value) ? value : "#555555"}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            aria-label={title(name)}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#ffffff or rgba(...)"
          />
        </div>
      ) : (
        <input
          aria-label={title(name)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}{" "}
      {help && <small>{help}</small>}
    </label>
  );
}
export function Fields<T extends object>({
  value,
  defaults,
  keys,
  onChange,
  options = {},
}: {
  value: T;
  defaults: T;
  keys: (keyof T)[];
  onChange: (value: T) => void;
  options?: Partial<Record<keyof T, readonly string[]>>;
}) {
  return (
    <div className="fields">
      {keys.map((key) => (
        <Field
          key={String(key)}
          name={String(key)}
          value={value[key] as Value}
          options={options[key]}
          step={/opacity|shadow$|mass/i.test(String(key)) ? 0.05 : 1}
          onChange={(v) => onChange({ ...value, [key]: v })}
          reset={() => onChange({ ...value, [key]: defaults[key] })}
        />
      ))}
    </div>
  );
}
