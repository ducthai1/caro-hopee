/**
 * TinhTuyGoPopup — Floating "+2,000" popup when passing Go.
 */
import React from 'react';
import { useLanguage } from '../../../i18n';
import { useTinhTuy } from '../TinhTuyContext';
import './tinh-tuy-board.css';

export const TinhTuyGoPopup: React.FC = () => {
  const { t } = useLanguage();
  const { state } = useTinhTuy();

  if (!state.showGoPopup) return null;

  return (
    <div className="tt-go-popup">
      {t('tinhTuy.game.passedGo')}
    </div>
  );
};
