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
/* eslint-env browser */

import PropTypes from 'prop-types';
import { useState, useCallback } from 'react';
import { t } from '@superset-ui/core';

import ColorSchemeControl from 'src/explore/components/controls/ColorSchemeControl';

const propTypes = {
  onChange: PropTypes.func,
  labelMargin: PropTypes.number,
  colorScheme: PropTypes.string,
  hasCustomLabelColors: PropTypes.bool,
};

const defaultProps = {
  hasCustomLabelColors: false,
  colorScheme: undefined,
  onChange: () => {},
};

const ColorSchemeControlWrapper = (props) => {


    const [hovered, setHovered] = useState(false);

    const setHoverHandler = useCallback((hovered) => {
    setHovered(hovered);
  }, [hovered]);

    const { colorScheme, labelMargin = 0, hasCustomLabelColors } = props;
    return (
      <ColorSchemeControl
        description={t(
          "Any color palette selected here will override the colors applied to this dashboard's individual charts",
        )}
        labelMargin={labelMargin}
        name="color_scheme"
        onChange={props.onChange}
        value={colorScheme}
        choices={choicesHandler}
        clearable
        schemes={schemesHandler}
        hovered={hovered}
        hasCustomLabelColors={hasCustomLabelColors}
      />
    ); 
};




ColorSchemeControlWrapper.propTypes = propTypes;
ColorSchemeControlWrapper.defaultProps = defaultProps;

export default ColorSchemeControlWrapper;
