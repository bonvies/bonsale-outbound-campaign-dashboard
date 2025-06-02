import axios from 'axios';
import { useCallback } from 'react';

// 取得本機 IP domain
const { hostname } = window.location;

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const HTTP_HOST = `${api_protocol}://${hostname}:${port}`;

export default function useGetBonsaleAutoDial() {
  const getBonsaleAutoDial = useCallback(async () => {
    try {
      const queryString = new URLSearchParams({
        limit: '-1',
        sort: 'created_at+desc'
      });
      const response = await axios.get(`${HTTP_HOST}/api/bonsale/project/auto-dial?${queryString}`);
      return response.data;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  }, []);

  return { getBonsaleAutoDial };
}