import { useState, useEffect, useCallback } from 'react';

import useGetBonsaleAutoDial from './api/useGetBonsaleAutoDial';
import useGetBonsaleProject from './api/useGetBonsaleProject';

const useProjectOutboundData = () => {
  const { getBonsaleAutoDial } = useGetBonsaleAutoDial();
  const { getBonsaleProject } = useGetBonsaleProject();

  const [projectOutboundData, setProjectOutboundData] = useState<ProjectOutboundDataType[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const bonsaleAutoDial = await getBonsaleAutoDial();
      const dataList = bonsaleAutoDial.list;

      const updatedData = await Promise.all(
        dataList.map(async (item: Project) => {
          const customers = await getBonsaleProject(item.projectId);
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
            projectCallState: 'init',
            projectCallData: null,
            isEnable: item.projectInfo.isEnable,
            toCall: null,
          };
        })
      );
      setProjectOutboundData(updatedData);
    } catch (error) {
      console.error('Error fetching project auto-dial data:', error);
      throw error;
    }
  }, [getBonsaleAutoDial, getBonsaleProject]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { projectOutboundData, setProjectOutboundData };
};

export default useProjectOutboundData;