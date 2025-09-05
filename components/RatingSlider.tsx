import React from 'react';
import { Slider } from './Slider';
import { Typography } from './Typography';
import styles from './RatingSlider.module.css';

interface RatingSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  currentRating?: number;
  disabled?: boolean;
  className?: string;
}

export const RatingSlider: React.FC<RatingSliderProps> = ({
  value,
  onChange,
  min = 1,
  max = 5,
  currentRating,
  disabled = false,
  className = ''
}) => {
  const handleValueChange = (values: number[]) => {
    onChange(values[0]);
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <Typography variant="description">Zielrating: {value.toFixed(1)}</Typography>
        {currentRating && (
          <Typography variant="description" className={styles.currentRating}>
            Aktuell: {currentRating.toFixed(1)}
          </Typography>
        )}
      </div>
      
      <div className={styles.sliderContainer}>
        <Slider
          value={[value]}
          onValueChange={handleValueChange}
          min={min}
          max={max}
          step={0.1}
          disabled={disabled}
        />
        
        <div className={styles.labels}>
          <span className={styles.label}>{min.toFixed(1)}</span>
          <span className={styles.label}>{max.toFixed(1)}</span>
        </div>
      </div>
      
      {currentRating && value <= currentRating && (
        <Typography variant="description" className={styles.warning}>
          ⚠️ Das Zielrating muss höher als das aktuelle Rating sein
        </Typography>
      )}
    </div>
  );
};
