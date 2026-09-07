import { initializeAutomaticDim } from '../../platform/automaticDim';
import { registerAppWorker } from '../../platform/pwa/service-worker';
import { renderRecoveryView } from './recovery-view';
import './recovery.css';

initializeAutomaticDim();
void registerAppWorker();

document.addEventListener('DOMContentLoaded', () => {
  const host = document.getElementById('recovery-view');
  if (host) renderRecoveryView(host);
});
