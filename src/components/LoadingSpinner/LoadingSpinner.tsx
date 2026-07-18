import logo from '../../assets/playoverlay-logo.svg';
import './LoadingSpinner.css';

export default function LoadingSpinner() {
  return (
    <div className="LoadingSpinner_wrapper flex h-full w-full items-center justify-center">
      <div className="LoadingSpinner_container relative">
        <div className="LoadingSpinner_shadow absolute left-0"></div>
        <img
          className="LoadingSpinner_ball absolute left-0 top-0"
          src={logo}
          alt="PlayOverlay Logo"
        />
      </div>
    </div>
  );
}
