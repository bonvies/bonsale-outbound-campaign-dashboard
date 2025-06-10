import axios from 'axios';
import { useCallback } from 'react';

// 取得本機 IP domain
const { hostname } = window.location;

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const HTTP_HOST = `${api_protocol}://${hostname}:${port}`;

export default function useActiveOutbound() {
  const postOutbound = useCallback(async (
    projectId: string,
    callFlowId: string,
    appId: string,
    appSecret: string,
    action: string,
  ): Promise<ToCallResponse> => {
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
      console.error('Error starting outbound:', error);
      throw error;
    }
  }, []);

  return { postOutbound };
}