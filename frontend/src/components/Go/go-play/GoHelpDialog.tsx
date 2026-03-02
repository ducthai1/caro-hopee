/**
 * GoHelpDialog — Accordion-based Go rules & settings guide dialog.
 */
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Typography,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useLanguage } from '../../../i18n';

const SECTIONS = [
  'basics', 'capturing', 'ko', 'suicide', 'komi',
  'handicap', 'byoyomi', 'scoring', 'controls',
] as const;

interface GoHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const GoHelpDialog: React.FC<GoHelpDialogProps> = React.memo(({ open, onClose }) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange = (panel: string) => (_: unknown, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <MenuBookIcon sx={{ color: '#2c3e50', fontSize: 22 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1, color: '#2c3e50' }}>
          {t('go.help.title' as any)}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {SECTIONS.map((key) => (
          <Accordion
            key={key}
            expanded={expanded === key}
            onChange={handleChange(key)}
            disableGutters
            elevation={0}
            sx={{
              '&:before': { display: 'none' },
              borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {t(`go.help.${key}.title` as any)}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-line', color: 'text.secondary', lineHeight: 1.7 }}
              >
                {t(`go.help.${key}.content` as any)}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </DialogContent>
    </Dialog>
  );
});

GoHelpDialog.displayName = 'GoHelpDialog';

export default GoHelpDialog;
