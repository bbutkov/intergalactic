import React from 'react';
import styled from 'styled-components';
import Copy from '../components/Copy';

import cssVariableFile from '!!raw-loader!@semcore/utils/style/var.css';

const cssVariable = Object.fromEntries(
  cssVariableFile
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('--') && line.endsWith(';'))
    .map((line) => line.split(': ')),
);

const PaintedElement = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  background-color: ${({ value }) => value && value};
  border-radius: 6px;
  vertical-align: middle;
`;

const Color = ({ name, ...other }) => {
  const varValue = cssVariable[name];
  const value = varValue || name;

  return (
    <Copy
      text={varValue ? `${name}: ${value}` : value}
      textTooltip={`Click to copy "${varValue ? `${name}: ${value}` : value}"`}
    >
      <PaintedElement {...other} value={value} />
    </Copy>
  );
};

export default Color;
