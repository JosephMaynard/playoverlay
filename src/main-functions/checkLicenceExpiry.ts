import { renewLicenceKey } from './apiRequests';
import { getLicencedData } from './isLicensed';

export default function checkLicenceExpiry() {
  const licenceData = getLicencedData();

  if (
    licenceData.exp &&
    Math.floor(
      (licenceData?.exp - Math.floor(Date.now() / 1000)) / (60 * 60 * 24)
    ) < 60
  ) {
    renewLicenceKey();
  }
}
