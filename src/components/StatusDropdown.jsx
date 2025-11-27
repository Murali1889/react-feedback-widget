import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { ChevronDown } from 'lucide-react';
import { getIconComponent, normalizeStatusKey, getStatusData } from './StatusBadge.jsx';
import { dropdownSlideIn } from '../theme.js';

const DropdownContainer = styled.div`
  position: relative;
`;

const AnimatedChevron = styled(ChevronDown)`
  transition: transform 0.2s;
  transform: ${props => (props.$isOpen ? 'rotate(180deg)' : 'rotate(0deg)')};
`;

const DropdownButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  background-color: transparent;
  border: 1.5px solid ${props => props.$statusColor};
  font-size: 13px;
  font-weight: 500;
  color: ${props => props.$textColor};
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  min-width: 140px;
  box-sizing: border-box;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: ${props => props.$statusColor};
  }

  span {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  ${AnimatedChevron} {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    margin-left: auto;
    color: ${props => props.$textColor};
  }

  &:hover {
    background-color: ${props => props.$statusColor}10;
    border-color: ${props => props.$statusColor};
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background-color: ${props => props.theme.mode === 'dark' ? '#1e293b' : 'white'};
  border-radius: 12px;
  box-shadow: ${props => props.theme.mode === 'dark'
    ? '0 10px 40px rgba(0, 0, 0, 0.5)'
    : '0 10px 40px rgba(0, 0, 0, 0.15)'};
  padding: 8px;
  z-index: 10000;
  min-width: 220px;
  border: 1px solid ${props => props.theme.colors.border};
  animation: ${dropdownSlideIn} 0.2s ease-out;
`;

const DropdownItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background-color: ${props => props.$isSelected ? props.$bgColor : 'transparent'};
  color: ${props => props.$isSelected ? props.$textColor : props.theme.colors.textPrimary};
  font-size: 13px;
  font-weight: ${props => props.$isSelected ? '600' : '500'};
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;

  &:hover {
    background-color: ${props => props.$bgColor};
    color: ${props => props.$textColor};
  }
`;


export const StatusDropdown = ({ currentStatus, onStatusChange, itemId, statuses = {}, acceptableStatuses, theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle empty or invalid statuses gracefully
  if (!statuses || typeof statuses !== 'object' || Object.keys(statuses).length === 0) {
    return null;
  }

  // Filter statuses by acceptableStatuses if provided
  const visibleStatuses = acceptableStatuses && Array.isArray(acceptableStatuses) && acceptableStatuses.length > 0
    ? Object.fromEntries(
        Object.entries(statuses).filter(([key]) => acceptableStatuses.includes(key))
      )
    : statuses;

  if (Object.keys(visibleStatuses).length === 0) {
    return null;
  }

  const statusKey = normalizeStatusKey(currentStatus, visibleStatuses);
  const currentStatusData = getStatusData(statusKey, visibleStatuses);
  const IconComponent = getIconComponent(currentStatusData.icon);
  const { color, textColor, bgColor, label } = currentStatusData;

  return (
    <DropdownContainer ref={dropdownRef}>
      <DropdownButton
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        $statusColor={color}
        $textColor={textColor}
        $bgColor={bgColor}
      >
        <IconComponent size={14} />
        <span>{label}</span>
        <AnimatedChevron size={14} $isOpen={isOpen} />
      </DropdownButton>

      {isOpen && (
        <DropdownMenu theme={theme} onClick={(e) => e.stopPropagation()}>
          {Object.entries(visibleStatuses).map(([key, data]) => {
            // Skip invalid/undefined status entries
            if (!data || typeof data !== 'object') return null;
            const itemData = getStatusData(key, visibleStatuses);
            const Icon = getIconComponent(itemData.icon);
            const isSelected = statusKey === key;
            return (
              <DropdownItem
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(itemId, key);
                  setIsOpen(false);
                }}
                $isSelected={isSelected}
                $bgColor={itemData.bgColor}
                $textColor={itemData.textColor}
                theme={theme}
              >
                <Icon size={16} />
                <span>{itemData.label}</span>
              </DropdownItem>
            );
          })}
        </DropdownMenu>
      )}
    </DropdownContainer>
  );
};