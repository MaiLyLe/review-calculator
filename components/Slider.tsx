import React from 'react';
import * as RadixSlider from '@radix-ui/react-slider';
import styles from './Slider.module.css';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  min = 0,
  max = 5,
  step = 0.1,
  disabled = false,
  className = ''
}) => {
  return (
    <RadixSlider.Root
      className={`${styles.sliderRoot} ${className}`}
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
    >
      <RadixSlider.Track className={styles.sliderTrack}>
        <RadixSlider.Range className={styles.sliderRange} />
      </RadixSlider.Track>
      <RadixSlider.Thumb className={styles.sliderThumb} aria-label="Rating value" />
    </RadixSlider.Root>
  );
};
