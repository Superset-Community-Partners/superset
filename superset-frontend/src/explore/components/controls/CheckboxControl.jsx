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
import { styled, css } from '@superset-ui/core';
import ControlHeader from '../ControlHeader';
import Checkbox from '../../../components/Checkbox';

const propTypes = {
  value: PropTypes.bool,
  label: PropTypes.string,
  onChange: PropTypes.func,
};

const defaultProps = {
  value: false,
  onChange: () => {},
};

const CheckBoxControlWrapper = styled.div`
  ${({ theme }) => css`
    .ControlHeader label {
      color: ${theme.colors.grayscale.dark1};
    }
    span[role='checkbox'] {
      padding-right: ${theme.gridUnit * 2}px;
    }
  `}
`;

const CheckboxControl = (props) => {


    

    const onChangeHandler = useCallback(() => {
    props.onChange(!props.value);
  }, []);
    const renderCheckboxHandler = useCallback(() => {
    return (
      <Checkbox
        onChange={onChangeHandler.bind(this)}
        checked={!!props.value}
      />
    );
  }, []);

    if (props.label) {
      return (
        <CheckBoxControlWrapper>
          <ControlHeader
            {...props}
            leftNode={renderCheckboxHandler()}
            onClick={onChangeHandler.bind(this)}
          />
        </CheckBoxControlWrapper>
      );
    }
    return renderCheckboxHandler(); 
};

export default CheckboxControl;



CheckboxControl.propTypes = propTypes;
CheckboxControl.defaultProps = defaultProps;
