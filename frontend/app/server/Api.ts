import axios from "axios";
import { getUploadBaseUrl } from "@/lib/apiBase";

const api = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

// Resolved per request so LAN/mobile hosts keep working.
api.interceptors.request.use((config) => {
  config.baseURL = getUploadBaseUrl();
  return config;
});

export default api;
