export const calculateAverageWeight = (weight: string) => {
  const weights = weight.split('-').map(w => parseFloat(w.trim()));
  if (weights.length === 2) {
    return (weights[0] + weights[1]) / 2;
  }
  return weights[0] || 0;
};

export const getSizeCategory = (averageWeight: number) => {
  const sizeMapping: {[key: string]: string} = {
    small: 'Pequeno',
    medium: 'Médio',
    large: 'Grande',
  };

  return averageWeight <= 10
    ? sizeMapping['small']
    : averageWeight <= 25
      ? sizeMapping['medium']
      : sizeMapping['large'];
};
