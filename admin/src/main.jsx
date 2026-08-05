import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer } from 'react-toastify'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <>
      <App />

      {/* ✅ Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={2000}
        theme="dark"
      />
    </>
  </React.StrictMode>
)