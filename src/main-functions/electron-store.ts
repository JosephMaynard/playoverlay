// `electron-store` v8.2.0 currently doesn't work on Windows with this project
// v9.0.0 has just been release but currently doesn't work at all (02/04/2024)

// This replacement was made by someone who faced the same problem:
// https://gist.github.com/steve981cr/499dae0c2a4c6340d0f35656dae92020

import { app } from 'electron';
import path from 'path';
import fs from 'fs';

interface Config {
  [key: string]: any; // You can refine the type of value if necessary.
}

class Store {
  private configPath: string;

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.initConfig();
  }

  private initConfig(): void {
    if (!fs.existsSync(this.configPath)) {
      fs.writeFileSync(this.configPath, '{}');
    }
  }

  get(key: string): any {
    // Use a more specific type instead of any if possible
    this.initConfig();
    const configJson = fs.readFileSync(this.configPath, 'utf8');
    const config: Config = JSON.parse(configJson);
    return config[key];
  }

  set(key: string, value: any): void {
    // Use a more specific type instead of any if possible
    this.initConfig();
    const configJson = fs.readFileSync(this.configPath, 'utf8');
    const config: Config = JSON.parse(configJson);
    config[key] = value;
    const newConfigJson = JSON.stringify(config, null, 2); // Beautify the JSON output
    fs.writeFileSync(this.configPath, newConfigJson);
  }

  delete(key: string): void {
    this.initConfig();
    const configJson = fs.readFileSync(this.configPath, 'utf8');
    const config: Config = JSON.parse(configJson);
    delete config[key]; // Properly delete the key instead of setting it to empty string
    const newConfigJson = JSON.stringify(config, null, 2); // Beautify the JSON output
    fs.writeFileSync(this.configPath, newConfigJson);
  }
}

export default Store;
