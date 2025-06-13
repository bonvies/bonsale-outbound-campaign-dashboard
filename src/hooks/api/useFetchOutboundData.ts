import axios from 'axios';
import { useCallback, useState } from 'react';

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const domain = localStorage.getItem('VITE_DOMAIN') || import.meta.env.VITE_DOMAIN;
const HTTP_HOST = `${api_protocol}://${domain}:${port}`;

export default function useFetchOutboundData() {
  const [isLoading, setIsLoading] = useState(false);

  const fetchOutboundData = useCallback(async (params: Record<string, string>) => {
    setIsLoading(true);
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await axios.get(`${HTTP_HOST}/api/bonsale/outbound?${queryString}`);
      return response.data.list ?? [];
    } catch (error) {
      console.error('Error fetching outbound data:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { fetchOutboundData, isLoading };
}