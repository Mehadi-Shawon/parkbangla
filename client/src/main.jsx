import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Always light mode — remove any previously stored dark preference
document.documentElement.classList.remove('dark');
localStorage.removeItem('theme');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
