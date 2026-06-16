import React from 'react';
import AnticheatButton from './components/AnticheatButton';
import QueueMonitorPortal from './components/QueueMonitorPortal';
import MatchmakingTransition from './components/MatchmakingTransition';
import WelcomeModal from './components/WelcomeModal';

export default function ContentApp() {
  return (
    <>
      <WelcomeModal />
      <QueueMonitorPortal />
      <MatchmakingTransition />
    </>
  );
}
