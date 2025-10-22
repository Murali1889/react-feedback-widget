import React, { useState, useEffect } from 'react';
import { FeedbackProvider, useFeedback } from '../../dist/index.esm.js';
import '../../dist/index.css';

function DarkModeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="fixed top-4 right-4 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg hover:scale-105 transition-transform z-[1000]"
    >
      {darkMode ? (
        <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}

function FeedbackButton() {
  const { isActive, setIsActive } = useFeedback();

  return (
    <button
      onClick={() => setIsActive(!isActive)}
      className={`fixed bottom-6 right-6 px-6 py-4 rounded-lg font-bold shadow-2xl z-[1000] transition-all hover:-translate-y-1 ${
        isActive
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : 'bg-blue-500 hover:bg-blue-600 text-white'
      }`}
    >
      {isActive ? '✕ Cancel Feedback' : '💬 Report Issue'}
    </button>
  );
}

function App() {
  const handleFeedbackSubmit = async (feedbackData) => {
    console.log('=== Feedback Submitted ===');
    console.log('Feedback:', feedbackData.feedback);
    console.log('Element Info:', feedbackData.elementInfo);
    console.log('Screenshot:', feedbackData.screenshot ? 'Captured' : 'Not captured');
    console.log('========================');

    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('✅ Feedback submitted successfully!');
  };

  return (
    <FeedbackProvider onSubmit={handleFeedbackSubmit}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <DarkModeToggle />

        <header className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-16 text-center">
          <div className="max-w-6xl mx-auto px-6">
            <h1 className="text-5xl font-bold mb-4">🎯 React Visual Feedback</h1>
            <p className="text-xl opacity-90">Test the feedback widget - Click elements to capture feedback</p>
          </div>
        </header>

        <main className="py-12">
          <div className="max-w-6xl mx-auto px-6 space-y-8">

            {/* How to Test */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">How to Test</h2>
              <ol className="space-y-4">
                <li className="flex items-start text-gray-600 dark:text-gray-300">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-4">1</span>
                  <span>Click "Report Issue" or press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono">Ctrl+Q</kbd></span>
                </li>
                <li className="flex items-start text-gray-600 dark:text-gray-300">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-4">2</span>
                  <span>Hover over any element to highlight it</span>
                </li>
                <li className="flex items-start text-gray-600 dark:text-gray-300">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-4">3</span>
                  <span>Click the element to capture screenshot</span>
                </li>
                <li className="flex items-start text-gray-600 dark:text-gray-300">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-4">4</span>
                  <span>Fill the feedback form and submit</span>
                </li>
                <li className="flex items-start text-gray-600 dark:text-gray-300">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mr-4">5</span>
                  <span>Check console for feedback data</span>
                </li>
              </ol>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">⌨️ Keyboard Shortcuts</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <kbd className="px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded font-mono text-sm">Ctrl+Q</kbd>
                  <span className="text-gray-600 dark:text-gray-300">Activate</span>
                </div>
                <div className="flex items-center gap-3">
                  <kbd className="px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded font-mono text-sm">Esc</kbd>
                  <span className="text-gray-600 dark:text-gray-300">Cancel</span>
                </div>
                <div className="flex items-center gap-3">
                  <kbd className="px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded font-mono text-sm">Ctrl+Enter</kbd>
                  <span className="text-gray-600 dark:text-gray-300">Submit</span>
                </div>
              </div>
            </div>

            {/* Sample Content */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Sample Content</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">This is a paragraph. Try clicking on it!</p>
              <button className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors">
                Sample Button
              </button>
              <div className="mt-6 p-6 bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 rounded-lg">
                <h3 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Sample Box</h3>
                <p className="text-yellow-800 dark:text-yellow-200">Click on this box or any element inside</p>
              </div>
            </div>

            {/* Interactive Buttons */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Interactive Elements</h2>
              <div className="flex flex-wrap gap-4">
                <button className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5">
                  Primary
                </button>
                <button className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5">
                  Secondary
                </button>
                <button className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5">
                  Success
                </button>
                <button className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all hover:-translate-y-0.5">
                  Danger
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Form Example</h2>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <div>
                  <label className="block text-gray-900 dark:text-white font-semibold mb-2">Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-900 dark:text-white font-semibold mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Submit Form
                </button>
              </form>
            </div>

            {/* Visual Example */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Visual Example</h2>
              <div className="w-64 h-64 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-xl">
                Gradient Box
              </div>
            </div>

          </div>
        </main>

        <FeedbackButton />
      </div>
    </FeedbackProvider>
  );
}

export default App;
