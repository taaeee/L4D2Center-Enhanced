import React from 'react';
import AnticheatButton from './components/AnticheatButton';
import QueueMonitorPortal from './components/QueueMonitorPortal';
import MatchmakingTransition from './components/MatchmakingTransition';

export default function ContentApp() {
  return (
    <>
      <QueueMonitorPortal />
      <MatchmakingTransition />
    </>
  );
}
