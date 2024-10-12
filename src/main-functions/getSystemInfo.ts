import os from 'os';
import { app } from 'electron';
import { machineId } from 'node-machine-id';
import { encodeURI } from 'js-base64';
import { getLicencedData } from './isLicensed';

export async function getSystemInfo() {
  const machine_description = `${os.userInfo().username}'s ${os.type()} ${Math.round(os.totalmem() / 1024 ** 3)}GB RAM ${os.cpus()[0].model}`;
  const machine_id = await machineId();
  return {
    machine_description,
    machine_id,
    app_name: app.getName(),
    app_version: app.getVersion(),
  };
}

export async function getEncodedSystemInfo() {
  return encodeURI(JSON.stringify(await getSystemInfo()));
}

export async function getRenewalSystemInfo() {
  const machine_id = await machineId();
  const licenceData = await getLicencedData();
  return {
    machine_id,
    app_name: app.getName(),
    app_version: app.getVersion(),
    refresh_token: licenceData.refresh_token,
  };
}

export async function getRenewalEncodedSystemInfo() {
  return encodeURI(JSON.stringify(await getRenewalSystemInfo()));
}
