export const validateTargetRating = (targetRating: number, currentRating: number): string | null => {
  if (targetRating <= currentRating) {
    return 'Das Zielrating muss höher als das aktuelle Rating sein.';
  }
  
  if (targetRating > 5.0) {
    return 'Das Zielrating kann nicht höher als 5.0 sein.';
  }
  
  if (targetRating < 0) {
    return 'Das Zielrating muss positiv sein.';
  }
  
  return null;
};

export const validateSearchQuery = (query: string): string | null => {
  if (!query || query.trim().length === 0) {
    return 'Bitte geben Sie einen Unternehmensnamen ein.';
  }
  
  if (query.trim().length < 2) {
    return 'Der Unternehmensname muss mindestens 2 Zeichen lang sein.';
  }
  
  return null;
};

export const isValidTargetRating = (rating: number): boolean => {
  const validRatings = [4.0, 4.2, 4.5, 4.7, 4.8, 4.9, 5.0];
  return validRatings.includes(rating);
};
