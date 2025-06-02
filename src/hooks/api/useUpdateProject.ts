import axios from 'axios';
import { useCallback } from 'react';

// 取得本機 IP domain
const { hostname } = window.location;

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const HTTP_HOST = `${api_protocol}://${hostname}:${port}`;

export default function useUpdateProject() {
  const updateProject = useCallback(async (projectId: string, isEnable: string) => {
    try {
      const response = await axios.put(`${HTTP_HOST}/api/bonsale/project/3cx/${projectId}`, { isEnable });
      return response.data;
    } catch (error) {
      console.error('Error updating dial update:', error);
      throw error;
    }
  }, []);

  return { updateProject };
}