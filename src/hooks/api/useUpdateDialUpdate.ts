import axios from 'axios';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST || 'http://localhost:3020';

export default function useUpdateDialUpdate() {
  const updateDialUpdate = async (projectId: string, customerId: string) => {
    try {
      const response = await axios.put(`${HTTP_HOST}/bonsale/project/${projectId}/customer/${customerId}/dialUpdate`, {});
      return response.data;
    } catch (error) {
      console.error('Error updating dial update:', error);
      throw error;
    }
  };

  return { updateDialUpdate };
}