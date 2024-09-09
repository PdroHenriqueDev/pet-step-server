export const isEmailValid = (value: string) => {
  const emailRegex = /\S+@\S+\.\S+/;
  return emailRegex.test(value);
};
