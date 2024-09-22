import React, { useEffect, useRef, useState } from "react";

import { HiCheck } from "react-icons/hi";
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";

type SelectOption<T> = {
  id: string | number;
  value: any;
  label: string;
};
type SelectInputProps<T> = {
  width?: string;
  label: string;
  labelClassName?: string;
  showLabel?: boolean;
  value: T | null;
  editable?: boolean;
  selectedItemLabel: string;
  options: SelectOption<T>[] | null;
  handleChange: (value: T) => void;
  onReset: () => void;
};

function SelectInput<T>({
  width,
  label,
  labelClassName = "text-sm tracking-tight text-primary/80 font-medium text-start",
  showLabel = true,
  value,
  editable = true,
  options,
  selectedItemLabel,
  handleChange,
  onReset,
}: SelectInputProps<T>) {
  function getValueID(value: T | null) {
    if (options && value) {
      const filteredOption = options?.find((option) => option.value === value);
      if (filteredOption) return filteredOption.id;
      else return null;
    } else return null;
  }

  const ref = useRef<any>(null);
  const [items, setItems] = useState<SelectOption<T>[] | null>(options);
  const [selectMenuIsOpen, setSelectMenuIsOpen] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<number | string | null>(getValueID(value));
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">("down");

  const inputIdentifier = label.toLowerCase().replace(" ", "_");

  function handleSelect(id: string | number, item: T) {
    handleChange(item);
    setSelectedId(id);
    setSelectMenuIsOpen(false);
  }

  function handleFilter(value: string) {
    setSearchFilter(value);
    if (!items || !options) return;
    if (value.trim().length > 0) {
      let filteredItems = options.filter((item) => item.label.toUpperCase().includes(value.toUpperCase()));
      setItems(filteredItems);
      return;
    } else {
      setItems(options);
      return;
    }
  }

  function resetState() {
    onReset();
    setSelectedId(null);
    setSelectMenuIsOpen(false);
  }

  function onClickOutside() {
    setSearchFilter("");
    setSelectMenuIsOpen(false);
  }

  useEffect(() => {
    setSelectedId(getValueID(value));
    setItems(options);
  }, [options, value]);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClickOutside();
      }
    };
    document.addEventListener("click", handleClickOutside, true);
    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [onClickOutside]);

  useEffect(() => {
    if (selectMenuIsOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        setDropdownDirection("up");
      } else {
        setDropdownDirection("down");
      }
    }
  }, [selectMenuIsOpen]);

  return (
    <div ref={ref} className={`relative flex w-full flex-col gap-1 lg:w-[${width ? width : "350px"}]`}>
      {showLabel ? (
        <label htmlFor={inputIdentifier} className={labelClassName}>
          {label}
        </label>
      ) : null}
      <div
        className={`flex h-full min-h-[46.6px] w-full items-center justify-between rounded-md border duration-500 ease-in-out ${
          selectMenuIsOpen ? "border-primary" : "border-primary/20"
        } bg-[#fff] p-3 text-sm shadow-sm dark:bg-[#121212]`}
      >
        {selectMenuIsOpen ? (
          <input
            type="text"
            autoFocus
            value={searchFilter}
            onChange={(e) => handleFilter(e.target.value)}
            placeholder="Filtre o item desejado..."
            className="h-full w-full text-sm italic outline-none"
          />
        ) : (
          <p
            onClick={() => {
              if (editable) setSelectMenuIsOpen((prev) => !prev);
            }}
            className="grow cursor-pointer text-primary"
          >
            {selectedId && options ? options.filter((item) => item.id == selectedId)[0]?.label : selectedItemLabel}
          </p>
        )}
        {selectMenuIsOpen ? (
          <IoMdArrowDropup
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (editable) setSelectMenuIsOpen((prev) => !prev);
            }}
          />
        ) : (
          <IoMdArrowDropdown
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (editable) setSelectMenuIsOpen((prev) => !prev);
            }}
          />
        )}
      </div>
      {selectMenuIsOpen ? (
        <div
          className={`absolute ${
            dropdownDirection === "down" ? "top-[75px]" : "bottom-[75px]"
          } scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 z-[100] flex h-[250px] max-h-[250px] w-full flex-col gap-1 self-center overflow-y-auto overscroll-y-auto rounded-md border border-primary/20 bg-[#fff] p-2 py-1 shadow-sm dark:bg-[#121212]`}
        >
          <div onClick={() => resetState()} className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-primary/20 ${!selectedId ? "bg-primary/20" : ""}`}>
            <p className="grow text-sm font-medium text-primary">{selectedItemLabel}</p>
            {!selectedId ? <HiCheck style={{ color: "#fead61", fontSize: "20px" }} /> : null}
          </div>
          <div className="my-2 h-[1px] w-full bg-gray-200"></div>
          {items ? (
            items.map((item, index) => (
              <div
                onClick={() => handleSelect(item.id, item.value)}
                key={item.id ? item.id : index}
                className={`flex w-full cursor-pointer items-center rounded p-1 px-2 hover:bg-primary/20 ${selectedId == item.id ? "bg-primary/20" : ""}`}
              >
                <p className="grow text-sm font-medium text-primary">{item.label}</p>
                {selectedId == item.id ? <HiCheck style={{ color: "#fead61", fontSize: "20px" }} /> : null}
              </div>
            ))
          ) : (
            <p className="w-full text-center text-sm italic text-primary">Sem opções disponíveis.</p>
          )}
        </div>
      ) : (
        false
      )}
    </div>
  );
}

export default SelectInput;
