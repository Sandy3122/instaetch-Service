const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ServerMonitor {
  constructor() {
    this.port = process.env.PORT || 3000;
    this.host = process.env.HOST || 'localhost';
    this.healthCheckInterval = 30000; // 30 seconds
    this.maxFailures = 3;
    this.failureCount = 0;
    this.isRestarting = false;
  }

  async checkHealth() {
    return new Promise((resolve) => {
      // const req = http.get(`http://localhost:${this.port}/api/health`, (res) => {
        const req = http.get(`http://${this.host}:${this.port}/api/health`, (res) => {  
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          resolve(false);
        }
      });

      req.on('error', () => {
        resolve(false);
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  async restartServer() {
    if (this.isRestarting) {
      console.log('Server restart already in progress...');
      return;
    }

    this.isRestarting = true;
    console.log('Restarting server...');

    try {
      // Kill existing processes
      if (process.platform === 'win32') {
        spawn('taskkill', ['/f', '/im', 'node.exe']);
      } else {
        spawn('pkill', ['-f', 'node.*server.js']);
      }

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Start the server
      const serverProcess = spawn('node', ['src/server.js'], {
        stdio: 'inherit',
        detached: true
      });

      serverProcess.unref();

      console.log('Server restart initiated');
    } catch (error) {
      console.error('Failed to restart server:', error);
    } finally {
      this.isRestarting = false;
    }
  }

  async startMonitoring() {
    console.log(`Starting server monitor on port ${this.port}`);
    console.log(`Health check interval: ${this.healthCheckInterval}ms`);
    console.log(`Max failures before restart: ${this.maxFailures}`);

    setInterval(async () => {
      const isHealthy = await this.checkHealth();
      
      if (isHealthy) {
        if (this.failureCount > 0) {
          console.log(`Server recovered. Health check passed.`);
          this.failureCount = 0;
        }
      } else {
        this.failureCount++;
        console.log(`Health check failed. Failure count: ${this.failureCount}/${this.maxFailures}`);
        
        if (this.failureCount >= this.maxFailures) {
          console.log('Max failures reached. Restarting server...');
          await this.restartServer();
          this.failureCount = 0;
        }
      }
    }, this.healthCheckInterval);
  }
}

// Start monitoring if this file is run directly
if (require.main === module) {
  const monitor = new ServerMonitor();
  monitor.startMonitoring();
}

module.exports = ServerMonitor; 