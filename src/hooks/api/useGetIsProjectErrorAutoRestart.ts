import axios from 'axios';
import { useCallback, useState } from 'react';

// 取得本機 IP domain
const { hostname } = window.location;
const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const domain = import.meta.env.VITE_DOMAIN;
const HTTP_HOST = domain === 'localhost'? `${api_protocol}://${hostname}:${port}` :`${api_protocol}://${domain}:${port}`;

export default function useGetIsProjectErrorAutoRestart() {
  const [isLoading, setIsLoading] = useState(false);

  const getIsProjectErrorAutoRestart = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${HTTP_HOST}/api/projectOutbound/isProjectErrorAutoRestart`);
      return response.data;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { getIsProjectErrorAutoRestart, isLoading };
}