import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Typography } from "@/components/Typography";
import { SearchResults } from "@/components/SearchResults";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { useBusinessSearch } from "@/hooks/useBusinessSearch";
import { BusinessSearchResult } from "@/types";
import { CityOption } from "@/pages/api/cities";
import { validateSearchQuery } from "@/utils/validate";
import styles from "./SearchForm.module.css";

interface SearchFormProps {
  onBusinessSelect: (business: BusinessSearchResult) => void;
  onSearchStateChange?: (hasResults: boolean) => void;
  isEmployeeMode?: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  onBusinessSelect,
  onSearchStateChange,
  isEmployeeMode = false,
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const [isThrottled, setIsThrottled] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const [lastSelectedCity, setLastSelectedCity] = useState<CityOption | null>(
    null
  );
  const [cityBlurred, setCityBlurred] = useState(false);

  const {
    results,
    loading: searchLoading,
    error: searchError,
    pagination,
    search,
    clearResults,
  } = useBusinessSearch();

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

    // For normal users (non-employee mode), city selection is required
    if (!isEmployeeMode && !selectedCity) {
      setValidationError("Bitte wählen Sie einen Ort aus.");
      return;
    }

    setValidationError("");
    setShowResults(true);

    setLastSearchTime(now);
    setCurrentPage(1);
    setLastSearchQuery(searchQuery);
    setLastSelectedCity(selectedCity);

    // Convert city to location string for the search API
    const locationString = selectedCity
      ? `${selectedCity.coordinates.latitude},${selectedCity.coordinates.longitude}`
      : "";

    await search(searchQuery, locationString, 1);
  };

  const handleBusinessSelect = useCallback(
    (business: BusinessSearchResult) => {
      // Pass the business with the selected city information
      const businessWithLocation = {
        ...business,
        selectedCity: selectedCity || undefined, // Convert null to undefined for type compatibility
      };
      onBusinessSelect(businessWithLocation);
      // Reset all search-related state
      setShowResults(false);
      clearResults();
      setSearchQuery("");
      setSelectedCity(null);
      setValidationError("");
      setCurrentPage(1);
      setLastSearchQuery("");
      setLastSelectedCity(null);
      setCityBlurred(false);
    },
    [onBusinessSelect, clearResults, selectedCity]
  );

  const handlePageChange = async (page: number) => {
    if (lastSearchQuery) {
      setCurrentPage(page);
      const locationString = lastSelectedCity
        ? `${lastSelectedCity.coordinates.latitude},${lastSelectedCity.coordinates.longitude}`
        : "";
      await search(lastSearchQuery, locationString, page);
    }
  };

  // Handle city field blur for validation
  const handleCityBlur = () => {
    setCityBlurred(true);
  };

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-select business if there's only one result
  useEffect(() => {
    if (results.length === 1 && !searchLoading && showResults) {
      // Small delay to allow user to see the result briefly before auto-selecting
      const timer = setTimeout(() => {
        handleBusinessSelect(results[0]);
      }, 500); // 500ms delay for better UX

      return () => clearTimeout(timer);
    }
  }, [results, searchLoading, showResults, handleBusinessSelect]);

  // Hide results when there's an error or no results after search
  useEffect(() => {
    if (searchError) {
      setShowResults(false);
    } else if (results.length === 0 && !searchLoading && showResults) {
      // Keep results visible for a moment to show "no results" message
      const timer = setTimeout(() => {
        setShowResults(false);
      }, 3000); // Hide after 3 seconds if no results

      return () => clearTimeout(timer);
    }
  }, [results, searchError, searchLoading, showResults]);

  // Update showResults based on actual results and loading state
  useEffect(() => {
    if (!searchLoading && results.length === 0 && showResults) {
      // If we're not loading and have no results, but showResults is true,
      // we should keep it true briefly to show "no results" message
      // The timeout in the previous useEffect will handle hiding it
    } else if (results.length > 0) {
      // Ensure showResults is true when we have results
      setShowResults(true);
    }
  }, [results.length, searchLoading, showResults]);

  // Handle city validation on blur or selection change
  useEffect(() => {
    if (!isEmployeeMode && cityBlurred && !selectedCity) {
      setValidationError("Bitte wählen Sie einen Ort aus.");
    } else if (selectedCity || isEmployeeMode) {
      // Clear the error if city is selected or in employee mode
      if (validationError === "Bitte wählen Sie einen Ort aus.") {
        setValidationError("");
      }
    }
  }, [selectedCity, cityBlurred, isEmployeeMode, validationError]);

  // Notify parent about search state changes
  useEffect(() => {
    const hasResults = showResults && (results.length > 0 || searchLoading);
    onSearchStateChange?.(hasResults);
  }, [showResults, results.length, searchLoading, onSearchStateChange]);

  // Determine if search form should be centered or positioned
  const isSearchFormCentered =
    !showResults && results.length === 0 && !searchLoading;

  return (
    <div
      className={`${styles.searchForm} ${
        isSearchFormCentered ? styles.centered : styles.positioned
      }`}
    >
      <Typography variant="h1" className={styles.title}>
        Rating Calculator
      </Typography>
      <Typography variant="description" className={styles.description}>
        Finden Sie raus, wie viele Google-Bewertungen entfernt werden müssen, um
        Ihr Wunsch-Rating zu erreichen.
      </Typography>

      <div className={styles.searchContainer}>
        <div className={styles.inputContainer}>
          <Input
            placeholder="Unternehmensname"
            value={searchQuery}
            onChange={setSearchQuery}
            onEnter={handleSearch}
            name="businessName"
          />
        </div>

        <div className={styles.inputContainer}>
          <CityAutocomplete
            placeholder={isEmployeeMode ? "Ort (optional)" : "Ort *"}
            value={selectedCity}
            onChange={setSelectedCity}
            onBlur={handleCityBlur}
            name="city"
            required={!isEmployeeMode}
          />
        </div>

        <Button
          onClick={handleSearch}
          disabled={
            searchLoading ||
            !searchQuery ||
            isThrottled ||
            (!isEmployeeMode && !selectedCity)
          }
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

      {/* Search Results with Pagination */}
      {isMounted && (
        <SearchResults
          results={results}
          onSelect={handleBusinessSelect}
          isVisible={showResults && (results.length > 0 || searchLoading)}
          isLoading={searchLoading}
          onPageChange={handlePageChange}
          currentPage={currentPage}
          pagination={pagination} // Pass the entire pagination object
        />
      )}

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
