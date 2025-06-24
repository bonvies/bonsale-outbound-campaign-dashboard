import axios from 'axios';
import { useCallback, useState } from 'react';

// 取得本機 IP domain
const { hostname } = window.location;
const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const domain = import.meta.env.VITE_DOMAIN;
const HTTP_HOST = domain === 'localhost'? `${api_protocol}://${hostname}:${port}` :`${api_protocol}://${domain}:${port}`;

export default function useDeleteOutbound() {
  const [isLoading, setIsLoading] = useState(false);

  const deleteOutbound = useCallback(async (
    projectId: string,
  ): Promise<ToCallResponse> => {
    setIsLoading(true);
    try {
      // 發送刪除專案的請求
      const result = await axios.delete(`${HTTP_HOST}/api/projectOutbound/${projectId}`);
      return result.data as ToCallResponse;
    } catch (error) {
      console.error('Error delete outbound:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteOutbound, isLoading };
}