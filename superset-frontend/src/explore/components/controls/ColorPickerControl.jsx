/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { SketchPicker } from 'react-color';
import { getCategoricalSchemeRegistry, styled } from '@superset-ui/core';
import Popover from 'src/components/Popover';
import ControlHeader from '../ControlHeader';

const propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.object
};

const defaultProps = {
  onChange: () => {}
};

const swatchCommon = {
  position: 'absolute',
  width: '50px',
  height: '20px',
  top: '0px',
  left: '0px',
  right: '0px',
  bottom: '0px'
};

const StyledSwatch = styled.div`
  ${({ theme }) => `
      width: 50px;
      height: 20px;
      position: relative;
      padding: ${theme.gridUnit}px;
      borderRadius: ${theme.borderRadius}px;
      display: inline-block;
      cursor: pointer;
    `}
`;

const styles = {
  color: {
    ...swatchCommon,
    borderRadius: '2px'
  },
  checkboard: {
    ...swatchCommon,
    background:
      'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center'
  }
};
export default const ColorPickerControl = (props) => {


    

    const onChangeHandler = useCallback((col) => {
    props.onChange(col.rgb);
  }, []);
    const renderPopover = useMemo(() => {
    const presetColors = getCategoricalSchemeRegistry()
      .get()
      .colors.filter((s, i) => i < 7);
    return (
      <div id="filter-popover" className="color-popover">
        <SketchPicker
          color={props.value}
          onChange={onChangeHandler}
          presetColors={presetColors}
        />
      </div>
    );
  }, []);

    const c = props.value || { r: 0, g: 0, b: 0, a: 0 };
    const colStyle = {
      ...styles.color,
      background: `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`
    };
    return (
      <div>
        <ControlHeader {...props} />
        <Popover
          trigger="click"
          placement="right"
          content={renderPopover()}
        >
          <StyledSwatch>
            <div style={styles.checkboard} />
            <div style={colStyle} />
          </StyledSwatch>
        </Popover>
      </div>
    ); 
};




ColorPickerControl.propTypes = propTypes;
ColorPickerControl.defaultProps = defaultProps;
