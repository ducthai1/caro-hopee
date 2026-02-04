/**
 * Xì Dách Score Tracker - Match History
 * Collapsible section showing all match results
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MatchHistoryItem from './MatchHistoryItem';
import { XiDachSession } from '../../types/xi-dach-score.types';
import { useLanguage } from '../../i18n';

interface MatchHistoryProps {
  session: XiDachSession;
  onEditMatch: (matchId: string) => void;
  onUndoMatch: () => void;
}

const MatchHistory: React.FC<MatchHistoryProps> = ({
  session,
  onEditMatch,
  onUndoMatch,
}) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [undoConfirm, setUndoConfirm] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { matches, players, settings } = session;
  const matchCount = matches.length;

  if (matchCount === 0) {
    return null;
  }

  // Show in reverse chronological order
  const reversedMatches = [...matches].reverse();

  // Limit display to 5 matches unless showAll
  const displayMatches = showAll ? reversedMatches : reversedMatches.slice(0, 5);
  const hasMore = matchCount > 5 && !showAll;

  const handleUndoConfirm = () => {
    onUndoMatch();
    setUndoConfirm(false);
  };

  const lastMatchNumber = matches[matches.length - 1]?.matchNumber;

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Toggle Button */}
      <Button
        fullWidth
        onClick={() => setExpanded(!expanded)}
        startIcon={<HistoryIcon />}
        endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{
          py: 1.5,
          justifyContent: 'space-between',
          color: '#7f8c8d',
          textTransform: 'none',
          '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.02)' },
        }}
      >
        {t('xiDachScore.history.title', { count: matchCount })}
      </Button>

      {/* Expanded Content */}
      <Collapse in={expanded}>
        <Box
          sx={{
            p: 2,
            pt: 1.5,
            maxHeight: 400,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          {displayMatches.map((match, index) => {
            const isLastMatch = index === 0; // First in reversed = last match
            return (
              <MatchHistoryItem
                key={match.id}
                match={match}
                players={players}
                settings={settings}
                isLastMatch={isLastMatch}
                onEdit={() => onEditMatch(match.id)}
                onUndo={() => setUndoConfirm(true)}
                t={t}
              />
            );
          })}

          {/* Show More Button */}
          {hasMore && (
            <Button
              size="small"
              onClick={() => setShowAll(true)}
              sx={{
                color: '#7f8c8d',
                textTransform: 'none',
              }}
            >
              {t('xiDachScore.history.showMore', { count: matchCount - 5 })}
            </Button>
          )}
        </Box>
      </Collapse>

      {/* Undo Confirmation Dialog */}
      <Dialog
        open={undoConfirm}
        onClose={() => setUndoConfirm(false)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>{t('xiDachScore.history.undoConfirmTitle', { number: lastMatchNumber })}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('xiDachScore.history.undoConfirmMessage')}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setUndoConfirm(false)}
            sx={{
              borderColor: '#FF8A65',
              color: '#FF8A65',
              bgcolor: '#fff',
              '&:hover': {
                borderColor: '#E64A19',
                bgcolor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            {t('xiDachScore.actions.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleUndoConfirm}
            sx={{ bgcolor: '#FF8A65', '&:hover': { bgcolor: '#E64A19' } }}
          >
            {t('xiDachScore.actions.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MatchHistory;
