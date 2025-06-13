import axios from 'axios';
import { useCallback, useState } from 'react';

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const domain = localStorage.getItem('VITE_DOMAIN') || import.meta.env.VITE_DOMAIN;
const HTTP_HOST = `${api_protocol}://${domain}:${port}`;

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