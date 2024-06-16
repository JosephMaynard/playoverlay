import os from 'os';
import { app } from 'electron';
import { machineId } from 'node-machine-id';

export default async function getSystemInfo() {
  const machine_description = `${os.userInfo().username}'s ${os.type()} ${os.totalmem() / 1024 ** 3}GB RAM ${os.cpus()[0].model}`;
  const machine_id = await machineId();
  return {
    machine_description,
    machine_id,
    app_name: app.getName(),
    app_version: app.getVersion(),
  };
}
