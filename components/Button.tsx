import React from 'react';
import styles from './Button.module.css';
import { ButtonSize } from '@/types';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  size?: ButtonSize;
  fullWidth?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  size = 'md',
  fullWidth = false,
  type = 'button',
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${styles.button} ${styles[size]} ${fullWidth ? styles.fullWidth : ''} ${className}`}
    >
      <span>{children}</span>
    </button>
  );
};
