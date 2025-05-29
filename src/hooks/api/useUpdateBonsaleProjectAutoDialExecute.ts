import axios from 'axios';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST;

export default function useUpdateBonsaleProjectAutoDialExecute() {
  const updateBonsaleProjectAutoDialExecute = async (projectId: string, callFlowId: string) => {
    try {
      const response = await axios.put(`${HTTP_HOST}/api/bonsale/project/${projectId}/auto-dial/${callFlowId}/execute`, {});
      return response.data;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  };

  return { updateBonsaleProjectAutoDialExecute };
}