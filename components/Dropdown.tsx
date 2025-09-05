import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import styles from './Dropdown.module.css';
import { BusinessSearchResult } from '@/types';
import { Button } from './Button';

interface DropdownProps {
  results: BusinessSearchResult[];
  onSelect: (business: BusinessSearchResult) => void;
  isVisible: boolean;
  trigger?: React.ReactNode;
}

export const Dropdown: React.FC<DropdownProps> = ({ 
  results, 
  onSelect, 
  isVisible, 
  trigger 
}) => {
  if (!isVisible || results.length === 0) return null;

  return (
    <DropdownMenu.Root open={isVisible}>
      {trigger && (
        <DropdownMenu.Trigger asChild>
          {trigger}
        </DropdownMenu.Trigger>
      )}
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.dropdown} sideOffset={2}>
          {results.map((business) => (
            <DropdownMenu.Item
              key={business.place_id}
              className={styles.item}
              onSelect={() => onSelect(business)}
            >
              <div className={styles.title}>{business.title}</div>
              <div className={styles.address}>{business.address}</div>
              {business.rating && (
                <div className={styles.rating}>
                  Rating: {business.rating}/5.0 ({business.reviews_count} Bewertungen)
                </div>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

// Alternative simpler dropdown for search results (non-menu style)
export const SearchResultsDropdown: React.FC<DropdownProps> = ({ 
  results, 
  onSelect, 
  isVisible 
}) => {
  if (!isVisible || results.length === 0) return null;

  return (
    <div className={styles.dropdown}>
      {results.map((business) => (
        <div
          key={business.place_id}
          className={styles.item}
          onClick={() => onSelect(business)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelect(business);
            }
          }}
        >
          <div className={styles.title}>{business.title}</div>
          <div className={styles.address}>{business.address}</div>
          {business.rating && (
            <div className={styles.rating}>
              Rating: {business.rating}/5.0 ({business.reviews_count} Bewertungen)
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
