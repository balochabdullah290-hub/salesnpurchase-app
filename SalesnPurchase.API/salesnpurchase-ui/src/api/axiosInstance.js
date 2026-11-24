import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7266/api';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper to retrieve token from common key names in localStorage
export const getStoredToken = () => {
    let token =
        localStorage.getItem('token') ||
        localStorage.getItem('jwt') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('accessToken') ||
        '';

    if (token) {
        // Clean trailing whitespace and stripping accidental JSON string quotes
        token = token.trim().replace(/^"|"$/g, '');
    }
    return token;
};

// Helper to save token across common key names
export const setStoredToken = (tokenStr) => {
    if (!tokenStr) return;
    const cleanToken = typeof tokenStr === 'string' ? tokenStr.trim().replace(/^"|"$/g, '') : String(tokenStr);
    localStorage.setItem('token', cleanToken);
};

// Helper to clear saved tokens
export const clearStoredTokens = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('jwt');
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
};

// Request Interceptor: Attach bearer token to all outgoing requests
axiosInstance.interceptors.request.use(
    (config) => {
        const token = getStoredToken();
        if (token) {
            if (config.headers && typeof config.headers.set === 'function') {
                config.headers.set('Authorization', `Bearer ${token}`);
            } else {
                config.headers = config.headers || {};
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized globally
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn('Unauthorized: Token expired or invalid.');
            clearStoredTokens();
        }
        return Promise.reject(error);
    }
);

// --- Utility Helpers ---
export const getWhatsAppLink = (phoneOrMessage = '', messageStr = '') => {
    let phone = '923000000000'; // Default store WhatsApp number
    let text = '';

    if (typeof phoneOrMessage === 'object' && phoneOrMessage !== null) {
        text = `Hi, I am interested in: ${phoneOrMessage.title || phoneOrMessage.name || 'this product'}`;
    } else if (phoneOrMessage && typeof phoneOrMessage === 'string' && phoneOrMessage.replace(/[\s+-]/g, '').match(/^\d+$/)) {
        phone = phoneOrMessage.replace(/[^0-9]/g, '');
        text = messageStr;
    } else {
        text = String(phoneOrMessage || '');
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
};

// --- Auth APIs ---
export const loginUser = async (username, password) => {
    const response = await axiosInstance.post('/Auth/login', { username, password });

    const data = response.data;
    const token =
        typeof data === 'string' ? data :
            data?.token || data?.jwt || data?.jwtToken || data?.accessToken || data?.data?.token;

    if (token) {
        setStoredToken(token);
    }
    return data;
};

// --- Product APIs ---
export const fetchProducts = async (category = '', search = '', inStockOnly = null) => {
    const params = {};
    if (category) params.category = category;
    if (search) params.search = search;
    if (inStockOnly !== null && inStockOnly !== undefined) params.inStockOnly = inStockOnly;

    const response = await axiosInstance.get('/Products', { params });
    return response.data;
};

export const fetchProductById = async (id) => {
    const response = await axiosInstance.get(`/Products/${id}`);
    return response.data;
};

export const createProduct = async (productData) => {
    const response = await axiosInstance.post('/Products', productData);
    return response.data;
};

export const updateProduct = async (id, productData) => {
    const response = await axiosInstance.put(`/Products/${id}`, productData);
    return response.data;
};

export const toggleStockStatus = async (id) => {
    const response = await axiosInstance.patch(`/Products/${id}/toggle-stock`);
    return response.data;
};

export const deleteProduct = async (id) => {
    const response = await axiosInstance.delete(`/Products/${id}`);
    return response.data;
};

// --- Pre-Order APIs ---
export const submitPreOrder = async (preOrderData) => {
    const response = await axiosInstance.post('/PreOrders', preOrderData);
    return response.data;
};

export const fetchPreOrders = async () => {
    const response = await axiosInstance.get('/PreOrders');
    return response.data;
};

export const deletePreOrder = async (id) => {
    const response = await axiosInstance.delete(`/PreOrders/${id}`);
    return response.data;
};

// --- Review APIs ---
export const fetchReviews = async (productId) => {
    const response = await axiosInstance.get(`/Reviews/product/${productId}`);
    return response.data;
};

export const submitReview = async (reviewData) => {
    const response = await axiosInstance.post('/Reviews', reviewData);
    return response.data;
};

// --- Trade-In APIs ---
export const submitTradeInRequest = async (formData) => {
    const response = await axiosInstance.post('/TradeIns', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const fetchTradeInRequests = async () => {
    const response = await axiosInstance.get('/TradeIns');
    return response.data;
};

export const sendTradeInQuote = async (id, data) => {
    const response = await axiosInstance.post(`/TradeIns/${id}/quote`, data);
    return response.data;
};

export default axiosInstance;