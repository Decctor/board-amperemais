import React from "react";

type TextareaInputProps = {
  label: string;
  value: string;
  placeholder: string;
  editable?: boolean;
  handleChange: (value: string) => void;
};
function TextareaInput({ label, value, placeholder, editable = true, handleChange }: TextareaInputProps) {
  return (
    <div className="flex w-full flex-col rounded-md border border-primary/20 shadow-sm">
      <h1 className="font w-full rounded-tl-md rounded-tr-md bg-primary p-1 text-center text-xs font-bold text-primary-foreground">{label}</h1>
      <textarea
        disabled={!editable}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          handleChange(e.target.value);
        }}
        className="min-h-[80px] w-full  resize-none rounded-bl-md rounded-br-md bg-[#fff] p-3 text-center text-xs font-medium text-primary outline-none dark:bg-[#121212] lg:min-h-[65px]"
      />
    </div>
  );
}

export default TextareaInput;
