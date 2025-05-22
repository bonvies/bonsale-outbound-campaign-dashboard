import { useState, useEffect, useCallback } from 'react';

import useGetBonsaleAutoDial from './api/useGetBonsaleAutoDial';
import useGatBonsaleProject from './api/useGatBonsaleProject';

const useProjectOutboundData = () => {
  const { getBonsaleAutoDial } = useGetBonsaleAutoDial();
  const { gatBonsaleProject } = useGatBonsaleProject();

    const getBonsaleAutoDialCallback = useCallback(getBonsaleAutoDial, []);
  const gatBonsaleProjectCallback = useCallback(gatBonsaleProject, []);

  const [projectOutboundData, setProjectOutboundData] = useState<ProjectOutboundDataType[]>([]);

  useEffect(() => {
    const fetchData = async () => {
    try {
      const bonsaleAutoDial = await getBonsaleAutoDialCallback();
      const dataList = bonsaleAutoDial.list;

      // 將資料轉換為符合專案撥打狀態的格式
      const updatedData = await Promise.all(
        dataList.map(async (item: Project) => {
          // 將專案中的客戶電話號碼提取出來
          const customers = await gatBonsaleProjectCallback(item.projectId);
          const projectCustomersDesc = customers.list.map((customer: Project) => customer);
          return {
            appId: item.appId,
            appSecret: item.appSecret,
            callFlowId: item.callFlowId,
            projectId: item.projectId,
            projectName: item.projectInfo.projectName,
            startDate: item.projectInfo.startDate,
            endDate: item.projectInfo.endDate,
            callStatus: 0,
            extension: item.callFlow.phone,
            projectCustomersDesc,
            currentCallIndex: 0, 
            projectCallState: 'init', // 撥打狀態
            projectCallData: null, // 撥打資料,
            isEnable: item.projectInfo.isEnable,
          };
        })
      );
      setProjectOutboundData(updatedData);
    } catch (error) {
      console.error('Error fetching project auto-dial data:', error);
      throw error;
    }
    };

    fetchData();
  }, [gatBonsaleProjectCallback, getBonsaleAutoDialCallback]);

  return { projectOutboundData, setProjectOutboundData };
};

export default useProjectOutboundData;