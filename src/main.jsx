import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { brand } from './brand/brand.config.js';

const Landing = lazy(() => import('./landing/Landing.jsx'));

const { routes, languages } = brand.i18n;

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        {Object.entries(routes).map(([lang, path]) => <Route key={lang} path={path} element={<Landing key={lang} lang={lang} />} />)}
        <Route path="*" element={<Landing lang={languages[0]} />} />
      </Routes>
    </Suspense>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter><App /></BrowserRouter>
  </StrictMode>,
);
