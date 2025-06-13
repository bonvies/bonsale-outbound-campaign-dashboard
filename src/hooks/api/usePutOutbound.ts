import axios from 'axios';
import { useCallback, useState } from 'react';

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const domain = localStorage.getItem('VITE_DOMAIN') || import.meta.env.VITE_DOMAIN;
const HTTP_HOST = `${api_protocol}://${domain}:${port}`;

export default function usePutOutbound() {
  const [isLoading, setIsLoading] = useState(false);

  const putOutbound = useCallback(async (
    grant_type: string,
    client_id: string,
    client_secret: string,
    callFlowId: string,
    projectId: string,
  ): Promise<ToCallResponse> => {
    setIsLoading(true);
    try {
      // 發送撥打電話的請求
      const result = await axios.put(`${HTTP_HOST}/api/projectOutbound/${projectId}`, {
        grant_type,
        client_id,
        client_secret,
        callFlowId,
        projectId
      });
      return result.data as ToCallResponse;
    } catch (error) {
      console.error('Error starting outbound:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { putOutbound, isLoading };
}