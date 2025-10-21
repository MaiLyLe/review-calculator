import React, { useState, useEffect } from "react";
import { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";
import { Typography } from "@/components/Typography";
import { SearchForm } from "@/components/SearchForm";
import { RatingAnalysis } from "@/components/RatingAnalysis";
import { BusinessSearchResult } from "@/types";

const Home: NextPage = () => {
  const router = useRouter();
  const [selectedBusiness, setSelectedBusiness] =
    useState<BusinessSearchResult | null>(null);
  const [currentStep, setCurrentStep] = useState<"search" | "analysis">(
    "search"
  );
  const [showSearchBackdrop, setShowSearchBackdrop] = useState(true);
  const [searchState, setSearchState] = useState<{
    query: string;
    city: string;
    page: number;
  } | null>(null);
  const [wasSingleResult, setWasSingleResult] = useState(false);

  const isEmployeeMode = router.query["for-employees"] === "true";

  // Handle URL-based navigation
  useEffect(() => {
    if (!router.isReady) return;

    const { business, query, city, page } = router.query;

    if (business) {
      // We're on a business detail page
      try {
        const businessData = JSON.parse(business as string);
        setSelectedBusiness(businessData);
        setCurrentStep("analysis");
        setShowSearchBackdrop(false);
      } catch (error) {
        console.error("Error parsing business data from URL:", error);
        // Fallback to search if business data is invalid
        router.replace("/", undefined, { shallow: true });
      }
    } else {
      // We're on the search page
      setCurrentStep("search");
      setSelectedBusiness(null);

      // Restore search state from URL parameters
      if (query || city || page) {
        setSearchState({
          query: (query as string) || "",
          city: (city as string) || "",
          page: parseInt((page as string) || "1", 10),
        });
        setShowSearchBackdrop(false);
      } else {
        setSearchState(null);
        setShowSearchBackdrop(true);
      }
    }
  }, [router.isReady, router.query, router]);

  const handleBusinessSelect = (
    business: BusinessSearchResult,
    isSingleResult: boolean = false
  ) => {
    // Track if this was a single result auto-selection
    setWasSingleResult(isSingleResult);

    // Update URL with business data and current search state
    const searchParams = new URLSearchParams();

    // Preserve search state in URL
    if (searchState) {
      searchParams.set("query", searchState.query);
      searchParams.set("city", searchState.city);
      searchParams.set("page", searchState.page.toString());
    }

    // Add business data
    searchParams.set("business", JSON.stringify(business));

    // Update URL without page reload
    router.push(`/?${searchParams.toString()}`, undefined, { shallow: true });
  };

  const handleBackToSearch = () => {
    // If this was a single result, go back to clean search page
    if (wasSingleResult) {
      setWasSingleResult(false);
      setSearchState(null);
      router.push("/", undefined, { shallow: true });
    } else {
      // Navigate back to search with preserved state
      const searchParams = new URLSearchParams();

      if (searchState) {
        searchParams.set("query", searchState.query);
        searchParams.set("city", searchState.city);
        searchParams.set("page", searchState.page.toString());
      }

      const newUrl = searchParams.toString()
        ? `/?${searchParams.toString()}`
        : "/";
      router.push(newUrl, undefined, { shallow: true });
    }
  };

  const handleSearchStateChange = (hasResults: boolean) => {
    setShowSearchBackdrop(!hasResults);
  };

  const handleSearchStateUpdate = (
    newSearchState: {
      query: string;
      city: string;
      page: number;
    } | null
  ) => {
    setSearchState(newSearchState);

    // Update URL with new search state
    if (newSearchState) {
      const searchParams = new URLSearchParams();
      if (newSearchState.query) searchParams.set("query", newSearchState.query);
      if (newSearchState.city) searchParams.set("city", newSearchState.city);
      if (newSearchState.page > 1)
        searchParams.set("page", newSearchState.page.toString());

      const newUrl = searchParams.toString()
        ? `/?${searchParams.toString()}`
        : "/";
      router.push(newUrl, undefined, { shallow: true });
    } else {
      // Clear URL parameters
      router.push("/", undefined, { shallow: true });
    }
  };

  return (
    <>
      <Head>
        <title>Rating Calculator</title>
        <meta
          name="description"
          content="Berechnen Sie, wie viele Bewertungen entfernt werden müssen"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main
        className={`${styles.main} ${
          isEmployeeMode ? styles.employeeMode : styles.transparentMode
        }`}
      >
        {/* Backdrop for centered search form */}
        <div
          className={`${styles.backdrop} ${
            showSearchBackdrop && currentStep === "search" ? styles.visible : ""
          } ${isEmployeeMode ? styles.employeeMode : styles.transparentMode}`}
        />

        <div className={styles.container}>
          {currentStep === "search" && (
            <SearchForm
              onBusinessSelect={handleBusinessSelect}
              onSearchStateChange={handleSearchStateChange}
              isEmployeeMode={isEmployeeMode}
              initialSearchState={searchState}
              onSearchStateUpdate={handleSearchStateUpdate}
            />
          )}

          {currentStep === "analysis" && selectedBusiness && (
            <RatingAnalysis
              selectedBusiness={selectedBusiness}
              onBackToSearch={handleBackToSearch}
            />
          )}
        </div>

        {/* Logo positioned at bottom right on desktop, bottom center on mobile */}
        <Image
          src="/WS-Logo+Schrift-Blue.svg"
          alt="Company Logo"
          width={200}
          height={100}
          className={`${styles.logo} ${
            showSearchBackdrop ? styles.logoFixed : styles.logoRelative
          }`}
          priority={false}
        />
      </main>
    </>
  );
};

export default Home;
