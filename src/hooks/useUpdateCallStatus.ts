import axios from 'axios';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST || 'http://localhost:3020';

export default function useUpdateCallStatus() {
  const updateCallStatus = async (projectId: string, customerId: string, callStatus: number) => {
    try {
      const response = await axios.put(`${HTTP_HOST}/bonsale/project/${projectId}/customer/${customerId}/callStatus`, { callStatus });
      return response.data;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  };

  return { updateCallStatus };
}