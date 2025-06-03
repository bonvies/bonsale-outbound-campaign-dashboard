import axios from 'axios';
import { useCallback } from 'react';

// 取得本機 IP domain
const { hostname } = window.location;

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const HTTP_HOST = `${api_protocol}://${hostname}:${port}`;

export default function useGetBonsaleAutoDial() {
  const getBonsaleAutoDial = useCallback(async (page: number = 1) => {
    try {
      const queryString = new URLSearchParams({
        // limit: '-1', // 暫時不使用 limit，因為會導致資料量過大
        page: page.toString(),
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