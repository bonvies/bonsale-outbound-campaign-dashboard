import axios from 'axios';
import { useCallback, useState } from 'react';

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const domain = localStorage.getItem('VITE_DOMAIN') || import.meta.env.VITE_DOMAIN;
const HTTP_HOST = `${api_protocol}://${domain}:${port}`;

export default function useGetOneBonsaleAutoDial() {
  const [isLoading, setIsLoading] = useState(false);

  const getOneBonsaleAutoDial = useCallback(async (projectId: string, callFlowId: string) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${HTTP_HOST}/api/bonsale/project/${projectId}/auto-dial/${callFlowId}`);
      return response.data;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { getOneBonsaleAutoDial, isLoading };
}