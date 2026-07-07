import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({
  baseURL: API,
  timeout: 60000,
});

export const api = {
  chat: (payload) => client.post("/ai/chat", payload).then((r) => r.data),
  recommend: (payload) =>
    client.post("/ai/recommend-services", payload).then((r) => r.data),
  documents: (payload) =>
    client.post("/ai/document-guidance", payload).then((r) => r.data),
  submitComplaint: (payload) =>
    client.post("/complaints/submit", payload).then((r) => r.data),
  trackComplaint: (ticketId) =>
    client.get(`/complaints/track/${ticketId}`).then((r) => r.data),
  listComplaints: () => client.get("/complaints/all").then((r) => r.data),
  updateComplaint: (payload) =>
    client.post("/complaints/update-status", payload).then((r) => r.data),
  stats: () => client.get("/complaints/stats").then((r) => r.data),
};
