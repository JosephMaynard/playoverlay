import { useTranslation } from 'react-i18next';
import logo from '../../assets/playoverlay-logo.svg';
import './LoadingSpinner.css';

export default function LoadingSpinner() {
  const { t } = useTranslation();
  return (
    <div className="LoadingSpinner_wrapper flex h-full w-full items-center justify-center">
      <div className="LoadingSpinner_container relative">
        <div className="LoadingSpinner_shadow absolute left-0"></div>
        <img
          className="LoadingSpinner_ball absolute left-0 top-0"
          src={logo}
          alt={t('loadingSpinner.alt')}
        />
      </div>
    </div>
  );
}
