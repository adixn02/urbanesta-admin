// API Base URL - Do NOT include /api here, it's added in the code
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
// Remove trailing /api if present to avoid double /api/api/
export const API_BASE_URL = baseUrl.replace(/\/api\/?$/, '');

export const TOKEN_COOKIE = 'urbanesta_token';


