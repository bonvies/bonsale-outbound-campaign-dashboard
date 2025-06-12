import axios from 'axios';
import { useCallback, useState } from 'react';

// 取得本機 IP domain
const { hostname } = window.location;

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const HTTP_HOST = `${api_protocol}://${hostname}:${port}`;

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