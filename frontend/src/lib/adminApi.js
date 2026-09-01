import axios from "axios";
import { API } from "@/lib/api";

const TOKEN_KEY = "admin_token";

const client = axios.create({
  baseURL: API,
  timeout: 30000,
});

// Attach the stored token to every request automatically — callers
// never need to pass it manually. Reading from localStorage at
// request-time (rather than capturing it once) means a token set by
// login() is picked up immediately on the very next call, with no
// extra plumbing.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A 401 means the stored token is invalid or expired — clear it so
// AdminAuthContext's next check reflects reality instead of retrying
// with a dead token indefinitely.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(err);
  }
);

export const ADMIN_TOKEN_KEY = TOKEN_KEY;

export const adminApi = {
  signup: (payload) => client.post("/admin/auth/signup", payload).then((r) => r.data),
  login: (email, password) =>
    client.post("/admin/auth/login", { email, password }).then((r) => r.data),
  me: () => client.get("/admin/auth/me").then((r) => r.data),
  listComplaints: (params) => client.get("/admin/complaints", { params }).then((r) => r.data),
  getComplaint: (ticketId) => client.get(`/admin/complaints/${ticketId}`).then((r) => r.data),
  updateStatus: (ticketId, payload) =>
    client.patch(`/admin/complaints/${ticketId}/status`, payload).then((r) => r.data),
  stats: () => client.get("/admin/stats").then((r) => r.data),
};
