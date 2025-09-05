import React from 'react';
import styles from './Typography.module.css';
import { TypographyVariant } from '@/types';

interface TypographyProps {
  variant: TypographyVariant;
  children: React.ReactNode;
  className?: string;
}

export const Typography: React.FC<TypographyProps> = ({
  variant,
  children,
  className = '',
}) => {
  const Component = variant === 'description' ? 'p' : variant;
  
  return (
    <Component className={`${styles[variant]} ${className}`}>
      {children}
    </Component>
  );
};
