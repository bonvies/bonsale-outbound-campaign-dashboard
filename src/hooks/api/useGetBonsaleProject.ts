import axios from 'axios';
import { useCallback, useState } from 'react';

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const domain = localStorage.getItem('VITE_DOMAIN') || import.meta.env.VITE_DOMAIN;
const HTTP_HOST = `${api_protocol}://${domain}:${port}`;

export default function useGatBonsaleProject() {
  const [isLoading, setIsLoading] = useState(false);

  const getBonsaleProject = useCallback(async (projectId: string) => {
    setIsLoading(true);
    try {
      // 將專案中的客戶電話號碼提取出來
      const queryString = new URLSearchParams({
        limit: '-1',
        projectIds: projectId
      });
      const response = await axios.get(`${HTTP_HOST}/api/bonsale/project?${queryString}`);
      return response.data;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { getBonsaleProject, isLoading };
}