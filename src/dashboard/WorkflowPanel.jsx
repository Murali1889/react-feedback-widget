import React from 'react';
import styled from 'styled-components';
import { pickToken } from '../ui/ThemeContext.jsx';
import { WorkflowStatusControl } from './workflow/WorkflowStatusControl.jsx';
import { SeverityRow } from './workflow/SeverityRow.jsx';
import { OwnerRow } from './workflow/OwnerRow.jsx';
import { CustomerRow } from './workflow/CustomerRow.jsx';
import { IntegrationsRow } from './workflow/IntegrationsRow.jsx';
import { HandoffRow } from './workflow/HandoffRow.jsx';
import { DangerRow } from './workflow/DangerRow.jsx';

const Outer = styled.div`
  display: flex; flex-direction: column;
  height: 100%; overflow-y: auto;
  font-family: ${pickToken('font.sans')};
  color: ${pickToken('color.text')};
  background: ${pickToken('color.bg')};
`;
const RowBox = styled.div`
  padding: 14px 18px;
  border-bottom: 1px solid ${pickToken('color.border')};
`;
const Label = styled.div`
  font-size: ${pickToken('font.size.xs')};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${pickToken('color.textFaint')};
  margin-bottom: 8px;
`;
const Empty = styled.div`
  padding: 28px 18px;
  color: ${pickToken('color.textFaint')};
  text-align: center;
  font-size: ${pickToken('font.size.sm')};
`;

export function WorkflowPanel({
  item, statuses = {},
  isDeveloper = false,
  onStatusChange, onSeverityChange, onOwnerChange,
  onCustomerValueChange, onIntegrationRetry, onDelete,
}) {
  if (!item) return <Outer><Empty>Select a feedback to see workflow actions.</Empty></Outer>;
  return (
    <Outer>
      <RowBox><Label>Status</Label><WorkflowStatusControl status={item.status} statuses={statuses} onChange={(next) => onStatusChange?.(item.id, next)} /></RowBox>
      <RowBox><Label>Severity</Label><SeverityRow item={item} onChange={onSeverityChange} /></RowBox>
      {isDeveloper && <RowBox><Label>Owner</Label><OwnerRow item={item} isDeveloper={true} onChange={onOwnerChange} /></RowBox>}
      {isDeveloper && <RowBox><Label>Customer value</Label><CustomerRow item={item} isDeveloper={true} onChange={onCustomerValueChange} /></RowBox>}
      {isDeveloper && (item.integrationState?.jira || item.integrationState?.sheets) && (
        <RowBox><Label>Integrations</Label><IntegrationsRow item={item} isDeveloper={true} onRetry={onIntegrationRetry} /></RowBox>
      )}
      <RowBox><Label>Handoff</Label><HandoffRow item={item} /></RowBox>
      {isDeveloper && onDelete && <RowBox><Label>Danger zone</Label><DangerRow item={item} isDeveloper={true} onDelete={onDelete} /></RowBox>}
    </Outer>
  );
}
export default WorkflowPanel;
