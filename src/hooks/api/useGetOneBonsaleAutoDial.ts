import axios from 'axios';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST;

export default function useGetOneBonsaleAutoDial() {
  const getOneBonsaleAutoDial = async (projectId: string, callFlowId: string) => {
    try {
      const response = await axios.get(`${HTTP_HOST}/api/bonsale/project/${projectId}/auto-dial/${callFlowId}`);
      return response.data;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  };

  return { getOneBonsaleAutoDial };
}