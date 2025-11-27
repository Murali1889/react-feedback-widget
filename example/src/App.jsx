import React, { useState, useEffect } from 'react';
import { FeedbackProvider, useFeedback, FeedbackDashboard, FeedbackTrigger } from '../../dist/index.esm.js';
import { dummyFeedbackData } from './dummyData';

// Import our new components
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from './components/Card';
import { Button, IconButton } from './components/Button';
import { Form, FormField, Input, TextArea, Select, Checkbox } from './components/Form';

function DarkModeToggle({ darkMode, setDarkMode }) {
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <IconButton
      icon={darkMode ? '☀️' : '🌙'}
      variant="secondary"
      onClick={() => setDarkMode(!darkMode)}
      className="fixed top-24 right-4 z-[1000]"
    />
  );
}

DarkModeToggle.displayName = 'DarkModeToggle';

function FeedbackButtons({ onOpenDevDashboard, onOpenUserDashboard }) {
  const { isActive, setIsActive, setIsDashboardOpen, startRecording } = useFeedback();

  return (
    <div className="fixed bottom-6 left-6 flex flex-col gap-3 z-[1000]">
      <Button variant="primary" icon="👨‍💻" onClick={onOpenDevDashboard}>
        Dev Dashboard
      </Button>
      <Button variant="success" icon="👤" onClick={onOpenUserDashboard}>
        User Dashboard
      </Button>
      <Button variant="secondary" icon="📊" onClick={() => setIsDashboardOpen(true)}>
        Live Dashboard
      </Button>
      <Button variant="danger" icon="📹" onClick={startRecording}>
        Record Video
      </Button>
      <Button
        variant={isActive ? 'danger' : 'primary'}
        icon={isActive ? '✕' : '💬'}
        onClick={() => setIsActive(!isActive)}
      >
        {isActive ? 'Cancel' : 'Report Issue'}
      </Button>
    </div>
  );
}

FeedbackButtons.displayName = 'FeedbackButtons';

function FeedbackTriggerWrapper({ darkMode, setFeedbackActive }) {
  const { startRecording } = useFeedback();

  return (
    <FeedbackTrigger
      mode={darkMode ? 'dark' : 'light'}
      onFeedback={() => setFeedbackActive(true)}
      onRecord={startRecording}
      showRecordButton={true}
    />
  );
}

FeedbackTriggerWrapper.displayName = 'FeedbackTriggerWrapper';

function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: '',
    subscribe: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle subtitle="We'd love to hear from you">Contact Us</CardTitle>
      </CardHeader>
      <CardBody>
        <Form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Name" required>
              <Input
                placeholder="John Doe"
                icon="👤"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </FormField>
            <FormField label="Email" required>
              <Input
                type="email"
                placeholder="john@example.com"
                icon="✉️"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Subject">
            <Select
              placeholder="Select a subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              options={[
                { value: 'general', label: 'General Inquiry' },
                { value: 'support', label: 'Technical Support' },
                { value: 'feedback', label: 'Product Feedback' },
                { value: 'partnership', label: 'Partnership' },
              ]}
            />
          </FormField>

          <FormField label="Priority">
            <Select
              placeholder="Select priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              options={[
                { value: 'low', label: 'Low - No rush' },
                { value: 'medium', label: 'Medium - Within a week' },
                { value: 'high', label: 'High - Urgent' },
              ]}
            />
          </FormField>

          <FormField label="Message" required hint="Please be as detailed as possible">
            <TextArea
              placeholder="Tell us what's on your mind..."
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            />
          </FormField>

          <Checkbox
            label="Subscribe to our newsletter for updates"
            checked={formData.subscribe}
            onChange={(e) => setFormData({ ...formData, subscribe: e.target.checked })}
          />

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" icon="📤">
              Send Message
            </Button>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  );
}

ContactForm.displayName = 'ContactForm';

function FeatureShowcase() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <FeatureCard
        icon="📸"
        title="Screenshot Capture"
        description="Automatically capture screenshots of selected elements with one click"
        color="from-blue-500 to-cyan-500"
      />
      <FeatureCard
        icon="⚛️"
        title="React Detection"
        description="Identify React components directly from the DOM for precise debugging"
        color="from-purple-500 to-pink-500"
      />
      <FeatureCard
        icon="🎨"
        title="Theming"
        description="Full dark mode support with customizable themes"
        color="from-amber-500 to-orange-500"
      />
    </div>
  );
}

FeatureShowcase.displayName = 'FeatureShowcase';

function FeatureCard({ icon, title, description, color }) {
  return (
    <Card variant="elevated" className="group hover:shadow-2xl">
      <CardBody className="text-center py-8">
        <FeatureIcon icon={icon} color={color} />
        <FeatureTitle>{title}</FeatureTitle>
        <FeatureDescription>{description}</FeatureDescription>
      </CardBody>
    </Card>
  );
}

FeatureCard.displayName = 'FeatureCard';

function FeatureIcon({ icon, color }) {
  return (
    <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-xl`}>
      {icon}
    </div>
  );
}

FeatureIcon.displayName = 'FeatureIcon';

function FeatureTitle({ children }) {
  return (
    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{children}</h3>
  );
}

FeatureTitle.displayName = 'FeatureTitle';

function FeatureDescription({ children }) {
  return (
    <p className="text-gray-500 dark:text-gray-400 text-sm">{children}</p>
  );
}

FeatureDescription.displayName = 'FeatureDescription';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [feedbackActive, setFeedbackActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State for custom dashboards with dummy data
  const [showDevDashboard, setShowDevDashboard] = useState(false);
  const [showUserDashboard, setShowUserDashboard] = useState(false);
  const [feedbackData, setFeedbackData] = useState(dummyFeedbackData);

  const currentUser = {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'Developer'
  };

  const handleFeedbackSubmit = async (data) => {
    console.log('=== Feedback Submitted ===');
    console.log('Feedback:', data.feedback);
    console.log('Element Info:', data.elementInfo);
    console.log('React Component:', data.elementInfo?.reactComponent);
    console.log('Component Stack:', data.elementInfo?.reactComponentStack);
    console.log('Source File:', data.elementInfo?.sourceFile);
    console.log('Screenshot:', data.screenshot ? `Captured (${data.screenshot.length} bytes)` : 'Not captured');
    console.log('========================');
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const handleStatusChange = ({ id, status, comment }) => {
    console.log('Status Changed:', { id, status, comment });
    setFeedbackData(prev => prev.map(item =>
      item.id === id ? { ...item, status, ...(comment && { responseMessage: comment }) } : item
    ));
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  return (
    <FeedbackProvider
      onSubmit={handleFeedbackSubmit}
      onStatusChange={handleStatusChange}
      dashboard={true}
      isDeveloper={true}
      isUser={true}
      userName={currentUser.name}
      userEmail={currentUser.email}
      mode={darkMode ? 'dark' : 'light'}
      isActive={feedbackActive}
      onActiveChange={setFeedbackActive}
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        {/* Header */}
        <Header
          title="FeedbackHub"
          user={currentUser}
          onLogout={handleLogout}
        />

        <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

          {/* Dashboard Section */}
          <section>
            <Dashboard />
          </section>

          {/* Feature Showcase */}
          <section>
            <SectionHeader
              title="Key Features"
              subtitle="Everything you need for effective visual feedback"
            />
            <FeatureShowcase />
          </section>

          {/* Button Showcase */}
          <section>
            <SectionHeader
              title="Button Components"
              subtitle="Click any button to test component detection"
            />
            <ButtonShowcase />
          </section>

          {/* Contact Form */}
          <section>
            <SectionHeader
              title="Contact Form"
              subtitle="Test form component detection"
            />
            <ContactForm />
          </section>

          {/* Instructions */}
          <section>
            <InstructionsCard />
          </section>
        </main>

        {/* Floating Feedback Button */}
        <FeedbackTriggerWrapper
          darkMode={darkMode}
          setFeedbackActive={setFeedbackActive}
        />

        {/* Dashboard Buttons */}
        <FeedbackButtons
          onOpenDevDashboard={() => setShowDevDashboard(true)}
          onOpenUserDashboard={() => setShowUserDashboard(true)}
        />
      </div>

      {/* Developer Dashboard */}
      <FeedbackDashboard
        isOpen={showDevDashboard}
        onClose={() => setShowDevDashboard(false)}
        data={feedbackData}
        isDeveloper={true}
        onStatusChange={handleStatusChange}
        mode={darkMode ? 'dark' : 'light'}
        title="Bug Reports"
        showAllStatuses={true}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />

      {/* User Dashboard */}
      <FeedbackDashboard
        isOpen={showUserDashboard}
        onClose={() => setShowUserDashboard(false)}
        data={feedbackData}
        isDeveloper={false}
        isUser={true}
        userEmail={currentUser.email}
        mode={darkMode ? 'dark' : 'light'}
        title="My Feedback"
        showAllStatuses={false}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />
    </FeedbackProvider>
  );
}

App.displayName = 'App';

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
      {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

SectionHeader.displayName = 'SectionHeader';

function ButtonShowcase() {
  return (
    <Card variant="elevated">
      <CardBody>
        <div className="space-y-6">
          <ButtonRow label="Variants">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="success">Success</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
          </ButtonRow>

          <ButtonRow label="Sizes">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra Large</Button>
          </ButtonRow>

          <ButtonRow label="With Icons">
            <Button icon="🚀">Launch</Button>
            <Button icon="💾" iconPosition="right">Save</Button>
            <Button variant="success" icon="✓">Confirm</Button>
            <Button variant="danger" icon="🗑️">Delete</Button>
          </ButtonRow>

          <ButtonRow label="States">
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </ButtonRow>

          <ButtonRow label="Test API Calls (for recording)">
            <Button
              variant="primary"
              icon="🌐"
              onClick={async () => {
                console.log('Making API call...');
                try {
                  const res = await fetch('https://jsonplaceholder.typicode.com/posts/1');
                  const data = await res.json();
                  console.log('API Response:', data.title);
                } catch (err) {
                  console.error('API Error:', err);
                }
              }}
            >
              Fetch Post
            </Button>
            <Button
              variant="secondary"
              icon="👥"
              onClick={async () => {
                console.log('Fetching users...');
                try {
                  const res = await fetch('https://jsonplaceholder.typicode.com/users');
                  const data = await res.json();
                  console.log('Got', data.length, 'users');
                } catch (err) {
                  console.error('API Error:', err);
                }
              }}
            >
              Fetch Users
            </Button>
            <Button
              variant="success"
              icon="💾"
              onClick={() => {
                console.log('Saving to localStorage...');
                localStorage.setItem('test-key', JSON.stringify({ time: Date.now(), value: 'test' }));
                console.log('Saved!');
              }}
            >
              Save to Storage
            </Button>
            <Button
              variant="warning"
              icon="⚠️"
              onClick={() => {
                console.log('This is a log');
                console.warn('This is a warning');
                console.error('This is an error');
              }}
            >
              Test Console
            </Button>
          </ButtonRow>
        </div>
      </CardBody>
    </Card>
  );
}

ButtonShowcase.displayName = 'ButtonShowcase';

function ButtonRow({ label, children }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{label}</p>
      <div className="flex flex-wrap gap-3">
        {children}
      </div>
    </div>
  );
}

ButtonRow.displayName = 'ButtonRow';

function InstructionsCard() {
  return (
    <Card variant="gradient">
      <CardBody className="py-8">
        <h3 className="text-2xl font-bold mb-4">How to Test</h3>
        <InstructionsList />
        <KeyboardShortcuts />
      </CardBody>
    </Card>
  );
}

InstructionsCard.displayName = 'InstructionsCard';

function InstructionsList() {
  const steps = [
    'Press Alt+Q or click the floating button to activate feedback mode',
    'Hover over elements - you\'ll see the React component name in the tooltip',
    'Click to capture a screenshot of the element',
    'The modal shows: Screenshot, Component name, Element details',
    'Fill in feedback and submit',
  ];

  return (
    <ol className="space-y-2 mb-6">
      {steps.map((step, i) => (
        <InstructionStep key={i} number={i + 1} text={step} />
      ))}
    </ol>
  );
}

InstructionsList.displayName = 'InstructionsList';

function InstructionStep({ number, text }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
        {number}
      </span>
      <span className="opacity-90">{text}</span>
    </li>
  );
}

InstructionStep.displayName = 'InstructionStep';

function KeyboardShortcuts() {
  const shortcuts = [
    { keys: 'Alt + Q', action: 'Activate Feedback' },
    { keys: 'Alt + A', action: 'Manual Feedback Form' },
    { keys: 'Alt + W', action: 'Start Recording' },
    { keys: 'Alt + Shift + Q', action: 'Open Dashboard' },
    { keys: 'Esc', action: 'Cancel/Close' },
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {shortcuts.map((shortcut, i) => (
        <ShortcutBadge key={i} {...shortcut} />
      ))}
    </div>
  );
}

KeyboardShortcuts.displayName = 'KeyboardShortcuts';

function ShortcutBadge({ keys, action }) {
  return (
    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
      <kbd className="px-2 py-1 bg-white/20 rounded text-sm font-mono">{keys}</kbd>
      <span className="text-sm opacity-80">{action}</span>
    </div>
  );
}

ShortcutBadge.displayName = 'ShortcutBadge';

export default App;
