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

import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'src/components';
import { t } from '@superset-ui/core';

import Label from 'src/components/Label';
import Popover from 'src/components/Popover';
import PopoverSection from 'src/components/PopoverSection';
import Checkbox from 'src/components/Checkbox';
import ControlHeader from '../ControlHeader';
import SelectControl from './SelectControl';

const spatialTypes = {
  latlong: 'latlong',
  delimited: 'delimited',
  geohash: 'geohash',
};

const propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.object,
  animation: PropTypes.bool,
  choices: PropTypes.array,
};

const defaultProps = {
  onChange: () => {},
  animation: true,
  choices: [],
};

const SpatialControl = (props) => {
const v = props.value || {};
    let defaultCol;

    const [type, setType] = useState(v.type || spatialTypes.latlong);
    const [delimiter, setDelimiter] = useState(v.delimiter || ',');
    const [latCol, setLatCol] = useState(v.latCol || defaultCol);
    const [lonCol, setLonCol] = useState(v.lonCol || defaultCol);
    const [lonlatCol, setLonlatCol] = useState(v.lonlatCol || defaultCol);
    const [reverseCheckbox, setReverseCheckbox] = useState(v.reverseCheckbox || false);
    const [geohashCol, setGeohashCol] = useState(v.geohashCol || defaultCol);
    const [value, setValue] = useState(null);
    const [errors, setErrors] = useState([]);

    useEffect(() => {
    onChangeHandler();
  }, []);
    const onChangeHandler = useCallback(() => {
    
    const value = { type };
    const errors = [];
    const errMsg = t('Invalid lat/long configuration.');
    if (type === spatialTypes.latlong) {
      value.latCol = latCol;
      value.lonCol = lonCol;
      if (!value.lonCol || !value.latCol) {
        errors.push(errMsg);
      }
    } else if (type === spatialTypes.delimited) {
      value.lonlatCol = lonlatCol;
      value.delimiter = delimiter;
      value.reverseCheckbox = reverseCheckbox;
      if (!value.lonlatCol || !value.delimiter) {
        errors.push(errMsg);
      }
    } else if (type === spatialTypes.geohash) {
      value.geohashCol = geohashCol;
      value.reverseCheckbox = reverseCheckbox;
      if (!value.geohashCol) {
        errors.push(errMsg);
      }
    }
    setValue(value);
    setErrors(errors);
    props.onChange(value, errors);
  }, [value, errors, type, latCol, lonCol, lonlatCol, delimiter, reverseCheckbox, geohashCol]);
    const setTypeHandler = useCallback((type) => {
    setType(type);
  }, [type]);
    const toggleCheckboxHandler = useCallback(() => {
    setReverseCheckbox(!prevState.reverseCheckbox);
  }, []);
    const renderLabelContentHandler = useCallback(() => {
    if (errors.length > 0) {
      return 'N/A';
    }
    if (type === spatialTypes.latlong) {
      return `${lonCol} | ${latCol}`;
    }
    if (type === spatialTypes.delimited) {
      return `${lonlatCol}`;
    }
    if (type === spatialTypes.geohash) {
      return `${geohashCol}`;
    }
    return null;
  }, [errors, type, lonCol, latCol, lonlatCol, geohashCol]);
    const renderSelectHandler = useCallback((name, type) => {
    return (
      <SelectControl
        ariaLabel={name}
        name={name}
        choices={props.choices}
        value={stateHandler[name]}
        clearable={false}
        onFocus={() => {
          setTypeHandler(type);
        }}
        onChange={value => {
          set[name](value);
        }}
      />
    );
  }, [type, value]);
    const renderReverseCheckboxHandler = useCallback(() => {
    return (
      <span>
        {t('Reverse lat/long ')}
        <Checkbox
          checked={reverseCheckbox}
          onChange={toggleCheckboxHandler}
        />
      </span>
    );
  }, [reverseCheckbox]);
    const renderPopoverContentHandler = useCallback(() => {
    return (
      <div style={{ width: '300px' }}>
        <PopoverSection
          title={t('Longitude & Latitude columns')}
          isSelected={type === spatialTypes.latlong}
          onSelect={setTypeHandler.bind(this, spatialTypes.latlong)}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              {t('Longitude')}
              {renderSelectHandler('lonCol', spatialTypes.latlong)}
            </Col>
            <Col xs={24} md={12}>
              {t('Latitude')}
              {renderSelectHandler('latCol', spatialTypes.latlong)}
            </Col>
          </Row>
        </PopoverSection>
        <PopoverSection
          title={t('Delimited long & lat single column')}
          info={t(
            'Multiple formats accepted, look the geopy.points ' +
              'Python library for more details',
          )}
          isSelected={type === spatialTypes.delimited}
          onSelect={setTypeHandler.bind(this, spatialTypes.delimited)}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              {t('Column')}
              {renderSelectHandler('lonlatCol', spatialTypes.delimited)}
            </Col>
            <Col xs={24} md={12}>
              {renderReverseCheckboxHandler()}
            </Col>
          </Row>
        </PopoverSection>
        <PopoverSection
          title={t('Geohash')}
          isSelected={type === spatialTypes.geohash}
          onSelect={setTypeHandler.bind(this, spatialTypes.geohash)}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              {t('Column')}
              {renderSelectHandler('geohashCol', spatialTypes.geohash)}
            </Col>
            <Col xs={24} md={12}>
              {renderReverseCheckboxHandler()}
            </Col>
          </Row>
        </PopoverSection>
      </div>
    );
  }, [type]);

    return (
      <div>
        <ControlHeader {...props} />
        <Popover
          content={renderPopoverContentHandler()}
          placement="topLeft" // so that popover doesn't move when label changes
          trigger="click"
        >
          <Label className="pointer">{renderLabelContentHandler()}</Label>
        </Popover>
      </div>
    ); 
};

export default SpatialControl;




SpatialControl.propTypes = propTypes;
SpatialControl.defaultProps = defaultProps;
