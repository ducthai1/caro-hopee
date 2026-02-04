/**
 * Blackjack Score Tracker - Session List
 * Displays all sessions with ability to open, create, or delete
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PeopleIcon from '@mui/icons-material/People';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/Lock';
import CloudIcon from '@mui/icons-material/Cloud';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import { useXiDachScore } from './XiDachScoreContext';
import { XiDachSessionStatus } from '../../types/xi-dach-score.types';
import { useLanguage } from '../../i18n';
import JoinSessionDialog from './JoinSessionDialog';
import ConfirmDialog from '../ConfirmDialog';
import { xiDachApi, XiDachSessionListItem } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getGuestId } from '../../utils/guestId';

// ============== HELPERS ==============

const getStatusLabel = (status: XiDachSessionStatus, t: (key: string) => string): string => {
  switch (status) {
    case 'setup':
      return t('xiDachScore.status.setup');
    case 'playing':
      return t('xiDachScore.status.playing');
    case 'paused':
      return t('xiDachScore.status.paused');
    case 'ended':
      return t('xiDachScore.status.ended');
    default:
      return status;
  }
};

const getStatusColor = (status: XiDachSessionStatus): string => {
  switch (status) {
    case 'setup':
      return '#FF8A65';
    case 'playing':
      return '#2e7d32'; // xanh lá - đang chơi
    case 'paused':
      return '#FFB74D';
    case 'ended':
      return '#95a5a6';
    default:
      return '#95a5a6';
  }
};

// ============== MAIN COMPONENT ==============

const SessionList: React.FC = () => {
  const { t } = useLanguage();
  const { goToSetup, setSessionFromApi } = useXiDachScore();
  const { user, isAuthenticated } = useAuth();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [deletingSessionCode, setDeletingSessionCode] = useState<string | null>(null);
  const [deleteConfirmSession, setDeleteConfirmSession] = useState<XiDachSessionListItem | null>(null);

  // Online sessions state
  const [onlineSessions, setOnlineSessions] = useState<XiDachSessionListItem[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  // Check if current user is the creator of a session
  const isCreator = useCallback((session: XiDachSessionListItem): boolean => {
    if (isAuthenticated && user?._id) {
      return session.creatorId === user._id;
    } else {
      const guestId = getGuestId();
      return session.creatorGuestId === guestId;
    }
  }, [isAuthenticated, user?._id]);

  // Handle delete button click - show confirmation
  const handleDeleteClick = useCallback((e: React.MouseEvent, session: XiDachSessionListItem) => {
    e.stopPropagation(); // Prevent card click
    setDeleteConfirmSession(session);
  }, []);

  // Handle confirm delete
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmSession || deletingSessionCode) return;

    const sessionCode = deleteConfirmSession.sessionCode;
    setDeletingSessionCode(sessionCode);
    setDeleteConfirmSession(null);

    try {
      await xiDachApi.deleteSession(sessionCode);
      // Remove from local state immediately
      setOnlineSessions(prev => prev.filter(s => s.sessionCode !== sessionCode));
    } catch (err: any) {
      console.error('Failed to delete session:', err);
      alert(err.response?.data?.message || 'Failed to delete session');
    } finally {
      setDeletingSessionCode(null);
    }
  }, [deleteConfirmSession, deletingSessionCode]);

  // Fetch online sessions
  const fetchOnlineSessions = useCallback(async () => {
    setLoadingOnline(true);
    setOnlineError(null);
    try {
      const response = await xiDachApi.getSessions(undefined, 20);
      setOnlineSessions(response.sessions);
    } catch (err: any) {
      console.error('Failed to fetch online sessions:', err);
      setOnlineError(err.message || 'Failed to load online sessions');
    } finally {
      setLoadingOnline(false);
    }
  }, []);

  // Fetch on mount and periodically
  useEffect(() => {
    fetchOnlineSessions();
    const interval = setInterval(fetchOnlineSessions, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchOnlineSessions]);

  const [joiningSessionCode, setJoiningSessionCode] = useState<string | null>(null);

  const handleJoinSuccess = async (sessionCode: string, sessionData?: any) => {
    if (sessionData && sessionData.settings) {
      setSessionFromApi(sessionData);
      return;
    }
    try {
      const response = await xiDachApi.getSession(sessionCode);
      setSessionFromApi(response);
    } catch (err: any) {
      if (err.response?.status === 401 && err.response?.data?.requiresPassword) {
        setJoiningSessionCode(sessionCode);
        setJoinDialogOpen(true);
      } else {
        console.error('Failed to join session:', err);
      }
    }
  };

  // Handle clicking on online session
  const handleOnlineSessionClick = async (session: XiDachSessionListItem) => {
    if (session.hasPassword) {
      setJoiningSessionCode(session.sessionCode);
      setJoinDialogOpen(true);
    } else {
      // Join directly without password
      await handleJoinSuccess(session.sessionCode, session);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#FFF8F5',
        pt: { xs: 10, md: 4 },
        pb: 4,
        px: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: '#FF8A65',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <span>🎴</span> {t('xiDachScore.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: '#7f8c8d', mt: 0.5 }}>
            {t('xiDachScore.subtitle')}
          </Typography>
        </Box>

        {/* Online Sessions Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CloudIcon sx={{ color: '#FF8A65', fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                {t('xiDachScore.multiplayer.onlineSessions')}
              </Typography>
              {onlineSessions.length > 0 && (
                <Chip
                  label={onlineSessions.length}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    bgcolor: 'rgba(255, 138, 101, 0.1)',
                    color: '#FF8A65',
                  }}
                />
              )}
            </Box>
            <IconButton
              size="small"
              onClick={fetchOnlineSessions}
              disabled={loadingOnline}
              sx={{ color: '#FF8A65' }}
            >
              {loadingOnline ? <CircularProgress size={18} sx={{ color: '#FF8A65' }} /> : <RefreshIcon fontSize="small" />}
            </IconButton>
          </Box>

          {loadingOnline && onlineSessions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CircularProgress size={24} sx={{ color: '#FF8A65' }} />
            </Box>
          ) : onlineError ? (
            <Box sx={{ textAlign: 'center', py: 2, color: '#e74c3c' }}>
              <Typography variant="body2">{onlineError}</Typography>
            </Box>
          ) : onlineSessions.length > 0 ? (
            <Box sx={{ mb: 2 }}>
              {onlineSessions.map((session) => (
                <Card
                  key={session.id}
                  sx={{
                    mb: 1.5,
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: '0 2px 6px rgba(255, 138, 101, 0.1)',
                    border: '1px solid rgba(255, 138, 101, 0.15)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(255, 138, 101, 0.15)',
                    },
                  }}
                  onClick={() => handleOnlineSessionClick(session)}
                >
                  <CardContent sx={{ py: 1.5, px: 2, display: 'flex', flexDirection: 'column', gap: 1.5, '&:last-child': { pb: 1.5 } }}>
                    {/* Row 1: Name | [Lock] [Delete] */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 600,
                            color: '#2c3e50',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {session.name}
                        </Typography>
                        <Chip
                          label={getStatusLabel(session.status, t)}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            bgcolor: getStatusColor(session.status),
                            color: '#fff',
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {session.hasPassword && (
                          <LockIcon sx={{ fontSize: 16, color: '#7f8c8d' }} titleAccess={t('xiDachScore.multiplayer.hasPassword')} />
                        )}
                        {isCreator(session) && (
                          <Tooltip title={t('xiDachScore.deleteSession')} arrow>
                            <IconButton
                              size="small"
                              onClick={(e) => handleDeleteClick(e, session)}
                              disabled={deletingSessionCode === session.sessionCode}
                              sx={{
                                width: 24,
                                height: 24,
                                bgcolor: 'rgba(255, 138, 101, 0.1)',
                                color: '#FF8A65',
                                '&:hover': {
                                  bgcolor: 'rgba(255, 138, 101, 0.2)',
                                  color: '#E64A19',
                                },
                                '&:disabled': {
                                  bgcolor: 'rgba(0, 0, 0, 0.05)',
                                  color: 'rgba(0, 0, 0, 0.26)',
                                },
                              }}
                            >
                              {deletingSessionCode === session.sessionCode ? (
                                <CircularProgress size={12} sx={{ color: '#FF8A65' }} />
                              ) : (
                                <DeleteIcon sx={{ fontSize: 14 }} />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                    {/* Row 2: Players | Matches | Status | SessionCode */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: '#7f8c8d', fontSize: '0.8rem' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PeopleIcon sx={{ fontSize: 14 }} />
                        <span>{session.playerCount}</span>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SportsEsportsIcon sx={{ fontSize: 14 }} />
                        <span>#{session.matchCount}</span>
                      </Box>
                      <Box sx={{ flex: 1 }} />
                      <Chip
                        label={session.sessionCode}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          bgcolor: '#FF8A65',
                          color: '#fff',
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 2, color: '#95a5a6' }}>
              <Typography variant="body2">
                {t('xiDachScore.noSessions')}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Create Button */}
          <Button
            variant="contained"
            fullWidth
            startIcon={<AddIcon />}
            onClick={goToSetup}
            sx={{
              py: 1.5,
              borderRadius: 3,
              color: '#fff',
              fontWeight: 600,
              fontSize: '1rem',
              background: '#E64A19',
              boxShadow: '0 4px 12px rgba(255, 138, 101, 0.3)',
              '&:hover': {
                background: '#e35d33',
                boxShadow: '0 6px 16px rgba(245, 126, 90, 0.4)',
              },
            }}
          >
            {t('xiDachScore.createSession')}
          </Button>

          {/* Join Button */}
          <Button
            variant="outlined"
            fullWidth
            startIcon={<SearchIcon />}
            onClick={() => setJoinDialogOpen(true)}
            sx={{
              py: 1.5,
              borderRadius: 3,
              borderColor: '#FF8A65',
              color: '#FF8A65',
              fontWeight: 600,
              fontSize: '1rem',
              bgcolor: 'rgb(255, 255, 255)',
              '&:hover': {
                borderColor: '#FF8A66',
                bgcolor: 'rgb(247, 247, 247)',
              },
            }}
          >
            {t('xiDachScore.multiplayer.joinSession')}
          </Button>
        </Box>
      </Box>

      <JoinSessionDialog
        open={joinDialogOpen}
        onClose={() => {
          setJoinDialogOpen(false);
          setJoiningSessionCode(null);
        }}
        onJoinSuccess={handleJoinSuccess}
        initialSessionCode={joiningSessionCode || undefined}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteConfirmSession}
        title={t('xiDachScore.deleteConfirmTitle')}
        message={t('xiDachScore.deleteConfirmMessage', { name: deleteConfirmSession?.name || '' })}
        confirmText={t('common.delete')}
        variant="danger"
        loading={!!deletingSessionCode}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmSession(null)}
      />
    </Box>
  );
};

export default SessionList;
