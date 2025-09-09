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

  const isEmployeeMode = router.query["for-employees"] === "true";

  const handleBusinessSelect = (business: BusinessSearchResult) => {
    setSelectedBusiness(business);
    setCurrentStep("analysis");
  };

  const handleBackToSearch = () => {
    setCurrentStep("search");
    setSelectedBusiness(null);
    setShowSearchBackdrop(true);
  };

  const handleSearchStateChange = (hasResults: boolean) => {
    setShowSearchBackdrop(!hasResults);
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
          width={150}
          height={50}
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
