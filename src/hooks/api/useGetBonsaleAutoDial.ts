import axios from 'axios';

const HTTP_HOST = import.meta.env.VITE_HTTP_HOST;

export default function useGetBonsaleAutoDial() {
  const getBonsaleAutoDial = async () => {
    try {
      const queryString = new URLSearchParams({
        limit: '-1',
        sort: 'created_at+desc'
      });
      const response = await axios.get(`${HTTP_HOST}/bonsale/auto-dial?${queryString}`);
      return response.data;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  };

  return { getBonsaleAutoDial };
}