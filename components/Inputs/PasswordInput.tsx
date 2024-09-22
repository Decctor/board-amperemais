import React from "react";
type TextInputProps = {
  width?: string;
  label: string;
  labelClassName?: string;
  showLabel?: boolean;
  value: string;
  placeholder: string;
  editable?: boolean;
  handleChange: (value: string) => void;
  handleOnBlur?: () => void;
};
function PasswordInput({
  width,
  label,
  labelClassName = "text-sm tracking-tight text-primary/80 font-medium",
  showLabel = true,
  value,
  placeholder,
  editable = true,
  handleChange,
  handleOnBlur,
}: TextInputProps) {
  const inputIdentifier = label.toLowerCase().replace(" ", "_");
  return (
    <div className={`flex w-full flex-col gap-1 lg:w-[${width ? width : "350px"}]`}>
      {showLabel ? (
        <label htmlFor={inputIdentifier} className={labelClassName}>
          {label}
        </label>
      ) : null}

      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        id={inputIdentifier}
        onBlur={() => {
          if (handleOnBlur) handleOnBlur();
          else return;
        }}
        readOnly={!editable}
        type="password"
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-200 p-3 text-sm shadow-sm outline-none placeholder:italic"
      />
    </div>
  );
}

export default PasswordInput;
