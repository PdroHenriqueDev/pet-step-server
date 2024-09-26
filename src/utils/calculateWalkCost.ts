export const calculateWalkCost = ({
  numberOfDogs,
  walkDurationMinutes,
}: {
  numberOfDogs: number;
  walkDurationMinutes: number;
}) => {
  const DOG_PRICE_PER_DOG = 4.99;

  const WALK_DURATION_PRICES: {[key: number]: number} = {
    15: 19.99,
    30: 28.99,
    60: 57.99,
  };

  if (!WALK_DURATION_PRICES.hasOwnProperty(walkDurationMinutes)) {
    throw new Error(
      `Invalid walk duration: ${walkDurationMinutes} minutes. Choose between 15, 30, or 60 minutes.`,
    );
  }

  const walkPrice = WALK_DURATION_PRICES[walkDurationMinutes];
  const totalCost = numberOfDogs * DOG_PRICE_PER_DOG + walkPrice;

  return {
    totalCost: parseFloat(totalCost.toFixed(2)),
    dogPrice: {
      numberOfDogs,
      pricePerDog: DOG_PRICE_PER_DOG,
      totalDogCost: parseFloat((numberOfDogs * DOG_PRICE_PER_DOG).toFixed(2)),
    },
    walkPrice: {
      durationMinutes: walkDurationMinutes,
      price: walkPrice,
    },
  };
};
