import { ThemeProvider } from './components/theme-provider';
import { MarkdownReaderEnhanced } from './components/markdown-reader-enhanced';

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <MarkdownReaderEnhanced />
    </ThemeProvider>
  );
}

export default App;
