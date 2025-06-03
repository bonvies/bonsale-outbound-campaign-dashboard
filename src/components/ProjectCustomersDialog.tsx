import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { useEffect, useState, useCallback } from 'react';
import CustomerDetailsTable from './CustomerDetailsTable';
import useGetBonsaleProject from '../hooks/api/useGetBonsaleProject';

type ProjectCustomersDialogProps = {
  onOpen: boolean;
  onClose?: () => void;
  projectId: string | null;
};

export default function ProjectCustomersDialog({ onOpen, onClose, projectId }: ProjectCustomersDialogProps) {
  const [open, setOpen] = useState(false);
  const [projectCustomersDesc, setProjectCustomersDesc] = useState<ProjectCustomersDesc[]>([]);
  const { getBonsaleProject } = useGetBonsaleProject();

  const handleClose = () => {
    setOpen(false);
    if (onClose) {
      onClose();
    }
  };

  const fetchCustomers = useCallback(async () => {
    if (projectId) {
      const customers = await getBonsaleProject(projectId);
      const projectCustomersDesc = customers.list.map((customer: Project) => customer);
      setProjectCustomersDesc(projectCustomersDesc);
    } else {
      setProjectCustomersDesc([]);
    }
  },[getBonsaleProject, projectId]);

  useEffect(() => {
    // 將專案中的客戶電話號碼提取出來
    fetchCustomers();
  }, [fetchCustomers, projectId]);

  useEffect(() => {
    setOpen(onOpen);
  }, [onOpen]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="ProjectCustomersDialog-title"
      aria-describedby="ProjectCustomersDialog-description"
      PaperProps={{
        sx: { width: 600, height: '100%' }
      }}
    >
      <DialogTitle id="alert-dialog-title">
        專案名單撥打狀態
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          <CustomerDetailsTable projectCustomersDesc={projectCustomersDesc} />
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleClose}
          variant="outlined"
        >
          取消
        </Button>
        <Button 
          onClick={handleClose}
          variant="contained"
        >
          確認
        </Button>
      </DialogActions>
    </Dialog>
  );
}