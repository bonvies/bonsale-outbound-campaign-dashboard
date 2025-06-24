import axios from 'axios';
import { useCallback, useState } from 'react';

// 取得本機 IP domain
const { hostname } = window.location;
const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const domain = import.meta.env.VITE_DOMAIN;
const HTTP_HOST = domain === 'localhost'? `${api_protocol}://${hostname}:${port}` :`${api_protocol}://${domain}:${port}`;

export default function usePostOutbound() {
  const [isLoading, setIsLoading] = useState(false);

  const postOutbound = useCallback(async (
    projectId: string,
    callFlowId: string,
    appId: string,
    appSecret: string,
    action: 'active' | 'active' | 'start' | 'stop' | 'pause' | 'calling' | 'waiting' | 'recording',
  ): Promise<ToCallResponse> => {
    setIsLoading(true);
    try {
      // 發送撥打電話的請求
      const result = await axios.post(`${HTTP_HOST}/api/projectOutbound`, {
        grant_type: "client_credentials",
        client_id: appId,
        client_secret: appSecret,
        callFlowId,
        projectId,
        action,
      });
      return result.data as ToCallResponse;
    } catch (error) {
      console.error('Error post outbound:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { postOutbound, isLoading };
}