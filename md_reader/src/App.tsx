import React from 'react';
import { ThemeProvider } from './components/theme-provider';
import { MarkdownReader } from './components/markdown-reader';

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <MarkdownReader />
    </ThemeProvider>
  );
}

export default App;
