// Dummy feedback data matching the database structure
export const dummyFeedbackData = [
  {
    id: '1',
    userId: 'user-123',
    userName: 'Alice Johnson',
    userEmail: 'alice@example.com',
    title: 'Button not working on mobile',
    description: 'The submit button is not clickable on mobile devices',
    feedback: 'When I try to click the submit button on my phone, nothing happens. This has been an issue for the past week.',
    status: 'resolved',
    priority: 'high',
    url: 'https://example.com/checkout',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
    browser: 'Safari',
    os: 'iOS',
    screenResolution: '375x667',
    viewport: '{"width": 375, "height": 667}',
    screenshot: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y4ZjlmYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2YjcyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5TY3JlZW5zaG90IFBsYWNlaG9sZGVyPC90ZXh0Pjwvc3ZnPg==',
    responseMessage: 'Thanks for reporting! We fixed the touch target size. The button should now work properly on mobile devices.',
    assignedTo: 'John Developer',
    resolvedAt: '2025-11-02T14:30:00Z',
    resolvedBy: 'John Developer',
    createdAt: '2025-10-28T10:15:00Z',
    updatedAt: '2025-11-02T14:30:00Z',
    statusHistory: [
      {
        id: 'h1',
        feedbackId: '1',
        fromStatus: null,
        toStatus: 'opened',
        comment: null,
        createdAt: '2025-10-28T10:15:00Z'
      },
      {
        id: 'h2',
        feedbackId: '1',
        fromStatus: 'open',
        toStatus: 'inProgress',
        comment: 'Looking into this mobile issue now',
        createdAt: '2025-10-29T09:00:00Z'
      },
      {
        id: 'h3',
        feedbackId: '1',
        fromStatus: 'in_progress',
        toStatus: 'resolved',
        comment: 'Fixed the button touch target size and tested on multiple devices',
        createdAt: '2025-11-02T14:30:00Z'
      }
    ]
  },
  {
    id: '2',
    userId: 'user-456',
    userName: 'Bob Smith',
    userEmail: 'bob@example.com',
    title: 'Add dark mode support',
    feedback: 'It would be great to have a dark mode option for the application. My eyes hurt when using it at night.',
    status: 'inProgress',
    priority: 'medium',
    url: 'https://example.com/settings',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    browser: 'Chrome',
    os: 'Windows',
    screenResolution: '1920x1080',
    viewport: '{"width": 1920, "height": 1080}',
    screenshot: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFmMjkzNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiNmOWZhZmIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5EYXJrIE1vZGUgU2NyZWVuc2hvdDwvdGV4dD48L3N2Zz4=',
    responseMessage: 'Great suggestion! We\'re currently implementing dark mode. It should be ready next week.',
    assignedTo: 'Sarah Designer',
    estimatedResolutionDate: '2025-11-10T00:00:00Z',
    createdAt: '2025-10-30T16:20:00Z',
    updatedAt: '2025-11-01T11:00:00Z',
    statusHistory: [
      {
        id: 'h4',
        feedbackId: '2',
        fromStatus: null,
        toStatus: 'opened',
        comment: null,
        createdAt: '2025-10-30T16:20:00Z'
      },
      {
        id: 'h5',
        feedbackId: '2',
        fromStatus: 'open',
        toStatus: 'inProgress',
        comment: 'Started working on dark mode implementation. Testing different color schemes.',
        createdAt: '2025-11-01T11:00:00Z'
      }
    ]
  },
  {
    id: '3',
    userId: 'user-789',
    userName: 'Charlie Davis',
    userEmail: 'charlie@example.com',
    title: 'Search results showing duplicates',
    feedback: 'When I search for products, the same item appears multiple times in the results.',
    status: 'opened',
    priority: 'high',
    url: 'https://example.com/search?q=laptop',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    browser: 'Chrome',
    os: 'macOS',
    screenResolution: '2560x1440',
    viewport: '{"width": 1440, "height": 900}',
    elementInfo: '{"tagName": "div", "id": "search-results", "className": "results-container", "selector": "#search-results"}',
    screenshot: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2ZlZjJlMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTFiMWIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5EdXBsaWNhdGUgUmVzdWx0czwvdGV4dD48L3N2Zz4=',
    createdAt: '2025-11-02T08:45:00Z',
    updatedAt: '2025-11-02T08:45:00Z',
    statusHistory: [
      {
        id: 'h6',
        feedbackId: '3',
        fromStatus: null,
        toStatus: 'opened',
        comment: null,
        createdAt: '2025-11-02T08:45:00Z'
      }
    ]
  },
  {
    id: '4',
    userId: 'user-123',
    userName: 'Alice Johnson',
    userEmail: 'alice@example.com',
    title: 'Loading spinner never stops',
    feedback: 'After clicking the "Load More" button, the loading spinner keeps spinning forever.',
    status: 'blocked',
    priority: 'urgent',
    url: 'https://example.com/products',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
    browser: 'Safari',
    os: 'iOS',
    createdAt: '2025-11-01T13:20:00Z',
    updatedAt: '2025-11-02T10:00:00Z',
    responseMessage: 'We\'ve identified the issue is related to the API timeout. Waiting for backend team to increase timeout limits.',
    assignedTo: 'Mike Backend',
    statusHistory: [
      {
        id: 'h7',
        feedbackId: '4',
        fromStatus: null,
        toStatus: 'opened',
        comment: null,
        createdAt: '2025-11-01T13:20:00Z'
      },
      {
        id: 'h8',
        feedbackId: '4',
        fromStatus: 'open',
        toStatus: 'inProgress',
        comment: 'Investigating the loading spinner issue',
        createdAt: '2025-11-01T15:00:00Z'
      },
      {
        id: 'h9',
        feedbackId: '4',
        fromStatus: 'in_progress',
        toStatus: 'blocked',
        comment: 'Blocked by API timeout configuration. Need backend team approval.',
        createdAt: '2025-11-02T10:00:00Z'
      }
    ]
  },
  {
    id: '5',
    userId: 'user-456',
    userName: 'Bob Smith',
    userEmail: 'bob@example.com',
    title: 'Typo in confirmation message',
    feedback: 'There\'s a typo in the order confirmation message: "You order has been confirmed" should be "Your order has been confirmed"',
    status: 'resolved',
    priority: 'low',
    url: 'https://example.com/order-confirmation',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    browser: 'Chrome',
    os: 'Windows',
    responseMessage: 'Good catch! Fixed the typo. Thanks for helping us improve!',
    resolvedAt: '2025-11-02T09:15:00Z',
    resolvedBy: 'Emily Editor',
    createdAt: '2025-11-02T08:00:00Z',
    updatedAt: '2025-11-02T09:15:00Z',
    statusHistory: [
      {
        id: 'h10',
        feedbackId: '5',
        fromStatus: null,
        toStatus: 'opened',
        comment: null,
        createdAt: '2025-11-02T08:00:00Z'
      },
      {
        id: 'h11',
        feedbackId: '5',
        fromStatus: 'open',
        toStatus: 'resolved',
        comment: 'Quick fix - corrected the typo in the message template',
        createdAt: '2025-11-02T09:15:00Z'
      }
    ]
  },
  {
    id: '6',
    userId: 'user-789',
    userName: 'Charlie Davis',
    userEmail: 'charlie@example.com',
    title: 'Add export to CSV feature',
    feedback: 'Would be nice to export the data table to CSV format for analysis in Excel.',
    status: 'opened',
    priority: 'low',
    url: 'https://example.com/reports',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    browser: 'Safari',
    os: 'macOS',
    createdAt: '2025-11-02T15:30:00Z',
    updatedAt: '2025-11-02T15:30:00Z',
    statusHistory: [
      {
        id: 'h12',
        feedbackId: '6',
        fromStatus: null,
        toStatus: 'opened',
        comment: null,
        createdAt: '2025-11-02T15:30:00Z'
      }
    ]
  },
  {
    id: '7',
    userId: 'user-321',
    userName: 'Diana Prince',
    userEmail: 'diana@example.com',
    title: 'Login form accessibility issue',
    feedback: 'The login form is not keyboard accessible. Cannot tab to the submit button.',
    status: 'inProgress',
    priority: 'high',
    url: 'https://example.com/login',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/120.0',
    browser: 'Firefox',
    os: 'Windows',
    responseMessage: 'Thanks for reporting this accessibility issue. We\'re working on fixing the tab order and adding proper ARIA labels.',
    assignedTo: 'Alex Accessibility',
    estimatedResolutionDate: '2025-11-05T00:00:00Z',
    createdAt: '2025-11-01T11:00:00Z',
    updatedAt: '2025-11-02T13:00:00Z',
    statusHistory: [
      {
        id: 'h13',
        feedbackId: '7',
        fromStatus: null,
        toStatus: 'opened',
        comment: null,
        createdAt: '2025-11-01T11:00:00Z'
      },
      {
        id: 'h14',
        feedbackId: '7',
        fromStatus: 'open',
        toStatus: 'inProgress',
        comment: 'Auditing all form elements for accessibility compliance',
        createdAt: '2025-11-02T13:00:00Z'
      }
    ]
  }
];

// Dummy updates data for the notification component
export const dummyUpdatesData = [
  {
    id: '1',
    userId: 'user-123',
    title: 'Button not working on mobile',
    feedback: 'When I try to click the submit button on my phone, nothing happens.',
    status: 'resolved',
    responseMessage: 'Thanks for reporting! We fixed the touch target size. The button should now work properly on mobile devices.',
    resolvedBy: 'John Developer',
    updatedAt: '2025-11-02T14:30:00Z',
    resolvedAt: '2025-11-02T14:30:00Z',
    createdAt: '2025-10-28T10:15:00Z'
  },
  {
    id: '5',
    userId: 'user-456',
    title: 'Typo in confirmation message',
    feedback: 'There\'s a typo in the order confirmation message',
    status: 'resolved',
    responseMessage: 'Good catch! Fixed the typo. Thanks for helping us improve!',
    resolvedBy: 'Emily Editor',
    updatedAt: '2025-11-02T09:15:00Z',
    resolvedAt: '2025-11-02T09:15:00Z',
    createdAt: '2025-11-02T08:00:00Z'
  },
  {
    id: '2',
    userId: 'user-456',
    title: 'Add dark mode support',
    feedback: 'It would be great to have a dark mode option for the application.',
    status: 'inProgress',
    responseMessage: 'Great suggestion! We\'re currently implementing dark mode. It should be ready next week.',
    assignedTo: 'Sarah Designer',
    estimatedResolutionDate: '2025-11-10T00:00:00Z',
    updatedAt: '2025-11-01T11:00:00Z',
    createdAt: '2025-10-30T16:20:00Z',
    statusHistory: [
      {
        id: 'h5',
        toStatus: 'inProgress',
        comment: 'Started working on dark mode implementation. Testing different color schemes.',
        createdAt: '2025-11-01T11:00:00Z'
      }
    ]
  },
  {
    id: '7',
    userId: 'user-321',
    title: 'Login form accessibility issue',
    feedback: 'The login form is not keyboard accessible.',
    status: 'inProgress',
    responseMessage: 'Thanks for reporting this accessibility issue. We\'re working on fixing the tab order and adding proper ARIA labels.',
    assignedTo: 'Alex Accessibility',
    estimatedResolutionDate: '2025-11-05T00:00:00Z',
    updatedAt: '2025-11-02T13:00:00Z',
    createdAt: '2025-11-01T11:00:00Z'
  },
  {
    id: '4',
    userId: 'user-123',
    title: 'Loading spinner never stops',
    feedback: 'After clicking the "Load More" button, the loading spinner keeps spinning forever.',
    status: 'blocked',
    responseMessage: 'We\'ve identified the issue is related to the API timeout. Waiting for backend team to increase timeout limits.',
    assignedTo: 'Mike Backend',
    updatedAt: '2025-11-02T10:00:00Z',
    createdAt: '2025-11-01T13:20:00Z',
    statusHistory: [
      {
        id: 'h9',
        toStatus: 'blocked',
        comment: 'Blocked by API timeout configuration. Need backend team approval.',
        createdAt: '2025-11-02T10:00:00Z'
      }
    ]
  }
];
