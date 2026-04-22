import axios from 'axios';

const API_BASE_URL = 'http://localhost:7860/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to include the token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('pustak_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const signupUser = async (username, password) => {
  const response = await apiClient.post('/signup', { username, password });
  return response.data;
};

export const loginUser = async (username, password) => {
  const response = await apiClient.post('/login', { username, password });
  return response.data;
};

export const getDocuments = async () => {
  const response = await apiClient.get('/documents');
  return response.data;
};

export const deleteDocument = async (docId) => {
  const response = await apiClient.delete(`/documents/${docId}`);
  return response.data;
};

export const getProfile = async () => {
  const response = await apiClient.get('/profile');
  return response.data;
};

export const updateProfile = async (profileData) => {
  const response = await apiClient.post('/profile', profileData);
  return response.data;
};

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const chatWithDoc = async (docId, question) => {
  const response = await apiClient.post(`/chat/${docId}`, { question });
  return response.data;
};

export const getSummary = async (docId) => {
  const response = await apiClient.get(`/summary/${docId}`);
  return response.data;
};

export const getMCQs = async (docId) => {
  const response = await apiClient.get(`/mcqs/${docId}`);
  return response.data;
};
