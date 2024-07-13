export const calculateWalkCost = ({numberOfDogs, walkDuration}: {numberOfDogs: number; walkDuration: number}) => {
    const pricePerDog = 4.99;

    const pricesForDuration: {[key: number]: number}  = {
        15: 19.99,
        30: 28.99,
        60: 57.99,
    }

    if (!pricesForDuration.hasOwnProperty(walkDuration)) {
        throw new Error(`Tempo de passeio inválido: ${walkDuration} minutos. Escolha entre 15, 30 ou 60 minutos.`)
    }

    const priceForTime =  pricesForDuration[walkDuration];
    const totalCost = (numberOfDogs * pricePerDog) + priceForTime;
    
    return {
        totalCost: totalCost.toFixed(2),
        dogPrice: {
            dogs: numberOfDogs,
            price: pricePerDog,
            totalDogCost: (numberOfDogs * pricePerDog).toFixed(2),
        },
        walkPrice: {
            time: walkDuration,
            price: priceForTime,
        },
    };
};
