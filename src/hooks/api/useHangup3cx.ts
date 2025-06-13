import axios from 'axios';
import { useCallback, useState } from 'react';

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const domain = localStorage.getItem('VITE_DOMAIN') || import.meta.env.VITE_DOMAIN;
const HTTP_HOST = `${api_protocol}://${domain}:${port}`;

export default function useHangup3cx() {
  const [isLoading, setIsLoading] = useState(false);

  const Hangup3cx = useCallback(async (
    dn: string,
    id: number,
    token_3cx: string,
  ): Promise<ToCallResponse> => {
    setIsLoading(true);
    try {
      // 發送掛斷電話的請求
      console.log('token_3cx', token_3cx);
      const result = await axios.post(`${HTTP_HOST}/api/callControl/hangup`, { dn, id, token_3cx });
      return result.data as ToCallResponse;
    } catch (error) {
      console.error('Error starting outbound:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { Hangup3cx, isLoading };
}