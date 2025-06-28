const config = require('../config/config');

class ProxyManager {
  constructor() {
    this.proxyList = [
      {
        host: '198.23.239.134',
        port: '6540',
        username: 'mdpyinsf',
        password: 'b0jp9ah5i75l'
      },
      {
        host: '207.244.217.165',
        port: '6712',
        username: 'mdpyinsf',
        password: 'b0jp9ah5i75l'
      },
      {
        host: '107.172.163.27',
        port: '6543',
        username: 'mdpyinsf',
        password: 'b0jp9ah5i75l'
      },
      {
        host: '23.94.138.75',
        port: '6349',
        username: 'mdpyinsf',
        password: 'b0jp9ah5i75l'
      },
      {
        host: '216.10.27.159',
        port: '6837',
        username: 'mdpyinsf',
        password: 'b0jp9ah5i75l'
      }
    ];
    this.currentIndex = 0;
  }

  getNextProxy() {
    const proxy = this.proxyList[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxyList.length;
    return proxy;
  }

  getProxyConfig(proxy) {
    return {
      server: `http://${proxy.host}:${proxy.port}`,
      username: proxy.username,
      password: proxy.password
    };
  }
}

// Create singleton instance
const proxyManager = new ProxyManager();
module.exports = proxyManager; 