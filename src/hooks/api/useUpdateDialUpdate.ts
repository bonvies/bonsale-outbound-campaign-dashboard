import axios from 'axios';
import { useCallback, useState } from 'react';

// 取得本機 IP domain
const { hostname } = window.location;
const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const domain = import.meta.env.VITE_DOMAIN;
const HTTP_HOST = domain === 'localhost'? `${api_protocol}://${hostname}:${port}` :`${api_protocol}://${domain}:${port}`;

export default function useUpdateDialUpdate() {
  const [isLoading, setIsLoading] = useState(false);

  const updateDialUpdate = useCallback(async (projectId: string, customerId: string) => {
    setIsLoading(true);
    try {
      const response = await axios.put(`${HTTP_HOST}/api/bonsale/project/${projectId}/customer/${customerId}/dialUpdate`, {});
      return response.data;
    } catch (error) {
      console.error('Error updating dial update:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateDialUpdate, isLoading };
}