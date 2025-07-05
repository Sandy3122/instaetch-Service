// const config = require('../config/config');

// class ProxyManager {
//   constructor() {
//     this.proxyList = [
//       {
//         host: '198.23.239.134',
//         port: '6540',
//         username: 'mdpyinsf',
//         password: 'b0jp9ah5i75l'
//       },
//       {
//         host: '207.244.217.165',
//         port: '6712',
//         username: 'mdpyinsf',
//         password: 'b0jp9ah5i75l'
//       },
//       {
//         host: '107.172.163.27',
//         port: '6543',
//         username: 'mdpyinsf',
//         password: 'b0jp9ah5i75l'
//       },
//       {
//         host: '38.154.227.167',
//         port: '5868',
//         username: 'mdpyinsf',
//         password: 'b0jp9ah5i75l'
//       },
//       {
//         host: '216.10.27.159',
//         port: '6837',
//         username: 'mdpyinsf',
//         password: 'b0jp9ah5i75l'
//       },
//       {
//         host: '136.0.207.84',
//         port: '6661',
//         username: 'mdpyinsf',
//         password: 'b0jp9ah5i75l'
//       },
//       {
//         host: '64.64.118.149',
//         port: '6732',
//         username: 'mdpyinsf',
//         password: 'b0jp9ah5i75l'
//       },
//       {
//         host: '142.147.128.93',
//         port: '6593',
//         username: 'mdpyinsf',
//         password: 'b0jp9ah5i75l'
//       },
//       {
//         host: '104.239.105.125',
//         port: '6655',
//         username: 'mdpyinsf',
//         password: 'b0jp9ah5i75l'
//       },
//       {
//         host: '206.41.172.74',
//         port: '6655',
//         username: 'mdpyinsf',
//         password: 'b0jp9ah5i75l'
//       }
//     ];
//     this.currentIndex = 0;
//   }

//   getNextProxy() {
//     const proxy = this.proxyList[this.currentIndex];
//     this.currentIndex = (this.currentIndex + 1) % this.proxyList.length;
//     return proxy;
//   }

//   getProxyConfig(proxy) {
//     return {
//       server: `http://${proxy.host}:${proxy.port}`,
//       username: proxy.username,
//       password: proxy.password
//     };
//   }
// }

// // Create singleton instance
// const proxyManager = new ProxyManager();
// module.exports = proxyManager; 




// // ProxyManager.js
// const config = require('../config/config');

// class ProxyManager {
//   constructor() {
//     this.proxyList = [
//       { host: '198.23.239.134', port: '6540', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
//       { host: '207.244.217.165', port: '6712', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
//       { host: '107.172.163.27', port: '6543', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
//       { host: '38.154.227.167', port: '5868', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
//       { host: '216.10.27.159', port: '6837', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
//       { host: '136.0.207.84', port: '6661', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
//       { host: '64.64.118.149', port: '6732', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
//       { host: '142.147.128.93', port: '6593', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
//       { host: '104.239.105.125', port: '6655', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
//       { host: '206.41.172.74', port: '6655', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },

//       { host: '38.154.227.167', port: '5868', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
//       { host: '198.23.239.134', port: '6540', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
//       { host: '207.244.217.165', port: '6712', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
//       { host: '107.172.163.27', port: '6543', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
//       { host: '216.10.27.159', port: '6837', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
//       { host: '136.0.207.84', port: '6661', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
//       { host: '64.64.118.149', port: '6732', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
//       { host: '142.147.128.93', port: '6593', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
//       { host: '104.239.105.125', port: '6655', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
//       { host: '206.41.172.74', port: '6634', username: 'fqpwxfth', password: 'c1sdb3lod4h7' }

//     ];
//     this.failedProxies = new Set(); // Track failed proxies
//     this.currentIndex = 0;
//   }

//   getNextProxy() {
//     const availableProxies = this.proxyList.filter(
//       (_, index) => !this.failedProxies.has(index)
//     );

//     if (availableProxies.length === 0) {
//       // Reset all proxies if exhausted
//       console.warn("All proxies failed. Resetting failed proxy list.");
//       this.failedProxies.clear();
//     }

//     let attempts = 0;
//     while (attempts < this.proxyList.length) {
//       const index = this.currentIndex;
//       this.currentIndex = (this.currentIndex + 1) % this.proxyList.length;
//       if (!this.failedProxies.has(index)) {
//         return { ...this.proxyList[index], index };
//       }
//       attempts++;
//     }

//     // Fallback: just return any proxy
//     return { ...this.proxyList[0], index: 0 };
//   }

//   markProxyAsFailed(index) {
//     this.failedProxies.add(index);
//   }

//   getProxyConfig(proxy) {
//     return {
//       server: `http://${proxy.host}:${proxy.port}`,
//       username: proxy.username,
//       password: proxy.password,
//     };
//   }
// }

// module.exports = new ProxyManager();

















// Updated
const config = require('../config/config');

class ProxyManager {
  constructor() {
    this.proxyList = [
      // { host: '207.244.217.165', port: '6712', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
      { host: '107.172.163.27', port: '6543', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
      { host: '38.154.227.167', port: '5868', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
      { host: '216.10.27.159', port: '6837', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
      { host: '136.0.207.84', port: '6661', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
      { host: '64.64.118.149', port: '6732', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
      { host: '142.147.128.93', port: '6593', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
      { host: '104.239.105.125', port: '6655', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },
      { host: '206.41.172.74', port: '6655', username: 'mdpyinsf', password: 'b0jp9ah5i75l' },

      // { host: '38.154.227.167', port: '5868', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
      // { host: '198.23.239.134', port: '6540', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
      // { host: '207.244.217.165', port: '6712', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
      // { host: '107.172.163.27', port: '6543', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
      // { host: '216.10.27.159', port: '6837', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
      // { host: '136.0.207.84', port: '6661', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
      // { host: '64.64.118.149', port: '6732', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
      // { host: '142.147.128.93', port: '6593', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
      // { host: '104.239.105.125', port: '6655', username: 'fqpwxfth', password: 'c1sdb3lod4h7' },
      // { host: '206.41.172.74', port: '6634', username: 'fqpwxfth', password: 'c1sdb3lod4h7' }
    ];
    
    this.failedProxies = new Set();
    this.currentIndex = 0;
  }

  getNextProxy() {
    const availableProxies = this.proxyList.filter((_, index) => !this.failedProxies.has(index));
    if (availableProxies.length === 0) {
      console.warn("All proxies failed. Resetting failed proxy list.");
      this.failedProxies.clear();
    }

    let attempts = 0;
    while (attempts < this.proxyList.length) {
      const index = this.currentIndex;
      this.currentIndex = (this.currentIndex + 1) % this.proxyList.length;
      if (!this.failedProxies.has(index)) {
        return { ...this.proxyList[index], index };
      }
      attempts++;
    }

    return { ...this.proxyList[0], index: 0 }; // fallback
  }

  markProxyAsFailed(index) {
    this.failedProxies.add(index);
  }

  markProxyAsSuccessful(index) {
    this.failedProxies.delete(index);
  }

  getProxyConfig(proxy) {
    return {
      server: `http://${proxy.host}:${proxy.port}`,
      username: proxy.username,
      password: proxy.password
    };
  }

  getFailedCount() {
    return this.failedProxies.size;
  }

  getAvailableCount() {
    return this.proxyList.length - this.failedProxies.size;
  }
}

module.exports = new ProxyManager();