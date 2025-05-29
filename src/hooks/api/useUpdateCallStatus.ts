import axios from 'axios';

// 取得本機 IP domain
const { hostname } = window.location;

const api_protocol = import.meta.env.VITE_API_PROTOCOL;
const port = import.meta.env.VITE_API_PORT;
const HTTP_HOST = `${api_protocol}://${hostname}:${port}`;

export default function useUpdateCallStatus() {
  const updateCallStatus = async (projectId: string, customerId: string, callStatus: number) => {
    try {
      const response = await axios.put(`${HTTP_HOST}/api/bonsale/project/${projectId}/customer/${customerId}/callStatus`, { callStatus });
      return response.data;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  };

  return { updateCallStatus };
}