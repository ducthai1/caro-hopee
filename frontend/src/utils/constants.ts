export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';

export const BOARD_SIZES = [15, 20, 25] as const;
export const DEFAULT_BOARD_SIZE = 15;

export const GUEST_ID_KEY = 'caro_guest_id';

