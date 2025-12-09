import axiosClient from './axiosClient';

// Auth APIs
export const authApi = {
  login: (username: string, password: string) =>
    axiosClient.post('/auth/login', { username, password }),
  logout: () => axiosClient.post('/auth/logout'),
};

// Generic CRUD APIs - Replace [resource] with actual resource name
export const createResourceApi = (resource: string) => ({
  getAll: (params?: any) => axiosClient.get(`/${resource}`, { params }),
  getById: (id: string | number) => axiosClient.get(`/${resource}/${id}`),
  create: (data: any) => axiosClient.post(`/${resource}`, data),
  update: (id: string | number, data: any) =>
    axiosClient.put(`/${resource}/${id}`, data),
  delete: (id: string | number) => axiosClient.delete(`/${resource}/${id}`),
});

// Example usage:
// export const userApi = createResourceApi('users');
// export const bookingApi = createResourceApi('bookings');

