/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Kasir } from './components/Kasir';
import { Inventory } from './components/Inventory';
import { ProductSettings } from './components/ProductSettings';
import { SalesHistory } from './components/SalesHistory';
import { Reports } from './components/Reports';
import { callDb } from './lib/api';

export default function App() {
  const [activePage, setActivePage] = useState('kasir');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Force dark mode on root
    document.documentElement.classList.add('dark');
    document.documentElement.style.setProperty('color-scheme', 'dark');
  }, []);

  const checkConnection = async () => {
    // Check if we can reach the API
    const res = await callDb("produk?select=id&limit=1");
    setIsOnline(res !== null);
  };

  useEffect(() => {
    checkConnection();
    // Re-check connection every minute
    const interval = setInterval(checkConnection, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    checkConnection();
    window.location.reload();
  };

  const renderPage = () => {
    switch (activePage) {
      case 'kasir': return <Kasir isDarkMode={true} />;
      case 'stok': return <Inventory isDarkMode={true} />;
      case 'produk': return <ProductSettings isDarkMode={true} />;
      case 'riwayat': return <SalesHistory isDarkMode={true} />;
      case 'laporan': return <Reports isDarkMode={true} />;
      default: return <Kasir isDarkMode={true} />;
    }
  };

  return (
    <Layout 
      activePage={activePage} 
      setActivePage={setActivePage} 
      isOnline={isOnline} 
      onRefresh={handleRefresh}
    >
      {renderPage()}
    </Layout>
  );
}
