export const validateRoomCode = (code: string): boolean => {
  return /^[A-Z0-9]{6}$/.test(code.toUpperCase());
};

export const formatRoomCode = (code: string): string => {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
};

