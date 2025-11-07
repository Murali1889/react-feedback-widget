import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, CheckCircle, Clock, AlertCircle, Play, Package, Ban, XCircle, ChevronDown, Filter } from 'lucide-react';

const FEEDBACK_STORAGE_KEY = 'react-feedback-data';

// Professional Status options
const STATUS_OPTIONS = {
  reported: {
    label: 'Reported',
    icon: AlertCircle,
    color: '#ef4444',
    bgColor: '#fee2e2',
    textColor: '#991b1b'
  },
  opened: {
    label: 'In Review',
    icon: Clock,
    color: '#f59e0b',
    bgColor: '#fef3c7',
    textColor: '#92400e'
  },
  inProgress: {
    label: 'In Progress',
    icon: Play,
    color: '#3b82f6',
    bgColor: '#dbeafe',
    textColor: '#1e40af'
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle,
    color: '#10b981',
    bgColor: '#d1fae5',
    textColor: '#065f46'
  },
  released: {
    label: 'Released',
    icon: Package,
    color: '#8b5cf6',
    bgColor: '#ede9fe',
    textColor: '#5b21b6'
  },
  blocked: {
    label: 'Blocked',
    icon: Ban,
    color: '#dc2626',
    bgColor: '#fee2e2',
    textColor: '#991b1b'
  },
  wontFix: {
    label: "Won't Fix",
    icon: XCircle,
    color: '#6b7280',
    bgColor: '#f3f4f6',
    textColor: '#374151'
  }
};

// Status Badge Component (read-only display)
const StatusBadge = ({ status }) => {
  const statusData = STATUS_OPTIONS[status || 'reported'];
  const StatusIcon = statusData.icon;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '16px',
        backgroundColor: statusData.bgColor,
        fontSize: '12px',
        fontWeight: '600',
        color: statusData.textColor
      }}
    >
      <StatusIcon size={12} />
      <span>{statusData.label}</span>
    </div>
  );
};

// Custom Status Dropdown Component (for developers only)
const StatusDropdown = ({ currentStatus, onStatusChange, itemId }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const currentStatusData = STATUS_OPTIONS[currentStatus || 'reported'];
  const StatusIcon = currentStatusData.icon;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsDropdownOpen(!isDropdownOpen);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '8px',
          backgroundColor: 'white',
          border: `2px solid ${currentStatusData.color}`,
          fontSize: '13px',
          fontWeight: '600',
          color: currentStatusData.textColor,
          cursor: 'pointer',
          transition: 'all 0.2s',
          outline: 'none'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = currentStatusData.bgColor;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'white';
        }}
      >
        <StatusIcon size={14} />
        <span>{currentStatusData.label}</span>
        <ChevronDown
          size={14}
          style={{
            transition: 'transform 0.2s',
            transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </button>

      {isDropdownOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            padding: '8px',
            zIndex: 10000,
            minWidth: '180px',
            border: '1px solid #e5e7eb',
            animation: 'dropdownSlideIn 0.2s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {Object.entries(STATUS_OPTIONS).map(([statusKey, statusData]) => {
            const Icon = statusData.icon;
            const isSelected = currentStatus === statusKey;
            return (
              <button
                key={statusKey}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(itemId, statusKey);
                  setIsDropdownOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: isSelected ? statusData.bgColor : 'transparent',
                  color: statusData.textColor,
                  fontSize: '13px',
                  fontWeight: isSelected ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = statusData.bgColor;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = isSelected ? statusData.bgColor : 'transparent';
                }}
              >
                <Icon size={16} />
                <span>{statusData.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const FeedbackDashboard = ({ isOpen, onClose, data, isDeveloper = false, isUser = true, onStatusChange }) => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const useLocalStorage = data === undefined;

  // Status change modal state
  const [statusChangeModal, setStatusChangeModal] = useState({
    isOpen: false,
    feedbackId: null,
    newStatus: null,
    oldStatus: null,
    comment: ''
  });

  // Load feedback from localStorage or use provided data
  useEffect(() => {
    if (isOpen) {
      if (useLocalStorage) {
        loadFeedback();
      } else {
        setFeedbackList(data || []);
      }
    }
  }, [isOpen, data, useLocalStorage]);

  const loadFeedback = () => {
    try {
      const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFeedbackList(parsed);
      }
    } catch (error) {
      console.error('Failed to load feedback:', error);
    }
  };

  const saveFeedback = (updatedList) => {
    try {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updatedList));
      setFeedbackList(updatedList);
    } catch (error) {
      console.error('Failed to save feedback:', error);
    }
  };

  const openStatusChangeModal = (id, newStatus, oldStatus) => {
    setStatusChangeModal({
      isOpen: true,
      feedbackId: id,
      newStatus,
      oldStatus,
      comment: ''
    });
  };

  const closeStatusChangeModal = () => {
    setStatusChangeModal({
      isOpen: false,
      feedbackId: null,
      newStatus: null,
      oldStatus: null,
      comment: ''
    });
  };

  const confirmStatusChange = () => {
    const { feedbackId, newStatus, comment } = statusChangeModal;
    const updated = feedbackList.map(item =>
      item.id === feedbackId ? { ...item, status: newStatus } : item
    );
    if (useLocalStorage) {
      saveFeedback(updated);
    } else {
      setFeedbackList(updated);
    }

    // Call the callback if provided so parent can update database
    if (onStatusChange && typeof onStatusChange === 'function') {
      onStatusChange({ id: feedbackId, status: newStatus, comment });
    }

    closeStatusChangeModal();
  };

  const deleteFeedback = (id) => {
    const updated = feedbackList.filter(item => item.id !== id);
    if (useLocalStorage) {
      saveFeedback(updated);
    } else {
      setFeedbackList(updated);
    }
    if (selectedFeedback?.id === id) {
      setSelectedFeedback(null);
    }
  };

  const clearAllFeedback = () => {
    if (window.confirm('Are you sure you want to delete all feedback?')) {
      if (useLocalStorage) {
        localStorage.removeItem(FEEDBACK_STORAGE_KEY);
      }
      setFeedbackList([]);
      setSelectedFeedback(null);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${day} ${month} ${year} at ${hours}:${minutes} ${ampm}`;
  };

  // Filter feedback based on selected status
  const filteredFeedback = filterStatus === 'all'
    ? feedbackList
    : feedbackList.filter(item => (item.status || 'reported') === filterStatus);

  // Get counts for each status
  const statusCounts = feedbackList.reduce((acc, item) => {
    const status = item.status || 'reported';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="feedback-dashboard-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Dashboard Panel */}
      <div
        className="feedback-dashboard"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '800px',
          backgroundColor: 'white',
          zIndex: 9999,
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
          <div
            style={{
              padding: '24px 24px 20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#111827', letterSpacing: '-0.02em' }}>
                {isDeveloper ? 'Feedback Dashboard' : 'My Feedback'}
              </h2>
              <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                {feedbackList.length} total {feedbackList.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {isDeveloper && feedbackList.length > 0 && (
                <button
                  onClick={clearAllFeedback}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#fee2e2',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#dc2626',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                >
                  Clear All
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  padding: '10px',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              >
                <X size={20} color="#374151" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{
            padding: '0 24px 16px 24px',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setFilterStatus('all')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: filterStatus === 'all' ? '#111827' : '#f3f4f6',
                color: filterStatus === 'all' ? 'white' : '#6b7280',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              All {feedbackList.length > 0 && `(${feedbackList.length})`}
            </button>
            {Object.entries(STATUS_OPTIONS).map(([statusKey, statusData]) => {
              const count = statusCounts[statusKey] || 0;
              if (count === 0 && !isDeveloper) return null; // Hide empty statuses for users
              const Icon = statusData.icon;
              return (
                <button
                  key={statusKey}
                  onClick={() => setFilterStatus(statusKey)}
                  style={{
                    padding: '8px 14px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: filterStatus === statusKey ? statusData.bgColor : '#f3f4f6',
                    color: filterStatus === statusKey ? statusData.textColor : '#6b7280',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Icon size={14} />
                  <span>{statusData.label}</span>
                  {count > 0 && <span>({count})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', backgroundColor: '#f9fafb' }}>
          {feedbackList.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#9ca3af'
              }}
            >
              <AlertCircle size={64} strokeWidth={1} />
              <p style={{ marginTop: '16px', fontSize: '18px', fontWeight: '600' }}>No feedback yet</p>
              <p style={{ marginTop: '8px', fontSize: '14px' }}>Press Ctrl+Q to start giving feedback</p>
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#9ca3af'
              }}
            >
              <Filter size={64} strokeWidth={1} />
              <p style={{ marginTop: '16px', fontSize: '18px', fontWeight: '600' }}>No items found</p>
              <p style={{ marginTop: '8px', fontSize: '14px' }}>Try adjusting your filter</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredFeedback.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'white',
                    border: '2px solid',
                    borderColor: selectedFeedback?.id === item.id ? '#3b82f6' : '#e5e7eb',
                    borderRadius: '16px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: selectedFeedback?.id === item.id ? '0 8px 24px rgba(59, 130, 246, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.05)'
                  }}
                  onClick={() => setSelectedFeedback(selectedFeedback?.id === item.id ? null : item)}
                  onMouseOver={(e) => {
                    if (selectedFeedback?.id !== item.id) {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedFeedback?.id !== item.id) {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                    }
                  }}
                >
                  {/* Feedback Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '700', fontSize: '16px', color: '#111827' }}>
                          {item.userName || 'Anonymous User'}
                        </span>
                        <StatusBadge status={item.status || 'reported'} />
                      </div>
                      {item.userEmail && (
                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                          {item.userEmail}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {formatDate(item.timestamp)}
                      </div>
                    </div>

                    {/* Actions for Developers */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isDeveloper && (
                        <>
                          <StatusDropdown
                            currentStatus={item.status || 'reported'}
                            onStatusChange={(id, newStatus) => openStatusChangeModal(id, newStatus, item.status || 'reported')}
                            itemId={item.id}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to delete this feedback?')) {
                                deleteFeedback(item.id);
                              }
                            }}
                            style={{
                              padding: '8px',
                              backgroundColor: 'transparent',
                              border: '1px solid #fee2e2',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              borderRadius: '8px',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = '#fee2e2';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Feedback Content */}
                  <p style={{
                    margin: '0 0 12px 0',
                    color: '#1f2937',
                    fontSize: '15px',
                    lineHeight: '1.6',
                    display: selectedFeedback?.id === item.id ? 'block' : '-webkit-box',
                    WebkitLineClamp: selectedFeedback?.id === item.id ? 'unset' : '2',
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {item.feedback || item.description}
                  </p>

                  {/* Developer Response (always visible when exists) */}
                  {item.responseMessage && (
                    <div style={{
                      marginTop: '12px',
                      padding: '16px',
                      backgroundColor: '#f0f9ff',
                      border: '2px solid #3b82f6',
                      borderLeft: '4px solid #3b82f6',
                      borderRadius: '12px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: 'white',
                          fontWeight: '700'
                        }}>
                          👨‍💻
                        </div>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#1e40af'
                        }}>
                          Developer Response
                        </span>
                        {item.resolvedBy && (
                          <span style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            marginLeft: 'auto'
                          }}>
                            by {item.resolvedBy}
                          </span>
                        )}
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        color: '#1e40af',
                        lineHeight: '1.6',
                        fontStyle: 'italic'
                      }}>
                        "{item.responseMessage}"
                      </p>
                      {item.resolvedAt && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '11px',
                          color: '#6b7280'
                        }}>
                          Responded on {formatDate(item.resolvedAt)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Estimated Resolution Date */}
                  {item.estimatedResolutionDate && !item.resolvedAt && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fde68a',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#92400e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Clock size={14} />
                      <span>
                        Expected resolution: {formatDate(item.estimatedResolutionDate)}
                      </span>
                    </div>
                  )}

                  {/* Screenshot Thumbnail */}
                  {item.screenshot && (
                    <div style={{ marginTop: '16px' }}>
                      <img
                        src={item.screenshot}
                        alt="Feedback screenshot"
                        style={{
                          width: '100%',
                          maxHeight: selectedFeedback?.id === item.id ? '500px' : '200px',
                          objectFit: 'contain',
                          borderRadius: '12px',
                          border: '1px solid #e5e7eb',
                          transition: 'all 0.3s',
                          backgroundColor: '#f9fafb'
                        }}
                      />
                    </div>
                  )}

                  {/* Click to expand indicator */}
                  {selectedFeedback?.id !== item.id && (
                    <div style={{
                      marginTop: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      color: '#9ca3af',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      <span>Click to view details</span>
                      <ChevronDown size={14} />
                    </div>
                  )}

                  {/* Expanded Details */}
                  {selectedFeedback?.id === item.id && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #f3f4f6' }}>
                      {/* Status History Timeline */}
                      {item.statusHistory && item.statusHistory.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '700',
                            color: '#374151',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <Clock size={16} />
                            <span>Status History</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {item.statusHistory.map((history, index) => {
                              const statusData = STATUS_OPTIONS[history.toStatus] || STATUS_OPTIONS.reported;
                              const StatusIcon = statusData.icon;
                              return (
                                <div
                                  key={history.id || index}
                                  style={{
                                    padding: '12px 16px',
                                    backgroundColor: '#f9fafb',
                                    borderLeft: `3px solid ${statusData.color}`,
                                    borderRadius: '8px',
                                    position: 'relative'
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: history.comment ? '8px' : '0'
                                  }}>
                                    <StatusIcon size={14} color={statusData.color} />
                                    <span style={{
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      color: statusData.textColor
                                    }}>
                                      Changed to {statusData.label}
                                    </span>
                                    <span style={{
                                      fontSize: '11px',
                                      color: '#9ca3af',
                                      marginLeft: 'auto'
                                    }}>
                                      {formatDate(history.createdAt)}
                                    </span>
                                  </div>
                                  {history.comment && (
                                    <p style={{
                                      margin: 0,
                                      fontSize: '13px',
                                      color: '#4b5563',
                                      lineHeight: '1.5',
                                      paddingLeft: '22px'
                                    }}>
                                      "{history.comment}"
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* User Mode - Basic Info */}
                      {isUser && !isDeveloper && (
                        <div style={{
                          backgroundColor: '#f9fafb',
                          padding: '16px',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                            Submission Details
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                            <div>
                              <span style={{ color: '#6b7280', fontWeight: '600' }}>Submitted:</span>
                              <span style={{ color: '#111827', marginLeft: '8px' }}>{formatDate(item.timestamp)}</span>
                            </div>
                            {item.url && (
                              <div>
                                <span style={{ color: '#6b7280', fontWeight: '600' }}>Page:</span>
                                <span style={{ color: '#111827', marginLeft: '8px', wordBreak: 'break-all' }}>
                                  {item.url}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Developer Mode - Technical Details */}
                      {isDeveloper && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{
                            backgroundColor: '#f9fafb',
                            padding: '16px',
                            borderRadius: '12px'
                          }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '12px' }}>
                              Technical Details
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                              <div>
                                <div style={{ color: '#6b7280', fontWeight: '600', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Page URL</div>
                                <div style={{ color: '#111827', wordBreak: 'break-all', fontFamily: 'ui-monospace, monospace', fontSize: '12px', backgroundColor: 'white', padding: '8px', borderRadius: '6px' }}>
                                  {item.url}
                                </div>
                              </div>
                              {item.viewport && (() => {
                                try {
                                  const viewport = typeof item.viewport === 'string' ? JSON.parse(item.viewport) : item.viewport;
                                  return (
                                    <div>
                                      <div style={{ color: '#6b7280', fontWeight: '600', marginBottom: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Viewport Size</div>
                                      <div style={{ color: '#111827', fontFamily: 'ui-monospace, monospace', fontSize: '12px' }}>
                                        {viewport.width} × {viewport.height} pixels
                                      </div>
                                    </div>
                                  );
                                } catch (e) {
                                  return null;
                                }
                              })()}
                            </div>
                          </div>

                          {item.elementInfo && (() => {
                            try {
                              const elementInfo = typeof item.elementInfo === 'string' ? JSON.parse(item.elementInfo) : item.elementInfo;
                              return (
                                <div style={{
                                  backgroundColor: '#f0f9ff',
                                  padding: '16px',
                                  borderRadius: '12px',
                                  border: '1px solid #bae6fd'
                                }}>
                                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0c4a6e', marginBottom: '12px' }}>
                                    Element Information
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'ui-monospace, monospace', fontSize: '12px', color: '#0c4a6e' }}>
                                    <div><span style={{ color: '#075985', fontWeight: '600' }}>Tag:</span> <span style={{ color: '#0369a1' }}>{elementInfo.tagName}</span></div>
                                    {elementInfo.id && (
                                      <div><span style={{ color: '#075985', fontWeight: '600' }}>ID:</span> <span style={{ color: '#0369a1' }}>#{elementInfo.id}</span></div>
                                    )}
                                    {elementInfo.className && (
                                      <div><span style={{ color: '#075985', fontWeight: '600' }}>Class:</span> <span style={{ color: '#0369a1' }}>{elementInfo.className}</span></div>
                                    )}
                                    {elementInfo.selector && (
                                      <div><span style={{ color: '#075985', fontWeight: '600' }}>Selector:</span> <span style={{ color: '#0369a1' }}>{elementInfo.selector}</span></div>
                                    )}
                                    {elementInfo.text && (
                                      <div><span style={{ color: '#075985', fontWeight: '600' }}>Text:</span> <span style={{ color: '#0369a1' }}>{elementInfo.text.substring(0, 100)}{elementInfo.text.length > 100 ? '...' : ''}</span></div>
                                    )}
                                  </div>
                                </div>
                              );
                            } catch (e) {
                              return null;
                            }
                          })()}

                          {item.userAgent && (
                            <div style={{
                              backgroundColor: '#fef3c7',
                              padding: '16px',
                              borderRadius: '12px',
                              border: '1px solid #fde68a'
                            }}>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#78350f', marginBottom: '8px' }}>
                                User Agent
                              </div>
                              <div style={{
                                color: '#92400e',
                                fontFamily: 'ui-monospace, monospace',
                                fontSize: '11px',
                                wordBreak: 'break-all',
                                lineHeight: '1.5'
                              }}>
                                {item.userAgent}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      {statusChangeModal.isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 10000,
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={closeStatusChangeModal}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              zIndex: 10001,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'scaleIn 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#111827' }}>
              Change Status
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6b7280' }}>
              Add an optional comment to explain the status change
            </p>

            {/* Status Change Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '12px'
            }}>
              <StatusBadge status={statusChangeModal.oldStatus} />
              <div style={{ color: '#9ca3af', fontSize: '20px', fontWeight: '600' }}>→</div>
              <StatusBadge status={statusChangeModal.newStatus} />
            </div>

            {/* Comment Textarea */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Developer Comment (optional)
              </label>
              <textarea
                value={statusChangeModal.comment}
                onChange={(e) => setStatusChangeModal({ ...statusChangeModal, comment: e.target.value })}
                placeholder="Add a comment about this status change..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                This comment will be visible to users and stored in the status history
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeStatusChangeModal}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                Confirm Change
              </button>
            </div>
          </div>
        </>
      )}

      {/* Animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideInRight {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }

          @keyframes dropdownSlideIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
        `}
      </style>
    </>,
    document.body
  );
};

// Helper function to save feedback (to be used from FeedbackProvider)
export const saveFeedbackToLocalStorage = (feedbackData) => {
  try {
    const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    const existing = stored ? JSON.parse(stored) : [];

    const newFeedback = {
      id: Date.now().toString(),
      ...feedbackData,
      status: 'reported',
      timestamp: new Date().toISOString()
    };

    const updated = [newFeedback, ...existing];
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updated));

    return { success: true, data: newFeedback };
  } catch (error) {
    console.error('Failed to save feedback:', error);
    return { success: false, error: error.message };
  }
};

// FeedbackUpdatesNotification Component
export const FeedbackUpdatesNotification = ({
  isOpen,
  onClose,
  updates = [],
  onDismissUpdate,
  onDismissAll
}) => {
  if (!isOpen || updates.length === 0) return null;

  const formatUpdateDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    return `${day} ${month}`;
  };

  // Map database status to component status if needed
  const normalizeStatus = (status) => {
    const statusMap = {
      'open': 'reported',
      'submitted': 'reported',
      'in_progress': 'inProgress',
      'resolved': 'resolved',
      'closed': 'resolved'
    };
    return statusMap[status] || status;
  };

  // Group updates by status for better organization
  const resolvedUpdates = updates.filter(u => {
    const normalized = normalizeStatus(u.status);
    return normalized === 'resolved' || normalized === 'released';
  });
  const inProgressUpdates = updates.filter(u => {
    const normalized = normalizeStatus(u.status);
    return normalized === 'inProgress' || normalized === 'opened';
  });
  const otherUpdates = updates.filter(u => {
    const normalized = normalizeStatus(u.status);
    return !['resolved', 'released', 'inProgress', 'opened'].includes(normalized);
  });

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Notification Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          animation: 'scaleIn 0.3s ease-out',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '32px 32px 24px 32px',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: '700',
                color: '#111827',
                letterSpacing: '-0.03em'
              }}>
                Updates
              </h3>
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '15px',
                color: '#6b7280',
                fontWeight: '400'
              }}>
                {updates.length} {updates.length === 1 ? 'update' : 'updates'} on your feedback
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '10px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <X size={20} color="#6b7280" />
            </button>
          </div>
        </div>

        {/* Updates List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px 24px'
        }}>
          {/* Resolved/Released Updates */}
          {resolvedUpdates.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#10b981',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '16px',
                paddingLeft: '4px'
              }}>
                Completed
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {resolvedUpdates.map((update) => {
                  const normalizedStatus = normalizeStatus(update.status);
                  const statusData = STATUS_OPTIONS[normalizedStatus || 'resolved'];
                  const StatusIcon = statusData.icon;
                  const displayMessage = update.responseMessage || (update.statusHistory && update.statusHistory.length > 0 ? update.statusHistory[update.statusHistory.length - 1].comment : null);

                  return (
                    <div
                      key={update.id}
                      style={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '20px',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      {/* Status indicator bar */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        backgroundColor: '#10b981',
                        borderRadius: '12px 0 0 12px'
                      }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, paddingRight: '12px' }}>
                          {/* Title */}
                          <h4 style={{
                            margin: '0 0 8px 0',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#111827',
                            lineHeight: '1.4'
                          }}>
                            {update.title || update.feedback || update.description}
                          </h4>

                          {/* Status and time */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '12px'
                          }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              backgroundColor: '#dcfce7',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#065f46'
                            }}>
                              <CheckCircle size={12} />
                              <span>{statusData.label}</span>
                            </div>
                            <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                              {formatUpdateDate(update.updatedAt || update.resolvedAt || update.timestamp || update.createdAt)}
                            </span>
                          </div>

                          {/* Developer message */}
                          {displayMessage && (
                            <div style={{
                              padding: '12px 14px',
                              backgroundColor: '#f9fafb',
                              borderRadius: '8px',
                              marginTop: '12px'
                            }}>
                              {update.resolvedBy && (
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#6b7280',
                                  marginBottom: '6px'
                                }}>
                                  {update.resolvedBy}
                                </div>
                              )}
                              <p style={{
                                margin: 0,
                                fontSize: '14px',
                                color: '#374151',
                                lineHeight: '1.5'
                              }}>
                                {displayMessage}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Dismiss button */}
                        {onDismissUpdate && (
                          <button
                            onClick={() => onDismissUpdate(update.id)}
                            style={{
                              padding: '6px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#d1d5db',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              borderRadius: '6px',
                              transition: 'all 0.2s',
                              flexShrink: 0
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                              e.currentTarget.style.color = '#6b7280';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#d1d5db';
                            }}
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* In Progress Updates */}
          {inProgressUpdates.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#3b82f6',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '16px',
                paddingLeft: '4px'
              }}>
                In Progress
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {inProgressUpdates.map((update) => {
                  const normalizedStatus = normalizeStatus(update.status);
                  const statusData = STATUS_OPTIONS[normalizedStatus || 'inProgress'];
                  const StatusIcon = statusData.icon;
                  const displayMessage = update.responseMessage || (update.statusHistory && update.statusHistory.length > 0 ? update.statusHistory[update.statusHistory.length - 1].comment : null);

                  return (
                    <div
                      key={update.id}
                      style={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '20px',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      {/* Status indicator bar */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        backgroundColor: '#3b82f6',
                        borderRadius: '12px 0 0 12px'
                      }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, paddingRight: '12px' }}>
                          {/* Title */}
                          <h4 style={{
                            margin: '0 0 8px 0',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#111827',
                            lineHeight: '1.4'
                          }}>
                            {update.title || update.feedback || update.description}
                          </h4>

                          {/* Status and time */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '12px'
                          }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              backgroundColor: '#dbeafe',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#1e40af'
                            }}>
                              <Play size={12} />
                              <span>{statusData.label}</span>
                            </div>
                            <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                              {formatUpdateDate(update.updatedAt || update.resolvedAt || update.timestamp || update.createdAt)}
                            </span>
                          </div>

                          {/* Developer message */}
                          {displayMessage && (
                            <div style={{
                              padding: '12px 14px',
                              backgroundColor: '#f9fafb',
                              borderRadius: '8px',
                              marginTop: '12px'
                            }}>
                              {update.assignedTo && (
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#6b7280',
                                  marginBottom: '6px'
                                }}>
                                  {update.assignedTo}
                                </div>
                              )}
                              <p style={{
                                margin: 0,
                                fontSize: '14px',
                                color: '#374151',
                                lineHeight: '1.5'
                              }}>
                                {displayMessage}
                              </p>
                              {update.estimatedResolutionDate && (
                                <div style={{
                                  marginTop: '8px',
                                  paddingTop: '8px',
                                  borderTop: '1px solid #e5e7eb',
                                  fontSize: '12px',
                                  color: '#6b7280',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <Clock size={12} />
                                  <span>Est. completion: {formatUpdateDate(update.estimatedResolutionDate)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Dismiss button */}
                        {onDismissUpdate && (
                          <button
                            onClick={() => onDismissUpdate(update.id)}
                            style={{
                              padding: '6px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#d1d5db',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              borderRadius: '6px',
                              transition: 'all 0.2s',
                              flexShrink: 0
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                              e.currentTarget.style.color = '#6b7280';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#d1d5db';
                            }}
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other Updates */}
          {otherUpdates.length > 0 && (
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '16px',
                paddingLeft: '4px'
              }}>
                Other Updates
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {otherUpdates.map((update) => {
                  const normalizedStatus = normalizeStatus(update.status);
                  const statusData = STATUS_OPTIONS[normalizedStatus || 'reported'];
                  const StatusIcon = statusData.icon;
                  const displayMessage = update.responseMessage || (update.statusHistory && update.statusHistory.length > 0 ? update.statusHistory[update.statusHistory.length - 1].comment : null);

                  return (
                    <div
                      key={update.id}
                      style={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '20px',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      {/* Status indicator bar */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        backgroundColor: statusData.color,
                        borderRadius: '12px 0 0 12px'
                      }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, paddingRight: '12px' }}>
                          {/* Title */}
                          <h4 style={{
                            margin: '0 0 8px 0',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#111827',
                            lineHeight: '1.4'
                          }}>
                            {update.title || update.feedback || update.description}
                          </h4>

                          {/* Status and time */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '12px'
                          }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              backgroundColor: statusData.bgColor,
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: statusData.textColor
                            }}>
                              <StatusIcon size={12} />
                              <span>{statusData.label}</span>
                            </div>
                            <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                              {formatUpdateDate(update.updatedAt || update.resolvedAt || update.timestamp || update.createdAt)}
                            </span>
                          </div>

                          {/* Developer message */}
                          {displayMessage && (
                            <div style={{
                              padding: '12px 14px',
                              backgroundColor: '#f9fafb',
                              borderRadius: '8px',
                              marginTop: '12px'
                            }}>
                              <p style={{
                                margin: 0,
                                fontSize: '14px',
                                color: '#374151',
                                lineHeight: '1.5'
                              }}>
                                {displayMessage}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Dismiss button */}
                        {onDismissUpdate && (
                          <button
                            onClick={() => onDismissUpdate(update.id)}
                            style={{
                              padding: '6px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#d1d5db',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              borderRadius: '6px',
                              transition: 'all 0.2s',
                              flexShrink: 0
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                              e.currentTarget.style.color = '#6b7280';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#d1d5db';
                            }}
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: '#6b7280'
          }}>
            {updates.length} update{updates.length > 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            {onDismissAll && (
              <button
                onClick={onDismissAll}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              >
                Dismiss All
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: '#111827',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1f2937'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#111827'}
            >
              Got it!
            </button>
          </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style>
        {`
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
        `}
      </style>
    </>,
    document.body
  );
};
