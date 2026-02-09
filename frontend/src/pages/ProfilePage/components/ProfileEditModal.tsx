/**
 * ProfileEditModal - Modal for editing user profile (avatar, displayName, bio)
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { User, UserAvatar, UpdateProfileData } from '../../../types/user.types';
import { userApi } from '../../../services/api';
import { useLanguage } from '../../../i18n';
import { useToast } from '../../../contexts/ToastContext';
import AvatarSelector from './AvatarSelector';
import { AvatarDisplay } from '../../../components/AvatarDisplay';

interface ProfileEditModalProps {
  open: boolean;
  onClose: () => void;
  profile: User;
  onProfileUpdated: (updatedProfile: User) => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  open,
  onClose,
  profile,
  onProfileUpdated,
}) => {
  const { t } = useLanguage();
  const toast = useToast();

  // Form state
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatar, setAvatar] = useState<UserAvatar>(
    profile.avatar || { type: 'preset', value: 'default-1' }
  );

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  // Reset form when profile changes
  useEffect(() => {
    if (open) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setAvatar(profile.avatar || { type: 'preset', value: 'default-1' });
      setError(null);
      setShowAvatarSelector(false);
    }
  }, [open, profile]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);

    try {
      const updateData: UpdateProfileData = {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        avatar,
      };

      const updatedProfile = await userApi.updateMyProfile(updateData);
      onProfileUpdated(updatedProfile);
      toast.success('toast.profileUpdated');
      onClose();
    } catch (err: any) {
      toast.error('toast.profileUpdateFailed', { params: { message: err.response?.data?.message || '' } });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = (selectedAvatar: UserAvatar) => {
    setAvatar(selectedAvatar);
  };

  const hasChanges =
    displayName !== (profile.displayName || '') ||
    bio !== (profile.bio || '') ||
    avatar.type !== (profile.avatar?.type || 'preset') ||
    avatar.value !== (profile.avatar?.value || 'default-1');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: '2px solid transparent',
          backgroundImage:
            'linear-gradient(#ffffff, #ffffff), linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(126, 200, 227, 0.2)',
          pb: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {t('profile.editProfile')}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: '#ffaaa5',
            '&:hover': {
              background: 'rgba(255, 170, 165, 0.15)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Avatar Section */}
        <Box sx={{ mb: 3 }}>
          {!showAvatarSelector ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                pt: 2,
              }}
            >
              <AvatarDisplay avatar={avatar} email={profile.email} size={80} />
              <Button
                variant="outlined"
                onClick={() => setShowAvatarSelector(true)}
                sx={{
                  borderColor: '#7ec8e3',
                  color: '#7ec8e3',
                  '&:hover': {
                    borderColor: '#5ba8c7',
                    background: 'rgba(126, 200, 227, 0.1)',
                  },
                }}
              >
                {t('profile.changeAvatar')}
              </Button>
            </Box>
          ) : (
            <Box>
              <AvatarSelector
                currentAvatar={avatar}
                email={profile.email}
                onSelect={handleAvatarSelect}
              />
              <Button
                size="small"
                onClick={() => setShowAvatarSelector(false)}
                variant="outlined"
                sx={{
                  mt: 1,
                  borderColor: 'rgba(255, 170, 165, 0.5)',
                  color: '#ffaaa5',
                  '&:hover': {
                    borderColor: 'rgba(255, 170, 165, 0.8)',
                    background: 'rgba(255, 170, 165, 0.1)',
                  },
                }}
              >
                {t('common.close')}
              </Button>
            </Box>
          )}
        </Box>

        {/* Display Name */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label={t('profile.displayName')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            inputProps={{ maxLength: 30 }}
            helperText={`${displayName.length}/30`}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: '#7ec8e3',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#7ec8e3',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#7ec8e3',
              },
            }}
          />
        </Box>

        {/* Bio */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('profile.bio')}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            inputProps={{ maxLength: 200 }}
            helperText={`${bio.length}/200`}
            placeholder={t('profile.bioPlaceholder')}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: '#7ec8e3',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#7ec8e3',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#7ec8e3',
              },
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderColor: 'rgba(255, 170, 165, 0.5)',
            color: '#ffaaa5',
            '&:hover': {
              borderColor: 'rgba(255, 170, 165, 0.8)',
              background: 'rgba(255, 170, 165, 0.1)',
            },
          }}
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          sx={{
            background: 'linear-gradient(135deg, #7ec8e3 0%, #a8e6cf 100%)',
            color: '#fff',
            '&:hover': {
              background: 'linear-gradient(135deg, #5ba8c7 0%, #88d6b7 100%)',
            },
            '&:disabled': {
              background: '#e0e0e0',
            },
          }}
        >
          {saving ? (
            <CircularProgress size={20} sx={{ color: '#fff' }} />
          ) : (
            t('common.save')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileEditModal;
