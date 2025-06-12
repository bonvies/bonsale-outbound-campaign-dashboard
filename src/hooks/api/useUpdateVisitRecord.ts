import axios from 'axios';
import { useCallback, useState } from 'react';

// 取得本機 IP domain
const { hostname } = window.location;

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const HTTP_HOST = `${api_protocol}://${hostname}:${port}`;

export default function useUpdateVisitRecord() {
  const [isLoading, setIsLoading] = useState(false);

  const updateVisitRecord = useCallback(async (
    projectId: string,
    customerId: string,
    visitType: 'intro' | 'quotation' | 'negotiation' | 'contract' | 'close',
    visitedUsername: string,
    visitedAt: string,
    description: string,
    visitedResult: string,
    task?: {
      topic: string;
      description: string;
      remindAt: string;
    }
  ) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${HTTP_HOST}/api/bonsale/project/customer/visit`, {
        projectId,
        customerId,
        visitType,
        visitedUsername,
        visitedAt,
        description,
        visitedResult,
        task,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating visit record:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateVisitRecord, isLoading };
}