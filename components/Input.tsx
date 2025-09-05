import React from 'react';
import styles from './Input.module.css';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  type?: 'text' | 'number';
  disabled?: boolean;
  hasError?: boolean;
  name?: string;
  id?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  onEnter,
  type = 'text',
  disabled = false,
  hasError = false,
  name,
  id,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter) {
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
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className={`${styles.input} ${hasError ? styles.inputError : ''}`}
        />
      </div>
    </div>
  );
};
