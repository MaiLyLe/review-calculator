import React, { forwardRef } from "react";
import styles from "./Input.module.css";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  type?: "text" | "number";
  disabled?: boolean;
  hasError?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      placeholder,
      value,
      onChange,
      onEnter,
      onKeyDown,
      onFocus,
      onBlur,
      type = "text",
      disabled = false,
      hasError = false,
      name,
      id,
      className,
    },
    ref
  ) => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && onEnter) {
        onEnter();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (onKeyDown) {
        onKeyDown(e);
      }
      // Still handle Enter for backward compatibility
      if (e.key === "Enter" && onEnter && !onKeyDown) {
        onEnter();
      }
    };

    const inputId = id || `input_${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={styles.container}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={styles.inputWrapper}>
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={`${styles.input} ${hasError ? styles.inputError : ""} ${
              className || ""
            }`}
          />
        </div>
      </div>
    );
  }
);

Input.displayName = "Input";
