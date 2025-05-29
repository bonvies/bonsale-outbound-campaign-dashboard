import axios from 'axios';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST;

export default function useUpdateVisitRecord() {
  const updateVisitRecord = async (
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
    try {
      const response = await axios.put(`${HTTP_HOST}/api/bonsale/project/customer/visit`, {
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
    }
  };

  return { updateVisitRecord };
}