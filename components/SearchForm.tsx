import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Typography } from "@/components/Typography";
import { SearchResultsDropdown } from "@/components/Dropdown";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useBusinessSearch } from "@/hooks/useBusinessSearch";
import { BusinessSearchResult } from "@/types";
import { validateSearchQuery } from "@/utils/validate";
import styles from "./SearchForm.module.css";

interface SearchFormProps {
  onBusinessSelect: (business: BusinessSearchResult) => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onBusinessSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const [isThrottled, setIsThrottled] = useState(false);

  const {
    results,
    loading: searchLoading,
    error: searchError,
    search,
    clearResults,
  } = useBusinessSearch();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSearch = async () => {
    const now = Date.now();
    const timeSinceLastSearch = now - lastSearchTime;
    const minInterval = 2000; // 2 seconds between searches

    // Check if user is searching too frequently
    if (timeSinceLastSearch < minInterval && lastSearchTime > 0) {
      const remainingTime = Math.ceil(
        (minInterval - timeSinceLastSearch) / 1000
      );
      setValidationError(
        `Bitte warten Sie ${remainingTime} Sekunde(n) vor der nächsten Suche.`
      );
      setIsThrottled(true);

      // Clear throttle message after remaining time
      setTimeout(() => {
        setIsThrottled(false);
        if (validationError.includes("Bitte warten Sie")) {
          setValidationError("");
        }
      }, minInterval - timeSinceLastSearch);

      return;
    }

    const queryError = validateSearchQuery(searchQuery);
    if (queryError) {
      setValidationError(queryError);
      return;
    }

    if (!postalCode.trim()) {
      setValidationError("PLZ ist erforderlich.");
      return;
    }

    setValidationError("");
    setShowDropdown(true);
    setLastSearchTime(now);
    await search(searchQuery, postalCode);
  };

  const handleBusinessSelect = (business: BusinessSearchResult) => {
    onBusinessSelect(business);
    setShowDropdown(false);
    clearResults();
    // Reset form
    setSearchQuery("");
    setPostalCode("");
    setValidationError("");
  };

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    if (!isMounted) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown, isMounted]);

  return (
    <div className={styles.searchForm}>
      <Typography variant="description">
        Schritt 1: Unternehmen suchen
      </Typography>

      <div className={styles.searchContainer}>
        <div className={styles.inputContainer} ref={dropdownRef}>
          <Input
            placeholder="Unternehmensname eingeben..."
            value={searchQuery}
            onChange={setSearchQuery}
            onEnter={handleSearch}
            name="businessName"
          />
          {isMounted && showDropdown && (
            <SearchResultsDropdown
              results={results}
              onSelect={handleBusinessSelect}
              isVisible={showDropdown}
            />
          )}
        </div>

        <div className={styles.inputContainer}>
          <Input
            placeholder="PLZ eingeben..."
            value={postalCode}
            onChange={setPostalCode}
            onEnter={handleSearch}
            name="postalCode"
          />
        </div>

        <Button
          onClick={handleSearch}
          disabled={searchLoading || !searchQuery || !postalCode || isThrottled}
        >
          {searchLoading ? (
            <LoadingSpinner size="sm" color="rgb(252, 252, 253)" />
          ) : isThrottled ? (
            "⏱️ Warten..."
          ) : (
            "Suchen"
          )}
        </Button>
      </div>

      {isMounted && validationError && (
        <Typography variant="description" className={styles.error}>
          {validationError}
        </Typography>
      )}

      {isMounted && searchError && (
        <Typography variant="description" className={styles.error}>
          {searchError}
        </Typography>
      )}
    </div>
  );
};
