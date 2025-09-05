import React from 'react';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'currentColor'
}) => {
  return (
    <div className={`${styles.spinner} ${styles[size]}`}>
      <div className={styles.dot1} style={{ backgroundColor: color }}></div>
      <div className={styles.dot2} style={{ backgroundColor: color }}></div>
      <div className={styles.dot3} style={{ backgroundColor: color }}></div>
    </div>
  );
};
