import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/Input";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { CityOption } from "@/pages/api/cities";
import styles from "./CityAutocomplete.module.css";

interface CityAutocompleteProps {
  placeholder?: string;
  value?: CityOption | null;
  onChange: (city: CityOption | null) => void;
  onTextChange?: (text: string) => void;
  onBlur?: () => void;
  name?: string;
  className?: string;
  required?: boolean;
}

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  placeholder = "Ort eingeben...",
  value,
  onChange,
  onTextChange,
  onBlur,
  name,
  className,
  required = false,
}) => {
  const [inputValue, setInputValue] = useState(value?.name || "");
  const [suggestions, setSuggestions] = useState<CityOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  const debouncedSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setError("");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/cities?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (data.success) {
        setSuggestions(data.data || []);
        setShowSuggestions(true);
        setHighlightedIndex(-1);
      } else {
        setError(data.error || "Fehler beim Laden der Städte");
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("City search error:", error);
      setError("Fehler beim Laden der Städte");
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change
  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onTextChange?.(newValue);

    // Clear current selection if input doesn't match
    if (value && newValue !== value.name) {
      onChange(null);
    }

    // Clear existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce timer
    debounceRef.current = setTimeout(() => {
      debouncedSearch(newValue);
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (city: CityOption) => {
    setInputValue(city.name);
    onChange(city);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle input focus
  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle input blur
  const handleBlur = () => {
    // Delay to allow for suggestion clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      if (onBlur) {
        onBlur();
      }
    }, 150);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionsRef.current) {
      const highlightedElement = suggestionsRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }
  }, [highlightedIndex]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={`${styles.autocomplete} ${className || ""}`}>
      <div className={styles.inputContainer}>
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          name={name}
          className={styles.input}
        />
        {isLoading && (
          <div className={styles.loadingIndicator}>
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className={styles.suggestions}>
          {suggestions.map((city, index) => (
            <div
              key={city.id}
              className={`${styles.suggestion} ${
                index === highlightedIndex ? styles.highlighted : ""
              }`}
              onClick={() => handleSuggestionSelect(city)}
            >
              <div className={styles.cityName}>{city.name}</div>
              <div className={styles.cityDetails}>{city.displayName}</div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions &&
        suggestions.length === 0 &&
        !isLoading &&
        inputValue.length >= 2 && (
          <div className={styles.suggestions}>
            <div className={styles.noResults}>
              Keine Orte gefunden für &quot;{inputValue}&quot;
            </div>
          </div>
        )}

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};
