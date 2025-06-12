import axios from 'axios';
import { useCallback, useState } from 'react';

// 取得本機 IP domain
const { hostname } = window.location;

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const HTTP_HOST = `${api_protocol}://${hostname}:${port}`;

export default function useUpdateCallStatus() {
  const [isLoading, setIsLoading] = useState(false);

  const updateCallStatus = useCallback(async (projectId: string, customerId: string, callStatus: number) => {
    console.log('%c useUpdateCallStatus','font-size: 20px; font-weight: bold;');
    setIsLoading(true);
    try {
      const response = await axios.put(`${HTTP_HOST}/api/bonsale/project/${projectId}/customer/${customerId}/callStatus`, { callStatus });
      return response.data;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateCallStatus, isLoading };
}