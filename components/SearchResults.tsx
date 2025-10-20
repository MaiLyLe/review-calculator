import React, { useState, useEffect } from "react";
import ReactPaginate from "react-paginate";
import { Typography } from "@/components/Typography";
import { BusinessSearchResult } from "@/types";
import { translateCategory } from "@/utils/clientCategoryTranslation";
import styles from "./SearchResults.module.css";

interface SearchResultsProps {
  results: BusinessSearchResult[];
  onSelect: (business: BusinessSearchResult) => void;
  isVisible: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  currentPage: number;
  pagination: {
    totalCount: number;
    currentOffset: number;
    currentCount: number;
    hasMore: boolean;
  } | null;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onSelect,
  isVisible,
  onPageChange,
  isLoading,
  currentPage,
  pagination,
}) => {
  // Calculate total pages based on pagination metadata
  const itemsPerPage = 5; // This should match the API limit
  const totalPages = pagination
    ? Math.ceil(pagination.totalCount / itemsPerPage)
    : 1;
  const pageCount = Math.max(totalPages, currentPage); // Ensure current page is always included
  const handlePageChange = (selectedItem: { selected: number }) => {
    const newPage = selectedItem.selected + 1; // Convert 0-based to 1-based
    onPageChange(newPage);
  };

  const handleBusinessClick = (business: BusinessSearchResult) => {
    onSelect(business);
  };

  if (!isVisible && !isLoading) {
    return null;
  }

  return (
    <div
      className={`${styles.searchResults} ${isVisible ? styles.visible : ""} ${
        isLoading ? styles.loading : ""
      }`}
    >
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <Typography variant="description">Suche läuft...</Typography>
        </div>
      ) : results.length === 0 ? (
        <div className={styles.noResults}>
          <Typography variant="description">
            Keine Ergebnisse gefunden
          </Typography>
        </div>
      ) : (
        <>
          <div className={styles.resultsContainer}>
            {results.map((business, index) => (
              <div
                key={business.place_id || index}
                className={styles.resultItem}
                onClick={() => handleBusinessClick(business)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleBusinessClick(business);
                  }
                }}
              >
                <div className={styles.businessInfo}>
                  <div className={styles.businessHeader}>
                    <Typography variant="h3" className={styles.businessName}>
                      {business.original_title || business.title}
                    </Typography>
                    {business.category && (
                      <span className={styles.categoryBadge}>
                        {translateCategory(business.category) ||
                          business.category}
                      </span>
                    )}
                  </div>

                  <Typography
                    variant="description"
                    className={styles.businessAddress}
                  >
                    {business.address}
                  </Typography>
                </div>
                <div className={styles.selectArrow}>→</div>
              </div>
            ))}
          </div>

          {pageCount > 1 && (
            <div className={styles.paginationContainer}>
              <ReactPaginate
                previousLabel="‹"
                nextLabel="›"
                breakLabel="..."
                pageCount={pageCount}
                marginPagesDisplayed={1}
                pageRangeDisplayed={2}
                onPageChange={handlePageChange}
                containerClassName={styles.pagination}
                activeClassName={styles.active}
                pageClassName={styles.pageItem}
                pageLinkClassName={styles.pageLink}
                previousClassName={styles.pageItem}
                previousLinkClassName={styles.pageLink}
                nextClassName={styles.pageItem}
                nextLinkClassName={styles.pageLink}
                breakClassName={styles.pageItem}
                breakLinkClassName={styles.pageLink}
                disabledClassName={styles.disabled}
                forcePage={currentPage - 1} // Convert 1-based to 0-based for ReactPaginate
              />
              <Typography variant="description" className={styles.resultCount}>
                Seite {currentPage} von {totalPages} • {results.length} Ergebnis
                {results.length !== 1 ? "se" : ""} auf dieser Seite
                {pagination && ` • ${pagination.totalCount} gesamt`}
              </Typography>
            </div>
          )}
        </>
      )}
    </div>
  );
};
