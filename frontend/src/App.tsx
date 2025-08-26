import React, { useState } from 'react';

import 'katex/dist/katex.min.css';
import './App.css';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState('prediction');

  return (
    <div className="App">
      <header className="App-header">
        <h1>My React App</h1>
        <nav>
          <button onClick={() => setActivePage('prediction')}>Prediction</button>
          <button onClick={() => setActivePage('about')}>About</button>
        </nav>
      </header>
      <main>
        {activePage === 'prediction' && (
          <div>
            <h2>Prediction Page</h2>
            <p>This is where the prediction functionality will go.</p>
          </div>
        )}
        {activePage === 'about' && (
          <div>
            <h2>About Page</h2>
            <p>This is where information about the app will go.</p>
          </div>
        )}
      </main>
      <footer>
        <p>&copy; 2024 My React App</p>
      </footer>
    </div>
  );
};

export default App;
