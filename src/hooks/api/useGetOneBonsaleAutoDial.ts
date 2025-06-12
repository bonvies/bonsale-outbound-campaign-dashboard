import axios from 'axios';
import { useCallback, useState } from 'react';

// 取得本機 IP domain
const { hostname } = window.location;

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const HTTP_HOST = `${api_protocol}://${hostname}:${port}`;

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