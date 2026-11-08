"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown } from "lucide-react";

type Option = { value: string; label: string; description?: string };
export function Dropdown({
  label,
  options,
  name,
  value,
  defaultValue = "",
  onChange,
  disabled = false,
  id: controlId,
  invalid,
  describedBy,
  required,
}: {
  label: string;
  options: Option[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  required?: boolean;
}) {
  const [localValue, setLocalValue] = useState(defaultValue);
  const selected = value ?? localValue;
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === selected),
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(index);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 240,
  });
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const typeahead = useRef({ text: "", time: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const height = viewport?.height ?? innerHeight;
      const width = viewport?.width ?? innerWidth;
      const offset = viewport?.offsetTop ?? 0;
      const below = height + offset - rect.bottom - 12;
      const above = rect.top - offset - 12;
      const desired = Math.min(options.length * 52 + 10, 280);
      const up = below < desired && above > below;
      const maxHeight = Math.max(44, Math.min(280, up ? above : below));
      const menuWidth = Math.min(Math.max(rect.width, 220), width - 24);
      setPosition({
        left: Math.max(12, Math.min(rect.left, width - menuWidth - 12)),
        top: up ? rect.top - Math.min(desired, maxHeight) - 6 : rect.bottom + 6,
        width: menuWidth,
        maxHeight,
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !menu.current?.contains(event.target as Node)
      )
        setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-option-${active}`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [active, open, id]);

  function choose(option: Option) {
    setLocalValue(option.value);
    setOpen(false);
    onChange?.(option.value);
    trigger.current?.focus();
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      setActive(
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? options.length - 1
            : !open
              ? index
              : (active +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  options.length) %
                options.length,
      );
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "Tab") setOpen(false);
    else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(options[active]);
    } else if (
      event.key.length === 1 &&
      event.key !== " " &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      const now = Date.now();
      typeahead.current = {
        text:
          now - typeahead.current.time < 600
            ? typeahead.current.text + event.key
            : event.key,
        time: now,
      };
      const match = options.findIndex((option) =>
        option.label
          .toLowerCase()
          .startsWith(typeahead.current.text.toLowerCase()),
      );
      if (match >= 0) {
        setActive(match);
        setOpen(true);
      }
    }
  }
  return (
    <>
      {name ? (
        <input type="hidden" name={name} value={selected} disabled={disabled} />
      ) : null}
      <button
        ref={trigger}
        id={controlId}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        aria-required={required}
        type="button"
        role="combobox"
        className="custom-dropdown"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? id : undefined}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        disabled={disabled}
        onKeyDown={keyDown}
        onBlur={(event) => {
          if (!menu.current?.contains(event.relatedTarget as Node))
            setOpen(false);
        }}
        onClick={() => {
          setActive(index);
          setOpen(!open);
        }}
      >
        <span>
          {options.find((option) => option.value === selected)?.label ??
            "Choose"}
        </span>
        <ChevronsUpDown size={14} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            id={id}
            ref={menu}
            className="dropdown-menu"
            role="listbox"
            aria-label={label}
            style={position}
            onPointerDown={(event) => event.preventDefault()}
          >
            {options.map((option, itemIndex) => (
              <div
                key={option.value}
                id={`${id}-option-${itemIndex}`}
                role="option"
                aria-selected={selected === option.value}
                className={`dropdown-option${active === itemIndex ? " is-active" : ""}`}
                onPointerMove={() => setActive(itemIndex)}
                onClick={() => choose(option)}
              >
                <span>
                  <strong>{option.label}</strong>
                  {option.description && <small>{option.description}</small>}
                </span>
                {selected === option.value && (
                  <Check size={16} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
