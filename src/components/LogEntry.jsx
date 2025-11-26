import React from 'react';
import styled from 'styled-components';
import { Network } from 'lucide-react';

const LogEntryStyled = styled.div`
  padding: 4px 0 4px 8px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  border-left: 3px solid ${props => (props.$isHighlighted ? props.theme.colors.highlightBorder : 'transparent')};
  white-space: pre-wrap;
  word-break: break-all;
  background-color: ${props => (props.$isHighlighted ? props.theme.colors.highlightBg : 'transparent')};

  &:last-child {
    border-bottom: none;
  }
`;

const LogTime = styled.span`
  color: ${props => props.theme.colors.textTertiary};
  margin-right: 8px;
`;

const LogLevel = styled.span`
  font-weight: bold;
  color: ${props => {
    switch (props.$level) {
      case 'error': return '#ef4444';
      case 'warn': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return props.theme.colors.textSecondary;
    }
  }};
`;

const LogDetails = styled.details`
  margin-top: 8px;
  padding-left: 16px;
  border-left: 2px solid ${props => props.theme.colors.border};
`;

const LogSummary = styled.summary`
  cursor: pointer;
  font-weight: bold;
  user-select: none;
  &:focus {
    outline: 1px dotted ${props => props.theme.colors.borderFocus};
  }
`;

const Pre = styled.pre`
  background: ${props => props.theme.mode === 'dark' ? '#020617' : '#f8fafc'};
  border: 1px solid ${props => props.theme.colors.border};
  padding: 8px;
  border-radius: 4px;
  font-size: 10px;
  white-space: pre-wrap;
  word-break: break-all;
  margin-top: 4px;
`;

const LogLine = styled.span`
  display: flex;
  align-items: center;
`;

const NetworkIcon = styled(Network)`
  margin-right: 6px;
  color: ${props => props.theme.colors.btnPrimaryBg};
`;

const Status = styled.span`
  color: ${props => props.$isError ? '#ef4444' : '#10b981'};
`;


export const LogEntry = ({ log, theme }) => {
  return (
    <LogEntryStyled $isHighlighted={log.type === 'storage' || log.type === 'indexedDB'}>
      <LogTime>{(log.timestamp / 1000).toFixed(2)}s</LogTime>
      
      {log.type === 'console' && (
        <>
          <LogLevel $level={log.level}>[{log.level.toUpperCase()}]</LogLevel>
          <span>: {log.message}</span>
        </>
      )}

      {log.type === 'network' && (
        <div>
          <LogLine>
            <NetworkIcon size={14} />
            <LogLevel $level='info'>[API]</LogLevel>
            <span>: {log.method} {log.url} - <Status $isError={log.status >= 400}>{log.status}</Status></span>
          </LogLine>
          {(log.request || log.response) && (
            <LogDetails>
              <LogSummary>Details</LogSummary>
              {log.request && (
                <div>
                  <strong>Request Headers:</strong><Pre>{log.request.headers}</Pre>
                  {log.request.body && <><strong>Request Body:</strong><Pre>{log.request.body}</Pre></>}
                </div>
              )}
              {log.response && (
                <div>
                  <strong>Response Headers:</strong><Pre>{log.response.headers}</Pre>
                  {log.response.body && <><strong>Response Body:</strong><Pre>{log.response.body}</Pre></>}
                </div>
              )}
            </LogDetails>
          )}
        </div>
      )}

      {log.type === 'storage' && (
        <div>
          <span>
            <LogLevel $level='warn'>[STORAGE]</LogLevel>
            <span>: {log.action === 'setItem' ? 'Set/Updated item' : log.action === 'removeItem' ? 'Removed item' : log.action === 'clear' ? 'Cleared storage' : log.action} on {log.storageType} - Key: {log.key}</span>
          </span>
          {log.value && (
            <LogDetails>
              <LogSummary>Value</LogSummary>
              <Pre>{log.value}</Pre>
            </LogDetails>
          )}
        </div>
      )}

      {log.type === 'indexedDB' && (
        <div>
          <span>
            <LogLevel $level='warn'>[INDEXEDDB]</LogLevel>
            <span>: {log.action === 'add' ? 'Added' : log.action === 'put' ? 'Put/Updated' : log.action === 'delete' ? 'Deleted' : log.action === 'clear' ? 'Cleared' : log.action} on {log.dbName}/{log.storeName}</span>
          </span>
          {log.data && (
            <LogDetails>
              <LogSummary>Data</LogSummary>
              <Pre>{log.data}</Pre>
            </LogDetails>
          )}
        </div>
      )}

    </LogEntryStyled>
  );
};