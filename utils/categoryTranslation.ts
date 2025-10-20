import fs from "fs";
import path from "path";

// Category translation map - loaded from CSV
let categoryTranslations: Map<string, string> | null = null;

// Load category translations from CSV file
function loadCategoryTranslations(): Map<string, string> {
  if (categoryTranslations) {
    return categoryTranslations;
  }

  const translations = new Map<string, string>();

  try {
    const csvPath = path.join(process.cwd(), "categories.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const lines = csvContent.split("\n");

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line - handle quoted fields
      const columns = parseCSVLine(line);
      if (columns.length >= 2) {
        const english = columns[0]?.trim();
        const german = columns[1]?.trim();

        if (english && german) {
          // Store both exact match and lowercase for flexible matching
          translations.set(english, german);
          translations.set(english.toLowerCase(), german);
        }
      }
    }

    categoryTranslations = translations;
    console.log(
      `📚 Loaded ${translations.size / 2} category translations from CSV`
    );
  } catch (error) {
    console.error("❌ Failed to load category translations:", error);
    categoryTranslations = new Map();
  }

  return categoryTranslations;
}

// Simple CSV parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  // Add the last field
  result.push(current);

  return result;
}

// Translate a category from English to German
export function translateCategory(
  englishCategory: string | undefined
): string | undefined {
  if (!englishCategory) {
    return undefined;
  }

  const translations = loadCategoryTranslations();

  // Try exact match first
  let translation = translations.get(englishCategory);
  if (translation) {
    return translation;
  }

  // Try lowercase match
  translation = translations.get(englishCategory.toLowerCase());
  if (translation) {
    return translation;
  }

  // If no translation found, return original
  console.log(
    `⚠️ No German translation found for category: "${englishCategory}"`
  );
  return englishCategory;
}

// Get all available translations (for debugging)
export function getAllTranslations(): Map<string, string> {
  return loadCategoryTranslations();
}
