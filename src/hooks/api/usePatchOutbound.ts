import axios from 'axios';
import { useCallback, useState } from 'react';

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const domain = localStorage.getItem('VITE_DOMAIN') || import.meta.env.VITE_DOMAIN;
const HTTP_HOST = `${api_protocol}://${domain}:${port}`;

export default function usePatchOutbound() {
  const [isLoading, setIsLoading] = useState(false);

  const patchOutbound = useCallback(async (
    projectId: string,
    action: 'active' | 'active' | 'start' | 'stop' | 'pause' | 'calling' | 'waiting' | 'recording',
  ): Promise<ToCallResponse> => {
    setIsLoading(true);
    try {
      // 發送撥打電話的請求
      const result = await axios.patch(`${HTTP_HOST}/api/projectOutbound/${projectId}`, {
        action,
      });
      return result.data as ToCallResponse;
    } catch (error) {
      console.error('Error starting outbound:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { patchOutbound, isLoading };
}