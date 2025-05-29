import axios from 'axios';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST;

export default function useUpdateProject() {
  const updateProject = async (projectId: string, isEnable: string) => {
    try {
      const response = await axios.put(`${HTTP_HOST}/api/bonsale/project/3cx/${projectId}`, { isEnable });
      return response.data;
    } catch (error) {
      console.error('Error updating dial update:', error);
      throw error;
    }
  };

  return { updateProject };
}